#!/usr/bin/env node
/**
 * generate-snake.mjs — 生成贡献图「贪吃蛇」动画 SVG（SMIL）
 *
 * 数据来源：data/contributions.json（由 tools/fetch-contributions.mjs 抓取）
 *   GitHub 官方贡献数据只走 GraphQL，REST API 不提供，所以用第三方镜像
 *   github-contributions-api.jogruber.de。数据与实际贡献图对得上。
 *
 * 为什么用 SMIL 而不是 CSS/GIF：
 *   见 tools/probe-animation.mjs 的实测结论 —— GitHub 上确认会动的
 *   readme-typing-svg 用的就是 SMIL（<animate> 元素），跟随这个已知可行的机制。
 *   另外 SMIL 只存路径，矢量无限清晰，文件也比 GIF 小得多。
 *
 * 动画原理（关键，改之前先读）：
 *   蛇不是靠逐帧贴图，而是**一条折线路径顺着格子中心走**：
 *     · 路径是"蛇头"——用 stroke-dashoffset 做拖尾，看起来像蛇身在跟；
 *     · 每走过一个"有贡献的格子"，那个格子立刻变色 —— 通过给每个格子的
 *       填充色挂上 <animate begin="第N步开始时间" fill="freeze"/>
 *     · 走完全程后统一重置，循环播放。
 *   "吃"这个动作因此不需要任何脚本，纯声明式实现（GitHub 会剥掉 SVG 里的 JS）。
 *
 * 用法：
 *   node tools/generate-snake.mjs              正常生成
 *   node tools/generate-snake.mjs --fast       快放调试版（整轮压缩到约 8 秒）
 *
 * 为什么要 --fast：
 *   正常版单次循环约 28.5 秒，验证"格子被吃掉时会变色"需要完整观察一轮，
 *   靠短时间采样很容易得出错误结论（我一度以为 fill 动画没生效）。
 *   快放版把整轮压到 8 秒，几秒内就能看完整序列。
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
const WEEKS = 53;          // 展示最近 53 周（与 GitHub 贡献图一致）
const PAD = 26;
const HEADER_H = 54;
const GAP = 3;             // 格子间距
const CELL = 12;           // 格子边长
const STEP = CELL + GAP;   // 16px 网格
// 蛇走一格用时。踩过的坑：最初设 0.15s，又只走前 14 列，结果路径完全没碰到
// 有贡献的格子（活跃格子都在第 39~52 列，也就是**右侧** —— GitHub 贡献图
// 最新的在最右边，我当时想反了）。现在走满 53 列共 371 步，必须提速，
// 否则单次循环超过 55 秒，没人等得完。
const MOVE_DUR = FAST ? 0.03 : 0.07;
const HOLD = FAST ? 1.6 : 2.5;   // 走完停留

const ROWS = 7;            // 一周 7 天
const W = PAD * 2 + WEEKS * STEP - GAP;
const GRID_TOP = HEADER_H + 16;
const H = GRID_TOP + ROWS * STEP - GAP + PAD + 22;

/* ── 配色：避开"AI 味"的紫蓝渐变，改用更有温度的一套 ──
   参考真实 GitHub 贡献图的绿色阶梯，但主色偏青碧；
   蛇身用琥珀→珊瑚的暖色，与冷色格子形成对比。 */
const THEMES = {
  dark: {
    panel: '#0d1117',
    border: '#21262d',
    empty: '#161b22',      // 空格子
    emptyStroke: '#1c2128',
    // 贡献等级由浅到深（青碧系）
    levels: ['#0e4429', '#006d32', '#26a641', '#39d353'],
    snakeHead: '#ffd166',  // 蛇头：亮琥珀
    snakeBody: '#ff7a5c',  // 蛇身：珊瑚
    snakeGlow: '#ffb703',
    text: '#e6edf3',
    muted: '#7d8590',
    accent: '#43d9ad',
  },
  light: {
    panel: '#ffffff',
    border: '#d0d7de',
    empty: '#ebedf0',
    emptyStroke: '#d8dee4',
    levels: ['#9be9a8', '#40c463', '#30a14e', '#216e39'],
    snakeHead: '#bf6a00',
    snakeBody: '#e8590c',
    snakeGlow: '#f59f00',
    text: '#1f2328',
    muted: '#59636e',
    accent: '#1a7f37',
  },
};

/* ── 数据预处理：切成每周 7 天，列 = 周 ── */
function buildWeeks(days) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-WEEKS * 7);
  const weeks = [];
  for (let i = 0; i < recent.length; i += 7) weeks.push(recent.slice(i, i + 7));
  // 补齐到 53 列（不足时前面填空）
  while (weeks.length < WEEKS) weeks.unshift([]);
  return weeks;
}

function buildSnake(theme) {
  const T = THEMES[theme];
  const weeks = buildWeeks(data.last.days);
  const flat = weeks.flat();

  // 有贡献的格子：记录它在路径中的序号
  const activeIdx = new Map(); // 网格线性序号 -> 贡献等级
  flat.forEach((d, i) => {
    if (d && d.count > 0) activeIdx.set(i, d.level ?? 1);
  });

  /* ── 构造蛇的路径：按列蛇形前进（第1列自上而下，第2列自下而上…）──
     走满全部 53 列。为什么不能只走一部分：贡献数据里最近的活动都在
     最右侧几列（GitHub 贡献图最新在最右），只走左边会导致蛇永远碰不到
     有贡献的格子，"吃"的动画一个都不会触发 —— 这个 bug 我踩过。 */
  const path = [];
  for (let c = 0; c < weeks.length; c++) {
    const col = weeks[c];
    const rowSeq = c % 2 === 0 ? [0, 1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1, 0];
    for (const r of rowSeq) {
      // 该列可能不足 7 天（末尾补空），跳过不存在的
      if (!col[r]) continue;
      path.push({ c, r, idx: c * 7 + r });
    }
  }

  const cx = (c) => PAD + c * STEP + CELL / 2;
  const cy = (r) => GRID_TOP + r * STEP + CELL / 2;
  const d = path.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(p.c)},${cy(p.r)}`).join(' ');

  const totalDur = path.length * MOVE_DUR;
  const CYCLE = totalDur + HOLD;
  const pathLen = path.length * STEP;     // 折线总长（每步恰好一格）

  // 蛇身：用 stroke-dashoffset 让可见段在路径上推进
  const head = `<path d="${d}" fill="none" stroke="${T.snakeHead}" stroke-width="${CELL - 1}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>`;
  const body = `<path d="${d}" fill="none" stroke="${T.snakeBody}" stroke-width="${CELL - 3}" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"
      stroke-dasharray="46 ${Math.max(1, pathLen - 46)}">
      <animate attributeName="stroke-dashoffset" values="${46};${-pathLen + 46};${-pathLen + 46}" keyTimes="0;${(totalDur / CYCLE).toFixed(4)};1" dur="${CYCLE}s" repeatCount="indefinite"/>
    </path>`;

  /* ── 格子 ──
     空格子静态；有贡献的格子在被"吃掉"时变亮，然后保持到本轮结束再复位。 */
  const cells = [];
  weeks.forEach((col, c) => {
    for (let r = 0; r < ROWS; r++) {
      const day = col[r];
      if (!day) continue;
      const x = PAD + c * STEP;
      const y = GRID_TOP + r * STEP;
      const lvl = day.count > 0 ? Math.min(3, Math.max(0, (day.level ?? 1) - 1)) : -1;
      const base = lvl >= 0 ? T.levels[lvl] : T.empty;

      // 找出这一步在路径中的序号
      const stepNo = path.findIndex((p) => p.idx === c * 7 + r);
      let anim = '';
      if (lvl >= 0 && stepNo >= 0) {
        /* ── 错相机制：负 begin 位移，且 keyTimes 末段必须是 1 ──
           实测结论（tools/../preview/keytimes-scan.html，Chromium）：
             keyTimes 末段为 1 的写法全部生效：0;0.5;1 / 0;0.2;1 / 0;0.05;1 …
             keyTimes 末段不为 1 的写法**全部失效**（填充色恒定为初始色）：
               0;0.1;0.2 / 0;0.2;0.4 / 0;0.5;0.6 / 0;0.1;0.2;1 都测到"颜色数=1"
           我最初用"每格自己的错相 keyTimes"来实现蛇依次吃格子，正是末段不为 1，
           所以一个格子都不会亮 —— 排查了很久才定位到这个唯一变量。

           采用方案：
             · values 三段：空格色 → 高亮色 → 该格最终色
             · keyTimes 固定 0;0.10;0.12，末段补 1 保持末色
             · 错相交给**负 begin**：格子从一开始就处于"该吃/不该吃"的正确状态，
               到点自己闪光，无需脚本（GitHub 会剥掉 SVG 里的 JS）
             · 相位 < 0.5 时 begin 为负（时间轴已推进到对应相位）；
               相位 ≥ 0.5 时 begin 取正（先等一轮再进入本轮） */
        const trigger = stepNo * MOVE_DUR;        // 该格被吃掉的时刻
        const phase = trigger / CYCLE;            // 在整轮中的相位
        const begin = phase < 0.5 ? (-trigger).toFixed(3) : (CYCLE - trigger).toFixed(3);
        anim = `
        <animate attributeName="fill" values="${T.empty};${T.snakeGlow};${base};${base}" keyTimes="0;0.1;0.12;1" dur="${CYCLE}s" begin="${begin}s" repeatCount="indefinite"/>`;
      }
      cells.push(
        `    <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${lvl >= 0 && anim ? T.empty : base}" stroke="${T.emptyStroke}" stroke-width="0.75">${anim}
    </rect>`
      );
    }
  });

  const year = flat.filter(Boolean).slice(-1)[0]?.date.slice(0, 4) || '';
  const activeCount = [...activeIdx.keys()].length;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="贡献图贪吃蛇">
  <defs>
    <filter id="snakeGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" rx="10" fill="${T.panel}" stroke="${T.border}" stroke-width="1.5"/>

  <text x="${PAD}" y="30" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12.5" fill="${T.text}" letter-spacing="2">CONTRIBUTIONS</text>
  <text x="${W - PAD}" y="30" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Noto Sans, Helvetica, Arial, sans-serif" font-size="11.5" fill="${T.muted}">最近 53 周 · ${activeCount} 天有提交</text>
  <line x1="${PAD}" y1="40" x2="${W - PAD}" y2="40" stroke="${T.border}" stroke-width="1"/>

  <!-- 贡献格子 -->
  <g>
${cells.join('\n')}
  </g>

  <!-- 蛇：先画拖尾，再画蛇头，保证头在上层 -->
  <g filter="url(#snakeGlow)">
    ${body}
    ${head}
  </g>

  <!-- 图例 -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Noto Sans, Helvetica, Arial, sans-serif" font-size="10.5" fill="${T.muted}">
    <text x="${PAD}" y="${H - 14}">少</text>
${[0, 1, 2, 3]
  .map((i) => `    <rect x="${PAD + 20 + i * (CELL + 3)}" y="${H - 24}" width="${CELL}" height="${CELL}" rx="2.5" fill="${T.levels[i]}"/>`)
  .join('\n')}
    <text x="${PAD + 20 + 4 * (CELL + 3) + 2}" y="${H - 14}">多</text>
  </g>
</svg>
`;
}

mkdirSync(ASSETS, { recursive: true });
console.log('生成贪吃蛇动画：');
for (const theme of ['dark', 'light']) {
  const suffix = theme === 'light' ? '-light' : '';
  const svg = buildSnake(theme);
  writeFileSync(resolve(ASSETS, `snake${suffix}.svg`), svg, 'utf8');
  console.log(`  ✓ assets/snake${suffix}.svg  (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
}
console.log('\n提示：单次循环时长由路径步数 × MOVE_DUR 决定，改 PATH_COLS 会同时改变动画时长。');
