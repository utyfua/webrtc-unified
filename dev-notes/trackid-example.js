// https://codepen.io/anon/pen/Xxpyzp?editors=0010
async function logTrackIds(sdpSemantics) {
	console.log('--- sdpSemantics: ' + sdpSemantics + ' ---');
	const pc1Stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const [pc1Track] = pc1Stream.getTracks();
	const pc2Stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const [pc2Track] = pc2Stream.getTracks();

	const pc1 = new RTCPeerConnection({ sdpSemantics: sdpSemantics });
	const pc2 = new RTCPeerConnection({ sdpSemantics: sdpSemantics });
	const [pc1Sender, pc1Transceiver] = addTrack(pc1, pc1Track);
	const [pc2Sender, pc2Transceiver] = addTrack(pc2, pc2Track);

	let pc1Receiver = null;
	pc1.ontrack = e => pc1Receiver = e.receiver;
	let pc2Receiver = null;
	pc2.ontrack = e => pc2Receiver = e.receiver;

	// Perform offer/answer cycle.
	const offer = await pc1.createOffer();
	await pc1.setLocalDescription(offer);
	await pc2.setRemoteDescription(offer);
	const answer = await pc2.createAnswer();
	await pc2.setLocalDescription(answer);
	await pc1.setRemoteDescription(answer);

	console.log('First track (pc1 -> pc2)')
	console.log('  Local ID (pc1Sender.track.id):    ' + pc1Sender.track.id);
	console.log('  Remote ID (pc2Receiver.track.id): ' + pc2Receiver.track.id);
	console.log('Second track (pc2 -> pc1)');
	console.log('  Local ID (pc2Sender.track.id):    ' + pc2Sender.track.id);
	console.log('  Remote ID (pc1Receiver.track.id): ' + pc1Receiver.track.id);
	// Transceivers are only available in Unified Plan.
	if(pc1Transceiver != null && pc2Transceiver != null) {
		console.log('pc1Transceiver.mid: ' + pc1Transceiver.mid);
		console.log('pc2Transceiver.mid: ' + pc2Transceiver.mid);
	}
}

// Adds the track and returns [sender, transceiver].
// In Plan B, transceiver will be null.
// In Unified Plan, sender == transceiver.sender.
function addTrack(pc, track) {
	// In Unified Plan, "pc1Transceiver = pc1.addTransceiver(track);"
	// would do the trick.
	const sender = pc.addTrack(track);
	let transceiver = null;
	pc.getTransceivers().forEach(t => {
		if(t.sender == sender)
			transceiver = t;
	});
	return [sender, transceiver];
}

// Main:
(async function() {
	await logTrackIds('plan-b');
	await logTrackIds('unified-plan');
})();