"use strict"

var Emitter = require('events');
var hid = require("node-hid");
var gpio = require('rpi-gpio');
var fs = require('fs');
var express = require('express');
var socketio = require('socket.io');
var scanRegex = /(\.png|\.jpg|\.txt)$/gi;
//var songMetaRegex = /^(#VERSION:.+;)|^(#TITLE:.+)|^(#SUBTITLE:.+)|^(#ARTIST:.+)|^(#GENRE:.+)|^(#BANNER:.+)|^(#BACKGROUND:.+)|^(#MUSIC:.+)|^(#OFFSET:.+)|^(#SAMPLESTART:.+)|^(#SAMPLELENGTH:.+)|^(#SELECTABLE:.+)|^(#BPMS:.+)|^(#STOPS:.+)|^(#DELAYS:.+)|^(#WARPS:.+)|^(#TIMESIGNATURES:.+)|^(#TICKCOUNTS:.+)|^(#COMBOS:.+)|^(#SPEEDS:.+)|^(#SCROLLS:.+)|^(#LABELS:.+)/gm;
var songFileRegex = /(\.ssc)$/gi
var gameConstants = {
	"timing": [
		225,
		450,
		900,
		1350,
		1800
	],
	"noteTypes": {
		"none": 0,
		"note": 1,
		"holdHead": 2,
		"hold": 9,
		"tail": 3,
		"rollHead": 4,
		"roll": 10,
		"mine": 5,
		"auto": 6,
		"lift": 7,
		"fake": 8
	},
	"gpio": {
		"left": 7,
		"down": 10,
		"up": 29,
		"right": 31
	}
}

function Controller() {
	this.pad = new Emitter();
	this.padInput = {'left': false, 'down': false, 'up': false, 'right': false};

	var self = this;

	// LEFT  7 
	// DOWN  8
	// UP    12
	// RIGHT 18

	var gpioInput = gameConstants.gpio;

	gpio.on('change', function(channel, value) {
		switch (channel) {
			case gpioInput.left: // LEFT
				if (self.padInput.left != value) {
					// Update and emit
					self.padInput.left = value;
					if (value) {
						self.pad.emit("down", 'left');
					} else {
						self.pad.emit("up", 'left');
					}
				}
				break;
			case gpioInput.down: // DOWN
				if (self.padInput.down != value) {
					// Update and emit
					self.padInput.down = value;
					if (value) {
						self.pad.emit("down", 'down');
					} else {
						self.pad.emit("up", 'down');
					}
				}
				break;
			case gpioInput.up: // UP
				if (self.padInput.up != value) {
					// Update and emit
					self.padInput.up = value;
					if (value) {
						self.pad.emit("down", 'up');
					} else {
						self.pad.emit("up", 'up');
					}
				}
				break;
			case gpioInput.right: // RIGHT
				if (self.padInput.right != value) {
					// Update and emit
					self.padInput.right = value;
					if (value) {
						self.pad.emit("down", 'right');
					} else {
						self.pad.emit("up", 'right');
					}
				}
				break;
		}
	});

	//this.keyboard = new hid.HID();

	// LEFT
	gpio.setup(gpioInput.left, gpio.DIR_IN, gpio.EDGE_BOTH, function() {
		gpio.read(gpioInput.left, function(err, value) {
			if (err) {
				console.log(err);
			}
			console.log("Channel "+gpioInput.left+" | Value: "+value+"  |  LEFT");
		});
	});

	// DOWN
	gpio.setup(gpioInput.down, gpio.DIR_IN, gpio.EDGE_BOTH, function() {
		gpio.read(gpioInput.down, function(err, value) {
			if (err) {
				console.log(err);
			}
			console.log("Channel "+gpioInput.down+" | Value: "+value+"  |  DOWN");
		});
	});

	// UP
	gpio.setup(gpioInput.up, gpio.DIR_IN, gpio.EDGE_BOTH, function() {
		gpio.read(gpioInput.up, function(err, value) {
			if (err) {
				console.log(err);
			}
			console.log("Channel "+gpioInput.up+" | Value: "+value+"  |  UP");
		});
	});

	// RIGHT
	gpio.setup(gpioInput.right, gpio.DIR_IN, gpio.EDGE_BOTH, function() {
		gpio.read(gpioInput.right, function(err, value) {
			if (err) {
				console.log(err);
			}
			console.log("Channel "+gpioInput.right+" | Value: "+value+"  |  RIGHT");
		});
	});

}
Controller.prototype.close = function() {
	var self = this;

	//keyboard = self.keyboard;
	//if (keyboard) {
	//	keyboard.removeAllListeners("data");
	//	keyboard.close();
	//}

	gpio.destroy(function() {
		console.log('All pins unexported');
	});
}

function GameEngine(songMeta, playType, difficulty, clients) {
//	var tickInterval = 10;
//	var currentTick = 0;
//	var lastUptime = process.uptime();
//	var lastTick = 0;

//	var bpms = songMeta.meta.bpms;
//	var labels = songMeta.meta.labels;
	var noteList = songMeta[playType][difficulty].noteList;
//	var offset = songMeta.meta.offset;

	var score = {"perfect": 0, "good": 0, "nice": 0, "bad": 0, "miss": 0};

	var controller = new Controller();

	var songLength = noteList[noteList.length-1].offset;
	var seconds = Math.ceil(songLength/1000);
	console.log("Total length: "+songLength+" ms, "+Math.floor(seconds/60)+":"+seconds%60+" minutes");

	var startTime = process.uptime();
	var currentNoteIndex = {'left': 0, 'down': 0, 'up': 0, 'right': 0};

	// Game

	// Assume lastNote was hit, start from currentIndex and search up
	controller.pad.on("down", function(direction) {
		var index = currentNoteIndex[direction];

		var currentTime = (process.uptime() - startTime)*1000;
		var nextNote = noteList[index];

		while (index < noteList.length) {
			var note = nextNote;
			var nextNote = noteList[index+1];
			//console.log(note.offset+"  |  "+nextNote.offset+"  |  "+currentTime);
			// Limit between notes
			if (nextNote.offset > currentTime) {
				// Narrow scope to accuracy
				// CurrentTime past currentNote
				if (note.offset >= currentTime) {
					if ((note.offset - gameConstants.timing[4]) <= currentTime) {
						// CurrentTime within Perfect
						if (note.notes[direction] != 0) {
							index++;
							if (note.offset - gameConstants.timing[0] <= currentTime) {
								score.perfect++;
								sendNote(index, direction, 'perfect');
								console.log("Perfect  |"+note.offset+"  |  "+currentTime);
								break;
							} else {
								// CurrentTime within Good
								if (note.offset - gameConstants.timing[1] <= currentTime) {
									score.good++;
									sendNote(index, direction, 'good');
									console.log("Good  |"+note.offset+"  |  "+currentTime);
									break;
								} else {
									// CurrentTime within Nice
									if (note.offset - gameConstants.timing[2] <= currentTime) {
										score.nice++;
										sendNote(index,  direction, 'nice');
										console.log("Nice  |"+note.offset+"  |  "+currentTime);
										break;
									} else {
										// CurrentTime within Bad
										if (note.offset - gameConstants.timing[3] <= currentTime) {
											score.bad++;
											sendNote(index, direction, 'bad');
											console.log("Bad  |"+note.offset+"  |  "+currentTime);
											break;
										} else {
											// CurrentTime within Miss
											if (note.offset - gameConstants.timing[4] <= currentTime) {
												score.miss++;
												sendNote(index, direction, 'miss');
												console.log("Miss  |"+note.offset+"  |  "+currentTime);
												break;
											} else {
												console.log("GG  |"+note.offset+"  |  "+currentTime);
												break;
											}
										}
									}
								}
							}
						}
					} else {
						console.log("GG  |"+note.offset+"  |  "+currentTime);
						break;
					}
				} else {
				}
			} else if (note.notes[direction] != 0) {
				score.miss++;
			}
			index++;
		}
	});

	controller.pad.on("up", function(direction) {

	});

	function sendStart() {
		for (var i = 0; i < clients.length; i++) {
			clients[i].emit('startSong', {});
		}
	}

	function sendNote(noteIndex, direction, accuracy) {
		for (var i = 0; i < clients.length; i++) {
			clients[i].emit('note', {'noteIndex': noteIndex, 'direction': direction, 'accuracy': accuracy});
		}
	}

	function sendEnd() {
		for (var i = 0; i < clients.length; i++) {
			clients[i].emit('endSong', {'perfect': score.perfect, 'good': score.good, 'nice': score.nice, 'bad': score.bad, 'miss': score.miss});
		}
	}

	sendStart();

	// Keyboard

	//var device = new hid.HID(7247, 2);
	//console.log(hid.devices());
	//device.on("data", function(buffer) {
	//	var buf = Buffer.from(buffer);
	//	var u =0;
	//	var open = [false, false, false, false];
	//	for (var value of buf) {
	//		if (value == 14) {
	//			open[3] = true;
	//		}
	//		if (value == 13) {
	//			open[2] = true;
	//		}
	//		if (value == 7) {
	//			open[0] = true;
	//		}
	//		if (value == 9) {
	//			open[1] = true;
	//		}
	//		u++;
	//	}
		// call accuracy function
	//	console.log(open[0]+', '+open[1]+', '+open[2]+', '+open[3]);
	//});

	//device.resume();

	setTimeout(function() {
		controller.close();

		var uptime = process.uptime();
		var index = currentNoteIndex['left'];
		console.log(index);
		while (index < noteList.length) {
			var note = noteList[index];
			if (note.notes['left'] != 0) {
				score.miss++;
			}
			index++;
		}
		index = currentNoteIndex['down'];
		while (index < noteList.length) {
			var note = noteList[index];
			if (note.notes['down'] != 0) {
				score.miss++;
			}
			index++;
		}
		index = currentNoteIndex['up'];
		while (index < noteList.length) {
			var note = noteList[index];
			if (note.notes['up'] != 0) {
				score.miss++;
			}
			index++;
		}
		index = currentNoteIndex['right'];
		while (index < noteList.length) {
			var note = noteList[index];
			if (note.notes['right'] != 0) {
				score.miss++;
			}
			index++;
		}
		console.log("Behind by "+(((uptime-startTime)*1000)-songLength)+" ms");
		console.log("Perfect: "+score.perfect);
		console.log("Good:    "+score.good);
		console.log("Nice:    "+score.nice);
		console.log("Bad:     "+score.bad);
		console.log("Miss:    "+score.miss);

		sendEnd();
	}, songLength);

// Tick stuff

//	var currentBpm = 0;
//	var currentBeatInterval = 0;
//	var currentBeat = 0;

//	var measureLength = 4;
//	var currentMeasure = 0;

	// Set label timeouts
//	var labelKeys = Object.keys(labels);
//	for (var i = 0; i < labelKeys.length; i++) {
//		var timeout = labelKeys[i];
//		var label = labels[timeout];
//
//		setTimeout(function() {
//			console.log('label| '+label);
//		}, timeout);
//	}

	// Set bpm timeouts
	//var bpmKeys = Object.keys(bpms);
	//for (var i = 0; i < bpmKeys.length; i++) {
	//	var timeout = bpmKeys[i];
	//	var bpm = bpms[timeout];
	//	
	//	setTimeout(function() {
	//	}, timeout);
	//}

//	var bpm = bpms["0.000"];
//
//	currentBpm = bpm;
//	currentBeatInterval = 60000/bpm;
//	console.log('bpm  | '+bpm);

	// Set beat timeouts
	/*var beatOffset = parseFloat(offset);
	for (var i = 0; i < measures.length; i++) {
		var measure = measures[i];
		var noteInterval = measureLength/measure.length;
		for (var x = 0; x < measure.length; x++) {
			var notes = measure[x];
			setTimeout(function() {
				console.log('note | '+notes);
			}, beatOffset);
			beatOffset += noteInterval;
		}
		currentMeasure++;
		var measure = currentMeasure;
		setTimeout(function() {
			console.log("mesur| "+measure);
		}, beatOffset);
	}
	setTimeout(function() {
		console.log("end  |");
	}, beatOffset);

	setInterval(function() {*/
	//	var uptime = process.uptime();
	//	var currentTick = self.currentTick;
	//	var behind = Math.abs(Math.floor(((currentTick-self.lastTick)-(uptime - self.lastUptime)*(1000/self.tickInterval))*10000)/10000);
	//	//console.log(currentTick+"  |  "+uptime+"  |  Behind this second by: "+behind+" ticks");
	//	self.lastUptime = uptime;
	//	self.lastTick = currentTick;
	//	self.currentTick += Math.ceil(behind);
//		var uptime = process.uptime();
//		console.log("Behind by "+(uptime-self.lastUptime)/1000)+" milliseconds");
//		self.lastUptime = uptime;
//	}, 200);


}

function Display(port) {
	var app = express();
	var socket = socketio(port+1);

	app.get('/', function(req, res) {
		res.sendFile(__dirname+'/public/display.html');
	});

	app.use('/assets', express.static('./public/assets'));

	app.listen(port);

	console.log('Express and Socket.io Opened');

	return socket;
}

function NodeMania() {
	//this.engine = new GameEngine();
	this.display = new Display(4000);

	this.groupSongsList = {};
	this.groupSongsListMeta = {};
	this.groupList = [];
	this.totalGroups = 0;
	this.totalSongs = 0;

	this.clients = [];

	var self = this;

	self.display.on('connection', function(client) {
		client.on('songList', function() {
			client.emit('songList', {'totalSongs': self.totalSongs, 'totalGroups': self.totalGroups, 'groups': self.groupList, 'fullList': self.groupSongsList});
		});

		client.on('songData', function(song) {
			client.emit('songData', self.groupSongsList[song.group][song.name]);
		});

		client.on('disconnect', function() {
			console.log('client disconnected');
			delete self.clients[self.clients.indexOf(client)];
		});

		console.log('client connected');

		self.clients.push(client);
	});
}
NodeMania.prototype.scanFiles = function() {
	var self = this;

//	var groups = [];
//	var courses = [];
	var totalSongs = 0;
	var groupSongsList = {};

	var fileNames = scanForGroups();
	for (var i = 0; i < fileNames.length; i++) {
		var groupName = fileNames[i];
		if (groupName.match(scanRegex) == null) {
			groupSongsList[groupName] = {};
			var songList = scanGroupForSongs(groupName);
			for (var x = 0; x < songList.length; x++) {
				var songLocation = songList[x];
				if (songLocation.match(scanRegex) == null) {
					var songMeta = getSongMeta(groupName, songLocation);
					if (songMeta) {
						groupSongsList[groupName][songLocation] = songMeta;
						totalSongs++;
					}
				}
			}
		}
	}

	self.groupSongsList = groupSongsList;
	self.groupList = Object.keys(groupSongsList);
	self.totalGroups = Object.keys(groupSongsList).length;
	self.totalSongs = totalSongs;

//	console.log(groupSongsList["SOUND VOLTEX INFINITE GRAVITY"]);
//	console.log(groupSongsList["SOUND VOLTEX INFINITE GRAVITY"]["Wish upon Twin Stars (Barry)"]['dance-single']['challenge']['measures']);

	console.log(totalSongs+" songs loaded");
	console.log("Current time: "+process.uptime());

//	setTimeout(function() {
//		console.log('Playing ["SOUND VOLTEX INFINITE GRAVITY"]["INF-B[L-aste-R] (Blue)"]...');
//		var game = new GameEngine(groupSongsList["SOUND VOLTEX INFINITE GRAVITY"]["INF-B[L-aste-R] (Blue)"], 'dance-single', 'challenge', self.clients);
//	}, 10000);
}
NodeMania.prototype.error = function(err) {
	console.log("ERROR| "+err);
}

function scanForGroups() {
	return fs.readdirSync('./songs/');
}

function scanGroupForSongs(groupName) {
	return fs.readdirSync('./songs/'+groupName);
}

function getSongMeta(groupName, songLocation) {
	var songDirectory = fs.readdirSync('./songs/'+groupName+'/'+songLocation);
	var songFile;
	var parsedMeta = [];
	var songMeta = {};
	for (var i = 0; i < songDirectory.length; i++) {
		var fileName = songDirectory[i];
		if (fileName.match(songFileRegex)) {
			songFile = fs.readFileSync('./songs/'+groupName+'/'+songLocation+'/'+fileName);
			songFile = songFile.toString().replace(/(( )*\/\/ measure \d*)/gi, '').replace(/\r/g, '').replace(/\n/g, '').split(/\/\/.{1,50}----------------#/gi);
			for (var i = 0; i < songFile.length; i++) {
				songFile[i] = songFile[i].split(';');
				parsedMeta[i] = {};
				for (var x = 0; x < songFile[i].length; x++) {
					if (songFile[i][x] != '') {
						var meta = songFile[i][x].replace(/^#/gi, '').split(':');
						var metaName = meta[0].toLowerCase();
						var metaData = meta[1];

						switch (metaName) {
							case "banner":
								parsedMeta[i][metaName] = './songs/'+groupName+'/'+songLocation+'/'+metaData;
								break;
							case "background":
								parsedMeta[i][metaName] = './songs/'+groupName+'/'+songLocation+'/'+metaData;
								break;
							case "music":
								parsedMeta[i][metaName] = './songs/'+groupName+'/'+songLocation+'/'+metaData;
								break;
							case "notes":
								var unparsedNotes = metaData.split(',');
								var notes = [];

								for(var z = 0; z < unparsedNotes.length; z++) {
									notes[z] = unparsedNotes[z].match(/.{4}/gi);
								}

								parsedMeta[i]['measures'] = notes;
								break;
							case "bpms":
								var bpms = metaData.split(',');
								var bpmsList = {};
								for (var p = 0; p < bpms.length; p++) {
									var bpm = bpms[p].split('=');
									bpmsList[bpm[0]] = bpm[1];
								}
								parsedMeta[i][metaName] = bpmsList;
								break;
							case "radarvalues":
								parsedMeta[i][metaName] = metaData.split(',');
								break;
							case "labels":
								var labels = metaData.split(',');
								var labelsList = {};
								for (var p = 0; p < labels.length; p++) {
									var label = labels[p].split('=');
									labelsList[label[0]] = label[1];
								}
								parsedMeta[i][metaName] = labelsList;
								break;
							default:
								parsedMeta[i][metaName] = metaData;
								break;
						}
					}
				}
			}
			break;
		}
	}

	if (parsedMeta.length >= 1) {
		songMeta.meta = parsedMeta[0];

		for (var i = 1; i < parsedMeta.length; i++) {
			var unparsedDiff = parsedMeta[i];
			var difficulty = unparsedDiff.difficulty.toLowerCase();
			var diffMeter = unparsedDiff.meter;
			var gameMode = unparsedDiff.stepstype;
			var noteIndex = 0;

			if (songMeta[gameMode] == undefined) {
				songMeta[gameMode] = {};
			}

			songMeta[gameMode][difficulty] = unparsedDiff;

			var rawMeasures = unparsedDiff.measures;
			var bpms = songMeta.meta.bpms;

			var bpmKeys = Object.keys(bpms);
			var numberOfBpms = bpmKeys.length;

			var noteList = [];
			var currentTime = 0;
			var currentBpm = 0;
			var noteOffset = parseFloat(songMeta.meta.offset)+5;

			for (var c = 0; c < rawMeasures.length; c++) {
				var measure = rawMeasures[c];

				for (var x = 0; x < bpmKeys.length; x++) {
					var bpmTime = bpmKeys[x];
					if (bpms[bpmTime] != currentBpm) {
						if (numberOfBpms == 1 || x == 0) {
							currentBpm = bpms[bpmTime];
						} else {
							var lastBpmTime = bpmKeys[x-1];
							if (currentTime >= bpmTime && lastBpmTime < currentTime) {
								currentBpm = bpms[bpmTime];
							}
						}
					}
				}

				var totalNotes = measure.length;

				var measureInterval = (60000/currentBpm)*4;
				var noteInterval = measureInterval/totalNotes;

				//measures[i].push({"notes":"measture "+i+"  |  "+noteInterval+" ms  |  "+measureInterval,"offset":noteOffset});

				var hold = [false, false, false, false];
				for (var x = 0; x < totalNotes; x++) {
					noteList.push({"notes":{
						"left": 0,
						"down": 0,
						"up": 0,
						"right": 0
					},"offset":noteOffset});
					var measureNotes = measure[x].toString();
					var holdHeadType = gameConstants.noteTypes.holdHead;
					var tailType = gameConstants.noteTypes.tail;
					var holdType = gameConstants.noteTypes.hold;

					var notes = noteList[noteIndex].notes;

					for (var z = 0; z < 4; z++) {
						if (measureNotes[z] == holdHeadType) {
							hold[z] = true;
							switch (z) {
								case 0:
									notes.left = holdHeadType;
									break;
								case 1:
									notes.down = holdHeadType;
									break;
								case 2:
									notes.up = holdHeadType;
									break;
								case 3:
									notes.right = holdHeadType;
									break;
							}
						} else if (measureNotes[z] == tailType) {
							hold[z] = false;
							switch (z) {
								case 0:
									notes.left = tailType;
									break;
								case 1:
									notes.down = tailType;
									break;
								case 2:
									notes.up = tailType;
									break;
								case 3:
									notes.right = tailType;
									break;
							}
						} else {
							if (hold[z]) {
								switch (z) {
									case 0:
										notes.left = holdType;
										break;
									case 1:
										notes.down = holdType;
										break;
									case 2:
										notes.up = holdType;
										break;
									case 3:
										notes.right = holdType;
										break;
								}
							} else {
								switch (z) {
									case 0:
										notes.left = measureNotes[0];
										break;
									case 1:
										notes.down = measureNotes[1];
										break;
									case 2:
										notes.up = measureNotes[2];
										break;
									case 3:
										notes.right = measureNotes[3];
										break;
								}
							}
						}
					}
					noteIndex++;
					noteOffset += noteInterval;
				}
			}
			songMeta[gameMode][difficulty].noteList = noteList;
		}

		return songMeta;
	}

	return;
}

module.exports = new NodeMania();