let song, amplitude;

function preload() {
  song = loadSound('addons/sound.mp3');
}

function setup() {
  createCanvas(displayWidth, displayHeight);
  amplitude = new p5.Amplitude();
}

function draw() {
  background('black');
  let level = amplitude.getLevel();
  fill('red');
  ellipse(width/2, height/2, level*400, level*400);
}

function mousePressed() {
  if (!song.isPlaying())
    song.play();

  else
    song.stop();
}