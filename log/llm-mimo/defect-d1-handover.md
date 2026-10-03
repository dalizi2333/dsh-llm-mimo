// SPDX-License-Identifier: CC-BY-4.0
<!-- Copyright (c) 2026 MiMo CodeX / dalizi233 -->

# 交接文档：llm-mimo 缺陷 D-1 研究/验证（给接手的新会话）

> **本文件是接手入口，自包含。** 不预设接手方读过任何会话记忆或实验记录。
> 接手方画像：GLM-5.3（**无视觉能力**）——本文所有验证方法均按**零视觉**设计，
> 断言全部落在 JSON/字符串比较上，不需要看任何 UI。

## 0. 一句话任务

验证未发布的 D-1 修复 **a10e49d**（已提交本地、未推），定位「promptView 一次 dispatch
被调两次」的**真实调用点**，判定修复应停在症状级（现行）还是升级到根因级，并交付
**无头可复跑的验证脚本与 PASS/FAIL 结论**（落盘本目录 `defect-d1-verification-report.md`）。

## 1. 环境速查

- **本仓**：`/mnt/Data/Program Files (x86)/MiMo CodeX/dsh-llm-mimo`（路径含空格与括号，务必加引号）。
  现状：`a10e49d fix(d-1)` 已提交在 `9cbe2f9`（缺陷登记 docs）之上，**未推**。
  提交身份已配（dalizi2333 noreply）。**纪律：不 push（owner 手动）；改码后跑 `npm run ci`。**
- **实例**：mimo-codex-020rc2（dsh 0.2.0-rc.2，core-web，port 3096，token 在启动输出首行）。
  注意：实例里的 llm-mimo 是**副本**（`dsh-home/profiles/core-web/packages/llm-mimo/`），
  **不是 link**——验证仓内修复时须把 `lib/index.js` 同步过去并重启实例（owner 重启序列：
  杀 HDSL → 改 → owner 重启；或临时用 `dsh plugin add` 的 link 形态另起 3097 隔离实例）。
- **一个已配好的注入场景**（复现用）：实例 Models 页有 llm-mimo customProvider
  `deepseek-lab`（api.deepseek.com，chat 面，凭据已存），模型 `deepseek-flash`；
  `dsh-promptbook` 已 link 进实例且 `models/mimo.json` 有 MiMo 家族文案——
  deepseek-flash 在 deepseek-lab 路由下默认**无命中**（G0 形态），MiMo 模型有命中（替换形态）。
  两种形态对判别实验都有用（见 §4）。

## 2. 缺陷档案（D-1，证据来自 deepseek-lab 实验 2026-10-03 深夜）

- **现象**：轨迹面板「实际请求提示词」块（v0.4.0 注入）中，**同一时刻出现两条记录**，
  一条 `tampered=true`（已替换·promptbook）、一条 `tampered=false`（原始·无替换源），
  **两条 system 文本相同（都是替换后的文本）**。即「原始」徽章载的是篡改后内容——
  块的存在意义（让原始/篡改都可见）被破坏。
- **实测样本**（M1 实验，同一次探针 dispatch）：`15:48:00` 两条孪生（已替换+原始，文本同为
  万机之神 persona）；`15:32:59` 两条（G0 无替换形态，双原始但文本仍并存活）。
  完整证据链：`/mnt/Data/Program Files (x86)/MiMo CodeX/dsh-deepseek-lab/log/deepseek-lab/`
  的 runs-2026-10-03.md §四.6 与 dsh-llm-mimo `9cbe2f9` 的 progress 缺陷行。
- **影响面**：纯轨迹审计语义；不影响请求本身。环形缓冲 `DISPATCH_VIEW_LIMIT = 8` 会把
  「已替换」孪生挤出、只留「原始」假证，加重误导。

## 3. 现行修复 a10e49d（审查对象）

- **内容**：`recordDispatchView` 的 top 去重键从 `model+tampered+system` 改为
  `model+system`——第二遍（no-op）记录被首条吞掉，徽章语义恢复。
- **根因假设（commit message 自述）**：promptView 一次 dispatch 内被调两次；第二遍输入
  已是替换后文本 → `resolveSystem` 返回不变（`next === combined`）→ `result === options`
  → 落为 `tampered=false` 且文本=替换后。
- **审查点（接手方必答）**：
  1. **去重是否吞掉合法事件**？现键只比 `records[0]`（相邻折叠）。工具循环内连续 dispatch
     同文本同 flag 本来就该折叠（v0.4.0 注释的设计意图）；但「相邻、同 model 同文本、
     真实不同 dispatch 且 flag 相反」的场景（理论上存在：A 会话替换产物 + 紧随的 B 会话
     无源同文）会被误折。评估实际可达性，给结论。
  2. **症状 vs 根因**：去重不阻止 promptView 双跑本身。双跑是否还有其它可观察副作用
     （性能可忽略；语义上「无注册源也记录」的保证是否被双跑破坏）？
  3. **测试缺口**：仓内没有 test/ 目录；verify-install.mjs 的 apply() 冒烟不覆盖本路径。

## 4. 根因判别实验（先做这个，再决定修复级位）

promptView 在本仓内**只有一个调用点**：`lib/index.js:793`（`request()` 入口，
`this.dependencies.promptView?.(options)`）。孪生记录意味着 `request()` 对同一逻辑 dispatch
被进入两次，且**第二次的 `options` 已含第一次的替换产物**（注意 promptView 不改入参——
它构造新对象返回；所以「第二次输入已被替换」只能是调用方把第一次的返回值喂了回来）。

**假设排名**：
- **H1 重试再入**：`@deepseek-ai/dsh-llm-retry` 在重试时把首次已变换的 options 回喂
  adapter.request。旁证：G0-1' 会话明确出现过「已重试模型请求（1/5）」，且 G0 形态
  （无替换）也产生了并存的 15:32:59 双原始记录。
- **H2 上游双应用**：dsh-llm 的系统提示词装配瀑布（`system-prompt/assemble`）先经
  promptbook 替换一次，llm-mimo 的 dispatch 兜底层（本仓 promptView）再跑一遍
  no-op——即 M0 时代笔记的「主通道=装配层，llmMimo dispatch=兜底/强制层」双通道结构。
  此假设解释「第二遍输入已替换」，但**解释不了 tampered=true 首条从何而来**
  （首条必须是本仓 promptView 亲自替换的），故排 H1 之后；除非存在两条都进过本仓
  promptView 的链路（chat 面 + responses 面各一？responses 未接入，可排除）。
- **H3 工具循环/多轮**：每步重新 dispatch 属正常多记录，文本应随 messages 变化——
  与「文本完全相同的孪生」不符，基本可排除。

**判别方法（零视觉）**：临时在 `recordDispatchView` 的 `records.unshift(head)` 前插一行
`console.error("[d1-probe]", head.time, head.tampered, head.model, JSON.stringify(head.system?.slice(0, 40)), new Error().stack?.split("\n").slice(1, 5).join(" | "))`，
同步副本到实例，跑一轮 deepseek-flash 会话（1+1 冒烟即可），读实例 stderr/journal。
两条记录的 stack 直接指出双跑是 retry 再入（栈里见 dsh-llm-retry）还是上游双应用
（栈里见 system-prompt/assemble 相关帧）。**做完记得还原插桩。**

## 5. 无头验证配方（GLM-5.3 主战场）

三个配方按性价比排序，**全部零视觉**（断言=JSON 字段与字符串比较）：

### 配方 A（主验证）：fake-ctx 单元夹具——直接单测 recordDispatchView 语义

照 `scripts/verify-install.mjs` 第 [4/5] 步的 apply() fake-ctx 冒烟模式，写
`/tmp/d1-verify.mjs`（**别提交进仓**，验证脚本属实验产物；若 owner 要留再说）：

```js
// 要点（伪码骨架，字段名以 lib/index.js 实际为准）：
// 1. 构造 fake ctx（照 verify-install.mjs 的 shapes：provide/get 注册面）+ 真实 config
//    （dispatchViewJson: "[]"，volatile 与否都能走 unwrapConfigValue 分支）
// 2. await mod.apply(ctx, config) 后，从 apply 闭包外拿不到 promptView —— 两个出路：
//    a. 经 ctx 拿注册的服务面/适配器，直接构造 options 调 adapter 的 request 前半
//       （或把 request 的 stream 依赖 mock 成一次性 yield 后 return）
//    b. 更简单：临时 export promptView/recordDispatchView 做子模块测试钩子
//       （若不愿改 lib 导出面，就在测试里 import 后用 apply 的副作用验证——见下）
// 3. 用例矩阵（断言全部 JSON 比较）：
//    ① 注册一个 resolveSystem 做「原文→替换文」的 fake source，
//      连续两次以 [原文, 替换文] 为输入调 promptView（模拟双跑），
//      期望 config.dispatchViewJson 恰好 1 条、tampered=true、text=替换文 ← a10e49d 的核心断言
//    ② 同上但 pre-fix 代码（checkout 9cbe2f9 的 lib）重跑，期望 2 条（复现 D-1）← 修复前后对照
//    ③ 无 source：两次原样输入 → 1 条 tampered=false
//    ④ 两个「真实不同」的 dispatch（文本不同）→ 2 条（确认去重没误吞）
//    ⑤ 相邻同文但 flag 相反且确属两个真实 dispatch 的构造用例 → 现行为 1 条，
//      在报告里如实记录为「已知折叠边界」（§3 审查点 1 的证据）
// 输出：每条用例打印 PASS/FAIL + 实际 JSON，结尾汇总行。
```

对 ② 的取 pre-fix 代码：`git -C <仓> worktree add /tmp/d1-prefix 9cbe2f9`（worktree，别动工作区）。

### 配方 B（判别实验，见 §4）：stderr 插桩

产出不是 PASS/FAIL 而是双调用点定位结论（retry 再入 or 上游双应用），是决定
修复级位的依据。做完还原插桩，结论写进报告。

### 配方 C（端到端，可选加菜）：RPC describe 抽取 dispatchViewJson

面向「将来回归测试想打真实例」的需求。要点：
- dispatchViewJson 是 llm-mimo 命名空间下的 volatile 配置；客户端面板用 typert RPC 的
  describe 读取。**已知坑（v0.4.0 调试实录）**：typert 客户端 RPC 返回包是 `{ok, value}`
——真身在 `.value.namespaces`；volatile 直写不广播，读前需节流后重新 describe。
- 具体用法抄本仓 `lib/client.js` 里现成的 settings 读写代码（搜 `describe`、
  `customProviders` 的读取段，约 2100-2135 行），把 GUI 动作换成脚本。
- 连接：`@deepseek-ai/dsh-client-connection`（runtime node_modules 里有），ws + token。
- 断言：发一条 deepseek-flash 冒烟消息 → describe → parse dispatchViewJson →
  断言「不存在 model+system 相同但 tampered 相反的记录对」+「每次 dispatch 恰好 1 条新增」。

## 6. 修复级位判定（研究完成后的产出之一）

- **L1 现行 a10e49d（症状级）**：若 §4 判别显示双跑来自上游 retry/瀑布（本仓不可修），
  L1 即正确级位，补配方 A 的用例进 verify-install 或新 test 文件即可收口。
- **L2 根因级**：若双跑发生在本仓可及的链路（如 request() 内部某分支二次进入），
  修调用点（例如幂等标记：promptView 结果回填 options 时打
  `options[Symbol.for("llm-mimo.viewed")]`，二次进入跳过记录），去重键保留为纵深。
- **L3 语义升级（可选，需 owner 判）**：记录改为一 dispatch 一条 + `tampered` 语义改为
  「最终文本是否与无源基线不同」——彻底消灭徽章歧义，但改动面大，默认不做。

## 7. 纪律与验收

- **不 push**（owner 手动）；改码跑 `npm run ci`（45 项 verify-install + 补丁 replay 门 +
  干净实例 plugin add 冒烟）；提交身份仓内已配。
- 若判定 L1 维持：可选补一个正式测试文件（`test/d1-dispatch-view.test.mjs`，node --test）
  把配方 A 固化进仓——是否入库由 owner 定，默认先留 /tmp。
- 若动 lib：bump 版本号（v0.4.1 候选）+ 同步 core-web/core-headless 两副本 + progress 行，
  **push 与发布都等 owner**。
- **验收标准（报告落盘 `defect-d1-verification-report.md`，新行在上）**：
  1. 配方 A 五用例在 a10e49d 与 9cbe2f9 上的对照结果（PASS/FAIL + JSON 证据）；
  2. 配方 B 的双调用点结论（H1/H2/H3 判定 + stack 摘录）；
  3. 修复级位判定（L1/L2/L3）与理由；若建议 L2，附 diff；
  4. §3 三个审查点逐一回答；
  5. 遗留与给 owner 的决策清单。
- 汇报纪律：如实汇报完成度；未验证的明确写未验证（本项目「声称已修、磁盘未改」是
  已知失分模式——**每条结论必须附核验命令 + 原始输出**）。
