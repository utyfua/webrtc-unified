const app = require('express')();
const server = require('http').createServer(app);
const WebSocketServer = require('ws').Server;

// require lib
// const Voicer = require('webrtc-unified/server');
// its package repository, require local file
const Voicer = require('./server.js');
// create server instance
const voicer = Voicer();

server.listen(process.env.PORT || 3000);

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

['client.js', 'turn-server.js', 'client-demo.js'].forEach(file =>
	app.get('/' + file, function (req, res) {
		res.sendFile(__dirname + '/' + file);
	})
);
let wss = (new WebSocketServer({
	path: '/ws',
	server,
}));

wss.on('connection', onClient);

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