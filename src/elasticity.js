var numeric = require('numeric');

//Creates a model for a nonlinear elastic body with large deformations
function ElasticModel(
  DIMENSION, 
  stress_function) {

  function compute_stresses(
    mesh,
    rest_position,
    active_position,
    stress_function,
    forces) {

    var deformation_gradient = numeric.rep([DIMENSION, DIMENSION]);

    for(var i=0; i<mesh.length; ++i) {
      var simplex = mesh[i];
      var r0 = rest_position[simplex[0]];
      var a0 = active_position[simplex[0]];
      
      for(var j=1; j<DIMENSION; ++j) {
        var vertex = simplex[j];
        var d = deformation_gradient[j];
        var r1 = rest_position[vertex];
        var a1 = active_position[vertex];
        
        for(var k=0; k<DIMENSION; ++k) {
          d[k] = (r1[k] - r0[k]) - 
        }
      }
    }
  }

  //Integrate velocity one timestep
  function integrate_velocity(
    n_velocity, o_velocity,
    lumped_masses,
    forces,
    delta_t) {
   
    for(var i=0; i<n_positions.length; ++i) {
      var v0 = o_position[i];
      var v1 = n_position[i];
      var f  = forces[i];
      var m  = lumped_masses[i];
      
      for(var j=0; j<DIMENSION; ++j) {
        v1[j] = v0[j];
        var m_r = m[j];
        for(var k=0; k<DIMENSION; ++k) {
          v1[j] += m_r[k] * f[k] * delta_t;
        }
      }
    }
  }

  //Integrate position
  function integrate_position(
    n_position, o_position,
    velocity,
    delta_t) {
    
    for(var i=0; i<n_positions.length; ++i) {
      var u0 = o_position[i];
      var u1 = n_position[i];
      var v  = velocity[i];
      
      for(var j=0; j<DIMENSION; ++j) {
        u1[j] = u0[j] + v[j] * delta_t;
      }
    }
  }

  //Time step simulation one unit
  function step(
    mesh, 
    rest_position,
    n_position, o_position, 
    n_velocity, o_velocity,
    lumped_masses,
    forces,
    body_force,
    constraint_function,
    delta_t) {
   
    //Initialize force accumulator to body force
    for(var i=0; i<forces.length; ++i) {
      var f   = forces[i];
      var bf  = body_forces[i];
      for(var j=0; j<DIMENSION; ++j) {
        f[j] = bf[j];
      }
    }
   
    //Compute stresses
    compute_stresses(
      mesh,
      rest_position, 
      o_position,
      stress_function,
      forces);
   
    //Integrate velocity
    integrate_velocity(
      n_velocity, o_velocity,
      lumped_masses,
      forces,
      delta_t);
      
    //TODO: Apply velocity constraints
    constraint_function(o_position, n_velocity);
    
    //Integrate position
    integrate_position(
      n_position, o_position, 
      n_velocity,
      delta_t);
  }


  //Advances simulation t steps
  function solve(
    mesh, 
    positions,
    velocities,
    t, 
    forces, 
    constraints) {
    
    var n_position = numeric.rep([positions.length, DIMENSION]);
    var n_velocity = numeric.rep([velocities.length, DIMENSION]);

    while(t > EPSILON) {
      //Compute minimum time step
      var delta_t = 0.01;
      delta_t = Math.min(delta_t, t);
      
      //Timestep
      step();
      
      
    }
    
  }
  
  return {
    
    solve: solve
  };
}
