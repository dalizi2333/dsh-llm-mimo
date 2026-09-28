/**
 * llm-mimo — MiMo-native LLM adapter for the Anthropic Messages dialect.
 *
 * Provider routes: "mimo" (this package, one route in v0).
 * Wire face: POST {baseURL}/v1/messages (baseURL default https://api.xiaomimimo.com/anthropic;
 * also serves token-plan-cn.xiaomimimo.com/anthropic — both verified by wire probes 2026-09-25).
 *
 * v0 scope: tools, streaming, thinking (empty signatures are native), inline base64 images,
 * disjoint usage mapping (inputTokens excludes cache reads), provider error taxonomy.
 * Deliberately absent (DeepSeek-platform baggage): Files API, image offload, account auth,
 * image pricing tables, output_config effort.
 */
import z from "@deepseek-ai/schemastery";
import { isVolatile } from "@deepseek-ai/cosmokit";
import {
	LlmAdapter, LlmError, ProviderRequestId, RetryPolicySchema, ToolCallId,
	attributionHeaders, isContextWindowExceededError, isQuotaExceededError
} from "@deepseek-ai/dsh-llm";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { EventSourceParserStream } from "eventsource-parser/stream";

const PROVIDER = "mimo";
export const name = "llm-mimo";
export const inject = ["llm", "credentials", "attachments"];

const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/anthropic";
const DEFAULT_API_KEY_ENV = "MIMO_NORMAL_API_KEY";
const DEFAULT_CONTEXT_WINDOW = 1024000;
const MEDIA_TYPES_BY_EXTENSION = {
	"wav": "audio/wav", "mp3": "audio/mpeg", "m4a": "audio/mp4", "aac": "audio/aac", "ogg": "audio/ogg", "flac": "audio/flac",
	"mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime", "mkv": "video/x-matroska",
	"pdf": "application/pdf"
};

function mediaTypeFromName(name) {
	const dot = String(name ?? "").lastIndexOf(".");
	if (dot < 0) return void 0;
	return MEDIA_TYPES_BY_EXTENSION[String(name).slice(dot + 1).toLowerCase()];
}
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_MEDIA_TYPES = new Set([
	"image/jpeg", "image/png", "image/gif", "image/webp"
]);
const MAX_INLINE_VIDEO_BYTES = 20 * 1024 * 1024;
/** 官方音频文档的容器集(音频传入方式页):MP3/WAV/FLAC/M4A/OGG。 */
const AUDIO_DOC_CONTAINERS = new Set(["audio/mpeg", "audio/wav", "audio/flac", "audio/mp4", "audio/ogg"]);

const DEFAULT_MODELS = [
	{ id: "mimo-v2.6-flash", name: "MiMo V2.6 Flash", contextWindow: 1024000, maxTokens: 128000, inputModalities: ["text", "image"] },
	{ id: "mimo-v2.6-pro", name: "MiMo V2.6 Pro", contextWindow: 1024000, maxTokens: 128000, inputModalities: ["text", "image"] },
	{ id: "mimo-v2.6-pro-ultraspeed", name: "MiMo V2.6 Pro Ultraspeed", contextWindow: 1024000, maxTokens: 128000, inputModalities: ["text", "image"] }
];

const catalogModel = z.object({
	id: z.string().required(),
	name: z.string(),
	description: z.string(),
	contextWindow: z.number().step(1).min(1),
	maxTokens: z.number().step(1).min(1),
	inputModalities: z.array(z.union(["text", "image", "audio", "video", "pdf"]))
});

export const Config = z.object({
	apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_ENV).volatile(),
	baseURL: z.string().default(DEFAULT_BASE_URL).volatile(),
	apiFormat: z.union(["anthropic", "chat", "responses"]).default("anthropic").volatile(),
	baseURLsJson: z.string().default(JSON.stringify({ anthropic: DEFAULT_BASE_URL, chat: "", responses: "" })).volatile(),
	providerName: z.string().default("MiMo").volatile(),
	maxTokens: z.number().step(1).min(1).default(128000).volatile(),
	defaultContextWindow: z.number().step(1).min(1).default(1024000).volatile(),
	modelsJson: z.string().default(JSON.stringify(DEFAULT_MODELS)).volatile(),
	customProviders: z.dict(z.object({
		displayName: z.string(),
		apiKeyEnv: z.string().role("credential-ref"),
		baseURL: z.string(),
		apiFormat: z.union(["anthropic", "chat", "responses"]),
		baseURLsJson: z.string(),
		modelsJson: z.string()
	})).default({}).volatile(),
	thinking: z.union(["enabled", "disabled"]).volatile(),
	temperature: z.number(),
	retryPolicy: RetryPolicySchema.volatile()
});

/** Parse the catalog from the GUI-edited JSON text; malformed drafts keep defaults. */
function parseModels(text, fallback = DEFAULT_MODELS) {
	try {
		const parsed = JSON.parse(text ?? "[]");
		if (!Array.isArray(parsed)) throw new Error("not an array");
		const models = parsed
			.map((entry) => entry && typeof entry === "object" ? entry : null)
			.filter(Boolean)
			.map((entry) => ({
				id: String(entry.id ?? "").trim(),
				...(entry.name ? { name: String(entry.name) } : {}),
				...(Number.isSafeInteger(entry.contextWindow) && entry.contextWindow > 0 ? { contextWindow: entry.contextWindow } : {}),
				...(Number.isSafeInteger(entry.maxTokens) && entry.maxTokens > 0 ? { maxTokens: entry.maxTokens } : {}),
				inputModalities: Array.isArray(entry.inputModalities) && entry.inputModalities.length > 0
					? entry.inputModalities.filter((m) => ["text", "image", "audio", "video", "pdf"].includes(m))
					: ["text"],
				// 视频理解可选参数(官方 video_url 块字段):videoFps∈[0.1,10] 抽帧率、
				// videoMediaResolution "default"|"max"。未设则不发该键(端点取默认)。
				...(typeof entry.videoFps === "number" && entry.videoFps >= 0.1 && entry.videoFps <= 10 ? { videoFps: entry.videoFps } : {}),
				...(entry.videoMediaResolution === "default" || entry.videoMediaResolution === "max" ? { videoMediaResolution: entry.videoMediaResolution } : {})
			}))
			.filter((entry) => entry.id.length > 0);
		return models.length > 0 ? models : fallback;
	} catch (_guiDraftMayBeHalfWritten) {
		return fallback;
	}
}

/** Unwrap cordis volatile live refs into a plain per-request connection snapshot. */
function connection(config) {
	const out = {};
	for (const [key, value] of Object.entries(config)) out[key] = isVolatile(value) ? value.get() : value;
	out.models = parseModels(out.modelsJson);
	return out;
}

const CUSTOM_ROUTE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/** 派生凭据名:与旧自定义页同规则 <ROUTE 大写>_API_KEY。 */
function deriveKeyRef(route) {
	return `${route.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}
/** 自定义供应商表:route → 连接项;坏草稿/非法路由/与主路由撞名的一律跳过。 */
function parseCustomProviders(raw) {
	try {
		if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
		const out = {};
		for (const [route, entry] of Object.entries(raw)) {
			if (!CUSTOM_ROUTE_PATTERN.test(route) || route === PROVIDER) continue;
			if (typeof entry !== "object" || entry === null) continue;
			out[route] = {
				displayName: typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName.trim() : route,
				apiKeyEnv: typeof entry.apiKeyEnv === "string" && entry.apiKeyEnv.trim().length > 0 ? entry.apiKeyEnv.trim() : deriveKeyRef(route),
				baseURL: typeof entry.baseURL === "string" ? entry.baseURL : "",
				apiFormat: ["anthropic", "chat", "responses"].includes(entry.apiFormat) ? entry.apiFormat : "anthropic",
				baseURLsJson: typeof entry.baseURLsJson === "string" ? entry.baseURLsJson : "{}",
				modelsJson: typeof entry.modelsJson === "string" ? entry.modelsJson : "[]"
			};
		}
		return out;
	} catch (_badEntry) {
		return {};
	}
}
/** 按路由取连接快照:自定义路由覆盖基础连接项,思考/温度等继承基础配置。 */
function connectionFor(config, route) {
	const base = connection(config);
	if (route === void 0 || route === PROVIDER) return base;
	const entry = parseCustomProviders(isVolatile(config.customProviders) ? config.customProviders.get() : config.customProviders)[route];
	if (entry === void 0) return base;
	return { ...base, ...entry, models: parseModels(entry.modelsJson, []) };
}

function object(value, detail = "expected an object field") {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new LlmError(`llm-mimo: ${detail}`, "MALFORMED_RESPONSE");
	return value;
}

function string(value) {
	if (typeof value !== "string") throw new LlmError("llm-mimo: expected a string field", "MALFORMED_RESPONSE");
	return value;
}

function malformed(detail) {
	throw new LlmError(`llm-mimo Messages stream: ${detail}`, "MALFORMED_RESPONSE");
}

function messagesApiRoot(baseURL) {
	const base = baseURL.replace(/\/+$/u, "");
	return new URL(base).pathname.endsWith("/v1") ? base : `${base}/v1`;
}

function modelInfo(connectionOptions, provider, model) {
	const configured = connectionOptions.models.find((entry) => entry.id === model);
	const contextWindow = configured?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
	return {
		...(configured === void 0 ? { provider, id: model, name: model, inputModalities: ["text"] } : catalogModelInfo(provider, configured)),
		context: { contextWindow },
		defaultMaxTokens: configured?.maxTokens ?? connectionOptions.maxTokens
	};
}

function catalogModelInfo(provider, configured) {
	return {
		provider,
		id: configured.id,
		name: configured.name ?? configured.id,
		...(configured.description === void 0 ? {} : { description: configured.description }),
		inputModalities: configured.inputModalities ?? ["text"]
	};
}

const LABELS_BY_MODALITY = { image: "图片", pdf: "PDF 文档", video: "视频", audio: "音频" };
/**
 * 一个内容块所需的模态词汇。audio 已有真发目标(2026-09-28 探针实锤:MiMo /v1 chat
 * 面双宿主 input_audio 真听,anthropic 面静默丢——勾选只对 chat 面诚实);未勾即拒绝,
 * 与其他模态同语义。注意 anthropic 面勾 audio/video 是假能力声明(服务端静默丢),
 * 勾选前先确认 apiFormat。
 */
function requiredModality(block) {
	if (block.type === "image") return "image";
	if (block.type === "file") {
		const media = mediaTypeFromName(block.attachment?.name);
		if (media === "application/pdf") return "pdf";
		if (media !== void 0 && media.startsWith("video/")) return "video";
		if (media !== void 0 && media.startsWith("audio/")) return "audio";
		return void 0;
	}
	return void 0;
}
/**
 * 全量载荷模态门禁:发送前对请求携带的完整消息历史逐块检查,模型目录未勾选的
 * 模态直接明拒(消灭静默丢弃)。切换模型不拦——切换后的首次发送自然带全量历史,
 * 在此处被拦下,这是 owner 拍板的语义(2026-09-28)。
 */
function enforceModalities(options, connectionOptions) {
	const allowed = modelInfo(connectionOptions, options.provider, options.model).inputModalities ?? ["text"];
	const seen = /* @__PURE__ */ new Set();
	for (const message of options.messages) {
		for (const block of message.content ?? []) {
			const modality = requiredModality(block);
			if (modality === void 0 || seen.has(modality)) continue;
			seen.add(modality);
			const label = LABELS_BY_MODALITY[modality];
			if (!allowed.includes(modality)) throw new LlmError(
				`模型 "${options.model}" 未启用「${label}」输入，但本次会话包含「${label}」附件或历史；请换用支持「${label}」输入的模型，或新建会话。`,
				"INVALID_REQUEST"
			);
		}
	}
}

/** Historical tool arguments that cannot be parsed keep empty input; durable content stays unchanged. */
function toolInput(raw) {
	let value;
	try {
		value = JSON.parse(raw);
	} catch (_invalidToolHistoryJson) {
		return {};
	}
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function unsupported(type) {
	throw new LlmError(`llm-mimo Messages cannot represent ${type}`, "UNSUPPORTED_CONTENT");
}

function assistant(message, model, onReplayDegrade) {
	const replay = readReplay(message, model, onReplayDegrade);
	return message.content.map((block, index) => {
		switch (block.type) {
			case "text": return { type: "text", text: block.text };
			case "reasoning": return {
				type: "thinking",
				thinking: block.text,
				...replay?.[index]?.signature === void 0 ? {} : { signature: replay[index].signature }
			};
			case "tool-call": return { type: "tool_use", id: block.id, name: block.name, input: toolInput(block.arguments) };
			default: return unsupported(`assistant content ${block.type}`);
		}
	});
}

function replayState(model, blocks) {
	return {
		response: { kind: "mimo-messages", version: 1, model },
		blocks
	};
}

function readReplay(message, model, onDegrade) {
	try {
		return validateReplay(message, model);
	} catch (error) {
		if (!(error instanceof LlmError) || error.code !== "INVALID_REPLAY_STATE") throw error;
		onDegrade?.(error.message);
		return void 0;
	}
}

function validateReplay(message, model) {
	if (message.source.kind !== "model" || message.source.replayState === void 0) return void 0;
	const fail = (detail) => {
		throw new LlmError(`llm-mimo Messages replay: ${detail}`, "INVALID_REPLAY_STATE");
	};
	const envelope = object(message.source.replayState, "INVALID_REPLAY_STATE");
	const response = object(envelope.response, "INVALID_REPLAY_STATE");
	if (response.kind !== "mimo-messages" || response.version !== 1) return fail("unsupported kind or version");
	if (response.model !== message.source.model) return fail("model does not match assistant source model");
	if (!Array.isArray(envelope.blocks) || envelope.blocks.length !== message.content.length) return fail("block count mismatch");
	const blocks = envelope.blocks.map((value, index) => {
		const block = object(value, "INVALID_REPLAY_STATE");
		if (block.type !== message.content[index]?.type || block.type !== "text" && block.type !== "reasoning" && block.type !== "tool-call") return fail("block type mismatch");
		if (block.signature !== void 0 && (block.type !== "reasoning" || typeof block.signature !== "string")) return fail("invalid signature");
		return {
			type: block.type,
			...typeof block.signature === "string" ? { signature: block.signature } : {}
		};
	});
	return response.model === model ? blocks : void 0;
}

/**
 * Serialize one complete Messages request. Images resolve to inline base64;
 * user and tool-result content omits reasoning and tool-call blocks; empty
 * user messages are skipped; trailing system messages collapse into the
 * leading system slot (MiMo declares no in-history system support).
 */
function serialize(options, connectionOptions, images) {
	const input = (blocks) => blocks.flatMap((block) => {
		if (block.type === "text") return block.text ? [{ type: "text", text: block.text }] : [];
		if (block.type === "reasoning" || block.type === "tool-call") return [];
		if (block.type === "file") {
			const media = images.get(block.attachment.attachmentId);
			if (media === void 0) throw new LlmError("llm-mimo: request media file is missing", "INVALID_REQUEST");
			const b64 = Buffer.from(media.data).toString("base64");
			if (media.mediaType === "application/pdf") return [{
				type: "document",
				source: { type: "base64", media_type: "application/pdf", data: b64 }
			}];
			if (media.mediaType.startsWith("audio/")) return [{
				type: "input_audio",
				input_audio: { data: b64, format: media.mediaType.slice("audio/".length) }
			}];
			if (media.mediaType.startsWith("video/")) return [{
				type: "video_url",
				video_url: { url: `data:${media.mediaType};base64,${b64}` }
			}];
			return unsupported(`file media type ${media.mediaType}`);
		}
		if (block.type !== "image") return unsupported(`user/tool-result content ${block.type}`);
		const version = images.get(block.attachment.attachmentId);
		if (version === void 0) throw new LlmError("llm-mimo: request image is missing", "INVALID_REQUEST");
		return [{
			type: "image",
			source: { type: "base64", media_type: version.mediaType, data: Buffer.from(version.data).toString("base64") }
		}];
	});
	const messages = [];
	let historySystem;
	for (const message of options.messages) {
		if (message.role === "developer") return unsupported("developer messages (route declares no tool-update support)");
		if (message.role === "system") {
			const texts = message.content.filter((block) => block.type === "text");
			if (texts.length !== message.content.length) return unsupported("non-text system message");
			const text = texts.map((block) => block.text).join("");
			if (messages.length > 0) return unsupported("mid-history system message (route declares no in-history system support)");
			historySystem = text;
			continue;
		}
		const content = message.role === "assistant" ? assistant(message, options.model, void 0)
			: message.role === "tool" ? [{
				type: "tool_result",
				tool_use_id: message.toolCallId,
				content: input(message.content),
				...message.isError === void 0 ? {} : { is_error: message.isError }
			}] : message.content.flatMap((block) => input([block]));
		if (message.role === "user" && content.length === 0) continue;
		const wireRole = message.role === "tool" ? "user" : message.role;
		const previous = messages.at(-1);
		if (previous?.role === wireRole) previous.content.push(...content);
		else messages.push({ role: wireRole, content });
	}
	const pending = /* @__PURE__ */ new Set();
	for (const message of messages) if (message.role === "assistant") {
		const calls = message.content.filter((block) => block.type === "tool_use");
		for (const call of calls) if (pending.has(call.id)) throw new LlmError("llm-mimo: duplicate tool call id", "INVALID_REQUEST");
		for (const call of calls) pending.add(call.id);
	} else if (message.role === "user") {
		const results = message.content.filter((block) => block.type === "tool_result");
		for (const result of results) if (!pending.delete(result.tool_use_id)) throw new LlmError("llm-mimo: tool result has no matching call", "INVALID_REQUEST");
		if (pending.size > 0) throw new LlmError("llm-mimo: tool calls need immediate results", "INVALID_REQUEST");
		message.content = [...results, ...message.content.filter((block) => block.type !== "tool_result")];
	}
	if (pending.size > 0) throw new LlmError("llm-mimo: history ends with unresolved tool calls", "INVALID_REQUEST");
	const thinkingDisabled = connectionOptions.thinking === "disabled" || options.purpose === "session-title";
	const system = [options.system, historySystem].filter(Boolean).join("\n\n");
	return {
		model: options.model,
		stream: true,
		messages,
		max_tokens: options.maxTokens ?? connectionOptions.maxTokens,
		thinking: { type: thinkingDisabled ? "disabled" : "enabled" },
		...system.length === 0 ? {} : { system },
		...options.temperature === void 0 && connectionOptions.temperature === void 0 ? {} : { temperature: options.temperature ?? connectionOptions.temperature },
		...options.stop === void 0 ? {} : { stop_sequences: options.stop },
		...options.tools === void 0 ? {} : { tools: options.tools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			input_schema: tool.parameters,
			...tool.deferLoading === true ? { defer_loading: true } : {}
		})) }
	};
}

/** Normalize HTTP and in-band Messages errors into provider-neutral failures. */
function providerError(raw, status, headers) {
	const envelope = typeof raw === "object" && raw !== null ? raw : {};
	const error = typeof envelope.error === "object" && envelope.error !== null ? envelope.error : {};
	const message = typeof error.message === "string" ? error.message : `MiMo Messages request failed (${status ?? "stream error"})`;
	const type = typeof error.type === "string" ? error.type : "";
	const detail = `${type} ${typeof error.code === "string" ? error.code : ""} ${message}`;
	let code;
	if (status === 401 || status === 403 || ["authentication_error", "permission_error"].includes(type)) code = "AUTH";
	else if (isQuotaExceededError(detail) || status === 402) code = "QUOTA";
	else if (status === 429 || type === "rate_limit_error") code = "RATE_LIMIT";
	else if (isContextWindowExceededError(detail)) code = "CONTEXT_WINDOW_EXCEEDED";
	else if (status === 400 || status === 413 || type === "invalid_request_error") code = "INVALID_REQUEST";
	else if (status !== void 0 && status >= 500 || ["api_error", "overloaded_error"].includes(type)) code = "SERVER";
	else code = status === void 0 ? "SERVER" : `HTTP_${status}`;
	const retry = headers?.get("retry-after");
	const delay = retry == null ? NaN : /^\d+(?:\.\d+)?$/u.test(retry) ? Number(retry) * 1e3 : Date.parse(retry) - Date.now();
	const id = headers?.get("request-id") ?? headers?.get("x-request-id");
	return new LlmError(message, code, {
		...(status === void 0 ? {} : { status }),
		...(id ? { requestId: ProviderRequestId(id) } : {}),
		...(Number.isFinite(delay) && delay > 0 ? { providerRetryAfterMs: delay } : {})
	});
}

/** Anthropic 面每帧带 string type 字段;OpenAI 兼容面(chat)的 chunk 没有 type、以 data: [DONE] 收尾。 */
async function* parseSse(body, activity, requireEventType = true) {
	const events = body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream({ onComment: activity }));
	for await (const frame of events) {
		activity();
		if (frame.data.trim() === "[DONE]") return;
		let raw;
		try {
			raw = JSON.parse(frame.data);
		} catch (_invalidSseJson) {
			throw new LlmError("llm-mimo: Messages SSE contains invalid JSON", "MALFORMED_RESPONSE");
		}
		const event = object(raw);
		if (requireEventType && (typeof event.type !== "string" || frame.event !== void 0 && frame.event !== event.type)) throw new LlmError("llm-mimo: Messages SSE event type mismatch", "MALFORMED_RESPONSE");
		if (event.type === "error") throw providerError(event, void 0);
		yield event;
	}
}

function startBlock(event, index) {
	const native = object(event.content_block);
	let content;
	let replay;
	switch (native.type) {
		case "text":
			content = { type: "text", text: string(native.text) };
			replay = { type: "text" };
			break;
		case "thinking":
			content = { type: "reasoning", text: string(native.thinking) };
			replay = { type: "reasoning", ...native.signature === void 0 ? {} : { signature: string(native.signature) } };
			break;
		case "tool_use":
			content = {
				type: "tool-call",
				id: ToolCallId(string(native.id)),
				name: string(native.name),
				arguments: JSON.stringify(object(native.input))
			};
			if (!content.id || !content.name) return malformed("empty tool identity");
			replay = { type: "tool-call" };
			break;
		default: throw new LlmError(`llm-mimo: Messages response block ${String(native.type)} is not supported`, "UNSUPPORTED_CONTENT");
	}
	return { index, content, replay, closed: false, json: "" };
}

function deltaChunk(block, raw) {
	const delta = object(raw);
	const content = block.content;
	if (delta.type === "text_delta" && content.type === "text") {
		const text = string(delta.text);
		content.text += text;
		return { type: "text-delta", index: block.index, text };
	}
	if (delta.type === "thinking_delta" && content.type === "reasoning") {
		const text = string(delta.thinking);
		content.text += text;
		return { type: "reasoning-delta", index: block.index, text };
	}
	if (delta.type === "signature_delta" && content.type === "reasoning") {
		block.replay.signature = (block.replay.signature ?? "") + string(delta.signature);
		return;
	}
	if (delta.type === "input_json_delta" && content.type === "tool-call") {
		const argumentsDelta = string(delta.partial_json);
		block.json += argumentsDelta;
		return { type: "tool-call-delta", index: block.index, id: content.id, argumentsDelta };
	}
	return malformed(`unsupported delta ${String(delta.type)} for ${content.type}`);
}

function stopReason(raw) {
	switch (raw) {
		case "end_turn":
		case "stop_sequence":
		case "refusal": return { kind: "stop" };
		case "tool_use": return { kind: "tool-calls" };
		case "max_tokens": return { kind: "max-tokens" };
		default: return malformed(`unsupported stop reason ${String(raw)}`);
	}
}

function updateUsage(usage, raw) {
	const fields = object(raw);
	for (const [wire, local] of Object.entries({
		input_tokens: "inputTokens",
		output_tokens: "outputTokens",
		cache_read_input_tokens: "cacheReadTokens",
		cache_creation_input_tokens: "cacheWriteTokens"
	})) {
		const value = fields[wire];
		if (value === void 0) continue;
		if (!Number.isSafeInteger(value) || value < 0) return malformed(`invalid ${wire}`);
		usage[local] = value;
	}
}

async function* translate(events, model) {
	const blocks = /* @__PURE__ */ new Map();
	const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
	let started = false;
	let reason;
	for await (const event of events) {
		if (event.type === "message_start") {
			if (started) return malformed("duplicate message_start");
			if (event.message !== void 0) updateUsage(usage, object(event.message).usage ?? {});
			started = true;
			continue;
		}
		if (!["content_block_start", "content_block_delta", "content_block_stop", "message_delta", "message_stop"].includes(String(event.type))) continue;
		if (!started) return malformed("event precedes message_start");
		if (event.type === "content_block_start") {
			const wireIndex = event.index;
			if (!Number.isSafeInteger(wireIndex) || wireIndex < 0) return malformed("invalid block index");
			if (blocks.has(wireIndex) || reason !== void 0) return malformed("block starts after settlement or repeats an index");
			const block = startBlock(event, blocks.size);
			blocks.set(wireIndex, block);
			yield { type: "block-start", index: block.index, blockType: block.content.type };
			if (block.content.type === "text" || block.content.type === "reasoning") {
				if (block.content.text) yield {
					type: block.content.type === "text" ? "text-delta" : "reasoning-delta",
					index: block.index,
					text: block.content.text
				};
			} else yield { type: "tool-call-delta", index: block.index, id: block.content.id, name: block.content.name, argumentsDelta: "" };
		} else if (event.type === "content_block_delta" || event.type === "content_block_stop") {
			const block = blocks.get(event.index);
			if (block === void 0 || block.closed) return malformed("delta/stop without an open block");
			if (event.type === "content_block_delta") {
				const chunk = deltaChunk(block, event.delta);
				if (chunk !== void 0) yield chunk;
			} else {
				block.closed = true;
				if (block.content.type === "tool-call" && block.json.length > 0) block.content.arguments = block.json;
				yield { type: "block-end", index: block.index, block: { ...block.content } };
			}
		} else if (event.type === "message_delta") {
			const delta = object(event.delta);
			if (delta.stop_reason != null) reason = stopReason(delta.stop_reason);
			if (event.usage !== void 0) updateUsage(usage, event.usage);
		} else {
			if (reason === void 0 || [...blocks.values()].some((block) => !block.closed)) return malformed("message_stop without settled blocks and stop reason");
			if (blocks.size === 0 && reason.kind === "stop") throw new LlmError("llm-mimo: Messages returned no content", "EMPTY_RESPONSE");
			if (reason.kind !== "max-tokens") for (const { content } of blocks.values()) {
				if (content.type !== "tool-call") continue;
				let parsed;
				try {
					parsed = JSON.parse(content.arguments);
				} catch (_invalidProviderToolJson) {
					return malformed("tool input is invalid JSON");
				}
				object(parsed);
			}
			usage.totalTokens = usage.inputTokens + usage.outputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
			yield { type: "usage", usage };
			yield { type: "finish", reason, replayState: replayState(model, [...blocks.values()].map((block) => block.replay)) };
			return;
		}
	}
	throw new LlmError("llm-mimo: Messages stream ended before message_stop", "STREAM_CLOSED");
}

/** OpenAI Chat Completions 请求体:文本/工具对话;多模态形状已探针实锤(百炼 compatible-mode:32px 图回答颜色、PDF file 块引用原文均真读,2026-09-28)。 */
function serializeChat(options, connectionOptions, media) {
	const messages = [];
	const userParts = (blocks) => blocks.flatMap((block) => {
		if (block.type === "text") return block.text ? [{ type: "text", text: block.text }] : [];
		if (block.type === "image") {
			const version = media?.get(block.attachment.attachmentId);
			if (version === void 0) throw new LlmError("llm-mimo: request image is missing", "INVALID_REQUEST");
			return [{ type: "image_url", image_url: { url: `data:${version.mediaType};base64,${Buffer.from(version.data).toString("base64")}` } }];
		}
		if (block.type === "file") {
			const version = media?.get(block.attachment.attachmentId);
			if (version === void 0) throw new LlmError("llm-mimo: request media file is missing", "INVALID_REQUEST");
			if (version.mediaType === "application/pdf") return [{
				type: "file",
				file: { filename: block.attachment.name, file_data: `data:application/pdf;base64,${Buffer.from(version.data).toString("base64")}` }
			}];
			if (version.mediaType.startsWith("video/")) {
				const entry = connectionOptions.models.find((m) => m.id === options.model);
				return [{
					type: "video_url",
					video_url: { url: `data:${version.mediaType};base64,${Buffer.from(version.data).toString("base64")}` },
					...(entry?.videoFps === void 0 ? {} : { fps: entry.videoFps }),
					...(entry?.videoMediaResolution === void 0 ? {} : { media_resolution: entry.videoMediaResolution })
				}];
			}
			if (version.mediaType.startsWith("audio/")) {
				// 官方文档形(mimo.mi.com 音频传入方式):input_audio.data 放 URL 或
				// "data:{mime};base64,..." 前缀串,无 format 键;容器限
				// MP3/WAV/FLAC/M4A/OGG。dataURL 自描述 MIME,容器集即官方集。
				if (!AUDIO_DOC_CONTAINERS.has(version.mediaType)) return unsupported(`chat 线路暂不支持 ${version.mediaType} 音频容器(官方支持 mp3/wav/flac/m4a/ogg)`);
				return [{
					type: "input_audio",
					input_audio: { data: `data:${version.mediaType};base64,${Buffer.from(version.data).toString("base64")}` }
				}];
			}
			return unsupported(`chat 线路暂不支持 ${version.mediaType} 文件输入`);
		}
		return unsupported(`user content ${block.type}`);
	});
	// 一次性调用的 system 通道(GenerateOptions.system)映射为首条 system 消息,
	// 与 loop 请求的头部 system 消息同轨;loop 请求该字段未定义。
	if (typeof options.system === "string" && options.system.length > 0) messages.push({ role: "system", content: options.system });
	for (const message of options.messages) {
		if (message.role === "system") {
			const text = message.content.filter((block) => block.type === "text").map((block) => block.text).join("");
			messages.push({ role: "system", content: text });
			continue;
		}
		if (message.role === "developer") return unsupported("developer messages (chat 线路暂未支持)");
		if (message.role === "assistant") {
			const text = message.content.filter((block) => block.type === "text").map((block) => block.text).join("");
			const calls = message.content.filter((block) => block.type === "tool-call");
			messages.push({
				role: "assistant",
				...(calls.length > 0
					? {
						...(text.length > 0 ? { content: text } : { content: null }),
						tool_calls: calls.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } }))
					}
					: { content: text })
			});
			continue;
		}
		if (message.role === "tool") {
			const text = message.content.filter((block) => block.type === "text").map((block) => block.text).join("");
			messages.push({ role: "tool", tool_call_id: message.toolCallId, content: text });
			continue;
		}
		const parts = userParts(message.content);
		if (parts.length > 0) messages.push({ role: "user", content: parts });
	}
	return {
		model: options.model,
		stream: true,
		messages,
		max_tokens: options.maxTokens ?? connectionOptions.maxTokens,
		...options.temperature === void 0 && connectionOptions.temperature === void 0 ? {} : { temperature: options.temperature ?? connectionOptions.temperature },
		...options.stop === void 0 ? {} : { stop: options.stop },
		...options.tools === void 0 ? {} : { tools: options.tools.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.parameters } })) }
	};
}

/** OpenAI Chat Completions SSE → StreamChunk:reasoning_content/content/tool_calls 三类块。 */
async function* translateChat(events, model) {
	const blocks = [];
	const byKey = /* @__PURE__ */ new Map();
	const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
	let reason;
	const startBlock = (type, content, key) => {
		const block = { index: blocks.length, type, content, replay: { type: type === "tool-call" ? "tool-call" : type }, closed: false };
		blocks.push(block);
		byKey.set(key, block);
		return block;
	};
	for await (const event of events) {
		const choice = Array.isArray(event.choices) ? event.choices[0] : void 0;
		const delta = choice?.delta;
		if (delta !== void 0 && delta !== null) {
			if (typeof delta.reasoning_content === "string" && delta.reasoning_content.length > 0) {
				let block = byKey.get("reasoning");
				if (block === void 0) {
					block = startBlock("reasoning", { type: "reasoning", text: "" }, "reasoning");
					yield { type: "block-start", index: block.index, blockType: "reasoning" };
				}
				block.content.text += delta.reasoning_content;
				yield { type: "reasoning-delta", index: block.index, text: delta.reasoning_content };
			}
			if (typeof delta.content === "string" && delta.content.length > 0) {
				let block = byKey.get("text");
				if (block === void 0) {
					block = startBlock("text", { type: "text", text: "" }, "text");
					yield { type: "block-start", index: block.index, blockType: "text" };
				}
				block.content.text += delta.content;
				yield { type: "text-delta", index: block.index, text: delta.content };
			}
			if (Array.isArray(delta.tool_calls)) {
				for (const call of delta.tool_calls) {
					const key = `tool-${String(call.index ?? 0)}`;
					let block = byKey.get(key);
					if (block === void 0) {
						block = startBlock("tool-call", { type: "tool-call", id: String(call.id ?? ""), name: String(call.function?.name ?? ""), arguments: "" }, key);
						yield { type: "block-start", index: block.index, blockType: "tool-call" };
						yield { type: "tool-call-delta", index: block.index, id: block.content.id, name: block.content.name, argumentsDelta: "" };
					}
					const argumentsDelta = typeof call.function?.arguments === "string" ? call.function.arguments : "";
					if (argumentsDelta.length > 0) {
						block.content.arguments += argumentsDelta;
						yield { type: "tool-call-delta", index: block.index, argumentsDelta };
					}
				}
			}
			if (choice.finish_reason != null) {
				reason = choice.finish_reason === "tool_calls" ? { kind: "tool-calls" } : choice.finish_reason === "length" ? { kind: "max-tokens" } : { kind: "stop" };
			}
		}
		if (event.usage !== void 0 && event.usage !== null) {
			usage.inputTokens = Number(event.usage.prompt_tokens ?? event.usage.input_tokens ?? usage.inputTokens) || usage.inputTokens;
			usage.outputTokens = Number(event.usage.completion_tokens ?? event.usage.output_tokens ?? usage.outputTokens) || usage.outputTokens;
		}
	}
	for (const block of blocks) {
		if (block.closed) continue;
		block.closed = true;
		yield { type: "block-end", index: block.index, block: { ...block.content } };
	}
	if (reason === void 0) throw new LlmError("llm-mimo: Chat stream ended without a finish reason", "STREAM_CLOSED");
	if (blocks.length === 0 && reason.kind === "stop") throw new LlmError("llm-mimo: Chat returned no content", "EMPTY_RESPONSE");
	usage.totalTokens = usage.inputTokens + usage.outputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
	yield { type: "usage", usage };
	yield { type: "finish", reason, replayState: replayState(model, blocks.map((block) => block.replay)) };
}

class MimoAdapter extends LlmAdapter {
	constructor(dependencies) {
		super();
		this.dependencies = dependencies;
	}
	providerInfo(provider) {
		return { id: provider, name: this.dependencies.options().providerName ?? "MiMo" };
	}
	providerRetryPolicy() {
		return void 0;
	}
	imageRequestPricing() {
		return void 0;
	}
	async listModels(provider) {
		const options = this.dependencies.options(provider);
		return options.models.map((configured) => catalogModelInfo(provider, configured));
	}
	async resolveModel(provider, model) {
		return modelInfo(this.dependencies.options(provider), provider, model);
	}
	async prepareCall(provider, model) {
		const current = this.dependencies.options(provider);
		return Promise.resolve({
			model: modelInfo(current, provider, model),
			stream: (options) => this.generate(options, current)
		});
	}
	stream(options) {
		return this.generate(options, this.dependencies.options(options.provider));
	}
	async *generate(options, connectionOptions) {
		try {
			yield* this.request(options, connectionOptions);
		} catch (error) {
			if (options.signal?.aborted) throw new LlmError("llm-mimo: Messages request aborted", "ABORTED", { cause: error });
			if (error instanceof LlmError) throw error;
			throw new LlmError("llm-mimo: Messages transport failed", "TRANSPORT", { cause: error });
		}
	}
	async *request(options, connectionOptions) {
		options.signal?.throwIfAborted();
		enforceModalities(options, connectionOptions);
		const view = this.dependencies.promptView?.(options) ?? options;
		const apiKey = await this.dependencies.resolveKey(connectionOptions);
		const format = connectionOptions.apiFormat ?? "anthropic";
		if (format === "responses") throw new LlmError(
			"llm-mimo: OpenAI Responses 线路尚未接入(链接已可存储;当前请使用 Anthropic Messages 或 OpenAI Chat Completions)",
			"UNSUPPORTED_FORMAT"
		);
		if (format === "chat") {
			const media = await this.prepareImages(options.messages, connectionOptions, options.signal);
			const body = serializeChat(view, connectionOptions, media);
			const response = await fetch(`${messagesApiRoot(connectionOptions.baseURL)}/chat/completions`, {
				method: "POST",
				signal: options.signal,
				body: JSON.stringify(body),
				redirect: "error",
				headers: {
					...attributionHeaders(),
					"content-type": "application/json",
					"accept": "text/event-stream",
					"authorization": `Bearer ${apiKey}`
				}
			});
			if (!response.ok) {
				const text = await response.text();
				let raw;
				try {
					raw = JSON.parse(text);
				} catch (_nonJsonGatewayError) {}
				const failure = providerError(raw, response.status, response.headers);
				throw new LlmError(failure.message, failure.code, { ...failure.failure, cause: new Error(text) });
			}
			if (response.body === null) throw new LlmError("llm-mimo: Chat returned no response body", "EMPTY_RESPONSE");
			yield* translateChat(parseSse(response.body, () => {}, false), options.model);
			return;
		}
		const images = await this.prepareImages(options.messages, connectionOptions, options.signal);
		const body = serialize(view, connectionOptions, images);
		const response = await fetch(`${messagesApiRoot(connectionOptions.baseURL)}/messages`, {
			method: "POST",
			signal: options.signal,
			body: JSON.stringify(body),
			redirect: "error",
			headers: {
				...attributionHeaders(),
				"content-type": "application/json",
				"accept": "text/event-stream",
				"x-api-key": apiKey,
				"anthropic-version": ANTHROPIC_VERSION
			}
		});
		if (!response.ok) {
			const text = await response.text();
			let raw;
			try {
				raw = JSON.parse(text);
			} catch (_nonJsonGatewayError) {}
			const failure = providerError(raw, response.status, response.headers);
			throw new LlmError(failure.message, failure.code, { ...failure.failure, cause: new Error(text) });
		}
		if (response.body === null) throw new LlmError("llm-mimo: Messages returned no response body", "EMPTY_RESPONSE");
		yield* translate(parseSse(response.body, () => {}), options.model);
	}
	async prepareImages(messages, connectionOptions, signal) {
		const images = /* @__PURE__ */ new Map();
		const resolveAttachments = this.dependencies.resolveAttachments;
		const attachments = resolveAttachments?.();
		for (const message of messages) {
			for (const block of message.content ?? []) {
				if (block.type !== "image" && block.type !== "file") continue;
				const id = block.attachment.attachmentId;
				if (images.has(id)) continue;
				if (block.type === "image") {
					if (attachments === void 0) throw new LlmError("llm-mimo: image content requires the attachments service", "INVALID_REQUEST");
					const stored = await attachments.readImage(block.attachment, signal);
					const mediaType = block.attachment.mediaType ?? "image/png";
					if (!ANTHROPIC_MEDIA_TYPES.has(mediaType)) throw new LlmError(`llm-mimo: unsupported image media type ${mediaType}`, "INVALID_REQUEST");
					images.set(id, { mediaType, data: stored.data });
				} else {
					if (attachments === void 0) throw new LlmError("llm-mimo: audio/video content requires the attachments service", "INVALID_REQUEST");
					const mediaType = mediaTypeFromName(block.attachment.name);
					if (mediaType === void 0) throw new LlmError(`llm-mimo: unsupported media file name "${block.attachment.name}"`, "INVALID_REQUEST");
					// 内联 base64 视频的保守上限:超出即显式拒绝,不把大文件读进内存/请求体。
					if (mediaType.startsWith("video/") && (block.attachment.bytes ?? 0) > MAX_INLINE_VIDEO_BYTES) throw new LlmError(
						`视频 "${block.attachment.name}"（${Math.round((block.attachment.bytes ?? 0) / 1048576)} MB）超过内联上限 ${MAX_INLINE_VIDEO_BYTES / 1048576} MB，无法随请求发送。`,
						"INVALID_REQUEST"
					);
					const chunks = [];
					for await (const chunk of attachments.readFileStream(block.attachment, signal)) chunks.push(chunk);
					images.set(id, { mediaType, data: Buffer.concat(chunks.map((c) => Buffer.from(c))) });
				}
			}
		}
		return images;
	}
}

/** 解析当前生效的 API 密钥:凭据服务优先,启动环境兜底;两者皆空即抛错。 */
async function resolveApiKey(ctx, options) {
	const refName = options.apiKeyEnv;
	const credentials = ctx.get("credentials");
	let value;
	if (credentials !== void 0) {
		const resolved = await credentials.resolve(credentialRef(refName));
		if (resolved !== void 0) value = resolved.value;
	} else {
		const ambient = launchEnvironmentOf(ctx).get(refName);
		if (ambient !== void 0 && ambient.value.length > 0) value = ambient.value;
	}
	if (value === void 0 || value.length === 0) throw new LlmError(
		`llm-mimo: no credential for provider route "${PROVIDER}"; its profile resolves ${refName}, which is not set — store ${refName} through the credentials service (the web Models page writes it) or export it in the launching environment`,
		"MISSING_CREDENTIAL"
	);
	return value;
}

export async function apply(ctx, config) {
	const adapter = new MimoAdapter({
		options: (route) => connectionFor(config, route),
		resolveKey: (connectionOptions) => resolveApiKey(ctx, connectionOptions),
		resolveAttachments: () => ctx.get("attachments"),
		promptView: (options) => promptView(options)
	});
	const settingsNs = ctx.fiber.entry?.options.id ?? "llm-mimo";
	const customs = () => parseCustomProviders(isVolatile(config.customProviders) ? config.customProviders.get() : config.customProviders);
	// ---- 提示词接口（promptbook 私有体系的缝）----
	// llm-mimo 默认不对系统提示词/工具提示词动手（无注册源时零行为变化）；
	// promptbook 经 ctx.llmMimo.registerPromptSource 挂源后，本包在每次 dispatch
	// 问询并替换"实际使用的"文本。契约：
	//   - resolveSystem({provider, model, system}) → string | undefined（整体替换）
	//   - resolveToolDescription({provider, model, toolName, description}) → string | undefined
	//   - undefined = 该项不改；只换文本，绝不碰 tool 的 name/parameters（历史 tool_use 以名为键）
	//   - resolve* 必须是 (provider, model) 的确定性纯函数：缓存按前缀命中，system/tools
	//     位于请求头部，抖动即全量 miss（TOOLS.md 原则 3；动态片段走尾部追加通道）
	//   - 作用域保证：问询只发生在本适配器 dispatch 内，而适配器只挂 mimo+customProviders
	//     ——非 llm-mimo 托管的模型结构性够不到此接口，promptbook GUI 只列 listHostedModels
	const promptSources = new Set();
	const promptView = (options) => {
		if (promptSources.size === 0) return options;
		let system = options.system;
		let messages = options.messages;
		let tools = options.tools;
		const frame = { provider: options.provider, model: options.model };
		// 系统提示词有两条供给通道(loop 请求=messages 头部 system 消息,options.system
		// 未定义;一次性调用=options.system),问询输入取合并文本,替换结果写回唯一通道。
		const headSystemTexts = [];
		for (const message of messages) {
			if (message.role !== "system") break;
			headSystemTexts.push(message.content.filter((block) => block.type === "text").map((block) => block.text).join(""));
		}
		const combined = [system, ...headSystemTexts].filter(Boolean).join("\n\n");
		for (const source of promptSources) {
			if (typeof source.resolveSystem === "function") {
				const next = source.resolveSystem({ ...frame, system: combined });
				if (typeof next === "string" && next !== combined) {
					if (headSystemTexts.length > 0) {
						// 写回头部 system 消息(多条合并为一条,确定性形状),并清空
						// options.system 避免 serialize 二次拼接。
						let replaced = false;
						messages = messages.map((message) => {
							if (message.role !== "system") return message;
							if (replaced) return void 0;
							replaced = true;
							return { ...message, content: [{ type: "text", text: next }] };
						}).filter((message) => message !== void 0);
						system = void 0;
					} else {
						system = next;
					}
				}
			}
			if (tools !== void 0 && typeof source.resolveToolDescription === "function") {
				let changed = false;
				const mapped = tools.map((tool) => {
					const next = source.resolveToolDescription({ ...frame, toolName: tool.name, description: tool.description });
					if (typeof next !== "string" || next === tool.description) return tool;
					changed = true;
					return { ...tool, description: next };
				});
				if (changed) tools = mapped;
			}
		}
		return system === options.system && tools === options.tools && messages === options.messages ? options : { ...options, system, messages, tools };
	};
	ctx.provide("llmMimo", {
		/** 枚举托管面（promptbook GUI 的模型下拉数据源）：mimo + 全部 customProviders。 */
		listHostedModels() {
			const out = [];
			for (const route of [PROVIDER, ...Object.keys(customs()).sort()]) {
				for (const entry of connectionFor(config, route).models) out.push({ provider: route, ...catalogModelInfo(route, entry) });
			}
			return out;
		},
		registerPromptSource(source) {
			if (typeof source !== "object" || source === null) throw new Error("llm-mimo: prompt source must be an object with resolve* methods");
			promptSources.add(source);
			return () => promptSources.delete(source);
		}
	});
	// 路由与目录随 customProviders 动态维护:diff 后 replace(loader/volatile-update
	// 是配置 volatile 更新的正规事件,与 pi-ai 同机制)。
	let adapterHandle;
	let adapterFacts;
	const ensureAdapter = () => {
		const routes = [PROVIDER, ...Object.keys(customs()).sort()];
		const facts = JSON.stringify(routes);
		if (facts === adapterFacts) return;
		if (adapterHandle === void 0) adapterHandle = ctx.llm.registerAdapter(routes, adapter);
		else adapterHandle.replace(routes);
		adapterFacts = facts;
	};
	let dirHandle;
	let dirFacts;
	const ensureDirectory = () => {
		const entries = [
			{ provider: PROVIDER, displayName: connection(config).providerName ?? "MiMo", settingsNs, settingsPath: [] },
			...Object.entries(customs()).sort().map(([route, entry]) => ({ provider: route, displayName: entry.displayName, settingsNs, settingsPath: ["customProviders", route] }))
		];
		const facts = JSON.stringify(entries);
		if (facts === dirFacts) return;
		if (dirHandle === void 0) dirHandle = ctx.llm.registerConfigurableProviders(entries);
		else dirHandle.replace(entries);
		dirFacts = facts;
	};
	ensureAdapter();
	ensureDirectory();
	// 模态硬门禁挂在 llm/stream 瀑布:瀑布携带的是投影前的原始 messages——宿主
	// adapterStream 会把 file 块无条件投影成文本句柄、把无能力模型的 image 块投影成
	// 占位文本,adapter 内 enforceModalities 因此只见 image(纵深)。在此拦截,
	// 切换模型后的首次发送(全量历史)自然被覆盖——owner 拍板语义(2026-09-28)。
	// global: true 跨 fiber 收 LlmRuntime 发起的瀑布;只处理本包路由。
	ctx.on("llm/stream", (options, next) => {
		const route = options?.provider;
		if (route === void 0 || route !== PROVIDER && !(route in customs())) return next();
		enforceModalities(options, connectionFor(config, route));
		return next();
	}, { global: true });
	ctx.on("loader/volatile-update", () => {
		try {
			ensureAdapter();
			ensureDirectory();
		} catch (error) {
			ctx.logger.error("llm-mimo: custom provider routes conflict with an existing registration");
			ctx.logger.error(error);
		}
	});
	// 模型目录探活:连通性测试与模型发现共用一条最小化 messages 探针。
	// anthropic 面没有 /v1/models(GET 404 连密钥有效性都分不出),只能真发一条
	// max_tokens=1 的消息。请求携带 apiKey(表单草稿)则直接用;未带则服务端
	// 解析已存密钥。报错信息原样进 RemoteError,红框里展示的就是它。
	ctx.llm.registerModelDiscovery(settingsNs, async (request) => {
		const options = connectionFor(config, request.provider);
		const format = ["anthropic", "chat", "responses"].includes(request.api)
			? request.api
			: { "anthropic-messages": "anthropic", "openai-completions": "chat", "openai-responses": "responses" }[request.api] ?? options.apiFormat ?? "anthropic";
		if (format === "responses") throw new LlmError("llm-mimo: OpenAI Responses 线路尚未接入", "UNSUPPORTED_FORMAT");
		const baseURL = String(request.baseURL ?? options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/u, "");
		const apiKey = typeof request.apiKey === "string" && request.apiKey.length > 0
			? request.apiKey
			: await resolveApiKey(ctx, options);
		const model = options.models[0]?.id ?? "mimo-v2.6-flash";
		const root = messagesApiRoot(baseURL);
		const isChat = format === "chat";
		const anthropicFace = !isChat && baseURL.includes("/anthropic");
		const authHeaders = isChat || !anthropicFace
			? { authorization: `Bearer ${apiKey}` }
			: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
		// OpenAI 兼容面(chat/responses 等非 anthropic 面)优先 GET /models 列真实模型
		// ——标准"获取可用模型",免猜模型名。mini chat 探针会把基础目录的模型名发给
		// 任意端点(如百炼直接报模型不存在);anthropic 面(MiMo)没有 /models,不白跑。
		if (!anthropicFace) {
			const listed = await fetch(`${root}/models`, {
				method: "GET",
				headers: { ...authHeaders },
				signal: request.signal
			}).catch(() => null);
			if (listed && listed.ok) {
				const payload = await listed.json().catch(() => null);
				const items = Array.isArray(payload?.data) ? payload.data : [];
				const found = items
					.map((item) => ({ id: String(item?.id ?? item?.name ?? "").trim(), ...(item?.name ? { name: String(item.name) } : {}) }))
					.filter((item) => item.id.length > 0);
				if (found.length > 0) return found;
			}
		}
		const response = await fetch(isChat ? `${root}/chat/completions` : `${root}/messages`, {
			method: "POST",
			headers: {
				...authHeaders,
				"content-type": "application/json"
			},
			body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
			signal: request.signal
		});
		if (!response.ok) {
			const text = await response.text().catch(() => "");
			let detail = text;
			try {
				detail = JSON.parse(text)?.error?.message ?? text;
			} catch (_notJson) {}
			throw new LlmError(`llm-mimo: 连通性测试失败 — HTTP ${response.status}${detail ? `: ${String(detail).slice(0, 300)}` : ""}`, "DISCOVERY_FAILED");
		}
		return options.models.map((entry) => ({ id: entry.id, ...(entry.name ? { name: entry.name } : {}) }));
	});
	ctx.logger.info("llm-mimo: adapter registered for routes %s, discovery for namespace \"%s\"", adapterFacts, settingsNs);
}
