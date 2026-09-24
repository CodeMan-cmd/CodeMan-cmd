#!/usr/bin/env node
/**
 * fetch-contributions.mjs — 抓取 GitHub 贡献日历，存成 data/contributions.json
 *
 * 为什么需要单独一个数据源：
 *   GitHub 官方的贡献数据只走 GraphQL（需 token），REST API 不提供。
 *   这里用第三方镜像 github-contributions-api.jogruber.de（实测返回 200，
 *   结构与 GitHub 官方贡献图一致：每天 { date, count, level }）。
 *
 * 注意：这是**第三方服务**，不是 GitHub 官方。数据实测准确（与主页贡献图
 * 对得上），但若哪天该服务挂了，本脚本会失败而不是静默给错数据——
 * 生成贪吃蛇时请确保先成功跑过本脚本。
 *
 * 用法：node tools/fetch-contributions.mjs [user]
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'data', 'contributions.json');
const USER = process.argv[2] || 'CodeMan-cmd';

const ENDPOINTS = [
  `https://github-contributions-api.jogruber.de/v4/${USER}?y=last`,
  `https://github-contributions-api.jogruber.de/v4/${USER}?y=all`,
];

const result = { fetchedAt: new Date().toISOString(), user: USER, sources: [] };

for (const url of ENDPOINTS) {
  const y = new URL(url).searchParams.get('y');
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'profile-readme-builder' } });
    if (!res.ok) {
      console.error(`✗ ${url} -> ${res.status}`);
      process.exitCode = 2;
      continue;
    }
    const j = await res.json();
    const days = j.contributions || [];
    const active = days.filter((d) => d.count > 0);
    result[y] = { total: j.total, days, activeDays: active.length, spanDays: days.length };
    console.log(`✓ y=${y.padEnd(4)} 天数=${days.length}  有活动=${active.length}  总贡献=${JSON.stringify(j.total)}`);
    result.sources.push(url);
  } catch (e) {
    console.error(`✗ ${url} -> ${e.message}`);
    process.exitCode = 2;
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
console.log(`\n已写入 ${OUT}`);
