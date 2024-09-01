// frontend
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
let nickname = "anon";  // default nickname

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

    if (!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if (cameraOff) {
        cameraBtn.innerText = "Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Camera On";
        cameraOff = true;
    }
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

// Form
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    chat.hidden = false;

    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault(); // 기본 제출 동작 방지
    const input = welcomeForm.querySelector("input");
    roomName = input.value;
    input.value = ""; // 입력 필드 비우기

    await initCall(); // 초기화 및 통화 시작
    socket.emit("join_room", roomName); // 방 참가 이벤트 전송
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

const nicknameInput = document.getElementById("nicknameInput");
const nicknameSubmitBtn = document.getElementById("nicknameSubmit");

nicknameSubmitBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const newNickname = nicknameInput.value.trim();
    if (newNickname) {
        nickname = newNickname; // 새로운 닉네임으로 업데이트
        socket.emit("nickname_change", nickname); // 서버에 닉네임 변경 이벤트 전송
        nicknameInput.value = ""; // 입력 필드 비우기
    }
});

function sendMessage(message, sender) {
    const li = document.createElement("li");

    li.innerText = sender === nickname ? `${nickname} (You): ${message}` : `${sender}: ${message}`;
    messages.appendChild(li);
}

messageForm.addEventListener("submit", handleMessageSubmit);

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = messageForm.querySelector("input");
    const message = input.value;

    if (message.trim() === "") {
        return;
    }

    if (myDataChannel && myDataChannel.readyState === "open") {
        const chatMessage = JSON.stringify({ text: message, sender: nickname });
        myDataChannel.send(chatMessage);
        sendMessage(message, nickname);
    } else {
        console.error("DataChannel is not open yet.");
    }

    socket.emit("message", message);

    input.value = "";
}

function setupDataChannelListeners() {
    myDataChannel.addEventListener("message", (event) => {
        const { text, sender } = JSON.parse(event.data);
        sendMessage(text, sender);
    });
}

// Socket
socket.on("welcome", async () => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("open", () => {
        console.log("DataChannel is open now");
    });

    setupDataChannelListeners(); // 데이터 채널 리스너 설정

    console.log("DataChannel created");

    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");

    socket.emit("offer", offer, roomName);
});

socket.on("nickname_update", (newNickname) => {  
    sendMessage(`${newNickname} has changed their nickname`, "System");
});

socket.on("offer", async (offer) => {
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("open", () => {
            console.log("DataChannel is open now");
        });

        setupDataChannelListeners(); // 데이터 채널 리스너 설정
    });

    console.log("Received the offer");
    myPeerConnection.setRemoteDescription(offer);

    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    
    socket.emit("answer", answer, roomName);
    console.log("Sent the answer");
});

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
});

socket.on("message", (message, sender) => {
    sendMessage(message, sender);
});

// RTC
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
    // addStream -> track
    // myPeerConnection.addEventListener("addstream", handleAddStream);
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

function handleAddStream(data) {
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
}