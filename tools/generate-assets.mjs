#!/usr/bin/env node
/**
 * generate-assets.mjs — 离线渲染个人主页的静态 SVG 卡片
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 布局栅格（改之前必读 —— 这版就是为了修"到处都是不对称"而重写的）
 * ══════════════════════════════════════════════════════════════════════════
 * 上一版的对齐缺陷（实测坐标，不是感觉）：
 *   · 联系卡三条左边界不齐：标题 x=32、色点 x=35、标签与值 x=50
 *   · 贡献卡行距不匀：56 / 56 / 62
 *   · 同一张卡内 标签→值 的间距不一致：第 1 行 20px，后两行 24px
 *   · 数值右边缘亚像素不齐：968 / 968.1
 *
 * 本版统一规则（所有卡片共用，不允许例外）：
 *   1. 内容区左右边界恒为 [PAD, W - PAD]，PAD = 32
 *   2. 所有左对齐文本（标题 / 标签 / 说明）一律 x = PAD —— 一条竖线贯穿全卡
 *   3. 所有数值一律 text-anchor="end" 且 x = W - PAD —— 与右边距严丝合缝
 *   4. 色点统一 cx = PAD + 3，不再是游离的第二条竖线
 *   5. 行内节奏固定：标签 baseline 0 → 中文说明 +18 → 英文说明 +34
 *   6. 行间距常量 ROW_GAP = 30（不再按"有没有英文"变来变去）
 *   7. 上下留白对称：标题 baseline 40，底部留白 = 36
 *   8. 唯一一条装饰线是顶部 1px 渐隐发丝线，x 从 PAD 到 W-PAD
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 其他设计约定
 * ══════════════════════════════════════════════════════════════════════════
 *   · 不用背景点阵、不用 drop-shadow、不用彩色竖条、不用图标方框 ——
 *     这些装饰是"模板感"的来源，靠留白与字号层级建立秩序。
 *   · 不用第三方卡片服务：实测本机 *.vercel.app 的 DNS 被污染
 *     （github-readme-stats 等四个热门服务全不可达），写进 README 就是坏图。
 *   · 双主题：每张卡渲染两份（深色 + `-light`），README 用
 *     <picture> + prefers-color-scheme 按访客主题切换。
 *
 * 用法：node tools/generate-assets.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS = resolve(ROOT, 'assets');
const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'profile-data.json'), 'utf8'));

/* ── 设计令牌 ── */
const THEMES = {
  dark: {
    panel: '#0d1117',
    hairline: '#21262d',
    text: '#e6edf3',
    label: '#7d8590',
    faint: '#484f58',
  },
  light: {
    panel: '#ffffff',
    hairline: '#d8dee4',
    text: '#1f2328',
    label: '#59636e',
    faint: '#8c959f',
  },
};

let C = THEMES.dark;

const FONT_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

/* ── 栅格常量：全卡共用，改这里就全改 ── */
const PAD = 32;          // 内容区左右边距
const W = 1000;          // 卡片宽度
const TITLE_Y = 40;      // 标题 baseline
const BOTTOM_PAD = 36;   // 底部留白（与顶部对称）
const ROW_GAP = 30;      // 行与行之间的间距
const NOTE_DY = 18;      // 标签 → 中文说明
const NOTE_EN_DY = 34;   // 标签 → 英文说明
const LABEL_SIZE = 13;
const NOTE_SIZE = 11.5;
const NOTE_EN_SIZE = 10.5;
const VALUE_SIZE = 26;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function write(name, svg) {
  writeFileSync(resolve(ASSETS, name), svg, 'utf8');
  console.log(`  ✓ assets/${name}  (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
}

/** 左对齐文本（标题 / 标签 / 说明），一律贴 x = PAD。
 *  注意：font 必须作为参数传入，不能在 extra 里再写一遍 font-family ——
 *  XML 里重复属性是致命错误，会让整个 SVG 解析失败（踩过：联系卡因此变成坏图，
 *  浏览器报 naturalWidth=0）。 */
function textLeft(y, size, fill, content, font = FONT_SANS, extra = '') {
  return `  <text x="${PAD}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}"${extra}>${esc(content)}</text>`;
}
/** 等宽小标题（卡片眉标） */
function eyebrow(y, content) {
  return `  <text x="${PAD}" y="${y}" font-family="${FONT_MONO}" font-size="11" fill="${C.label}" letter-spacing="3">${esc(content)}</text>`;
}
/** 右对齐数值，贴 x = W - PAD */
function valueRight(y, content) {
  return `  <text x="${W - PAD}" y="${y}" text-anchor="end" font-family="${FONT_SANS}" font-size="${VALUE_SIZE}" font-weight="600" fill="${C.text}">${esc(content)}</text>`;
}
/** 色点：统一 cx = PAD + 3，不再形成第二条竖线 */
function dot(y) {
  return `  <circle cx="${PAD + 3}" cy="${y - 4}" r="2.5" fill="${C.text}" opacity="0.55"/>`;
}
/** 卡片外壳：纯色底 + 极淡描边 + 顶部渐隐发丝线 */
function shell(H, uid) {
  return {
    open: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="h${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.hairline}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${C.hairline}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${C.hairline}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="10" fill="${C.panel}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="none" stroke="${C.hairline}" stroke-width="1"/>
  <rect x="${PAD}" y="0" width="${W - PAD * 2}" height="1" fill="url(#h${uid})"/>`,
    close: `</svg>\n`,
  };
}

/* ═══════════════════════════════════════════════════════════
   contact.svg — 联系方式
   ═══════════════════════════════════════════════════════════ */
function buildContactCard() {
  const rows = [
    { label: 'GitHub', value: `@${data.profile.login}` },
    { label: 'Email / 邮箱', value: 'claire_channel@qq.com' },
    { label: 'WeChat / 微信', value: 'tongff_wechat' },
  ];

  const FIRST_Y = 76;
  const ROW_H = 48;      // 两行结构（标签 + 值）的固定行高
  const H = FIRST_Y + (rows.length - 1) * ROW_H + 26 + BOTTOM_PAD;

  const items = rows
    .map((r, i) => {
      const y = FIRST_Y + i * ROW_H;
      return [
        dot(y),
        textLeft(y, 10.5, C.label, r.label.toUpperCase(), FONT_MONO, ' letter-spacing="1.6"'),
        textLeft(y + 24, 15, C.text, r.value),
      ].join('\n');
    })
    .join('\n');

  const s = shell(H, 'c');
  return `${s.open}
${eyebrow(TITLE_Y, 'CONTACT')}
${items}
${s.close}`;
}

/* ═══════════════════════════════════════════════════════════
   contrib.svg — 开源贡献
   左列标签+说明，右列数值；行距恒定，不因有没有英文说明而变。
   ═══════════════════════════════════════════════════════════ */
function buildContribCard() {
  const pr = data.contributions.pullRequests;
  const iss = data.contributions.issuesLifetime;

  // 措辞纪律：只写实测数据；「已合并」与「待审核」严格分列；
  //           star 数标注为项目热度而非本人成绩。
  const rows = [
    {
      label: '提交 Pull Request / Pull Requests',
      note: `上游已合并 ${pr.upstreamMerged} · 待审核 ${pr.upstreamOpen}`,
      noteEn: `merged upstream ${pr.upstreamMerged} · under review ${pr.upstreamOpen}`,
      value: String(pr.total),
    },
    {
      label: '提交 Issue / Issues',
      note: `${iss.open} 个目前仍 open`,
      noteEn: `${iss.open} still open`,
      value: String(iss.total),
    },
    {
      label: '涉及上游项目 / Upstream Projects',
      note: 'Hutool · Fesod · LangChain.js',
      noteEn: '',
      value: String(data.contributions.upstreamProjects.count),
    },
    {
      label: '项目热度（非本人成绩）/ Project Popularity (not mine)',
      note: 'Hutool 30.3k★ · Fesod 6.2k★',
      noteEn: '',
      value: '',
    },
  ];

  const FIRST_Y = 78;
  // 行高恒定：留出"标签 + 中文说明 + 英文说明"三行的空间，
  // 即使某行没有英文说明也占同样高度 —— 这样行距绝对均匀。
  const ROW_H = 56;
  const H = FIRST_Y + (rows.length - 1) * ROW_H + NOTE_EN_DY + 1 + BOTTOM_PAD - 18;

  const items = rows
    .map((r, i) => {
      const y = FIRST_Y + i * ROW_H;
      const lines = [textLeft(y, LABEL_SIZE, C.text, r.label)];
      lines.push(textLeft(y + NOTE_DY, NOTE_SIZE, C.label, r.note));
      if (r.noteEn) lines.push(textLeft(y + NOTE_EN_DY, NOTE_EN_SIZE, C.faint, r.noteEn));
      if (r.value) lines.push(valueRight(y + 2, r.value));
      return lines.join('\n');
    })
    .join('\n');

  const s = shell(H, 'o');
  return `${s.open}
${eyebrow(TITLE_Y, 'OPEN SOURCE')}
${items}
${s.close}`;
}

/* ── 渲染 ── */
mkdirSync(ASSETS, { recursive: true });
console.log('渲染静态 SVG（双主题）：');
for (const theme of ['dark', 'light']) {
  C = THEMES[theme];
  const suffix = theme === 'light' ? '-light' : '';
  console.log(`\n[${theme}]`);
  write(`contact${suffix}.svg`, buildContactCard());
  write(`contrib${suffix}.svg`, buildContribCard());
}
console.log('\n完成。请与 README.md 一同提交。');
