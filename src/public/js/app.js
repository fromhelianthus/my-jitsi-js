// app.js

const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

const messageForm = document.getElementById("messageForm");
const messages = document.getElementById("messages");
const chat = document.getElementById("chat");

call.hidden = true;
chat.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;
let nickname = "anon";
let canSendMessage = false;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(
            (device) => device.kind === "videoinput"
        );
        const currentCamera = myStream.getVideoTracks()[0];

        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;

            if (currentCamera.label === camera.label) {
                option.selected = true;
            }

            camerasSelect.appendChild(option);
        });
    } catch (e) {
        console.log(e);
    }
}

async function getMedia(deviceId) {
    const initialConstrains = {
        audio: true,
        video: { facingMode: "user" },
    };

    const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };

    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initialConstrains
        );

        myFace.srcObject = myStream;

        if (!deviceId) {
            await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

function handleMuteClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    muted = !muted;
    muteBtn.innerText = muted ? "Unmute" : "Mute";
}

function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    cameraOff = !cameraOff;
    cameraBtn.innerText = cameraOff ? "Camera On" : "Camera Off";
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);

    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    chat.hidden = false;

    try {
        await getMedia();
        makeConnection();
    } catch (error) {
        console.error("Failed to initialize media or connection", error);
    }
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    roomName = input.value;
    input.value = "";

    try {
        await initCall();
        socket.emit("join_room", roomName);
    } catch (error) {
        console.error("Error joining room:", error);
    }
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

const nicknameInput = document.getElementById("nicknameInput");
const nicknameSubmitBtn = document.getElementById("nicknameSubmit");

nicknameSubmitBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const newNickname = nicknameInput.value.trim();
    if (newNickname) {
        nickname = newNickname;
        socket.emit("nickname_change", nickname);
        nicknameInput.value = "";
    }
});

function sendMessage(message, sender) {
    const li = document.createElement("li");
    li.innerText =
        sender === nickname
            ? `${nickname} (You): ${message}`
            : `${sender}: ${message}`;
    messages.appendChild(li);
}

messageForm.addEventListener("submit", handleMessageSubmit);

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = messageForm.querySelector("input");
    const message = input.value.trim();

    if (!message) {
        return;
    }

    sendMessage(message, nickname);
    socket.emit("message", { text: message, sender: nickname, room: roomName });

    input.value = "";
}

function setupDataChannelListeners() {
    myDataChannel.addEventListener("message", (event) => {
        const { text, sender } = JSON.parse(event.data);
        sendMessage(text, sender);
    });

    myDataChannel.addEventListener("open", () => {
        console.log("DataChannel is open.");
        canSendMessage = true;
    });

    myDataChannel.addEventListener("close", () => {
        console.log("DataChannel is closed.");
        canSendMessage = false;
    });
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    roomName = input.value;
    input.value = "";

    await initCall();
    socket.emit("join_room", roomName);
}

socket.on("room_full", () => {
    alert("The room is full. Please try another room.");
    welcome.hidden = false;
    call.hidden = true;
    chat.hidden = true;
});

socket.on("welcome", async () => {
    if (!myDataChannel || myDataChannel.readyState !== "open") {
        myDataChannel = myPeerConnection.createDataChannel("chat");
        setupDataChannelListeners();
        console.log("DataChannel created");
    }

    const offer = await myPeerConnection.createOffer();
    await myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
});

socket.on("new_user_joined", async (userId) => {
    console.log(`${userId} has joined the room.`);
    const offer = await myPeerConnection.createOffer();
    await myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
});

socket.on("nickname_update", (newNickname) => {
    sendMessage(`${newNickname} has changed their nickname`, "System");
});

socket.on("offer", async (offer) => {
    await myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    await myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
});

socket.on("answer", async (answer) => {
    console.log("received the answer");
    await myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
});

socket.on("message", (data) => {
    if (data.sender === nickname) {
        return;
    }
    sendMessage(data.text, data.sender);
});

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    });

    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("track", handleTrack);

    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleTrack(event) {
    console.log("Received remote stream");
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = event.streams[0];
}

function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
}
