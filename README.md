# WebRTC-unified

## Introduction

This package was created to simplify work with original WebRTC. 
Yes, you can create voice/video chat with multiple users by use this package. 

This specification is very confusing, the intricacies of which [will be described here](#faq).

Like WebRTC, this package assumes that users are already connected to the server(sockets) that will connect them.

## Example Usage

Install package: `npm i webrtc-unified`

Client file for direct connection - [client.js](https://github.com/utyfua/webrtc-unified/blob/master/client.js) or [client.min.js](https://github.com/utyfua/webrtc-unified/blob/master/client.min.js)

```js
// its client-demo.js file in package

// ignore this file if you include client.js file early
// const WebRTCSimple = require('webrtc-unified/client');

let rtcSimple = WebRTCSimple({
	onerror: (obj) => {
		alert(JSON.stringify(obj))
	}
});

// if automatically refuses read the "Limitations" in the FAQ
rtcSimple.createStream({
	audio: true, // use microphone?
	video: true, // use cam?

	// output audio/video element for output own data
	// always mutes when output starts
	// use for fast draw own cam
	// optional
	element: document.getElementById('you')
}).then(function (stream) {
	/* stream - audio/video stream
		you can draw video yourself
		element.srcObject = stream;
		element.play();
		but you will hear yourself if you do not turn off the sound
		element.volume = 0;
	*/

	// create connection with our server
	var socket = new WebSocket('ws' + location.origin.slice(4) + '/ws');

	// function to send data to the server
	function func_send(data) {
		socket.send(JSON.stringify({
			action: 'webrts-unified',
			data: data
		}))
	};

	// get a messages handler function
	let conn_handler = rtcSimple.setConnect(func_send);

	// reload page if connection lost
	socket.onclose = function () {
		location.reload();
	};

	// handle socket a connected state
	socket.onopen = function () {
		// join to default room
		rtcSimple.join_room('default');
	};

	// handle messages
	socket.onmessage = function (msg) {
		var json = JSON.parse(msg.data);
		if (json.action === 'webrts-unified') conn_handler(json.data);
		else console.log(json);
	};
})
```

## FAQ

### Limitations

* https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Privacy_and_security