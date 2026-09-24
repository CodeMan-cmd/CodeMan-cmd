<!--
  ═══════════════════════════════════════════════════════════════════════════
  CodeMan-cmd · GitHub 个人主页

  撰写原则（改之前先读，这是本页的底线）：
    · 每个数字都来自 GitHub API 实测，可点开逐条复查；
    · 「已合并」与「待审核」严格分开，绝不合并成"贡献 N 个 PR"这类说法；
    · 项目 star 数只用于说明项目热度，明确标注"非本人成绩"；
    · 不写"精通 / 资深 / 专家"这类无法验证的自我评价。

  为什么这么较真：主页上的每个字都会被技术面官验证。夸大的措辞一旦被
  追问就整份失效，而准确的措辞反而是加分项——招人的看惯了吹牛的。

  两条实现约束：
    · 卡片是本仓库自带的静态 SVG（assets/），刻意不用第三方卡片服务。
      实测本机 *.vercel.app 的 DNS 被污染（github-readme-stats、
      github-profile-trophy、capsule-render、activity-graph 全部不可达），
      写进 README 就是坏图。自渲染 SVG 零依赖、不受速率限制。
    · 每张卡有深/浅两套，用 <picture> + prefers-color-scheme 自适应。

  维护命令：
    重新渲染卡片   node tools/generate-assets.mjs
    上线前体检     node tools/verify-assets.mjs
    本地看效果     node tools/preview-server.mjs   然后打开 http://127.0.0.1:8123/
  ═══════════════════════════════════════════════════════════════════════════
-->

<h3 align="center">Rosemonder · Java 后端工程师</h3>

<p align="center">
  <b>文档摄取与流式处理方向</b> —— 把 PDF / Excel / 日志这类数据变成大模型用得起、
  且不会悄悄损坏的结构化输入。
</p>

<p align="center">
  <code>Java</code> <code>Spring Boot</code> <code>Apache POI</code> <code>流式 IO</code> <code>文本切分</code> <code>检索增强数据管道</code>
</p>

<br>

<!-- 开源贡献量化卡 -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/contrib-light.svg">
    <img src="./assets/contrib.svg" alt="开源贡献量化：15 个 PR、17 个 issue、7 个上游项目" width="100%">
  </picture>
</div>

### 我为什么做这一层

RAG 最难的不是接大模型，而是**摄取层的静默失败**：

- 表格被按字数切碎，检索命中了但答案错
- 单元格行列坐标在读取时丢失
- chunk 刚好占满 chunkSize 时，overlap 被悄悄吞掉

这些**都不抛异常**，只让结果慢慢变错，等发现时已经污染了整个知识库。
我提交的修复集中在这一类问题上：

| 项目 | 内容 | 状态 |
| :--- | :--- | :--- |
| [**chinabugotech/hutool**](https://github.com/chinabugotech/hutool) · 30.3k★ | [#4337](https://github.com/chinabugotech/hutool/pull/4337) `CharSequenceUtil.replaceFirst` 在含增补字符（emoji）时替换位置错误 | ✅ 已合并 |
| [**langchain-ai/langchainjs**](https://github.com/langchain-ai/langchainjs) | [#11702](https://github.com/langchain-ai/langchainjs/issues/11702) `chunkOverlap` 在 chunk 刚好占满 `chunkSize` 时被静默丢弃 | 🐞 issue |
| | [#11703](https://github.com/langchain-ai/langchainjs/pull/11703) 为该边界契约补测试用例 | 🟡 待审核 |
| [**apache/fesod**](https://github.com/apache/fesod) · 6.2k★ | [#1132](https://github.com/apache/fesod/pull/1132) 克隆 `ReadCellData` 时保留行列坐标 | 🟡 待审核 |
| | [#1130](https://github.com/apache/fesod/pull/1130) 驼峰字段名（如 `xRealIp`）下的列筛选错选 | 🟡 待审核 |
| | [#1133](https://github.com/apache/fesod/pull/1133) 补 `java.sql.Date` / `Instant` / `YearMonth` 等类型转换器 | 🟡 待审核 |
| [**chinabugotech/hutool**](https://github.com/chinabugotech/hutool) | [#4335](https://github.com/chinabugotech/hutool/pull/4335) `CRC16` 校验值随数据喂入方式变化——**流式读取会算出错误校验值** | 🟡 待审核 |
| | [#4327](https://github.com/chinabugotech/hutool/pull/4327) `Caesar.encode()` 负偏移量抛异常、非字母表字符被静默损坏 | 🟡 待审核 |

<sub>完整清单见 [我的 PR](https://github.com/pulls?q=is%3Apr+author%3ACodeMan-cmd) 与 [我提的 issue](https://github.com/issues?q=is%3Aissue+author%3ACodeMan-cmd)。</sub>

<br>

<!-- 联系卡 -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/contact-light.svg">
    <img src="./assets/contact.svg" alt="联系方式：GitHub / Email / QQ" width="100%">
  </picture>
</div>

<br>

<!-- 可点的联系方式。用原生文本而不是 shields.io 徽章：
     实测徽章首次请求约需 1.6 秒，慢的时候页面会先闪出破图。 -->
<div align="center">
  <a href="mailto:2291415248@qq.com"><code>2291415248@qq.com</code></a>
  &nbsp;·&nbsp;
  <a href="/CodeMan-cmd"><code>@CodeMan-cmd</code></a>
  &nbsp;·&nbsp;
  <code>QQ 2291415248</code>
</div>

<br>

<p align="center">
  <i>如果也在折腾文档摄取、大文件流式处理或文本切分，欢迎直接找我聊。</i>
</p>
