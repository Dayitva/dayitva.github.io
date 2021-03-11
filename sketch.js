let song, amplitude;

function preload() {
  song = loadSound('./addons/sound.mp3');
}

function setup() {
  createCanvas(displayWidth, displayHeight);
  amplitude = new p5.Amplitude();
}

function draw() {
  background('black');
  let level = amplitude.getLevel();
  let diameter = (level*400) + 10;
  fill('red');
  ellipse(displayWidth/2, displayHeight/2, diameter, diameter);
}

function mousePressed() {
  if (!song.isPlaying())
    song.play();

  else
    song.stop();
}