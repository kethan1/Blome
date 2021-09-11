const express = require("express"),
    exphbs = require("express-handlebars"),
    // io = require('socket.io')(),
    path = require("path"),
    prod = "DYNO" in process.env
    port = process.env.PORT || 3000;


const app = express();
const httpServer = require("http").createServer(app);
const options = { /* ... */ };
const io = require("socket.io")(httpServer, options);

let forceHTTPS = (req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
        return res.redirect(`https://${req.get("Host")}${req.url}`);
    }
    return next();
};


// Redirect HTTP requests to HTTPS if in production
if (prod) {
    app.use(forceHTTPS);
}

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Handlebars Middleware
app.engine("handlebars", exphbs({
    defaultLayout: "main",
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
}))
app.set("view engine", "handlebars")

// Set static folder
app.use(express.static(path.join(__dirname, "static")));


app.get("/", (req, res) => {
    res.render("join", {});
})

app.post("/game", (req, res) => {
    res.render("game", {
        "username": req.body.username,
    });
})

app.get("/game", (req, res) => {
    res.render("join", {
        messages: ["Please Login Before Playing"]
    })
})

let players = [];

io.on("connection", (socket) => {
    console.log("user connected")
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("disconnect", () => {
        for (let player of players) {
            if (player.id == socket.id) {
                players.splice(player, 1);
            }
        }
        io.sockets.emit("get_player_positions", players)
    })

    socket.on("client_connected", (data) => {
        if (!(data["username"] in players) && data["username"].trim() !== "") {
            players[data["username"]] = {
                "x": 225,
                "y": 225,
                "bullets": [],
                "health": 100,
                "dead": false,
                "kills": 0,
                "sid": socket.id,
            }
            io.sockets.emit("get_player_positions", players)
            socket.emit("client_connected", {
                "success": true
            })
        } else {
            socket.emit("client_connected", {
                "success": false,
                "invalid": !Boolean(data["username"].trim())
            })
        }
    })

    socket.on("get_player_positions", () => {
        socket.emit("get_player_positions", players)
    })

    socket.on("update_player_position", (data) => {
        if (data["username"] in players) {
            if (players[data["username"]]["sid"] == socket.id) {
                players[data["username"]]["x"] = data["x"];
                players[data["username"]]["y"] = data["y"];
                io.sockets.emit("get_player_positions", players)
            }
        }
    });

    socket.on("player_hit", (data) => {
        if (data["username"] in players) {
            if (players[data["username"]]["sid"] == socket.id) {
                players[data["hitUser"]]["health"] -= 10;
                if (players[data["username"]]["health"] <= 0) {
                    players[data["username"]]["dead"] = true;
                }
                io.sockets.emit("get_player_positions", players)
            }
        }
    })

    socket.on("respawn", (data) => {
        players[data["username"]]["x"] = 225;
        players[data["username"]]["y"] = 225;
        players[data["username"]]["health"] = 100;
        players[data["username"]]["bullets"] = [];
        players[data["username"]]["dead"] = false;
        players[data["username"]]["kills"] = 0;
        io.sockets.emit("get_player_positions", players);
    })
});

httpServer.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});
