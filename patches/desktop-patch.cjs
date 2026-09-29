#!/usr/bin/env node
/**
 * llm-mimo 宿主补丁驱动器 —— 显式作用域版。
 *
 * 原则：只处理「你当前所在（或显式指定）的那一个根目录」，绝不猜、绝不全局扫。
 *
 * 用法（由引导脚本以 ELECTRON_RUN_AS_NODE=1 + 桌面版自带 Electron 运行）：
 *   cd 到你的根目录，然后:
 *   desktop-patch.cjs install [根目录]    装载（根目录缺省 = 当前工作目录）
 *   desktop-patch.cjs uninstall [根目录]  卸载
 *   desktop-patch.cjs status [根目录]     查看该根的形态与补丁状态
 *
 * 根目录识别（二选一，都从根目录内部判断）：
 *   - 桌面端形态: 根目录（或其 resources 子目录）下有 app.asar / app
 *                 → asar 解包 + resources\app 遮蔽
 *   - 运行时形态: 其余情况 → 在根目录内递归找 @deepseek-ai/dsh-llm
 *                 （典型根: HDSL 数据根、HDSL 数据根下的 runtimes、任意 node_modules 树）
 *   仅替换基线哈希匹配 0.2.0-rc.1 的文件；其他版本报告后跳过，绝不误伤。
 * 制品获取: 本地仓库优先，jsdelivr / raw / GitHub API 兜底。
 */
"use strict";
process.noAsar = true;

const { createHash } = require("node:crypto");
const { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync, renameSync, readdirSync, statSync } = require("node:fs");
const { join, dirname, resolve } = require("node:path");
const { execSync } = require("node:child_process");

const REPO = "dalizi2333/dsh-llm-mimo";
const BRANCH = "main";
const REMOTE_SOURCES = [
  (p) => `https://cdn.jsdelivr.net/gh/${REPO}@main/patches/${p}`,
  (p) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/patches/${p}`,
];
const ARTIFACTS_DIR = "desktop-0.2.0-rc.1";
const TARGETS = [
  { rel: "dsh/node_modules/@deepseek-ai/dsh-llm/lib/index.js", artifact: "dsh-llm__lib__index.js" },
  { rel: "dsh/node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js", artifact: "dsh-client-ui-settings-models__lib__client.js" },
];
const RUNTIME_TARGETS = [
  { rel: "@deepseek-ai/dsh-llm/lib/index.js", artifact: "dsh-llm__lib__index.js" },
  { rel: "@deepseek-ai/dsh-client-ui-settings-models/lib/client.js", artifact: "dsh-client-ui-settings-models__lib__client.js" },
];
const APP_EXE_NAME = "DeepSeek Harness.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/** 根目录形态识别 */
function identifyRoot(root) {
  if (existsSync(join(root, "app.asar")) || existsSync(join(root, "app"))) return "desktop-resources";
  if (existsSync(join(root, "resources", "app.asar")) || existsSync(join(root, "resources", "app"))) return "desktop-install-root";
  return "runtime";
}

/** 运行时形态: 在根内递归找含 @deepseek-ai/dsh-llm/lib/index.js 的 node_modules */
function findRuntimeTargets(root, depth = 0, out = []) {
  if (depth > 6 || out.length >= 32) return out;
  let entries;
  try { entries = readdirSync(root); } catch (_) { return out; }
  for (const name of entries) {
    const p = join(root, name);
    let st;
    try { st = statSync(p); } catch (_) { continue; }
    if (!st.isDirectory()) continue;
    if (name === "@deepseek-ai") {
      if (existsSync(join(p, "dsh-llm", "lib", "index.js"))) out.push(dirname(p));
      continue;
    }
    if (name === ".git" || name === "Cache" || name === "cache" || name.startsWith("dsh-acl-skill")) continue;
    findRuntimeTargets(p, depth + 1, out);
  }
  return out;
}

async function fetchFirst(relPath) {
  const local = join(__dirname, relPath); // relPath 已含 ARTIFACTS_DIR 前缀；本地仓库优先，零网络
  if (existsSync(local)) return readFileSync(local);
  const errors = [];
  for (const make of REMOTE_SOURCES) {
    try {
      const res = await fetch(make(relPath));
      if (!res.ok) throw new Error("HTTP " + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) { errors.push(e.message); }
  }
  // 权威兜底: GitHub contents API（无 CDN 缓存，推送即可拉到）
  try {
    const api = `https://api.github.com/repos/${REPO}/contents/patches/${relPath}?ref=${BRANCH}`;
    const res = await fetch(api, { headers: { "User-Agent": "llm-mimo-patch", "Accept": "application/vnd.github+json" } });
    if (res.ok) {
      const j = await res.json();
      return Buffer.from(j.content, "base64");
    }
    errors.push("api: HTTP " + res.status);
  } catch (e) { errors.push("api: " + e.message); }
  throw new Error("所有源都拉取失败: " + errors.join(" | "));
}

function otherPids(self) {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq DeepSeek Harness.exe" /FO CSV /NH', { encoding: "utf8" });
    const pids = [];
    for (const line of out.split("\n")) {
      const m = line.match(/"(\d+)"/);
      if (m && Number(m[1]) !== self) pids.push(Number(m[1]));
    }
    return pids;
  } catch (_) { return []; }
}
async function killApp() {
  // 本脚本进程自己也是 DeepSeek Harness.exe（Electron RunAsNode），按 PID 排除自身。
  // 仅桌面端形态需要（要动 app 树）；运行时形态不涉及。
  const self = process.pid;
  try {
    execSync(`powershell -NoProfile -Command "Get-Process 'DeepSeek Harness' -ErrorAction SilentlyContinue | Where-Object Id -ne ${self} | Stop-Process -Force"`, { stdio: "ignore" });
  } catch (_) {}
  for (let i = 0; i < 20 && otherPids(self).length > 0; i++) await sleep(500);
  await sleep(500);
}

function rmTreeRetry(dir, attempts = 4) {
  for (let i = 0; ; i++) {
    try { rmSync(dir, { recursive: true, force: true }); return; } catch (e) {
      if (i >= attempts - 1) throw e;
      const waitUntil = Date.now() + 1500;
      while (Date.now() < waitUntil) {}
    }
  }
}

// ---- asar 解析 ----
function extractAsar(asarPath, outDir) {
  const buf = readFileSync(asarPath);
  const headerSize = buf.readUInt32LE(4);
  const jsonLen = buf.readUInt32LE(12);
  const header = JSON.parse(buf.slice(16, 16 + jsonLen).toString("utf8"));
  const dataStart = 8 + headerSize;
  let count = 0;
  const walk = (node, prefix) => {
    for (const [name, entry] of Object.entries(node.files ?? {})) {
      const p = prefix ? prefix + "/" + name : name;
      if (entry.files) { walk(entry, p); continue; }
      const out = join(outDir, p);
      mkdirSync(dirname(out), { recursive: true });
      if (entry.unpacked) {
        const src = join(dirname(asarPath), "app.asar.unpacked", p);
        if (existsSync(src)) copyFileSync(src, out);
        continue;
      }
      const off = dataStart + Number(entry.offset);
      writeFileSync(out, buf.subarray(off, off + entry.size));
      count++;
    }
  };
  walk(header, "");
  return count;
}

function moveTree(src, dst) {
  try { renameSync(src, dst); } catch (_) {
    mkdirSync(dst, { recursive: true });
    execSync(`robocopy "${src}" "${dst}" /E /NFL /NDL /NJH /NJS /NP`, { stdio: "ignore" });
    rmSync(src, { recursive: true, force: true });
  }
}

// ---- 桌面端 ----
function desktopPaths(root) {
  const resourcesDir = identifyRoot(root) === "desktop-resources" ? root : join(root, "resources");
  return {
    resourcesDir,
    asarPath: join(resourcesDir, "app.asar"),
    appDir: join(resourcesDir, "app"),
    asarSaved: join(resourcesDir, "app.asar.unpatched"),
  };
}

async function installDesktop(root, manifest) {
  const { resourcesDir, asarPath, appDir, asarSaved } = desktopPaths(root);
  if (existsSync(appDir)) { console.log("[=] 桌面端已打补丁: " + resourcesDir); return; }
  if (!existsSync(asarPath)) { console.log("[!] 桌面端缺少 app.asar，跳过: " + resourcesDir); return; }
  console.log("[*] 桌面端: 解包 " + resourcesDir);
  const tmp = join(process.env.TEMP ?? resourcesDir, "dsh-host-patch-extract");
  rmSync(tmp, { recursive: true, force: true });
  extractAsar(asarPath, tmp);
  for (const t2 of TARGETS) {
    const target = join(tmp, t2.rel);
    if (!existsSync(target)) { console.log("[!] 桌面端缺 " + t2.rel + "，版本可能不符，跳过。"); return; }
    if (sha(readFileSync(target)) !== manifest[t2.artifact].pristine_sha256) {
      console.log("[!] 桌面端宿主文件与 0.2.0-rc.1 基线不符，跳过（不误伤）。");
      return;
    }
    writeFileSync(target, await fetchFirst(ARTIFACTS_DIR + "/" + t2.artifact));
  }
  renameSync(asarPath, asarSaved);
  try { moveTree(tmp, appDir); }
  catch (e) { renameSync(asarSaved, asarPath); console.error("[X] 桌面端落位失败，已还原: " + e.message); return; }
  console.log("[OK] 桌面端补丁完成: " + resourcesDir);
}

function uninstallDesktop(root) {
  const { resourcesDir, appDir, asarSaved, asarPath } = desktopPaths(root);
  if (existsSync(appDir)) {
    rmTreeRetry(appDir);
    if (existsSync(asarSaved)) renameSync(asarSaved, asarPath);
    console.log("[OK] 桌面端补丁已卸载: " + resourcesDir);
  } else console.log("[=] 桌面端本就未打补丁: " + resourcesDir);
}

// ---- 运行时 ----
async function installRuntime(nm, manifest) {
  for (const t2 of RUNTIME_TARGETS) {
    const target = join(nm, t2.rel);
    if (!existsSync(target)) { console.log("[!] 缺 " + t2.rel + "，跳过: " + nm); return; }
    const h = sha(readFileSync(target));
    if (h === manifest[t2.artifact].patched_sha256) { console.log("[=] 已打补丁: " + nm); return; }
    if (h !== manifest[t2.artifact].pristine_sha256) {
      console.log("[!] 版本基线不符（非 0.2.0-rc.1），跳过不误伤: " + nm);
      return;
    }
  }
  for (const t2 of RUNTIME_TARGETS) {
    const target = join(nm, t2.rel);
    const pristine = target + ".pristine";
    if (!existsSync(pristine)) copyFileSync(target, pristine);
    writeFileSync(target, await fetchFirst(ARTIFACTS_DIR + "/" + t2.artifact));
  }
  console.log("[OK] 运行时补丁完成: " + nm);
}

function uninstallRuntime(nm) {
  let touched = false;
  for (const t2 of RUNTIME_TARGETS) {
    const target = join(nm, t2.rel);
    const pristine = target + ".pristine";
    if (existsSync(pristine)) { copyFileSync(pristine, target); touched = true; }
  }
  console.log(touched ? "[OK] 运行时已还原: " + nm : "[=] 无补丁痕迹: " + nm);
}

// ---- 主流程 ----
(async () => {
  const mode = process.argv[2] ?? "status";
  const root = resolve(process.argv[3] ?? process.cwd());
  if (!existsSync(root)) { console.error("[X] 根目录不存在: " + root); process.exit(1); }
  const kind = identifyRoot(root);
  const manifest = JSON.parse((await fetchFirst(ARTIFACTS_DIR + "/manifest.json")).toString("utf8"));

  console.log("根目录: " + root);
  console.log("形态  : " + (kind === "runtime" ? "运行时（递归找 dsh-llm）" : "桌面端"));
  console.log("模式  : " + mode);

  const isDesktop = kind !== "runtime";
  if (isDesktop) await killApp();

  if (isDesktop) {
    if (mode === "install") await installDesktop(root, manifest);
    else if (mode === "uninstall") uninstallDesktop(root);
    else {
      const { appDir, asarPath } = desktopPaths(root);
      console.log("状态  : " + (existsSync(appDir) ? "已打补丁" : existsSync(asarPath) ? "未打补丁" : "异常"));
    }
  } else {
    const nodes = findRuntimeTargets(root);
    if (nodes.length === 0) { console.log("[!] 根目录内没有找到 dsh-llm 运行时（node_modules/@deepseek-ai/dsh-llm）。"); return; }
    for (const nm of nodes) {
      if (mode === "install") await installRuntime(nm, manifest);
      else if (mode === "uninstall") uninstallRuntime(nm);
      else {
        const idx = join(nm, RUNTIME_TARGETS[0].rel);
        let state = "缺 dsh-llm";
        if (existsSync(idx)) {
          const h = sha(readFileSync(idx));
          state = h === manifest["dsh-llm__lib__index.js"].patched_sha256 ? "已打补丁"
            : h === manifest["dsh-llm__lib__index.js"].pristine_sha256 ? "未打补丁 (0.2.0-rc.1 可适配)"
            : "其他版本（本补丁不适配）";
        }
        console.log("  [运行时] " + state + " — " + nm);
      }
    }
    if (mode !== "status") console.log("提示: 运行中的实例需重启后才会加载新宿主代码。");
  }
})().catch((e) => {
  console.error("[X] " + (e?.message ?? e) + " | code=" + (e?.code ?? "-"));
  const fr = String(e?.stack ?? "").split("\n");
  console.error(fr.slice(0, 4).join(" | "));
  process.exit(1);
});
