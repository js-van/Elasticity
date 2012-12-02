"use strict";
var Viewer2D = require('./viewer2d.js').Viewer2D;

var body = document.body;
body.innerHTML = [
  '<div id="controls">',
    '<input type=button id=step value="Step">',
    '<input type=button id=play value="Play">',
    '<input type=button id=reset value="Reset">',
    '</br> Frame: <input type=number id=frame_no value=0 min=0 max='+(RUN.trajectory.length-1)+'>',
    '</br> Speed: <input type=number id=speed value=0.1 min=0>',
    '</br> Time: <input type=text id=time value=0>',
  '</div>',
  '<canvas id="canvas"></canvas>'
].join('\n');

var canvas = document.getElementById('canvas');;
canvas.width = 512;
canvas.height = 512;
canvas.style.width    = "100%";
canvas.style.height   = "100%";
canvas.style.position = "absolute";
canvas.style.top      = "0px";
canvas.style.left     = "0px";
canvas.style["z-index"] = "-1";

var viewer = Viewer2D(canvas, RUN);


var frame_slider  = document.getElementById("frame_no");
frame_slider.addEventListener('change', function() {
  viewer.setFrame(parseInt(frame_slider.value));
}, true);
viewer.on('frame', function(fno) {
  frame_slider.value = fno;
});

var speed_slider = document.getElementById("speed");
speed_slider.addEventListener('change', function() {
  viewer.anim_speed = parseFloat(speed_slider.value);
}, true)

var time_counter = document.getElementById("time");
viewer.on('tick', function(t) {
  time_counter.value = t;
}, true)


var step_button   = document.getElementById("step");
var play_button   = document.getElementById("play");
var reset_button  = document.getElementById("reset");

step_button.addEventListener("click", function() {
  viewer.step();
}, true);

play_button.addEventListener("click", function() {
  if(viewer.animating) {
    play_button.value = "Play";
    viewer.pause();
  } else {
    play_button.value = "Pause";
    viewer.play();
  }
}, true);

reset_button.addEventListener("click", function() {
  viewer.reset();
}, true);

