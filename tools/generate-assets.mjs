#!/usr/bin/env node
/**
 * generate-assets.mjs — 离线渲染个人主页的静态 SVG 卡片
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 设计原则：克制，但要有质感
 * ══════════════════════════════════════════════════════════════════════════
 * 上一版卡片"显得廉价"，问题不在配色而在**装饰过量**。这一版逐条去掉：
 *   ✗ 背景点阵纹理      —— 纯装饰、零信息量，是模板感的头号来源
 *   ✗ 每格 drop-shadow  —— 到处发光是"科技感"的廉价替代品
 *   ✗ 左侧彩色竖条      —— 一个元素只该承担一件事，颜色留给有信息的位置
 *   ✗ 图标外加方框      —— 元素层数越多越吵
 *   ✗ 满屏分隔线        —— 分隔线是排版无力的表现
 *
 * 换成靠**留白与字号层级**建立秩序：
 *   · 大量呼吸空间，元素之间靠间距而非线条区分
 *   · 字号阶梯明确：标签 11px / 正文 13px / 数值 30px
 *   · 颜色只用于"有信息"的地方（联系渠道区分、贡献等级）
 *   · 唯一一条发丝线（顶部 1px 渐隐），作为收束而非分割
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 为什么自己渲染而不用第三方卡片服务
 * ══════════════════════════════════════════════════════════════════════════
 * 实测本机 *.vercel.app 的 DNS 被污染（github-readme-stats、github-profile-trophy、
 * capsule-render、activity-graph 全部不可达），写进 README 就是坏图。
 * 自渲染静态 SVG：零第三方依赖、不受速率限制、网络再差也不会变破图。
 *
 * 双主题：每张卡渲染两份（深色 + `-light` 后缀），README 用
 * <picture> + prefers-color-scheme 按访客主题切换。
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

/* ────────────────────── 设计令牌 ──────────────────────
   两张卡共用，保证观感一致：同样的圆角、同样的发丝线、同样的字号阶梯。 */
const THEMES = {
  dark: {
    panel: '#0d1117',       // 与 GitHub 深色底一致，卡片无缝融入页面
    hairline: '#21262d',    // 发丝线（不用亮边框，避免"描边卡片"感）
    text: '#e6edf3',
    label: '#7d8590',       // 次级文字
    faint: '#484f58',       // 三级文字
    levels: ['#0e4429', '#006d32', '#26a641', '#39d353'],
    rank: ['#8b949e', '#8b949e', '#c9a227'],  // 三级配色：克制，只给 top1 一点金
  },
  light: {
    panel: '#ffffff',
    hairline: '#d8dee4',
    text: '#1f2328',
    label: '#59636e',
    faint: '#8c959f',
    levels: ['#9be9a8', '#40c463', '#30a14e', '#216e39'],
    rank: ['#8c959f', '#8c959f', '#9a6700'],
  },
};

let C = THEMES.dark;
const FONT_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const PAD = 32;               // 统一内边距

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function write(name, svg) {
  writeFileSync(resolve(ASSETS, name), svg, 'utf8');
  console.log(`  ✓ assets/${name}  (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
}

/** 卡片外壳：纯色底 + 一圈极淡描边 + 顶部一条渐隐发丝线。没有纹理、没有阴影。 */
function cardShell(W, H, uid) {
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
   排版思路：不用图标方框和色条，靠"标签在上、值在下"的纵向节奏，
   加一点极小的色点做渠道区分 —— 一个色点承担全部识别成本。
   ═══════════════════════════════════════════════════════════ */
function buildContactCard() {
  const W = 1000;
  const rows = [
    { label: 'GitHub', value: `@${data.profile.login}`, dot: C.text },
    { label: 'Email', value: 'claire_channel@qq.com', dot: C.text },
    { label: 'QQ', value: '2291415248', dot: C.text },
  ];

  const TOP = 74;          // 首个渠道的基线
  const ROW_H = 62;        // 行距（大留白是"高级感"的主要来源）
  const H = TOP + rows.length * ROW_H + 16;

  const items = rows
    .map((r, i) => {
      const y = TOP + i * ROW_H;
      return `  <circle cx="${PAD + 3}" cy="${y - 4}" r="2.5" fill="${r.dot}" opacity="0.55"/>
  <text x="${PAD + 18}" y="${y}" font-family="${FONT_MONO}" font-size="10.5" fill="${C.faint}" letter-spacing="1.6">${esc(r.label.toUpperCase())}</text>
  <text x="${PAD + 18}" y="${y + 24}" font-family="${FONT_SANS}" font-size="15" fill="${C.text}">${esc(r.value)}</text>`;
    })
    .join('\n');

  const shell = cardShell(W, H, 'c');
  return `${shell.open}
  <text x="${PAD}" y="40" font-family="${FONT_MONO}" font-size="11" fill="${C.label}" letter-spacing="3">CONTACT</text>
${items}
${shell.close}`;
}

/* ═══════════════════════════════════════════════════════════
   contrib.svg — 开源贡献
   排版思路：数据表格化（标签左、数值右），不用指标格子。
   格子会制造"仪表盘"感；表格更像一份可信的记录。
   ═══════════════════════════════════════════════════════════ */
function buildContribCard() {
  const W = 1000;
  const pr = data.contributions.pullRequests;
  const iss = data.contributions.issuesLifetime;

  // 措辞纪律：
  //   · 只写实测数据；「已合并」与「待审核」严格分列，绝不合并成"贡献 N 个 PR"
  //   · star 数标注为项目热度而非本人成绩
  const rows = [
    { label: '提交 Pull Request', value: String(pr.total), note: `上游已合并 ${pr.upstreamMerged} · 待审核 ${pr.upstreamOpen}`, accent: false },
    { label: '提交 Issue', value: String(iss.total), note: `${iss.open} 个目前仍 open`, accent: false },
    { label: '涉及上游项目', value: String(data.contributions.upstreamProjects.count), note: 'Hutool · Fesod · LangChain.js', accent: false },
    { label: '项目热度（非本人成绩）', value: '', note: 'Hutool 30.3k★ · Fesod 6.2k★', accent: false },
  ];

  const TOP = 76;
  const ROW_H = 46;
  const H = TOP + rows.length * ROW_H + 22;

  const items = rows
    .map((r, i) => {
      const y = TOP + i * ROW_H;
      const val = r.value
        ? `<text x="${W - PAD}" y="${y + 4}" text-anchor="end" font-family="${FONT_SANS}" font-size="26" font-weight="600" fill="${C.text}">${esc(r.value)}</text>`
        : '';
      return `  <text x="${PAD}" y="${y}" font-family="${FONT_SANS}" font-size="13" fill="${C.text}">${esc(r.label)}</text>
  <text x="${PAD}" y="${y + 18}" font-family="${FONT_SANS}" font-size="11.5" fill="${C.label}">${esc(r.note)}</text>
${val}`;
    })
    .join('\n');

  const shell = cardShell(W, H, 'o');
  return `${shell.open}
  <text x="${PAD}" y="40" font-family="${FONT_MONO}" font-size="11" fill="${C.label}" letter-spacing="3">OPEN SOURCE</text>
${items}
${shell.close}`;
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
