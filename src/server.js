// backend

import express from "express";
import http from "http";
import WebSocket from "ws";

const app = express();

// Set the view engine to Pug
// The folder name for pug must be 'views'
app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use("/public", express.static(__dirname + "/public"));

// Route for the home page
// Only use the root directory ('/') for rendering
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`http://localhost:3000`);

// Create an HTTP server and integrate the WebSocket server on the same port
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function onSocketClose() {
    console.log("Disconnected from the browser.");
}

// fake db
const sockets = [];

wss.on("connection", (socket) => {
    sockets.push(socket);
    console.log("Connected to browser.");

    socket.on("close", onSocketClose);

    socket["nickname"] = "June";
    socket.on("message", (msg) => {
        const message = JSON.parse(msg);

        switch (message.type) {
            case "new_message":
                sockets.forEach((aSocket) =>
                    aSocket.send(`${socket.nickname}: ${message.payload}`)
                );
                break;
            case "nickname":
                socket["nickname"] = message.payload;
                break;
        }
    });
});

server.listen(3000, handleListen);
