//Body simulator
exports.simulate = function(body, max_t, delta_t) {
  var states = [];
  while(body.time < max_t) {
    var p = body.position;
    var v = body.velocity;
    
    var np = [];
    var nv = [];
    
    for(var i=0; i<p.length; ++i) {
      var x = new Array(body.DIMENSION);
      var y = new Array(body.DIMENSION);
      for(var j=0; j<body.DIMENSION; ++j) {
        x[j] = p[i][j];
        y[j] = v[i][j];
      }
      np.push(x);
      nv.push(y);
    }
    states.push({t:body.time, p:np, v:nv});
    
    //Step system
    body.step(delta_t);
  }
  
  return { mesh: body.mesh, trajectory: states };
}