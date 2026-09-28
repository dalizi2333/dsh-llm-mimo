# AGENTS.md — llm-mimo 暴露接口与工程纪律

给 AI 代理/消费方看的接口契约。修改本插件前先读本文 + HANDOFF.md 的实验结论。

## 一、llmMimo 服务（提示词源接口）

`ctx.provide("llmMimo", api)`，消费方 `inject: ["llmMimo"]` 后经 `ctx.llmMimo` 访问。

### `listHostedModels(): Array<{ provider, id, name, ... }>`
枚举本插件托管面（`mimo` 主路由 + 全部 `customProviders` 条目的模型目录）。
**消费方 GUI 的模型下拉必须只用这个源**——非托管模型不给配置入口，即治理性退化。

### `registerPromptSource(source): () => void`
注册提示词源，返回 disposer。`source` 形状：

```js
{
  // 整体替换系统提示词；返回 undefined = 该项不改
  resolveSystem({ provider, model, system }): string | undefined
  // 替换单个工具的描述；返回 undefined = 该项不改
  resolveToolDescription({ provider, model, toolName, description }): string | undefined
}
```

**语义约束（契约，勿违反）**：
1. llm-mimo 默认零行为变化——无注册源时直接透传。
2. 只改文本，**绝不碰 tool 的 `name`/`parameters`**（历史 tool_use 块以名为关联键）。
3. `resolve*` 必须是 `(provider, model)` 的**确定性纯函数**（逐字节稳定）——
   system/tools 位于请求前缀头部，抖动即缓存全量 miss；动态片段放尾部追加通道。
4. **作用域保证**：问询只发生在本插件 dispatch 内（适配器只挂 `mimo`+customProviders
   路由），域外模型结构性不可达。
5. 系统提示词双通道：loop 请求的提示词在 `messages` 头部 system 消息
   （`GenerateOptions.system` 未定义），一次性调用走 `options.system`；
   问询输入取合并文本，替换结果写回单一通道。

## 二、与装配层的关系（架构定位）

"按模型换提示词"的**主通道在装配层**（GUI 轨迹渲染装配产物，可见性免费）：

- `ctx.systemPrompt.section({ name, order, complete: true, text: (context) => ... })`——
  整体替换系统提示词；
- `ctx.on("system-prompt/assemble", async (assembly, context, next) => {
    assembly.tools = …改描述…; return next(); }, { global: true })`——改工具描述
  （装配瀑布返回值权威）。

llmMimo dispatch 接口是**兜底/强制层**（防绕过路径、装配层失灵时的最后一道）。
装配层按模型解析的模型源必须用 pending route（`model/selection` 后的值），勿用
`agent.options` 创建快照（R5 教训：会一回合延迟）。

## 三、配置面（`cordis.patch.yml` 的 llm-mimo 行 config）

| 字段 | 说明 |
|---|---|
| `apiKeyEnv` | 凭据引用名（credential-ref；缺省 `MIMO_NORMAL_API_KEY`） |
| `baseURL` / `apiFormat` | 主路由连接；`apiFormat`: `anthropic` \| `chat` \| `responses`（后者存根） |
| `modelsJson` | 模型目录 JSON 字符串，条目：`id/name/contextWindow/maxTokens/inputModalities/videoFps/videoMediaResolution` |
| `customProviders` | dict（volatile）：`displayName/apiKeyEnv/baseURL/apiFormat/baseURLsJson/modelsJson`，route 即路由键 |

`inputModalities` 词汇：`text | image | audio | video | pdf`。**勾选=能力声明**：
未勾的模态发送即拒（错误文案指明缺哪个、给两条出路）；anthropic 面勾 audio/video/pdf
是假声明（MiMo 服务端静默丢，见能力矩阵），勾选前先确认 `apiFormat`。

## 四、宿主要求

- **`patches/dsh-llm-file-video-projection.patch`（必需）**：dsh-llm 投影层按模态勾选
  保留 video/audio/pdf file 块（否则一律投影成文本句柄，真发死代码）。
- `patches/settings-models-add-custom-mimo-tab.patch`：设置弹窗第三页签（自定义模型
  API 创建页）宿主补丁。
- 干净回退点：两补丁均为独立 diff，重装 runtime 后重放即可。

## 五、工程纪律

- **仓库形式（2026-09-28 起）**：插件即独立 git 仓库（创建插件时 `git init` 空仓起步，
  README/AGENTS.md 随包）。**插件写炸 = 回退插件仓库 + 重新部署，不动实例仓库**；
  实例仓库只管实例态（cordis.patch.yml、profile package.json、runtime 补丁应用态）。
- **部署**：插件仓库（源）→ cp 到 `profiles/{core-web,core-headless}/packages/llm-mimo`
  双副本 → 重启实例生效（服务端 bundle 按 boot 加载；client.js 逐请求取盘可热载）。
  开发迭代可直接改 live 后回灌仓库，发布前保证 live == 仓库。
- **验证纪律**：dispatch 时改写**不能**看轨迹系统提示词面板（显示装配时持久提示词，
  不是线上改写）——用行为判别（判别式系统提示词：让模型自查工具前缀并按结果作答）。
  轨迹面板只验装配层产物。
