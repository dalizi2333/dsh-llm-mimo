// SPDX-License-Identifier: CC-BY-4.0
<!-- Copyright (c) 2026 MiMo CodeX / dalizi233 -->

# 决策记录（每项含被否决方案）

| # | 决策 | 理由 | 被否决方案 |
| --- | --- | --- | --- |
| D1 | **主路由默认面 = OpenAI Chat Completions**（2026-09-29 owner 拍板；v0 时曾拍 anthropic） | 模态矩阵实锤：chat/responses 比 anthropic 多 audio+video 两模态且 PDF 400 明拒（明拒哲学契合门禁——不勾就拦，勾了就真发）；anthropic 面 audio/video/PDF 全静默丢=勾选即假声明。当年选 anthropic 的三个理由已逐一平账（HANDOFF 〇-附2）：cache_control 优势空转（从没发过 cache_control，且缓存跨面共享）；llm-deepseek 是惯例非能力；thinking 签名 replay 是唯一独占（chat 面 reasoning 无签名不回传，多轮工具实测无碍） | 维持 anthropic——假勾选风险 + 少两模态；切 responses——未接入存根，且 chat 面验证更全 |
| D2 | **门禁语义（owner 原话级，照此实现勿改）**：门禁只做 llm-mimo 侧；**切换模型不拦，切换后首次发送拦**（全量历史自然覆盖）；**门禁信任勾选**（勾选=能力声明，anthropic 面勾 audio/video 是假声明自担风险） | 验收流程 owner 定稿并全绿（qwen 收 PDF→续话→切 mimo 首发拦→新会话不污染）；全量历史覆盖使发送门禁等价于历史门禁 | 切换时拦截（owner 验收流程明确不走这条）；宿主侧门禁（越权）；门禁探测服务端真实能力（无通道） |
| D3 | **PDF 做实**（owner 推翻成本论，2026-09-28）：投影层对 pdf 勾选模型保留结构块真发 | "不能假定为提取文本"——文本提取=替用户假设，用户要版式/扫描件时就是静默降级；E2E 绿（qwen+中性文件名 PDF 答出预置答案） | 句柄完胜论（原生 document 块 44 倍成本差作为系统默认）——成本论降级为"用户判断"，不再做系统默认 |
| D4 | **promptbook 注入主通道 = 装配层**（`systemPrompt.section` + `system-prompt/assemble` 瀑布），`llmMimo.registerPromptSource` = 兜底/强制层 | 装配产物 GUI 轨迹可见（owner 硬要求"换掉的提示词看得见"，〇-附4 冒烟实证）；装配层==线上的前提=模型源用 pending route | dispatch 层为主——GUI 不可见（轨迹面板显示的是装配期持久提示词，dispatch 改写只能行为判别）；旧 llm/stream 改写方案已死（options.system 冻结崩溃 / yield* 崩溃） |
| D5 | **一插件一仓**（2026-09-28 起）：插件创建即 `git init` 独立仓，README/AGENTS.md 随包 | 插件写炸=回退插件仓库+重新部署，不动实例仓库；实例仓库只管实例态（cordis.patch.yml、profile package.json、补丁应用态） | HDSL/data 大仓共享——实例间耦合、提交噪音（大仓维持为防炸快照） |
| D6 | **命名 `@mimo-codex/dsh-llm-mimo`**：scope `@mimo-codex`=owner npm org；`@local/` 只用于实例内不发布的草稿包；**内部标识（row id `llm-mimo`/settingsNs/`llmMimo` 服务/路由键）不随包名改名** | 包名/发布面与内部寻址解耦，改名零迁移；GitHub 匹配贡献者必须挂账号邮箱（dalizi2333） | `@local/` 延续到发布面（不合规）；包名带 mimo 后缀冗余 |
| D7 | **发布形态定稿（2026-09-28 实测）**：peerDeps=`@deepseek-ai/dsh*`+cordis（**运行时提供**，勿放 dependencies）；dependencies 仅第三方；`files` 含 cordis.patch.yml+patches/；link: 形态安装需仓库先 `pnpm install` 自带 node_modules | 安装器兼容门禁只校验 peerDependencies 对运行时版本；registry 版本≠运行时版本，放 deps 会装错 | 把 @deepseek-ai 包放 dependencies（registry 可得版本≠运行时版本，装错或装不上） |
| D8 | **CI 模式（2026-09-29 定，照 dsh-promptbook D13/D15/D16/D17 移植）**：第一道门=可安装性（`verify-install.mjs` 静态+模块级 → 干净临时 DSH_HOME 官方 `dsh plugin add` + `--dump-config` 断言 llm-mimo 条目）；**补丁 replay 门=对 npm pristine 包哈希校验后重放**（不动机上 runtime）；本地=远端同一份 `scripts/ci.mjs` + pre-push 钩子强制；paths-ignore 文档豁免 | 装载破坏在最便宜层拦截；补丁与宿主版本错配是本仓特有风险面（哈希门禁现成）；DRY 防两套判定漂移 | CI 里 headless 真发（需凭据）；CI 只跑单测（装不上白搭）；CI 动机上 runtime（副作用）；act 容器模拟（假） |
| D9 | **rc.2 迁移形态**：peerDeps **显式列举**追加 `0.2.0-rc.2`（`0.1.7-rc.2 \|\| 0.2.0-rc.1 \|\| 0.2.0-rc.2`），devDeps 对齐 rc.2；宿主补丁对 rc.2 真包做哈希实证后 replay；desktop 预打补丁工件/manifest 若 pristine 哈希不变则原样有效 | 兼容门禁语义按精确版本判；promptbook S2.5 勘察接触面零漂移但**执行仍以 rc.2 真包哈希复核**（不盲信二手结论） | 宽版本范围（`>=0.2.0-rc.1`）——门禁语义不明；只改 peerDeps 不验补丁（宿主错配会在用户机上才炸） |
| D10 | **视觉验收归 owner，推送门 = owner 验收后**：rc.2 实例里布局/功能由 owner 目验（执行会话无视觉能力）；push（GitHub）在验收通过后进行，pre-push 门在此之前保证本地全绿 | 焦点/悬停手感、渲染观感是自动化硬边界（历史多轮实证）；owner 明令"我验收了才准备推送" | 验收前 push（owner 明令）；盲签 GUI |
| D11 | **rc.1 实例（mimo-codex-020）删除时点 = owner 视觉验收通过后**；删前整目录 tar 备份 + 凭据 refs 迁移到 rc.2 实例 | rc.1 实例是当前唯一可跑回退点，rc.2 未经验证就删风险不对称；298MB 备份成本可忽略 | 装完即删（owner 原话允许，但回退点丢失——保守后移，owner 可随时提前） |
| D12 | **HDSL 注册安全序列 = 杀 HDSL 进程 → 手改 `config/instances.properties` → owner 重启**；id 必须等于 `instances/<id>` 目录名 | HDSL windowClosing 无条件 `saveInstances()` 把内存列表写回盘——运行中/关窗前手改必被覆盖（已踩实）；`launchProcess` 每次启动也 saveInstances | HDSL 运行中改文件（必被覆盖）；HDSL GUI 新建实例（脚手架/端口不可控且测试态混入） |
