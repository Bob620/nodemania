var socket = io('http://192.168.1.19:4001');
var body = document.getElementById('body');
var engine = new Engine("clientDisplay", body.clientHeight, body.clientWidth);

var finalLogo = new Image(0, 0, 2500, 1024);

finalLogo.onload = function() {
	engine.displayScreen('title', 'default');
}

var alpha = 0;
var nextMovement = 0;
var movementHeight = 0;

engine.modelScreen('title', function(context, width, height) {
	context.globalAlpha = 1.0;
	engine.clearScreen('default');
	movementHeight = height/2;

	engine.startStep();
}, function(context, width, height, offset) {
	var centerWidth = width/2;
	var heightFourth = height/4;
	var offsetWidth = 250;
	var offsetHeight = 102;
	var fading = true;

	if (offset > 100) {
		context.globalAlpha = 1.0;
		engine.clearScreen('default');
		context.globalAlpha = alpha;
		context.drawImage(finalLogo, (centerWidth-offsetWidth), (movementHeight-offsetHeight), offsetWidth*2, offsetHeight*2);

		if (alpha < 0.9) {
			alpha += 0.05;
			nextMovement = offset+1200;
		} else if (nextMovement <= offset) {
			if (movementHeight <= heightFourth) {
				engine.displayScreen('menu', 'default');
			} else {
				movementHeight -= 3;
			}
		}
	}
});

engine.modelScreen('menu', function(context, width, height) {
	context.globalAlpha = 1.0;
	engine.clearScreen('default');
	var widthThird = width/3;
	var heightFourth = height/4;
	var halfHeight = height/2;

	var centerWidth = width/2;
	var offsetWidth = 250;
	var offsetHeight = 102;
	context.drawImage(finalLogo, (centerWidth-offsetWidth), (heightFourth-offsetHeight), offsetWidth*2, offsetHeight*2);

	context.fillStyle = "rgb(144,197,63)";
	context.rect(widthThird, halfHeight, 300, 100);
	context.fill();

	context.rect(((widthThird*2)-300), halfHeight, 300, 100);
	context.fill();

	context.strokeStyle = "rgb(70, 72, 61)";
	context.fillStyle = "rgb(255,255,255)";
	context.font = "36px sans-serif";
	context.textAlign = "center";
	context.lineWidth = 7;

	context.strokeText("Dance-Single", widthThird+150, halfHeight+60);
	context.strokeText("Offset", (widthThird*2)-150, halfHeight+60);

	context.fillText("Dance-Single", widthThird+150, halfHeight+60);
	context.fillText("Offset", (widthThird*2)-150, halfHeight+60);
}, function() {});

engine.modelBackground('default', 'color', 'rgb(37, 38, 37)');

finalLogo.src = '/assets/images/finalLogo.png';

socket.on('connect', function() {
//	socket.emit('songList', {});
});

socket.on('songList', function(data) {
	console.log(data);

//	var noteList = data['fullList']["SOUND VOLTEX INFINITE GRAVITY"]["INF-B[L-aste-R] (Blue)"]['dance-single']['challenge'].noteList;
//
//	var index = 0;
//	while(index < noteList.length) {
//		var notes = noteList[index];
//		if (notes['left'] != 0) {
//			var arrow = Crafty.e("2D, DOM, Image, Motion")
//				.attr({w: 100, h: 100, x: 500+(notes.offset*50), y: 600, vy: -200})
//				.image("/assets/images/arrow.png");
//		}
//		index++;
//	}
});

socket.on('songData', function(data) {
	console.log(data);
});

socket.on('displayUpdate', function(data) {
	console.log(data);
});

socket.on('startSong', function(data) {
	console.log(data);
});

socket.on('note', function(data) {
	console.log(data);
});

socket.on('endSong', function(data) {
	console.log(data);
});

