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
			if (parent) parent._parent_events.push([false, eventName, callback]);

		}
		once(eventName, callback, parent) {
			this._events_once[eventName] = this._events_once[eventName] || [];
			this._events_once[eventName].push(callback);
			if (parent) parent._parent_events.push([true, eventName, callback]);
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

			function proc(_events) {
				if (!_events) return;
				for (let i = 0; i < _events.length; i++) {
					_events[i].apply(this, args);
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
			}
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
			this.emit(data.action, data);
		}

		joinRoom(roomId = "default") {
			this.connectionSend({
				"eventName": "joinRoom",
				roomId
			});
		}

		// events handlers
		event_getPeers(data) {
			this.youId = data.youId;
			data.connections.forEach(data => this.event_newPeerConnected(data, this));
		}
		event_newPeerConnected(data, receiver) {
			new WebRTCSimpleClient({
				root: receiver || this,
				clientId: data.clientId,
				isReceiver: !!receiver,
			});
		}
	};

	class WebRTCSimpleClient {
		constructor({
			root,
			clientId,
			isReceiver
		}) {
			this.root = root;
			this.clientId = clientId;
			this.transceivers = [];
			this._parent_events = [];
			this.initConnection({
				isReceiver
			});
			root.clients.push(this);
		}
		initConnection({
			isReceiver
		}) {
			if (isReceiver) return; // we must wait other client
			let root = this.root;
			if (!root.localStreams.length) {
				root.once('addedLocalStream', () => this.initConnection(), this);
				return;
			};
			let peer = this.peer = new RTCPeerConnection(root.rtcpeerConfig);
			suncLocalStreams();
			root.on('addedLocalStream', () => this.suncLocalStreams(), this);
			
		}
		suncLocalStreams() {
			let peer = this.peer;
			let root = this.root;
			let streams = root.localStreams;
			streams.forEach(stream => {
				peer.addTransceiver(stream.getTracks()[0]);
			});
			console.log(peer.getTransceivers());
		}
	};

	if (typeof module === 'object')
		module.exports = WebRTCSimple;
	else
		window.WebRTCSimple = WebRTCSimple;
})();