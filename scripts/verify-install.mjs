/**
 * verify-install —— 可安装性检查（CI 第一道门，本地同用，零外部依赖）。
 *
 * 检查五层：
 *  1. package.json 形状：包名 / exports / files 全部存在；peerDeps 覆盖当前最新
 *     运行时（0.2.0-rc.2，安装器兼容门禁只校验 @deepseek-ai/dsh* 的 peerDependencies）；
 *  2. cordis.patch.yml 静态形状：- insert 自挂载条目（profile 裸 row 是 override by id，
 *     新插件必须走 bundle patch 的 insert 语法）；
 *  3. 模块级：lib/index.js 可加载（依赖经仓库自带 node_modules 解析——link: 安装
 *     走真实路径，仓库目录必须自带依赖，CI 与本机一视同仁）；
 *  4. apply() 冒烟：fake ctx 上注册适配器/供应商目录/模型发现/llm-stream 瀑布，
 *     并验证 llmMimo 服务面（listHostedModels / registerPromptSource / disposer）；
 *  5. patches/ 工件自洽：两个宿主 .patch 存在；desktop manifest 每个条目的
 *     patched 文件在库且 sha256 匹配（pristine 哈希属桌面版构建，npm 面验证在
 *     ci.mjs 的补丁 replay 门）。
 *
 * 组合级验证（干净 DSH_HOME + 官方 plugin add + --dump-config 断言）与宿主补丁
 * 对 npm pristine 包的 replay 门在 scripts/ci.mjs（GitHub Actions 与本地同一份）。
 */

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
	failed += 1;
	console.error(`  ✗ ${m}`);
};

console.log("[1/5] package.json 形状");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (pkg.name !== "@mimo-codex/dsh-llm-mimo") bad(`包名 ${pkg.name}`);
else ok(`包名 ${pkg.name}`);
for (const [k, sub] of Object.entries(pkg.exports ?? {})) {
	const p = join(root, sub);
	existsSync(p) ? ok(`exports "${k}" → ${sub}`) : bad(`exports "${k}" 指向不存在的 ${sub}`);
}
for (const f of pkg.files ?? []) {
	const p = join(root, f);
	existsSync(p) ? ok(`files 含 ${f}`) : bad(`files 声明了不存在的 ${f}`);
}
const llmPeer = String(pkg.peerDependencies?.["@deepseek-ai/dsh-llm"] ?? "");
const peerVersions = llmPeer.split("||").map((s) => s.trim());
const latestRuntime = peerVersions.at(-1);
peerVersions.includes("0.2.0-rc.2") ? ok(`peerDeps 含 0.2.0-rc.2（最新=${latestRuntime}）`) : bad(`peerDeps 缺 0.2.0-rc.2: "${llmPeer}"`);
for (const key of ["@deepseek-ai/dsh-credentials", "@deepseek-ai/dsh-launch-environment", "@deepseek-ai/dsh-llm"]) {
	pkg.peerDependencies?.[key] ? ok(`peerDeps 含 ${key}`) : bad(`peerDeps 缺 ${key}`);
}
pkg.dsh?.bundle?.patch === "./cordis.patch.yml" ? ok("dsh.bundle.patch → cordis.patch.yml") : bad("dsh.bundle.patch 形状不对");
(pkg.dsh?.client?.inject ?? []).length > 0 ? ok(`dsh.client.inject ${pkg.dsh.client.inject.length} 项`) : bad("dsh.client.inject 为空");

console.log("[2/5] cordis.patch.yml 静态形状");
const patchYml = readFileSync(join(root, "cordis.patch.yml"), "utf8");
patchYml.includes("- insert:") ? ok("- insert: 语法（新 id 必须走 insert）") : bad("缺 - insert: 自挂载语法");
/-\s*id:\s*llm-mimo/.test(patchYml) ? ok("含 id: llm-mimo 条目") : bad("缺 llm-mimo 条目");
patchYml.includes("@mimo-codex/dsh-llm-mimo") ? ok("条目名 = 包名") : bad("条目名与包名不一致");

console.log("[3/5] 模块级加载");
const mod = await import(pathToFileURL(join(root, "lib/index.js")).href);
for (const key of ["name", "inject", "Config", "apply"]) {
	typeof mod[key] === "undefined" ? bad(`缺少导出 ${key}`) : ok(`导出 ${key}`);
}
for (const key of ["llm", "credentials", "attachments"]) {
	(mod.inject ?? []).includes(key) ? ok(`inject 含 "${key}"`) : bad(`inject 缺 "${key}"`);
}

console.log("[4/5] apply() 冒烟（fake ctx）");
const config = {
	apiKeyEnv: "MIMO_NORMAL_API_KEY",
	baseURL: "https://api.example.invalid/anthropic",
	apiFormat: "anthropic",
	baseURLsJson: "{}",
	providerName: "MiMo",
	modelsJson: JSON.stringify([{ id: "mimo-test", name: "Test", contextWindow: 1024000, maxTokens: 131072, inputModalities: ["text", "image"] }]),
	customProviders: {
		"acme-test": {
			displayName: "Acme",
			apiKeyEnv: "ACME_TEST_API_KEY",
			baseURL: "https://acme.example.invalid/v1",
			apiFormat: "chat",
			baseURLsJson: "{}",
			modelsJson: JSON.stringify([{ id: "acme-model", contextWindow: 1024, maxTokens: 128, inputModalities: ["text"] }])
		}
	}
};
const adapters = [];
const directories = [];
const discoveries = [];
const listeners = [];
const provided = {};
const ctx = {
	fiber: { entry: { options: { id: "llm-mimo" } } },
	provide: (name, api) => { provided[name] = api; },
	get: () => { throw new Error("verify-install: runtime services are not available in CI"); },
	llm: {
		registerAdapter: (routes, adapter) => { adapters.push({ routes, adapter }); return { replace() {} }; },
		registerConfigurableProviders: (entries) => { directories.push(entries); return { replace() {} }; },
		registerModelDiscovery: (ns) => discoveries.push(ns)
	},
	on: (event, handler, options) => listeners.push({ event, options }),
	logger: { info() {}, error() {} }
};
try {
	await mod.apply(ctx, config);
	adapters.length === 1 ? ok("适配器注册一次") : bad(`适配器注册 ${adapters.length} 次`);
	JSON.stringify(adapters[0]?.routes) === JSON.stringify(["mimo", "acme-test"])
		? ok(`路由 = ${adapters[0].routes.join(", ")}`)
		: bad(`路由不对: ${JSON.stringify(adapters[0]?.routes)}`);
	const dirEntries = directories[0] ?? [];
	dirEntries.length === 2 ? ok(`供应商目录 ${dirEntries.length} 条`) : bad(`供应商目录 ${dirEntries.length} 条`);
	dirEntries.find((e) => e.provider === "acme-test")?.settingsPath?.join(".") === "customProviders.acme-test"
		? ok("自定义条目 settingsPath = customProviders.<route>")
		: bad("自定义条目 settingsPath 不对");
	listeners.some((l) => l.event === "llm/stream" && l.options?.global === true)
		? ok("llm/stream 瀑布已注册（global）")
		: bad("llm/stream 瀑布未注册或缺 global:true");
	listeners.some((l) => l.event === "loader/volatile-update")
		? ok("loader/volatile-update 已注册")
		: bad("loader/volatile-update 未注册");
	JSON.stringify(discoveries) === JSON.stringify(["llm-mimo"]) ? ok(`模型发现 ns = ${discoveries[0]}`) : bad(`模型发现 ns 不对: ${JSON.stringify(discoveries)}`);
	const hosted = provided.llmMimo?.listHostedModels?.() ?? [];
	hosted.length === 2 ? ok(`llmMimo.listHostedModels ${hosted.length} 条`) : bad(`listHostedModels ${hosted.length} 条`);
	hosted.some((m) => m.provider === "mimo" && m.id === "mimo-test") && hosted.some((m) => m.provider === "acme-test" && m.id === "acme-model")
		? ok("托管面覆盖主路由 + 自定义条目")
		: bad("托管面条目不对");
	const source = { resolveSystem: () => undefined, resolveToolDescription: () => undefined };
	const dispose = provided.llmMimo?.registerPromptSource?.(source);
	typeof dispose === "function" ? ok("registerPromptSource 返回 disposer") : bad("registerPromptSource 未返回 disposer");
	dispose?.();
	let threw = false;
	try { provided.llmMimo.registerPromptSource(null); } catch { threw = true; }
	threw ? ok("非法 prompt source 被拒绝") : bad("非法 prompt source 未被拒绝");
} catch (error) {
	bad(`apply() 抛错: ${error.stack ?? error}`);
}

console.log("[5/5] patches/ 工件自洽");
for (const f of ["dsh-llm-file-video-projection.patch", "settings-models-add-custom-mimo-tab.patch"]) {
	existsSync(join(root, "patches", f)) ? ok(`补丁 ${f}`) : bad(`缺补丁 ${f}`);
}
const desktopDir = join(root, "patches", "desktop-0.2.0-rc.1");
const manifestPath = join(desktopDir, "manifest.json");
if (!existsSync(manifestPath)) {
	bad("缺 desktop manifest.json");
} else {
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	for (const [file, meta] of Object.entries(manifest)) {
		const p = join(desktopDir, file);
		if (!existsSync(p)) { bad(`manifest 条目 ${file} 文件不在库`); continue; }
		const actual = createHash("sha256").update(readFileSync(p)).digest("hex");
		actual === meta.patched_sha256 ? ok(`${file} sha256 = patched`) : bad(`${file} sha256 不匹配 patched_sha256`);
	}
}

if (failed > 0) {
	console.error(`\nFAIL：verify-install ${failed} 项未过`);
	process.exit(1);
}
console.log("\nPASS：verify-install 全部通过");
