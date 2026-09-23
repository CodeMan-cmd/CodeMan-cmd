#!/usr/bin/env node
/**
 * verify-banner-art.mjs — 校验 banner SVG 里的 ASCII 艺术是否与作者原始 README 逐字节一致
 *
 * 为什么单独验证这个：
 *   ASCII 艺术里大量出现行尾的 `\`，这类字符在复制、终端输出、编辑器保真保存
 *   等环节极易被截断或翻倍；一旦出错，渲染出来就是一团乱码，而人眼很难发现。
 *   这里用"每行长度 + 反斜杠计数"做机械比对。
 *
 * 基准来自 GitHub Contents API 返回的 base64 原文
 * （GET /repos/CodeMan-cmd/CodeMan-cmd/contents/README.md）：
 *   7 行 ASCII，每行 88 字符（含行尾空格），反斜杠数依次 0/24/35/27/35/27/12。
 *
 * 双主题都要验：深色与浅色 banner 用的是同一份艺术字，任何一个都不能出错。
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, '..', 'assets');

const EXPECTED_LEN = 88;
const EXPECTED_BACKSLASHES = [0, 24, 35, 27, 35, 27, 12];

const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

// ASCII 行是唯一带 xml:space="preserve" 的 <text>
const re = /<text[^>]*xml:space="preserve"[^>]*>([\s\S]*?)<\/text>/g;

const banners = existsSync(ASSETS)
  ? readdirSync(ASSETS).filter((f) => /^banner(-light)?\.svg$/.test(f))
  : [];

if (!banners.length) {
  console.error('✗ 在 assets/ 下没找到任何 banner*.svg，请先运行 node tools/generate-assets.mjs');
  process.exit(2);
}

let allOk = true;

for (const file of banners) {
  const svg = readFileSync(resolve(ASSETS, file), 'utf8');
  const lines = [...svg.matchAll(re)].map((m) => unescapeXml(m[1]));

  console.log(`\n${file}：捕获 ${lines.length} 行（期望 ${EXPECTED_BACKSLASHES.length}）`);

  if (lines.length !== EXPECTED_BACKSLASHES.length) {
    console.log(`  ❌ 行数不符`);
    allOk = false;
    continue;
  }

  lines.forEach((t, i) => {
    const bs = (t.match(/\\/g) || []).length;
    const pass = t.length === EXPECTED_LEN && bs === EXPECTED_BACKSLASHES[i];
    if (!pass) allOk = false;
    console.log(
      `  ${pass ? 'OK ' : '❌ '} line${i + 1}  len=${t.length}（期望 ${EXPECTED_LEN}）  backslash=${bs}（期望 ${EXPECTED_BACKSLASHES[i]}）`
    );
  });
}

console.log(
  allOk
    ? '\n✅ 所有 banner 的 ASCII 艺术均与原始 README 完全一致（宽度与反斜杠数量逐行匹配）'
    : '\n❌ 存在偏差：banner 里的 CODE MAN 艺术已损坏，需修正 generate-assets.mjs'
);
process.exitCode = allOk ? 0 : 1;
