/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var video1 = document.querySelector('video#video1');
var video2 = document.querySelector('video#video2');

var startButton = document.querySelector('button#startButton');
var callButton = document.querySelector('button#callButton');
var hangupButton = document.querySelector('button#hangupButton');
startButton.disabled = false;
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

var pc1StateDiv = document.querySelector('div#pc1State');
var pc1IceStateDiv = document.querySelector('div#pc1IceState');
var pc1ConnStateDiv = document.querySelector('div#pc1ConnState');
var pc2StateDiv = document.querySelector('div#pc2State');
var pc2IceStateDiv = document.querySelector('div#pc2IceState');
var pc2ConnStateDiv = document.querySelector('div#pc2ConnState');

var localstream;
var pc1;
var pc2;

var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function gotStream(stream) {
  trace('Received local stream');
  video1.srcObject = stream;
  localstream = stream;
  callButton.disabled = false;
}

function start() {
  trace('Requesting local stream');
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ', e.name);
  });
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  trace('Starting call');
  var videoTracks = localstream.getVideoTracks();
  var audioTracks = localstream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace('Using Video device: ' + videoTracks[0].label);
  }
  if (audioTracks.length > 0) {
    trace('Using Audio device: ' + audioTracks[0].label);
  }
  var servers = null;

  pc1 = new RTCPeerConnection(servers);
  trace('Created local peer connection object pc1');
  pc1StateDiv.textContent = pc1.signalingState;
  pc1.onsignalingstatechange = stateCallback1;

  pc1IceStateDiv.textContent = pc1.iceConnectionState;
  pc1.oniceconnectionstatechange = iceStateCallback1;
  pc1.onicecandidate = function(e) {
    onIceCandidate(pc1, e);
  };
  pc1.onconnectionstatechange = connStateCallback1;
  pc1ConnectionStateDiv.textContent = pc1.connectionState;

  pc2 = new RTCPeerConnection(servers);
  trace('Created remote peer connection object pc2');
  pc2StateDiv.textContent = pc2.signalingState;
  pc2.onsignalingstatechange = stateCallback2;

  pc2IceStateDiv.textContent = pc2.iceConnectionState;
  pc2.oniceconnectionstatechange = iceStateCallback2;
  pc2.onicecandidate = function(e) {
    onIceCandidate(pc2, e);
  };
  pc2.onconnectionstatechange = connStateCallback2;
  pc2ConnectionStateDiv.textContent = pc2.connectionState;
  pc2.ontrack = gotRemoteStream;
  localstream.getTracks().forEach(
    function(track) {
      pc1.addTrack(
        track,
        localstream
      );
    }
  );
  trace('Adding Local Stream to peer connection');
  pc1.createOffer(
    offerOptions
  ).then(
    gotDescription1,
    onCreateSessionDescriptionError
  );
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function gotDescription1(description) {
  pc1.setLocalDescription(description);
  trace('Offer from pc1: \n' + description.sdp);
  pc2.setRemoteDescription(description);
  pc2.createAnswer().then(
    gotDescription2,
    onCreateSessionDescriptionError
  );
}

function gotDescription2(description) {
  pc2.setLocalDescription(description);
  trace('Answer from pc2 \n' + description.sdp);
  pc1.setRemoteDescription(description);
}

function hangup() {
  trace('Ending call');
  pc1.close();
  pc2.close();
  pc1StateDiv.textContent += ' => ' + pc1.signalingState;
  pc2StateDiv.textContent += ' => ' + pc2.signalingState;
  pc1IceStateDiv.textContent += ' => ' + pc1.iceConnectionState;
  pc2IceStateDiv.textContent += ' => ' + pc2.iceConnectionState;
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}

function gotRemoteStream(e) {
  if (video2.srcObject !== e.streams[0]) {
    video2.srcObject = e.streams[0];
    trace('Got remote stream');
  }
}

function stateCallback1() {
  var state;
  if (pc1) {
    state = pc1.signalingState;
    trace('pc1 state change callback, state: ' + state);
    pc1StateDiv.textContent += ' => ' + state;
  }
}

function stateCallback2() {
  var state;
  if (pc2) {
    state = pc2.signalingState;
    trace('pc2 state change callback, state: ' + state);
    pc2StateDiv.textContent += ' => ' + state;
  }
}

function iceStateCallback1() {
  var iceState;
  if (pc1) {
    iceState = pc1.iceConnectionState;
    trace('pc1 ICE connection state change callback, state: ' + iceState);
    pc1IceStateDiv.textContent += ' => ' + iceState;
  }
}

function iceStateCallback2() {
  var iceState;
  if (pc2) {
    iceState = pc2.iceConnectionState;
    trace('pc2 ICE connection state change callback, state: ' + iceState);
    pc2IceStateDiv.textContent += ' => ' + iceState;
  }
}

function connStateCallback1() {
  var connectionState;
  if (pc1) {
    connectionState = pc1.connectionState;
    trace('pc1 connection state change callback, state: ' + connectionState);
    pc1ConnStateDiv.textContent += ' => ' + connectionState;
  }
}

function connStateCallback2() {
  var connectionState;
  if (pc2) {
    connectionState = pc2.connectionState;
    trace('pc2 connection state change callback, state: ' + connectionState);
    pc2ConnStateDiv.textContent += ' => ' + connectionState;
  }
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function onIceCandidate(pc, event) {
  getOtherPc(pc).addIceCandidate(event.candidate)
  .then(
    function() {
      onAddIceCandidateSuccess(pc);
    },
    function(err) {
      onAddIceCandidateError(pc, err);
    }
  );
  trace(getName(pc) + ' ICE candidate: \n' + (event.candidate ?
      event.candidate.candidate : '(null)'));
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}
