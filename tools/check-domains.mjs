// 验证交付物中出现的每个外部域名：解析、证书签发者、真实归属
// 目的：排除"长得像官方站点的钓鱼域名"——只看域名字符串是不够的。
import tls from 'node:tls';
import { lookup } from 'node:dns/promises';

const HOSTS = [
  'github.com',
  'api.github.com',
  'avatars.githubusercontent.com',
  'camo.githubusercontent.com',
  'img.shields.io',
  'komarev.com',
  'readme-typing-svg.demolab.com',
  'skillicons.dev',
  'www.w3.org',
];

console.log('域名'.padEnd(34) + '解析IP'.padEnd(20) + '证书主体'.padEnd(34) + '签发者');
console.log('-'.repeat(120));

for (const h of HOSTS) {
  let ip = 'FAIL';
  try { ip = (await lookup(h)).address; } catch (e) { ip = 'FAIL:' + e.code; }

  const info = await new Promise((res) => {
    const sock = tls.connect(
      { host: h, port: 443, servername: h, rejectUnauthorized: false, timeout: 15000 },
      () => {
        const c = sock.getPeerCertificate();
        res({
          subject: c.subject?.CN || '(无 CN)',
          issuer: c.issuer?.O || c.issuer?.CN || '(未知)',
          validTo: c.valid_to,
          authorized: sock.authorized,
          authErr: sock.authorizationError || null,
        });
        sock.end();
      }
    );
    sock.on('error', (e) => res({ subject: 'FAIL', issuer: e.message.slice(0, 40), validTo: '', authorized: false }));
    sock.on('timeout', () => { sock.destroy(); res({ subject: 'TIMEOUT', issuer: '', validTo: '', authorized: false }); });
  });

  console.log(
    h.padEnd(34) +
      ip.padEnd(20) +
      String(info.subject).slice(0, 33).padEnd(34) +
      String(info.issuer).slice(0, 30) +
      (info.authorized ? '  [证书有效]' : `  [⚠ ${String(info.authErr).slice(0, 30)}]`)
  );
}

console.log('\n══ 严格校验：rejectUnauthorized = true（真正验证证书链与主机名匹配）══\n');
console.log('域名'.padEnd(34) + '结果'.padEnd(14) + '说明');
console.log('-'.repeat(110));

for (const h of HOSTS) {
  const r = await new Promise((res) => {
    const sock = tls.connect(
      { host: h, port: 443, servername: h, rejectUnauthorized: true, timeout: 15000 },
      () => {
        res({ ok: sock.authorized, err: sock.authorizationError || null, proto: sock.getProtocol() });
        sock.end();
      }
    );
    sock.on('error', (e) => res({ ok: false, err: e.code || e.message }));
    sock.on('timeout', () => { sock.destroy(); res({ ok: false, err: 'TIMEOUT' }); });
  });
  console.log(
    h.padEnd(34) +
      (r.ok ? '✅ 通过' : '❌ 失败').padEnd(14) +
      (r.ok ? `TLS ${r.proto}，证书链与主机名均校验通过` : `错误: ${r.err}`)
  );
}

console.log('\n判读要点：');
console.log('  · 上面这一组才是有效结论：只有 rejectUnauthorized=true 时通过，才说明没有中间人劫持。');
console.log('  · 泛域名证书（如 *.github.io 覆盖 camo.githubusercontent.com）属正常做法，');
console.log('    只要主机名匹配校验通过即可。');
console.log('  · www.w3.org 只作为 SVG 的 XML 命名空间出现，不会被实际请求。');
