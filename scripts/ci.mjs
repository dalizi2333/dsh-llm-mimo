/**
 * ci —— 可安装性 + 宿主补丁 replay 全链门（本地与 GitHub Actions 跑同一份脚本，DRY）。
 *
 * 链路 = CI workflow 的全部实质步骤：
 *   1. 依赖就位检查（node_modules 缺失则 npm ci）；
 *   2. node scripts/verify-install.mjs（静态 + 模块级 + apply 冒烟 + 工件自洽）；
 *   3. 补丁 replay 门：npm pack 钉版本（取 peerDeps 列表最新一档）的 dsh-llm 与
 *      dsh-client-ui-settings-models → 解成 node_modules 形状 → apply_host_patches.py
 *      重放，断言 exit 0 + 幂等二跑 skip + 补丁标记在位 + 补丁后文件语法有效
 *      （不动机上 runtime；桌面版 manifest 的 pristine 属桌面构建，另在
 *      verify-install 里做库内自洽检查）；
 *   4. 干净临时 DSH_HOME：from-default-profile 造 profile → 官方 plugin add 本仓
 *      → --dump-config 断言 llm-mimo 条目（安装器兼容门禁会校验 peerDeps 对
 *      CLI 版本，peerDeps 漏列 rc.2 在这一步爆）。
 *
 * dsh 的来源：PATH 上的 `dsh`（CI 里全局安装钉 0.2.0-rc.2；本地可 export
 * DSH_RUNTIME_BIN 指向运行时的 dsh 可执行文件，见 log/llm-mimo/local-env.md）。
 *
 * 用法：npm run ci（或 scripts/hooks/pre-push 自动调用——push 前本地必绿）。
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const run = (cmd, args, opts = {}) => {
	const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
	if (r.status !== 0) {
		console.error(`\nFAIL：${cmd} ${args.join(" ")} 退出码 ${r.status}`);
		process.exit(1);
	}
	return r;
};

// --- dsh 定位 ---
const dshBin = process.env.DSH_RUNTIME_BIN ?? "dsh";
const which = spawnSync("sh", ["-c", `command -v '${dshBin}'`], { encoding: "utf8" });
if (which.status !== 0) {
	console.error("FAIL：找不到 dsh。CI 外环境请 export DSH_RUNTIME_BIN=<运行时 dsh 可执行文件路径>（本机值见 log/llm-mimo/local-env.md）");
	process.exit(1);
}
const ver = spawnSync(dshBin, ["--version"], { encoding: "utf8" });
const dshVersion = (ver.stdout + ver.stderr).trim();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const latestRuntime = String(pkg.peerDependencies["@deepseek-ai/dsh-llm"]).split("||").map((s) => s.trim()).at(-1);
if (!dshVersion.includes(latestRuntime)) console.warn(`warn：dsh 版本 ${dshVersion}，基线钉 ${latestRuntime}（CI 会钉死安装，本地请自行确认）`);

// --- 1. 依赖 ---
if (!existsSync(join(root, "node_modules", "@deepseek-ai", "dsh-llm"))) {
	console.log("▶ npm ci");
	run("npm", ["ci"], { cwd: root });
}

// --- 2. 静态 + 模块级 ---
console.log("▶ verify-install");
run("node", [join(root, "scripts", "verify-install.mjs")]);

// --- 3. 宿主补丁 replay 门（对 npm pristine 包，哈希即版本门）---
console.log(`▶ 补丁 replay（宿主包 @ ${latestRuntime}）`);
const tmp = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "dsh-llm-mimo-patch-"));
const nm = join(tmp, "nm");
try {
	const targets = [
		["@deepseek-ai/dsh-llm", "@deepseek-ai/dsh-llm/lib/index.js"],
		["@deepseek-ai/dsh-client-ui-settings-models", "@deepseek-ai/dsh-client-ui-settings-models/lib/client.js"]
	];
	for (const [name] of targets) {
		const pack = spawnSync("npm", ["pack", `${name}@${latestRuntime}`, "--silent"], { cwd: tmp, encoding: "utf8" });
		const tgz = (pack.stdout + pack.stderr).trim().split("\n").filter((l) => l.endsWith(".tgz")).at(-1);
		if (pack.status !== 0 || !tgz) throw new Error(`npm pack ${name} 失败: ${pack.stderr}`);
		const dir = join(nm, name);
		run("mkdir", ["-p", dir]);
		run("tar", ["-xzf", join(tmp, tgz), "-C", dir, "--strip-components", "1"]);
	}
	run("python3", [join(root, "patches", "apply_host_patches.py"), nm]);
	// 幂等：二跑必须全部 skip（真 runtime 升级重放的语义保证）
	const again = spawnSync("python3", [join(root, "patches", "apply_host_patches.py"), nm], { encoding: "utf8" });
	if (again.status !== 0 || (again.stdout.match(/already patched, skip/g) ?? []).length !== targets.length) {
		console.error(`FAIL：补丁 replay 不幂等\n${again.stdout}${again.stderr}`);
		process.exit(1);
	}
	console.log("  ✓ 二跑幂等（already patched, skip ×2）");
	for (const [rel, marker] of [[targets[0][1], "isVideoFileRef"], [targets[1][1], "custom-mimo"]]) {
		const text = readFileSync(join(nm, rel), "utf8");
		if (!text.includes(marker)) throw new Error(`${rel} 缺补丁标记 ${marker}`);
	}
	console.log("  ✓ 补丁标记在位（isVideoFileRef / custom-mimo）");
	run("node", ["--check", join(nm, targets[0][1])], { stdio: "pipe" });
	run("node", ["--check", join(nm, targets[1][1])], { stdio: "pipe" });
	console.log("  ✓ 补丁后文件语法有效（node --check）");
} catch (error) {
	console.error(`FAIL：补丁 replay 门 — ${error.message}`);
	process.exit(1);
} finally {
	rmSync(tmp, { recursive: true, force: true });
}

// --- 4. 干净 DSH_HOME 组合级 ---
const home = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "dsh-llm-mimo-ci-"));
console.log(`▶ 临时 DSH_HOME：${home}`);
const env = { ...process.env, DSH_HOME: home };
try {
	run(dshBin, ["ci", "--from-default-profile", "headless", "--dump-config"], { env, stdio: "ignore" });
	run(dshBin, ["plugin", "--profile", "ci", "add", root], { env });
	const dump = spawnSync(dshBin, ["--profile", "ci", "--dump-config"], { env, encoding: "utf8" });
	if (dump.status !== 0 || !dump.stdout.includes("- id: llm-mimo")) {
		console.error(`FAIL：组合树断言未过（exit ${dump.status}）`);
		process.exit(1);
	}
	console.log("  ✓ 组合树含 llm-mimo 条目");
	rmSync(home, { recursive: true, force: true });
} catch {
	/* run() 已 exit；占位 */
}
if (process.exitCode === undefined || process.exitCode === 0) {
	console.log("\nPASS：本地 CI 全链通过");
}
