# Pull a use_figma result out of the Claude Code session transcript by its marker and save it as JSON.
# usage: python3 grab.py <transcript.jsonl> <marker> <out.json>
import json, sys
path, marker, out = sys.argv[1:4]
found = None
with open(path, encoding="utf-8") as f:
    for line in f:
        if marker not in line: continue
        try: rec = json.loads(line)
        except Exception: continue
        msg = rec.get("message") or {}
        for c in (msg.get("content") or []) if isinstance(msg.get("content"), list) else []:
            if c.get("type") != "tool_result": continue
            parts = c.get("content")
            texts = [p.get("text", "") for p in parts] if isinstance(parts, list) else [parts or ""]
            for t in texts:
                if marker in t and t.lstrip().startswith("{"):
                    found = t
if not found: sys.exit("marker not found: " + marker)
data = json.loads(found)
json.dump(data, open(out, "w"), ensure_ascii=False)
print(out, len(found), "chars", len(data.get("s", [])), "sections")
