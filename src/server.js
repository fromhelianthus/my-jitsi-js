// backend

import express from "express";
import http from "http";
import SocketIO from "socket.io";

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

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", socket => {
    socket.on("enter_room", (roomName, done) => {
        console.log(roomName);
        setTimeout(() => {
            done("Hello from the backend.");
        }, 3000);
    });
})

httpServer.listen(3000, handleListen);
