/*!
 * WebRTC-client
 * @github   https://github.com/utyfua/webrtc-unified#readme
 * @npm      https://www.npmjs.com/package/webrtc-unified
 * @author   utyfua@gmail.com
 * @license  MIT
 */

(() => {
	class EventEmitter {
		constructor(args) {
			this._events = {};
			this._events_once = {};
		}
		on(eventName, callback, parent) {
			this._events[eventName] = this._events[eventName] || [];
			this._events[eventName].push(callback);
			if (parent)
				parent._parent_events.push([false, eventName, callback]);
		}
		once(eventName, callback, parent) {
			this._events_once[eventName] = this._events_once[eventName] || [];
			if (parent) {
				let original = callback;
				callback = (...args) => {
					original.apply(this, args);
					parent._parent_events = parent._parent_events.filter(
						line => !(line[0] && line[1] === eventName && line[2] === callback)
					);
				}
			}
			this._events_once[eventName].push(callback);
			if (parent)
				parent._parent_events.push([true, eventName, callback]);
		}
		oncePromice(eventName) {
			return new Promice(callback => this.once(eventName, callback));
		}
		off(eventName, callback) {
			this._events[eventName] = this._events[eventName] &&
				this._events[eventName].filter(func => func !== callback)
			this._events_once[eventName] = this._events_once[eventName] &&
				this._events_once[eventName].filter(func => func !== callback)
		}
		offParent(parent) {
			parent._parent_events = parent._parent_events.filter(([isOnce, eventName, callback]) => {
				let stay = true;
				let key = isOnce ? '_events' : '_events_once';
				if (!this[key][eventName]) return stay;
				this[key][eventName] = this[key][eventName].filter((callback2) => {
					if (callback == callback2) {
						stay = false;
						return false;
					};
					return true;
				});
				return stay;
			});
		}
		emit(eventName, ...args) {
			let count = 0;

			function proc(events) {
				if (!events) return;
				for (let i = 0; i < events.length; i++) {
					events[i].apply(this, args);
					count++;
				};
			}
			proc(this._events[eventName]);
			proc(this._events_once[eventName]);
			delete this._events_once[eventName];
			return count;
		}
	}

	class WebRTCSimple extends EventEmitter {
		constructor(args) {
			super();
			this.args = args;
			this.localStreams = [];
			this.clients = [];
			this.rtcpeerConfig = {
				sdpSemantics: 'unified-plan',
				"iceServers": [{
					url: 'stun:stun.l.google.com:19302'
				}, ]
			};
			if (typeof WebRTCSimple_TURN_SERVER != 'undefined')
				this.rtcpeerConfig.iceServers.push(WebRTCSimple_TURN_SERVER);
		}

		// external connection
		setConnect(send) {
			this.connectionSend = send;
			this.emit('connect');
			return (data) => this.connectionHandler(data);
		}
		connectionHandler(data) {
			if (data &&
				typeof data.eventName === 'string' &&
				typeof this['event_' + data.eventName] === 'function')
				this['event_' + data.eventName](data);
			else console.log(data);
			this.emit(data.eventName, data);
		}
		getClient(clientId) {
			return this.clients.find(client => client.clientId == clientId);
		}
		joinRoom(roomId = "default") {
			this.connectionSend({
				"eventName": "joinRoom",
				roomId,
				localStreamsLength: this.localStreams.length,
			});
		}
		leaveRoom() {
			this.connectionSend({
				"eventName": "leaveRoom",
				roomId: this.roomId,
			});
			this.event_leaveRoom();
			this.emit('leaveRoom');
		}

		// events handlers
		event_joinRoom(data) {
			this.event_leaveRoom();
			this.clientId = data.clientId;
			this.userId = data.userId;
			this.roomId = data.roomId;
			data.connections.forEach(data => {
				this.event_newPeerConnected(data, this);
				this.emit('newPeerConnected', data);
			});
		}
		event_leaveRoom() {
			if (!this.roomId) return;
			this.roomId = null;
			this.clients.forEach(client => {
				client.close();
				this.emit('removePeerConnected', {
					clientId: client.clientId
				});
			});
		}
		event_newPeerConnected(data, receiver) {
			new WebRTCSimpleClient({
				root: receiver || this,
				clientId: data.clientId,
				userId: data.userId,
				initer: receiver
			});
		}
		event_removePeerConnected({
			clientId
		}) {
			let client = this.getClient(clientId);
			if (client) client.close();
		}
		event_receiveOffer(data) {
			let client = this.getClient(data.clientId);
			if (!client) return console.log('client not found', data.clientId);
			client.receiveOffer(data.offer);
		}

		setMedia(data) {
			if (typeof data == 'string') data = {
				type: data
			};
			let {
				type,
				enable,
				args
			} = data;
			let stream = this.getMedia(type);
			if (typeof enable === 'undefined') enable = !stream;
			if (stream)
				return !enable && this.removeLocalStream(stream, true);
			if (!enable) return;
			this.createStream({
				type,
				args
			});
		}
		getMedia(type) {
			return this.localStreams.find(stream => stream._type == type)
		}
		async createStream({
			type,
			args
		}) {
			if (['display', 'video', 'audio'].indexOf(type) === -1)
				throw new Error('media bad type - ' + type);
			let mediaFunc = type === 'display' ? 'getDisplayMedia' : 'getUserMedia';
			let opts = type == 'display' ? {} : {
				[type]: args || true,
			};
			let stream;
			try {
				stream = await navigator.mediaDevices[mediaFunc](opts);
			} catch (e) {
				this.emit('rejectUseMedia', type);
				return;
			}
			stream._type = type;
			this.addLocalStream(stream);
		}
		addLocalStream(stream) {
			this.localStreams.push(stream);
			this.emit('addedLocalStream', stream, stream._type);
		}
		removeLocalStream(stream, needStop) {
			if (needStop) stream.getTracks()[0].stop();
			this.localStreams = this.localStreams.filter(local => local !== stream);
			this.emit('removedLocalStream', stream, stream._type);
		}
	};

	class WebRTCSimpleClient {
		constructor({
			root,
			clientId,
			userId,
			initer
		}) {
			this.root = root;
			this.clientId = clientId;
			this.userId = userId;
			this.transceivers = [];
			this._parent_events = [];
			this.tracks = [];
			root.clients.push(this);
			this.initConnection(initer);
			// if(initer)
			// this.createOffer();
		}
		initConnection(initer) {
			let root = this.root;
			let peer = this.peer = new RTCPeerConnection(root.rtcpeerConfig);
			peer.ontrack = (event) => {
				this.tracks.push(event.track);
				let stream = new MediaStream([event.track]);
				stream._type = event.track.kind;
				this.root.emit('addedRemoteStream', stream, stream._type, this.clientId);
				event.track.onmute = (e) => {
					this.tracks = this.tracks.filter(tr => tr != event.track)
					this.root.emit('removedRemoteStream', stream, stream._type, this.clientId);
				};
			};
			//https://stackoverflow.com/questions/15484729/why-doesnt-onicecandidate-work
			// peer.onicecandidate = (event) => {
			// 	if (event.candidate)
			// 		root.connectionSend({
			// 			"eventName": "sendIceCandidate",
			// 			"label": event.candidate.sdpMLineIndex,
			// 			"candidate": event.candidate,
			// 			"clientId": this.clientId
			// 		});
			// };
			peer.oniceconnectionstatechange = (event) => {
				console.debug('webrtc-unified', 'peer.signalingState:', peer.signalingState);
				// if (peer.isNegotiating && peer.signalingState == "stable") peer.isNegotiating = false;
				if (peer.autofixTimer && peer.autofixTimer != -1) {
					clearTimeout(peer.autofixTimer);
					peer.autofixTimer = -1;
				}
				if (peer.iceConnectionState === "failed") {
					/* possibly reconfigure the connection in some way here */
					/* then request ICE restart */
					return peer.restartIce && peer.restartIce();
				};
				// if (peer.iceConnectionState == 'disconnected') setTimeout(() => {
				// 	if (peer.iceConnectionState != 'disconnected') return;
				// 	this.close();
				// 	this.root.emit('removePeerConnected', {
				// 		clientId: this.clientId
				// 	});
				// }, 500);
			};
			// peer.negotiating;
			peer.onnegotiationneeded = (event) => {
				// if (peer.isNegotiating) return;
				// peer.isNegotiating = true;
				this.createOffer();
			};
			let streamsInit = () => {
				root.on('addedLocalStream', () => this.suncLocalStreams(), this);
				root.on('removedLocalStream', () => this.suncLocalStreams(), this);
				this.suncLocalStreams();
			}
			if (initer) setTimeout(streamsInit, 1000);
			else streamsInit()
		}
		async createOffer() {
			let peer = this.peer;
			let offer = await peer.createOffer();
			await peer.setLocalDescription(offer);
			this.root.connectionSend({
				eventName: "sendOffer",
				offer,
				clientId: this.clientId,
			});
		}
		async receiveOffer(offer) {
			let root = this.root;
			let peer = this.peer;
			// if (offer.type === 'offer' && peer.isNegotiating) return;
			await peer.setRemoteDescription(offer);
			if (offer.type === 'offer') {
				let answer = await peer.createAnswer();
				await peer.setLocalDescription(answer)
				root.connectionSend({
					eventName: "sendOffer",
					offer: answer,
					clientId: this.clientId,
				});
				if (!peer.autofixTimer)
					peer.autofixTimer = setTimeout(() => this.createOffer(), 1000);
			};
		}
		suncLocalStreams() {
			let peer = this.peer;
			if (peer.signalingState == 'disconnected' || peer.signalingState == 'closed')
				return;
			let root = this.root;
			let streams = root.localStreams;
			let changed = false;
			//rtcSimple.clients[0].peer.getTransceivers()[0].sender.track==rtcSimple.localStreams[0].getTracks()[0]
			let transceivers = peer.getTransceivers().filter(transceiver =>
				transceiver.sender.track && // we check local theards here
				transceiver.currentDirection != "inactive" // fuck chrome
			);
			streams.forEach(stream =>
				stream.getTracks().forEach(track => {
					let length = transceivers.length;
					transceivers = transceivers.filter(transceiver => transceiver.sender.track !== track);
					if (length === transceivers.length) {
						let transceiver = peer.addTransceiver(track);
						changed = true;
					}
				})
			);
			transceivers.forEach(transceiver => {
				peer.removeTrack(transceiver.sender);
				changed = true;
				// transceiver.sender.stop();
			});
			// if (changed) setTimeout(() => this.createOffer(), 50);
			// if (peer.iceConnectionState === "new" && streams.length)
			// 	setTimeout(() => peer.iceConnectionState === "new" && this.createOffer(), 50);
			// console.log(streams, peer.getTransceivers(), transceivers)
		}
		close() {
			if (this.peer.signalingState != 'disconnected' && this.peer.signalingState != 'closed')
				this.peer.close();
			// trigger removedRemoteStream event 
			this.tracks.forEach(track => track.onmute());
			this.root.clients = this.root.clients.filter(client => client.clientId != this.clientId);
		}
	};

	if (typeof module === 'object')
		module.exports = WebRTCSimple;
	else
		window.WebRTCSimple = WebRTCSimple;
})();