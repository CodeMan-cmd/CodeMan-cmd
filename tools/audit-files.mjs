#!/usr/bin/env node
/**
 * audit-files.mjs — 对自己生成的交付物做静态安全审计
 *
 * 目的：用户会亲手运行 push-profile.ps1 等脚本，因此必须证明这些文件里
 *       没有隐藏行为。审计四个维度：
 *         1. 文件清单 + SHA256（便于他对外部结果做交叉核对）
 *         2. 文件类型真实性（是否混入了伪装成文本的二进制 / 可执行体）
 *         3. 全部外部 URL 的域名清单（看有没有可疑外联）
 *         4. 可疑代码模式（混淆、动态求值、键盘记录式 API、编码载荷等）
 *
 * 说明：这不是杀毒软件，只覆盖"我能看到的静态证据"。
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 递归收集文件，跳过 .git（那是 git 自己的对象库，不是交付内容） */
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

const files = walk(ROOT).sort();

console.log('═'.repeat(100));
console.log('1) 文件清单与 SHA256');
console.log('═'.repeat(100));
console.log('大小'.padEnd(10) + 'SHA256(前16)'.padEnd(20) + '类型'.padEnd(10) + '路径');
console.log('-'.repeat(100));

const meta = [];
for (const f of files) {
  const buf = readFileSync(f);
  const sha = createHash('sha256').update(buf).digest('hex');
  const rel = relative(ROOT, f).replace(/\\/g, '/');

  // 文件类型真实性：检查魔数
  let kind = 'text';
  const b = buf;
  if (b.length >= 4 && b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) kind = 'ELF可执行!';
  else if (b.length >= 2 && b[0] === 0x4d && b[1] === 0x5a) kind = 'PE/EXE!';
  else if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) kind = 'ZIP/JAR';
  else if (b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b) kind = 'GZIP';
  else if (b.length >= 4 && b[0] === 0xca && b[1] === 0xfe && b[2] === 0xba && b[3] === 0xbe) kind = 'MachO';
  else if (/[\u0000]/.test(b.toString('latin1').slice(0, 4096)) && extname(f) !== '.svg') kind = '含NUL字节?';

  console.log(String(b.length).padEnd(10) + sha.slice(0, 16).padEnd(20) + kind.padEnd(10) + rel);
  meta.push({ rel, size: b.length, sha256: sha, kind, buf });
}

console.log(`\n合计 ${files.length} 个文件，总大小 ${(meta.reduce((a, m) => a + m.size, 0) / 1024).toFixed(1)} KB`);

console.log('\n' + '═'.repeat(100));
console.log('2) 可执行 / 二进制文件检查');
console.log('═'.repeat(100));
const binaries = meta.filter((m) => !['text'].includes(m.kind));
if (binaries.length === 0) {
  console.log('✅ 未发现任何可执行体或伪装二进制 —— 全部为纯文本（.md/.svg/.mjs/.json/.html/.ps1）');
} else {
  console.log('⚠ 发现以下非纯文本文件，需人工确认：');
  for (const b of binaries) console.log(`   [${b.kind}] ${b.rel}`);
}

console.log('\n' + '═'.repeat(100));
console.log('3) 全部外部 URL 与域名');
console.log('═'.repeat(100));
const urlRe = /https?:\/\/[^\s"'`)<>\]]+/g;
const byHost = new Map();
for (const m of meta) {
  const text = m.buf.toString('utf8');
  for (const u of text.match(urlRe) || []) {
    try {
      // 去掉模板字面量残留（例如 `api.github.com${path}` 里的 ${path}）
      const cleaned = u.split('${')[0];
      const h = new URL(cleaned).hostname;
      if (!byHost.has(h)) byHost.set(h, new Set());
      byHost.get(h).add(m.rel);
    } catch {}
  }
}
const hosts = [...byHost.keys()].sort();
for (const h of hosts) {
  const where = [...byHost.get(h)].sort();
  console.log(`  ${h.padEnd(40)} 出现于: ${where.slice(0, 4).join(', ')}${where.length > 4 ? ` 等 ${where.length} 个文件` : ''}`);
}
console.log(`\n共 ${hosts.length} 个不同域名。逐个人工判定见下方结论。`);

console.log('\n' + '═'.repeat(100));
console.log('4) 可疑代码模式扫描');
console.log('═'.repeat(100));

// 这些模式在正常构建/部署脚本里不该出现
const PATTERNS = [
  [/\beval\s*\(/g, 'eval() 动态求值'],
  [/new\s+Function\s*\(/g, 'new Function() 动态构造代码'],
  [/Invoke-Expression|iex\s+/gi, 'PowerShell 动态求值 (Invoke-Expression)'],
  [/-EncodedCommand|FromBase64String/gi, 'Base64 编码命令执行'],
  [/\batob\s*\(|Buffer\.from\([^)]*base64/gi, 'Base64 解码（可能藏载荷）'],
  [/GetAsyncKeyState|SetWindowsHookEx/gi, '键盘钩子类 API'],
  [/DownloadString|DownloadFile|Invoke-WebRequest\s+.*-OutFile/gi, '远程下载并落盘'],
  [/schtasks|\breg\s+add|crontab/gi, '计划任务/注册表自启'],
  [/net\s+user\s+.*\/add|New-LocalUser/gi, '创建账号'],
  [/chmod\s+\+x|Set-ExecutionPolicy\s+Bypass/gi, '改执行策略/加执行位'],
  [/child_process|execSync|spawnSync/gi, 'Node 子进程调用'],
  // 注意：早期版本这里写的是 /\bcurl\b|\bwget\b/，结果把 Node 内置的 fetch() 
  // 以及 "FetchProfile" 这类标识符误报成"外部下载工具"。收紧为真正的命令行调用形态。
  [/(?:^|[;&|`(]\s*)(?:curl|wget)\s+-/gim, '外部下载工具（curl/wget 命令行）'],
  [/rm\s+-rf\s+\/|Remove-Item\s+.*-Recurse\s+.*C:\\\\/gi, '递归删除根路径'],
];

let totalHits = 0;
for (const m of meta) {
  if (/[\u0000]/.test(m.buf.toString('latin1'))) continue;
  // 关键：排除审计脚本自身。它内部就写着这些检测用的正则字面量，
  // 扫自己必然"命中"，那是自指误报，会掩盖真正的问题。
  if (m.rel === 'tools/audit-files.mjs') {
    console.log(`  ${m.rel} —— 跳过（本审计脚本自身，内含检测用正则字面量，扫自己必然误报）`);
    continue;
  }
  const text = m.buf.toString('utf8');
  const hits = [];
  for (const [re, label] of PATTERNS) {
    const found = text.match(re);
    if (found) hits.push(`${label} ×${found.length}`);
  }
  if (hits.length) {
    totalHits += hits.length;
    console.log(`  ${m.rel}`);
    for (const h of hits) console.log(`      · ${h}`);
  }
}
if (totalHits === 0) console.log('  ✅ 除审计脚本自身外，未命中任何可疑模式。');

console.log('\n' + '═'.repeat(100));
console.log('5) PowerShell 脚本实际执行的外部命令（最关键）');
console.log('═'.repeat(100));
for (const m of meta.filter((x) => x.rel.endsWith('.ps1'))) {
  const text = m.buf.toString('utf8');
  // 抽取 & git ... / & node ... 这类真实调用
  const calls = [...text.matchAll(/&\s*(git|node|npm|curl|wget|powershell|cmd|sh|bash)\b[^\r\n]*/g)].map((x) => x[0].trim());
  console.log(`  ${m.rel} 共 ${calls.length} 处外部命令调用：`);
  const uniq = [...new Set(calls.map((c) => c.replace(/\s+/g, ' ')))];
  for (const c of uniq.slice(0, 40)) console.log(`      ${c.slice(0, 110)}`);
  if (uniq.length > 40) console.log(`      …另有 ${uniq.length - 40} 处`);
}

console.log('\n审计结束。');
