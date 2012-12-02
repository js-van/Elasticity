"use strict";
var numeric = require('numeric');
var EPSILON = 1e-6;

function factorial(n) {
  var s = 1;
  for(var i=1; i<=n; ++i) {
    s *= i;
  }
  return s;
}

//The constraint container class
function Constraint(position_func, jacobian_func) {
  this.active         = true;
  this.position_func  = position_func;
  this.jacobian_func  = jacobian_func;
}

//Only valid for small deformations
exports.LinearMaterial = function(mu, lambda, DIMENSION) {
  var stress_func = [];
  
  var init_term = "var tr=" + lambda + "*(";
  for(var i=0; i<DIMENSION; ++i) {
    init_term += "D["+i + "][" + i + "]";
  }
  init_term += ");";
  stress_func.push(init_term);
  
  for(var i=0; i<DIMENSION; ++i) {
    for(var j=0; j<DIMENSION; ++j) {
      var term = "R[" + i + "][" + j + "]=";
      if(i === j) {
        term += tr + "+" + (2.0*mu) + "*(D["+i+"]["+j+"]-1)";
      } else {
        term += mu + "*(D["+i+"]["+j+"]" + "D["+j+"]["+i+"])"
      }
      term += ";";
      stress_func.push(term);
    }
  }

  return new Function("R", "D", stress_func.join("\n"));
}


exports.KirchoffMaterial = function(mu, lambda, DIMENSION) {

  var stress_func = [];
  
  var init_term = "var tr=" + lambda + "*(";
  for(var i=0; i<DIMENSION; ++i) {
    if(i > 0) {
      init_term += "+";
    }
    init_term += "D["+i + "][" + i + "]";
  }
  init_term += ");";
  stress_func.push(init_term);
  
  for(var i=0; i<DIMENSION; ++i) {
    for(var j=0; j<DIMENSION; ++j) {
      var term = "var sigma" + i + "" + j + "=";
      if(i === j) {
        term += "tr+" + (2.0*mu) + "*(D["+i+"]["+j+"]-1)";
      } else {
        term += mu + "*(D["+i+"]["+j+"]+D["+j+"]["+i+"])"
      }
      term += ";";
      stress_func.push(term);
    }
  }
  
  for(var i=0; i<DIMENSION; ++i) {
    for(var j=0; j<DIMENSION; ++j) {
      var term = "R["+i+"]["+j+"]=";
      for(var k=0; k<DIMENSION; ++k) {
        if(k > 0) {
          term += "+";
        }
        term += "D["+i+"]["+k+"]*sigma"+k+""+j;
      }
      stress_func.push(term);
    }
  }
  
  return new Function("R", "D", stress_func.join("\n"));
}

//Creates a model for a nonlinear elastic body with large deformations
exports.ElasticBody = function(args) {
  "use strict";

  //Constants and other fixed parameters
  var rest_position       = args.rest_position;
  var mesh                = args.mesh;
  var DIMENSION           = rest_position[0].length;
  var VERTEX_COUNT        = rest_position.length;
  var ELEMENT_COUNT       = mesh.length;
  var MAX_ITER            = args.max_iterations || 5;
  var MAX_DELTA_T         = args.delta_t || 1.0;
  var VELOCITY_DAMPING    = args.damping || 0.0;
  var DENSITY             = args.density || 1.0;
  
  //Callbacks
  var stress_function     = args.stress_function;

  //Precalculated stuff
  var total_mass          = 0.0;
  var lumped_masses       = numeric.rep([VERTEX_COUNT], 0.0);
  var lumped_masses_inv   = numeric.rep([VERTEX_COUNT], 0.0);
  var shape_matrix        = numeric.rep([ELEMENT_COUNT,DIMENSION,DIMENSION], 0.0);
  var shape_measure       = numeric.rep([ELEMENT_COUNT], 0.0);
  var shape_inverse       = new Array(ELEMENT_COUNT);
  
  //State variables
  var cur_buf             = 0;
  var position_buf        = numeric.rep([2,VERTEX_COUNT,DIMENSION], 0.0);
  var velocity_buf        = numeric.rep([2,VERTEX_COUNT,DIMENSION], 0.0);
  var force               = numeric.rep([VERTEX_COUNT,DIMENSION], 0.0);
  var time                = 0.0;
  
  //Final data structure
  var result;

  //Initialization
  (function() {
  
    //Initialize state vectors
    var initial = (args.initial_position || rest_position);
    for(var i=0; i<VERTEX_COUNT; ++i) {
      for(var j=0; j<DIMENSION; ++j) {
        position_buf[1][i][j] = position_buf[0][i][j] = initial[i][j];
      }
    }
  
    //Precalculate shape matrices
    for(var i=0; i<ELEMENT_COUNT; ++i) {
      var simplex = mesh[i];
      var Dm = shape_matrix[i];
      var v0 = rest_position[simplex[0]];
      for(var j=0; j<DIMENSION; ++j) {
        var Dmj = Dm[j];
        var v1  = rest_position[simplex[j+1]];
        for(var k=0; k<DIMENSION; ++k) {
          Dmj[k] = v1[k] - v0[k];
        }
      }
      shape_inverse[i] = numeric.inv(Dm);
      shape_measure[i] = Math.abs(numeric.det(Dm) / factorial(DIMENSION));
      total_mass      += shape_measure[i];
   
      for(var j=0; j<=DIMENSION; ++j) {
        lumped_masses[simplex[j]] += shape_measure[i];
      }
    }
    
    //Calculate inverse lumped masses
    for(var i=0; i<VERTEX_COUNT; ++i) {
      lumped_masses[i] *= DENSITY;
      if(lumped_masses[i] > EPSILON) {
        lumped_masses_inv[i] = 1.0 / lumped_masses[i];
      } else {
        lumped_masses_inv[i] = 0.0;
      }
    }
  })();
  
  
  //Helper methods
  var mul_inplace = new Function("a", "b", "c", [
    "for(var i=0; i<"+DIMENSION+";++i) {",
      "row = a[i];",
      "for(var j=0; j<"+DIMENSION+";++j) {",
        "s=0.0;",
        "for(var k=0; k<"+DIMENSION+";++k) {",
          "s+=row[k]*b[k][j];",
        "}",
        "c[i][j] = s;",
      "}",
    "}"
  ].join("\n"));
  
  var mul_inplace_t = new Function("a", "b", "c", [
    "for(var i=0; i<"+DIMENSION+";++i) {",
      "row = a[i];",
      "for(var j=0; j<"+DIMENSION+";++j) {",
        "s=0.0;",
        "col = b[j]",
        "for(var k=0; k<"+DIMENSION+";++k) {",
          "s+=row[k]*col[k];",
        "}",
        "c[i][j] = s;",
      "}",
    "}"
  ].join("\n"));


  //Apply constraints to problem
  function apply_constraints(t, position, velocity) {
    var constraints = result.constraints;
    
    //TODO: Solve for constraint forces
  
  }
  
  //Compute stress
  var Ds = numeric.rep([DIMENSION, DIMENSION], 0.0);
  var F  = numeric.rep([DIMENSION, DIMENSION], 0.0);
  var P  = numeric.rep([DIMENSION, DIMENSION], 0.0);
  var H  = numeric.rep([DIMENSION, DIMENSION], 0.0);
  
  function compute_stresses(active_position) {
    for(var i=0; i<ELEMENT_COUNT; ++i) {
      var simplex = mesh[i];
      var inv_shape = shape_inverse[i];
      
      //Compute deformation gradient
      var v0 = active_position[simplex[0]];
      for(var j=0; j<DIMENSION; ++j) {
        var v1 = active_position[simplex[j+1]];
        var d  = Ds[j];
        for(var k=0; k<DIMENSION; ++k) {
          d[k] = v1[k] - v0[k];
        }
      }
      mul_inplace(Ds, inv_shape, F);
      
      //Evaluate stress
      stress_function(F, P);
      
      //Compute forces
      mul_inplace_t(P, inv_shape, H);
      var weight = shape_measure[i];
      var f0 = force[simplex[0]];
      for(var j=0; j<DIMENSION; ++j) {
        var h  = H[j];
        var f1 = force[simplex[j+1]];
        for(var k=0; k<DIMENSION; ++k) {
          f0[k] -= h[k];
          f1[k] += h[k];
        }
      }
    }
  }

  //Integrate velocity one timestep
  function integrate_velocity(n_velocity, o_velocity, delta_t) {
   
    for(var i=0; i<VERTEX_COUNT; ++i) {
      var v0 = o_velocity[i];
      var v1 = n_velocity[i];
      var f  = force[i];
      var m  = lumped_masses_inv[i] * delta_t;
      
      for(var j=0; j<DIMENSION; ++j) {
        v1[j] = v0[j] +  f[j] * m;
      }
    }
  }

  //Integrate position
  function integrate_position(
    n_position, o_position,
    velocity,
    delta_t) {
    
    for(var i=0; i<VERTEX_COUNT; ++i) {
      var u0 = o_position[i];
      var u1 = n_position[i];
      var v  = velocity[i];
      
      for(var j=0; j<DIMENSION; ++j) {
        u1[j] = u0[j] + v[j] * delta_t;
      }
    }
  }

  //Solve for a fixed time step
  function solve(
    n_position, o_position, 
    n_velocity, o_velocity,
    delta_t) {
    
    //Compute initial estimate for position
    integrate_position(n_position, o_position, o_velocity, delta_t);
    
    var body_force = new Array(DIMENSION);
    for(var i=0; i<DIMENSION; ++i) {
      body_force[i] = result.body_force[i] / total_mass;
    }
    
    //Iterate a few times to get convergence
    for(var iter=0; iter<MAX_ITER; ++iter) {
    
      //Compute forces
      for(var i=0; i<VERTEX_COUNT; ++i) {
        var f = force[i];
        var m = lumped_masses[i];
        for(var j=0; j<DIMENSION; ++j) {
          f[j] = body_force[j] * m;
        }
      }
      compute_stresses(n_position);
      
      
      //Integrate and apply constraints
      integrate_velocity(n_velocity, o_velocity, delta_t);
      apply_constraints(time+delta_t, n_position, n_velocity);
      integrate_position(n_position, o_position, n_velocity, delta_t);
    }
    
    //Advance time
    time += delta_t;
  }


  //Advances simulation by t
  function step(step_t) {
  
    //Set default step size if not specified
    if(!step_t) {
      step_t = MAX_DELTA_T;
    }
  
    while(step_t > EPSILON) {
      //Compute minimum time step
      var delta_t = MAX_DELTA_T;
      delta_t = Math.min(delta_t, step_t);
      
      //Compute next buffer
      var next_buf = (cur_buf + 1) % position_buf.length;
      
      //Solve for next state
      solve(position_buf[next_buf], position_buf[cur_buf], 
            velocity_buf[next_buf], velocity_buf[cur_buf], 
            delta_t);

      //Advance simulation
      cur_buf = next_buf;
      step_t -= delta_t;
    }
  }
  
  //Create final body
  result = {
    step:           step,
    mass:           total_mass,
    body_force:     args.body_force || [0,0,0],
    constraints:    args.constraints || [],
    VERTEX_COUNT:   VERTEX_COUNT,
    ELEMENT_COUNT:  ELEMENT_COUNT,
    DIMENSION:      DIMENSION
  };
  Object.defineProperty(result, "position", {
    get: function() { return position_buf[cur_buf]; }
  });
  Object.defineProperty(result, "velocity", {
    get: function() { return velocity_buf[cur_buf]; }
  });
  Object.defineProperty(result, "force", {
    get: function() { return force; }
  });
  Object.defineProperty(result, "mesh", {
    get: function() { return mesh; }
  });
  Object.defineProperty(result, "time", {
    get: function() { return time; }
  })
  
  return result;
}

