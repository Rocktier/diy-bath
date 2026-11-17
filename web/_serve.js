const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if(p === '/') p = '/index.html';
  const file = path.join(root, p);
  if(!file.startsWith(root)){res.writeHead(403);return res.end('no');}
  fs.readFile(file,(e,d)=>{
    if(e){res.writeHead(404);return res.end('404');}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    res.end(d);
  });
}).listen(8765,'127.0.0.1',()=>console.log('serving on 8765'));
