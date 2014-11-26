var http        = require('http');
var querystring = require('querystring');
var fs          = require('fs');

function processPost(request, response, cb) {
  var queryData = '';

  if (request.method == 'POST') {
    request.on('data', function(data) {
      queryData += data;
        if (queryData.length > 1e6) {
          queryData = '';
          response.writeHead(413, {'Content-Type': 'text/plain'}).end();
          request.connection.destroy();
        }
      });

      request.on('end', function() {
        request.post = querystring.parse(queryData);
        cb();
      });
  } else {
    response.writeHead(405, {'Content-Type': 'text/plain'});
    response.end();
  }
}

http.createServer(function (req, res) {
  if (req.method == 'POST') {
    processPost(req, res, function() {
      var stringified = JSON.stringify(req.post);
      res.writeHead(200, 'OK', {'Content-Type': 'text/plain'});
      res.end(stringified);
    });
    return;
  }

  var fileName = __dirname + '/index.html';
  var mime     = 'text/html';

  if (req.url == '/build.js') {
    fileName = __dirname + '/../build/jquery.transloadit2-latest.js';
    mime     = 'text/javascript';
  }
  // serve our html file
  fs.readFile(fileName, function(err, content) {
    res.writeHead(200, 'OK', {'Content-Type': mime});
    res.end(content);
  });
}).listen(3000, '127.0.0.1');

console.log('Server running at http://127.0.0.1:3000/');
