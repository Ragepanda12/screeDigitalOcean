var audioContext = null;
var meter = null;
var canvasContext = null;
var WIDTH=500;
var HEIGHT=50;
var rafID = null;

window.onload = function() {

    // grab our canvas
    //canvasContext = document.getElementById( "meter" ).getContext("2d");
    
    // monkeypatch Web Audio
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    
    // grab an audio context
    audioContext = new AudioContext();

    // Attempt to get audio input
    try {
        // monkeypatch getUserMedia
        navigator.getUserMedia = 
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;

        // ask for an audio input
        navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, didntGetStream);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }

}


function didntGetStream() {
    alert('Stream generation failed.');
}

var mediaStreamSource = null;

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Create a new volume meter and connect it.
    meter = createAudioMeter(audioContext);
    mediaStreamSource.connect(meter);

    // kick off the visual updating
   // drawLoop();

    // Create our 'main' state that will contain the game
    var mainState = {
        preload: function() { 
            // Load the bird sprite
            game.load.image('bird', 'assets/transparentAngry.png'); 
            game.load.image('pipe', 'assets/pepe.jpg');
        },

        create: function() { 
            this.score = 0;
            this.labelScore = game.add.text(20, 20, "0", 
                { font: "30px Arial", fill: "#ffffff" });  

            this.timer = game.time.events.loop(1500*((window.innerHeight)/400), this.addRowOfPipes, this); 
            this.pipes = game.add.group();
            // Change the background color of the game to blue
            game.stage.backgroundColor = '#71c5cf';

            // Set the physics system
            game.physics.startSystem(Phaser.Physics.ARCADE);

            // Display the bird at the position x=100 and y=245
            this.bird = game.add.sprite(100, 245, 'bird');
            this.bird.width = window.innerHeight/8;
            this.bird.height = window.innerHeight/8;
            // Add physics to the bird
            // Needed for: movements, gravity, collisions, etc.
            game.physics.arcade.enable(this.bird);

            // Add gravity to the bird to make it fall
            this.bird.body.gravity.y = 1000;  

           /* // Call the 'jump' function when the spacekey is hit
            var spaceKey = game.input.keyboard.addKey(
                Phaser.Keyboard.SPACEBAR);
            spaceKey.onDown.add(this.jump, this);*/  
             // Move the anchor to the left and downward
            this.bird.anchor.setTo(-0.2, 0.5);    
        },

        update: function() {
/*            if (meter.volume*100 > 15){
                this.bird.body.gravity.y = -1000;
                this.jump();
            }
            else{*/
            if(this.bird.alive == true)
                this.bird.body.gravity.y = 1000 - meter.volume * 20000;
//            }
            else
                this.bird.body.gravity.y = 1000;
//document.getElementById("target").innerHTML = meter.volume * 10000;
            // If the bird is out of the screen (too high or too low)
            // Call the 'restartGame' function
            if (this.bird.y < 0 || this.bird.y > window.innerHeight)
                this.restartGame();
            game.physics.arcade.overlap(
                this.bird, this.pipes, this.hitPipe, null, this);  
            if (this.bird.angle < 20 && this.bird.body.gravity.y > 0)
                this.bird.angle += 1; 
            else if(this.bird.angle > -20 && this.bird.body.gravity.y < 0)
                this.bird.angle -= 1;
        },
        // Make the bird jump 
        jump: function() {
            if (this.bird.alive == false)
                return;  
            // Add a vertical velocity to the bird
            //this.bird.body.velocity.y = -350;
            // Create an animation on the bird
            var animation = game.add.tween(this.bird);
            // Change the angle of the bird to -20° in 100 milliseconds
            animation.to({angle: -20}, 100);

            // And start the animation
            animation.start(); 
        },

        // Restart the game
        restartGame: function() {
            // Start the 'main' state, which restarts the game
            game.state.start('main');
        },  

        addOnePipe: function(x, y) {
            // Create a pipe at the position x and y
            var pipe = game.add.sprite(x, y, 'pipe');
            pipe.width = window.innerHeight/10;
            pipe.height = window.innerHeight/10;
            // Add the pipe to our previously created group
            this.pipes.add(pipe);

            // Enable physics on the pipe 
            game.physics.arcade.enable(pipe);

            // Add velocity to the pipe to make it move left
            pipe.body.velocity.x = -200; 

            // Automatically kill the pipe when it's no longer visible 
            pipe.checkWorldBounds = true;
            pipe.outOfBoundsKill = true;
        },
        addRowOfPipes: function() {
            // Randomly pick a number between 1 and 5
            // This will be the hole position
            var hole = Math.floor(Math.random() * 5) + 1;

            // Add the 6 pipes 
            // With one big hole at position 'hole' and 'hole + 1'
            for (var i = 0; i < 8; i++)
                if (i != hole && i != hole + 1 && i != hole - 1) 
                    this.addOnePipe(window.innerHeight*1.2, i * window.innerHeight/8 + 10);  
            this.score += 1;
            this.labelScore.text = this.score; 
        },
        hitPipe: function() {
            // If the bird has already hit a pipe, do nothing
            // It means the bird is already falling off the screen
            if (this.bird.alive == false)
                return;

            // Set the alive property of the bird to false
            this.bird.alive = false;

            // Prevent new pipes from appearing
            game.time.events.remove(this.timer);

            // Go through all the pipes, and stop their movement
            this.pipes.forEach(function(p){
                p.body.velocity.x = 0;
            }, this);
        }, 

    };

    // Initialize Phaser, and create a 400px by 490px game
    var game = new Phaser.Game(window.innerHeight*1.2, window.innerHeight);

    // Add the 'mainState' and call it 'main'
    game.state.add('main', mainState); 

    // Start the state to actually start the game
    game.state.start('main');

}

/*function drawLoop( time ) {
    // clear the background
    canvasContext.clearRect(0,0,WIDTH,HEIGHT);

    // check if we're currently clipping
    if (meter.checkClipping())
        canvasContext.fillStyle = "red";
    else
        canvasContext.fillStyle = "green";

    // draw a bar based on the current volume
    canvasContext.fillRect(0, 0, meter.volume*WIDTH*1.4, HEIGHT);

    // set up the next visual callback
    rafID = window.requestAnimationFrame( drawLoop );
}*/


/**
 * fullscreenify()
 * Stretch canvas to size of window.
 *
 * Zachary Johnson
 * http://www.zachstronaut.com/
 *
 * See also: https://gist.github.com/1178522
 */

