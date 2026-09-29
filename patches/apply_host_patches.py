"""Apply llm-mimo host patches (file-projection + settings tab) to a dsh node_modules tree.

Usage: python apply_host_patches.py <path-to-node_modules>
Backs up each target as <file>.pristine before first write; idempotent-safe.
"""
import sys
from pathlib import Path

HERE = Path(__file__).parent
PATCHES = [
    ("dsh-llm-file-video-projection.patch", "@deepseek-ai/dsh-llm/lib/index.js"),
    ("settings-models-add-custom-mimo-tab.patch", "@deepseek-ai/dsh-client-ui-settings-models/lib/client.js"),
]


def parse_patch(text):
    lines = text.splitlines()
    hunks = []
    i = 0
    while i < len(lines):
        if lines[i].startswith("@@"):
            body = []
            i += 1
            while i < len(lines) and not lines[i].startswith("@@"):
                body.append(lines[i])
                i += 1
            hunks.append(body)
        else:
            i += 1
    return hunks


def hunk_parts(body):
    old, new = [], []
    for l in body:
        if l.startswith(" "):
            old.append(l[1:]); new.append(l[1:])
        elif l.startswith("-"):
            old.append(l[1:])
        elif l.startswith("+"):
            new.append(l[1:])
    return old, new


def apply(patch_path, target_path):
    src = target_path.read_text(encoding="utf-8")
    if "isVideoFileRef" in src and patch_path.name.startswith("dsh-llm"):
        print(f"  = {target_path.name}: already patched, skip")
        return True
    if "custom-mimo" in src and patch_path.name.startswith("settings"):
        print(f"  = {target_path.name}: already patched, skip")
        return True
    file_lines = src.split("\n")
    ok = True
    for body in parse_patch(patch_path.read_text(encoding="utf-8")):
        old_lines, new_lines = hunk_parts(body)
        start = None
        n = len(old_lines)
        for hint in range(len(file_lines)):
            for s in (hint, len(file_lines) - n - hint):
                if 0 <= s <= len(file_lines) - n and file_lines[s:s + n] == old_lines:
                    start = s
                    break
            if start is not None:
                break
        if start is None:
            print(f"  X hunk mismatch in {target_path.name}: {old_lines[0][:60]!r}")
            ok = False
            continue
        file_lines[start:start + n] = new_lines
    if not ok:
        return False
    pristine = target_path.with_name(target_path.name + ".pristine")
    if not pristine.exists():
        target_path.rename(pristine)
        (pristine.parent / target_path.name).write_text("\n".join(file_lines), encoding="utf-8", newline="\n")
        print(f"  + patched {target_path.name} (pristine saved)")
    else:
        target_path.write_text("\n".join(file_lines), encoding="utf-8", newline="\n")
        print(f"  + patched {target_path.name}")
    return True


def main():
    nm = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not nm or not nm.is_dir():
        print(__doc__)
        print("error: pass the node_modules directory of the dsh runtime/profile")
        sys.exit(2)
    print(f"patching node_modules at: {nm}")
    fail = False
    for patch_name, rel in PATCHES:
        print(f"- {patch_name}")
        if not apply(HERE / patch_name, nm / rel):
            fail = True
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
