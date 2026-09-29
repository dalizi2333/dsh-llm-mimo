// SPDX-License-Identifier: CC-BY-4.0
<!-- Copyright (c) 2026 MiMo CodeX / dalizi233 -->

# 交接文档：dsh-llm-mimo（给接手的新会话）

> **本文件是接手入口。** 先读完本文件，再按指路读计划全文，然后从 §5 开工。
> 本文件不预设接手方已知任何背景。
> **当前状态：✅ 五任务阶梯全部交付并推送（T1–T5 见 progress.md；chat 面切换 + rc.2 迁移 + CI + HDSL rc.2 实例 mimo-codex-020rc2；owner 视觉验收通过）。0.2.0-rc.1 实例已退役（备份在 backups/）。**

## §0 一句话现状

`@mimo-codex/dsh-llm-mimo` 是 MiMo CodeX 的模型原生 DSH 插件（适配器 + 自定义供应商引擎 + 模态硬门禁 + llmMimo 提示词接口），功能已全部交付并实测；当前阶梯 = **主路由切 chat 面 + rc.2（0.2.0-rc.2）迁移 + CI + HDSL rc.2 实例落地**，全部完成后 owner 视觉验收、验收过才 push。

## §1 路径指路

**仓库内（相对路径）**：

| 项 | 值 |
| --- | --- |
| 计划全文（设计权威） | [`README.md`](README.md) |
| 实时进度 | [`progress.md`](progress.md)（吸收了旧 HANDOFF.md 全部阶段记录） |
| 决策记录 | [`decisions.md`](decisions.md)（含被否决方案） |
| 本机环境速查 | `local-env.md`（**git-ignore 不入库**） |
| 接口契约（给消费方） | 仓根 [`AGENTS.md`](../../AGENTS.md)（llmMimo 服务语义、配置面、门禁语义、纪律） |
| 发布面 | 仓根 [`README.md`](../../README.md)（能力矩阵 + 安装器用法） |

**关联仓**：`dsh-promptbook`（GitHub dalizi2333/dsh-promptbook）——llmMimo 接口的消费方，CI/文档模板的来源；其 `log/promptbook-plugin/progress.md` S2.5 行有 rc.1↔rc.2 勘察结论（接触面零漂移）。

## §2 必须携带的硬结论（踩过坑换来的，勿重蹈）

1. **模型源**：勿用 `agent.options`（创建快照，R5 一回合延迟）；~~`session.requestHeader()`~~ 首装配时恒 null（dispatch 期才写，promptbook 真机插桩证伪）；**正解 = `assembly.variables.model`**（installModelSelection 注入的 pending route）。
2. **宿主投影**：dsh-llm adapterStream 无条件把 file 块投影成文本句柄——adapter 永远收不到 file 块；真发=投影补丁按模态勾选放行（本仓 patches/），门禁=llm/stream 瀑布（投影前 messages）。
3. **能力逐面**：anthropic 面 audio/video/PDF 静默丢；chat 面 audio/video 真支持、PDF 400 明拒；探针材料必须带预置答案 + 换内容对照。
4. **部署生效条件**：服务端（index.js）改动需重启实例；client.js 刷新页面即生效；宿主补丁后重放即可（可逆）。
5. **HDSL 注册**：windowClosing 无条件 saveInstances 覆盖手改——安全序列=杀 HDSL→改 properties→owner 重启；id 必须等于实例目录名。
6. **跨系统 runtime**：HDSL/data 是 Win/Linux 共享 ntfs3——任何一侧重跑 npm install 后必须给对面 `npm pack`+tar 回填原生可选依赖；`.credentials.yaml` 必须 chmod 600（ntfs3 上有效）。
7. **提交身份**：`dalizi2333 <92371427+dalizi2333@users.noreply.github.com>`；git 推送走本机代理（repo-local .git/config 已固化）。
8. **推送门**：owner 视觉验收通过才 push；push 前本地 `npm run ci` 必须全绿（pre-push 钩子强制）。

## §3 红线（勿改勿越）

- 门禁语义 owner 原话级（decisions D2）：切换不拦发送拦；门禁信任勾选。
- resolve* 必须是 (provider,model) 确定性纯函数；只改文本不碰 tool name/parameters。
- owner 没给的规则不要臆测补齐（历史上两次因脑补编排被整体撤回）。
- 一插件一仓：插件写炸=回退插件仓+重部署，不动实例仓。

## §4 验证工具箱

- headless 真发：`DSH_HOME=<实例>/dsh-home <runtime>/.bin/dsh --profile core-headless --json "<task>"`（agent-default-model 在 profile patch 指定路由）。
- GUI 刮刀：`run_in_background` 起 `dsh --profile core-web --port <port> --no-open`（普通 &/nohup/setsid 会被收割）；token 每次 boot 换，看输出首行。
- 探针纪律、判别式设计、max_tokens 预算见 log README §3。

## §5 开工点

从 `progress.md` 顶部未完成行接手；任务阶梯与验收标准见 log README §5；本机路径、端口、凭据位置见 `local-env.md`。
