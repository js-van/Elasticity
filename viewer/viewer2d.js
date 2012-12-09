"use strict";

var EventEmitter = require('events').EventEmitter;

// shim layer with setTimeout fallback
var nextFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();


function Viewer2D(canvas, run) {
  //Create event emitter
  var result      = new EventEmitter();
  var context     = canvas.getContext("2d");
  var mesh        = run.mesh;
  var frames      = run.trajectory;
  var cur_frame   = 0;
  var cur_time    = 0.0;
  var destroyed   = false;
  
  result.fillStyle = '#f00';
  result.anim_speed = 0.1;
  
  function step_frame() {
    if(cur_frame >= frames.length-1) {
      return false;
    }
    cur_frame += 1;
    cur_time  = frames[cur_frame].t;
    result.emit("frame", cur_frame);
    return true;
  }

  //Draw mesh
  function draw() {
    if(destroyed) {
      return;
    }
  
  
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width/2, canvas.height/2);
    
    var next_frame = Math.min(cur_frame+1, frames.length-1);
    var p0 = frames[cur_frame].p;
    var p1 = frames[next_frame].p;
    var t = 0.0;
    if(cur_frame !== next_frame) {
      t = (cur_time - frames[cur_frame].t) / (frames[next_frame].t-frames[cur_frame].t);
    }
    
    context.fillStyle = result.fillStyle;
    for(var i=0; i<mesh.length; ++i) {
      var face = mesh[i];
      context.beginPath();
      for(var j=0; j<face.length; ++j) {
        var a = p0[face[j]];
        var b = p1[face[j]];
        var x = (1-t)*a[0]+t*b[0];
        var y = (1-t)*a[1]+t*b[1];
        if(j === 0) {
          context.moveTo(x,y);
        } else {
          context.lineTo(x,y);
        }
      }
      context.closePath();
      context.fill();
    }
    
    context.restore();
    
    result.emit("tick", cur_time);
    
    nextFrame(draw);
  }
  
  var animate_interval = null;
  
  function do_frame() {
    if(result.anim_speed < 0) {
      cur_time += result.anim_speed;
      var next_frame = Math.max(cur_frame-1, 0);
      if(cur_time < frames[next_frame].t) {
        cur_frame = next_frame;
        result.emit("frame", cur_frame);
        if(next_frame === cur_frame) {
          cur_time = frames[cur_frame].t;
        }
      }
    } else {
      cur_time += result.anim_speed;
      var next_frame = Math.min(cur_frame+1, frames.length-1);
      if(cur_time > frames[next_frame].t) {
        cur_frame = next_frame;
        result.emit("frame", cur_frame);
        if(next_frame === cur_frame) {
          cur_time = frames[cur_frame].t;
        }
      }
    }
  }
  
  function pause_animation() {
    if(animate_interval) {
      clearInterval(animate_interval);
      animate_interval = null;
    }
  }
  
  function play_animation() {
    if(!animate_interval) {
      animate_interval = setInterval(do_frame, 10);
    }
  }

  draw();
  
  result.destroy    = function() { pause_animation(); destroyed = true; }
  result.step       = step_frame;
  result.pause      = pause_animation;
  result.play       = play_animation;
  result.reset      = function() { cur_frame = 0; result.emit("frame", cur_frame); }
  result.setFrame   = function(n) {
    cur_frame = n;
    cur_time = frames[n].t;
  }
  
  Object.defineProperty(result, "animating", {
    get: function() {
      return !!animate_interval;
    }
  });
  
  return result;
}

exports.Viewer2D = Viewer2D;
