---
name: site-security
description: Security audit and hardening for Sijo's portfolio site. Use before every push, after editing index.html (especially the import map or any <script>), after adding links/content to content.js, after upgrading three.js, or whenever the user asks about the site's security, privacy or safety.
---

# Site security

The site is static (GitHub Pages): no logins, forms, database or cookies. The real risks are
**third-party code**, **injected scripts**, **unsafe links** and **leaked secrets**. Defences in place:

| Defence | Where |
|---|---|
| Content-Security-Policy (meta tag): scripts only from this site + the import map (by sha256); no plugins, no `<base>` hijack, no form posts; HTTP upgraded to HTTPS | `index.html` |
| three.js self-hosted (no CDN can inject code); file hashes recorded | `vendor/three/`, `vendor-hashes.json` |
| No inline scripts (self-update lives in `update.js`) | `index.html` |
| Links from `content.js` must be `https:`/`http:`/`mailto:` (`safeUrl`) — `javascript:` links become `#` | `os.js` |
| All content inserted into HTML is escaped (`esc`) | `os.js` |
| New-tab links use `rel="noopener"` | `os.js` |
| `Referrer-Policy: strict-origin-when-cross-origin` | `index.html` |
| HTTPS enforced by GitHub Pages | repo Settings → Pages |

## Run the audit

```bash
python3 -m http.server 4321                     # from the repo root
QA_DEPS=<dir with puppeteer-core> node .claude/skills/site-security/audit.mjs http://localhost:4321/
```
Also run it against `https://sijojoseph7509-a11y.github.io/` after deploying (adds the HTTP→HTTPS check).
Every ❌ must be fixed before pushing.

- **Edited the import map or upgraded three.js on purpose?** Run with `--fix` to re-record the CSP hash and vendor hashes, then re-run without `--fix`.
- **Adding a third-party script/service** (analytics, embeds): it must be added to the CSP deliberately — prefer self-hosting. Never add `'unsafe-inline'` or `'unsafe-eval'` to `script-src`.
- **Never commit** API keys, tokens or private keys (the audit scans for common formats).

## Limits (GitHub Pages)
Response headers can't be set, so `frame-ancestors` (clickjacking), HSTS preload and `X-Content-Type-Options` aren't available; the meta-tag CSP covers the important part. Moving to Cloudflare Pages/Netlify would allow real headers if ever needed.
