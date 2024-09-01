// backend
// server.js

import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => {
    socket.on("join_room", (roomName) => {
        socket.join(roomName);
        socket.room = roomName;
        socket.to(roomName).emit("new_user_joined", socket.id); 
    });

    socket.on("welcome", async () => {
        const roomName = socket.room;
        socket.to(roomName).emit("welcome", socket.id); 
    });

    socket.on("nickname_change", (nickname) => {
        socket.nickname = nickname;
        socket.to(socket.room).emit("nickname_update", `${nickname} has changed their nickname`);
    });

    socket.on("message", (data) => {
        // data.room is included in the emitted message from the client
        socket.to(data.room).emit("message", data); // Send message to the room
    });

    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer);
    });

    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });

    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice);
    });
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
