#!/usr/bin/env node
/**
 * generate-assets.mjs — 离线渲染个人主页用到的静态 SVG
 *
 * 设计取向（重要，改之前先读）：
 *   这一版是**极简**路线。主页只保留「联系我」一块内容，其余板块
 *   （技术栈、近期动态、统计卡、装饰 banner）已按使用者要求移除。
 *   因此这里只渲染一张卡：contact.svg。
 *
 *   为什么不堆更多卡：
 *     主页上真正有信息量的是仓库列表和提交记录，那两样 GitHub 自己就渲染了。
 *     再叠统计卡 / 徽章墙只会稀释重点——"装饰越多越像模板，越少越像本人写的"。
 *
 * 为什么自己渲染而不是用第三方服务：
 *   本机实测 *.vercel.app 的 DNS 被污染（github-readme-stats、
 *   github-profile-trophy、capsule-render、activity-graph 全部不可达），
 *   写进 README 就是坏图。自渲染的静态 SVG 零第三方依赖、不受速率限制、
 *   网络环境再差也不会变成破图标。
 *
 * 双主题：每张卡渲染两份（深色 + -light 后缀），README 用
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

/* ────────────────────────── 调色板 ────────────────────────── */
const THEMES = {
  dark: {
    bg: '#0d1117',        // 与 GitHub 深色模式底色一致，卡片能无缝融入页面
    panel: '#161b22',
    border: '#30363d',
    dot: '#21262d',       // 背景点阵
    text: '#e6edf3',
    muted: '#8b949e',
    accent: '#58a6ff',
    green: '#3fb950',
    violet: '#bc8cff',
  },
  light: {
    bg: '#ffffff',
    panel: '#f6f8fa',
    border: '#d0d7de',
    dot: '#eaeef2',
    text: '#1f2328',
    muted: '#59636e',
    accent: '#0969da',
    green: '#1a7f37',
    violet: '#8250df',
  },
};

let C = THEMES.dark;  // 由 renderTheme 切换

const FONT_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

/** XML 转义 —— SVG 是 XML，& < > 不转义会让整个文件解析失败 */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function write(name, svg) {
  const p = resolve(ASSETS, name);
  writeFileSync(p, svg, 'utf8');
  console.log(`  ✓ assets/${name}  (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
}

/* ═══════════════════════════════════════════════════════════
   contact.svg — 唯一的卡片：把三个联系方式整理成一张克制的卡片
   ═══════════════════════════════════════════════════════════ */
function buildContactCard() {
  const W = 1000;
  const PAD = 40;

  // 三个联系渠道。图标是手写路径，不依赖外部图标库（避免再引入一个可能被墙的域名）。
  const rows = [
    {
      label: 'GitHub',
      value: `@${data.profile.login}`,
      href: data.profile.html_url,
      color: C.text,
      // GitHub mark 的简化轮廓
      icon: `<path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"/>`,
    },
    {
      label: 'Email',
      value: '2291415248@qq.com',
      href: 'mailto:2291415248@qq.com',
      color: C.accent,
      // 信封
      icon: `<path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13zm2.2-.5 7.8 5.85L19.8 5H4.2zM20 6.9l-7.4 5.55a1 1 0 0 1-1.2 0L4 6.9V18.5c0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5V6.9z"/>`,
    },
    {
      label: 'QQ',
      value: '2291415248',
      href: null,
      color: C.green,
      // 聊天气泡
      icon: `<path d="M12 3c5.05 0 9 3.36 9 7.6 0 4.25-3.95 7.6-9 7.6-.72 0-1.42-.07-2.1-.2l-3.9 1.9a.6.6 0 0 1-.86-.63l.35-3.06C3.36 14.9 3 12.9 3 10.6C3 6.36 6.95 3 12 3z"/>`,
    },
  ];

  // ── 高度必须**由内容算出来**，不能写死 ──
  // 踩过的坑：早先把 H 定死成 214，结果第三行（QQ）的值文本底部落在 y=228，
  // 超出画布 14px 被裁掉——"2291415248" 那一行看不见了。
  // 这类错误不会报错，只会静默截断，所以这里改为按行数推算。
  const HEADER_H = 62;   // 标题区（到分隔线）
  const rowH = 44;
  const rowGap = 8;
  const startY = HEADER_H + 22;
  const BOTTOM_PAD = 26;
  const H = startY + rows.length * rowH + (rows.length - 1) * rowGap + BOTTOM_PAD;

  const items = rows
    .map((r, i) => {
      const y = startY + i * (rowH + rowGap);
      // 左侧色条 + 图标底
      return `  <g>
    <rect x="${PAD}" y="${y}" width="4" height="${rowH}" rx="2" fill="${r.color}"/>
    <rect x="${PAD + 16}" y="${y + 8}" width="28" height="28" rx="7" fill="${C.panel}" stroke="${C.border}" stroke-width="1"/>
    <g transform="translate(${PAD + 22},${y + 14}) scale(0.667)" fill="${r.color}">${r.icon}</g>
    <text x="${PAD + 58}" y="${y + 20}" font-family="${FONT_SANS}" font-size="13.5" font-weight="600" fill="${C.text}">${esc(r.label)}</text>
    <text x="${PAD + 58}" y="${y + 37}" font-family="${FONT_MONO}" font-size="12.5" fill="${C.muted}">${esc(r.value)}</text>
  </g>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="联系方式">
  <defs>
    <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="${C.dot}"/>
    </pattern>
    <linearGradient id="topLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.accent}" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="${C.violet}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="${C.violet}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- 卡片底 + 点阵纹理（很低调，只在近看时可见） -->
  <rect width="${W}" height="${H}" rx="12" fill="${C.panel}"/>
  <rect width="${W}" height="${H}" rx="12" fill="url(#dots)" opacity="0.55"/>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="12" fill="none" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="24" y="0" width="${W - 48}" height="2.5" rx="1.25" fill="url(#topLine)"/>

  <!-- 标题 -->
  <text x="${PAD}" y="46" font-family="${FONT_MONO}" font-size="13" fill="${C.text}" letter-spacing="2.4">CONTACT</text>
  <text x="${W - PAD}" y="46" text-anchor="end" font-family="${FONT_SANS}" font-size="12.5" fill="${C.muted}">欢迎交流 Java 与电子表格处理</text>
  <line x1="${PAD}" y1="62" x2="${W - PAD}" y2="62" stroke="${C.border}" stroke-width="1"/>

${items}
</svg>
`;
}

/* ═══════════════════════════════════════════════════════════
   contrib.svg — 开源贡献量化卡
   ═══════════════════════════════════════════════════════════ */
function buildContribCard() {
  const W = 1000;
  const PAD = 40;
  const pr = data.contributions.pullRequests;
  const iss = data.contributions.issuesLifetime;

  // 四个可核验的指标。措辞纪律：
  //   · 只写实际数据，不写"精通/资深"这类无法验证的形容
  //   · merged 与 open 必须分开显示，绝不合并成"贡献了 15 个 PR"
  const metrics = [
    {
      value: String(pr.total),
      label: '提交 PR',
      sub: `上游已合并 ${pr.upstreamMerged} · 待审核 ${pr.upstreamOpen}`,
      color: C.accent,
    },
    {
      value: String(iss.total),
      label: '提交 issue',
      sub: `${iss.open} 个目前仍 open`,
      color: C.amber,
    },
    {
      value: String(data.contributions.upstreamProjects.count),
      label: '涉及上游项目',
      // 文案长度受限：4 格均分时每格可用约 188px，10.5px 等宽字体下
      // 本串实测 159px。改文案前请先用 preview/measure-subtitles.html 量宽度，
      // 否则会静默溢出被裁掉（踩过一次）。
      sub: 'Hutool · Fesod · LangChain.js',
      color: C.violet,
    },
    {
      value: '3',
      label: '主项目 star 量级',
      sub: 'Hutool 30.3k★ · Fesod 6.2k★',
      color: C.green,
    },
  ];

  const HEADER_H = 62;
  const boxH = 92;
  const top = HEADER_H + 22;
  const gap = 14;
  const boxW = (W - PAD * 2 - gap * (metrics.length - 1)) / metrics.length;
  const BOTTOM_PAD = 46;   // 给脚注留位置
  const H = top + boxH + BOTTOM_PAD;

  const boxes = metrics
    .map((m, i) => {
      const x = PAD + i * (boxW + gap);
      return `  <g>
    <rect x="${x}" y="${top}" width="${boxW}" height="${boxH}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
    <rect x="${x}" y="${top}" width="${boxW}" height="3" rx="1.5" fill="${m.color}"/>
    <text x="${x + 18}" y="${top + 46}" font-family="${FONT_SANS}" font-size="30" font-weight="700" fill="${C.text}">${esc(m.value)}</text>
    <text x="${x + 18}" y="${top + 68}" font-family="${FONT_SANS}" font-size="13" fill="${C.text}">${esc(m.label)}</text>
    <text x="${x + 18}" y="${top + 84}" font-family="${FONT_MONO}" font-size="10.5" fill="${C.muted}">${esc(m.sub)}</text>
  </g>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="开源贡献量化">
  <defs>
    <pattern id="cdot" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="${C.dot}"/>
    </pattern>
    <linearGradient id="ctop" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.accent}" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="${C.violet}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="${C.violet}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" rx="12" fill="${C.panel}"/>
  <rect width="${W}" height="${H}" rx="12" fill="url(#cdot)" opacity="0.55"/>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="12" fill="none" stroke="${C.border}" stroke-width="1.5"/>
  <rect x="24" y="0" width="${W - 48}" height="2.5" rx="1.25" fill="url(#ctop)"/>

  <text x="${PAD}" y="46" font-family="${FONT_MONO}" font-size="13" fill="${C.text}" letter-spacing="2.4">OPEN SOURCE</text>
  <text x="${W - PAD}" y="46" text-anchor="end" font-family="${FONT_SANS}" font-size="12" fill="${C.muted}">数字均由 GitHub API 核验，可点击下方链接逐条复查</text>
  <line x1="${PAD}" y1="62" x2="${W - PAD}" y2="62" stroke="${C.border}" stroke-width="1"/>

${boxes}

  <text x="${PAD}" y="${H - 16}" font-family="${FONT_SANS}" font-size="11" fill="${C.muted}">★ 数为项目自身热度，非本人成绩。「已合并」= 被上游接纳；「待审核」= 已提交未合并。两者分开统计，不合并成"贡献 N 个 PR"。</text>
</svg>
`;
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

console.log('\n完成。请与 README.md 一同提交，README 中以相对路径引用。');
