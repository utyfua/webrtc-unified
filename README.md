# WebRTC-unified

Docs updated 03th November 2019

## Introduction

This package was created to simplify work with original WebRTC. 
Yes, you can create voice/video chat with multiple users by use this package. 

**Tested only on Chrome.** Most likely this package does not work in other browsers. If you need support for other browsers, [write to me](https://github.com/utyfua/webrtc-unified/issues)

This specification is very confusing, the intricacies of which [will be described here](#faq).

Like WebRTC, this package assumes that users are already connected to the server(sockets or etc) that will connect them.

## Table of contents

- [Example Usage](#example-usage)
- - [Server](#server)
- - [Client](#client)
- [API reference(client)](#api-reference-client-)
- - [Designation List](#designation-list)
- - [new WebRTCUnified()](#new-webrtcunified-)
- - [Methods of WebRTCUnified instance](#methods-of-webrtcunified-instance)
- - - [addIceServer](#rtcunified-addiceserver-iceserver-)
- - - [setConnect](#rtcunified-setconnect-senddata-)
- - - [joinRoom](#rtcunified-joinroom-roomid-default-)
- - - [leaveRoom](#rtcunified-leaveroom-)
- - - [setMedia](#rtcunified-setmedia-options-)
- - - [getMedia](#rtcunified-getmedia-type-)
- - - [createStream](#rtcunified-createstream-options-)
- - [Events of WebRTCUnified instance](#events-of-webrtcunified-instance)
- - - [connect](#event-connect)
- - - [joinRoom](#event-joinroom)
- - - [leaveRoom](#event-leaveroom)
- - - [newPeerConnected](#event-newpeerconnected)
- - - [removePeerConnected](#event-removepeerconnected)
- - - [rejectUseMedia](#event-rejectusemedia)
- - - [addedLocalStream](#event-addedlocalstream)
- - - [removedLocalStream](#event-removedlocalstream)
- - - [addedRemoteStream](#event-addedremotestream)
- - - [removedRemoteStream](#event-removedremotestream)
- [FAQ](#faq)
- - [Limitations](#limitations)

## Installing

`npm i webrtc-unified`

Same packet for server and client

Client file for direct connection - [client.js](https://github.com/utyfua/webrtc-unified/blob/master/client.js) or [client.min.js](https://github.com/utyfua/webrtc-unified/blob/master/client.min.js)

## Example Usage

### Server

Full example code [server-demo.js](https://github.com/utyfua/webrtc-unified/blob/master/server-demo.js)

```js
// require lib
const Voicer = require('webrtc-unified/server');
// create server instance
const voicer = Voicer();

// some code

// example connection event handler
function onClient(ws, req) {
	// create client instance
	// you can put off initializing client instance before getting data for this package
	ws.voicer = voicer.addClient({
		
		// function for send information(object) to client
		// you must get data on client and use appropriate function in client lib
		send: data => ws.send(JSON.stringify({
			action: 'webrtc-unified',
			data: data
		})),
		
		// user data for sending this value to client
		// if don`t set client get undefined
		// don`t require
		// userId: some value/can be object,
		
		// client id for sending this value to client
		// if don`t set the lib sets random string
		// don`t require, must be unique
		// better to use userId
		// clientId: string,
		
	});
	// we get some data from client
	ws.on('message', mess => {
		let data;
		try {
			data = JSON.parse(mess);
		} catch (e) {
			// fall
			return ws.terminate();
		};
		// we get message for lib
		if (data.action === 'webrtc-unified'){
			// if you dont call voicer.addClient here, its place for do it
			// if(!ws.voicer) ws.voicer = voicer.addClient({send: function})
			
			// send message to lib
			return ws.voicer.receive(data.data);
		}
		else console.log(data);
	});
	// when connection closed, use close for disconnect this user from other and destroy client instance
	ws.on('close', function () {
		ws.voicer.close();
		ws.voicer = undefined;
	});
}

```

### Client

Full example code [client-demo.js](https://github.com/utyfua/webrtc-unified/blob/master/client-demo.js)

```js
// ignore this file if you include client.js file early
const WebRTCUnified = require('webrtc-unified/client');
let rtcUnified = new WebRTCUnified();

// add ice server
// rtcUnified.addIceServer({
// 	url: `turn:someserver.example:3478?transport=tcp`,
// 	username: "username",
// 	credential: "credential",
// })

// create connection with our server
var socket = new WebSocket('ws' + location.origin.slice(4) + '/ws');

// function to send data to the server
function func_send(data) {
	socket.send(JSON.stringify({
		action: 'webrtc-unified',
		data: data
	}));
};

// reload page if connection lost
socket.onclose = function () {
	location.reload();
};

// get a messages handler function
let conn_handler = rtcUnified.setConnect(func_send);

// handle socket a connected state
socket.onopen = function () {
	// join to default room
	rtcUnified.joinRoom('default');
};

// handle messages
socket.onmessage = function (msg) {
	var json = JSON.parse(msg.data);
	if (json.action === 'webrtc-unified') conn_handler(json.data);
	else console.log(json);
};

// bind actions
butt_micro.onclick = function () {
	if (this.innerHTML == 'Enable micro') {
		rtcUnified.setMedia({
			type: 'audio',
			enable: true,
		});
		this.innerHTML = 'Mute micro';
	} else {
		rtcUnified.setMedia({
			type: 'audio',
			enable: false,
		});
		this.innerHTML = 'Enable micro';
	}
}
butt_micro.onclick();
butt_cam.onclick = function () {
	if (this.innerHTML == 'Enable cam') {
		rtcUnified.setMedia({
			type: 'video',
			enable: true,
		});
		this.innerHTML = 'Disable cam';
	} else {
		rtcUnified.setMedia({
			type: 'video',
			enable: false,
		});
		this.innerHTML = 'Enable cam';
	}
}
butt_screen.onclick = function () {
	if (this.innerHTML == 'Enable screen') {
		rtcUnified.setMedia({
			type: 'display',
			enable: true,
		});
		this.innerHTML = 'Disable screen';
	} else {
		rtcUnified.setMedia({
			type: 'display',
			enable: false,
		});
		this.innerHTML = 'Enable screen';
	}
};

// user reject request to use audio/video/screen
rtcUnified.on('rejectUseMedia', function (media_type) {
	alert('reject request to use ' + media_type);
});

// handle local stream for draw
rtcUnified.on('addedLocalStream', function (stream, media_type) {
	// ignore voice
	if (media_type == 'audio') return;
	// ignore screen
	if (media_type == 'screen' && you.srcObject) return;
	you.srcObject = stream;
	you.play();
});

// handle local stream for remove
rtcUnified.on('removedLocalStream', function (stream, media_type) {
	// ignore voice
	if (media_type == 'audio') return;
	you.srcObject = undefined;
});

// handle remote stream for draw
rtcUnified.on('addedRemoteStream', function (stream, media_type, clientId) {
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
rtcUnified.on('removedRemoteStream', function (stream, media_type, clientId) {
	let mediaList = document.querySelectorAll('[data-client-id="' + clientId + '"]');
	for (let i = 0; i < mediaList.length; i++)
		if (mediaList[i].srcObject === stream)
			mediaList[i].remove();
});
```

## API reference(client)

### Designation List

#### Media

The media this is any audio or video resource that is broadcast to other chat participants

#### Type of media

- `audio` - microphone
- `video` - webcam
- `display` - desktop, specific program or etc

#### new WebRTCUnified()

Returns `WebRTCUnified` instance

### Methods of WebRTCUnified instance

#### rtcUnified.addIceServer(iceServer)

- `iceServer` - an object containing following properties:
- - `url` - required, URL which can be used to connect to the server. Example: `turn:someserver.example:3478?transport=tcp`
- - `username` - Optional. if the RTCIceServer is a TURN server, then this is the username to use during the authentication process.
- - `credential` - Optional. The credential to use when logging into the server. This is only used if the RTCIceServer represents a TURN server.

The RTCIceServer dictionary defines how to connect to a single ICE server (such as a STUN or TURN server). It includes both the URL and the necessary credentials, if any, to connect to the server.

By default added `stun:stun.l.google.com:19302`

[More about RTCIceServer](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer)

#### rtcUnified.setConnect(sendData)

- function `sendData` - is called when need send `data` to server
- - `data` - an object with data for server

**Returns:** function for messages from server, receives an object from the server side

#### rtcUnified.joinRoom(roomId = "default")

- roomId - an string with room id, can be user id or etc

Will join other users in the room.
*If the user is already another in the room, first they will exit.*

#### rtcUnified.leaveRoom()

Leave current room

#### rtcUnified.setMedia(options)

- `options` - an object containing following properties:
- - `type` - [type of media](#type-of-media)
- - `enable` - optional an boolean. If not set, toggled current state
- - `args` - optional an object for `navigator.mediaDevices.getUserMedia/getDisplayMedia`

Turn on / off media

#### rtcUnified.getMedia(type)

- `type` - [type of media](#type-of-media)

**Returns:** native browser stream or undefined. 
*Use to verify enabled media*

#### rtcUnified.createStream(options)

- `options` - an object containing following properties:
- - `type` - [type of media](#type-of-media)
- - `args` - optional an object for `navigator.mediaDevices.getUserMedia/getDisplayMedia`

Turn on media. Better use `setMedia` to manage state

### Events of WebRTCUnified instance

#### rtcUnified.on(eventName, function(...args))

Set handle, allowed `rtcUnified.once`

#### Event connect

Handled when called `setConnect`

#### Event joinRoom

- `options` - an object containing following properties:
- - `clientId` - Client system identifier unique to each connection
- - `userId` - The identifier of the user who transmitted the server
- - `roomId` - Room id

Handled when user connected to room, before connecting to other chat participants

#### Event leaveRoom

Handled when it was called or the server kicked the user from the room

#### Event newPeerConnected

- `options` - an object containing following properties:
- - `clientId` - Client system identifier unique to each connection
- - `userId` - The identifier of the user who transmitted the server 

Handled when user connected to room, before connecting with him

#### Event removePeerConnected

- `options` - an object containing following properties:
- - `clientId` - client system identifier unique to each connection
- - `userId` - the identifier of the user who transmitted the server 

Handled when user leaves from room, before disconnect with him

#### Event rejectUseMedia

- `type` - [type of media](#type-of-media)

Handled when user reject use media

#### Event addedLocalStream

- `stream` - native browser stream
- `type` - [type of media](#type-of-media)

Handled when media has been added by `setMedia` or `createStream` methods

#### Event removedLocalStream

- `stream` - native browser stream
- `type` - [type of media](#type-of-media)

Handled when media has been removed by `setMedia` method

#### Event addedRemoteStream

- `stream` - native browser stream
- `type` - [type of media](#type-of-media)
- `clientId` - client system identifier unique to each connection
- `userId` - the identifier of the user who transmitted the server 

Handled when a room user started broadcasting media

#### Event removedRemoteStream

- `stream` - native browser stream
- `type` - [type of media](#type-of-media)
- `clientId` - client system identifier unique to each connection
- `userId` - the identifier of the user who transmitted the server 

Handled when a room user has finished broadcasting media

## FAQ

### Limitations

-   Tested only on Chrome
-   [getUserMedia - Privacy and security](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Privacy_and_security)
