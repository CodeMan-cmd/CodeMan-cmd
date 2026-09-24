#!/usr/bin/env node
/**
 * verify-assets.mjs — README 上线前的资产体检
 *
 * 做三件事：
 *   A. 解析 README.md，抽出**全部远程图片 URL**，逐个 HTTP 验证可达且 content-type 正确。
 *      → 防的是"坏图"：GitHub 主页上出现破图标比没有图更难看。
 *   B. 解析 README.md 里的**相对路径引用**（./assets/*.svg），确认文件真实存在。
 *      → 防的是"改名/搬家后引用失效"。
 *   C. 校验本地 SVG 是否**结构良好**（XML 可解析、根元素是 <svg>）。
 *      → 防的是：GitHub 加载 SVG 走的是 <img> 语义，XML 一旦有语法错误，
 *        整个图会静默变成空白/坏图，且不会有任何报错提示。
 *
 * 为什么 RRemote 检查是必须的：
 *   实测发现 *.vercel.app 在部分网络下 DNS 被污染
 *   （github-readme-stats.vercel.app 解析到 80.87.199.46 等无关 IP），
 *   而 GitHub 主页最热门的统计卡服务恰好都托管在那里。
 *
 * 用法：
 *   node tools/verify-assets.mjs [README路径]
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const README = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, 'README.md');
const TIMEOUT_MS = 15000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) readme-asset-check';

/** 已知在对中国大陆网络下不可靠的托管域名（实测 DNS 污染） */
const KNOWN_BAD_HOSTS = [
  { host: 'vercel.app', why: 'DNS 被污染：实测解析到 80.87.199.46 / 31.13.80.169 等无关 IP' },
  { host: 'herokuapp.com', why: '实测连接超时（10s+）' },
];

function pad(s, n) {
  s = String(s);
  let w = 0;
  for (const ch of s) w += /[\u4e00-\u9fff\uff00-\uffef，。：（）]/.test(ch) ? 2 : 1;
  return s + ' '.repeat(Math.max(0, n - w));
}

/* ── 从 markdown 抽 URL ── */
function extract(md) {
  const remote = new Set();
  const local = new Set();

  const patterns = [
    /!\[[^\]]*\]\(([^)\s]+)\)/g,                 // ![alt](url)
    /<img[^>]+src=["']([^"']+)["']/gi,           // <img src="url">
    /<source[^>]+srcset=["']([^"'\s]+)/gi,       // <picture><source srcset="url">  ← 双主题卡片用这个
    /<a[^>]+href=["']([^"']+)["']/gi,            // <a href="url"> —— 链接也查，坏链同样难看
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(md))) {
      const u = m[1].trim();
      if (/^https?:\/\//i.test(u)) {
        remote.add(u);
      } else if (
        !u.startsWith('#') &&          // 页内锚点
        !u.startsWith('mailto:')       // 邮件链接
      ) {
        // 站内绝对路径（以单个 / 开头）不是仓库内的文件，例如 <a href="/CodeMan-cmd">
        // 在 GitHub 上会解析成 github.com/CodeMan-cmd。早先版本把它当成本地文件，
        // 报"文件不存在"——典型的校验器误报，会让人去改本来正确的写法。
        if (u.startsWith('/') && !u.startsWith('//')) continue;
        // 纯外链协议（tel: 等）也跳过
        if (/^[a-z][a-z0-9+.-]*:/i.test(u)) continue;
        local.add(u.split('#')[0]);
      }
    }
  }
  return { remote: [...remote], local: [...local] };
}

async function head(url) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    let bytes = 0;
    if (res.body) {
      const reader = res.body.getReader();
      const { value } = await reader.read();
      bytes = value ? value.length : 0;
      reader.cancel().catch(() => {});
    }
    return { ok: res.ok, status: res.status, ct: res.headers.get('content-type') || '', ms: Date.now() - t0, bytes };
  } catch (e) {
    clearTimeout(timer);
    const timedOut = e.name === 'AbortError';
    return { ok: false, status: timedOut ? `TIMEOUT` : 'FAIL', ct: '', ms: Date.now() - t0, bytes: 0 };
  }
}

/* ── 极简 XML 良好性检查（不引第三方依赖） ── */
function checkSvgWellFormed(text) {
  const errs = [];
  if (!/^\s*<svg[\s>]/i.test(text.replace(/^<\?xml[^>]*\?>\s*/, ''))) errs.push('根元素不是 <svg>');
  if (!/<\/svg>\s*$/i.test(text)) errs.push('缺少闭合的 </svg>');

  // 标签配对检查。
  // 关键细节：不能预设某些元素"永远是自闭合"。例如 <rect> / <circle> 通常写成
  // <rect ... />，但只要它们内部嵌了动画子元素（<animate>），就**必须**写成
  // <rect ...>...</rect>。早期版本把这些名字放进 selfClosing 白名单，
  // 结果把合法的动画 SVG 全部误报成"标签不匹配"——这类误报很危险，
  // 会让人以为文件坏了而把好文件改坏。
  // 正确判定：看标签自身是否以 "/>" 结尾——是则自闭合，否则必须配对。
  const stack = [];
  const tagRe = /<\/?([A-Za-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(text))) {
    const [full, name, , slash] = m;
    if (full.startsWith('</')) {
      const top = stack.pop();
      if (top !== name) errs.push(`标签不匹配：</${name}> 对应的是 <${top || '空'}>`);
    } else if (!slash) {
      stack.push(name);
    }
  }
  if (stack.length) errs.push(`有未闭合标签: ${stack.join(', ')}`);

  // 未转义的裸 & （XML 里非法，会让整个 SVG 解析失败）
  const bareAmp = text.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
  if (bareAmp) errs.push(`存在 ${bareAmp.length} 处未转义的 & 字符`);

  // GitHub 会剥掉的属性（写了也无效，提醒一下）
  if (/\son\w+=/i.test(text)) errs.push('含内联事件属性 on*（GitHub 渲染时会剥离）');

  return errs;
}

/* ═══════════════ 执行 ═══════════════ */
if (!existsSync(README)) {
  console.error(`✗ 找不到 README：${README}`);
  process.exit(2);
}
const md = readFileSync(README, 'utf8');
const { remote, local } = extract(md);

console.log(`\n检查对象：${relative(ROOT, README) || README}`);
console.log(`抽出远程 URL ${remote.length} 个、本地引用 ${local.length} 个\n`);

let failures = 0;

/* ── A. 远程 URL ── */
console.log('【A】远程资源可达性');
console.log('-'.repeat(96));
for (const url of remote) {
  const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
  const knownBad = KNOWN_BAD_HOSTS.find((b) => host === b.host || host.endsWith('.' + b.host));
  const r = await head(url);
  const isImage = /^image\//i.test(r.ct) || r.ct.includes('svg');
  let verdict;
  if (knownBad && !r.ok) verdict = `坏图（已知不可靠域名：${knownBad.host}）`;
  else if (!r.ok) verdict = `坏图（${r.status}）`;
  else if (!isImage && /\.(png|jpe?g|gif|svg|webp)/i.test(url) === false && !/img\.shields|skillicons|komarev|readme-typing/i.test(host)) verdict = 'OK(非图片)';
  else if (r.bytes === 0) verdict = '空响应';
  else verdict = 'OK';

  const bad = verdict !== 'OK' && verdict !== 'OK(非图片)';
  if (bad) {
    failures++;
    console.log(`  ❌ ${pad(host, 34)} ${verdict}`);
    console.log(`     ${url}`);
    if (knownBad) console.log(`     原因：${knownBad.why}`);
  } else {
    console.log(`  ✅ ${pad(host, 34)} ${String(r.ms + 'ms').padEnd(8)} ${r.ct.slice(0, 32)}`);
  }
}

/* ── B. 本地引用 ── */
console.log('\n【B】本地相对路径引用');
console.log('-'.repeat(96));
for (const rel of local) {
  const p = resolve(ROOT, rel);
  const ok = existsSync(p);
  if (!ok) failures++;
  console.log(`  ${ok ? '✅' : '❌'} ${rel}${ok ? '' : '  ← 文件不存在，GitHub 上会显示为坏图'}`);
}

/* ── C. 本地 SVG 结构 ── */
console.log('\n【C】本地 SVG 结构良好性');
console.log('-'.repeat(96));
const assetsDir = resolve(ROOT, 'assets');
if (existsSync(assetsDir)) {
  for (const f of readdirSync(assetsDir).filter((x) => x.endsWith('.svg'))) {
    const errs = checkSvgWellFormed(readFileSync(resolve(assetsDir, f), 'utf8'));
    if (errs.length) failures++;
    console.log(`  ${errs.length ? '❌' : '✅'} ${f}${errs.length ? '  → ' + errs.join('; ') : ''}`);
  }
} else {
  console.log('  ⚠ 没有 assets/ 目录');
}

/* ── 汇总 ── */
console.log('\n' + '='.repeat(96));
if (failures) {
  console.log(`❌ 共 ${failures} 处问题，请先修复再推送。`);
  process.exitCode = 1;
} else {
  console.log('✅ 全部通过：远程资源可达、本地引用存在、SVG 结构良好，可以推送到 GitHub。');
}
