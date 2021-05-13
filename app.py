import os

from flask import *
from flask_socketio import SocketIO, emit
from engineio.payload import Payload

Payload.max_decode_packets = 50
app = Flask(__name__)
app.secret_key = r'\x11\xca\x1f\x89X\x18\xe4\xa0p\x94\xce\xf8\xdf\x87v\xa7\xf2P\xd4\x87#!\xa8"'
socketio = SocketIO(app)

players = {}

@app.before_request
def before_request():
    if 'DYNO' in os.environ: # Only runs when on heroku
        if request.url.startswith('http://'):
            url = request.url.replace('http://', 'https://', 1)
            code = 301
            return redirect(url, code=code)

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
            "x": 225, 
            "y": 225, 
            "bullets": [], 
            "health": 100,
            "dead": False,
            "kills": 0,
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
    if data["username"] in players:
        players[data["hitUser"]]["health"] -= 10
        if players[data["hitUser"]]["health"] <= 0:
            players[data["hitUser"]]["dead"] = True
            players[data["username"]]["kills"]+=1
    emit("get_player_positions", players, broadcast=True)

@socketio.on("respawn")
def respawn(data):
    players[data["username"]]["x"] = 225
    players[data["username"]]["y"] = 225
    players[data["username"]]["health"] = 100
    players[data["username"]]["bullets"] = []
    players[data["username"]]["dead"] = False
    players[data["username"]]["kills"] = 0
    print(1)
    emit("get_player_positions", players, broadcast=True)
    

if __name__ == "__main__":
    socketio.run(app, debug=True)
