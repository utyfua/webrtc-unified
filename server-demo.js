var app = require('express')();
var server = require('http').createServer(app);
const WebSocketServer = require('ws').Server;
var voicer = require('./server.js')();

// server.listen(process.env.PORT || 3000, '192.168.0.100');
server.listen(process.env.PORT || 3000);
// server.listen(process.env.PORT || 3000);

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

function onClient(ws, req) {
	ws.voicer = voicer.addClient({
		ws,
		send: data => ws.send(JSON.stringify({
			action: 'webrts-simple',
			data: data
		}))
	});
	ws.on('message', mess => {
		let data;
		try {
			data = JSON.parse(mess);
		} catch (e) {
			// no way
			return ws.terminate();
		};
		if (data.action === 'webrts-simple') ws.voicer.receive(data.data);
		else console.log(data);
	});
	ws.on('close', function () {
		ws.voicer.close();
	});
};