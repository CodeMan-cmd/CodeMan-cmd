// 验证两件事：
//  1) 被投毒的域名，在本机不同解析途径下结果是否一致（判断投毒层级）
//  2) GitHub 的 camo 代理能否成功抓取一个 *.vercel.app 的图片（判断"主页是否真会坏图"）
import { Resolver } from 'node:dns/promises';
import { lookup } from 'node:dns/promises';

const HOSTS = [
  'capsule-render.vercel.app',
  'github-profile-trophy.vercel.app',
  'github-readme-activity-graph.vercel.app',
  'github-readme-stats.vercel.app',
  'vercel.com',
  'img.shields.io',
];

console.log('══ 1) 多解析途径对比（看投毒发生在哪一层）══\n');
console.log('域名'.padEnd(42), '系统getaddrinfo'.padEnd(22), '8.8.8.8'.padEnd(20), '1.1.1.1');
console.log('-'.repeat(110));

for (const h of HOSTS) {
  const cells = [];
  // 系统解析（与浏览器/系统一致，走 hosts + 本地 DNS 客户端）
  try {
    const r = await lookup(h);
    cells.push(r.address);
  } catch (e) { cells.push('FAIL:' + e.code); }

  // 显式指定公共 DNS 直查（绕过系统解析器）
  for (const dns of ['8.8.8.8', '1.1.1.1']) {
    try {
      const res = new Resolver();
      res.setServers([dns]);
      const addrs = await res.resolve4(h);
      cells.push(addrs.join(','));
    } catch (e) { cells.push('FAIL:' + e.code); }
  }
  console.log(h.padEnd(42), cells[0].padEnd(22), cells[1].padEnd(20), cells[2]);
}

console.log('\n说明：若"系统解析"与"8.8.8.8/1.1.1.1"结果不同 → 投毒发生在本地网络层（DNS 劫持）；');
console.log('      若三者一致 → 是权威 DNS 被污染或域名本身如此。\n');

// ── 2) camo 代理抓取验证 ──
console.log('══ 2) 关键验证：GitHub 的图片代理能否抓到 vercel.app 的图？══\n');

// camo 的工作方式：https://camo.githubusercontent.com/<HMAC>/<hex-encoded-url>
// HMAC 由 GitHub 用私钥签名，外部无法伪造。这里改为**间接验证**：
// 直接请求一个已知在 GitHub 页面上引用 vercel.app 图片的仓库页面，
// 看 GitHub 是否把它改写成了 camo 链接，以及该 camo 链接是否返回真实图片。
const TESTS = [
  ['camo 服务本身可达性', 'https://camo.githubusercontent.com/'],
  ['含 vercel.app 图片的真实 GitHub 页面', 'https://github.com/anuraghazra/github-readme-stats'],
];

for (const [name, url] of TESTS) {
  const t = Date.now();
  try {
    const c = new AbortController();
    const to = setTimeout(() => c.abort(), 20000);
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: c.signal, redirect: 'follow' });
    clearTimeout(to);
    const txt = await r.text();
    // 在页面里找 camo 链接，以及是否出现 vercel.app 的原始域名
    const camoLinks = (txt.match(/camo\.githubusercontent\.com\/[0-9a-f]+\/[0-9a-f]+/g) || []).slice(0, 3);
    console.log(`${name}`);
    console.log(`   status=${r.status}  ${Date.now() - t}ms  bytes=${txt.length}`);
    console.log(`   页面内 camo 链接 ${camoLinks.length} 个`);
    if (camoLinks.length) console.log(`   示例: https://${camoLinks[0].slice(0, 70)}...`);
  } catch (e) {
    console.log(`${name}\n   FAIL ${e.message}`);
  }
}
