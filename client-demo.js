// its client-demo.js file in package

// ignore this file if you include client.js file early
// const WebRTCSimple = require('webrtc-simple/client');
let rtcSimple = new WebRTCSimple({
	// high level error handler
	onerror: (obj) => {
		alert(JSON.stringify(obj))
	}
});

// create connection with our server
var socket = new WebSocket('ws' + location.origin.slice(4) + '/ws');

// function to send data to the server
function func_send(data) {
	socket.send(JSON.stringify({
		action: 'webrts-simple',
		data: data
	}));
};

// reload page if connection lost
socket.onclose = function () {
	location.reload();
};

// get a messages handler function
let conn_handler = rtcSimple.setConnect(func_send);

// handle socket a connected state
socket.onopen = function () {
	// join to default room
	rtcSimple.joinRoom('default');
};

// handle messages
socket.onmessage = function (msg) {
	var json = JSON.parse(msg.data);
	if (json.action === 'webrts-simple') conn_handler(json.data);
	else console.log(json);
};

// bind actions
butt_micro.onclick = function () {
	if (this.innerHTML == 'Enable micro') {
		rtcSimple.setMedia({
			type: 'audio',
			enable: true,
		});
		this.innerHTML = 'Mute micro';
	} else {
		rtcSimple.setMedia({
			type: 'audio',
			enable: false,
		});
		this.innerHTML = 'Enable micro';
	}
}
// butt_micro.onclick();
butt_cam.onclick = function () {
	if (this.innerHTML == 'Enable cam') {
		rtcSimple.setMedia({
			type: 'video',
			enable: true,
		});
		this.innerHTML = 'Disable cam';
	} else {
		rtcSimple.setMedia({
			type: 'video',
			enable: false,
		});
		this.innerHTML = 'Enable cam';
	}
}
butt_screen.onclick = function () {
	if (this.innerHTML == 'Enable screen') {
		rtcSimple.setMedia({
			type: 'display',
			enable: true,
		});
		this.innerHTML = 'Disable screen';
	} else {
		rtcSimple.setMedia({
			type: 'display',
			enable: false,
		});
		this.innerHTML = 'Enable screen';
	}
};

// user reject request to use audio/video/screen
rtcSimple.on('rejectUseMedia', function (media_type) {
	alert('reject request to use ' + media_type);
});

// handle local stream for draw
rtcSimple.on('addedLocalStream', function (stream, media_type) {
	// ignore voice
	if (media_type == 'audio') return;
	// ignore screen
	if (media_type == 'screen' && you.srcObject) return;
	you.srcObject = stream;
	you.play();
});

// handle local stream for remove
rtcSimple.on('removedLocalStream', function (stream, media_type) {
	// ignore voice
	if (media_type == 'audio') return;
	you.srcObject = undefined;
});

// handle remote stream for draw
rtcSimple.on('addedRemoteStream', function (stream, media_type, clientId) {
	// media_type - screen accepted as video on remote client
	// but just in case screen type check
	var tag = media_type === 'screen' ? 'video' : media_type;
	var remote = document.createElement(tag);
	document.body.appendChild(remote);
	remote.srcObject = stream;
	remote.play();
	remote.volume = 1;
	remote.dataset.clientId = clientId;
});

// handle remote stream for remove
rtcSimple.on('removedRemoteStream', function (stream, media_type, clientId) {
	let mediaList = document.querySelectorAll('[data-client-id="' + clientId + '"]');
	for (let i = 0; i < mediaList.length; i++)
		if (mediaList[i].srcObject === stream)
			mediaList[i].remove();
});