const express = require('express'),
    exphbs = require('express-handlebars'),
    { Server } = require("socket.io"),
    io = new Server(server),
    path = require('path'),
    prod = 'DYNO' in process.env
    port = process.env.PORT || 3000;


const app = express();

let forceHTTPS = (req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.get('Host')}${req.url}`);
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
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
}))
app.set('view engine', 'handlebars')

// Set static folder
app.use(express.static(path.join(__dirname, 'static')));


app.get("/", (req, res) => {
    res.render('join', {});
})

app.post("/game", (req, res) => {
    res.render('game', {
        "username": req.body.username,
    });
})

app.get("/game", (req, res) => {
    res.render('join', {
        messages: ["Please Login Before Playing"]
    })
})

io.on('connection', (socket) => {
    console.log("user connected")
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


// @socketio.on("disconnect")
// def disconnect():
//     sid = request.sid
//     for player in players.copy():
//         if players[player]["sid"] == sid:
//             players.pop(player)
//     emit("get_player_positions", players, broadcast=True)


// @socketio.on("client_connected")
// def handle_client_connect_event(data):
//     if data["username"] not in players and data["username"].strip() != "":
//         players[data["username"]] = {
//             "x": 225,
//             "y": 225,
//             "bullets": [],
//             "health": 100,
//             "dead": False,
//             "kills": 0,
//             "sid": request.sid
//         }
//         emit("get_player_positions", players, broadcast=True)
//         emit("client_connected", {
//             "success": True
//         })
//     else:
//         emit("client_connected", {
//             "success": False,
//             "invalid": not bool(data["username"].strip())
//         })


// @socketio.on("get_player_positions")
// def get_player_positions():
//     emit("get_player_positions", players)


// @socketio.on("update_user_pos")
// def update_user_pos(data):
//     if data["username"] in players:
//         if players[data["username"]]["sid"] == request.sid:
//             players[data["username"]]["x"] = data["x"]
//             players[data["username"]]["y"] = data["y"]
//             players[data["username"]]["bullets"] = data["bullets"]
//         emit("update_user_pos", {
//             "success": True
//         })
//         emit("get_player_positions", players, broadcast=True)
//     else:
//         emit("update_user_pos", {
//             "success": False,
//             "error": "username taken"
//         })


// @socketio.on("player_hit")
// def player_hit(data):
//     if data["username"] in players:
//         players[data["hitUser"]]["health"] -= 10
//         if players[data["hitUser"]]["health"] <= 0:
//             players[data["hitUser"]]["dead"] = True
//             players[data["username"]]["kills"] += 1
//     emit("get_player_positions", players, broadcast=True)


// @socketio.on("respawn")
// def respawn(data):
//     players[data["username"]]["x"] = 225
//     players[data["username"]]["y"] = 225
//     players[data["username"]]["health"] = 100
//     players[data["username"]]["bullets"] = []
//     players[data["username"]]["dead"] = False
//     players[data["username"]]["kills"] = 0
//     emit("get_player_positions", players, broadcast=True)


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

