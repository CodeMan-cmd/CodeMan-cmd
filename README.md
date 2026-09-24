<!--
  ═══════════════════════════════════════════════════════════════════════════
  CodeMan-cmd · GitHub 个人主页

  ── 定位 ──
  2026-09 改版：从「Java 后端 · 文档摄取与流式处理」改为「AI 应用开发」。
  原因：简历的求职意向是 AI 应用开发工程师，主力作品是 Hopeflow
  （多 Agent 编排的全栈 AI 平台）。主页原来主推"给 hutool 修 bug"，
  等于把最能打的牌藏起来，且和简历不是同一条线——面试官点开主页会
  以为看到的是另一个人。现在两边说同一件事。

  ── 撰写原则（改之前先读，这是本页的底线）──
    · 每个数字都要能查到出处：GitHub 数据来自 API 实测，可点链接复查；
      本机工程统计（Hopeflow 规模）明确标注"自述"；
    · 「已合并」与「待审核」严格分开，绝不合并成"贡献 N 个 PR"；
    · 未开源的项目必须写明「未开源」，不装成能点开验证；
    · 项目 star 数只用于说明项目热度，明确标注"非本人成绩"；
    · 不写"精通 / 资深 / 专家"这类无法验证的自我评价。

  ── 为什么把未开源的 Hopeflow 放进来 ──
  它点不开仓库，按上面的原则本不该上主页。但它是目前唯一能证明
  "独立交付过一个完整 AI 应用"的东西。诚实的做法是**标注来源**，
  而不是删掉——删掉才是对外隐瞒、对自己不利。所以它单独分区、
  标题上就写明「未开源」。

  ── 两条实现约束 ──
    · 卡片是本仓库自带的静态 SVG（assets/），刻意不用第三方卡片服务。
      实测本机 *.vercel.app 的 DNS 被污染（github-readme-stats、
      github-profile-trophy、capsule-render、activity-graph 全部不可达），
      写进 README 就是坏图。自渲染 SVG 零依赖、不受速率限制。
    · 每张卡有深/浅两套，用 <picture> + prefers-color-scheme 自适应。

  ── 维护命令 ──
    重新渲染卡片   node tools/generate-assets.mjs
    刷新贡献数据   node tools/fetch-contributions.mjs   （贪吃蛇的数据源）
    重生成贪吃蛇   node tools/generate-snake.mjs
    上线前体检     node tools/verify-assets.mjs
    本地看效果     node tools/preview-server.mjs   然后打开 http://127.0.0.1:8123/

  ── 公开主页的禁写清单 ──
    手机号、现雇主与客户名、未开源项目说成"开源"、无法验证的自我评价。
    客户名尤其不能写：那是客户的披露权，不是我的。
  ═══════════════════════════════════════════════════════════════════════════
-->

<h3 align="center">Claire</h3>

<p align="center">
  AI 应用开发 · 多 Agent 编排 · RAG
</p>

<br>

### Hopeflow · AI 短剧创作平台

<sub>全栈独立开发 · <b>未开源</b>（可面谈演示）</sub>

覆盖「小说 → 剧本 → 分镜 → 素材 → 视频」一站式创作链路。

- **三层 Agent 协作**：决策层 → 执行层 → 监督层编排，支持全自动与人工决策双模式
- **本地向量 RAG**：ONNX 本地模型实现 Agent 跨会话记忆与知识库检索，推理全链路本地化
- **可编程供应商系统**：供应商逻辑外化为 TypeScript，沙箱执行，对接十余家模型供应商
- **无限画布工作台**：节点图组织剧本与素材，浏览器内完成视频合成与导出

<sub>412 个源文件 · 6.8 万行 TypeScript · 202 条 REST 路由 · 7 语言国际化</sub>

<br>

## Contributions

<!-- 贡献图贪吃蛇：蛇按列蛇形爬过最近 53 周的贡献格子，
     每吃掉一个"有贡献"的格子，那格会闪一下琥珀色再定成它的等级色。

     实现用 CSS @keyframes（蛇身 stroke-dashoffset + 每格一条独立 keyframes），
     路线与 Platane/snk（6k★，被大量主页使用）一致。

     为什么不用 SMIL：GitHub 渲染仓库里的 SVG 走 <img> 语义，实测在
     <object>/<img> 这类"单独加载"场景下，SMIL 版的 snake.svg 完全不动
     （6 秒内填充色只有 1 种取值），而 CSS 版同场景下蛇身每帧都在变、
     25/25 个格子动画生效。验证页：preview/css-snake-verify.html
     教训：把 SVG 内联进 DOM 验证动画是**不可靠的**，必须按 <img> 语义验证。

     数据源为第三方镜像 github-contributions-api.jogruber.de（GitHub 官方
     贡献数据只走 GraphQL），刷新方式：node tools/fetch-contributions.mjs -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/snake-light.svg">
    <img src="./assets/snake.svg" alt="贡献图贪吃蛇动画" width="100%">
  </picture>
</div>

<!-- 开源贡献量化卡 -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/contrib-light.svg">
    <img src="./assets/contrib.svg" alt="开源贡献量化：15 个 PR、17 个 issue、7 个上游项目" width="100%">
  </picture>
</div>

### 为什么我会去修上游的 bug

做 RAG 时踩到的坑，大多不在模型那一层，而在**摄取层的静默失败**：表格被按字数切碎、
单元格行列坐标在读取时丢失、chunk 刚好占满 `chunkSize` 时 overlap 被悄悄吞掉。
这些**都不抛异常**，只让结果慢慢变错，等发现时已经污染了整个知识库。

所以修 bug 修到了上游去：

| 项目 | 内容 | 状态 |
| :--- | :--- | :--- |
| [**chinabugotech/hutool**](https://github.com/chinabugotech/hutool) · 30.3k★ | [#4337](https://github.com/chinabugotech/hutool/pull/4337) `CharSequenceUtil.replaceFirst` 在含增补字符（emoji）时替换位置错误 | ✅ 已合并 |
| [**langchain-ai/langchainjs**](https://github.com/langchain-ai/langchainjs) | [#11702](https://github.com/langchain-ai/langchainjs/issues/11702) `chunkOverlap` 在 chunk 刚好占满 `chunkSize` 时被静默丢弃 | 🐞 issue |

其余 8 个待审核 PR 涉及 [apache/fesod](https://github.com/apache/fesod)（6.2k★）的
`ReadCellData` 坐标丢失、驼峰字段名筛选、类型转换器，以及 hutool 的 `CRC16` 流式校验、
`Caesar.encode()` 负偏移量等问题 —— <sub>完整清单见 [我的 PR](https://github.com/pulls?q=is%3Apr+author%3ACodeMan-cmd) 与 [我提的 issue](https://github.com/issues?q=is%3Aissue+author%3ACodeMan-cmd)。</sub>

<br>

### 后端底座

做 AI 应用之前，在医疗、政务、制造三个行业做过 5 年企业级后端：

- **医疗** —— HIS 统一支付与对账平台（对接微信 / 支付宝 / 银联与多地医保，t+1 自动对账）
- **政务** —— 基层治理服务小程序（Kafka 实时定位与轨迹回放、线上审批闭环）
- **制造** —— 大宗商品集采平台（采购 → 订单 → 结算流转，对接 ERP 自动挂账）

<sub>只说行业与系统类型，不写雇主与客户名称：公开主页上不替客户做披露。</sub>

<br>

<!-- 联系卡 -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/contact-light.svg">
    <img src="./assets/contact.svg" alt="联系方式：GitHub / Email / QQ" width="100%">
  </picture>
</div>

<br>

<!-- 卡片是图片、文字点不动，所以这里给一行真正可点的入口。
     用原生文本而非 shields.io 徽章：实测徽章首次请求约需 1.6 秒，
     慢的时候页面会先闪出破图。 -->
<div align="center">
  <sub>
    <a href="mailto:claire_channel@qq.com">claire_channel@qq.com</a>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    <a href="/CodeMan-cmd">github.com/CodeMan-cmd</a>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    QQ 2291415248
  </sub>
</div>

<br>

<p align="center">
  <i>如果也在折腾多 Agent 编排、RAG 或文档摄取，欢迎直接找我聊。</i>
</p>
