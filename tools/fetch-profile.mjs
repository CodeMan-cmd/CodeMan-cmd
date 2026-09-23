#!/usr/bin/env node
/**
 * fetch-profile.mjs — 抓取 GitHub 公开资料，产出 profile-data.json
 *
 * 为什么用 Node 而不是 PowerShell/curl：
 *   本机 PowerShell 的 Invoke-WebRequest 与 curl.exe 走 Windows schannel，
 *   实测报 `AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`；
 *   git 默认后端同样是 schannel，需要 `git -c http.sslBackend=openssl` 才能用。
 *   Node 自带 OpenSSL 栈，可直接访问 GitHub API。
 *
 * 用法：
 *   node tools/fetch-profile.mjs [user]        # 默认 CodeMan-cmd
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'data', 'profile-data.json');
const USER = process.argv[2] || 'CodeMan-cmd';
const UA = 'github-profile-readme-fetcher';

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { 'user-agent': UA, accept: 'application/vnd.github+json' },
  });
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} -> ${res.status} (remaining=${remaining}) ${body.slice(0, 200)}`);
  }
  return { data: await res.json(), remaining };
}

const out = { fetchedAt: new Date().toISOString(), user: USER };
let remaining = '?';

try {
  let r = await api(`/users/${USER}`);
  out.profile = r.data;
  remaining = r.remaining;
  console.log(`✓ profile  ${r.data.login} (${r.data.name || 'no name'}) repos=${r.data.public_repos} remaining=${remaining}`);

  r = await api(`/users/${USER}/repos?per_page=100&sort=pushed`);
  const repos = r.data;
  remaining = r.remaining;
  const own = repos.filter((x) => !x.fork);
  const forks = repos.filter((x) => x.fork);
  out.repos = {
    total: repos.length,
    ownCount: own.length,
    forkCount: forks.length,
    own: own.map((x) => ({
      name: x.name, language: x.language, stars: x.stargazers_count, forks: x.forks_count,
      desc: x.description, pushedAt: x.pushed_at, topics: x.topics, htmlUrl: x.html_url,
      defaultBranch: x.default_branch,
    })),
    forks: forks.map((x) => ({ name: x.name, desc: x.description, pushedAt: x.pushed_at, upstream: x.parent?.full_name })),
  };
  console.log(`✓ repos    ${repos.length} 个（自有 ${own.length} / fork ${forks.length}）`);

  r = await api(`/users/${USER}/events/public?per_page=100`);
  const ev = r.data;
  remaining = r.remaining;
  const types = {};
  for (const e of ev) types[e.type] = (types[e.type] || 0) + 1;
  out.activity = {
    eventCount: ev.length,
    windowFrom: ev.length ? ev[ev.length - 1].created_at : null,
    windowTo: ev.length ? ev[0].created_at : null,
    types,
    repos: [...new Set(ev.map((e) => e.repo.name))],
    // 只保留有信息量的事件，供 README 的"近期动态"区使用
    highlights: ev
      .filter((e) => ['IssuesEvent', 'PullRequestEvent', 'IssueCommentEvent'].includes(e.type))
      .slice(0, 12)
      .map((e) => ({
        date: e.created_at.slice(0, 10),
        type: e.type.replace('Event', ''),
        repo: e.repo.name,
        action: e.payload.action,
        title: (e.payload.issue?.title || e.payload.pull_request?.title || '').slice(0, 120),
        url: e.payload.issue?.html_url || e.payload.pull_request?.html_url || `https://github.com/${e.repo.name}`,
      })),
  };
  console.log(`✓ activity ${ev.length} 个事件，覆盖仓库 ${out.activity.repos.length} 个`);
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exitCode = 2;
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log(`\n已写入 ${OUT}`);
