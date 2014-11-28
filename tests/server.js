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

function respondHtml(res, content) {
  var headerFile = __dirname + '/fixtures/header.html';
  fs.readFile(headerFile, function(err, header) {

    var footerFile = __dirname + '/fixtures/footer.html';
    fs.readFile(footerFile, function(err, footer) {
      var body = header + content + footer;
      res.writeHead(200, 'OK', {'Content-Type': 'text/html'});
      res.end(body);
    });
  });
}

function addFixturePath(content) {
  var toReplace = '<span id="fixture_path">' + __dirname + '/fixtures</span>';
  return content.replace(/<span id="fixture_path"><\/span>/, toReplace);
}

function serveHtmlFile(res, filename) {
  var fileName = __dirname + '/fixtures/' + filename;

  fs.readFile(fileName, function(err, content) {
    content = content.toString();
    content = addFixturePath(content);
    respondHtml(res, content);
  });
}

function serveBuildJs(res) {
  var fileName = __dirname + '/../build/jquery.transloadit2-latest.js';

  fs.readFile(fileName, function(err, content) {
    content = content.toString();

    res.writeHead(200, 'OK', {'Content-Type': 'text/javascript'});
    res.end(content);
  });
}

http.createServer(function (req, res) {
  if (req.method == 'POST') {
    processPost(req, res, function() {
      var stringified = JSON.stringify(req.post);
      respondHtml(res, '<body>' + stringified + '</body>');
    });
    return;
  }

  if (req.url == '/build.js') {
    return serveBuildJs(res);
  }

  if (req.url === '/trigger-on-file-select') {
    return serveHtmlFile(res, 'trigger_on_file_select.html');
  }

  serveHtmlFile(res, 'standard_resize.html');

}).listen(3000, '127.0.0.1');

console.log('Server running at http://127.0.0.1:3000/');
