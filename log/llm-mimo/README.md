// SPDX-License-Identifier: CC-BY-4.0
<!-- Copyright (c) 2026 MiMo CodeX / dalizi233 -->

# dsh-llm-mimo —— MiMo 原生 DSH 插件：适配器、自定义供应商引擎、模态门禁、提示词接口

> **名字**：仓库 `dsh-llm-mimo`，npm 包 `@mimo-codex/dsh-llm-mimo`（decisions D6）。
> **简介（GitHub 一句话）**：MiMo 原生 LLM 适配器插件：接管 mimo 主路由 + customProviders 动态挂载任意 OpenAI 兼容/Anthropic Messages 端点，多模态（图/音频/视频/PDF）真发、模态硬门禁、按模型提示词接口。
> **本目录是本计划的唯一事实来源。** `progress.md` 记实时进度，`decisions.md` 记取舍理由（含被否决方案）。
> **接手方开工前必须先读 `handover.md`**，收工后必须回写 `progress.md`。
> **本仓将推送远程**（GitHub dalizi2333/dsh-llm-mimo）；已提交文档**不携带本机绝对路径**，本机路径统一在 `local-env.md`（git-ignore，不入库）。

## 0. 目录约定

```
dsh-llm-mimo/                  # 插件包本体 = 仓库根
├── package.json               # @mimo-codex/dsh-llm-mimo（peerDeps 显式列举运行时版本）
├── lib/index.js               # host 入口（适配器 + 引擎 + 门禁 + llmMimo 服务）
├── lib/client.js              # 浏览器模块（设置卡 + 创建页 + 交互语言）
├── cordis.patch.yml           # 自挂载条目（- insert:）
├── patches/                   # 宿主补丁 + 安装器（投影层 / 设置页签 / desktop 工件 / remote-patch）
├── README.md / AGENTS.md / LICENSE   # 公共说明 + 接口契约 + MIT
└── log/llm-mimo/              # 本计划唯一事实来源（本目录）
    ├── README.md              # 本文件（设计权威）
    ├── handover.md            # 接手入口
    ├── progress.md            # 进度日志
    ├── decisions.md           # 决策记录（含被否决方案）
    └── local-env.md           # 本机环境速查（git-ignore，不入库）
```

## 1. 一句话目标

为 DSH（DeepSeek Harness）提供 **MiMo 原生模型适配**：主路由 `mimo` + `customProviders` 动态引擎挂任意兼容端点；**模态勾选=硬门禁**（不勾的能力在发送前明确拒绝，消灭服务端静默丢弃）；勾选的模态**真发**（结构块直达 adapter，不做静默降级）；`llmMimo` 提示词接口供 promptbook 等消费方按模型改写系统提示词与工具描述。

## 2. 架构（四块功能 + 一个宿主依赖）

| 块 | 机制 | 关键约束 |
| --- | --- | --- |
| 双协议适配器 | `apiFormat`: `anthropic` \| `chat` \| `responses`（存根）；`MimoAdapter extends LlmAdapter`，`registerAdapter(routes)` 按路由分线 | chat 面 parseSse 参数化（requireEventType=false + [DONE] 哨兵）；thinking 透传；disjoint usage |
| 自定义供应商引擎 | `customProviders` dict（volatile）+ `loader/volatile-update` diff-后-`replace()` 动态挂载 | 真 dict 字段让宿主删除按钮的单条 set/unset 语义正确 |
| 模态硬门禁 | `llm/stream` 瀑布（global，只处理本包路由）+ `enforceModalities`；未勾即拒（明确中文错误） | 瀑布携带**投影前** messages；宿主 adapterStream 无条件投影 file 块——真发必须靠投影补丁放行 |
| llmMimo 提示词接口 | `listHostedModels()`（治理性退化）+ `registerPromptSource()`（resolveSystem/resolveToolDescription） | 只改文本不碰 name/parameters；resolve* 为 (provider,model) 确定性纯函数（前缀缓存）；promptbook 主通道在装配层，本接口=兜底/强制层 |
| 宿主投影补丁（**必需**） | `patches/dsh-llm-file-video-projection.patch`：adapterStream 的 file 投影按模态勾选放行 video/audio/pdf 结构块 | 无补丁则真发死代码（adapter 永远收不到 file 块）；`settings-models-add-custom-mimo-tab.patch` 为创建页宿主补丁 |

**能力矩阵（裸探针实锤，2026-09-28，预置答案材料）**：

| MiMo 面 | image | audio | video | PDF | 平行工具 |
|---|---|---|---|---|---|
| `/anthropic` | ✓ | ✗ 静默丢 | ✗ 静默丢 | ✗ 静默丢 | ✓ |
| `/v1` chat | ✓ | ✓ | ✓（+fps 收） | **400 明拒** | ✓ |
| `/v1` responses | ✓ | ✓ | ✓ | 400 明拒 | ✓ |

（第三方端点各异，勾选以实测为准。）主路由默认面已拍板切 chat（decisions D1）——audio/video 勾选从此诚实。

## 3. 探针与验证方法论（硬纪律，全部有翻车教训背书）

1. **支持性结论必须逐面下**：beep 探针只打 anthropic 面就全称化"MiMo 音频不支持"——被真语音探针推翻。判定材料用有内容的真语音/真文档（预置答案），beep/静音段会诱发幻觉假象。
2. **预置答案 + 换内容对照**：文件名泄漏会造成假通过（qwen"读到 31415"是蒙的 magic-31415.pdf 文件名）——声明"模型真读"必须换内容看答案跟不跟。
3. **强条件多形状试探后再说"不支持"**：静默丢弃与明拒分开记账（in 值恒定+答"没收到"=静默丢；400=明拒）。
4. **dispatch 改写验证不能看轨迹面板**（显示装配期持久提示词）——用行为判别（判别式系统提示词）；轨迹面板只验装配层产物。
5. **max_tokens ≥ 600**（reasoning 吃 token），DSH 链路是 stream:true，探针复现先对齐流式。
6. **测试注入走真文件通道**（本地 CORS 静态服务），别手抄 base64。

## 4. 部署形态

- **插件**：GUI 安装器（`file:`/registry/git=复制式；裸路径=link: 需仓库先自带 node_modules）→ `dsh.profile.bundles` 自动登记 → 彻底重启。
- **宿主补丁**：`remote-patch.ps1/sh` 一行装载（desktop/runtime 双形态、显式作用域、版本哈希门禁、可逆）或 `python patches/apply_host_patches.py <runtime node_modules>` 重放；桌面版升级后需重跑。
- **实例双副本纪律**：core-web 与 core-headless 的 `packages/llm-mimo` 独立副本，改完必须 cp；服务端（index.js）改动需重启实例，client.js 刷新页面即生效。

## 5. 当前任务阶梯（2026-09-29 派单，详见 progress.md T0 行）

- T1 ✅ 文档归档（本四件套，HANDOFF.md 退役）
- T2 CI + pre-push 门（照 dsh-promptbook 模板：verify-install + 可安装性 + 补丁 replay 对 pristine 包；本地=远端同脚本）
- T3 rc.2（0.2.0-rc.2）迁移：peerDeps/devDeps + 补丁 replay 哈希实证
- T4 HDSL rc.2 实例：runtimes/0.2.0-rc.2 安装（win32 回填）→ 注册（杀 HDSL→改 properties→owner 重启）→ 装补丁+插件 → rc.1 实例备份后等验收后删（decisions D11/D12）
- T5 主路由默认面切 chat：默认值/目录勾选 + 全量 agent loop 验收 + 多轮缓存实测
- **推送门：owner 在 rc.2 实例视觉验收通过后**（decisions D10）
