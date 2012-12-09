"use strict";
var Viewer2D = require('./viewer2d.js').Viewer2D;
var Buffer = require('buffer').Buffer;
var viewer;
var container;

function removeViewer() {
  if(!viewer) {
    return;
  }
  viewer.destroy();
  container.innerHTML = "";
}


function createViewer(RUN) {
  container.innerHTML = [
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
  canvas.width            = 512;
  canvas.height           = 512;
  canvas.style.width      = "100%";
  canvas.style.height     = "100%";
  canvas.style.position   = "absolute";
  canvas.style.top        = "0px";
  canvas.style.left       = "0px";
  canvas.style["z-index"] = "-1";

  viewer = Viewer2D(canvas, RUN);

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
  step_button.addEventListener("click", function() {
    viewer.step();
  }, true);

  var play_button   = document.getElementById("play");
  play_button.addEventListener("click", function() {
    if(viewer.animating) {
      play_button.value = "Play";
      viewer.pause();
    } else {
      play_button.value = "Pause";
      viewer.play();
    }
  }, true);

  var reset_button  = document.getElementById("reset");
  reset_button.addEventListener("click", function() {
    viewer.reset();
  }, true);
}


function decodeDataURL(string) {
  var regex = /^data:;base64,(.*)$/;
  var matches = string.match(regex);
  var buffer = new Buffer(matches[1], 'base64');
  return buffer.toString();
}


function init() {
  container = document.createElement("div");
  document.body.appendChild(container);
  container.innerHTML = "Drag .run here to view";

  function cancel(e) {
    if (e.preventDefault) e.preventDefault(); // required by FF + Safari
    e.dataTransfer.dropEffect = 'copy'; // tells the browser what drop effect is allowed here
    return false; // required by IE
  }

  container.style.width = "100%";
  container.style.height = "100%";

  // Tells the browser that we *can* drop on this target
  container.addEventListener('dragover', cancel, false);
  container.addEventListener('dragenter', cancel, false);
  container.addEventListener('drop', function (e) {
    e.preventDefault(); // stops the browser from redirecting off to the text.
    var file = e.dataTransfer.files[0],
        reader = new FileReader();
    reader.onload = function (event) {
      var data = JSON.parse(decodeDataURL(event.target.result));
      removeViewer();
      createViewer(data);
    };
    reader.readAsDataURL(file);
    return false;
  }, false);
}

window.onload = init;
