window.__ModuleLoader__.load({
	id: "@mimo-codex/dsh-llm-mimo",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_dom = require("react-dom");
		//#region locales
		const en = {
			baseUrl: "Base URL",
			baseUrlHint: "{name} format",
			apiKey: "API key",
			apiKeyHint: "Leave empty to keep the stored key.",
			apiKeyConfigured: "API key configured",
			apiKeyMissing: "API key not configured",
			modelsTitle: "Models",
			modelsHint: "One card per model. The catalog feeds the model picker.",
			modelName: "Model name",
			modelNameDefault: "defaults to model ID",
			modelId: "Model ID",
			modelIdRequired: "Model ID (required)",
			contextWindow: "Context window",
			maxTokens: "Max output tokens",
			inputTypes: "Input types",
			modalityText: "Text",
			modalityImage: "Image",
			modalityAudio: "Audio",
			modalityVideo: "Video",
			modalityPdf: "PDF",
			addModel: "Add model",
			removeModel: "Remove model",
			expand: "Expand",
			collapse: "Collapse",
			cancel: "Cancel",
			save: "Save",
			saved: "Saved",
			invalid: "Every model needs an ID and at least one input type.",
			keySaved: "API key stored",
			keyFailed: "API key storage failed",
			kFormat: "Auto-formats as K/M",
			providerName: "Provider name",
			providerNameDefault: "defaults to the provider ID",
			providerIdRequired: "Provider ID (required)",
			providerIdHint: "Lowercase identifier that uniquely names the provider in requests and derives the credential name.",
			routeInvalid: "Provider ID: a letter first, then lowercase letters, digits and dashes.",
			routeTaken: "That provider ID is already taken.",
			baseUrlInvalid: "API address must be an http(s) URL.",
			apiFormat: "API format",
			create: "Create provider",
			creating: "Creating…",
			needsBaseUrl: "Custom model API needs an API address.",
			needsModels: "Custom model API needs at least one model."
		};
		const zh = {
			baseUrl: "Base URL",
			baseUrlHint: "{name}格式",
			apiKey: "API 密钥",
			apiKeyHint: "留空则保留已存储的密钥。",
			apiKeyConfigured: "API 密钥已配置",
			apiKeyMissing: "API 密钥未配置",
			modelsTitle: "模型目录",
			modelsHint: "每个模型一张卡片，目录直接供给模型选择器。",
			modelName: "模型名",
			modelNameDefault: "默认为模型ID",
			modelId: "模型ID",
			modelIdRequired: "模型ID（不可为空）",
			contextWindow: "上下文窗口",
			maxTokens: "最大输出token数",
			inputTypes: "输入类型",
			modalityText: "文本",
			modalityImage: "图片",
			modalityAudio: "音频",
			modalityVideo: "视频",
			modalityPdf: "PDF",
			addModel: "添加模型",
			removeModel: "删除模型",
			expand: "展开",
			collapse: "收起",
			cancel: "取消",
			save: "保存",
			saved: "已保存",
			invalid: "每个模型都需要模型ID和至少一种输入类型。",
			keySaved: "密钥已存储",
			keyFailed: "密钥存储失败",
			kFormat: "自动格式化为 K/M 简写",
			providerName: "供应商名称",
			providerNameDefault: "默认为供应商ID",
			providerIdRequired: "供应商ID（不可为空）",
			providerIdHint: "以小写字母开头的标识，在请求中唯一标识该供应商，并用于派生凭据名。",
			routeInvalid: "供应商ID 需以小写字母开头，仅含小写字母、数字和连字符。",
			routeTaken: "该供应商ID 已被占用。",
			baseUrlInvalid: "API 地址需为 http(s) 链接。",
			apiFormat: "API格式",
			create: "创建提供商",
			creating: "创建中…",
			needsBaseUrl: "自定义模型 API 需要填写 API 地址。",
			needsModels: "自定义模型 API 至少需要一个模型。"
		};
		//#endregion
		//#region helpers
		const NS = "settings.llm-mimo";
		const ENTRY_ID = "llm-mimo";
		const MODALITIES = [
			{ id: "text", label: "modalityText" },
			{ id: "image", label: "modalityImage" },
			{ id: "audio", label: "modalityAudio" },
			{ id: "video", label: "modalityVideo" },
			{ id: "pdf", label: "modalityPdf" }
		];
		const DEFAULT_CONTEXT_WINDOW = 1048576;
		const DEFAULT_MAX_TOKENS = 131072;
		const CARD_STYLES = `
/* ===== 同类样式集中区(圆钮/危险/成功/浮层配色) =====
   全部从主题语义令牌派生,日间/夜间自动正确;调这类观感只改本块。
   明暗反转的特例(如复选勾线色)用 body[data-ds-dark-theme] 覆盖。 */
:root {
	--llm-mimo-danger-fill: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
	--llm-mimo-danger-fill-hover: color-mix(in srgb, var(--dsw-alias-state-error-primary) 62%, transparent);
	--llm-mimo-danger-border: color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);
	--llm-mimo-danger-icon: var(--dsw-alias-state-error-primary);
	--llm-mimo-success-fill: color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent);
	--llm-mimo-success-fill-hover: color-mix(in srgb, var(--dsw-alias-state-success-primary) 62%, transparent);
	--llm-mimo-success-icon: var(--dsw-alias-state-success-primary);
	/* 小米橙聚焦框(试验过:夜间可以,日间需整体暖色调才不突兀——owner 决定滞后;
	   暖色日间主题就位后取消注释并把 .llm-mimo-frame 的边框色换成该变量即可) */
	/* --llm-mimo-accent-focus: #ff6900; */
	--llm-mimo-popover-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
}
body[data-ds-dark-theme] { --llm-mimo-popover-shadow: 0 10px 28px rgba(0, 0, 0, 0.4); }
.llm-mimo-fillcard { background: var(--dsw-alias-bg-module-platform); corner-shape: superellipse(1.43); border-radius: 20px; padding: 10px 12px; display: grid; gap: 8px; align-content: start; }
/* 自定义模型API(llm-mimo) 页:add 面板底色与 fillcard 同为 bg-module-platform,
   卡片分区会被吃掉——页面内 fillcard 用上面(页签条)同款的更亮填充区分;但纯半透明
   会在 -12px 融合重叠处叠色(接缝发亮),故以不透明平台底 + 内阴影半透明合成:
   观感同页签条,整体不透明,重叠同色无缝。 */
.llm-mimo-page .llm-mimo-fillcard { background: var(--dsw-alias-bg-module-platform); box-shadow: inset 0 0 0 999px var(--dsw-alias-interactive-bg-hover); }
.llm-mimo-page .llm-mimo-formatcard { background: var(--dsw-alias-bg-module-platform); box-shadow: inset 0 0 0 999px var(--dsw-alias-interactive-bg-hover), var(--llm-mimo-popover-shadow); }
/* 身份行(供应商名称/供应商ID):与 Base URL/API 密钥 行同列
   (标签列 92 + gap 10 + 输入列),悬停收拢同款,垂直恒定。 */
.llm-mimo-idrow { padding: 5px 0; cursor: text; transition: padding 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-fillcard .llm-mimo-idrow input:hover:not([type="checkbox"]) { background: transparent; }
/* 身份行是一个命中区:名字输入框没有独立悬浮判定(悬停它=悬停行,内收照常
   触发;反正点行任意处都聚焦名字输入框,内收位移不怕点偏)。仅供应商ID框
   豁免——它要精确点中编辑,不能在指脚下位移。 */
.llm-mimo-idrow:hover:not(:has(.llm-mimo-idbox:hover)) { padding: 5px 10px; }
.llm-mimo-underline { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; corner-shape: superellipse(1.43); background: transparent; outline: none; padding: 3px 8px; font: inherit; color: var(--dsw-alias-label-primary); }
.llm-mimo-underline:hover { border-color: var(--dsw-alias-label-secondary); }
/* 选填且建议核查的字段(上下文窗口/最大输出 token 数):仅下划线,仍可被旅行框选中 */
.llm-mimo-flat { border: none; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.llm-mimo-flat:hover { border-bottom-color: var(--dsw-alias-label-secondary); }
.llm-mimo-nameinput { border: 1px solid transparent; background: transparent; outline: none; padding: 2px 4px; font: inherit; color: var(--dsw-alias-label-primary); width: 100%; height: 28px; box-sizing: border-box; border-radius: 6px; }
.llm-mimo-underline::placeholder, .llm-mimo-nameinput::placeholder, .llm-mimo-idbox::placeholder { color: var(--dsw-alias-label-tertiary); }
.llm-mimo-fillcard input:hover:not([type="checkbox"]), .llm-mimo-mcard input:hover:not([type="checkbox"]) { background: var(--dsw-alias-interactive-bg-hover); }
.llm-mimo-idbox { border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; corner-shape: superellipse(1.43); background: transparent; outline: none; padding: 3px 8px; font: inherit; color: var(--dsw-alias-label-primary); width: 100%; height: 28px; box-sizing: border-box; }
.llm-mimo-idbox:hover { border-color: var(--dsw-alias-label-secondary); }
.llm-mimo-mgrid { display: grid; align-items: center; column-gap: 8px; }
.llm-mimo-mcard { border-radius: 8px; padding: 5px 8px; position: relative; z-index: 0; transition: padding 0.26s cubic-bezier(0.2, 0, 0, 1); }
/* 未悬停略微放宽(内容左/右各外扩 4px),悬停收拢回 5/8 适配填充框 */
.llm-mimo-addbody { border-radius: 8px; padding: 5px 4px; display: flex; align-items: center; gap: 8px; transition: padding 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-addrow:hover .llm-mimo-addbody { padding: 5px 8px; }
.llm-mimo-mcard.collapsed { cursor: pointer; padding: 5px 4px; }
.llm-mimo-mcard.collapsed:hover:not(:has(input:hover)) { padding: 5px 8px; }
.llm-mimo-mcard input, .llm-mimo-mcard label { cursor: auto; }
.llm-mimo-dimmed { opacity: 0.55; }
.llm-mimo-caret { color: var(--dsw-alias-label-tertiary); opacity: 0; transition: opacity 0.15s ease, transform 0.26s cubic-bezier(0.2, 0, 0, 1); font-size: 12px; text-align: center; }
.llm-mimo-mcard.collapsed:hover .llm-mimo-caret { opacity: 1; }
.llm-mimo-collapsebtn { border: none; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; border-radius: 100%; corner-shape: superellipse(1.43); width: 28px; height: 100%; min-height: 56px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; animation: llm-mimo-spin-in 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-trash { border: none; background: var(--llm-mimo-danger-fill); color: var(--llm-mimo-danger-icon); cursor: pointer; border-radius: 100%; corner-shape: superellipse(1.43); width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; flex: none; }
.llm-mimo-trash:hover { background: var(--llm-mimo-danger-fill-hover); }
.llm-mimo-row { display: flex; align-items: center; gap: 10px; }
/* Base URL 行:悬停(非输入框)时标签上滚成协议名,输入框左缘随标签加宽右移 */
.llm-mimo-rollwrap { display: inline-block; width: 92px; height: 20px; overflow: hidden; transition: width 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-rollstack { display: flex; flex-direction: column; transition: transform 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-rollline { display: block; height: 20px; line-height: 20px; white-space: nowrap; }
.llm-mimo-baserow:hover:not(:has(input:hover)) .llm-mimo-rollstack { transform: translateY(-20px); }
.llm-mimo-baserow:hover:not(:has(input:hover)) .llm-mimo-rollwrap { width: 124px; }
.llm-mimo-baserow { padding: 5px 0; transition: padding 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-baserow:hover:not(:has(input:hover)) { padding: 5px 10px; }
.llm-mimo-baserow { cursor: pointer; }
.llm-mimo-baserow input { cursor: text; }
@keyframes llm-mimo-pop-up { from { opacity: 0; transform: translateY(6px); } }
.llm-mimo-formatcard { position: fixed; z-index: 1000; background: var(--dsw-alias-bg-module-platform); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; corner-shape: superellipse(1.43); box-shadow: var(--llm-mimo-popover-shadow); padding: 6px; animation: llm-mimo-pop-down 0.2s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-formatcard.closing { pointer-events: none; }
.llm-mimo-formatcard.closing:not(.fly) { animation: llm-mimo-format-close 0.2s cubic-bezier(0.2, 0, 0, 1) forwards; }
.llm-mimo-formatcard.fly { opacity: 0; transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease; }
@keyframes llm-mimo-format-close { to { opacity: 0; transform: translateY(-6px); } }
@keyframes llm-mimo-pop-down { from { opacity: 0; transform: translateY(-6px); } }
.llm-mimo-formathead { font-size: 12px; color: var(--dsw-alias-label-tertiary); padding: 2px 10px 4px; animation: llm-mimo-pop-up 0.2s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-formatline { display: flex; align-items: center; gap: 10px; padding: 5px 8px; cursor: pointer; border-radius: 8px; transition: padding 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-formatline:hover:not(:has(input:hover)) { padding: 5px 14px; background: var(--dsw-alias-interactive-bg-hover); }
.llm-mimo-formatline.active { background: var(--dsw-alias-interactive-bg-hover); }
.llm-mimo-formatname { font-size: 13px; color: var(--dsw-alias-label-primary); width: 190px; flex: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.llm-mimo-formatinput { flex: 1; min-width: 160px; }
.llm-mimo-keyzone { cursor: pointer; border-radius: 8px; }
.llm-mimo-connect { width: 0; opacity: 0; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary); flex: none; transition: width 0.26s cubic-bezier(0.2, 0, 0, 1), opacity 0.15s ease; }
.llm-mimo-keyzone:hover:not(:has(input:hover)) .llm-mimo-connect { width: 24px; opacity: 1; }
.llm-mimo-keyzone .llm-mimo-row { padding: 5px 0; transition: padding 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-keyzone:hover:not(:has(input:hover)) .llm-mimo-row { padding: 5px 10px; }
.llm-mimo-connect.probing { animation: llm-mimo-probe-spin 0.9s linear infinite; color: var(--dsw-alias-label-primary); }
@keyframes llm-mimo-probe-spin { to { transform: rotate(360deg); } }
.llm-mimo-dot.probing { animation: llm-mimo-dot-pulse 0.9s ease-in-out infinite; }
@keyframes llm-mimo-dot-pulse { 50% { opacity: 0.35; } }
.llm-mimo-probeclip { display: grid; grid-template-rows: 1fr; animation: llm-mimo-probe-expand 0.26s cubic-bezier(0.2, 0, 0, 1); }
@keyframes llm-mimo-probe-expand { from { grid-template-rows: 0fr; } }
.llm-mimo-probeerror { min-height: 0; overflow: hidden; border: 1px solid var(--llm-mimo-danger-border); border-radius: 8px; corner-shape: superellipse(1.43); margin: 8px 0 0; padding: 8px 10px; color: var(--dsw-alias-label-error); font-size: 12px; white-space: pre-wrap; word-break: break-all; user-select: text; cursor: text; transition: margin 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-keyzone:hover:not(:has(input:hover)) .llm-mimo-probeerror { margin-left: 10px; margin-right: 10px; }
.llm-mimo-hint { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.llm-mimo-label { font-size: 13px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.llm-mimo-chip { display: inline-flex; align-items: center; gap: 4px; margin-right: 12px; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.llm-mimo-chip input[type="checkbox"] { appearance: none; width: 16px; height: 16px; margin: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: 100%; corner-shape: superellipse(1.43); background: transparent; cursor: pointer; flex: none; }
.llm-mimo-chip input[type="checkbox"]:checked { border-color: transparent; background: var(--dsw-alias-button-primary-fill) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.6 6.3 4.9 8.6 9.4 3.5' fill='none' stroke='%23ffffff' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/12px no-repeat; }
body[data-ds-dark-theme] .llm-mimo-chip input[type="checkbox"]:checked { background: var(--dsw-alias-button-primary-fill) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.6 6.3 4.9 8.6 9.4 3.5' fill='none' stroke='%2324293d' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/12px no-repeat; }
.llm-mimo-chip input:disabled { opacity: 0.55; cursor: default; }
.llm-mimo-addstrip { width: 408px; height: 28px; border: 1px solid transparent; corner-shape: superellipse(1.43); border-radius: 8px; background: transparent; outline: none; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
.llm-mimo-addrow { cursor: pointer; }
.llm-mimo-addrow:hover .llm-mimo-addstrip { opacity: 1; background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l2); }
.llm-mimo-addrow:hover .llm-mimo-plusbtn { background: var(--llm-mimo-success-fill-hover); }
.llm-mimo-hoverbox { position: absolute; z-index: 2; pointer-events: none; box-sizing: border-box; background: var(--dsw-alias-interactive-bg-hover); corner-shape: superellipse(1.43); opacity: 0; transition: top 0.26s cubic-bezier(0.2, 0, 0, 1), left 0.26s cubic-bezier(0.2, 0, 0, 1), width 0.26s cubic-bezier(0.2, 0, 0, 1), height 0.26s cubic-bezier(0.2, 0, 0, 1), border-radius 0.26s cubic-bezier(0.2, 0, 0, 1), opacity 0.15s ease; }
.llm-mimo-hoverbox.on { opacity: 1; }
.llm-mimo-hoverbox.instant { transition: opacity 0.15s ease; }
/* 旅行框配色。调试配色(留档勿删):红 #ef4444 / 绿 rgba(52,168,83,0.55) /
   蓝 #3b82f6,蓝态待命半透明 dim 0.45。正式配色 = 输入框聚焦高亮色
   var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)),全态同色;
   绿框永远全透明不可见,蓝框待命全透明(加号行悬浮触发显形)。 */
.llm-mimo-frame { position: absolute; z-index: 3; pointer-events: none; box-sizing: border-box; border: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); corner-shape: superellipse(1.43); opacity: 0; transition: top 0.26s cubic-bezier(0.2, 0, 0, 1), left 0.26s cubic-bezier(0.2, 0, 0, 1), width 0.26s cubic-bezier(0.2, 0, 0, 1), height 0.26s cubic-bezier(0.2, 0, 0, 1), border-radius 0.26s cubic-bezier(0.2, 0, 0, 1), opacity 0.15s ease; }
.llm-mimo-frame.on { opacity: 1; }
.llm-mimo-frame.on.dim { opacity: 0; }
.llm-mimo-frame.instant { transition: opacity 0.15s ease; }
@keyframes llm-mimo-name-in { from { opacity: 0; transform: translateX(-14px); } }
.llm-mimo-mcard.fresh .llm-mimo-nameinput { animation: llm-mimo-name-in 0.3s cubic-bezier(0.2, 0, 0, 1); }
@keyframes llm-mimo-plus-appear { from { opacity: 0; transform: translateY(8px); } }
.llm-mimo-plusbtn.appear { animation: llm-mimo-plus-appear 0.3s ease; }
.llm-mimo-birthframe { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 408px; height: 28px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; corner-shape: superellipse(1.43); display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-tertiary); font-size: 16px; pointer-events: none; animation: llm-mimo-birth-frame 0.35s ease forwards; }
.llm-mimo-birthplus { animation: llm-mimo-birth-plus 0.35s ease forwards; }
@keyframes llm-mimo-birth-frame { to { opacity: 0; } }
@keyframes llm-mimo-birth-plus { to { opacity: 0; transform: translateY(10px); } }
@keyframes llm-mimo-trash-birth { from { background: var(--llm-mimo-success-fill); } }
.llm-mimo-mcard.fresh .llm-mimo-trash { animation: llm-mimo-trash-birth 0.35s ease; }
.llm-mimo-trash-birth { position: relative; display: grid; }
.llm-mimo-trash-glyph { grid-area: 1 / 1; display: flex; align-items: center; justify-content: center; }
.llm-mimo-trash-glyph.plus { color: var(--llm-mimo-success-icon); font-size: 15px; animation: llm-mimo-glyph-out 0.35s ease forwards; }
.llm-mimo-trash-glyph.icon { animation: llm-mimo-glyph-in 0.35s ease; }
@keyframes llm-mimo-glyph-out { to { opacity: 0; transform: translateY(10px); } }
@keyframes llm-mimo-glyph-in { from { opacity: 0; transform: translateY(-10px); } }
.llm-mimo-addplus { color: var(--dsw-alias-label-tertiary); font-size: 16px; }
.llm-mimo-addstrip:hover .llm-mimo-addplus { color: var(--dsw-alias-label-primary); }
.llm-mimo-plusbtn { border: none; background: var(--llm-mimo-success-fill); color: var(--llm-mimo-success-icon); corner-shape: superellipse(1.43); border-radius: 100%; width: 28px; height: 28px; cursor: pointer; font-size: 19px; display: inline-flex; align-items: center; justify-content: center; flex: none; }
.llm-mimo-plusbtn:hover { background: var(--llm-mimo-success-fill-hover); }
.llm-mimo-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
.llm-mimo-ghost { background: transparent; border: 1px solid var(--dsw-alias-border-l2); border-radius: 16px; corner-shape: superellipse(1.43); padding: 5px 14px; cursor: pointer; font: inherit; color: var(--dsw-alias-label-primary); }
.llm-mimo-ghost:hover { background: var(--dsw-alias-interactive-bg-hover); }
.llm-mimo-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-inverted); corner-shape: superellipse(1.43); border: none; border-radius: 16px; padding: 5px 16px; cursor: pointer; font: inherit; }
.llm-mimo-primary:hover { background: var(--dsw-alias-button-primary-hover); }
.llm-mimo-primary:disabled { opacity: 0.5; cursor: default; }
.llm-mimo-drawer { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-drawer.open { grid-template-rows: 1fr; }
.llm-mimo-drawerclip { min-height: 0; overflow: hidden; }
.llm-mimo-drawerbody { display: grid; gap: 0px; padding: 10px 0 4px; position: relative; opacity: 0; transform: translateY(-6px); transition: opacity 0.18s ease, transform 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-drawer.open .llm-mimo-drawerbody { opacity: 1; transform: translateY(0); }
.llm-mimo-mbody { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-mbody.open { grid-template-rows: 1fr; animation: llm-mimo-mbody-in 0.26s cubic-bezier(0.2, 0, 0, 1); }
.llm-mimo-mbodyclip { min-height: 0; overflow: hidden; }
.llm-mimo-stackitem { transition: margin-top 0.26s cubic-bezier(0.2, 0, 0, 1), border-radius 0.26s cubic-bezier(0.2, 0, 0, 1); }
@keyframes llm-mimo-mbody-in { from { grid-template-rows: 0fr; } }
@keyframes llm-mimo-spin-in { from { opacity: 0; transform: rotate(180deg) scale(0.82); } }
@media (prefers-reduced-motion: reduce) { .llm-mimo-drawer, .llm-mimo-drawerbody, .llm-mimo-mbody, .llm-mimo-collapsebtn, .llm-mimo-mcard, .llm-mimo-stackitem, .llm-mimo-hoverbox, .llm-mimo-frame, .llm-mimo-connect, .llm-mimo-dot, .llm-mimo-probeclip, .llm-mimo-rollstack, .llm-mimo-rollwrap, .llm-mimo-formathead { animation: none; transition: none; } }
`;
		function formatTokens(value) {
			if (!Number.isSafeInteger(value) || value <= 0) return "";
			if (value >= 1048576) {
				const m = value / 1048576;
				return `${Number.isInteger(m) ? m : Math.round(m * 100) / 100}M`;
			}
			if (value >= 1024) {
				const k = value / 1024;
				return `${Number.isInteger(k) ? k : Math.round(k * 100) / 100}K`;
			}
			return String(value);
		}
		function parseTokens(text) {
			const match = /^\s*([\d.]+)\s*([KkMm])?\s*$/.exec(String(text ?? ""));
			if (!match) return void 0;
			const base = Number(match[1]);
			if (!Number.isFinite(base) || base <= 0) return void 0;
			const scale = match[2] === void 0 ? 1 : match[2].toUpperCase() === "M" ? 1048576 : 1024;
			const scaled = Math.round(base * scale);
			return Number.isSafeInteger(scaled) && scaled > 0 ? scaled : void 0;
		}
		function modelsFrom(text) {
			try {
				const parsed = JSON.parse(text ?? "[]");
				if (!Array.isArray(parsed)) return [];
				return parsed.map((entry) => ({
					id: String(entry?.id ?? ""),
					name: String(entry?.name ?? ""),
					contextWindow: Number.isSafeInteger(entry?.contextWindow) ? entry.contextWindow : void 0,
					maxTokens: Number.isSafeInteger(entry?.maxTokens) ? entry.maxTokens : void 0,
					inputModalities: Array.isArray(entry?.inputModalities) && entry.inputModalities.length > 0 ? entry.inputModalities.filter((m) => MODALITIES.some((m2) => m2.id === m)) : ["text"]
				}));
			} catch (_draftMayBeHalfWritten) {
				return [];
			}
		}
		function rowsValid(rows) {
			return rows.length > 0 && rows.every((row) => row.id.trim().length > 0 && row.inputModalities.length > 0);
		}
		// 自定义模型API(llm-mimo) 页:供应商 ID 规则与宿主自定义页一致
		// (小写字母开头,可作凭据名词干);派生凭据名 = <ROUTE 大写>_API_KEY。
		const ROUTE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
		function isHttpUrl(value) {
			try {
				const protocol = new URL(value).protocol;
				return protocol === "http:" || protocol === "https:";
			} catch {
				return false;
			}
		}
		function deriveKeyRef(provider) {
			return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
		}
		// 三种 API 格式 = pi-ai 的 wire 协议词表(与旧自定义页的 API 协议同集合)。
				/** Base URL 占位文案跟随所选 API 格式(模板 {name} = 格式名)。 */
		function baseUrlHintFor(template, name) {
			return template.replace("{name}", name);
		}
		/** 格式面板未填时的示例地址:Anthropic 面 /anthropic,OpenAI 两面 /v1。 */
		function formatExampleFor(id) {
			return String(id).startsWith("anthropic") ? "https://api.example.com/anthropic" : "https://api.example.com/v1";
		}
const PAGE_FORMATS = [
			{ id: "anthropic", name: "Anthropic Messages" },
			{ id: "chat", name: "OpenAI Chat Completions" },
			{ id: "responses", name: "OpenAI Responses" }
		];
		/** 目录校验:ID 必填唯一、token 字段为正整数;返回首个问题行号,-1 通过。 */
		function catalogIssue(rows) {
			const seen = /* @__PURE__ */ new Set();
			for (const [index, row] of rows.entries()) {
				const id = row.id.trim();
				if (id.length === 0 || seen.has(id)) return index;
				seen.add(id);
				if (!Number.isSafeInteger(row.contextWindow) || row.contextWindow <= 0) return index;
				if (!Number.isSafeInteger(row.maxTokens) || row.maxTokens <= 0) return index;
			}
			return -1;
		}
		//#endregion
		//#region travel frames
		/**
		 * 旅行悬浮框 + 旅行聚焦框(红/绿/蓝三态双框)。ProviderCard 与自定义页
		 * 共用同一台机器:目标解析、落框几何、续行、目标级 RO 全部在此,行为唯一。
		 * 双框各自独立跑同一套状态机(乒乓:恒有一框锁蓝,另一框自由红/绿)。
		 * 三态(配色见 CARD_STYLES 头注):红态=常驻聚焦描边;绿态=悬浮跟随
		 * (四周外延 20px,永不可见);蓝态=新建行待命(全透明,加号行悬浮显形)。
		 */
		function useTravelFrames(bodyRef) {
			// 双旅行框,各自独立跑同一套红/绿/蓝状态机(逻辑完全复用)。三态
			// (配色见 CARD_STYLES 头注,调试配色留档/正式配色=输入框聚焦高亮色):
			// 红态(常驻聚焦)= 不透明描边、与文本输入框同尺寸同心、跟踪聚焦;
			// 绿态(悬浮跟随)= 四周外延 20px、跟踪悬停的文本输入框,
			//   **永远全透明不可见**(纯逻辑态);
			// 蓝态(新建行待命)= 跟随新建行提示框,
			//   待命全透明、加号行悬浮触发显形。
			// 切换:红→(绿样放大 260ms)→蓝 = 点击新增行;绿→蓝 = 点击新增行;
			// 蓝→红 = 点击新增行(唯一出蓝,新行聚焦模型ID后红态追踪);红↔绿 =
			// 红态点非文本输入框→绿,绿态点文本输入框→红。进出蓝都是点新增行,
			// 两框初始一蓝一绿天然乒乓错开:一个锁在蓝态时,另一个自由红/绿。
			const [hoverBox, setHoverBox] = react.useState(null);
			const [hoverInstant, setHoverInstant] = react.useState(false);
			const [addHover, setAddHover] = react.useState(false);
			const hoverElRef = react.useRef(null);
			const hoverOnRef = react.useRef(false);
			const hoverKeyRef = react.useRef(null);
			const hoverRectRef = react.useRef(null);
			const hoverOffAtRef = react.useRef(0);
			const addHoverRef = react.useRef(false);
			const observedTargetsRef = react.useRef(new Set());
			const targetRORef = react.useRef(null);
			const isSpotInput = (el) => el?.matches?.("input.llm-mimo-underline, input.llm-mimo-idbox, input.llm-mimo-nameinput");
			const radiusOf = (el) => getComputedStyle(el).borderTopLeftRadius;
			// 悬浮态 = 旅行填充框:跟随悬停目标(输入框/收起钮/折叠行/加号行)
			// 连续滑移,移出卡片就地淡出。
			const resolveHoverSpot = (el) => {
				// 身份行整行是一个命中区(名字/ID 输入框在内):悬浮任何位置都
				// 是整行悬浮框,不出输入框级小框。
				const idrow = el.closest?.(".llm-mimo-idrow");
				if (idrow) return { el: idrow, radius: radiusOf(idrow) };
				if (isSpotInput(el)) return { el, radius: radiusOf(el) };
				const btn = el.closest?.(".llm-mimo-collapsebtn");
				if (btn) return { el: btn, radius: radiusOf(btn) || 28 };
				const keyrow = el.closest?.(".llm-mimo-keyzone");
				if (keyrow) return { el: keyrow, radius: radiusOf(keyrow) };
				const formatline = el.closest?.(".llm-mimo-formatline");
				if (formatline) return { el: formatline, radius: radiusOf(formatline) };
				const baserow = el.closest?.(".llm-mimo-baserow");
				if (baserow) return { el: baserow, radius: radiusOf(baserow) };
				const mcard = el.closest?.(".llm-mimo-mcard.collapsed");
				if (mcard) return { el: mcard, radius: radiusOf(mcard) };
				// 行填充卡的内边距区也归到行的悬浮框主体(模型行=mcard,加号行=
				// addbody,同规格 8px 内层体),行与行之间才落入空隙。
				const stack = el.closest?.(".llm-mimo-stackitem");
				if (stack) {
					const body = stack.querySelector(".llm-mimo-mcard.collapsed, .llm-mimo-addbody");
					if (body) return { el: body, radius: radiusOf(body) };
				}
				return null;
			};
			const measure = (el, pad) => {
				const b = el.getBoundingClientRect();
				const r = bodyRef.current.getBoundingClientRect();
				// 假目标:带 data-frame-extend-left 的元素,框的矩形左扩 Npx——
				// 输入框本体不动(文字保持与标签列对齐),聚焦框自留呼吸空隙
				// (输入框无可见边界,框是其大小的唯一呈现,可以让框"撒谎")。
				const extendLeft = parseFloat(el.dataset?.frameExtendLeft ?? "0") || 0;
				return {
					top: b.top - r.top - pad,
					left: b.left - r.left - pad - extendLeft,
					width: b.width + pad * 2 + extendLeft,
					height: b.height + pad * 2,
					radius: (parseFloat(radiusOf(el)) || 8) + pad,
					on: true
				};
			};
			// 落框:目标/状态变化(旅行/换装)→260ms 几何过渡;同键重测(布局位移)→
			// 无过渡胶着跟随,否则长过渡会拖着追移动中的输入框。同键同矩形的重复
			// 触发(如 mousedown 后紧跟 focusin)直接跳过——两次更新会被批量进同一次
			// 渲染,后一次的胶着标记会把进行中的旅行/换装过渡打成瞬移。熄灭→点亮
			// 时几何瞬时就位,透明度照常淡入。
			const sameRect = (a, b) => !!a && !!b && Math.abs(a.top - b.top) < 0.1 && Math.abs(a.left - b.left) < 0.1 && Math.abs(a.width - b.width) < 0.1 && Math.abs(a.height - b.height) < 0.1 && Math.abs(a.radius - b.radius) < 0.1;
			const pushBox = (setBox, setInstant, onRef, rectRef, animate, rect) => {
				if (onRef.current && !animate && sameRect(rectRef.current, rect)) return;
				rectRef.current = rect;
				if (!onRef.current) {
					onRef.current = true;
					setInstant(true);
					setBox(rect);
					requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
					return;
				}
				setInstant(!animate);
				setBox(rect);
			};
			const applyHover = () => {
				syncTargets();
				const body = bodyRef.current;
				const target = hoverElRef.current;
				if (!body || !target || !target.el.isConnected) {
					// 离开触发区:淡出(不常驻);淡出时刻留档供续行判定。
					if (hoverOnRef.current) hoverOffAtRef.current = Date.now();
					hoverElRef.current = null;
					hoverOnRef.current = false;
					hoverKeyRef.current = null;
					setHoverBox((prev) => prev && { ...prev, on: false });
					return;
				}
				const keyChanged = hoverKeyRef.current !== target.el;
				hoverKeyRef.current = target.el;
				const rect = measure(target.el, 0);
				// 淡出未完成(<200ms)就遇到下一个触发:续行——从当前位置滑过去并
				// 淡回,不瞬移不重亮;淡出完成后的出现才是全新点亮。
				if (!hoverOnRef.current && hoverRectRef.current && Date.now() - hoverOffAtRef.current < 200) {
					hoverOnRef.current = true;
					hoverRectRef.current = rect;
					setHoverInstant(false);
					setHoverBox(rect);
					return;
				}
				pushBox(setHoverBox, setHoverInstant, hoverOnRef, hoverRectRef, keyChanged, rect);
			};
			// 一个旅行框的状态机实例:三态 + 落框几何(红/蓝 pad 0,绿 pad 20)。
			const useFrameMachine = (initialState) => {
				const [box, setBox] = react.useState(null);
				const [instant, setInstant] = react.useState(false);
				const [state, setState] = react.useState(initialState);
				const elRef = react.useRef(null);
				const onRef = react.useRef(false);
				const keyRef = react.useRef({ el: null, state: null });
				const rectRef = react.useRef(null);
				const stateRef = react.useRef(initialState);
				const setStateTo = (next) => {
					if (stateRef.current === next) return;
					stateRef.current = next;
					setState(next);
				};
				const fadeOut = () => {
					onRef.current = false;
					setBox((prev) => prev && { ...prev, on: false });
				};
				const apply = () => {
					syncTargets();
					const body = bodyRef.current;
					const target = elRef.current;
					if (!body || !target || !target.isConnected) {
						// 目标被删(如所在行被移除)时就地淡出,别飞向零矩形。
						elRef.current = null;
						keyRef.current = { el: null, state: null };
						fadeOut();
						return;
					}
					const st = stateRef.current;
					const keyChanged = keyRef.current.el !== target || keyRef.current.state !== st;
					keyRef.current = { el: target, state: st };
					const pad = st === "green" ? 20 : 0;
					pushBox(setBox, setInstant, onRef, rectRef, keyChanged, measure(target, pad));
				};
				return { box, instant, state, elRef, stateRef, setStateTo, apply, fadeOut };
			};
			const frameA = useFrameMachine("blue");
			const frameB = useFrameMachine("green");
			const frames = [frameA, frameB];
			// 点击推进三态机:每个框独立跑同一份逻辑,故两框对同一点击各自响应。
			const stepClick = (m, target) => {
				const st = m.stateRef.current;
				const addrow = target.closest?.(".llm-mimo-addrow");
				if (st === "blue") {
					// 蓝→红(唯一出蓝方式):点击新增行,新行聚焦模型ID后红态追踪。
					if (addrow) m.setStateTo("red");
					return;
				}
				if (addrow) {
					const strip = addrow.querySelector(".llm-mimo-addstrip");
					if (st === "green") {
						// 绿→蓝:直接驻留新建行提示框。
						m.setStateTo("blue");
						if (strip) m.elRef.current = strip;
						m.apply();
						return;
					}
					// 红→蓝:先放大成绿态的样子(绿框永不可见,只走几何),落定立刻进蓝。
					m.setStateTo("green");
					m.apply();
					window.setTimeout(() => {
						if (m.stateRef.current !== "green") return;
						m.setStateTo("blue");
						if (strip) m.elRef.current = strip;
						m.apply();
					}, 260);
					return;
				}
				if (isSpotInput(target)) {
					// 点击文本输入框:红态就位(绿→红切换,或红态内移动)。
					m.setStateTo("red");
					m.elRef.current = target;
					if (target.closest(".fresh")) {
						// 新增行入场动画中输入框还在位移,落定后再落框。
						window.setTimeout(() => {
							if (m.elRef.current === target) m.apply();
						}, 330);
					} else {
						m.apply();
					}
					return;
				}
				if (st === "red") {
					// 红态点击非文本输入框:切绿,恢复悬浮跟随(原目标上换装)。
					m.setStateTo("green");
					m.apply();
				}
			};
			const stepFocus = (m, target) => {
				// 红态跟踪聚焦(键盘 Tab/自动聚焦也能带框走);绿/蓝态只认点击。
				if (m.stateRef.current !== "red" || !isSpotInput(target)) return;
				m.elRef.current = target;
				if (target.closest(".fresh")) {
					window.setTimeout(() => {
						if (m.elRef.current === target) m.apply();
					}, 330);
				} else {
					m.apply();
				}
			};
			const stepHover = (m, target) => {
				// 绿态悬浮跟随:只跟文本输入框,其余位置原地待命;身份行不跟
				// (整行是悬浮框命中区,不出小框)。
				const input = isSpotInput(target) && !target.closest?.(".llm-mimo-idrow") ? target : null;
				if (m.stateRef.current === "green" && input && m.elRef.current !== input) {
					m.elRef.current = input;
					m.apply();
				}
			};
			const stepLeave = (m) => {
				// 绿态随悬停而在,移出卡片就地淡出;红/蓝态常驻不灭。
				if (m.stateRef.current === "green") m.fadeOut();
			};
			// 显形判定:红态常驻显形;蓝态待命全透明(加号行悬浮触发显形);
			// 绿框永远全透明不可见(owner 裁定,纯逻辑态)。
			const frameDim = (m) => {
				if (m.state === "blue") return !addHover;
				if (m.state === "green") return true;
				return false;
			};
			const retargetHover = (selector, index, tries) => {
				const el = bodyRef.current?.querySelector(`[data-card="${index}"] ${selector}`);
				if (!el) {
					if (tries > 0) window.setTimeout(() => retargetHover(selector, index, tries - 1), 16);
					return;
				}
				hoverElRef.current = { el, radius: radiusOf(el) };
				applyHover();
			};
			// 初始落框:蓝态=新建行提示框;红/绿态=API 密钥输入框(全卡唯一,只落框
			// 不夺焦点)。两框初始一蓝一绿。
			react.useEffect(() => {
				const seed = (m) => {
					const body = bodyRef.current;
					if (!body) return;
					const el = m.stateRef.current === "blue"
						? body.querySelector(".llm-mimo-addstrip")
						: body.querySelector('input[type="password"]');
					if (!el) return;
					m.elRef.current = el;
					m.apply();
				};
				seed(frameA);
				seed(frameB);
			}, []);
			// 悬浮/聚焦目标元素的观察登记:目标自身的盒体变化(如密钥输入框悬停
			// 收窄)不改容器尺寸,容器 RO 收不到——由目标级 RO 逐帧上报,框与填充
			// 随之胶着跟随。syncTargets 在每次落框后把当前目标挂上观察。
			const syncTargets = () => {
				const ro = targetRORef.current;
				if (!ro) return;
				const els = [hoverElRef.current?.el, ...frames.map((m) => m.elRef.current)].filter(Boolean);
				const wanted = new Set(els);
				for (const el of wanted) {
					if (!observedTargetsRef.current.has(el)) {
						observedTargetsRef.current.add(el);
						ro.observe(el);
					}
				}
				for (const el of [...observedTargetsRef.current]) {
					if (!wanted.has(el)) {
						observedTargetsRef.current.delete(el);
						ro.unobserve(el);
					}
				}
			};
			// 布局动画(行抽屉 0fr→1fr、margin 融合)期间输入框逐帧在动:挂
			// ResizeObserver 在容器上,动画全程逐帧重测,框才真正"跟随"输入框
			// (同键重测走无过渡胶着跟随)。回调只碰 ref 与稳定 setter,闭包无旧值。
			react.useEffect(() => {
				const body = bodyRef.current;
				if (!body || typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver(() => {
					for (const m of frames) m.apply();
					applyHover();
				});
				observer.observe(body);
				return () => observer.disconnect();
			}, []);
			react.useEffect(() => {
				if (typeof ResizeObserver === "undefined") return;
				targetRORef.current = new ResizeObserver(() => {
					applyHover();
					for (const m of frames) m.apply();
				});
				syncTargets();
				return () => {
					targetRORef.current?.disconnect();
					targetRORef.current = null;
				};
			}, []);
			// 布局内收/回弹(悬停驱动的 padding 过渡)只移动内容不改盒体,RO 收不到
			// ——悬停事件后开 340ms 逐帧重测,框才跟得上输入框的水平位移(同键
			// 重测走无过渡胶着跟随,不会重新旅行)。
			let settleRaf = 0;
			let settleUntil = 0;
			const settleTick = () => {
				for (const m of frames) m.apply();
				applyHover();
				if (Date.now() < settleUntil) settleRaf = requestAnimationFrame(settleTick);
				else settleRaf = 0;
			};
			const settle = () => {
				settleUntil = Date.now() + 340;
				if (!settleRaf) settleRaf = requestAnimationFrame(settleTick);
			};
			const onMouseDownCapture = (event) => {
				let target = event.target;
				// 身份行整合:行内按下(除供应商ID框)一律代理到供应商名称输入框
				// ——名字输入框自身的点击判定并入行,点行=点名字输入框(红框落位)。
				const idrow = target.closest?.(".llm-mimo-idrow");
				if (idrow && !target.closest?.(".llm-mimo-idbox")) {
					target = idrow.querySelector("input.llm-mimo-nameinput") ?? target;
				}
				// 点击新增行会消费掉悬浮激活:新蓝框入场一律从全透明开始
				// (重新真实悬停加号行才显形),否则 DOM 移动后悬停状态滞后
				// 会让入场帧闪一下。
				if (target.closest?.(".llm-mimo-addrow") && addHoverRef.current) {
					addHoverRef.current = false;
					setAddHover(false);
				}
				for (const m of frames) stepClick(m, target);
				settle();
			};
			const onFocusCapture = (event) => {
				const target = event.target;
				for (const m of frames) stepFocus(m, target);
			};
			const onMouseOverCapture = (event) => {
				const found = resolveHoverSpot(event.target);
				// 离开触发区即淡出(不常驻);快速穿过间隙时靠 applyHover 的
				// 续行窗口保证不出现"淡灭再重亮"的断开感。
				if ((hoverElRef.current?.el ?? null) !== (found?.el ?? null)) {
					hoverElRef.current = found;
					applyHover();
				}
				// 新建行悬浮触发:蓝态框显形。
				const onAddrow = !!event.target.closest?.(".llm-mimo-addrow");
				if (onAddrow !== addHoverRef.current) {
					addHoverRef.current = onAddrow;
					setAddHover(onAddrow);
				}
				for (const m of frames) stepHover(m, event.target);
				settle();
			};
			const onMouseLeave = () => {
				hoverElRef.current = null;
				applyHover();
				if (addHoverRef.current) {
					addHoverRef.current = false;
					setAddHover(false);
				}
				for (const m of frames) stepLeave(m);
				settle();
			};
			const overlays = [
				react_jsx_runtime.jsx("div", {
					className: "llm-mimo-hoverbox" + (hoverBox?.on ? " on" : "") + (hoverInstant ? " instant" : ""),
					style: hoverBox ? { top: hoverBox.top, left: hoverBox.left, width: hoverBox.width, height: hoverBox.height, borderRadius: hoverBox.radius } : { top: 0, left: 0, width: 0, height: 0 }
				}, "hoverbox"),
				react_jsx_runtime.jsx("div", {
					className: "llm-mimo-frame " + frameA.state + (frameA.box?.on ? " on" : "") + (frameA.instant ? " instant" : "") + (frameDim(frameA) ? " dim" : ""),
					style: frameA.box ? { top: frameA.box.top, left: frameA.box.left, width: frameA.box.width, height: frameA.box.height, borderRadius: frameA.box.radius } : { top: 0, left: 0, width: 0, height: 0 }
				}, "frame-a"),
				react_jsx_runtime.jsx("div", {
					className: "llm-mimo-frame " + frameB.state + (frameB.box?.on ? " on" : "") + (frameB.instant ? " instant" : "") + (frameDim(frameB) ? " dim" : ""),
					style: frameB.box ? { top: frameB.box.top, left: frameB.box.left, width: frameB.box.width, height: frameB.box.height, borderRadius: frameB.box.radius } : { top: 0, left: 0, width: 0, height: 0 }
				}, "frame-b")
			];
			return { hoverBox, hoverInstant, addHover, frames, frameA, frameB, frameDim, applyHover, retargetHover, overlays, onMouseDownCapture, onFocusCapture, onMouseOverCapture, onMouseLeave };
		}
		//#endregion

		//#region ProviderCard
		function TokenField(props) {
			const { label, value, onCommit, dimmed, labelPad, kind } = props;
			const [text, setText] = react.useState(value === void 0 ? "" : formatTokens(value));
			react.useEffect(() => {
				setText(value === void 0 ? "" : formatTokens(value));
			}, [value]);
			return react_jsx_runtime.jsxs("span", {
				className: "llm-mimo-row",
				style: { gap: 6 },
				children: [
					react_jsx_runtime.jsx("span", { className: "llm-mimo-label", style: { paddingLeft: labelPad }, children: label }),
					react_jsx_runtime.jsx("input", {
						className: "llm-mimo-underline llm-mimo-flat" + (dimmed ? " llm-mimo-dimmed" : ""),
						style: { width: 62 },
						title: dimmed ? "默认值，可直接覆写" : label,
						value: text,
						onChange: (event) => setText(event.target.value),
						onBlur: () => {
							const parsed = parseTokens(text);
							onCommit(parsed);
							setText(formatTokens(parsed ?? (kind === "context" ? DEFAULT_CONTEXT_WINDOW : DEFAULT_MAX_TOKENS)));
						}
					})
				]
			});
		}
		function ModelCard(props) {
			const { t, row, index, expanded, fresh, onToggle, onPatch, onRemove } = props;
			const namePlaceholder = row.id.trim().length > 0 ? `${t("modelName")}（${row.id.trim()}）` : `${t("modelName")}（${t("modelNameDefault")}）`;
			// 展开体延迟 300ms 卸载:收起时 class 先摘,0fr→1fr 过渡跑完再卸载。
			const [bodyMounted, setBodyMounted] = react.useState(expanded);
			react.useEffect(() => {
				if (expanded) {
					setBodyMounted(true);
					return;
				}
				const timer = window.setTimeout(() => setBodyMounted(false), 300);
				return () => window.clearTimeout(timer);
			}, [expanded]);
			const contextValue = row.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
			const tokensValue = row.maxTokens ?? DEFAULT_MAX_TOKENS;
			const onBlankArea = (event) => !(event.target.closest && event.target.closest("input, label, button"));
			const clickProps = expanded ? {} : {
				onClick: (event) => { if (onBlankArea(event)) onToggle(); }
			};
			const markStyle = { cursor: expanded ? "default" : "pointer" };
			const header = react_jsx_runtime.jsxs("div", {
				className: "llm-mimo-mgrid",
				style: { gridTemplateColumns: "185px 215px 1fr 20px 28px" },
				children: [
					react_jsx_runtime.jsx("input", {
						className: "llm-mimo-nameinput",
						title: t("modelName"),
						placeholder: namePlaceholder,
						value: row.name,
						onChange: (event) => onPatch(index, { name: event.target.value })
					}),
					react_jsx_runtime.jsx("input", {
						className: "llm-mimo-idbox",
						title: t("modelIdRequired"),
						placeholder: t("modelIdRequired"),
						value: row.id,
						autoFocus: fresh || undefined,
						onChange: (event) => onPatch(index, { id: event.target.value })
					}),
					react_jsx_runtime.jsx("span", {}),
					react_jsx_runtime.jsx("span", {
						className: "llm-mimo-caret",
						style: { transform: expanded ? "rotate(180deg)" : "none" },
						children: "▾"
					}),
					react_jsx_runtime.jsx("button", {
						type: "button",
						className: "llm-mimo-trash",
						style: { justifySelf: "end" },
						title: t("removeModel"),
						onClick: (event) => { event.stopPropagation(); onRemove(index); },
						children: fresh ? react_jsx_runtime.jsxs("span", {
							className: "llm-mimo-trash-birth",
							children: [
								react_jsx_runtime.jsx("span", { className: "llm-mimo-trash-glyph plus", children: "+" }),
								react_jsx_runtime.jsx("span", { className: "llm-mimo-trash-glyph icon", children: react_jsx_runtime.jsx(_primitives.IconTrashOutlineRegular, { width: 14, height: 14 }) })
							]
						}) : react_jsx_runtime.jsx(_primitives.IconTrashOutlineRegular, { width: 14, height: 14 })
					})
				]
			});
			const body = bodyMounted && react_jsx_runtime.jsx("div", {
				className: "llm-mimo-mbody" + (expanded ? " open" : ""),
				children: react_jsx_runtime.jsx("div", {
					className: "llm-mimo-mbodyclip",
					children: react_jsx_runtime.jsxs("div", {
						className: "llm-mimo-mgrid",
						style: { gridTemplateColumns: "185px 215px 1fr 56px", marginTop: 8, rowGap: 8 },
						children: [
					react_jsx_runtime.jsx(TokenField, {
						label: `${t("contextWindow")}:`,
						kind: "context",
						labelPad: 5,
						value: contextValue,
						dimmed: contextValue === DEFAULT_CONTEXT_WINDOW,
						onCommit: (parsed) => onPatch(index, { contextWindow: parsed ?? DEFAULT_CONTEXT_WINDOW })
					}),
					react_jsx_runtime.jsx(TokenField, {
						label: `${t("maxTokens")}:`,
						kind: "tokens",
						labelPad: 9,
						value: tokensValue,
						dimmed: tokensValue === DEFAULT_MAX_TOKENS,
						onCommit: (parsed) => onPatch(index, { maxTokens: parsed ?? DEFAULT_MAX_TOKENS })
					}),
					react_jsx_runtime.jsx("span", {}),
					react_jsx_runtime.jsx("button", {
						type: "button",
						className: "llm-mimo-collapsebtn",
						title: t("collapse"),
						style: { gridColumn: "4", gridRow: "1 / 3", width: "56px", height: "100%", justifySelf: "end" },
						onClick: () => onToggle(),
						children: "▴"
					}),
					react_jsx_runtime.jsxs("div", {
						style: { gridColumn: "1 / 4", display: "flex", alignItems: "center", gap: 12 },
						children: [
							react_jsx_runtime.jsx("span", { className: "llm-mimo-label", style: { paddingLeft: 5 }, children: `${t("inputTypes")}:` }),
							MODALITIES.map((modality) => react_jsx_runtime.jsxs("label", {
								className: "llm-mimo-chip",
								title: t(modality.label),
								children: [
									react_jsx_runtime.jsx("input", {
										type: "checkbox",
										disabled: modality.id === "text",
										checked: modality.id === "text" ? true : row.inputModalities.includes(modality.id),
										onChange: (event) => {
											const next = event.target.checked
												? [...row.inputModalities.filter((m) => m !== modality.id), modality.id]
												: row.inputModalities.filter((m) => m !== modality.id);
											onPatch(index, { inputModalities: next });
										}
									}),
									t(modality.label)
								]
								}, modality.id))
							]
						})
						]
					})
				})
			});
			return react_jsx_runtime.jsxs("div", {
				className: "llm-mimo-mcard" + (!expanded ? " collapsed" : "") + (fresh ? " fresh" : ""),
				...clickProps,
				style: markStyle,
				children: [
					header,
					body,
					fresh && react_jsx_runtime.jsx("div", {
						className: "llm-mimo-birthframe",
						children: react_jsx_runtime.jsx("span", { className: "llm-mimo-birthplus", children: "+" })
					}, "birth")
				]
			});
		}
			function AddStrip(props) {
				const { t, onAdd, fused, justAdded } = props;
				// 与未展开模型行同解剖:填充卡(10/12) > 内层体(5/8, radius 8) >
				// 内容行(高 28 按钮族);左侧提示框 408px = 名+ID 列宽,右侧加号列
				// 与垃圾桶列右缘对齐。规格与模型行逐像素统一。
				return react_jsx_runtime.jsxs("div", {
					className: "llm-mimo-fillcard llm-mimo-addrow llm-mimo-stackitem",
					style: { marginTop: fused ? -12 : 8, borderRadius: fused ? "0 0 20px 20px" : 20 },
					onClick: onAdd,
					children: [
						react_jsx_runtime.jsxs("div", {
							className: "llm-mimo-addbody",
							children: [
								react_jsx_runtime.jsx("div", {
									className: "llm-mimo-addstrip",
									title: t("addModel"),
									onClick: (event) => { event.stopPropagation(); onAdd(); },
									children: react_jsx_runtime.jsx("span", { className: "llm-mimo-addplus", children: "+" })
								}),
								react_jsx_runtime.jsx("span", { style: { flex: 1 } }),
								react_jsx_runtime.jsx("button", {
									type: "button",
									className: "llm-mimo-plusbtn" + (justAdded ? " appear" : ""),
									title: t("addModel"),
									onClick: (event) => { event.stopPropagation(); onAdd(); },
									children: "+"
								})
							]
						})
					]
				});
			}
			/** 三种 API 格式:名称 + 各自持久化链接的说明。 */
		const FORMAT_META = [
			{ id: "anthropic", name: "Anthropic Messages", desc: "可持久化存储该协议的 Anthropic Messages API 链接，相互作为备用" },
			{ id: "chat", name: "OpenAI Chat Completions", desc: "可持久化存储该协议的 OpenAI Chat Completions API 链接，相互作为备用" },
			{ id: "responses", name: "OpenAI Responses", desc: "可持久化存储该协议的 OpenAI Responses API 链接，相互作为备用" }
		];
		/** 解析每协议链接存储;坏草稿静默回空。 */
		function formatsFrom(text) {
			try {
				const parsed = JSON.parse(text ?? "{}");
				const out = {};
				for (const key of ["anthropic", "chat", "responses"]) {
					if (typeof parsed?.[key] === "string" && parsed[key].trim().length > 0) out[key] = parsed[key].trim();
				}
				return out;
			} catch (_halfWrittenDraft) {
				return {};
			}
		}
		function ProviderCard(props) {
				const { t, provider, keyConfigured, probe } = props;
			const state = props.useCard((snapshot) => snapshot);
			const disabled = state?.writable === false;
			const [expanded, setExpanded] = react.useState(() => new Set());
			const bodyRef = react.useRef(null);
			// 旅行悬浮框 + 双旅行框三态机:与自定义页共用 useTravelFrames。
			const travel = useTravelFrames(bodyRef);
			const { frames, frameA, frameB, frameDim, applyHover, retargetHover } = travel;
			const [freshIndex, setFreshIndex] = react.useState(null);
			const [keyDraft, setKeyDraft] = react.useState("");
			const [probeState, setProbeState] = react.useState(null);
			// 连通性测试:草稿密钥非空则测草稿,否则服务端解析已存密钥。
			// 成功更新小圆灯为绿;失败向下展开红框展示服务端带回的报错。
			const probeConnectivity = async () => {
				if (disabled || (probeState && probeState.phase === "probing") || typeof probe !== "function") return;
				setProbeState({ phase: "probing" });
				try {
					const draft = keyDraft.trim();
					const response = await probe({
						baseURL: baseURL.length > 0 ? baseURL : void 0,
						apiKey: draft.length > 0 ? draft : void 0
					});
					setProbeState(response?.ok === true
						? { phase: "ok", count: Array.isArray(response.value) ? response.value.length : 0 }
						: { phase: "fail", message: response?.error?.message ?? "连通性测试被拒绝" });
				} catch (error) {
					setProbeState({ phase: "fail", message: String(error?.message ?? error) });
				}
			};
			const [notice, setNotice] = react.useState(null);
			const drawerRef = react.useRef(null);
			const clipRef = react.useRef(null);
			const { open } = useEditorDrawer(drawerRef, clipRef, t, provider);
			const baseURL = state?.baseURL?.text ?? "";
			const baseURLsText = state?.baseURLsJson?.text ?? "{}";
			const formats = formatsFrom(baseURLsText);
			const activeFormatId = FORMAT_META.some((entry) => entry.id === (state?.apiFormat?.text ?? "chat")) ? state.apiFormat.text : "chat";
			const activeFormat = FORMAT_META.find((entry) => entry.id === activeFormatId) ?? FORMAT_META[0];
			const [formatOpen, setFormatOpen] = react.useState(false);
			const [formatClosing, setFormatClosing] = react.useState(false);
			const [formatFly, setFormatFly] = react.useState(null);
			const formatCardRef = react.useRef(null);
			const baseRowRef = react.useRef(null);
			const baseInputRef = react.useRef(null);
			const formatPortalRef = react.useRef(null);
			react.useEffect(() => () => formatPortalRef.current?.remove(), []);
			// 面板宿主挂进 Base URL 行所在的渲染根:宿主页面是 Shadow DOM,挂
			// document.body 会逃出样式作用域(CARD_STYLES 失效、退化为文档流块,
			// position:fixed 也随之失效);挂同根则样式照常生效,且在抽屉裁剪层
			// 之外,可自由外扩遮挡。行引用未就绪前兜底挂 body。
			const ensureFormatPortal = () => {
				if (formatPortalRef.current) return formatPortalRef.current;
				const host = document.createElement("div");
				try {
					// Shadow DOM:挂进所在渲染根(样式同树);光 DOM:getRootNode 返回
					// Document 本身,往 Document appendChild 会抛 HierarchyRequestError,
					// 回退挂 body(全局 <style> 照常作用)。
					const rootNode = baseRowRef.current?.getRootNode();
					if (rootNode && rootNode !== document && typeof rootNode.appendChild === "function") rootNode.appendChild(host);
					else document.body.appendChild(host);
				} catch (_hierarchyRequest) {
					document.body.appendChild(host);
				}
				formatPortalRef.current = host;
				return host;
			};
			const placeFormatCard = () => {
				const card = formatCardRef.current;
				const row = baseRowRef.current;
				if (!card || !row) return;
				const rowRect = row.getBoundingClientRect();
				const header = card.querySelector(".llm-mimo-formathead");
				const headerH = header?.offsetHeight ?? 22;
				const activeLine = card.querySelector(".llm-mimo-formatline.active");
				// 激活行在卡内的布局偏移用 offsetTop(相对卡片自身,含头部高度),
				// 与卡片当前在哪无关——不依赖卡片现位的测量就不会被自身动画/旧
				// 位置污染。目标:激活行的视口Y == Base URL 行的视口Y。
				const activeOffset = activeLine ? activeLine.offsetTop : headerH;
				card.style.top = `${Math.round(rowRect.top - activeOffset)}px`;
				card.style.left = `${Math.round(rowRect.left - 6)}px`;
				card.style.width = `${Math.round(rowRect.width + 12)}px`;
				if (localStorage.getItem("llm-mimo-format-debug") === "1") {
					card.style.background = "#ff00ff";
					card.style.outline = "2px solid cyan";
				}
			};
			// 面板为独立浮层:点击面板外任意处即收起(面板内点击不受影响);
			// 收起走 200ms 缩回过渡,期间不重复触发。
			const closeFormatPanel = () => {
				if (!formatOpen || formatClosing) return;
				setFormatClosing(true);
				window.setTimeout(() => {
					setFormatOpen(false);
					setFormatClosing(false);
					setFormatFly(null);
				}, 200);
			};
			react.useEffect(() => {
				if (!formatOpen) return;
				const onDocMousedown = (event) => {
					if (formatCardRef.current?.contains(event.target)) return;
					closeFormatPanel();
				};
				const reposition = () => placeFormatCard();
				document.addEventListener("mousedown", onDocMousedown, true);
				window.addEventListener("resize", reposition);
				document.addEventListener("scroll", reposition, true);
				return () => {
					document.removeEventListener("mousedown", onDocMousedown, true);
					window.removeEventListener("resize", reposition);
					document.removeEventListener("scroll", reposition, true);
				};
			}, [formatOpen, formatClosing]);
			// 对位:激活格式行钉在点击前 Base URL 行的屏幕高度上(头向上弹,其余向下弹)。
			react.useLayoutEffect(() => {
				if (!formatOpen) return;
				placeFormatCard();
			}, [formatOpen]);
			// 弹出动画(transform)会干扰当帧测量:动画落定后再校准一次。
			react.useEffect(() => {
				if (!formatOpen) return;
				const timer = window.setTimeout(() => placeFormatCard(), 260);
				return () => window.clearTimeout(timer);
			}, [formatOpen]);
			// 切换格式:当前编辑的 URL 归还给旧格式存储,新格式无存储则继承现值;
			// 全部走表单暂存,随保存落盘。
			// 未存储链接的格式:按已存链接猜一个灰色默认(同源 + /v1)。
			const guessBaseURL = () => {
				const source = formats.anthropic ?? baseURL.trim();
				try {
					return new URL(source).origin + "/v1";
				} catch (_invalidURL) {
					return "https://api.xiaomimimo.com/v1";
				}
			};
			const selectFormat = (id) => {
				const card = formatCardRef.current;
				const row = baseRowRef.current;
				const line = card?.querySelector(`.llm-mimo-formatline[data-format="${id}"]`);
				if (card && row && line) {
					// 整卡平移使选中行落到 Base URL 行,随后整卡淡出。
					const rowRect = row.getBoundingClientRect();
					const lineRect = line.getBoundingClientRect();
					setFormatFly({
						dx: Math.round(rowRect.left - lineRect.left),
						dy: Math.round(rowRect.top - lineRect.top)
					});
				}
				const next = { ...formats };
				const current = baseURL.trim();
				if (current.length > 0) next[activeFormatId] = current;
				props.edit("baseURLsJson", JSON.stringify(next));
				props.edit("apiFormat", id);
				// 新格式无存储时采纳猜测值到 Base URL 输入框,但不写回存储——
				// 存储只记真实使用/编辑过的链接,没存过的保持灰色猜测。
				props.edit("baseURL", next[id] ?? guessBaseURL());
				baseInputRef.current?.focus();
				closeFormatPanel();
			};
			const modelsText = state?.modelsJson?.text ?? "[]";
			const apiKeyEnv = state?.apiKeyEnv?.text ?? "MIMO_NORMAL_API_KEY";
			const rows = modelsFrom(modelsText);
			const valid = rowsValid(rows);
			// 行展开/收起、增删行都会移动输入框布局——重测两个旅行框的位置。
			react.useEffect(() => {
				for (const m of frames) m.apply();
			}, [expanded, rows.length, open]);
			const patchRow = (index, patch) => {
				const next = rows.map((row, i) => i === index ? { ...row, ...patch } : row);
				props.edit("modelsJson", JSON.stringify(next));
			};
			const addRow = () => {
				const next = [...rows, { id: "", name: "", contextWindow: DEFAULT_CONTEXT_WINDOW, maxTokens: DEFAULT_MAX_TOKENS, inputModalities: ["text", "image"] }];
				props.edit("modelsJson", JSON.stringify(next));
				setFreshIndex(rows.length);
				window.setTimeout(() => setFreshIndex(null), 500);
			};
			const removeRow = (index) => {
				const next = rows.filter((_, i) => i !== index);
				props.edit("modelsJson", JSON.stringify(next));
				setExpanded((prev) => {
					const nextSet = new Set();
					for (const i of prev) if (i < index) nextSet.add(i); else if (i > index) nextSet.add(i - 1);
					return nextSet;
				});
			};
			// 悬浮框目标改指(带重试:收起按钮要等展开体挂载)。展开行的行级悬浮
			// 代表=收起按钮;收起后回到整行。
			const toggle = (index) => {
				const willOpen = !expanded.has(index);
				setExpanded((prev) => {
					const next = new Set(prev);
					if (next.has(index)) next.delete(index);
					else next.add(index);
					return next;
				});
				retargetHover(willOpen ? ".llm-mimo-collapsebtn" : ".llm-mimo-mcard", index, 12);
			};
			const save = async () => {
				if (!valid || disabled) return;
				props.edit("modelsJson", JSON.stringify(rows));
				if (keyDraft.trim().length > 0) props.edit("apiKey", keyDraft.trim());
				try {
					if (typeof props.save === "function") await props.save();
					setKeyDraft("");
					const landed = typeof props.readLanded === "function" ? props.readLanded() : null;
					setNotice(landed === false ? { ok: false, text: `${t("keyFailed")}: save did not land` } : { ok: true, text: t("saved") });
				} catch (error) {
					setNotice({ ok: false, text: `${t("keyFailed")}: ${error?.message ?? String(error)}` });
				}
			};
			const cancel = () => {
				if (typeof props.discard === "function") props.discard();
				setKeyDraft("");
				setNotice(null);
			};
			// 扁平卡片栈:每行恒为独立填充卡;相邻折叠行以 -12px 重叠融合(不透明同色
			// 无边框),任一侧展开则分离为 8px——分合只是 margin 过渡,与展开体开合同步并发。
			// 融合接缝的两侧角归零:接缝处没有圆角就永远不会有侧边凹凸,外露角保持 20px。
			const rowOpen = (index) => expanded.has(index);
			const rowMargin = (index) => rowOpen(index) || (index > 0 && rowOpen(index - 1)) ? 8 : -12;
			const lastRowIndex = rows.length - 1;
			const stackRadius = (fusedAbove, fusedBelow) => fusedAbove && fusedBelow ? 0 : fusedAbove ? "0 0 20px 20px" : fusedBelow ? "20px 20px 0 0" : 20;
			const rowNodes = rows.map((row, index) => react_jsx_runtime.jsx("div", {
				className: "llm-mimo-fillcard llm-mimo-stackitem" + (index === freshIndex ? " fresh" : ""),
				"data-card": index,
				style: { marginTop: rowMargin(index), borderRadius: stackRadius(rowMargin(index) === -12, index < lastRowIndex && rowMargin(index + 1) === -12) },
				children: react_jsx_runtime.jsx(ModelCard, {
					t,
					row,
					index,
					expanded: expanded.has(index),
					fresh: index === freshIndex,
					onToggle: () => toggle(index),
					onPatch: patchRow,
					onRemove: removeRow
				})
			}, `card-${index}`));
			const stripFused = rows.length === 0 || !rowOpen(lastRowIndex);
			const titleBlock = react_jsx_runtime.jsxs("div", { children: [
				react_jsx_runtime.jsx("div", { style: { fontWeight: 600, fontSize: 13, color: "var(--dsw-alias-label-primary)" }, children: t("modelsTitle") }),
				react_jsx_runtime.jsx("div", { className: "llm-mimo-hint", children: t("modelsHint") })
			] });
			const titleCard = react_jsx_runtime.jsx("div", {
				className: "llm-mimo-fillcard llm-mimo-stackitem",
				style: { marginTop: 8, borderRadius: rows.length === 0 || !rowOpen(0) ? "20px 20px 0 0" : 20 },
				children: titleBlock
			});
			const stripNode = react_jsx_runtime.jsx(AddStrip, {
				t,
				onAdd: addRow,
				fused: stripFused,
				justAdded: freshIndex !== null
			}, "strip");
			const connectionCard = react_jsx_runtime.jsxs("div", {
				className: "llm-mimo-fillcard",
				style: { position: "relative" },
				children: [
					react_jsx_runtime.jsxs("div", {
						className: "llm-mimo-row llm-mimo-baserow",
						ref: baseRowRef,
						title: "点击切换 API 格式",
						onClick: (event) => {
							if (event.target.closest("input, label, button")) return;
							ensureFormatPortal();
							setFormatFly(null);
							setFormatOpen((open) => !open);
						},
						children: [
							react_jsx_runtime.jsx("span", {
								className: "llm-mimo-label llm-mimo-rollwrap",
								children: react_jsx_runtime.jsxs("span", {
									className: "llm-mimo-rollstack",
									children: [
										react_jsx_runtime.jsx("span", { className: "llm-mimo-rollline", children: t("baseUrl") }),
										react_jsx_runtime.jsx("span", { className: "llm-mimo-rollline", children: activeFormat.name })
									]
								})
							}),
							react_jsx_runtime.jsx("input", {
								className: "llm-mimo-underline",
								ref: baseInputRef,
								style: { flex: 1 },
								placeholder: baseUrlHintFor(t("baseUrlHint"), activeFormat.name),
								value: baseURL,
								disabled,
								onChange: (event) => props.edit("baseURL", event.target.value)
							})
						]
					}),
					(formatOpen || formatClosing) && react_dom.createPortal(react_jsx_runtime.jsxs("div", {
						className: "llm-mimo-formatcard" + (formatFly ? " fly" : "") + (formatClosing ? " closing" : ""),
						style: formatFly ? { transform: `translate(${formatFly.dx}px, ${formatFly.dy}px)` } : void 0,
						ref: formatCardRef,
						children: [
							react_jsx_runtime.jsx("div", { className: "llm-mimo-formathead", children: "API格式" }),
							FORMAT_META.map((entry) => react_jsx_runtime.jsxs("div", {
								className: "llm-mimo-formatline" + (entry.id === activeFormatId ? " active" : ""),
								"data-format": entry.id,
								title: entry.desc,
								onClick: () => selectFormat(entry.id),
								children: [
									react_jsx_runtime.jsx("span", { className: "llm-mimo-formatname", children: entry.name }),
									react_jsx_runtime.jsx("input", {
										className: "llm-mimo-underline llm-mimo-formatinput",
										placeholder: formatExampleFor(entry.id),
										title: entry.desc,
										value: entry.id === activeFormatId ? baseURL : formats[entry.id] ?? "",
										readOnly: true
									})
								]
							}, entry.id))
						]
					}), formatPortalRef.current),
					react_jsx_runtime.jsxs("div", {
						className: "llm-mimo-keyzone",
						title: "点击测试连通性",
						onClick: (event) => {
							// 报错文本本身可选中复制,不属于点击热区。
							if (event.target.closest("input, label, button, .llm-mimo-probeerror")) return;
							probeConnectivity();
						},
						children: [
							react_jsx_runtime.jsxs("div", {
								className: "llm-mimo-row",
								children: [
									react_jsx_runtime.jsx("span", { className: "llm-mimo-label", style: { minWidth: 92 }, children: t("apiKey") }),
									react_jsx_runtime.jsx("input", {
										className: "llm-mimo-underline",
										style: { flex: 1 },
										type: "password",
										placeholder: t("apiKeyHint"),
										value: keyDraft,
										disabled,
										onChange: (event) => setKeyDraft(event.target.value)
									}),
									react_jsx_runtime.jsx("span", {
										className: "llm-mimo-connect" + (probeState?.phase === "probing" ? " probing" : ""),
										title: "测试连通性",
										onClick: (event) => {
											event.stopPropagation();
											probeConnectivity();
										},
										children: react_jsx_runtime.jsx(_primitives.IconLinkOutlineRegular, { width: 16, height: 16 })
									}),
									react_jsx_runtime.jsx("span", {
										className: "llm-mimo-dot" + (probeState?.phase === "probing" ? " probing" : ""),
										role: "img",
										"aria-label": probeState?.phase === "ok" ? "联通正常" : probeState?.phase === "fail" ? "联通异常" : keyConfigured ? t("apiKeyConfigured") : t("apiKeyMissing"),
										title: probeState?.phase === "probing" ? "正在测试连通性…" : probeState?.phase === "ok" ? `联通正常（${probeState.count} 个模型）` : probeState?.phase === "fail" ? "联通异常" : keyConfigured ? t("apiKeyConfigured") : t("apiKeyMissing"),
										style: {
											width: 9,
											height: 9,
											borderRadius: "50%",
											background: probeState?.phase === "probing" ? "#f59e0b" : probeState?.phase === "ok" ? "#22c55e" : probeState?.phase === "fail" ? "#ef4444" : keyConfigured ? "#22c55e" : "#e5e7eb",
											display: "inline-block",
											flexShrink: 0
										}
									})
								]
							}),
							probeState?.phase === "fail" && react_jsx_runtime.jsx("div", {
								className: "llm-mimo-probeclip",
								children: react_jsx_runtime.jsx("div", {
									className: "llm-mimo-probeerror",
									children: probeState.message
								})
							})
						]
					})
				]
			});
			return react_jsx_runtime.jsxs("div", {
				ref: drawerRef,
				children: [
					react_jsx_runtime.jsx("style", { children: CARD_STYLES }),
					react_jsx_runtime.jsx("div", {
						className: "llm-mimo-drawer" + (open ? " open" : ""),
						children: react_jsx_runtime.jsx("div", {
							className: "llm-mimo-drawerclip",
							ref: clipRef,
						children: react_jsx_runtime.jsxs("div", {
							className: "llm-mimo-drawerbody",
							ref: bodyRef,
								onMouseDownCapture: travel.onMouseDownCapture,
								onFocusCapture: travel.onFocusCapture,
								onMouseOverCapture: travel.onMouseOverCapture,
								onMouseLeave: travel.onMouseLeave,
							children: [
									connectionCard,
									titleCard,
									...rowNodes,
									stripNode,
									!valid && react_jsx_runtime.jsx("div", { className: "llm-mimo-hint", style: { marginTop: 8, color: "#ef4444" }, children: t("invalid") }),
									notice !== null && react_jsx_runtime.jsx("div", { className: "llm-mimo-hint", style: { marginTop: 8, color: notice.ok ? "#8fdca6" : "#ef4444" }, children: notice.text }),
									react_jsx_runtime.jsxs("div", {
										className: "llm-mimo-foot",
										style: { marginTop: 8 },
										children: [
											react_jsx_runtime.jsx("button", { type: "button", className: "llm-mimo-ghost", disabled, onClick: cancel, children: t("cancel") }),
											react_jsx_runtime.jsx("button", { type: "button", className: "llm-mimo-primary", disabled: disabled || !valid, onClick: save, children: t("save") })
										]
									}),
										...travel.overlays
								]
							})
						})
					})
				]
			});
		}
		//#endregion
		//#region apply		//#endregion
		function ProviderCardDiag(props) {
			try {
				// 同一 settingsNs 下:基础路由 "mimo" 用 MiMo 卡,自定义路由用行内编辑器。
				const route = props.provider?.provider;
				if (typeof route === "string" && route !== "mimo") return CustomProviderCardDiag(props);
				return ProviderCard(props);
			} catch (error) {
				return react_jsx_runtime.jsx("div", { style: { color: "#ef4444", padding: 8, fontSize: 12, whiteSpace: "pre-wrap" }, children: "PC-ERR: " + String(error?.stack ?? error).slice(0, 500) });
			}
		}
		//#region CustomApiPage
		/**
		 * 自定义模型API(llm-mimo) 页:旧「自定义模型 API」创建表单的 llm-mimo 卡片版。
		 * 布局 = 图2 卡片(连接卡 Base URL / API 密钥 + 模型目录栈)+ Base URL 上方
		 * 一行「供应商名称(无框) + 供应商ID(有框)」(同模型行解剖:185/215 列)。
		 * 创建语义与旧页一致:写 llm-pi-ai 的 providers.<route> 配置 + 派生凭据
		 * (<ROUTE>_API_KEY);llm-mimo 引擎自托管是后续替换,页面行为不变。
		 */
		function CustomApiPage(props) {
			const { t, taken, readOnly, onClose, onBusyChange, createProvider, commitCustom, loadCustom, probeEndpoint } = props;
			const [route, setRoute] = react.useState("");
			const [displayName, setDisplayName] = react.useState("");
			const [baseURL, setBaseURL] = react.useState("");
			const [formatId, setFormatId] = react.useState("chat");
			const [keyDraft, setKeyDraft] = react.useState("");
			const [models, setModels] = react.useState([]);
			const [expanded, setExpanded] = react.useState(() => /* @__PURE__ */ new Set());
			const [freshIndex, setFreshIndex] = react.useState(null);
			const [formatOpen, setFormatOpen] = react.useState(false);
			const [probeState, setProbeState] = react.useState(null);
			const [failure, setFailure] = react.useState(void 0);
			const [notice, setNotice] = react.useState(null);
			// 行内编辑态:editingRoute = 被编辑的自定义供应商路由(创建态为 null)。
			const editingRoute = props.editingRoute ?? null;
			const [busy, setBusy] = react.useState(false);
			// 旅行悬浮框 + 双旅行框三态机:与 ProviderCard 共用 useTravelFrames。
			const bodyRef = react.useRef(null);
			const nameInputRef = react.useRef(null);
			const formatCardRef = react.useRef(null);
			const baseInputRef = react.useRef(null);
			const travel = useTravelFrames(bodyRef);
			// 行展开/收起、增删行都会移动输入框布局——重测两个旅行框的位置。
			react.useEffect(() => {
				for (const m of travel.frames) m.apply();
			}, [expanded, models.length]);
			// 行内编辑:从 customProviders 预填该路由的条目;取消=还原。
			const loadFromEntry = () => {
				if (!editingRoute || typeof loadCustom !== "function") return;
				const entry = loadCustom(editingRoute);
				if (!entry) return;
				setRoute(editingRoute);
				setDisplayName(!entry.displayName || entry.displayName === editingRoute ? "" : entry.displayName);
				setBaseURL(entry.baseURL ?? "");
				setFormatId(["anthropic", "chat", "responses"].includes(entry.apiFormat) ? entry.apiFormat : "chat");
				try {
					const rows = JSON.parse(entry.modelsJson ?? "[]");
					if (Array.isArray(rows)) setModels(rows.map((row) => ({
						id: String(row.id ?? ""),
						name: String(row.name ?? ""),
						contextWindow: Number.isSafeInteger(row.contextWindow) ? row.contextWindow : void 0,
						maxTokens: Number.isSafeInteger(row.maxTokens) ? row.maxTokens : void 0,
						inputModalities: Array.isArray(row.inputModalities) && row.inputModalities.length > 0 ? row.inputModalities : ["text"]
					})));
				} catch (_halfWritten) {}
			};
			react.useEffect(() => { loadFromEntry(); }, []);
			// 面板定位同 MiMo 卡:激活行视口 Y == Base URL 行视口 Y(激活行原位
			// 取代 Base URL 行,"API格式"头向上、其余行向下弹出),卡宽 = 行宽 ±6px。
			react.useLayoutEffect(() => {
				if (!formatOpen) return;
				const card = formatCardRef.current;
				if (!card) return;
				const activeLine = card.querySelector(".llm-mimo-formatline.active");
				card.style.top = `${-(activeLine ? activeLine.offsetTop : 0)}px`;
			}, [formatOpen, formatId]);
			react.useEffect(() => {
				onBusyChange?.(busy || probeState?.phase === "probing");
			}, [busy, probeState]);
			const routeTrimmed = route.trim();
			const routeInvalid = routeTrimmed.length > 0 && !ROUTE_PATTERN.test(routeTrimmed);
			const routeTaken = routeTrimmed.length > 0 && (taken ?? []).includes(routeTrimmed);
			const normalizedBaseURL = baseURL.trim();
			const baseUrlInvalid = baseURL.length > 0 && !isHttpUrl(normalizedBaseURL);
			const badModelIndex = catalogIssue(models);
			const ready = routeTrimmed.length > 0 && !routeInvalid && !routeTaken && normalizedBaseURL.length > 0 && !baseUrlInvalid && models.length > 0 && badModelIndex === -1;
			const hint = failure !== void 0 || ready || routeTrimmed.length === 0 || routeInvalid || routeTaken || baseUrlInvalid ? void 0 : normalizedBaseURL.length === 0 ? t("needsBaseUrl") : models.length === 0 ? t("needsModels") : badModelIndex !== -1 ? t("invalid") : void 0;
			const activeFormat = PAGE_FORMATS.find((entry) => entry.id === formatId) ?? PAGE_FORMATS[0];
			const probeConnectivity = async () => {
				if (probeState?.phase === "probing") return;
				setProbeState({ phase: "probing" });
				try {
					const answer = await probeEndpoint({
						...editingRoute ? { provider: editingRoute } : {},
						baseURL: normalizedBaseURL,
						api: formatId,
						...keyDraft.trim().length === 0 ? {} : { apiKey: keyDraft.trim() }
					});
					if (!answer.ok) {
						setProbeState({ phase: "fail", message: answer.error });
						return;
					}
					const found = answer.value ?? [];
					setProbeState({ phase: "ok", count: found.length });
					// 目录为空时用发现结果填充(旧页「获取可用模型」的等价物)。
					if (models.length === 0 && found.length > 0) {
						setModels(found.map((model) => ({
							id: String(model.id ?? ""),
							name: String(model.name ?? ""),
							contextWindow: Number.isSafeInteger(model.contextWindow) ? model.contextWindow : void 0,
							maxTokens: Number.isSafeInteger(model.maxTokens) ? model.maxTokens : void 0,
							inputModalities: Array.isArray(model.inputModalities) && model.inputModalities.length > 0 ? model.inputModalities.filter((m) => MODALITIES.some((m2) => m2.id === m)) : ["text"]
						})));
					}
				} catch (error) {
					setProbeState({ phase: "fail", message: error?.message ?? String(error) });
				}
			};
			const patchRow = (index, patch) => {
				setModels((prev) => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
			};
			const addRow = () => {
				setModels((prev) => [...prev, { id: "", name: "", contextWindow: DEFAULT_CONTEXT_WINDOW, maxTokens: DEFAULT_MAX_TOKENS, inputModalities: ["text", "image"] }]);
				setFreshIndex(models.length);
				window.setTimeout(() => setFreshIndex(null), 500);
			};
			const removeRow = (index) => {
				setModels((prev) => prev.filter((_, i) => i !== index));
				setExpanded((prev) => {
					const nextSet = /* @__PURE__ */ new Set();
					for (const i of prev) if (i < index) nextSet.add(i); else if (i > index) nextSet.add(i - 1);
					return nextSet;
				});
			};
			const toggle = (index) => {
				const willOpen = !expanded.has(index);
				setExpanded((prev) => {
					const next = new Set(prev);
					if (next.has(index)) next.delete(index);
					else next.add(index);
					return next;
				});
				travel.retargetHover(willOpen ? ".llm-mimo-collapsebtn" : ".llm-mimo-mcard", index, 12);
			};
			const create = async () => {
				if (!ready || busy || readOnly) return;
				setBusy(true);
				setFailure(void 0);
				try {
					const keyRef = editingRoute && typeof loadCustom === "function" ? loadCustom(editingRoute)?.apiKeyEnv ?? deriveKeyRef(editingRoute) : deriveKeyRef(routeTrimmed);
					const storesKey = keyDraft.trim().length > 0;
					const entry = {
						...displayName.trim().length === 0 ? {} : { displayName: displayName.trim() },
						...storesKey ? { apiKeyEnv: keyRef } : editingRoute && typeof loadCustom === "function" && loadCustom(editingRoute)?.apiKeyEnv ? { apiKeyEnv: loadCustom(editingRoute).apiKeyEnv } : {},
						apiFormat: formatId,
						baseURL: normalizedBaseURL,
						modelsJson: JSON.stringify(models.map((row) => ({
							id: row.id.trim(),
							...row.name.trim().length === 0 ? {} : { name: row.name.trim() },
							contextWindow: row.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
							maxTokens: row.maxTokens ?? DEFAULT_MAX_TOKENS,
							inputModalities: [...row.inputModalities]
						})))
					};
					const message = editingRoute
						? await commitCustom(editingRoute, entry, storesKey ? { ref: keyRef, value: keyDraft.trim() } : void 0)
						: await createProvider(routeTrimmed, entry, storesKey ? { ref: keyRef, value: keyDraft.trim() } : void 0);
					if (message !== void 0) {
						setFailure(message);
						return;
					}
					if (editingRoute) {
						setKeyDraft("");
						setNotice({ ok: true, text: t("saved") });
					} else {
						onClose?.(true);
					}
				} catch (error) {
					setFailure(error?.message ?? String(error));
				} finally {
					setBusy(false);
				}
			};
			// 扁平卡片栈:与 ProviderCard 同规则——相邻折叠行 -12px 重叠融合,
			// 任一侧展开则 8px 分离;接缝两侧角归零,外露角 20px。
			const rowOpen = (index) => expanded.has(index);
			const rowMargin = (index) => rowOpen(index) || (index > 0 && rowOpen(index - 1)) ? 8 : -12;
			const lastRowIndex = models.length - 1;
			const stackRadius = (fusedAbove, fusedBelow) => fusedAbove && fusedBelow ? 0 : fusedAbove ? "0 0 20px 20px" : fusedBelow ? "20px 20px 0 0" : 20;
			const rowNodes = models.map((row, index) => react_jsx_runtime.jsx("div", {
				className: "llm-mimo-fillcard llm-mimo-stackitem" + (index === freshIndex ? " fresh" : ""),
				"data-card": index,
				style: { marginTop: rowMargin(index), borderRadius: stackRadius(rowMargin(index) === -12, index < lastRowIndex && rowMargin(index + 1) === -12) },
				children: react_jsx_runtime.jsx(ModelCard, {
					t,
					row,
					index,
					expanded: expanded.has(index),
					fresh: index === freshIndex,
					onToggle: () => toggle(index),
					onPatch: patchRow,
					onRemove: removeRow
				})
			}, `card-${index}`));
			const stripFused = models.length === 0 || !rowOpen(lastRowIndex);
			const titleCard = react_jsx_runtime.jsxs("div", {
				className: "llm-mimo-fillcard llm-mimo-stackitem",
				style: { marginTop: 8, borderRadius: models.length === 0 || !rowOpen(0) ? "20px 20px 0 0" : 20 },
				children: [
					react_jsx_runtime.jsx("div", { style: { fontWeight: 600, fontSize: 13, color: "var(--dsw-alias-label-primary)" }, children: t("modelsTitle") }),
					react_jsx_runtime.jsx("div", { className: "llm-mimo-hint", children: t("modelsHint") })
				]
			});
			const stripNode = react_jsx_runtime.jsx(AddStrip, {
				t,
				onAdd: addRow,
				fused: stripFused,
				justAdded: freshIndex !== null
			}, "strip");
			const connectionCard = react_jsx_runtime.jsxs("div", {
				className: "llm-mimo-fillcard",
				children: [
					react_jsx_runtime.jsxs("div", {
						className: "llm-mimo-row llm-mimo-idrow",
						onClick: (event) => {
							// 行即名字输入框:点行(含名字输入框本体)聚焦名字输入框;
							// 供应商ID框保留原生编辑。
							if (event.target.closest?.(".llm-mimo-idbox")) return;
							nameInputRef.current?.focus();
						},
						children: [
							react_jsx_runtime.jsx("input", {
								ref: nameInputRef,
								className: "llm-mimo-nameinput",
								"data-frame-extend-left": "4",
								style: { width: 92, flex: "none", padding: "2px 0", cursor: "text" },
								title: `${t("providerName")}（${t("providerNameDefault")}）`,
								placeholder: route.trim().length > 0 ? route.trim() : t("providerName"),
								value: displayName,
								disabled: readOnly,
								onChange: (event) => setDisplayName(event.target.value)
							}),
							react_jsx_runtime.jsx("input", {
								className: "llm-mimo-idbox",
								style: { flex: 1 },
								title: t("providerIdHint"),
								placeholder: t("providerIdRequired"),
								value: route,
								disabled: readOnly || !!editingRoute,
								onChange: (event) => setRoute(event.target.value)
							})
						]
					}),
					react_jsx_runtime.jsxs("div", {
						style: { position: "relative" },
						children: [
							react_jsx_runtime.jsxs("div", {
								className: "llm-mimo-row llm-mimo-baserow",
								title: "点击切换 API 格式",
								onClick: (event) => {
									if (event.target.closest("input, label, button")) return;
									setFormatOpen((open) => !open);
								},
								children: [
									react_jsx_runtime.jsx("span", {
										className: "llm-mimo-label llm-mimo-rollwrap",
										children: react_jsx_runtime.jsxs("span", {
											className: "llm-mimo-rollstack",
											children: [
												react_jsx_runtime.jsx("span", { className: "llm-mimo-rollline", children: t("baseUrl") }),
												react_jsx_runtime.jsx("span", { className: "llm-mimo-rollline", children: activeFormat.name })
											]
										})
									}),
									react_jsx_runtime.jsx("input", {
										ref: baseInputRef,
										className: "llm-mimo-underline",
										style: { flex: 1 },
										placeholder: baseUrlHintFor(t("baseUrlHint"), activeFormat.name),
										value: baseURL,
										disabled: readOnly,
										onChange: (event) => setBaseURL(event.target.value)
									})
								]
							}),
							formatOpen && react_jsx_runtime.jsxs("div", {
								className: "llm-mimo-formatcard",
								ref: formatCardRef,
								style: { position: "absolute", left: -6, right: -6, top: 0, zIndex: 10 },
								children: [
									react_jsx_runtime.jsx("div", { className: "llm-mimo-formathead", children: t("apiFormat") }),
									PAGE_FORMATS.map((entry) => react_jsx_runtime.jsxs("div", {
										className: "llm-mimo-formatline" + (entry.id === formatId ? " active" : ""),
										title: entry.name,
										onClick: () => {
											// 点行任意处(含行内输入框)=选中该格式→收起→聚焦 Base URL 输入框。
											setFormatId(entry.id);
											setFormatOpen(false);
											baseInputRef.current?.focus();
										},
										children: [
											react_jsx_runtime.jsx("span", { className: "llm-mimo-formatname", children: entry.name }),
											react_jsx_runtime.jsx("input", {
												className: "llm-mimo-underline llm-mimo-formatinput",
												title: entry.name,
												value: entry.id === formatId ? baseURL : "",
												placeholder: formatExampleFor(entry.id),
												readOnly: true
											})
										]
									}, entry.id))
								]
							})
						]
					}),
					react_jsx_runtime.jsxs("div", {
						className: "llm-mimo-keyzone",
						title: "点击测试连通性",
						onClick: (event) => {
							if (event.target.closest("input, label, button, .llm-mimo-probeerror")) return;
							probeConnectivity();
						},
						children: [
							react_jsx_runtime.jsxs("div", {
								className: "llm-mimo-row",
								children: [
									react_jsx_runtime.jsx("span", { className: "llm-mimo-label", style: { minWidth: 92 }, children: t("apiKey") }),
									react_jsx_runtime.jsx("input", {
										className: "llm-mimo-underline",
										style: { flex: 1 },
										type: "password",
										placeholder: t("apiKeyHint"),
										value: keyDraft,
										disabled: readOnly,
										onChange: (event) => setKeyDraft(event.target.value)
									}),
									react_jsx_runtime.jsx("span", {
										className: "llm-mimo-connect" + (probeState?.phase === "probing" ? " probing" : ""),
										title: "测试连通性",
										onClick: (event) => {
											event.stopPropagation();
											probeConnectivity();
										},
										children: react_jsx_runtime.jsx(_primitives.IconLinkOutlineRegular, { width: 16, height: 16 })
									}),
									react_jsx_runtime.jsx("span", {
										className: "llm-mimo-dot" + (probeState?.phase === "probing" ? " probing" : ""),
										role: "img",
										title: probeState?.phase === "probing" ? "正在测试连通性…" : probeState?.phase === "ok" ? `联通正常（${probeState.count} 个模型）` : probeState?.phase === "fail" ? "联通异常" : "点击测试连通性",
										style: {
											width: 9,
											height: 9,
											borderRadius: "50%",
											background: probeState?.phase === "probing" ? "#f59e0b" : probeState?.phase === "ok" ? "#22c55e" : probeState?.phase === "fail" ? "#ef4444" : "#e5e7eb",
											display: "inline-block",
											flexShrink: 0
										}
									})
								]
							}),
							probeState?.phase === "fail" && react_jsx_runtime.jsx("div", {
								className: "llm-mimo-probeclip",
								children: react_jsx_runtime.jsx("div", {
									className: "llm-mimo-probeerror",
									children: probeState.message
								})
							})
						]
					})
				]
			});
			return react_jsx_runtime.jsxs("div", {
				ref: bodyRef,
				className: editingRoute ? "llm-mimo-edit" : "llm-mimo-page",
				style: { display: "grid", gap: 0, padding: "4px 0", position: "relative" },
				onMouseDownCapture: (event) => {
					travel.onMouseDownCapture(event);
					if (formatOpen && !event.target.closest?.(".llm-mimo-formatcard, .llm-mimo-baserow")) setFormatOpen(false);
				},
				onFocusCapture: travel.onFocusCapture,
				onMouseOverCapture: travel.onMouseOverCapture,
				onMouseLeave: travel.onMouseLeave,
				children: [
					react_jsx_runtime.jsx("style", { children: CARD_STYLES }),
					connectionCard,
					titleCard,
					...rowNodes,
					stripNode,
					routeInvalid || routeTaken || baseUrlInvalid ? react_jsx_runtime.jsx("div", {
						className: "llm-mimo-hint",
						style: { marginTop: 8, color: "#ef4444" },
						children: routeInvalid ? t("routeInvalid") : routeTaken ? t("routeTaken") : t("baseUrlInvalid")
					}) : null,
					failure !== void 0 && react_jsx_runtime.jsx("div", { className: "llm-mimo-hint", style: { marginTop: 8, color: "#ef4444" }, children: failure }),
					notice !== null && react_jsx_runtime.jsx("div", { className: "llm-mimo-hint", style: { marginTop: 8, color: notice.ok ? "#8fdca6" : "#ef4444" }, children: notice.text }),
					hint !== void 0 && react_jsx_runtime.jsx("div", { className: "llm-mimo-hint", style: { marginTop: 8 }, children: hint }),
					react_jsx_runtime.jsxs("div", {
						className: "llm-mimo-foot",
						style: { marginTop: 8 },
						children: [
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "llm-mimo-ghost",
								disabled: busy,
								onClick: () => {
									if (editingRoute) {
										loadFromEntry();
										setFailure(void 0);
										setNotice(null);
									} else {
										onClose?.(false);
									}
								},
								children: t("cancel")
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "llm-mimo-primary",
								disabled: busy || readOnly || !ready,
								onClick: create,
								children: busy ? t("creating") : editingRoute ? t("save") : t("create")
							})
						]
					}),
					...travel.overlays
				]
			});
		}
		/** 行上下文的抽屉接管:挂载=展开并藏掉宿主通用编辑器(空表单),卸载=收起;
		 *  行按钮文案在 编辑/收起 间切换(改首文本节点,不动 React 文本)。 */
		function useEditorDrawer(drawerRef, clipRef, t, provider) {
			const [open, setOpen] = react.useState(false);
			react.useEffect(() => {
				const drawer = drawerRef.current;
				const seat = drawer?.closest("[data-slot]");
				const host = seat?.parentElement ?? drawer?.parentElement;
				if (!drawer || !host) {
					setOpen(true);
					return;
				}
				const findEditor = () => Array.from(host.children).find((child) => child !== seat && typeof child.className === "string" && child.className.includes("editor"));
				if (host.querySelector(':scope > div[class*="rowHead"]')) host.style.rowGap = "0px";
				const setToggleLabel = (expanded) => {
					const button = host.querySelector(':scope > div[class*="rowHead"] button');
					if (!button) return;
					const label = expanded ? t("collapse") : t("edit");
					if (button.firstChild?.nodeType === 3) button.firstChild.nodeValue = label;
					else button.textContent = label;
					button.setAttribute("aria-label", `${label} ${provider?.displayName ?? ""} (${provider?.provider ?? ""})`);
				};
				const sync = () => {
					const editor = findEditor();
					if (editor) editor.style.display = "none";
					setOpen(editor !== void 0);
					setToggleLabel(editor !== void 0);
				};
				sync();
				const observer = new MutationObserver(sync);
				observer.observe(host, { childList: true });
				return () => {
					observer.disconnect();
					const editor = findEditor();
					if (editor) editor.style.display = "";
					if (host) host.style.rowGap = "";
					setToggleLabel(false);
				};
			}, []);
			react.useEffect(() => {
				if (clipRef.current) clipRef.current.inert = !open;
			}, [open]);
			return { open, setOpen };
		}
		/**
		 * 自定义供应商的行内编辑器:与创建页同一副表单,配色换 MiMo 供应商同款
		 * 的更深 fillcard(llm-mimo-edit 不套页面浅色覆盖);外壳接管宿主「编辑」
		 * 抽屉(同 ProviderCard)。
		 */
		function CustomProviderCard(props) {
			const drawerRef = react.useRef(null);
			const clipRef = react.useRef(null);
			const { open } = useEditorDrawer(drawerRef, clipRef, props.t, props.provider);
			return react_jsx_runtime.jsxs("div", {
				ref: drawerRef,
				children: [
					react_jsx_runtime.jsx("style", { children: CARD_STYLES }),
					react_jsx_runtime.jsx("div", {
						className: "llm-mimo-drawer" + (open ? " open" : ""),
						children: react_jsx_runtime.jsx("div", {
							className: "llm-mimo-drawerclip",
							ref: clipRef,
							children: react_jsx_runtime.jsx("div", {
								className: "llm-mimo-drawerbody",
								children: react_jsx_runtime.jsx(CustomApiPage, { ...props, editingRoute: props.provider?.provider })
							})
						})
					})
				]
			});
		}
		function CustomProviderCardDiag(props) {
			try {
				return CustomProviderCard(props);
			} catch (error) {
				return react_jsx_runtime.jsx("div", { style: { color: "#ef4444", padding: 8, fontSize: 12, whiteSpace: "pre-wrap" }, children: "CPC-ERR: " + String(error?.stack ?? error).slice(0, 500) });
			}
		}
		function CustomApiPageDiag(props) {
			try {
				return CustomApiPage(props);
			} catch (error) {
				return react_jsx_runtime.jsx("div", { style: { color: "#ef4444", padding: 8, fontSize: 12, whiteSpace: "pre-wrap" }, children: "CAP-ERR: " + String(error?.stack ?? error).slice(0, 500) });
			}
		}
		//#endregion
		//#region apply
		const inject = ["slots", "locale", "configForms", "remote", "remote.llm", "remote.settings", "remote.credentials"];
		function apply(ctx) {
			try {
				const t = ctx.locale.bind(NS);
				ctx.effect(() => ctx.locale.register(NS, { zh, en }), "llm-mimo: dictionaries");
				const scope = ctx.configForms.get(ENTRY_ID);
				const settingsFace = ctx.remote.settings;
				let lastLanded = null;
				const rawMutate = scope.mutate.bind(scope);
				scope.mutate = async (ops, expectedRevision) => {
					try {
						const landed = await rawMutate(ops, expectedRevision);
						lastLanded = landed === true;
						if (landed) return true;
						console.warn("llm-mimo: settings.mutate not-landed (expectedRevision=" + String(expectedRevision) + "); retrying directly without any revision fence", ops);
						const response = await settingsFace.mutate(ENTRY_ID, structuredClone(ops), void 0);
						const ok = response?.ok === true;
						lastLanded = ok;
						console.error("llm-mimo: direct retry (no fence) →", ok ? "LANDED" : "STILL refused: " + (response?.error?.message ?? JSON.stringify(response?.error ?? response)), "| code:", response?.error?.code ?? "?");
						return ok;
					} catch (error) {
						console.error("llm-mimo: settings.mutate REJECTED:", error?.message ?? String(error), { ops, expectedRevision, code: error?.code });
						throw error;
					}
				};
				const form = new _primitives.SettingsFormModel(scope, [
					{ field: "baseURL", format: (value) => typeof value === "string" ? value : "", parse: (text) => text.trim().length === 0 ? { kind: "clear" } : { value: text } },
					{ field: "apiFormat", format: (value) => typeof value === "string" ? value : "chat", parse: (text) => ["anthropic", "chat", "responses"].includes(text) ? { value: text } : void 0 },
					{ field: "baseURLsJson", format: (value) => typeof value === "string" ? value : "{}", parse: (text) => text.trim().length === 0 ? { kind: "clear" } : { value: text } },
					{ field: "modelsJson", format: (value) => typeof value === "string" ? value : JSON.stringify(Array.isArray(value) ? value : []), parse: (text) => {
						const trimmed = text.trim();
						if (trimmed === "") return { kind: "clear" };
						try {
							const parsed = JSON.parse(trimmed);
							if (!Array.isArray(parsed)) return void 0;
							return { value: trimmed };
						} catch (_notJson) {
							return void 0;
						}
					} },
					{ field: "apiKeyEnv", format: (value) => typeof value === "string" ? value : "MIMO_NORMAL_API_KEY", parse: (text) => text.trim().length === 0 ? { kind: "clear" } : { value: text.trim() } },
					{ field: "customProviders", format: (value) => JSON.stringify(value ?? {}), parse: (text) => { try { return { value: JSON.parse(text) }; } catch (_notJson) { return void 0; } } },
				], [
					{ field: "apiKey", write: async (value) => {
						const refName = form.field("apiKeyEnv")?.text ?? "MIMO_NORMAL_API_KEY";
						const response = await ctx.remote.credentials.set(credentialRefText(refName), value);
						if (response?.ok === false) throw new Error(response?.error?.message ?? "credential write refused");
					} }
				]);
				const store = form.bind(() => ({
					baseURL: form.field("baseURL"),
					apiFormat: form.field("apiFormat"),
					baseURLsJson: form.field("baseURLsJson"),
					modelsJson: form.field("modelsJson"),
					apiKeyEnv: form.field("apiKeyEnv"),
					writable: true
				}));
				// 自定义供应商条目读写:落点是 llm-mimo 自己的 customProviders(dict 字段=单条 set/unset,宿主删除按钮语义正确)
				// (彻底退出 pi-ai:创建与行内编辑都走这里,路由由 loader/volatile-update
				// 即时挂载)。密钥仍走凭据服务,名 = 条目 apiKeyEnv(缺省派生 <ROUTE>_API_KEY)。
				const loadCustomEntry = (route) => {
					try {
						const parsed = JSON.parse(form.field("customProviders")?.text ?? "{}");
						const entry = parsed?.[route];
						return typeof entry === "object" && entry !== null ? entry : null;
					} catch (_halfWritten) { return null; }
				};
				const writeCustomEntry = async (route, entry, key) => {
					const ok = await scope.mutate([{ op: "set", path: ["customProviders", route], value: entry }]);
					if (ok !== true) return "settings write refused";
					if (key) {
						const stored = await ctx.remote.credentials.set(key.ref, key.value);
						if (stored?.ok !== true) return stored?.error?.message ?? "credential write refused";
					}
					return void 0;
				};
				const controller = {
					dispose: () => form.dispose(),
					inject: () => ({
						hooks: { card: store },
						...form.actions(),
						read: (field) => form.field(field),
						readLanded: () => lastLanded,
						// 连通性探针:服务端 registerModelDiscovery 的处理器既测草稿
						// 密钥(apiKey 直传)也能解析已存密钥(服务端 credentials)。
						probe: (request) => ctx.remote.llm.discoverModels(ENTRY_ID, request),
						// 自定义供应商条目读写:行内编辑器走 provider-card 面(即本面),
						// 必须在此提供;创建页的 custom-api-card 面另有同名函数。
						loadCustom: loadCustomEntry,
						commitCustom: (route, entry, key) => writeCustomEntry(route, entry, key),
						createProvider: (route, entry, key) => writeCustomEntry(route, entry, key),
						probeEndpoint: async (request) => {
							const response = await ctx.remote.llm.discoverModels(ENTRY_ID, request);
							return response?.ok ? { ok: true, value: response.value } : { ok: false, error: response?.error?.message ?? "discovery refused" };
						}
					})
				};
				function credentialRefText(name) {
					return name;
				}
				ctx.effect(() => () => controller.dispose(), "llm-mimo: form subscription");
				// 直接在 apply 期注册,不走 whileServed:cf(configForms 子系统)在 ns 变为
				// served 时会抢注同 key 的通用卡,双方赛跑谁先谁赢、输家报错被宿主吞掉
				// ("registered by cf")——apply 期注册保证必赢。本插件 ns 随适配器常驻
				// served,whileServed 的自动 Dispose 语义在此没有价值。
				// 宿主 SegmentedControl 的选中指示条按等分轨道算术定位,标签不等宽时
			// 文字会撑出指示框(实测 157/157/200 轨道 vs 172px 指示条);而强制等宽
			// (width:max-content)又会让整条溢出容器。运行的 UI 是打包产物,磁盘 lib
			// 补丁不生效——改为从这里量测真实页签几何落到指示条行内样式上
			// (left/width=选中页签,滑移过渡保留)。全 app SegmentedControl 受益。
			const syncSegmentPills = () => {
				for (const list of document.querySelectorAll('div[role="tablist"]')) {
					const pill = list.firstElementChild;
					if (!pill || pill.getAttribute("aria-hidden") !== "true") continue;
					const sel = list.querySelector('[role="tab"][aria-selected="true"]');
					if (!sel) continue;
					const left = `${sel.offsetLeft}px`;
					const width = `${sel.offsetWidth}px`;
					if (pill.style.left === left && pill.style.width === width && pill.style.transform === "none") continue;
					if (!pill.dataset.pillMeasured) {
						pill.dataset.pillMeasured = "1";
						pill.style.transition = "none";
						pill.style.left = left;
						pill.style.width = width;
						pill.style.transform = "none";
						void pill.offsetWidth;
						pill.style.transition = "left 160ms ease, width 160ms ease";
					} else {
						pill.style.left = left;
						pill.style.width = width;
						pill.style.transform = "none";
					}
				}
			};
			syncSegmentPills();
			let pillRaf = 0;
			const schedulePillSync = () => {
				if (pillRaf) return;
				pillRaf = requestAnimationFrame(() => {
					pillRaf = 0;
					syncSegmentPills();
				});
			};
			ctx.effect(() => {
				const observer = new MutationObserver(schedulePillSync);
				observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected", "style", "class"] });
				window.addEventListener("resize", schedulePillSync);
				return () => {
					observer.disconnect();
					window.removeEventListener("resize", schedulePillSync);
				};
			}, "llm-mimo: segment pill sync");
			window.__mmStage = "before-inject";

				window.__slotsProbe = ctx.slots;
				try {
					ctx.slots.inject("settings.models.provider-card", () => ctx.slots.register({
						name: "settings.models.provider-card",
						key: ENTRY_ID,
						priority: -10,
						locale: NS,
						inject: () => controller.inject()
					}, ProviderCardDiag), "llm-mimo: provider card");
					// 自定义模型API(llm-mimo) 页:创建语义与旧自定义页一致——
					// 写 llm-pi-ai 的 providers.<route> + 派生凭据 <ROUTE>_API_KEY。
					ctx.slots.inject("settings.models.custom-api-card", () => ctx.slots.register({
						name: "settings.models.custom-api-card",
						key: "llm-mimo-custom",
						priority: -10,
						locale: NS,
						inject: () => ({
							createProvider: (route, entry, key) => writeCustomEntry(route, entry, key),
							commitCustom: (route, entry, key) => writeCustomEntry(route, entry, key),
							loadCustom: loadCustomEntry,
							probeEndpoint: async (request) => {
								const response = await ctx.remote.llm.discoverModels("llm-mimo", request);
								return response?.ok ? { ok: true, value: response.value } : { ok: false, error: response?.error?.message ?? "discovery refused" };
							}
						})
					}, CustomApiPageDiag), "llm-mimo: custom api page");
					window.__mmStage = "injected@apply";
				} catch (error) {
					window.__mmStage = "inject-error@apply: " + String(error?.message ?? error).slice(0, 120);
				}
			} catch (error) {
				console.error("llm-mimo client apply failed:", error);
				const diag = document.getElementById("llm-mimo-apply-fail") ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: "llm-mimo-apply-fail" }));
				diag.textContent = `LLM-MIMO-APPLY-FAIL: ${error?.stack ?? error?.message ?? String(error)}`;
				throw error;
			}
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
