var player_pos = [225, 225];
var square_size = 40;
var speed = 5;
var playersJson = {};
var username = document.querySelector('meta[name="username"]').content;
var bullets = [];
var bulletImage;
var lastTimeShot = null; 
var bulletShootTime = 0.7;
var health = 100;
var progressBarSize = 55;
var button;
globalThis.socket = io();

socket.on('connect', function() {
    socket.emit('client_connected', {
        "username": username
    });
});

socket.on('client_connected', function(success) {
    console.log(1)
    if (!success["success"]) {
        if (!success["invalid"]) window.location.replace("/username_taken");
        else window.location.replace("/invalid_username");
    }
});

socket.on('get_player_positions', function(data) {
    playersJson = data
});

socket.on('update_user_pos', function(data) {
    if (!data["success"]) console.log(data["error"])
})

function update_user_pos() {
    socket.emit('update_user_pos', {
        "username": username,
        "x": player_pos[0],
        "y": player_pos[1],
        "bullets": bullets
    });
}

function setBulletTime() {
    lastTimeShot = new Date().getTime();
}

function calculateTimeSinceLastShot() {
    if (lastTimeShot === null) {
        return true
    }
    return ((new Date().getTime() - lastTimeShot)/1000 >= bulletShootTime)
}

function respawn() {
    socket.emit('respawn', {
        "username": username
    });
    health = 100
    player_pos = [225, 225];
    button.remove()
}

socket.emit("get_player_positions")

function setup() {
    globalThis.canvas = createCanvas(450, 450);
    canvas.parent("p5jscanvas");
    textAlign(CENTER, CENTER);
}

function preload() {
    bulletImage = loadImage('/images/bullet.png');
}

function draw() {
    clear();
    background(0, 0, 0);
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
        if (player_pos[0] > 0) player_pos[0]-=speed;
        else player_pos[0] = 0;
        update_user_pos();
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
        if (player_pos[0] < 450-square_size) player_pos[0]+=speed;
        else player_pos[0] = 450-square_size;
        update_user_pos();
    }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
        if (player_pos[1] > 0) player_pos[1]-=speed;
        else player_pos[1] = 0;
        update_user_pos();
    }
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
        if (player_pos[1] < 450-square_size) player_pos[1]+=speed;
        else player_pos[1] = 450-square_size;
        update_user_pos();
    }
    if (health > 0) {
        square(player_pos[0], player_pos[1], square_size);
        textSize(14);
        fill(255, 255, 255);
        text(username, (player_pos[0]+((square_size/2)+2)), player_pos[1]-25);
        fill(150, 150, 150);
        rect(player_pos[0] + ((square_size-progressBarSize)/2), player_pos[1]-18, progressBarSize, 15);
        if (health <= 20) fill(255, 0, 0);
        else if (health <= 50) fill(255, 255, 0);
        else fill(0, 255, 0);
        rect(player_pos[0] + ((square_size-progressBarSize)/2), player_pos[1]-18, health*(progressBarSize/100), 15);
        fill(255, 255, 255);
        text(health, (player_pos[0]+((square_size/2)+2)), player_pos[1]-10);
        fill(255, 255, 255);
    } else {
        background(0, 0, 0);
        textSize(30);
        fill(255, 255, 255);
        text("You Died :(", 225-(textWidth("You Died :(")/2), 25);
        button = createButton("Respawn");
        button.position(0, 0);
        button.mousePressed(respawn);
    }
    
    for (let [key, value] of Object.entries(playersJson)) {
        if (key !== username && value != null && !value["dead"]) {
            square(value["x"], value["y"], square_size);
            textSize(14);
            fill(255, 255, 255);
            text(key, (value["x"]+((square_size/2)+2)), value["y"]-25);
            fill(150, 150, 150);
            rect(value["x"] + ((square_size-progressBarSize)/2), value["y"]-18, progressBarSize, 15);
            if (value["health"] <= 20) fill(255, 0, 0);
            else if (value["health"] <= 50) fill(255, 255, 0);
            else fill(0, 255, 0);
            rect(value["x"] + ((square_size-progressBarSize)/2), value["y"]-18, value["health"]*(progressBarSize/100), 15);
            fill(255, 255, 255);
            text(value["health"], (value["x"]+((square_size/2)+2)), value["y"]-10);
            for (let bullet of value["bullets"]) image(bulletImage, bullet[0], bullet[1]);
        } else if (key === username && value != null) {
            health = value["health"];
        }
    }

    for (let [index, bullet] of bullets.entries()) {
        image(bulletImage, bullet[0], bullet[1]);
        bullets[index] = [bullet[0] + (bullet[2] * 4), bullet[1] + (bullet[3] * 4), bullet[2], bullet[3]];
        update_user_pos();
        for (let [key, value] of Object.entries(playersJson)) {
            if (key !== username && value["dead"] !== true) {
                if (value["x"] < bullet[0] && bullet[0] < value["x"]+square_size) {
                    if (value["y"] < bullet[1] && bullet[1] < value["y"]+square_size) {
                        socket.emit("player_hit", {
                            "username": username,
                            "hitUser": key
                        });
                        bullets[index][0] = 475;
                    }
                }
            }
        }
    }
    var bullets2 = bullets.filter((bullet) => {
        return bullet[0] < 450;
    })
    if (bullets2.length !== bullets.length) {
        bullets = bullets2;
        update_user_pos();
    }
}

function keyPressed() {
    if (health > 0) {
        if (keyCode == 32) {
            if (calculateTimeSinceLastShot()) {
                var dir = createVector(mouseX-(player_pos[0]+square_size), mouseY-(player_pos[1]+(square_size/2))).normalize();
                bullets.push([
                    player_pos[0]+square_size, 
                    player_pos[1]+(square_size/2),
                    dir.x,
                    dir.y
                ]);
                setBulletTime();
                update_user_pos();
            }
        }
    }
}

function mouseClicked() {
    if (health > 0) {
        if (calculateTimeSinceLastShot()) {
            var dir = createVector(mouseX-(player_pos[0]+square_size), mouseY-(player_pos[1]+(square_size/2))).normalize();
            bullets.push([
                player_pos[0]+square_size, 
                player_pos[1]+(square_size/2),
                dir.x,
                dir.y
            ]);
            setBulletTime();
            update_user_pos();
        }
    }
}
