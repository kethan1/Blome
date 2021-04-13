var player_pos = [225, 225];
var square_size = 40;
var speed = 3;
var playersJson = {};
var username = document.querySelector('meta[name="username"]').content;
var bullets = [];
var bulletImage;
var lastTimeShot = null;
var bulletShootTime = 0.4;
globalThis.socket = io();

socket.on('connect', function() {
    socket.emit('client_connected', {
        "username": username
    });
});

socket.on('get_player_positions', function(data) {
    playersJson = data
});

socket.on('update_user_pos', function(data) {
    if (!data["success"]) {
        console.log(data["error"])
    }
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
    var d = new Date();
    var n = d.getTime();
    lastTimeShot = n;
}

function calculateTimeSinceLastShot() {
    var timeSinceLastShot;
    if (lastTimeShot != null) {
        var d = new Date();
        var n = d.getTime();
        timeSinceLastShot = (n - lastTimeShot)/1000
    } else {
        timeSinceLastShot = bulletShootTime
    }
    if (timeSinceLastShot >= bulletShootTime) {
        return true
    }
    return false
}

socket.emit("get_player_positions")

function setup() {
    canvas = createCanvas(450, 450)
    canvas.parent("p5jscanvas");
    textAlign(CENTER, CENTER);
}

function preload() {
    bulletImage = loadImage('/static/images/bullet.png')
}

function draw() {
    background(0, 0, 0);
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
        if (player_pos[0] > 0) player_pos[0]-=speed
        update_user_pos()
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
        if (player_pos[0] < 450-square_size) player_pos[0]+=speed
        update_user_pos()
    }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
        if (player_pos[1] > 0) player_pos[1]-=speed
        update_user_pos()
    }
    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
        if (player_pos[1] < 450-square_size) player_pos[1]+=speed
        update_user_pos()
    }
    square(player_pos[0], player_pos[1], square_size);
    textSize(14);
    text(username, player_pos[0]+((square_size/2)+2), player_pos[1]-10);
    fill(255, 255, 255);

    // socket.emit("get_player_positions");

    for (let [key, value] of Object.entries(playersJson)) {
        if (key !== username && value != null) {
            square(value["x"], value["y"], square_size);
            textSize(14);
            text(key, (value["x"]+((square_size/2)+2)), value["y"]-10);
            fill(255, 255, 255);
            for (let bullet of value["bullets"]) {
                image(bulletImage, bullet[0], bullet[1]);
            }
        }
    }

    bullets = bullets.filter((bullet) => {
        return (bullet[0] < 450)
    })  

    for (let [index, bullet] of bullets.entries()) {
        image(bulletImage, bullet[0], bullet[1]);
        bullets[index] = [bullet[0]+4, bullet[1]]
        update_user_pos()
        for (let [key, value] of Object.entries(playersJson)) {
            if (value["x"] < bullet[0] && bullet[0] < value["x"]+square_size) {
                if (value["y"] < bullet[1] && bullet[1] < value["y"]+square_size) {
                    console.log("hit")
                }
            }
        }
    }
}

function keyPressed() {
    if (keyCode == 32) {
        if (calculateTimeSinceLastShot()) {
            bullets.push([player_pos[0]+square_size, player_pos[1]+(square_size/2)])
            setBulletTime()
            update_user_pos()
        }
    }
}