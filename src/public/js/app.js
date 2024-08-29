// frontend
// app.js

const socket = io();

const welcome = document.getElementById("welcome");
const roomForm = welcome.querySelector("#room-form");
const nicknameForm = document.getElementById("nickname-form");
const room = document.getElementById("room");

room.hidden = true;

let roomName;
let myNickname = "You"; // default nickname

function addMessage(message) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function handleNicknameSubmit(event) {
    event.preventDefault();

    const input = nicknameForm.querySelector("input");
    const nickname = input.value;

    socket.emit("nickname", nickname, () => {
        myNickname = nickname;
        input.value = "";
        console.log(`Nickname set to ${myNickname}`);
    });
}

function handleMessageSubmit(event) {
    event.preventDefault();

    const input = room.querySelector("#msg input");
    const value = input.value;

    socket.emit("new_message", value, roomName, () => {
        addMessage(`${myNickname} (You): ${value}`);
    });

    input.value = "";
}

function handleRoomSubmit(event) {
    event.preventDefault();

    const input = roomForm.querySelector("input");
    socket.emit("enter_room", input.value, showRoom);

    roomName = input.value;
    input.value = "";
}

function showRoom() {
    welcome.hidden = true;
    room.hidden = false;

    const h3 = room.querySelector("h3");
    h3.innerText = `Room: ${roomName}`;

    const msgForm = room.querySelector("#msg");
    msgForm.addEventListener("submit", handleMessageSubmit);
}

roomForm.addEventListener("submit", handleRoomSubmit);
nicknameForm.addEventListener("submit", handleNicknameSubmit);

socket.on("welcome", (user, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room: ${roomName} (${newCount})`;
    addMessage(`${user} arrived!`);
});

socket.on("bye", (left, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room: ${roomName} (${newCount})`;
    addMessage(`${left} left...`);
});

socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul");
    roomList.innerHTML = "";

    if (rooms.length === 0) {
        return;
    }

    rooms.forEach((room) => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});
