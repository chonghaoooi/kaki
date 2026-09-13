import http from 'node:http';
import path from 'node:path';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApi } from './api.mjs';
import { inspectRequestTarget, isLoopbackHost } from './request-guard.mjs';
import { encodedAsset, assetCacheControl, isTextAsset } from './static-assets.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const production=args.includes('--production');
const port=Number(args.includes('--port')?args[args.indexOf('--port')+1]:process.env.PORT||4173);
const host=args.includes('--host')?args[args.indexOf('--host')+1]:'127.0.0.1';
const demoMode=process.env.KAKI_DEMO_MODE!=='false';
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Choose a valid port.');
if(demoMode&&!isLoopbackHost(host))throw new Error('The demo server can only listen on a loopback host.');
if(!demoMode&&(!args.includes('--port')&&!process.env.PORT))throw new Error('Live mode requires an explicit --port or PORT.');
if(!demoMode&&!process.env.KAKI_ORIGIN)throw new Error('Live mode requires a canonical KAKI_ORIGIN.');
const dataDir=path.join(root,'data');
await mkdir(dataDir,{recursive:true});
const api=createApi({dbPath:process.env.KAKI_DB_PATH||path.join(dataDir,'kaki.sqlite'),demoMode});
const vite=production?null:await (await import('vite')).createServer({root,configFile:path.join(root,'vite.config.ts'),server:{middlewareMode:true,fs:{strict:true,allow:[root],deny:['**/data/**','**/server/**','**/.env*','**/.git/**','**/.openai/**','**/*.{sqlite,sqlite3,db}','**/*.{sqlite,sqlite3,db}-*']}},appType:'mpa'});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  try{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
    const inspected=inspectRequestTarget(req.url,{production});
    if(!inspected.allowed){res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('Forbidden');return;}
    if(await api.handle(req,res))return;
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
    if(vite){vite.middlewares(req,res,()=>{res.statusCode=404;res.end('Not found')});return;}
    const url=new URL(req.url,'http://localhost');const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    const base=path.join(root,'dist/client');const file=path.resolve(base,'.'+relative);
    if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    const info=await stat(file).catch(()=>null);if(!info?.isFile()){res.writeHead(404);res.end('Not found');return;}
    const selected=await encodedAsset(file,info,req.headers['accept-encoding']);
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control',assetCacheControl(file,base));
    res.setHeader('Content-Length',selected.info.size);
    if(isTextAsset(file))res.setHeader('Vary','Accept-Encoding');
    if(selected.encoding)res.setHeader('Content-Encoding',selected.encoding);
    if(req.method==='HEAD'){res.end();return;}
    res.end(await readFile(selected.file));
  }catch(error){console.error('Request failed:',error.message);if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Something went wrong. Please try again.'}));}else res.end();}
});
server.listen(port,host,()=>{const boundPort=server.address().port;console.log(`kaki is ready at http://${host}:${boundPort}/desktop.html\nMobile preview: http://${host}:${boundPort}/\nMode: ${demoMode?'local demo':'live email verification'}`)});
async function close(){server.close();await vite?.close();api.close();process.exit(0)}
process.on('SIGINT',close);process.on('SIGTERM',close);
