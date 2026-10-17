# Working on sijo.work

- **Publish every change automatically.** After a change: bump the version (`?v=N` in index.html + version.json), run site-qa and copy-check (HANDOVER.md §20), commit, then `git push origin main` without asking. Only stop to ask if a check fails.
- After pushing, confirm with `git ls-remote origin main` that GitHub has the new commit before saying it is live.
- Ordinary pushes only. Never force-push or rewrite history without Sijo's explicit go-ahead for that specific change.
- HANDOVER.md is the full project reference.
