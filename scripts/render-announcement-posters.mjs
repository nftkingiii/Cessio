import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = join(root, 'output', 'social');
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const mark = `<svg viewBox="0 0 512 512" aria-label="Cessio logo mark" role="img"><path fill="#9bed63" d="M84 84h260v88H172v168H84V84Z"/><path fill="#9bed63" d="M428 428H168v-88h172V172h88v256Z"/></svg>`;

const shared = `
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#101211;color:#f3f6f1}
  body{font-family:Arial,Helvetica,sans-serif}.poster{width:1600px;height:900px;position:relative;overflow:hidden;background:#101211}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(243,246,241,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(243,246,241,.055) 1px,transparent 1px);background-size:80px 80px;mask-image:linear-gradient(90deg,rgba(0,0,0,.9),transparent 82%)}
  .glow{position:absolute;width:620px;height:620px;border-radius:50%;filter:blur(100px);opacity:.12;right:-160px;top:-180px;background:#9bed63}.mark{width:48px;height:48px}.mark svg{display:block;width:100%;height:100%}
  .brand{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:16px;font-size:25px;font-weight:700;letter-spacing:5px;text-transform:uppercase}.brand span{padding-top:3px}.eyebrow{position:absolute;left:76px;top:205px;font:16px monospace;letter-spacing:4px;color:#9bed63;text-transform:uppercase}.headline{position:absolute;left:72px;top:260px;font-size:106px;line-height:.93;font-weight:700;letter-spacing:-5px;text-transform:uppercase}.headline .accent{color:#9bed63}.copy{position:absolute;left:78px;top:530px;width:590px;color:#aeb7af;font-size:22px;line-height:1.45}.rule{position:absolute;left:78px;top:650px;width:500px;height:2px;background:#9bed63}.meta{position:absolute;left:78px;top:688px;color:#d9e0d9;font:16px monospace;letter-spacing:2px;text-transform:uppercase}.footer{position:absolute;left:78px;bottom:54px;color:#7f8a82;font:14px monospace;letter-spacing:2px}.right{position:absolute;right:76px;bottom:55px;color:#9bed63;font:14px monospace;letter-spacing:2px}
  .diagram{position:absolute;right:82px;top:168px;width:690px;height:470px}.node{position:absolute;border:1px solid rgba(243,246,241,.3);background:rgba(16,18,17,.78);padding:22px 24px;min-width:205px}.node strong{display:block;font-size:20px;margin-bottom:9px}.node small{font:14px monospace;color:#9aa59b;letter-spacing:1px}.node.main{right:150px;top:155px;border-color:#9bed63;box-shadow:0 0 50px rgba(155,237,99,.12)}.node.top{right:12px;top:0}.node.bottom{left:0;bottom:8px}.line{position:absolute;height:1px;background:linear-gradient(90deg,rgba(155,237,99,0),#9bed63,rgba(155,237,99,0));transform-origin:left center}.l1{width:310px;left:390px;top:115px;transform:rotate(38deg)}.l2{width:355px;left:191px;top:309px;transform:rotate(-24deg)}.dot{position:absolute;width:9px;height:9px;background:#9bed63;border-radius:50%;box-shadow:0 0 22px #9bed63}.d1{right:300px;top:149px}.d2{left:180px;bottom:88px}
  .blue .glow{background:#628cff}.blue .headline .accent{color:#79a2ff}.blue .rule{background:#79a2ff}.blue .right{color:#79a2ff}.blue .node.main{border-color:#79a2ff;box-shadow:0 0 50px rgba(121,162,255,.14)}.blue .dot{background:#79a2ff;box-shadow:0 0 22px #79a2ff}.blue .line{background:linear-gradient(90deg,rgba(121,162,255,0),#79a2ff,rgba(121,162,255,0))}
  .blue .headline{font-size:88px}.blue .copy{top:560px}.blue .rule{top:685px}.blue .meta{top:720px}
`;

const mainnet = `<!doctype html><html><head><style>${shared}</style></head><body><main class="poster"><div class="grid"></div><div class="glow"></div><div class="brand"><div class="mark">${mark}</div><span>cessio</span></div><div class="eyebrow">BOT CHAIN / 677</div><div class="headline">MAINNET<br><span class="accent">IS LIVE.</span></div><div class="copy">Receivables funding is now settled on BOT Chain Mainnet. Cessio turns delivery evidence into structured funding decisions and verifiable on-chain lifecycle records.</div><div class="rule"></div><div class="meta">Verified contract &nbsp;•&nbsp; USDT settlement &nbsp;•&nbsp; Non-custodial wallet flow</div><div class="footer">CAPITAL, BACKED BY PROOF.</div><div class="right">CESSIO.APP / MAINNET</div><div class="diagram"><div class="line l1"></div><div class="line l2"></div><div class="dot d1"></div><div class="dot d2"></div><div class="node top"><strong>Work delivered</strong><small>evidence / invoice</small></div><div class="node main"><strong>Cessio</strong><small>assess → fund → settle</small></div><div class="node bottom"><strong>BOT Chain</strong><small>verified receipt / USDT</small></div></div></main></body></html>`;

const bdex = `<!doctype html><html><head><style>${shared}</style></head><body><main class="poster blue"><div class="grid"></div><div class="glow"></div><div class="brand"><div class="mark">${mark}</div><span>cessio</span></div><div class="eyebrow">BOT CHAIN / LIQUIDITY RAILS</div><div class="headline">SWAP.<br><span class="accent">BRIDGE.</span><br>FUND.</div><div class="copy">Cessio now connects the path into settlement: swap supported assets through BDEX or bridge USDT into BOT Chain, then fund verified receivables from the same app.</div><div class="rule"></div><div class="meta">BDEX swap &nbsp;•&nbsp; Official bridge &nbsp;•&nbsp; Wallet-controlled execution</div><div class="footer">FROM ASSETS TO SETTLEMENT.</div><div class="right">CESSIO.APP / BDEX RAILS</div><div class="diagram"><div class="line l1"></div><div class="line l2"></div><div class="dot d1"></div><div class="dot d2"></div><div class="node top"><strong>BDEX</strong><small>swap into USDT</small></div><div class="node main"><strong>Settlement</strong><small>BOT Chain USDT</small></div><div class="node bottom"><strong>Receivables</strong><small>fund verified work</small></div></div></main></body></html>`;

const routes = {'/mainnet': mainnet, '/bdex': bdex};
const server = createServer((request, response) => response.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(routes[request.url] ?? mainnet));
await mkdir(outputDirectory, {recursive:true});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const {port} = server.address();
const profile = join(process.env.TEMP ?? root, 'cessio-announcement-render');
try {
  for (const [route, filename] of [['/mainnet','cessio-mainnet-launch.png'], ['/bdex','cessio-bdex-swaps-bridge.png']]) {
    await run(edge, ['--headless=new','--disable-gpu','--no-first-run','--force-device-scale-factor=1',`--user-data-dir=${profile}`, '--window-size=1600,900', `--screenshot=${join(outputDirectory, filename)}`, `http://127.0.0.1:${port}${route}`], {timeout:30000});
  }
} finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
await writeFile(join(outputDirectory, 'README.md'), '# Cessio social announcement posters\n\n- cessio-mainnet-launch.png\n- cessio-bdex-swaps-bridge.png\n');
