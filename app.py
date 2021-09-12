import os

from flask import Flask, render_template, redirect, request, flash
from flask_socketio import SocketIO, emit
from engineio.payload import Payload

Payload.max_decode_packets = 500
app = Flask(__name__)
app.secret_key = r'\x11\xca\x1f\x89X\x18\xe4\xa0p\x94\xce\xf8\xdf\x87v\xa7\xf2P\xd4\x87#!\xa8"'
socketio = SocketIO(app)

players = {}


@app.before_request
def before_request():
    # Only runs when on heroku
    if 'DYNO' in os.environ and request.url.startswith('http://'):
        url = request.url.replace('http://', 'https://', 1)
        code = 301
        return redirect(url, code=code)


@app.route("/")
def join():
    return render_template("join.html")


@app.route("/game", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        if "username" in request.form and request.form["username"].strip():
            if request.form["username"] not in players:
                return render_template("game.html", username=request.form["username"])
            else:
                flash("Username Taken")
        else:
            flash("Invalid Username")
    else:
        flash("Please Login Before Playing")

    return redirect("/")


@app.route("/username_taken")
def username_taken():
    flash("Username Taken")
    return redirect("/")


@app.route("/invalid_username")
def invalid_username():
    flash("Invalid Username")
    return redirect("/")


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
    if data["username"] not in players and data["username"].strip() != "":
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
        emit("client_connected", {
            "success": True
        })
    else:
        emit("client_connected", {
            "success": False,
            "invalid": not bool(data["username"].strip())
        })


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
            players[data["username"]]["kills"] += 1
    emit("get_player_positions", players, broadcast=True)


@socketio.on("respawn")
def respawn(data):
    players[data["username"]]["x"] = 225
    players[data["username"]]["y"] = 225
    players[data["username"]]["health"] = 100
    players[data["username"]]["bullets"] = []
    players[data["username"]]["dead"] = False
    players[data["username"]]["kills"] = 0
    emit("get_player_positions", players, broadcast=True)


if __name__ == "__main__":
    socketio.run(app, debug=True)
