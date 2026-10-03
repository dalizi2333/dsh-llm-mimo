// SPDX-License-Identifier: CC-BY-4.0
<!-- Copyright (c) 2026 MiMo CodeX / dalizi233 -->

# 联合验收：dsh-promptbook × dsh-llm-mimo 注入链路（2026-10-04 凌晨）

> 双插件今晚正式更新前的发布验收（owner 命题）。范围 = promptbook 注入（文案供给方）
> × llm-mimo dispatch 记录（真相显示方）的完整链路，含 D-1 修复后的记录语义。
> 全部在 mimo-codex-020rc2 实例（运行 a10e49d 修复版）真机执行。

## 结果总表：五项全过 ✅

| # | 项 | 验证内容 | 结果 |
| --- | --- | --- | --- |
| A | **家族层命中** | MiMo 主路由（mimo-v2.6-flash）× `models/mimo.json` | ✅ 模型自报逐字命中 + 面板 `mimo-v2.6-flash · 已替换 · MiMo CodeX 文案全文`（17:42:22） |
| B | **模型层命中** | deepseek-lab 路由 × `models/deepseek.json` | ✅ 当晚 G/H 交替四拍已验（见 defect-d1-verification-report.md §〇-补），不重跑 |
| C | **无命中透传** | 撤走 `models/deepseek.json` → deepseek-flash | ✅ 面板 `deepseek-flash · 原始（无替换源） · "You are a helpful software engineer assistant."`——「无注册源也记录」保证在修复后完好；文件已恢复 |
| D | **工具循环折叠** | 2 步终端工具会话（2 次 dispatch 同系统） | ✅ 环中恰好 +1 条（17:45:27 已替换），cap=8 不膨胀——真实循环内折叠正常 |
| E | **版本对账** | 双插件部署一致性 | ✅ llm-mimo 仓 lib = core-web 副本 = core-headless 副本 = `9b9c6eb6`（a10e49d）；promptbook main `1c6a950` link 态（整晚改文案即时生效即 link 证明） |

## 当晚全链验证账本（本验收之前已完成的部分）

1. **D-1 缺陷**：登记（9cbe2f9）→ 修复（a10e49d，另一会话定时任务唤醒后顺手修）→
   单元夹具前后对照（pre-fix 复现孪生 / fix 折叠无回归）→ 真机端到端 → G/H 交替交叉
   验证四拍三方一致。报告：`defect-d1-verification-report.md`。
2. **RP 效率实验**（deepseek-lab M1+M2，21 正规格）：万机之神 v2 人设质量满格不变、
   token 1/3.7 与 1/11、速度不塌——记录：`rp-efficiency-experiment-2026-10.md`。

## 发布状态（截至本验收）

- **llm-mimo**：本地 main = `0.4.1` 候选（a10e49d D-1 修复 + 文档五连 + 版本 bump），
  `DSH_RUNTIME_BIN=<rc.2 bin> npm run ci` **全链 PASS**；**未推**，push 与 npm 发布归 owner。
- **promptbook**：main `1c6a950` 已是已发布态（Actions ✓），本验收无新增待发布内容；
  工作区仅实验产物 `models/deepseek.json`（万机之神 v2，D10 裁决不回灌主线）与运行时
  卡面镜像 `registry.json` 改动（D23 机制，非人工编辑）。

## 已知边界（不阻塞发布）

- 孪生路径（retry 再入）的确定性端到端复现未做——单元夹具 C1 已覆盖其语义；
  真机若再现「原始」徽章载替换文，按 defect-d1-handover.md §4 重开。
- 标题生成调用的记录时有时无（本轮 C 出现、重启后首轮未出现）——与 D-1 无关，
  未查因，留观。
