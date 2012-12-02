var state = [];
var path = require('path');

process.stdin.resume();

process.stdin.on('data', function(data) {

  state.push(data.toString());
});

process.stdin.on('end', function() {

  var browserify = require('browserify')({});
  browserify.addEntry('./index2d.js');

  console.log([
    "<html>",
      "<head>",
        "<title>Run Viewer</title>",
      "</head>",
      "<body>",
        "<script>",
          "var RUN = " + state.join('') + ";",
          browserify.bundle(),
        "</script>",
      "</body>",
    "</html>"
  ].join("\n"));
  
});