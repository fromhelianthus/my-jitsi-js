const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");

function backendDone() {
    console.log("Backend's ready.");
}

function handleRoomSubmit(event) {
    event.preventDefault();
    const input = form.querySelector("input");

    // emit arguments
    socket.emit("enter_room", input.value, backendDone);
    input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);