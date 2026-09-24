<!--
  ═══════════════════════════════════════════════════════════════════════════
  CodeMan-cmd · GitHub 个人主页

  设计取向：极简。整页只保留「联系方式」一块内容，不做技术栈清单、
  不堆徽章墙、不加统计卡与装饰 banner。

  为什么这么克制：主页上真正有信息量的是仓库列表和提交记录，GitHub 自己
  就渲染好了。额外叠上去的装饰越多，越像套模板；少而准，才像本人写的。

  两条实现约束（改之前请先读）：
    · 唯一的那张卡片是本仓库自带的静态 SVG（assets/contact.svg），
      刻意不使用任何第三方卡片服务。原因：实测本机 *.vercel.app 的 DNS
      被污染（github-readme-stats / github-profile-trophy / capsule-render /
      activity-graph 四个热门服务全部不可达），写进 README 就是坏图。
      自渲染的静态 SVG 零第三方依赖、不受速率限制、网络再差也不会变破图。
    · 卡片有深/浅两套（contact.svg / contact-light.svg），用
      <picture> + prefers-color-scheme 按访客主题切换。

  维护命令：
    重新渲染卡片   node tools/generate-assets.mjs
    上线前体检     node tools/verify-assets.mjs
    本地看效果     node tools/preview-server.mjs   然后打开 http://127.0.0.1:8123/
  ═══════════════════════════════════════════════════════════════════════════
-->

<h3 align="center">你好，我是 Rosemonder 👋</h3>

<p align="center">
  写 Java 后端，也花不少时间在<b>电子表格的流式读写</b>上——<br>
  关心的是"大文件不 OOM"和"边界数据不出错"这类具体问题。
</p>

<br>

<!-- 联系卡：唯一的视觉主体。注意它是一张图片，卡片上的文字点不动，
     所以下面必须再给一行真正可点的链接 —— 好看的图片不替代可用的入口。 -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="./assets/contact-light.svg">
    <img src="./assets/contact.svg" alt="联系方式：GitHub / Email / QQ" width="100%">
  </picture>
</div>

<br>

<!-- 可点的联系方式。
     刻意用原生文本而不是 shields.io 徽章：实测徽章首次请求需 1.6s 左右，
     慢的时候页面会先闪出破图图标，而这一行本来就只有三个短字符串，
     自己写反而更快、更稳、也更好看。 -->
<div align="center">
  <a href="mailto:2291415248@qq.com"><code>2291415248@qq.com</code></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/CodeMan-cmd"><code>@CodeMan-cmd</code></a>
  &nbsp;·&nbsp;
  <code>QQ 2291415248</code>
</div>

<br>

<p align="center">
  <i>如果也在折腾 Excel 大文件、POI 或流式读写，欢迎直接找我聊。</i>
</p>
