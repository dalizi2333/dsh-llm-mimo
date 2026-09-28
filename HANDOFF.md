# llm-mimo 交接文档（2026-09-28 更新，会话接力用）

> 下一会话先读本文 + 记忆 `dsh-hdsl-plugin-dev.md` 的各 Update 块。
> 分支 `feat/llm-mimo-exp`，tip **42f2f29**（工作区已同步、干净）。

---

## 〇、2026-09-28 上午：音频定论被语音探针推翻并已实装（42f2f29）；Responses API 实锤全能力

### ⚠️ 音频能力是"按面分裂"的（旧结论"MiMo 音频不支持"作废）
用真语音（8.5s TTS 自述，预置答案 "DeepSeek"，无文件名可泄漏）四端点×三形状
裸探（12 发全记录）：
- **/v1 chat 面（双宿主）与 /v1/responses：音频真听**——input_audio wav/mp3、
  audio_url data URL 全 200，in=77，答案全对（Responses 甚至转写出原文）。
- **/anthropic 面（双宿主）：静默丢**——同音频同问题答"没收到"，in=22。
- **教训（已入记忆）**：beep 探针只打了 anthropic 面就下了全称结论；
  "支持与否"结论必须逐面下，且用有内容的真语音而非合成 beep 做判定材料。
- **Responses API（api.xiaomimimo.com/v1/responses）实锤全能力**：文本 ✓、
  音频 ✓（in=77）、工具 ✓（function_call 出现）；chat 面工具也 ✓（tool_calls）。
  适配器 apiFormat "responses" 目前仍是"未接入"存根——要不要真接是个选项
  （它是 api 域上面最全的面）。

### 音频真发已实装（42f2f29，GUI 验收全绿）
- dsh-llm 投影补丁扩展：audio 勾选的模型保留音频 file 块结构（与 video 同款）；
  patch 文件已刷新（patches/dsh-llm-file-video-projection.patch，含 audio）。
- llm-mimo：serializeChat 音频 file 块 → input_audio（wav/mp3 由 mediaType 映射，
  其他容器显式拒绝不静默）；门禁 requiredModality 扩 audio（标签"音频"，与其他
  模态同语义——未勾即拒）；测试路由 `mimo-audio`（api.xiaomimimo.com/v1，
  apiFormat chat，MIMO_NORMAL_API_KEY，模型勾 text/image/audio）。
- GUI 端到端：speech.wav 挂 (chat) 路由 → 答对 "DeepSeek"（4s）；同会话切不勾
  audio 的 mimo → 发送被"未启用「音频」输入"拦。
- ⚠️ **anthropic 面勾 audio/video 是假能力声明**（服务端静默丢）——勾选前确认
  apiFormat；门禁信任勾选（owner 语义），假勾选=自担静默丢风险。

## 一、2026-09-28 深夜：原生视频真发（acc3a0e）与探针定论

### 探针定论（强条件试探完成，形状与证据见 /tmp/probe-av*.mjs、probe-pdf-study.mjs）
- **视频**：百炼 chat 面 `video_url` + data URL **真读**（video_tokens 计费、
  流式/非流式都 200、帧内容答对"蓝色"）——唯一有真发价值的模态，已实装。
- **音频**：（❌ 本条已被 2026-09-28 上午语音探针推翻，见上文〇：chat 面真听，
  本条只对 anthropic 面成立）MiMo anthropic 面三形状（input_audio/audio_url/
  audio source）全静默丢（input_tokens 恒 20、答案 1/4 漂移=幻觉）；百炼 400
  明拒（"incorrect modal `audio`…may not be supported by the model"）且 file
  通道明规则**只收 PDF**（"Input file must be a valid PDF"）。
- **PDF**：原生 document 块 vs 文本提取对照（3 页跨页聚合题）——正确率相同，
  **成本 6403 vs 144 tokens（44 倍）**，视觉管道的 vision 计费随页数线性涨
  ⇒ 句柄模式完胜，PDF 原生真发不做（"mimo 不支持 PDF"本身是伪命题：工具读
  旁路任何模型都能消费 PDF）。

### 实现（两件套）
1. **宿主补丁** `patches/dsh-llm-file-video-projection.patch`：dsh-llm
   `adapterStream` 的 file 投影加 skip 谓词——`inputModalities` 含 video 的模型
   **保留视频 file 块结构**直达 adapter，其余照旧投影句柄。官方路由目录无 video
   勾选 ⇒ 行为零变化。**RT 直改已生效，patch 文件是升级重放凭据**。
2. **llm-mimo**：chat 面 serializeChat 把保留的 video file 块编码成
   `video_url` data URL；门禁 requiredModality 扩 video（未勾视频的模型遇视频
   历史 = 拒绝，与 pdf 同语义）；视频内联上限 20MB（超出显式拒绝）；百炼目录
   条目勾 video。anthropic 面既有 input_audio/video_url/document 编码保留
   （无探针支持的目标，属于预留）。

### 验收（3095 GUI 实测全绿）
- qwen3.8-max + mp4 上传 → 端到端真发，答对帧内容（"蓝色"，3s）；
- 同会话切 mimo-v2.6-flash → 首次发送被门禁拦（"未启用「视频」输入…"）。
- **坑**：往浏览器注入测试文件时手抄 base64 损坏 mp4 → 百炼 400"Invalid video
  file"——用本地 CORS 静态服务（/tmp/cors-serve.py）让页面 fetch 真实字节后才
  通过。测试注入一律走真文件通道，别手抄。
- **注意**：模型切换 RPC 会 `agentDefaultModel.saveSelection` 把所选模型写进
  profile patch 当全局默认（本轮 core-web patch 的 agent-default-model 因此变成
  ali-bailian/qwen3.8-max，测试态保留）。

## 一、2026-09-28 早：模态硬门禁（image/pdf）与宿主 file 投影发现

### owner 拍板的语义（照此实现，勿改）
- 门禁只做 llm-mimo 侧；**切换模型不拦，切换后的首次发送拦**（全量历史自然覆盖）。
- 验收流程（已全绿，3095 GUI 实测）：新会话发 PDF 给 qwen→接受→续话→接受→
  切 mimo→继续对话→**阻拦**（错误条明确）→新建会话（保持 mimo）→正常。

### 实现形态（读代码前先读这段）
1. **门禁挂 `llm/stream` 瀑布**（`ctx.on("llm/stream", …, { global: true })`，
   只处理本包路由）：瀑布携带的是**投影前**的原始 messages。宿主
   `dsh-llm adapterStream`（≈:2310）会**无条件**把 file 块投影成文本句柄
   （fileHandleText：文件名+字节+sha+只读路径），把无能力模型的 image 块投影成
   占位文本（projectImagesForTextModel）——**adapter 永远收不到 file 块**，
   所以 adapter 内的 enforceModalities 只是纵深（image 可达，file 不可达）。
2. `enforceModalities`：image 块需勾 image；`.pdf` file 块需勾 pdf
   （FileAttachmentRef 只有 name/bytes，判定走后缀）；错误为明确中文
   （模型名 + 缺哪个模态 + 两条出路），code INVALID_REQUEST。
3. 词汇：catalogModel union 与 parseModels filter 对齐为
   text/image/audio/video/pdf；client.js 加 PDF chip（文案 PDF/PDF）。
   qwen3.8-max 目录已勾 pdf（探针实锤，见下）。
4. serialize（anthropic 面）把 application/pdf file 块映射标准 document 块、
   serializeChat 编码 image_url 与 OpenAI 标准 file 块——**注意在当前宿主投影下
   这些 file 分支到不了（死代码），仅图片路径真实生效**；保留是给宿主投影层
   未来放行时用。

### 关键发现（改这层逻辑前必读）
- **宿主从不在请求里发文件字节**：file 块一律投影为句柄文本，"模型读文件"靠
  文件工具读只读路径。因此：MiMo 静默丢 document 块的探针结论在 DSH 会话链路
  **不触发**（DSH 根本不发 document 块）；此前 qwen"读到 31415"是**文件名泄漏**
  （magic-31415.pdf），不是真读；**旧交付的音视频 file 块编码在会话链路上从未
  生效过**（图片不受影响——image 块不被无条件投影）。
- **百炼真读 PDF 已裸探针实锤**（非 DSH 链路）：file block 标准 OpenAI 形状、
  内容对照对（27182→271/31415→314 其实是我的探针 PDF 行宽裁字）+ 逐字引用 +
  image_tokens 计费；image_url 真读（图需 >10px）。round1-3 探针脚本在 /tmp。
- 若要"勾了 pdf 的模型在 DSH 里真收到 PDF 内容"（多模态 document 块），需动宿主
  投影层（dsh-llm）按模态勾选放行——**单独立项，owner 未拍板**。

### 已知小瑕疵（下一会话可选）
- 模型选择菜单里自定义供应商的分组名显示为 "MiMo"（providerInfo 对自定义路由
  返回主路由 providerName，未用 displayName）。
- 音频/视频是否纳入门禁（勾选集已可存 audio/video）仍未定义。

## 一、历史（2026-09-27 调研结论，细节仍有效）


## 一、下一会话的任务（owner 已给规格，这是本文档的核心）

### 任务：把模型卡片里的模态勾选从"目录声明"升级为"硬门禁"

背景：MiMo 端点对 PDF 块是**静默丢弃**（anthropic 面）或明拒（chat 面 400），模型会反过来怪用户没传文件。
owner 的设计方向：**用模型目录里的模态勾选做实用化门禁**——不勾的能力就不许进会话，
把静默丢失消灭在发送前。原话级规格：

> 我是在想扩展并实用化这个能力，使得 mimo 系**不勾选 pdf 能力时就不允许把 pdf 加入会话，
> 也不允许 mimo 系模型参与一个有 pdf 历史的会话**。

### 验收测试（owner 原文，照此实现，勿自行增补规则）

> 可以取消勾选 flash 的**图片**能力，用 pro/flash 对话并在会话里附一个图片：
> 1. 期望 **pro 成功发出但 flash 被拒绝**；
> 2. 然后尝试将 pro 的会话使用的模型切换到 flash，
>    期望**由于会话历史有图片而拒绝切换模型**。

即两个门禁点：
- **发送门禁**：附件进会话/消息发出时，当前模型没勾该模态 → 拒绝（明确报错，不许静默丢）。
- **切换门禁**：模型切换时，目标模型没勾的模态若已出现在会话历史 → 拒绝切换。

注意规格里的语义：
- 图片能力已有勾选（`inputModalities: ["text","image",...]`），直接可测上面的验收。
- PDF 能力目前**不存在于勾选集**（MODALITIES = text/image/audio/video），需要把"PDF/文档"能力
  加进勾选与目录模型字段，再套同一套门禁。⚠️ 没给的规则勿补齐：owner 未定义的边界
  （如音频历史是否挡切换、subagent 历史算不算）先问再做。

### 实现切入点（已知事实，不是拍板）

- 勾选 UI：`lib/client.js` 的 `ModelCard` 模态 chips（`MODALITIES` 常量，文本锁定勾选）；
  数据在 `modelsJson[].inputModalities`，服务端 `index.js` 的 `modelInfo/catalogModelInfo` 透出
  `inputModalities`（dsh-llm `LlmModelInfo`/`LlmDiscoveredModel` 有该字段，`ModelModality` 枚举
  是否含 pdf/文档需要查 `dsh-llm/lib/types/types.d.ts`——不含就只做 llm-mimo 侧的目录扩展）。
- 发送门禁候选面：附件准入（dsh-attachment `admitEncodedFile`/上传面）、composer 发送前校验、
  agent-loop 发送侧。**模型真值以请求路由为准**（硬规则：`options.model` 是创建快照，
  要用 `agent/request` waterfall 追踪实际路由）。
- 切换门禁候选面：composer 模型按钮 = 会话内路由切换（记忆:"per-session route selection"）；
  需扫会话历史找该模态的块（session.v4 消息里 content blocks 的 type）。
- 参考错误风格：chat 面的 `400 "file type is not supported"` 是好样板——发送前明确拒绝。

---

## 二、当前状态快照

- **实例**：`HDSL/data/instances/mimo-codex-core`（core-web 3094 归 HDSL 管；调试刮刀用
  3095：`run_in_background` 起 `dsh --profile core-web --port 3095 --no-open`，
  ⚠️ 普通 &/nohup/setsid 都会被工具收割，只有 run_in_background 稳）。token 每次启动换，
  看输出日志首行。
- **测试态（故意保留给 owner 过目）**：模型页有「Acme 网关」自定义供应商行
  （route `acme-gateway`，真 URL `https://api.xiaomimimo.com/anthropic` + sk- 真 key 存
  `ACME_GATEWAY_API_KEY`），行内编辑器可开可存。core-headless 补丁已还原为干净
  （provider: mimo），测试用的 llm-mimo 配置行已撤。
- **双副本纪律**：core-web 与 core-headless 的 `packages/llm-mimo` 是独立副本，改完必须
  cp；worktree 镜像 `MiMo CodeX/llm-mimo-line/instances/...` 同理（改 live → cp 镜像 → 提交）。

### 本轮已交付（95e4d9f 及之前，全部已验证）

1. **自定义模型API（llm-mimo）创建页**：add 对话框第三页签（宿主补丁 +
   `settings.models.custom-api-card` 槽），布局=MiMo 卡语言+身份行（供应商名称无框/ID 有框，
   跟 Base URL 行两列对齐）。全套交互打磨（页签指示条量测落位、卡片不透明合成底、
   融合栈、旅行双框 useTravelFrames 共用、假目标聚焦框、格式面板 MiMo 同款定位+浅色、
   文案跟随格式"XXX格式"+示例地址）。
2. **llm-mimo 自定义供应商引擎**：`customProviders` dict 字段（z.dict，volatile），
   适配器按 `GenerateOptions.provider` 分线取连接/密钥，`loader/volatile-update` 事件
   diff-后-`replace()` 动态挂载路由与目录（抄 pi-ai 机制），创建即时生效；
   行内编辑器=创建页同款表单+MiMo 深配色（`llm-mimo-edit` 不套浅色覆盖）。
3. **端到端真证**：headless 经 `provider=acme-gateway` 真实回复 "OK"——适配器经自定义
   条目连接打穿真实端点，pi-ai 已退出该链路。

---

## 三、PDF 能力探针基线（2026-09-27，预置答案 31415，max_tokens 600）

| 协议面 | 块形状 | 结果 |
|---|---|---|
| anthropic | `document` + base64/`application/pdf` | **静默丢弃**（input_tokens=22，模型说没附件） |
| anthropic | `document` 无 media_type | 静默丢弃 |
| anthropic | `file` + source base64 | 静默丢弃 |
| chat | `file` + `file:{filename,file_data}` | **400 "file type is not supported"**（明拒） |
| chat | `input_file` | 400 |

结论：MiMo 服务端暂不支持 PDF 原生输入；Claude/GPT/千问系走标准 `document`/`file` 块
是支持的（ZCode 把 PDF 与图/视频平级列即源于此）。llm-mimo 侧的后续方向（owner 在考虑）：
serialize 把 `application/pdf` 映射为标准 `document` 块（对能力端点透传生效，MiMo 侧
等服务端补支持后零改动自动生效，本表即基线）；**绝不静默丢**——按门禁（本文件第一节）
在发送前拒绝。音频/视频块的既有编码在 `serialize`（`mediaTypeFromName` 扩展名映射）。

---

## 四、关键坑清单（本轮踩过的，勿重蹈）

1. **共享 UI 组件来自打包产物**（`/assets/index-*.js` + dsh-client-modules 注册表），
   `dsh-client-ui-primitives/lib/*.js` 磁盘补丁是死代码；各包 `client.js` 才按请求从盘上取。
   共享组件级修复 = 插件注入 style/JS。
2. **两个注入面**：行（provider-card 槽）的 face = `controller.inject()`（表单动作），
   创建页（custom-api-card 槽）另有 face——行内组件要用的函数必须**两处都放**，
   否则 props.xxx=undefined 被守卫静默吞掉（表现为"字段全空"）。
3. **宿主删除按钮 = unset 到 settingsPath**：JSON 字符串路径会删光整表；真 dict 字段
   （`["customProviders", route]`）单条 set/unset 才语义正确。
4. **key 分域**：`sk-`（MIMO_NORMAL_API_KEY）= 裸 `api.xiaomimimo.com`；
   `tp-`（MIMO_API_KEY）= `token-plan-cn.xiaomimimo.com`。跨域 401。
5. **改名残留**：dict 化重构后循环变量 `parsed` 未改 → ReferenceError 被 try 吞 →
   永远返回空表（症状=配置在、行不出）。重构后 grep 旧变量名。
6. **renderSlot 所有权**：slot key 必须在调用方 entry 的 `children` 里声明，否则抛
   SlotOwnershipError。宿主 add 对话框页签是写死的（无插件缝），第三页签靠宿主补丁
   （diff 存 `llm-mimo-line/patches/settings-models-add-custom-mimo-tab.patch`，
   runtime 目录 gitignored 且 git 不给穿符号链接 add）。
7. **悬停/聚焦自动化**：IAB 的 `cua.move` **能**触发 CSS :hover（旧记忆已过时）；
   合成 mouseover 触发不了 React 合成 hover；后台标签 focus 不派发 focusin（手动
   dispatchEvent）；状态机绿→红只认点击（mousedown+focusin 一对）。
8. **动画跟随**：padding 过渡只移内容不改盒体 → ResizeObserver 静默 → 框丢跟随；
   "位置移动不改尺寸"的跟随要用事件后限时逐帧重测（本轮那版被 owner 否了已撤回，
   该问题保持未修，勿重试同一修法）。
9. **特异性**：覆盖规则先数特异性（0,2,1 压不过 0,3,1 会静默失效）。
10. **memory 膨胀**：更新记忆用 `cat >>` 追加（Edit 锚点常因长文件截断失配）。

---

## 五、验证工具箱

- 浏览器：`browser-use:control-browser`，实例 URL 带 token；DOM 观察为主，
  hover/布局用 `cua.move`+截图（能触发 :hover）。
- headless 真发消息：`DSH_HOME=.../dsh-home dsh --profile core-headless --json "任务"`
  （模型在 `core-headless/cordis.patch.yml` 的 `agent-default-model: {provider, model}` 指定；
  想测自定义路由就把 provider 改成 route 名——记得测试后还原）。
- 探针纪律：预置答案 + max_tokens ≥ 600（reasoning 吃 token）；声明"不支持"前先强条件
  多形状试探；静默丢弃与明拒要分开记账。
- 提交风格：lowercase conventional；同步纪律 live→core-headless 副本→worktree 镜像→提交。

## 〇-附、2026-09-28 官方文档核对（音频/视频传入方式）

- **官方形状（mimo.mi.com 多模态文档，仅 chat 面有文档）**：音频
  `input_audio { data: URL | "data:{mime};base64,..." }`（无 format 键，data 二选一）
  限 MP3/WAV/FLAC/M4A/OGG、URL≤100MB/dataURL≤50MB、约 6.25 tok/秒；
  视频 `video_url { url: URL|dataURL, fps:[0.1,10]默认2, media_resolution:"default"|"max" }`
  （MP4/MOV/AVI/WMV、URL≤300MB/dataURL≤50MB），**视频音频轨也计 audio_tokens**。
  两文档均只写 chat 面（base_url api.xiaomimimo.com/v1），未提 anthropic 面。
- **anthropic 面 = 纯文本+图片面，形状无关的实锤**：文档原形（dataURL 无 format、
  video_url+fps+media_resolution、官方示例 URL）8 发全丢（in=16-18）；加上此前
  6 种音频变体、3 种视频变体，**任何形状都丢**。llm-mimo serialize(anthropic) 的
  input_audio/video_url/document 编码=服务端补支持前的占位（MiMo 侧静默丢，
  勾选即假声明）。
- **ZCode 发视频给 mimo-v2.6-pro 的真相=客户端抽帧走 image 块**：①anthropic 面
  全形状丢 video；②收到的是带时间戳的抽帧图；③视频音频轨从未上行（"我是DeepSeek"
  是我从帧内可见文本读的，音频是自己 ffmpeg 提的）；④ZCode 打包产物无
  video_url/type:video 字符串。
- 待办选项：serializeChat 音频改官方 dataURL 形以放行 m4a/flac/ogg 容器
  （现 {data:raw,format} 形只映射 wav/mp3，已 E2E 验证可用）；video_url 加
  fps/media_resolution 可调参数进目录。

## 〇-附2、2026-09-28 下午：PDF 做实 + 官方形对齐 + 面翻案审查（ea03518）

- **owner 裁定（推翻"PDF 句柄完胜"的成本论）**：文本提取是替用户假设；用户要
  版式/扫描件时就是静默降级。**PDF 做实**=投影层对 pdf 勾选模型保留结构块
  （dsh-llm patch 扩 isPdfFileRef），serialize 侧 document/file 编码早已就绪。
  E2E 绿：qwen + doc1.pdf（答案不在文件名）答出 31415=真读内容。成本论只降级
  为"用户判断"，不再是系统默认。
- **官方形对齐（ea03518）**：chat 面音频改 input_audio{data:URL|dataURL} 无
  format 键（chat 面实测可用），容器放行 mp3/wav/flac/m4a/ogg；modelsJson 新增
  可选 `videoFps`[0.1,10] 与 `videoMediaResolution`("default"|"max")，设置了才
  发进 video_url 块（bailian 无 fps 已验证、MiMo +fps 也验证，两端都不回归）。
- **模态矩阵（裸探针 2026-09-28，全部带预置答案）**：
  | MiMo 面 | image | audio | video | PDF | 平行工具 |
  |---|---|---|---|---|---|
  | anthropic | ✓ | ✗静默丢 | ✗静默丢 | ✗静默丢 | ✓ |
  | /v1 chat | ✓ | ✓ | ✓(+fps 收) | **400 明拒** | ✓ |
  | /v1/responses | ✓ | ✓ | ✓ | 400 明拒 | ✓ |
  Responses 还活着 text+tools（早前探针）。⇒ **chat/responses 比 anthropic 多
  audio+video 两模态，PDF 是明拒不静默——面翻案证据成立**。
- **"默认 anthropic"的来历**（记忆考古）：v0 拍板时（2026-09-25 前后）anthropic
  面是探针实锤的"MiMo-native Messages"身份面——thinking 块带签名（DSH replay
  校验用）、cache_control 显式可控（93% 命中）、平行工具已验；当时 chat 线路
  端到端从未真证（后来才发现 parseSse 都是坏的）。现在天平反转：chat 面补验了
  平行工具/结果反馈（tool intuition 轮早有）、多出 audio/video、PDF 明拒。
- **待 owner 拍板**：主 mimo 路由默认面切 chat（或 responses）？我的推荐=切
  chat（模态全 + 明拒哲学契合门禁），anthropic 留作兼容面；代价=放弃 thinking
  签名 replay（chat 面 reasoning 无签名、历史上不回传 reasoning，DSH 多轮工具
  实测无碍）+ 缓存命中行为待多轮实测对比。切换=主路由 apiFormat 改 "chat" +
  主路由全量 agent loop 验收。

## 〇-附3、2026-09-28 晚：llmMimo 提示词接口已交付并双通道实证（llm-mimo 侧收尾）

### 接口契约（promptbook 线消费方照此接）
- **服务名 `llmMimo`**（cordis，`ctx.provide("llmMimo", api)`）：
  - `listHostedModels()` → `[{provider, id, name, ...catalogModelInfo}]`——mimo 主路由 +
    customProviders 全部条目；promptbook GUI 的模型下拉**只准用这个源**（= 治理性退化：
    非 llm-mimo 托管模型根本没有配置入口）。
  - `registerPromptSource(source)` → disposer；source 形状：
    - `resolveSystem({provider, model, system}) → string | undefined`（整体替换系统提示词）
    - `resolveToolDescription({provider, model, toolName, description}) → string | undefined`
    - `undefined` = 该项不改；llm-mimo 默认零行为变化（无源时直接透传）。
- **语义约束**（写死在 index.js 注释里）：只改文本、绝不碰 tool 的 name/parameters
  （历史 tool_use 以名为键）；resolve* 必须是 (provider, model) 的**确定性纯函数**
  （system/tools 在请求前缀头部，抖动即缓存全量 miss）；动态片段走尾部追加通道。
- **系统提示词双通道**：loop 请求=messages 头部 system 消息（GenerateOptions.system
  未定义——dsh-llm types 定义）；一次性调用=options.system。promptView 问询输入取
  合并文本、替换结果写回唯一通道（头部 system 消话优先；多条头部 system 合并为一条）。
  serializeChat 补了 options.system → 首条 system 消息的映射（一次性调用 parity）。

### 验证方法论（重要更正 + 判别式设计）
- **⚠️ 轨迹→系统提示词面板显示的是 assembly 时的持久提示词，不是 dispatch 线上的改写**
  （7859px 原装全文、无改写痕迹，但模型行为证明线上已换）——dispatch 时改写的验证
  **不能看轨迹面板**，要用行为判别。
- 判别式 smoke（已删）：system 提示词令模型"检查工具描述是否带 [SMOKE-TOOL] 前缀，
  全带回'工具已标记'，否则回'工具未标记'"——一条回复同时判两通道。结果：
  **"工具已标记"**（thinking 逐一核对 24 个工具全带前缀）= system 替换 + 工具描述
  改写双通道全通。旁证：v1 smoke（"回复两个字：收到"）时代理拒执但标题模型照做
  （会话被自动命名为"收到"）。
- 无源透传回归绿（删除 smoke 后正常回复）。

### 插件挂载机制（本次踩坑记录）
- profile `cordis.patch.yml` 的裸 row 是 **override by id**——新插件的 row 必须走
  **bundle 的 `cordis.patch.yml` 用 `- insert:` 语法**（llm-mimo 自己就是这么挂的），
  且包要进 profile `package.json` 的 `dependencies`（link:）+ `dsh.profile.bundles`
  （有序，放依赖之后）+ `node_modules/@local/` 链接。四件套缺一不挂。
- `--json` 是 dsh-headless bundle 提供的旗标，core-web profile 没有（headless 判别
  要用 core-headless profile）。

### llm-mimo 侧待办清零后的遗留项（全部属他人/待拍板）
- promptbook 线按本契约实现消费方（含 GUI 只列 listHostedModels）。
- 主路由默认面翻案（chat vs anthropic）：证据齐、推荐切 chat，等 owner 拍板。
- R5 人设 bug 修复在 promptbook 线（解析与挂载），修复后可用本接口替掉脆弱通道。
- videoFps/videoMediaResolution 的 GUI 编辑钮（现在手改 modelsJson）。

## 〇-附4、2026-09-28 深夜：装配缝冒烟实证——GUI 可见的正道找到了（promptbook 线主通道）

owner 验收要求"被换掉的系统提示词和工具描述都能在 GUI 里看见"——**装配接口冒烟已实证达成**
（临时消费者 prompt-assembly-smoke，验完已删）：

- **系统提示词替换**：`ctx.systemPrompt.section({ name, order, complete: true, text: (context) => ... })`
  ——complete 段落装配后强制成为唯一系统提示词段。GUI 轨迹→系统提示词面板**原样显示替换后文本**
  （含按模型注入的 `model=qwen3.8-max-0902` 标记），判别回复"装配已标记"。
- **工具描述改写**：`ctx.on("system-prompt/assemble", async (assembly, context, next) => { 改
  assembly.tools[].description; return next(); }, { global: true })`——装配瀑布返回值权威。
  GUI 轨迹→工具 tab **逐条显示 [SMOKE-TOOL] 前缀改写**。
- **结论（架构修正）**：GUI 可见的正道=装配层（section + system-prompt/assemble），
  promptbook 线的"按模型换提示词"应做在这条接口上（工具描述也在此层，改写语义合法：
  llm-mimo 不声明 toolUpdate、每请求全量重声明）；**assembly==线上成立的前提是模型源用
  pending route**（R5 修复方向：model/selection 后的值 / session.requestHeader().config.model，
  勿用 agent.options 创建快照——冒烟里的 model 标记用的就是快照源，仅演示不背书）。
  llmMimo dispatch 接口（〇-附3）降级为兜底/强制层。
- **作用域**：装配层是全局注册表，"只对 llm-mimo 托管模型生效"用 `llmMimo.listHostedModels()`
  名单在 provider 里过滤（合作式，非结构性隔离——promptbook GUI 只列该名单即治理性退化）。
