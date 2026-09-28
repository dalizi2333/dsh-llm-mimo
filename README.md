# llm-mimo

MiMo-native LLM adapter plugin for **DSH**（DeepSeek Harness）——为 MiMo CodeX 打造的
模型原生适配器与自定义供应商引擎。接管 `mimo` 主路由，`customProviders` 动态挂载任意
OpenAI 兼容 / Anthropic Messages 端点（百炼、网关、MiMo chat 面等），带**模态硬门禁**与
**提示词源接口**。

## 能力

- **双协议面**：Anthropic Messages（thinking 块/签名 replay/cache_control）与
  OpenAI Chat Completions（SSE、reasoning_content、工具、平行调用）；Responses 面为
  预留存根。
- **自定义供应商引擎**：`customProviders` dict 配置即挂载（连接/密钥/目录按路由分线），
  GUI 模型卡片全交互编辑（密钥通道、目录编辑器、连通性探针、GET /models 发现）。
- **多模态真发**：image / audio / video / PDF 内联编码（形状按官方文档 + 裸探针实锤），
  视频抽帧参数（`videoFps`/`videoMediaResolution`）可配。
- **模态硬门禁**：目录勾选=能力声明，未勾的模态**不许进会话**（发送门禁）——静默丢失
  在发送前被明确拒绝取代。
- **llmMimo 提示词接口**：promptbook 等消费方按模型替换**实际使用的**系统提示词与
  工具描述（契约见 [AGENTS.md](AGENTS.md)）。

## 能力矩阵（裸探针实锤，2026-09-28）

| MiMo 面 | image | audio | video | PDF | 平行工具 |
|---|---|---|---|---|---|
| `/anthropic` | ✓ | ✗ 静默丢 | ✗ 静默丢 | ✗ 静默丢 | ✓ |
| `/v1` chat | ✓ | ✓ | ✓ | 400 明拒 | ✓ |
| `/v1` responses | ✓ | ✓ | ✓ | 400 明拒 | ✓ |

（第三方端点各异：百炼 qwen3.8-max 支持 image/video/PDF；勾选以实测为准。）

## 安装

DSH profile bundle（四件套）：包放入 `profiles/<name>/packages/llm-mimo`，
`package.json` 加 `"@mimo-codex/dsh-llm-mimo": "link:./packages/llm-mimo"` 依赖与
`dsh.profile.bundles` 条目（有序、放基础 bundle 之后），`node_modules/@local/` 建链接。
多模态真发需应用宿主补丁 `patches/dsh-llm-file-video-projection.patch`（dsh-llm 投影层
按模态勾选保留 file 块）。

## 配置

`cordis.patch.yml` 的 `llm-mimo` 行 config：`apiKeyEnv`/`baseURL`/`apiFormat`/
`modelsJson`（模型目录：id/name/contextWindow/maxTokens/inputModalities/videoFps/
videoMediaResolution）/`customProviders`（dict：displayName/apiKeyEnv/baseURL/
apiFormat/modelsJson）。详见 [AGENTS.md](AGENTS.md)。

## 文档

- [AGENTS.md](AGENTS.md) —— 暴露接口契约、配置面、门禁语义、开发与部署纪律
- [HANDOFF.md](HANDOFF.md) —— 开发交接与实验记录（探针基线、踩坑）
