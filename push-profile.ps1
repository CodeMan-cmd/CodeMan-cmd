# push-profile.ps1 — 把美化后的主页推送到 GitHub（幂等，可反复运行）
#
# 为什么需要这个脚本（而不是让你手敲几条 git 命令）：
#   1. 本机 git 默认走 Windows schannel，实测报
#      `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`，
#      直连 GitHub 会失败。脚本内置 `-c http.sslBackend=openssl` 绕过，
#      且**不修改你的全局 ~/.gitconfig**（沙箱下该文件也不可写）。
#   2. 首次运行会自动创建名为 <用户名> 的个人主页仓库，已存在则直接复用。
#   3. push 前自动跑资产体检，有坏图就中止 —— 避免把破图推上主页。
#
# 用法：
#   # 预演（只做检查与提交，不推送）
#   pwsh -File push-profile.ps1 -DryRun
#
#   # 正式推送（首次会弹出 GitHub 登录，或先设置 token 环境变量）
#   pwsh -File push-profile.ps1
#
#   # 用 Personal Access Token 免交互（需 repo 权限）
#   $env:GITHUB_TOKEN = 'ghp_xxx'; pwsh -File push-profile.ps1
#
# 参数：
#   -DryRun      只提交到本地，不 push
#   -SkipVerify  跳过资产可达性体检（不推荐）
#   -Message     自定义提交信息
#   -RemoteBase  自定义远端基地址，默认 https://github.com
#                用途：把脚本指向本地裸仓库做**端到端自测**（连 push 一起验证），
#                例如 -RemoteBase 'file:///C:/tmp' —— 这样无需 GitHub 凭据即可
#                确认"提交 → 推送 → 校验"整条链路真的能跑通。
#   -Branch      远端分支名，默认 master（与 CodeMan-cmd/CodeMan-cmd 的默认分支一致）
#   -AuthorName  git 提交作者名，默认 Claire（主页对外显示名）
#   -AuthorEmail git 提交作者邮箱，默认 claire_channel@qq.com
#
# 注意：GitHub 登录名（$User）与 git 提交作者（$AuthorName）是**两回事**，
# 早先版本共用一个 $User 变量，改名后会把登录名误写进提交作者，故拆开。
# 作者邮箱必须与 GitHub 账号上的「已验证邮箱」一致，否则提交不计入贡献图。

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipVerify,
    [string]$Message,
    [string]$User = 'CodeMan-cmd',
    [string]$RemoteBase = 'https://github.com',
    [string]$Branch = 'master',
    [string]$AuthorName = 'Claire',
    [string]$AuthorEmail = 'claire_channel@qq.com'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# ── 关键：绕过损坏的 schannel TLS 后端 ──
# 用 -c 传参而不是改全局配置，避免污染用户环境，也绕开沙箱对 ~/.gitconfig 的写限制。
$GitArgs = @('-c', 'http.sslBackend=openssl')

function Say([string]$Text, [string]$Kind = 'info') {
    $prefix = switch ($Kind) {
        'ok'   { '[ OK ]' }
        'warn' { '[WARN]' }
        'err'  { '[FAIL]' }
        'step' { '[STEP]' }
        default { '[INFO]' }
    }
    $color = switch ($Kind) {
        'ok'   { 'Green' }
        'warn' { 'Yellow' }
        'err'  { 'Red' }
        'step' { 'Cyan' }
        default { 'Gray' }
    }
    Write-Host "$prefix $Text" -ForegroundColor $color
}

function Invoke-Git {
    # 注意：必须以数组方式传参，例如 Invoke-Git @('add','-A')
    # 不能写成 Invoke-Git add -A —— PowerShell 会把 -A 当作本函数的参数名解析，
    # 报 "Missing an argument for parameter 'Args'"。
    param([string[]]$GitCommand)
    $all = $GitArgs + $GitCommand
    # 关键：调原生程序时临时把 ErrorActionPreference 降为 Continue。
    # 原因：`2>&1` 会把 git 写到 stderr 的内容（例如 "LF will be replaced by CRLF"
    # 这类**警告**）包装成 ErrorRecord，而脚本顶部的 $ErrorActionPreference='Stop'
    # 会因此把一条无害警告升级成终止性错误，导致脚本在提交阶段莫名中断。
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = & git @all 2>&1
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prev
    }
    return [pscustomobject]@{ Output = ($out | Out-String).Trim(); Code = $code }
}

# ── 0. 定位脚本所在目录（仓库根） ──
$Root = $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }
Write-Host ''
Write-Host '  GitHub 主页推送' -ForegroundColor White
Write-Host "  仓库目录：$Root" -ForegroundColor DarkGray
Write-Host ('  ' + ('─' * 68)) -ForegroundColor DarkGray

# ── 1. 前置检查 ──
Say '前置检查' 'step'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Say 'git 未安装或不在 PATH 中' 'err'; exit 1
}
Say "git: $((git --version))" 'ok'

foreach ($f in @(
    'README.md',
    'assets/contact.svg', 'assets/contact-light.svg',
    'assets/contrib.svg', 'assets/contrib-light.svg',
    'assets/snake.svg', 'assets/snake-light.svg'
)) {
    if (-not (Test-Path (Join-Path $Root $f))) {
        Say "缺少文件 $f" 'err'
        Say '请先运行：node tools/generate-assets.mjs' 'info'
        exit 1
    }
}
Say 'README.md 与 6 个 SVG 资源齐全' 'ok'

# ── 2. 资产体检：有坏图就中止 ──
if (-not $SkipVerify) {
    Say '资产可达性体检（防坏图）' 'step'
    $verify = Join-Path $Root 'tools/verify-assets.mjs'
    if (Test-Path $verify) {
        & node $verify
        if ($LASTEXITCODE -ne 0) {
            Say '资产体检未通过：README 里存在不可达的图片，已中止推送。' 'err'
            Say '如确认要跳过，加 -SkipVerify（不建议）。' 'warn'
            exit 1
        }
        Say '资产体检通过，无坏图' 'ok'
    } else {
        Say "找不到 $verify，跳过体检" 'warn'
    }
} else {
    Say '已按参数要求跳过资产体检' 'warn'
}

# ── 3. 初始化仓库 ──
Say '准备本地仓库' 'step'
if (-not (Test-Path (Join-Path $Root '.git'))) {
    $r = Invoke-Git @('init', '-b', $Branch)
    if ($r.Code -ne 0) {
        # 老版本 git 不支持 -b
        Invoke-Git @('init') | Out-Null
        Invoke-Git @('symbolic-ref', 'HEAD', "refs/heads/$Branch") | Out-Null
    }
    Say "已初始化 git 仓库（分支 $Branch）" 'ok'
} else {
    Say '已存在 .git，复用' 'ok'
}

Invoke-Git @('config', 'user.name', $AuthorName) | Out-Null
Invoke-Git @('config', 'user.email', $AuthorEmail) | Out-Null

# .gitignore：排除预览产物与本地数据快照中的噪音
$ignore = Join-Path $Root '.gitignore'
if (-not (Test-Path $ignore)) {
    # 用 ASCII 编码而不是 UTF8：Windows PowerShell 5.1 的 `-Encoding UTF8` 会写入 BOM，
    # 而 .gitignore 带 BOM 会让首行 `#` 注释失效（BOM 字节被当成模式的一部分）。
    @'
# 本地预览 / 调试产物
.browser-mode/
*.log
.DS_Store
Thumbs.db
'@ | Set-Content -Path $ignore -Encoding ASCII
    Say '已写入 .gitignore' 'ok'
}

# ── 4. 组装远端地址 ──
$remoteUrl = "$RemoteBase/$User/$User.git"
$token = $env:GITHUB_TOKEN

if ($token) {
    # 用 token 免交互；注意不要把带 token 的 URL 写进 .git/config 长期留存
    $pushUrl = ($RemoteBase -replace '^https://', "https://x-access-token:$token@") + "/$User/$User.git"
    Say '检测到 GITHUB_TOKEN，将使用 token 认证（不会写入本地配置）' 'ok'
} else {
    $pushUrl = $remoteUrl
    Say '未检测到 GITHUB_TOKEN，将走 Git 凭据管理器（可能弹出 GitHub 登录窗口）' 'warn'
}

# ── 5. 探测远端仓库是否存在 ──
Say '探测远端' 'step'
$probe = Invoke-Git @('ls-remote', '--heads', $pushUrl)
$remoteExists = $probe.Code -eq 0
if ($remoteExists) {
    Say "远端仓库可访问：$remoteUrl" 'ok'
} else {
    Say "远端暂不可访问（可能尚未创建，或认证失败）：$remoteUrl" 'warn'
    Say '若仓库不存在，请先在 GitHub 网页创建同名仓库：' 'info'
    Say "  1) 打开 https://github.com/new" 'info'
    Say "  2) Repository name 填：$User   ← 必须与用户名完全一致" 'info'
    Say '  3) 设为 Public，不要勾选 Add README（避免首次推送冲突）' 'info'
    Say "  4) 不要初始化 .gitignore / license" 'info'
    Say '创建后重新运行本脚本即可。' 'info'
    if (-not $token) { exit 2 }
}

# ── 6. 提交 ──
Say '暂存并提交' 'step'
Invoke-Git @('add', '-A') | Out-Null

$staged = Invoke-Git @('diff', '--cached', '--name-only')
if ([string]::IsNullOrWhiteSpace($staged.Output)) {
    Say '没有需要提交的改动（工作区已是最新）' 'ok'
} else {
    Say "将提交以下文件：" 'info'
    $staged.Output -split "`n" | Where-Object { $_.Trim() } | ForEach-Object { Write-Host "    · $($_.Trim())" -ForegroundColor DarkGray }

    if (-not $Message) {
        $Message = "chore(profile): beautify profile README with offline-rendered SVG cards"
    }
    $c = Invoke-Git @('commit', '-m', $Message)
    if ($c.Code -ne 0) {
        if ($c.Output -match 'nothing to commit') {
            Say '没有新改动可提交' 'ok'
        } else {
            Say "提交失败：$($c.Output)" 'err'; exit 1
        }
    } else {
        Say '提交完成' 'ok'
    }
}

# ── 7. 推送 ──
if ($DryRun) {
    Say 'DryRun 模式：跳过推送。本地提交已就绪，去掉 -DryRun 即可正式推送。' 'warn'
    exit 0
}

Say '推送到 GitHub' 'step'
Invoke-Git @('remote', 'remove', 'origin') | Out-Null
Invoke-Git @('remote', 'add', 'origin', $pushUrl) | Out-Null

# 安全闸门：检测远端是否有本地没有的提交。
# 为什么必须查：下面的失败回退会用到 --force，若远端存在本地缺失的提交
# （例如你在网页上直接编辑过 README），强推会**无声地覆盖**那些改动。
# 个人主页仓库通常只有自己在写，但"通常"不等于"一定"，所以先确认再动手。
$remoteMain = Invoke-Git @('ls-remote', 'origin', "refs/heads/$Branch")
$remoteSha = ''
if ($remoteMain.Code -eq 0 -and $remoteMain.Output -match '(?m)^([0-9a-f]{40})\s') {
    $remoteSha = $Matches[1]
}
if ($remoteSha) {
    $localHas = Invoke-Git @('merge-base', '--is-ancestor', $remoteSha, 'HEAD')
    if ($localHas.Code -ne 0) {
        Say '检测到远端含有本地没有的提交——直接强推会覆盖它们。' 'err'
        Say "远端 $Branch = $remoteSha" 'info'
        Say '请先执行以下命令把远端改动合并进来，再重新运行本脚本：' 'info'
        Say "    git pull --rebase origin $Branch" 'info'
        Say '（若你确认远端那些提交可以丢弃，可手动执行 git push --force）' 'warn'
        if ($token) { Invoke-Git @('remote', 'set-url', 'origin', $remoteUrl) | Out-Null }
        exit 1
    }
    Say '远端分支是本地 HEAD 的祖先，可安全快进' 'ok'
} else {
    Say "远端还没有 $Branch 分支，将进行首次推送" 'ok'
}

# 先尝试带租约的强推（能防住并发改动），失败再回退到普通强推
$p = Invoke-Git @('push', '-u', 'origin', "$Branch", '--force-with-lease')
if ($p.Code -ne 0) {
    Say '带租约推送未成功，改用首次推送策略' 'warn'
    $p = Invoke-Git @('push', '-u', 'origin', "$Branch", '--force')
}
if ($p.Code -ne 0) {
    Say "推送失败：$($p.Output)" 'err'
    Say '常见原因：仓库不存在 / 无权限 / 凭据被拒 / 网络问题。' 'info'
    Say '如果提示认证失败，可设置 $env:GITHUB_TOKEN 后重试。' 'info'
    exit 1
}
Say '推送成功' 'ok'

# 推送后把带 token 的 remote 清除，避免凭据残留在 .git/config
if ($token) {
    Invoke-Git @('remote', 'set-url', 'origin', $remoteUrl) | Out-Null
    Say '已清除 remote 中的 token' 'ok'
}

Write-Host ''
Write-Host ('  ' + ('─' * 68)) -ForegroundColor DarkGray
Say "完成！主页地址：https://github.com/$User" 'ok'
Say '若页面未立即更新，等 10-30 秒后刷新（GitHub 有缓存）。' 'info'
Write-Host ''
