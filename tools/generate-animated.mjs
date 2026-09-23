#!/usr/bin/env node
/**
 * generate-animated.mjs — 生成带动画的 SVG（SMIL 方案）
 *
 * 为什么选 SMIL 而不是 CSS 动画：
 *   实测（tools/probe-animation.mjs）表明，GitHub 上被广泛使用、且确认"真的会动"的
 *   readme-typing-svg 服务，其动画是用 SMIL（<animate> 元素）实现的，并且把字体
 *   以 base64 data URI 内嵌，整个 SVG 自包含。CSS @keyframes 方案在 SVG 被当作
 *   <img> 加载时行为不一致，风险更高。因此这里统一采用 SMIL。
 *
 * 产出（深/浅各一套）：
 *   banner-scan.svg      扫描光标在终端里循环扫过
 *   banner-glow.svg      标题辉光呼吸
 *   activity-pulse.svg   活跃度卡的状态点脉冲
 *
 * 用法：node tools/generate-animated.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS = resolve(ROOT, 'assets');
mkdirSync(ASSETS, { recursive: true });

const THEMES = {
  dark: { accent: '#58a6ff', violet: '#bc8cff', cyan: '#39d353', muted: '#8b949e', text: '#e6edf3', bg: '#0d1117', border: '#30363d' },
  light: { accent: '#0969da', violet: '#8250df', cyan: '#1a7f37', muted: '#59636e', text: '#1f2328', bg: '#ffffff', border: '#d0d7de' },
};

function write(name, svg) {
  const p = resolve(ASSETS, name);
  writeFileSync(p, svg, 'utf8');
  console.log(`  ✓ assets/${name}  (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
}

/* ── 1. 扫描光标：一条竖线沿终端区域横向扫过，到边界后回扫 ──
   注意：刻意**不画背景矩形**。GitHub 页面背景随主题变化，若这里画深色底，
   在浅色主题下会变成突兀的黑条。保持透明才能融进任何主题。
   文字用 #8b949e（GitHub 的 muted 灰），在深/浅底上都可读。 */
function buildScanCursor(theme, suffix) {
  const W = 1200, H = 320;
  const T = THEMES[theme];
  const LABEL = '#8b949e';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="扫描光标动画">
  <defs>
    <linearGradient id="scanBeam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="0"/>
      <stop offset="45%" stop-color="${T.accent}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${T.violet}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${T.violet}" stop-opacity="0"/>
    </linearGradient>
    <filter id="scanBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.2"/>
    </filter>
  </defs>

  <!-- 扫描光束：x 从 60 扫到 1140，再返回；indefinite 反复 -->
  <g filter="url(#scanBlur)">
    <rect x="0" y="60" width="2.5" height="196" fill="url(#scanBeam)">
      <animate attributeName="x" values="60;1140;60" dur="7s" repeatCount="indefinite" calcMode="spline"
               keySplines="0.4 0 0.6 1;0.4 0 0.6 1" keyTimes="0;0.5;1"/>
    </rect>
  </g>

  <!-- 底部进度条：随扫描同步增长 -->
  <rect x="60" y="286" width="1080" height="2" rx="1" fill="${LABEL}" opacity="0.35"/>
  <rect x="60" y="286" width="0" height="2" rx="1" fill="${T.accent}">
    <animate attributeName="width" values="0;1080;0" dur="7s" repeatCount="indefinite" calcMode="spline"
             keySplines="0.4 0 0.6 1;0.4 0 0.6 1" keyTimes="0;0.5;1"/>
  </rect>

  <!-- 状态提示文字：透明度呼吸 -->
  <text x="60" y="46" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12" fill="${LABEL}">
    scanning
    <animate attributeName="opacity" values="1;0.25;1" dur="2.4s" repeatCount="indefinite"/>
  </text>
</svg>
`;
}

/* ── 2. 辉光呼吸：标题下方的强调线亮度起伏 ── */
function buildGlowPulse(theme, suffix) {
  const W = 1200, H = 60;
  const T = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="辉光呼吸动画">
  <defs>
    <linearGradient id="pulseLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${T.accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${T.accent}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${T.violet}" stop-opacity="0"/>
    </linearGradient>
    <filter id="pulseGlow" x="-20%" y="-400%" width="140%" height="900%">
      <feGaussianBlur stdDeviation="3.5"/>
    </filter>
  </defs>

  <rect x="180" y="28" width="840" height="2" rx="1" fill="url(#pulseLine)" filter="url(#pulseGlow)">
    <animate attributeName="opacity" values="0.35;1;0.35" dur="3.6s" repeatCount="indefinite"/>
  </rect>

  <!-- 三个节点依次点亮，像流水灯 -->
  <circle cx="420" cy="29" r="3.5" fill="${T.accent}">
    <animate attributeName="opacity" values="0.2;1;0.2" dur="3.6s" begin="0s" repeatCount="indefinite"/>
  </circle>
  <circle cx="600" cy="29" r="3.5" fill="${T.violet}">
    <animate attributeName="opacity" values="0.2;1;0.2" dur="3.6s" begin="1.2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="780" cy="29" r="3.5" fill="${T.cyan}">
    <animate attributeName="opacity" values="0.2;1;0.2" dur="3.6s" begin="2.4s" repeatCount="indefinite"/>
  </circle>
</svg>
`;
}

/* ── 3. 活跃度卡的脉冲状态点（叠加在条形图卡上方的独立点缀条） ── */
function buildPulseDot(theme, suffix) {
  const W = 1200, H = 36;
  const T = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="实时状态点">
  <circle cx="16" cy="18" r="5" fill="${T.cyan}">
    <animate attributeName="r" values="4;6.5;4" dur="2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0.45;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="16" cy="18" r="5" fill="none" stroke="${T.cyan}" stroke-width="1">
    <animate attributeName="r" values="5;14" dur="2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.7;0" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text x="34" y="22" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12" fill="#8b949e">active recently</text>
</svg>
`;
}

console.log('生成动画 SVG（SMIL 方案，双主题）：');
for (const theme of ['dark', 'light']) {
  const suffix = theme === 'light' ? '-light' : '';
  console.log(`\n[${theme}]`);
  write(`anim-scan${suffix}.svg`, buildScanCursor(theme, suffix));
  write(`anim-glow${suffix}.svg`, buildGlowPulse(theme, suffix));
  write(`anim-pulse${suffix}.svg`, buildPulseDot(theme, suffix));
}

console.log('\n完成。注意：这些动画依赖 SMIL（<animate>），与 readme-typing-svg 同机制。');
