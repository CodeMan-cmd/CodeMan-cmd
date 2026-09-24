#!/usr/bin/env node
/**
 * generate-snake.mjs — 贡献图「贪吃蛇」动画 SVG
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 为什么用 CSS @keyframes 而不是 SMIL —— 这是实测结论，别再改回去
 * ══════════════════════════════════════════════════════════════════════════
 * 背景：GitHub 渲染仓库里的 SVG 时走的是 <img> 语义（不是内联 SVG）。
 * 我最初用 SMIL（<animate>）实现，本地把 SVG 内联进 DOM 验证时一切正常，
 * 但在 <object>/<img> 这类"单独加载"的场景下实测：
 *     · 我的 SMIL 版 snake.svg  → 6 秒内 fill 只有 1 种取值（完全不动）
 *     · Platane/snk 的 CSS 版   → 同场景下颜色持续变化（动画在跑）
 * 复现页：preview/snk-vs-mine.html / css2-test.html
 *
 * 选型依据不只是"CSS 能动"，而是：**Platane/snk（6千星、被大量主页使用）
 * 用的就是 CSS @keyframes**。跟随一个已被大规模验证的机制，比自己发明稳。
 * 备注：SMIL 在 <object> 下并非完全不可用（stroke-dashoffset 实测能跑），
 * 但既然 CSS 这条路有成功先例，就没有理由赌 SMIL。
 *
 * 分工：
 *   · 蛇身移动  → CSS 动画驱动 stroke-dashoffset（实测 602 种取值，生效）
 *   · 格子被吃  → 每个格子一条 @keyframes，用百分比错相（与 snk 同款，
 *                 实测两格不同相位各自独立变化）
 *
 * 数据源：data/contributions.json（tools/fetch-contributions.mjs 抓取）
 * 用法：  node tools/generate-snake.mjs [--fast]
 *         --fast 生成快放调试版，整轮压到约 8 秒，便于快速验证
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS = resolve(ROOT, 'assets');
const data = JSON.parse(readFileSync(resolve(ROOT, 'data', 'contributions.json'), 'utf8'));

/* ── 参数 ── */
const FAST = process.argv.includes('--fast');
const WEEKS = 53;            // 最近 53 周，与 GitHub 贡献图一致
const PAD = 26;
const HEADER_H = 56;
const GAP = 3;
const CELL = 12;
const STEP = CELL + GAP;     // 16px 网格
const ROWS = 7;
const MOVE_DUR = FAST ? 0.018 : 0.055;   // 每走一格用时（秒）
const HOLD = FAST ? 1.2 : 4;             // 走完停留
const TAIL = 4;              // 蛇尾长度（格）

const W = PAD * 2 + WEEKS * STEP - GAP;
const GRID_TOP = HEADER_H + 16;
const H = GRID_TOP + ROWS * STEP - GAP + PAD + 22;

/* ── 配色：避开"AI 味"的紫蓝渐变，用更有温度的一套 ── */
const THEMES = {
  dark: {
    panel: '#0d1117', border: '#21262d', empty: '#161b22', emptyStroke: '#1c2128',
    levels: ['#0e4429', '#006d32', '#26a641', '#39d353'],
    snake: '#ff7a5c', glow: '#ffb703', text: '#e6edf3', muted: '#7d8590',
  },
  light: {
    panel: '#ffffff', border: '#d0d7de', empty: '#ebedf0', emptyStroke: '#d8dee4',
    levels: ['#9be9a8', '#40c463', '#30a14e', '#216e39'],
    snake: '#e8590c', glow: '#f59f00', text: '#1f2328', muted: '#59636e',
  },
};

/* ── 数据：切成每周 7 天 ── */
function buildWeeks(days) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-WEEKS * 7);
  const weeks = [];
  for (let i = 0; i < recent.length; i += 7) weeks.push(recent.slice(i, i + 7));
  while (weeks.length < WEEKS) weeks.unshift([]);
  return weeks;
}

function buildSnake(theme) {
  const T = THEMES[theme];
  const weeks = buildWeeks(data.last.days);

  /* ── 蛇的路径：按列蛇形前进。最新活动在最右列，所以必须走满全部列，
        否则蛇永远碰不到有贡献的格子（这个 bug 踩过）。 ── */
  const path = [];
  for (let c = 0; c < weeks.length; c++) {
    const col = weeks[c];
    const rowSeq = c % 2 === 0 ? [0, 1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1, 0];
    for (const r of rowSeq) {
      if (!col[r]) continue;
      path.push({ c, r, idx: c * 7 + r });
    }
  }

  const totalMoves = path.length;
  const CYCLE_MS = Math.round((totalMoves * MOVE_DUR + HOLD) * 1000);

  const cx = (c) => PAD + c * STEP + CELL / 2;
  const cy = (r) => GRID_TOP + r * STEP + CELL / 2;
  const d = path.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(p.c)},${cy(p.r)}`).join(' ');
  const pathLen = totalMoves * STEP;

  /* ── CSS：蛇身 dashoffset + 每格一条 keyframes ── */
  const tailPx = TAIL * STEP;
  const css = [];
  css.push(`.body{fill:none;stroke:${T.snake};stroke-width:${CELL - 3};stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:${tailPx} ${Math.max(1, pathLen - tailPx)};animation:crawl ${CYCLE_MS}ms linear infinite}`);
  css.push(`@keyframes crawl{from{stroke-dashoffset:${tailPx}}to{stroke-dashoffset:${-pathLen + tailPx}}}`);
  css.push(`.head{fill:none;stroke:${T.glow};stroke-width:${CELL - 1};stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:${CELL} ${Math.max(1, pathLen - CELL)};animation:crawl ${CYCLE_MS}ms linear infinite;filter:drop-shadow(0 0 3px ${T.glow})}`);

  // 每个"有贡献"的格子：一条 keyframes，在蛇到达的时刻闪一下琥珀色再定成等级色
  const cells = [];
  const cellAnims = [];
  weeks.forEach((col, c) => {
    for (let r = 0; r < ROWS; r++) {
      const day = col[r];
      if (!day) continue;
      const x = PAD + c * STEP;
      const y = GRID_TOP + r * STEP;
      const lvl = day.count > 0 ? Math.min(3, Math.max(0, (day.level ?? 1) - 1)) : -1;
      const base = lvl >= 0 ? T.levels[lvl] : T.empty;

      if (lvl < 0) {
        cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${base}" stroke="${T.emptyStroke}" stroke-width="0.75"/>`);
        continue;
      }

      const stepNo = path.findIndex((p) => p.idx === c * 7 + r);
      if (stepNo < 0) {
        cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${base}" stroke="${T.emptyStroke}" stroke-width="0.75"/>`);
        continue;
      }

      // 触发时刻（占整轮的百分比）。CSS 的百分比不必像 SMIL 那样担心窄窗口问题，
      // 但仍保证闪光段不小于 0.6%，避免肉眼看不清。
      const at = (stepNo * MOVE_DUR * 1000) / CYCLE_MS * 100;
      const flashEnd = Math.min(99.8, at + 0.6);
      const name = `f${stepNo}`;
      cellAnims.push(
        `@keyframes ${name}{0%,${at.toFixed(2)}%{fill:${T.empty}}${(at + 0.15).toFixed(2)}%{fill:${T.glow}}${flashEnd.toFixed(2)}%,100%{fill:${base}}}`
      );
      cellAnims.push(`.${name}{animation:${name} ${CYCLE_MS}ms linear infinite}`);
      cells.push(`<rect class="${name}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${T.empty}" stroke="${T.emptyStroke}" stroke-width="0.75"/>`);
    }
  });

  const styleBlock = `<style>${css.join('')}${cellAnims.join('')}</style>`;

  const activeCount = path.filter((p) => {
    const col = weeks[p.c];
    return col[p.r] && col[p.r].count > 0;
  }).length;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="贡献图贪吃蛇">
  ${styleBlock}
  <rect width="${W}" height="${H}" rx="10" fill="${T.panel}" stroke="${T.border}" stroke-width="1.5"/>

  <text x="${PAD}" y="30" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12.5" fill="${T.text}" letter-spacing="2">CONTRIBUTIONS</text>
  <text x="${W - PAD}" y="30" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Noto Sans, Helvetica, Arial, sans-serif" font-size="11.5" fill="${T.muted}">最近 53 周 · ${activeCount} 天有提交</text>
  <line x1="${PAD}" y1="40" x2="${W - PAD}" y2="40" stroke="${T.border}" stroke-width="1"/>

  <g>${cells.join('')}</g>

  <path class="body" d="${d}"/>
  <path class="head" d="${d}"/>

  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Noto Sans, Helvetica, Arial, sans-serif" font-size="10.5" fill="${T.muted}">
    <text x="${PAD}" y="${H - 14}">少</text>
${[0, 1, 2, 3].map((i) => `    <rect x="${PAD + 20 + i * (CELL + 3)}" y="${H - 24}" width="${CELL}" height="${CELL}" rx="2.5" fill="${T.levels[i]}"/>`).join('\n')}
    <text x="${PAD + 20 + 4 * (CELL + 3) + 2}" y="${H - 14}">多</text>
  </g>
</svg>
`;
}

mkdirSync(ASSETS, { recursive: true });
const suffixTag = FAST ? '（快放调试版）' : '';
console.log(`生成贪吃蛇（CSS 方案）${suffixTag}：`);
for (const theme of ['dark', 'light']) {
  const suffix = theme === 'light' ? '-light' : '';
  const svg = buildSnake(theme);
  writeFileSync(resolve(ASSETS, `snake${suffix}.svg`), svg, 'utf8');
  console.log(`  ✓ assets/snake${suffix}.svg  (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
}
console.log('\n动画机制：CSS @keyframes（蛇身 dashoffset + 每格独立闪烁），与 Platane/snk 同路线。');
