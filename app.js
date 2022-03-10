const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
	console.log('Request for ' + req.url + ' by method ' + req.method);

	if (req.method == 'GET') {
		var furl;
		if (req.url == '/') furl = '/index.html';
		else furl = req.url;

		var fpath = path.resolve('./public' + furl);
		const fext = path.extname(fpath);
		console.log(fpath);
		if (fext == '.html') {
			fs.open(fpath, (err, fd) => {
				if (err) {
					fpath = path.resolve('./public/404.html');
					res.statusCode = 404;
					res.setHeader('Content-Type', 'text/html');
					fs.createReadStream(fpath).pipe(res);
					return;
				}
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/html');
				fs.createReadStream(fpath).pipe(res);
			})
		}
		else if (fext == '.js') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/javascript');
			fs.createReadStream(fpath).pipe(res);
		}
		else if (fext == '.json') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			fs.createReadStream(fpath).pipe(res);
		}
		else if (fext == '.css') {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/css');
			fs.createReadStream(fpath).pipe(res);
		}
		else {
			fpath = path.resolve('./public/404.html');
			res.statusCode = 404;
			res.setHeader('Content-Type', 'text/html');
			fs.createReadStream(fpath).pipe(res);
		}
	}
	else {
		fpath = path.resolve('./public/404.html');
		res.statusCode = 404;
		res.setHeader('Content-Type', 'text/html');
		fs.createReadStream(fpath).pipe(res);
	}
});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
})
