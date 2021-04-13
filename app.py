from flask import *
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.secret_key = r'\x11\xca\x1f\x89X\x18\xe4\xa0p\x94\xce\xf8\xdf\x87v\xa7\xf2P\xd4\x87#!\xa8"'
socketio = SocketIO(app)

players = {}

@app.route("/")
def join():
    return render_template("join.html")

@app.route("/game", methods=["GET", "POST"])
def home():
    if request.method == "GET":
        return render_template("game.html")
    elif request.method == "POST":
        return render_template("game.html", username = request.form["username"])


@socketio.on("connect")
def connect():
    pass

@socketio.on("disconnect")
def disconnect():
    sid = request.sid
    for player in players.copy():
        if players[player]["sid"] == sid:
            players.pop(player)
    emit("get_player_positions", players, broadcast=True)

@socketio.on("client_connected")
def handle_client_connect_event(data):
    if data["username"] not in players:
        players[data["username"]] = {
            "x": 255, 
            "y": 255, 
            "bullets": [], 
            "health": 100,
            "sid": request.sid
        }
    emit("get_player_positions", players, broadcast=True)

@socketio.on("get_player_positions")
def get_player_positions():
    emit("get_player_positions", players)



@socketio.on("update_user_pos")
def update_user_pos(data):
    if data["username"] in players:
        if players[data["username"]]["sid"] == request.sid:
            players[data["username"]]["x"] = data["x"]
            players[data["username"]]["y"] = data["y"]
            players[data["username"]]["bullets"] = data["bullets"]
        emit("update_user_pos", {
            "success": True
        })
        emit("get_player_positions", players, broadcast=True)
    else:
        emit("update_user_pos", {
            "success": False,
            "error": "username taken"
        })

@socketio.on("player_hit")
def player_hit(data):
    print(data)
    emit("get_player_positions", players, broadcast=True)
    

if __name__ == "__main__":
    socketio.run(app, debug=True)
