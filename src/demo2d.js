var EventEmitter = require('events').EventEmitter;


function Demo2D(body, canvas, options) {
  //Create event emitter
  var result    = new EventEmitter();
  var context   = canvas.getContext("2d");
  
  result.fillStyle = '#f00';
  
  //Draw mesh
  function draw() {
    result.emit('draw_begin', context);
    context.save();
    var mesh      = body.mesh;
    var position  = body.position;
    context.fillStyle = result.fillStyle;
    for(var i=0; i<mesh.length; ++i) {
      var face = mesh[i];
      context.beginPath();
      context.moveTo(position[face[0]][0], position[face[0]][1]);
      for(var j=1; j<face.length; ++j) {
        var p = position[face[j];
        context.lineTo(p[0], p[1]);
      }
      context.closePath();
      context.fill();
    }
    context.restore();
    result.emit('draw_end', context);
  }
  
  //Do a time step
  function step() {
    result.emit('step');
    body.step();
  }
  
  //Input handling for mouse pointer
  var last_mouse  = [0,0];
  var cur_mouse   = [0,0];
  var mouse_state = 0;
  function handleMouse(ev) {
    var cur_mouse = [ev.clientX, ev.clientY];
    result.emit('mouse', cur_mouse, last_mouse, mouse_state);
    last_mouse = cur_mouse;
  }
  canvas.addEventListener("mousemove", handleMouse);
  canvas.addEventListener("mouseout",  function(ev) {
    mouse_state = 0;
    handleMouse(ev);
  });
  canvas.addEventListener("mouseover", function(ev) {
    last_mouse = [ev.clientX, ev.clientY];
    handleMouse(ev);
  });
  canvas.addEventListener("mousedown", function(ev) {
    mouse_state |= (1<<ev.button);
    handleMouse(ev);
  });
  canvas.addEventListener("mouseup",   function(ev) {
    mouse_state &= ~(1<<ev.button);
    handleMouse(ev);
  });
   
 
  return result;
}
