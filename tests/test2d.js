"use strict";
var elasticity = require('../src/elasticity.js');
var simulator = require('../src/simulator.js');

//Create a simple body
function circle_body(ns, r) {
  var positions = [[0,0]];
  var faces = [[0, ns, 1]];
  
  for(var i=0; i<ns; ++i) {
    var theta = i * 2.0*Math.PI / ns;
    positions.push([r*Math.cos(theta), r*Math.sin(theta)]);
    if(i+1 < ns) {
      faces.push([0, i+1, i+2]);
    }
  }
  return { positions: positions, faces: faces };
}


//Set up demo
function setup(shape) {

  var body = elasticity.ElasticBody({
    rest_position:        shape.positions,
    mesh:                 shape.faces,
    delta_t:              0.01,
    damping:              0.0001,
    density:              1.0,
    stress_function:      elasticity.KirchoffMaterial(1.0, 0.25, 2)
  });
  
  body.body_force = [0, 100];
  
  return body;
}


var shape = circle_body(30.0, 100);
var body = setup(shape);

console.log(JSON.stringify(simulator.simulate(body, 1000.0, 1.0)));


