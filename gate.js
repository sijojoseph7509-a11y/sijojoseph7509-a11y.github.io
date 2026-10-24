// Password gate: a simple screen that keeps casual visitors out (not real security — the files stay public on GitHub Pages).
// Only a salted SHA-256 of the password lives here. The answer is trimmed and case-insensitive.
// Change the password: python3 -c "import hashlib;print(hashlib.sha256(b'sijo.work:gate:v1:' + 'NEWPASSWORD'.lower().encode()).hexdigest())"
// and paste the result into HASH (also in the QA scripts' GATE_HASH). Bump v1 → v2 in SALT to log everyone out.
(() => {
  const SALT = "sijo.work:gate:v1:";
  const HASH = "1242c393c539cf38364f807ab0a916199da4fb071ee17fe9349ddfe853e39f89";
  const KEY = "gate";
  const root = document.documentElement;
  const read = () => { try { return localStorage.getItem(KEY); } catch (_) { return null; } };
  if (read() === HASH) { root.classList.add("unlocked"); return; }      // unlocked before on this device

  root.classList.add("locked");
  // while locked, keys typed on the page must not reach the desk / Mac shortcuts (Enter, Esc, ⌘K…)
  const guard = (e) => { if (root.classList.contains("locked") && !(e.target.closest && e.target.closest("#gate"))) { e.stopImmediatePropagation(); } };
  addEventListener("keydown", guard, true);

  const sha = async (s) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const start = () => {
    const gate = document.getElementById("gate");
    if (!gate) return;
    const form = gate.querySelector("form"), input = gate.querySelector("input"), msg = gate.querySelector(".gate-msg");
    gate.hidden = false;
    input.focus({ preventScroll: true });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ok = (await sha(SALT + input.value.trim().toLowerCase())) === HASH;
      if (!ok) {
        msg.textContent = "That's not it. Try again.";
        gate.classList.remove("shake"); void gate.offsetWidth; gate.classList.add("shake");
        input.select();
        return;
      }
      try { localStorage.setItem(KEY, HASH); } catch (_) {}
      root.classList.remove("locked");
      root.classList.add("unlocked");
      removeEventListener("keydown", guard, true);
      input.blur();
      setTimeout(() => { gate.hidden = true; }, 600);                      // after the fade-out
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
