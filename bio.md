# GitHub Bio 候选 —— CodeMan-cmd / 童辉煌

GitHub 的 Bio 字段上限 **160 字符**（换行也算 1 个）。下面每版都标了**实测字符数**。

---

## 先说一件事：现有主页定位跟简历对不上

| | 现在的 README 在说 | 简历在说 |
| :--- | :--- | :--- |
| 身份 | Java 后端工程师 | **AI 应用开发工程师**（求职意向） |
| 战场 | 文档摄取、流式处理、RAG 摄取层 | 多 Agent 编排、RAG、工具调用、流式输出 |
| 主力作品 | hutool / fesod / langchainjs 的修复 PR | **Hopeflow AI 短剧创作平台**（412 文件 / 6.8 万行 TS，三层 Agent） |
| 语言 | Java | TypeScript / Node.js + Java / Python |

主页现在主推「上游修 bug」，简历主推「独立做出一个 AI 平台」。
**后者才是你值钱的部分**，Bio 必须换成 AI 应用方向，不然面试官点开主页会觉得是另一个人。

注意 Hopeflow **暂未开源**：Bio 里可以写"Doing"，但别写成"开源项目"——
面试官搜不到仓库会问，你答"未开源"就行，答错了性质不同。

---

## F · 推荐版 —— 实测 147 字符（AI 应用方向，对齐求职意向）

```
AI 应用开发工程师 · Agent 编排 / RAG / 流式输出
独立开发 AI 短剧创作平台：三层 Agent 流水线 · 本地向量 RAG · 6.8 万行 TypeScript
Java & Node.js 全栈 · 6 年 · SpringCloud / MySQL / Redis
```

第三行是"底子"——说明你不只会调 API，是有后端功底的，这条对招人方很关键。

## G · 事实版 —— 实测 118 字符（保守，每个字都能点开验证）

```
AI 应用开发工程师 · Agent 编排 / RAG
Hutool(30k★) 已合并 PR · Fesod / LangChain.js 上游提交
独立开发 AI 短剧平台（6.8 万行 TS）· Java / Node.js 全栈
```

## H · 混合版 —— 实测 135 字符（定位最完整）

```
AI 应用 & 全栈工程师 · 多 Agent 编排 · RAG · 流式输出
独立开发 AI 短剧创作平台：三层 Agent · 本地向量 RAG · 6.8 万行 TS
Hutool 已合并 PR · SpringCloud 微服务 · Java / Node.js
```

## I · 英文版 —— 实测 152 字符

```
AI application engineer · multi-agent / RAG
Built an AI short-drama studio: 3-layer agents, local vector RAG
Merged PR in Hutool (30k★) · Java & Node.js
```

---

## 为什么不写这些（Bio 是公开的，全网可见）

| 内容 | 为什么 |
| :--- | :--- |
| 手机号 | **绝对不写**，本文件里也不留（此前的版本把号码抄进来了，已删）。公开 Bio 会被爬虫抓去做电销 / 诈骗号码库 |
| 现公司全名（华新水泥 IPM / 新晨科技） | 客户名与在职信息不写进公开主页，要讲留在面试里讲 |
| 「精通 / 资深 / 专家 / 架构师」 | 无法验证，面试第一句就被拿来打 |
| 「Hutool 核心贡献者」 | 只合并了 1 个 PR，说"核心"是撒谎 |
| 「累计 15 个 PR」 | 其中 8 个还在待审核，点开就露 |
| 「开源了 XX 平台」 | Hopeflow 未开源，写成开源等于自己给自己挖坑 |

**能吹的边界**：定位和规模可以往前站（"独立开发 6.8 万行 TS 平台"是事实，
"AI 应用工程师"是你投的岗位），身份和资历必须往后站。

## 顺手发现的两处不一致

1. **邮箱不一致**：主页 README 联系卡写的是 `2291415248@qq.com`（也和你 git config 的
   user.email 一致），简历写的是 `claire_channel@qq.com`。要统一，
   并且**建议用简历那个**——GitHub 提交邮箱只有匹配上账号才会算进贡献图。
2. **主页 README 的通篇定位**（"文档摄取与流式处理方向"）建议一起改，
   否则 Bio 改成 AI 方向、README 还是 Java 摄取方向，两边打架。

## 怎么改

Bio：GitHub → 右上头像 → **Settings** → **Public profile** → **Bio** → 粘贴 → **Update profile**。
