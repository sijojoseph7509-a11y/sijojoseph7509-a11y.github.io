// Copy check: finds leftover notes, placeholders, AI-style tells and stray symbols in the site's text.
//   node .claude/skills/copy-check/check.mjs            (checks content.js, os.js and index.html)
//   node .claude/skills/copy-check/check.mjs file.txt   (checks any text file, e.g. text exported from Figma)
import fs from "fs";
const files = process.argv.slice(2).length ? process.argv.slice(2) : ["content.js", "os.js", "index.html"];
const RULES = [
  ["note / to-do left in", /\b(notes? for sijo|note to self|todo|tbd|fixme|to verify|verify before|replace (this|with)|add (a|your) real|placeholder|lorem ipsum|xx+)\b/i],
  ["bracketed instruction", /\((add|insert|replace|todo)[^)]*\)|\[(add|insert|replace|your)[^\]]*\]/i],
  ["em dash (reads as AI-written; use a comma, colon or full stop)", /—/],
  ["AI-style word", /\b(delve|seamless(ly)?|leverag(e|ing)|elevate[sd]?|unlock(s|ing)?|empower(s|ing)?|cutting-edge|game[- ]changer|tapestry|robust|holistic|synerg(y|ies)|in today's (fast-paced|digital)|navigate the|it's (important|worth) (to note|noting)|whether you're)\b/i],
  ["'not just X, but Y' pattern", /\bnot (just|only)\b[^.]{0,60}\bbut\b/i],
  ["decorative symbol / emoji in prose", /[✦✧★☆✨✅❌🚀🔥💡👉📁📌⭐️•]/u],
  ["double space", /[a-z,.] {2,}[a-z]/i]
];
// Fine on purpose: en dashes in ranges (2020–21, 15–20 m), arrows in mappings (→ token), ✓ and emoji inside UI/chat mockups.
let n = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let inComment = false;
  fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (/<!--/.test(line)) inComment = !/-->/.test(line.slice(line.indexOf("<!--")));   // multi-line HTML comments
    else if (inComment) { if (/-->/.test(line)) inComment = false; return; }
    if (/^\s*(\/\/|\/\*|\*|<!--)/.test(line)) return;                     // code comments are for developers
    const strings = (f.endsWith(".js") ? (line.match(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g) || []).filter((x) => /[a-z]/i.test(x))
      : [line.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "")]).join(" | ");
    const single = /^\s*[A-Za-z]+\s*$/.test(strings);   // a one-word UI label ("Unlock" on the password gate) isn't prose
    for (const [why, re] of RULES) if (re.test(strings) && !(single && why === "AI-style word")) { n++; console.log(`${f}:${i + 1}  ${why}\n    ${strings.trim().slice(0, 140)}`); }
  });
}
console.log(n ? `\n${n} issue(s) to fix` : "✅ copy is clean");
process.exit(n ? 1 : 0);
