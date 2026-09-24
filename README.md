<!--
  ═══════════════════════════════════════════════════════════════════════════
  Claire · GitHub 个人主页

  设计取向：极简。全页只回答四个问题 —— 我是谁、我在做什么、做出过什么、怎么找我。
  没有技术栈清单、没有徽章墙、没有装饰性分区。

  ── 底线（改之前先读）──
    · 数字都要能查到出处，GitHub 数据来自 API 实测且可点链接复查；
    · 「已合并」与「待审核」严格分开，绝不合并成"贡献 N 个 PR"；
    · 未开源的项目写明「未开源」，不装成能点开验证；
    · 不写雇主与客户名 —— 那是客户的披露权，不是我的；
    · 不写"精通 / 资深 / 专家"这类无法验证的自我评价。

  ── 实现约束 ──
    · 卡片是本仓库自带的静态 SVG（assets/），不用第三方卡片服务：
      实测本机 *.vercel.app 的 DNS 被污染（github-readme-stats 等四个热门服务全不可达），
      写进 README 就是坏图。自渲染零依赖、不受速率限制。
    · 每张卡有深/浅两套，用 <picture> + prefers-color-scheme 自适应。
    · 贪吃蛇用 CSS @keyframes（与 Platane/snk 同路线）。**不能用 SMIL**：
      GitHub 渲染仓库 SVG 走 <img> 语义，实测 SMIL 版在该场景下完全不动。
      验证：preview/css-snake-verify.html

  ── 维护命令 ──
    刷新贡献数据 + 重画贪吃蛇（提交后数据才会跟着变，SVG 是快照不会自动更新）：
        node tools/fetch-contributions.mjs && node tools/generate-snake.mjs
    重新渲染卡片   node tools/generate-assets.mjs
    上线前体检     node tools/verify-assets.mjs
    本地看效果     node tools/preview-server.mjs   → http://127.0.0.1:8123/
  ═══════════════════════════════════════════════════════════════════════════
-->

<h3 align="center">Claire</h3>

<p align="center">
  AI 应用开发 · 多 Agent 编排 · RAG<br>
  <sub>6 年企业级开发经验（医疗 / 政务 / 制造）</sub>
</p>

<br>

### Hopeflow · AI 短剧创作平台

<sub>全栈独立开发 · <b>未开源</b>（可面谈演示）</sub>

覆盖「小说 → 剧本 → 分镜 → 素材 → 视频」一站式创作链路。

- **三层 Agent 协作**：决策层 → 执行层 → 监督层编排，全自动与人工决策双模式
- **本地向量 RAG**：ONNX 本地模型实现跨会话记忆与知识库检索，推理全链路本地化

<br>

## Contributions

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/snake-light.svg">
    <img src="./assets/snake.svg" alt="贡献图贪吃蛇动画" width="100%">
  </picture>
</div>

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/contrib-light.svg">
    <img src="./assets/contrib.svg" alt="开源贡献：15 个 PR、17 个 issue" width="100%">
  </picture>
</div>

给 [Hutool](https://github.com/chinabugotech/hutool)（30.3k★）修的
[#4337](https://github.com/chinabugotech/hutool/pull/4337) 已被合并；
另有 8 个 PR 在 [apache/fesod](https://github.com/apache/fesod)（6.2k★）与 Hutool 待审核 ——
<sub>[全部 PR](https://github.com/pulls?q=is%3Apr+author%3ACodeMan-cmd) · [全部 issue](https://github.com/issues?q=is%3Aissue+author%3ACodeMan-cmd)</sub>

<br>

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/contact-light.svg">
    <img src="./assets/contact.svg" alt="联系方式：GitHub / Email / 微信" width="100%">
  </picture>
</div>

<br>

<!-- 卡片是图片、文字点不动，所以这里给一行真正可点的入口 -->
<div align="center">
  <sub>
    <a href="mailto:claire_channel@qq.com">claire_channel@qq.com</a>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    <a href="/CodeMan-cmd">github.com/CodeMan-cmd</a>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    微信 tongff_wechat
  </sub>
</div>
