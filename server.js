const http = require('http'),
  fs = require('fs'),
  url = require('url');

  fs.appendFile('log.txt', 'Server started at: ' + new Date() + '\n\n', (err) => {
    if (err) {
      console.log(err);
    }
  });

http.createServer((request, response) => {
  let addr = request.url,
    q = new URL(addr, 'http://' + request.headers.host),
    filePath = '';

  if (q.pathname.includes('documentation')) {
    filePath = 'documentation.html';
  } else {
    filePath = 'index.html';
  }

  fs.appendFile('log.txt', 'URL: ' + addr + '\nTimestamp: ' + new Date() + '\nPage loaded: ' + filePath + '\n\n', (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log('Pageload added to log.');
    }
  });


  fs.readFile(filePath, (err, data) => {
    if (err) {
      throw err;
    }

    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.write(data);
    response.end();

  });

}).listen(8080);
console.log('Test server is running on Port 8080.');