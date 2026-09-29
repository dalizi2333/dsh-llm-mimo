#!/usr/bin/env node
/**
 * llm-mimo 桌面版宿主补丁驱动器（供 pwsh/bash 远程引导下载执行）。
 *
 * 用法（由引导脚本以 ELECTRON_RUN_AS_NODE=1 + 桌面版自带 Electron 运行）：
 *   desktop-patch.js install    装载补丁（解包 asar -> 哈希校验 -> 替换 -> 落位 resources/app）
 *   desktop-patch.js uninstall  卸载补丁（删 resources/app，还原 asar 文件名）
 *   desktop-patch.js status     查看当前状态
 *
 * 制品（已补丁宿主文件 + manifest）按 REMOTE_SOURCES 顺序从 GitHub 拉取，
 * 任一源成功即止（大陆环境 jsdelivr 通常快于 raw.githubusercontent）。
 */
"use strict";
process.noAsar = true;

const { createHash } = require("node:crypto");
const { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync, renameSync, readdirSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { execSync } = require("node:child_process");

const REPO = "dalizi2333/dsh-llm-mimo";
const BRANCH = "main";
const REMOTE_SOURCES = [
  (p) => `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/patches/${p}`,
  (p) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/patches/${p}`,
];
const ARTIFACTS_DIR = "desktop-0.2.0-rc.1";
const TARGETS = [
  { pristine: "dsh/node_modules/@deepseek-ai/dsh-llm/lib/index.js", artifact: "dsh-llm__lib__index.js" },
  { pristine: "dsh/node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js", artifact: "dsh-client-ui-settings-models__lib__client.js" },
];
const APP_EXE_NAME = "DeepSeek Harness.exe";

function locateResources() {
  const local = process.env.LOCALAPPDATA;
  const candidates = [];
  if (local) candidates.push(join(local, "Programs", "DeepSeek Harness", "resources"));
  candidates.push(join("D:", "Program Files (x86)", "DeepSeek Harness", "resources"));
  for (const c of candidates) if (existsSync(join(c, "app.asar")) || existsSync(join(c, "app"))) return c;
  console.error("[X] 找不到桌面版 resources 目录，找过：\n    " + candidates.join("\n    "));
  process.exit(1);
}

const resourcesDir = locateResources();
const asarPath = join(resourcesDir, "app.asar");
const appDir = join(resourcesDir, "app");
const asarSaved = join(resourcesDir, "app.asar.unpatched");
const mode = process.argv[2] ?? "status";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  // 注意: 本脚本进程自己也是 DeepSeek Harness.exe（Electron RunAsNode），
  // 绝不能 taskkill /IM —— 会把当前进程一起杀掉。按 PID 排除自身。
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

async function fetchFirst(relPath) {
  // 本地优先: 从仓库直接跑时（插件用户必然有仓库），直接读本地制品，零网络
  const local = join(__dirname, relPath); // relPath 已含 ARTIFACTS_DIR 前缀
  if (existsSync(local)) return readFileSync(local);
  const errors = [];
  for (const make of REMOTE_SOURCES) {
    const url = make(ARTIFACTS_DIR + "/" + relPath);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      errors.push(url.split("/")[2] + ": " + e.message);
    }
  }
  throw new Error("所有源都拉取失败:\n  " + errors.join("\n  "));
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

// ---- asar 解析（chromium pickle 头 + JSON 目录）----
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
  // 同卷 rename，失败（跨卷）回退复制
  try { renameSync(src, dst); } catch (_) {
    mkdirSync(dst, { recursive: true });
    execSync(`robocopy "${src}" "${dst}" /E /NFL /NDL /NJH /NJS /NP`, { stdio: "ignore" });
    rmSync(src, { recursive: true, force: true });
  }
}

async function install() {
  if (existsSync(appDir)) {
    console.log("[=] 已经打过补丁（resources\\app 已存在），无需重复。卸载请运行: desktop-patch uninstall");
    return;
  }
  if (!existsSync(asarPath)) {
    console.error("[X] 找不到 " + asarPath);
    process.exit(1);
  }
  console.log("[*] 关闭正在运行的桌面版 ...");
  await killApp();

  console.log("[*] 拉取补丁制品（manifest + 2 个宿主文件）...");
  const manifest = JSON.parse((await fetchFirst(ARTIFACTS_DIR + "/manifest.json")).toString("utf8"));

  console.log("[*] 解包 app.asar ...");
  const tmp = join(process.env.TEMP ?? resourcesDir, "dsh-host-patch-extract");
  rmSync(tmp, { recursive: true, force: true });
  const count = extractAsar(asarPath, tmp);
  console.log("    解包 " + count + " 个文件");

  for (const t of TARGETS) {
    const target = join(tmp, t.pristine);
    if (!existsSync(target)) {
      console.error("[X] 目标文件缺失: " + t.pristine + " —— 桌面版版本不是 0.2.0-rc.1，补丁不适用（未做任何改动）。");
      process.exit(1);
    }
    const actual = sha(readFileSync(target));
    if (actual !== manifest[t.artifact].pristine_sha256) {
      console.error("[X] " + t.pristine + " 与 0.2.0-rc.1 基线不符，你的桌面版不是本补丁适配的版本（未做任何改动）。");
      process.exit(1);
    }
    const patched = await fetchFirst(ARTIFACTS_DIR + "/" + t.artifact);
    if (sha(patched) !== manifest[t.artifact].patched_sha256) {
      console.error("[X] 拉取的制品哈希不符: " + t.artifact + "（下载损坏？重试）");
      process.exit(1);
    }
    writeFileSync(target, patched);
    console.log("    patched: " + t.pristine);
  }

  console.log("[*] 落位 resources\\app ...");
  renameSync(asarPath, asarSaved);
  try {
    moveTree(tmp, appDir);
  } catch (e) {
    renameSync(asarSaved, asarPath);
    console.error("[X] 落位失败，已还原: " + e.message);
    process.exit(1);
  }
  console.log("[OK] 补丁完成。启动桌面版：设置-模型 出现 MiMo 卡；添加提供商出现第 3 页签。");
  console.log("     桌面版更新后重跑 install 即可。卸载: desktop-patch uninstall");
}

async function uninstall() {
  if (!existsSync(appDir)) {
    console.log("[=] 未打补丁（resources\\app 不存在）。");
    return;
  }
  console.log("[*] 关闭正在运行的桌面版 ...");
  await killApp();
  console.log("[*] 还原 ...");
  rmTreeRetry(appDir);
  if (existsSync(asarSaved)) renameSync(asarSaved, asarPath);
  console.log("[OK] 补丁已卸载，桌面版恢复原状。");
}

function status() {
  const patched = existsSync(appDir);
  console.log("resources : " + resourcesDir);
  console.log("状态      : " + (patched ? "已打补丁（resources\\app 生效中）" : "未打补丁"));
  console.log("宿主版本  : 0.2.0-rc.1（本补丁适配版本）");
}

(async () => {
  if (mode === "install") await install();
  else if (mode === "uninstall") uninstall();
  else if (mode === "status") status();
  else {
    console.error("用法: desktop-patch.js install|uninstall|status");
    process.exit(2);
  }
})().catch((e) => {
  console.error("[X] " + (e?.message ?? e) + " | code=" + (e?.code ?? "-"));
  const fr = String(e?.stack ?? "").split("\n");
  console.error(fr.slice(0, 4).join(" | "));
  process.exit(1);
});
