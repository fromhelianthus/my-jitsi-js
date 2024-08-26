import express from "express";

const app = express();

// Set the view engine to Pug
// The folder name for pug must be 'views'
app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use("/public", express.static(__dirname + "/public"))

// Route for the home page
// Only use the root directory ('/') for rendering
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`http://localhost:3000`);
app.listen(3000, handleListen);