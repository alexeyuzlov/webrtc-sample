import '../styles/style.scss';
import { io } from 'socket.io-client';

const server = 'localhost:4000';
const socket = io(server, {
    transports: ['websocket']
});

let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let peerConnection: RTCPeerConnection | null = null;

const localVideo: HTMLVideoElement = document.querySelector('#localVideo')!;
const remoteVideo: HTMLVideoElement = document.querySelector('#remoteVideo')!;

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

navigator.mediaDevices.getUserMedia({video: true, audio: true})
    .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

socket.on('offer', (offer) => {
    if (!peerConnection) {
        createPeerConnection();
    }
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    peerConnection.createAnswer()
        .then(answer => {
            peerConnection.setLocalDescription(answer);
            socket.emit('answer', answer);
        })
        .catch(error => {
            console.error('Error creating answer.', error);
        });
});

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', (candidate) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnection.addIceCandidate(iceCandidate);
});

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
        remoteStream = event.streams[0];
    };
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
}

function call() {
    if (!peerConnection) {
        createPeerConnection();
    }
    peerConnection.createOffer()
        .then(offer => {
            peerConnection.setLocalDescription(offer);
            socket.emit('offer', offer);
        })
        .catch(error => {
            console.error('Error creating offer.', error);
        });
}

document.addEventListener('click', () => {
    call();
})
