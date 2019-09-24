module.exports = (config) => {
	return new Server(config);
};
class Server {
	constructor(config) {
		this.rooms = {};
	}
	addClient(args) {
		args.server = this;
		return new Client(args);
	}
}
class Client {
	constructor(config) {
		this.server = config.server;
		this.ws = config.ws;
		this.send = config.send;
		this.userId = config.userId;
		this.clientId = config.clientId || GenID();
	}
	receive(data) {
		if (data && data.eventName && typeof this['event_' + data.eventName] === 'function')
			this['event_' + data.eventName](data);
		else console.log('unhandle event', data.eventName);
	}
	event_joinRoom(data) {
		let connections = [];
		if (this.roomId)
			this.close();
		this.roomId = data.roomId;
		let roomList = this.server.rooms[this.roomId] = this.server.rooms[this.roomId] || [];
		roomList.push(this);
		for (let i = 0; i < roomList.length; i++) {
			let clientId = roomList[i].clientId;
			if (clientId == this.clientId) continue;
			connections.push({
				clientId,
				userId: roomList[i].userId
			});
			roomList[i].send({
				eventName: "newPeerConnected",
				clientId: this.clientId,
				userId: this.userId,
			});
		};
		this.send({
			eventName: "joinRoom",
			roomId: data.roomIdClient || this.roomId,
			connections,
			clientId: this.clientId,
			userId: this.userId,
		});
	}
	event_leaveRoom() {
		this.close();
	}
	event_sendOffer(data) {
		if (!this.roomId || !this.server.rooms[this.roomId] || !data.clientId) return;
		let remote = this.server.rooms[this.roomId].find(client => data.clientId == client.clientId);
		remote && remote.send({
			eventName: "receiveOffer",
			offer: data.offer,
			clientId: this.clientId,
		});
	}
	event_sendIceCandidate(data) {
		if (!this.roomId || !this.server.rooms[this.roomId] || !data.clientId) return;
		let remote = this.server.rooms[this.roomId].find(client => data.clientId == client.clientId);
		remote && remote.send({
			eventName: "receiveIceCandidate",
			candidate: data.candidate,
			clientId: this.clientId,
		});
	}
	close() {
		let roomId=this.roomId;
		this.roomId=null;
		if (!roomId) return;
		let roomList = this.server.rooms[roomId];
		if (!roomList) return;
		if (roomList.length < 2) {
			delete this.server.rooms[roomId];
			return;
		};
		let roomListNew = [];
		for (let i = 0; i < roomList.length; i++) {
			let client = roomList[i];
			if (client === this) continue;
			roomListNew.push(client);
			client.send({
				eventName: "removePeerConnected",
				clientId: this.clientId,
				userId: this.userId,
			});
		};
		// if(!roomListNew.length)delete this.server.rooms[roomId];else
		this.server.rooms[roomId] = roomListNew;
	}
};


// generate a 4 digit hex code randomly
function S4() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// https://github.com/webRTC-io/webRTC.io/blob/master/lib/webrtc.io.js#L250
// make a REALLY COMPLICATED AND RANDOM id, kudos to Dennis
function GenID() {
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}