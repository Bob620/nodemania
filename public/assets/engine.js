function Engine(canvasId, height, width) {
	var self = this;

	this.canvas = document.getElementById(canvasId);
	this.height = height;
	this.width = width;
	self.canvas.height = height;
	self.canvas.width = width;
	this.context = self.canvas.getContext('2d');
	this.screens = {};
	this.backgrounds = {};
	this.animationQueue = [];
	this.animationOffset = 0;
	this.animationRequest;
}
// Tick/Frame/Step
Engine.prototype.step = function(timestamp) {
	var self = this;

	var animationQueue = self.animationQueue;

	for (var i = 0; i < animationQueue.length; i++) {
		animationQueue[i](self.context, self.width, self.height, timestamp-self.animationOffset);
	}

	self.animationRequest = window.requestAnimationFrame(function(timestamp) {engine.step(timestamp);});
}
Engine.prototype.startStep = function() {
	var self = this;

	self.animationOffset = performance.now();

	self.animationRequest = window.requestAnimationFrame(function(timestamp) {engine.step(timestamp);});
}
Engine.prototype.stopStep = function() {
	var self = this;

	window.cancelAnimationFrame(self.animationRequest);
}
// Display
Engine.prototype.displayScreen = function(screenId, background) {
	var self = this;
	var screen = self.screens[screenId];

	self.stopStep();
	self.animationQueue = [];

	if (!background) {
		background = false;
	}

	if (screen) {
		self.clearScreen(background);
		screen.staticModel(self.context, self.width, self.height);
		self.animationQueue.push(screen.animationModel);
	}
};
Engine.prototype.clearScreen = function(background) {
	var self = this;

	self.context.clearRect(0, 0, self.width, self.height);
	if (background) {
		self.setBackground(background);
	}
}
Engine.prototype.setBackground = function(backgroundId) {
	var self = this;
	var background = self.backgrounds[backgroundId];

	if (background) {
		switch (background.type) {
			case "image":
				self.context.drawImage(background.style, 0, 0, self.width, self.height);
				break;
			case "color":
				self.context.fillStyle = background.style;
				self.context.fillRect(0, 0, self.width, self.height);
				break;
		}
	} else {
		self.context.clearRect(0, 0, self.width, self.height);
	}
}
// Background
Engine.prototype.modelBackground = function(backgroundId, type, style, width, src) {
	var self = this;
	var background = {};

	switch (type) {
		case "color":
			background.type = "color";
			background.style = style;
			break;
		case "image":
			background.type = "image";
			var image = new Image(style, width);
			image.onload = function() {
				background.style = image;
			}
			image.src = src;
			break;
		default:
			console.log("Unable to create new background with type "+type);
			return false;
			break;
	}
	self.backgrounds[backgroundId] = background;
}

// Screen
Engine.prototype.modelScreen = function(screenId, staticModel, animationModel) {
	var self = this;

	self.screens[screenId] = new Screen(staticModel, animationModel);
}

// Screen prototype
function Screen(staticModel, animationModel) {
	this.staticModel = staticModel;
	this.animationModel = animationModel;
}