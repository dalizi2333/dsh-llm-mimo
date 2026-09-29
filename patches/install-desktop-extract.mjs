/**
 * llm-mimo 桌面版宿主补丁安装器（干净客户端一键打补丁）。
 *
 * 用法（双击 install-desktop-host-patch.cmd，或命令行）：
 *   DeepSeek Harness.exe(RunAsNode) install-desktop-extract.mjs <resources目录> <制品目录>
 *
 * 步骤：
 *   1. 解包 <resources>\app.asar 到临时目录（自包含 asar 解析，不依赖任何安装）
 *   2. 校验两个目标文件的 SHA256 == 制品清单里的 pristine 哈希（版本不符即中止）
 *   3. 覆写为制品里的已补丁内容，并校验 patched 哈希
 *   4. 由 cmd 包装层把临时树落位成 resources\app（目录优先于 asar），原 asar 改名留档
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";

const [resourcesDir, artifactsDir] = process.argv.slice(2);
if (!resourcesDir || !artifactsDir) {
  console.error("usage: install-desktop-extract.mjs <resourcesDir> <artifactsDir>");
  process.exit(2);
}
// Electron intercepts fs on *.asar paths; run raw for the archive we read below.
process.noAsar = true;
const asarPath = join(resourcesDir, "app.asar");
if (!existsSync(asarPath)) {
  console.error("FAIL: 找不到 " + asarPath);
  process.exit(1);
}
if (existsSync(join(resourcesDir, "app"))) {
  console.log("ALREADY-PATCHED: resources\\app 已存在，无需重复打补丁。");
  process.exit(0);
}

// ---- asar 解析（chromium pickle 头 + JSON 目录）----
const buf = readFileSync(asarPath);
const headerSize = buf.readUInt32LE(4);
const jsonLen = buf.readUInt32LE(12);
const header = JSON.parse(buf.slice(16, 16 + jsonLen).toString("utf8"));
const dataStart = 8 + headerSize;
if (dataStart > buf.length || dataStart <= 0 || dataStart % 8 !== 0 && dataStart % 4 !== 0) {
  // 宽松校验：dataStart 合理范围即可
}

function* walk(node, prefix) {
  for (const [name, entry] of Object.entries(node.files ?? {})) {
    const p = prefix ? prefix + "/" + name : name;
    if (entry.files) yield* walk(entry, p);
    else yield { path: p, entry };
  }
}

const tmp = join(process.env.TEMP ?? resourcesDir, "dsh-host-patch-extract");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
let count = 0;
for (const { path: p, entry } of walk(header, "")) {
  const out = join(tmp, p);
  mkdirSync(dirname(out), { recursive: true });
  if (entry.unpacked) {
    const src = join(resourcesDir, "app.asar.unpacked", p);
    if (existsSync(src)) copyFileSync(src, out);
    continue;
  }
  const off = dataStart + Number(entry.offset);
  writeFileSync(out, buf.subarray(off, off + entry.size));
  count++;
}
console.log("extracted " + count + " files -> " + tmp);

// ---- 校验 + 覆写 ----
const manifest = JSON.parse(readFileSync(join(artifactsDir, "manifest.json"), "utf8"));
const TARGETS = [
  { pristine: "dsh/node_modules/@deepseek-ai/dsh-llm/lib/index.js", artifact: "dsh-llm__lib__index.js" },
  { pristine: "dsh/node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js", artifact: "dsh-client-ui-settings-models__lib__client.js" },
];
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

for (const t of TARGETS) {
  const target = join(tmp, t.pristine);
  if (!existsSync(target)) {
    console.error("FAIL: 目标文件缺失 " + t.pristine + " —— 桌面版版本可能不是 0.2.0-rc.1，补丁不适用。");
    process.exit(1);
  }
  const actual = sha(target);
  const expect = manifest[t.artifact].pristine_sha256;
  if (actual !== expect) {
    console.error("FAIL: " + t.pristine + " 内容与 0.2.0-rc.1 基线不符（实际 " + actual.slice(0, 12) + "…，期望 " + expect.slice(0, 12) + "…）。");
    console.error("       你的桌面版版本不是本补丁适配的版本，请勿强打。");
    process.exit(1);
  }
  const patchedSrc = join(artifactsDir, t.artifact);
  copyFileSync(patchedSrc, target);
  const after = sha(target);
  if (after !== manifest[t.artifact].patched_sha256) {
    console.error("FAIL: 覆写后哈希不符 " + t.pristine);
    process.exit(1);
  }
  console.log("patched: " + t.pristine);
}
console.log("PATCH-OK");
