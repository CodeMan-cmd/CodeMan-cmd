#!/usr/bin/env node
/**
 * generate-assets.mjs — 根据 data/profile-data.json 离线渲染静态 SVG
 *
 * 设计动因：
 *   GitHub 主页最流行的四张卡（github-readme-stats / trophy / capsule-render /
 *   activity-graph）全部托管在 *.vercel.app，本机实测 DNS 被投毒，解析到
 *   80.87.199.46 / 31.13.80.169（Meta 段）等无关 IP，渲染即坏图。
 *   因此这里改为把数据渲染成静态 SVG 并提交进仓库 —— 零第三方依赖、
 *   零速率限制、永不坏图，代价是需要重跑脚本才会更新。
 *
 * 用法：
 *   node tools/generate-assets.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS = resolve(ROOT, 'assets');

const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'profile-data.json'), 'utf8'));

/* ────────────────────────── 调色板 ──────────────────────────
   双主题：GitHub 支持通过 <picture> + prefers-color-scheme 按访客的主题
   切换图片（社区验证做法）。因此每张卡都渲染两份：
     assets/xxx.svg        深色主题（默认）
     assets/xxx-light.svg  浅色主题
   README 里用 <picture><source media="(prefers-color-scheme: light)"> 引用。
   ──────────────────────────────────────────────────────────── */
const THEMES = {
  dark: {
    bg: '#0d1117',        // GitHub 深色模式底色，保证无缝融入
    panel: '#161b22',
    panel2: '#1c2128',
    border: '#30363d',
    text: '#e6edf3',
    muted: '#8b949e',
    accent: '#58a6ff',
    cyan: '#39d353',
    violet: '#bc8cff',
    amber: '#e3b341',
    pink: '#f778ba',
    red: '#ff7b72',
    bannerMid: '#111a2b',
    scanOpacity: '0.012',
    gridOpacity: '0.16',
    artAlpha: 1,
    glow: true,           // 深色底上给标题加微弱辉光，浅色底上会糊成一团灰，故关闭
  },
  light: {
    bg: '#ffffff',
    panel: '#f6f8fa',
    panel2: '#f6f8fa',
    border: '#d0d7de',
    text: '#1f2328',
    muted: '#59636e',
    accent: '#0969da',
    cyan: '#1a7f37',
    violet: '#8250df',
    amber: '#9a6700',
    pink: '#bf3989',
    red: '#cf222e',
    bannerMid: '#eaeef2',
    scanOpacity: '0.006',
    gridOpacity: '0.07',
    artAlpha: 0.92,
    glow: false,
  },
};

let C = THEMES.dark;  // 由 write() 按主题切换；生成函数内读取当前值

const FONT_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

/** XML 转义 —— SVG 是 XML，& < > 必须转义，否则文件直接解析失败 */
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

/** 渲染一个主题下的全部卡片。theme 为 'dark' | 'light' */
function renderTheme(theme) {
  C = THEMES[theme];
  const suffix = theme === 'light' ? '-light' : '';
  console.log(`\n[${theme}]`);
  write(`banner${suffix}.svg`, buildBanner());
  write(`stats${suffix}.svg`, buildStatsCard());
  write(`activity${suffix}.svg`, buildActivityCard());
  write(`stack${suffix}.svg`, buildStackCard());
}

mkdirSync(ASSETS, { recursive: true });

const { profile, repoStats, contributions, activity, techStack } = data;

/* ═══════════════════════════════════════════════════════════
   1. Banner — 保留原有的 CODE MAN 终端风格，做成渐变 + 扫描线
   ═══════════════════════════════════════════════════════════ */
function buildBanner() {
  const W = 1200;
  const H = 320;

  // 原有的 ASCII 艺术（作者自用）。以下内容经 GitHub Contents API 逐字节核验：
  // 每行长度均为 88 字符（含行尾空格），反斜杠数量依次为 0/24/35/27/35/27/12。
  // 注意行尾的 `\` 容易被编辑器/终端截断，这里是权威副本。
  const art = [
    ' ___  ___  ___  ___  ___          ___  ___  ___  ___  ________  ________   ________     ',
    '|\\  \\|\\  \\|\\  \\|\\  \\|\\  \\        |\\  \\|\\  \\|\\  \\|\\  \\|\\   __  \\|\\   ___  \\|\\   ____\\    ',
    '\\ \\  \\\\\\  \\ \\  \\\\\\  \\ \\  \\       \\ \\  \\\\\\  \\ \\  \\\\\\  \\ \\  \\|\\  \\ \\  \\\\ \\  \\ \\  \\___|    ',
    ' \\ \\   __  \\ \\  \\\\\\  \\ \\  \\       \\ \\   __  \\ \\  \\\\\\  \\ \\   __  \\ \\  \\\\ \\  \\ \\  \\  ___  ',
    '  \\ \\  \\ \\  \\ \\  \\\\\\  \\ \\  \\       \\ \\  \\ \\  \\ \\  \\\\\\  \\ \\  \\ \\  \\ \\  \\\\ \\  \\ \\  \\|\\  \\ ',
    '   \\ \\__\\ \\__\\ \\_______\\ \\__\\       \\ \\__\\ \\__\\ \\_______\\ \\__\\ \\__\\ \\__\\\\ \\__\\ \\_______\\',
    '    \\|__|\\|__|\\|_______|\\|__|        \\|__|\\|__|\\|_______|\\|__|\\|__|\\|__| \\|__|\\|_______|',
  ];

  const artLines = art
    .map((line, i) => {
      // 顶部行更亮，向下渐隐，制造层次
      const opacity = ((1 - i * 0.075) * C.artAlpha).toFixed(3);
      return `  <text x="600" y="${86 + i * 17}" text-anchor="middle" font-family="${FONT_MONO}" font-size="13" fill="${C.accent}" opacity="${opacity}" xml:space="preserve">${esc(line)}</text>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="CodeMan-cmd — Java Backend Developer">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.bg}"/>
      <stop offset="55%" stop-color="${C.bannerMid}"/>
      <stop offset="100%" stop-color="${C.bg}"/>
    </linearGradient>
    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${C.accent}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${C.violet}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="${C.text}" opacity="${C.scanOpacity}"/>
    </pattern>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
  <rect width="${W}" height="${H}" fill="url(#scan)"/>

  <!-- 装饰网格 -->
  <g stroke="${C.border}" stroke-width="1" opacity="${C.gridOpacity}">
${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `    <line x1="${i * 150}" y1="0" x2="${i * 150}" y2="${H}"/>`).join('\n')}
${[0, 1, 2, 3, 4, 5].map((i) => `    <line x1="0" y1="${i * 64}" x2="${W}" y2="${i * 64}"/>`).join('\n')}
  </g>

  <!-- 顶部终端提示条 -->
  <g font-family="${FONT_MONO}" font-size="13">
    <circle cx="30" cy="30" r="6" fill="${C.red}"/>
    <circle cx="52" cy="30" r="6" fill="${C.amber}"/>
    <circle cx="74" cy="30" r="6" fill="${C.cyan}"/>
    <text x="98" y="35" fill="${C.muted}">~/CodeMan-cmd — zsh</text>
  </g>
  <line x1="0" y1="52" x2="${W}" y2="52" stroke="${C.border}" stroke-width="1" opacity="0.7"/>

${artLines}

  <line x1="200" y1="228" x2="1000" y2="228" stroke="url(#lineGrad)" stroke-width="1.5"/>

  <text x="600" y="266" text-anchor="middle" font-family="${FONT_SANS}" font-size="21" font-weight="600" fill="${C.text}"${C.glow ? ' filter="url(#glow)"' : ''}>Java Backend Developer</text>
  <text x="600" y="294" text-anchor="middle" font-family="${FONT_MONO}" font-size="13.5" fill="${C.muted}">Spreadsheet Streaming · Apache Fesod / EasyExcel / Hutool</text>
</svg>
`;
}

/* ═══════════════════════════════════════════════════════════
   2. 统计卡 — 数据全部来自 profile-data.json 的实测值
   ═══════════════════════════════════════════════════════════ */
function buildStatsCard() {
  const W = 1200;
  const H = 300;

  const prOpen = contributions.pullRequests.open;
  const prMerged = contributions.pullRequests.merged;
  const prClosed = contributions.pullRequests.closed;
  const issueOpen = contributions.issues.filter((i) => i.state === 'open').length;
  const issueTotal = contributions.issuesLifetime ? contributions.issuesLifetime.total : contributions.issues.length;
  const sinceYear = new Date(profile.created_at).getUTCFullYear();
  const yearsOnGh = new Date('2026-09-23').getUTCFullYear() - sinceYear;

  // 措辞纪律：PR 目前全部处于 open（未合并）状态，因此这里只陈述
  // "提交了多少、处于什么状态"，绝不用"已贡献/已接纳"这类说法。
  const stats = [
    { label: '公开仓库', value: repoStats.total, sub: `${repoStats.own} 自有 · ${repoStats.fork} Fork`, color: C.accent },
    { label: '提交 PR', value: contributions.pullRequests.total, sub: `${prOpen} 待审核 · ${prMerged} 已合并 · ${prClosed} 已关闭`, color: C.violet },
    { label: '提 issue', value: issueTotal, sub: `${issueOpen} 个目前仍 open`, color: C.amber },
    { label: '关注的上游库', value: contributions.upstreams.length, sub: `Apache / Hutool / Alibaba / Spring`, color: C.pink },
    { label: 'Followers', value: profile.followers, sub: `Following ${profile.following}`, color: C.cyan },
    { label: 'GitHub 岁月', value: `${yearsOnGh} 年`, sub: `自 ${sinceYear} 年 ${new Date(profile.created_at).getUTCMonth() + 1} 月`, color: C.accent },
  ];

  const cols = 3;
  const rows = 2;
  const padX = 34;
  const padTop = 88;
  const gapX = 20;
  const gapY = 20;
  const boxW = (W - padX * 2 - gapX * (cols - 1)) / cols;
  const boxH = (H - padTop - 34 - gapY * (rows - 1)) / rows;

  const boxes = stats
    .map((s, i) => {
      const cx = padX + (i % cols) * (boxW + gapX);
      const cy = padTop + Math.floor(i / cols) * (boxH + gapY);
      return `  <g>
    <rect x="${cx}" y="${cy}" width="${boxW}" height="${boxH}" rx="10" fill="${C.panel2}" stroke="${C.border}" stroke-width="1"/>
    <rect x="${cx}" y="${cy}" width="3.5" height="${boxH}" rx="1.75" fill="${s.color}"/>
    <text x="${cx + 22}" y="${cy + 34}" font-family="${FONT_SANS}" font-size="13" fill="${C.muted}" letter-spacing="0.6">${esc(s.label)}</text>
    <text x="${cx + 22}" y="${cy + 76}" font-family="${FONT_SANS}" font-size="34" font-weight="700" fill="${C.text}">${esc(s.value)}</text>
    <text x="${cx + 22}" y="${cy + 100}" font-family="${FONT_MONO}" font-size="11.5" fill="${C.muted}">${esc(s.sub)}</text>
  </g>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub 数据概览">
  <defs>
    <linearGradient id="sBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.bg}"/>
      <stop offset="100%" stop-color="${C.panel}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" rx="12" fill="url(#sBg)" stroke="${C.border}" stroke-width="1.5"/>

  <g>
    <circle cx="40" cy="38" r="5.5" fill="${C.cyan}"/>
    <text x="58" y="43" font-family="${FONT_MONO}" font-size="13" fill="${C.text}" letter-spacing="1">GITHUB STATS</text>
    <text x="${W - 34}" y="43" text-anchor="end" font-family="${FONT_MONO}" font-size="11.5" fill="${C.muted}">更新于 ${esc(data.fetchedAt.slice(0, 10))}</text>
  </g>
  <line x1="34" y1="60" x2="${W - 34}" y2="60" stroke="${C.border}" stroke-width="1"/>

${boxes}
</svg>
`;
}

/* ═══════════════════════════════════════════════════════════
   3. 活跃度卡 — 近 30 天公开事件类型分布
   ═══════════════════════════════════════════════════════════ */
function buildActivityCard() {
  const W = 1200;
  const H = 196;

  const order = ['IssuesEvent', 'ForkEvent', 'CreateEvent', 'IssueCommentEvent', 'PullRequestEvent'];
  const labelMap = {
    IssuesEvent: 'Issues',
    ForkEvent: 'Fork',
    CreateEvent: 'Branch',
    IssueCommentEvent: 'Comments',
    PullRequestEvent: 'PRs',
  };
  const colorMap = {
    IssuesEvent: C.amber,
    ForkEvent: C.violet,
    CreateEvent: C.muted,
    IssueCommentEvent: C.pink,
    PullRequestEvent: C.cyan,
  };

  const entries = order
    .filter((k) => activity.types[k])
    .map((k) => ({ key: k, label: labelMap[k], n: activity.types[k], color: colorMap[k] }));
  const max = Math.max(...entries.map((e) => e.n));

  const padX = 34;
  const labelW = 82;
  const barMaxW = W - padX * 2 - labelW - 62;
  const rowH = 24;

  const bars = entries
    .map((e, i) => {
      const y = 66 + i * rowH;
      const w = Math.max(4, (e.n / max) * barMaxW);
      return `  <g>
    <text x="${padX}" y="${y + 13}" font-family="${FONT_MONO}" font-size="12.5" fill="${C.muted}">${esc(e.label)}</text>
    <rect x="${padX + labelW}" y="${y + 1}" width="${barMaxW}" height="14" rx="7" fill="${C.panel2}"/>
    <rect x="${padX + labelW}" y="${y + 1}" width="${w}" height="14" rx="7" fill="${e.color}" opacity="0.92"/>
    <text x="${padX + labelW + w + 10}" y="${y + 13}" font-family="${FONT_MONO}" font-size="12.5" font-weight="600" fill="${C.text}">${e.n}</text>
  </g>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="近期开源活跃度">
  <rect width="${W}" height="${H}" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>

  <g>
    <circle cx="40" cy="36" r="5.5" fill="${C.amber}"/>
    <text x="58" y="41" font-family="${FONT_MONO}" font-size="13" fill="${C.text}" letter-spacing="1">RECENT ACTIVITY</text>
    <text x="${W - 34}" y="41" text-anchor="end" font-family="${FONT_MONO}" font-size="11.5" fill="${C.muted}">${esc(activity.windowFrom.slice(0, 10))} → ${esc(activity.windowTo.slice(0, 10))} · ${esc(activity.eventCount)} 个公开事件</text>
  </g>
  <line x1="34" y1="56" x2="${W - 34}" y2="56" stroke="${C.border}" stroke-width="1"/>

${bars}
</svg>
`;
}

/* ═══════════════════════════════════════════════════════════
   4. 技术栈卡 — 分类展示，避免"徽章墙"式堆砌
   ═══════════════════════════════════════════════════════════ */
function buildStackCard() {
  const W = 1200;
  const H = 232;

  const groups = [
    { title: 'LANGUAGES', items: techStack.core.slice(0, 4), color: C.accent },
    { title: 'FRAMEWORKS & DATA', items: techStack.core.slice(4), color: C.violet },
    { title: 'FOCUS', items: techStack.focus.slice(0, 3), color: C.amber },
    { title: 'ALSO', items: [...techStack.focus.slice(3, 5), ...techStack.frontend.slice(0, 1)], color: C.cyan },
  ];

  const padX = 34;
  const gap = 16;
  const colW = (W - padX * 2 - gap * (groups.length - 1)) / groups.length;

  const cols = groups
    .map((g, gi) => {
      const x = padX + gi * (colW + gap);
      const chips = g.items
        .map((it, ii) => {
          const cy = 104 + ii * 34;
          // 估算 chip 宽度：中文按 12px、ASCII 按 7px 计
          let textW = 0;
          for (const ch of it) textW += /[\u4e00-\u9fff]/.test(ch) ? 12 : 7;
          const cw = Math.min(colW, textW + 28);
          return `    <g>
      <rect x="${x}" y="${cy}" width="${cw}" height="26" rx="6" fill="${C.panel2}" stroke="${g.color}" stroke-width="1" stroke-opacity="0.45"/>
      <text x="${x + 13}" y="${cy + 17.5}" font-family="${FONT_MONO}" font-size="12" fill="${C.text}">${esc(it)}</text>
    </g>`;
        })
        .join('\n');
      return `  <g>
    <text x="${x}" y="92" font-family="${FONT_MONO}" font-size="11.5" fill="${g.color}" letter-spacing="1.2">${esc(g.title)}</text>
${chips}
  </g>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="技术栈">
  <rect width="${W}" height="${H}" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>

  <g>
    <circle cx="40" cy="36" r="5.5" fill="${C.violet}"/>
    <text x="58" y="41" font-family="${FONT_MONO}" font-size="13" fill="${C.text}" letter-spacing="1">TECH STACK</text>
    <text x="${W - 34}" y="41" text-anchor="end" font-family="${FONT_MONO}" font-size="11.5" fill="${C.muted}">依据上游贡献与仓库语言归纳</text>
  </g>
  <line x1="34" y1="56" x2="${W - 34}" y2="56" stroke="${C.border}" stroke-width="1"/>

${cols}
</svg>
`;
}

console.log('渲染静态 SVG（双主题）：');
renderTheme('dark');
renderTheme('light');
console.log('\n完成。这些 SVG 请与 README.md 一同提交，README 中以相对路径引用。');
