#!/usr/bin/env node
/**
 * generate-animated.mjs — 动画 SVG 生成器（**当前未启用，保留备用**）
 *
 * 现状（别误解）：
 *   主页已改为极简设计，只保留一张静态的联系卡。本脚本产出的动画文件
 *   已从 README 与 assets/ 移除，**没有投入使用**。
 *   保留它是因为动画能力已经实测验证过（见下），将来若要加回动态元素，
 *   不必从零摸索。要启用就运行它，然后自行在 README 里引用产物。
 *
 * 选 SMIL 的依据（实测，见 tools/probe-animation.mjs）：
 *   GitHub 上被大量主页使用、确认会动的 readme-typing-svg 服务，
 *   其动画用 SMIL（<animate> 元素）实现，并把字体以 base64 data URI 内嵌。
 *   所以这里跟随这个已知可行的机制。
 *   注：CSS @keyframes 在 <img> 语义下是否可用，我**没有实测过**，
 *   因此不在此断言它行或不行 —— 只是没有理由放着已验证的 SMIL 不用。
 *
 * 启用前请想清楚：动画会持续吸引注意力，与"极简、克制"的取向相冲突。
 * 若只是想加点动感，优先改静态卡的排版，而不是加动画。
 *
 * 用法：node tools/generate-animated.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, '..', 'assets');
mkdirSync(ASSETS, { recursive: true });

const THEMES = {
  dark: { accent: '#58a6ff', violet: '#bc8cff', cyan: '#39d353' },
  light: { accent: '#0969da', violet: '#8250df', cyan: '#1a7f37' },
};

function write(name, svg) {
  writeFileSync(resolve(ASSETS, name), svg, 'utf8');
  console.log(`  ✓ assets/${name}  (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
}

/* 扫描光标：竖线横向扫过 + 底部进度条同步伸缩。
   刻意不画背景矩形 —— GitHub 页面背景随主题变化，画了会在浅色主题下变成突兀黑条。 */
function buildScanCursor(theme) {
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
  <g filter="url(#scanBlur)">
    <rect x="0" y="60" width="2.5" height="196" fill="url(#scanBeam)">
      <animate attributeName="x" values="60;1140;60" dur="7s" repeatCount="indefinite" calcMode="spline"
               keySplines="0.4 0 0.6 1;0.4 0 0.6 1" keyTimes="0;0.5;1"/>
    </rect>
  </g>
  <rect x="60" y="286" width="1080" height="2" rx="1" fill="${LABEL}" opacity="0.35"/>
  <rect x="60" y="286" width="0" height="2" rx="1" fill="${T.accent}">
    <animate attributeName="width" values="0;1080;0" dur="7s" repeatCount="indefinite" calcMode="spline"
             keySplines="0.4 0 0.6 1;0.4 0 0.6 1" keyTimes="0;0.5;1"/>
  </rect>
  <text x="60" y="46" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12" fill="${LABEL}">
    scanning
    <animate attributeName="opacity" values="1;0.25;1" dur="2.4s" repeatCount="indefinite"/>
  </text>
</svg>
`;
}

/* 流水灯分隔线：三个节点错相点亮 */
function buildGlowPulse(theme) {
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

/* 状态点：脉冲 + 扩散圈 */
function buildPulseDot(theme) {
  const W = 1200, H = 36;
  const T = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="实时状态点">
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
  write(`anim-scan${suffix}.svg`, buildScanCursor(theme));
  write(`anim-glow${suffix}.svg`, buildGlowPulse(theme));
  write(`anim-pulse${suffix}.svg`, buildPulseDot(theme));
}

console.log('\n产出于 assets/。注意：这些文件不会自动被 README 引用，需手动加入。');
