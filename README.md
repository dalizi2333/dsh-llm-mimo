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

### 一、装插件（GUI，dsh 0.2.0-rc.1+）

桌面版：**插件 → 添加插件** → 粘贴本仓库本地路径（或 GitHub 地址 / npm 包名）→ 安装 →
立即启用 → 彻底重启。peerDependencies 已声明 `0.1.7-rc.2 || 0.2.0-rc.1 || 0.2.0-rc.2`，安装器兼容
门禁直接放行，无需任何命令行。

### 二、宿主补丁（多模态真发 + 设置页第三页签）

适配 **dsh 0.2.0-rc.1 / 0.2.0-rc.2**（npm 面两版宿主文件逐字节一致，补丁同一份）。补丁替换两个宿主文件（dsh-llm 投影层按模态勾选保留
image/audio/video/PDF file 块；设置页模型添加对话框增加「自定义模型 API (llm-mimo)」
页签）。脚本**只处理你所在的根目录**，绝不全局扫描；哈希校验版本，不符即拒绝，可反复
执行，卸载完全可逆。

**桌面版**（cd 到安装根，或其 `resources` 子目录）：

```powershell
cd "$env:LOCALAPPDATA\Programs\DeepSeek Harness"
irm https://raw.githubusercontent.com/dalizi2333/dsh-llm-mimo/main/patches/remote-patch.ps1 | iex
```

**HDSL / 任意运行时形态**（cd 到数据根、数据根下 `runtimes`、或任意含
`node_modules/@deepseek-ai/dsh-llm` 的目录）：

```bash
cd /d/某处/HDSL数据目录/runtimes
curl -fsSL https://raw.githubusercontent.com/dalizi2333/dsh-llm-mimo/main/patches/remote-patch.sh | bash -s -- install
```

卸载 / 状态：

```bash
curl -fsSL https://raw.githubusercontent.com/dalizi2333/dsh-llm-mimo/main/patches/remote-patch.sh | bash -s -- uninstall
curl -fsSL https://raw.githubusercontent.com/dalizi2333/dsh-llm-mimo/main/patches/remote-patch.sh | bash -s -- status
```

（PowerShell 卸载/状态：`$env:DSH_PATCH_MODE="uninstall"` 或 `"status"` 后再 `irm | iex`。
国内网络 raw 不通时，把两个域名的 `raw.githubusercontent.com/dalizi2333/dsh-llm-mimo/main`
换成 `cdn.jsdelivr.net/gh/dalizi2333/dsh-llm-mimo@main` 即可——推送后 jsDelivr 缓存有
分钟级延迟。）

离线场景可双击 `patches/install-desktop-host-patch.cmd`（桌面版专用，同一逻辑）。
注意：桌面版升级后宿主被覆盖，重跑一次装载即可；卸载 = 删 `resources\app` 并把
`app.asar.unpatched` 改名回 `app.asar`。

### 三、手动四件套（开发者，dsh 0.1.x / 自定义 profile）

包放入 `profiles/<name>/packages/llm-mimo`，`package.json` 加
`"@mimo-codex/dsh-llm-mimo": "link:./packages/llm-mimo"` 依赖与 `dsh.profile.bundles`
条目（有序、放基础 bundle 之后），`node_modules/` 建链接。宿主补丁可直接重放：

```bash
python patches/apply_host_patches.py <dsh运行时的node_modules目录>
```

## 配置

`cordis.patch.yml` 的 `llm-mimo` 行 config：`apiKeyEnv`/`baseURL`/`apiFormat`/
`modelsJson`（模型目录：id/name/contextWindow/maxTokens/inputModalities/videoFps/
videoMediaResolution）/`customProviders`（dict：displayName/apiKeyEnv/baseURL/
apiFormat/modelsJson）/`dispatchViewJson`（volatile 遥测：最近 dispatch 的实际
system 视图环形缓冲，轨迹面板注入消费，勿手写）。详见 [AGENTS.md](AGENTS.md)。

## 文档

- [AGENTS.md](AGENTS.md) —— 暴露接口契约、配置面、门禁语义、开发与部署纪律
- [log/llm-mimo/](log/llm-mimo/README.md) —— 开发计划归档（`handover.md` 交接入口、进度、决策、探针基线与踩坑）
- [log/llm-mimo/rp-efficiency-experiment-2026-10.md](log/llm-mimo/rp-efficiency-experiment-2026-10.md) —— 实验记录：RP 人设强化 deepseek-flash Agent 的效率效应（质量不变、token 1/4~1/11；含可复用人设模板与注入可达面大坑）

## 许可证

[MIT](LICENSE) © 2026 MiMo CodeX
