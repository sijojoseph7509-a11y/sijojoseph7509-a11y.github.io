// Motion layer for the Carekin and Handovo case studies (loaded by os.js openCase when content.js gives case.fx).
// Each project brings its own tone through case.fxOpts:
//   reveal  "none" (default, used by both since v92: sections are simply there, so the story reads as one piece),
//           "rise" (soft settle) or "wipe" (left-to-right)
//   videos  [[section, x, y, w, h, file, radius?]]: the project film plays in place of its poster while it is on screen;
//           radius (same units) rounds its corners to match a rounded screenshot
//   compare [section, x, y, w, h, file, leftLabel, rightLabel]: drag to compare (day / night)
//   draw    [section, x, y, w, h, file, [[x, y], …]]: a line layer that draws itself left to right when seen, with rings on the marked points
// Coordinates are the Figma documentation's own 1440-px units, so everything lines up at every width.
const W = 1440;

export default function caseFx(caseEl, { slug, v, sections, opts = {}, base = "" }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const asset = (f) => `${base}work/${slug}/fx/${f}?v=${v}`;
  // v195: until case-fx.css has loaded, the overlays below have no position and drew as dark boxes over the top of the case
  let css = document.querySelector("link[data-cfx]");
  if (!css) { css = document.createElement("link"); css.rel = "stylesheet"; css.href = `${base}case-fx.css?v=${v}`; css.dataset.cfx = ""; document.head.appendChild(css); }
  caseEl.classList.add("fx-wait"); { const done = () => caseEl.classList.remove("fx-wait"); if (css.sheet) done(); else { css.addEventListener("load", done, { once: true }); css.addEventListener("error", done, { once: true }); } }
  caseEl.classList.add("cfx", "cfx-" + (opts.reveal || "rise"));
  if (opts.accent) caseEl.style.setProperty("--cfx-accent", opts.accent);
  const cleanups = [];

  const secs = [...caseEl.querySelectorAll(":scope > img")].map((im, i) => {
    const s = document.createElement("div"); s.className = "cfx-sec"; s.dataset.i = i;
    im.replaceWith(s); s.appendChild(im); return s;
  });
  // v208 gradient bands (Handovo): a slow, stepped contour gradient behind the blue and dark sections, drawn live in WebGL.
  // The section stills for these are rendered with a transparent background (and carry their colour as a CSS fallback),
  // so text sits on the motion. Palettes stay deep enough for white text (AA). One canvas per section, created when it
  // is near the screen and paused when it leaves; reduced motion draws one still frame.
  const BANDS = {
    blue: [[0.075, 0.08, 0.42], [0.184, 0.231, 0.918], [0.36, 0.33, 0.93]],   // deep indigo -> Handovo blue -> violet tip
    dark: [[0.024, 0.024, 0.04], [0.06, 0.06, 0.2], [0.15, 0.17, 0.52]],     // near-black -> night navy -> blue glow
  };
  const FRAG = `precision mediump float;
uniform vec2 r; uniform float t; uniform vec3 c0, c1, c2; uniform float seed;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / r; vec2 p = uv * vec2(r.x / r.y, 1.0);
  vec2 c = vec2(r.x / r.y * (0.08 + 0.04 * sin(t * 0.07 + seed)), -0.25 + 0.05 * cos(t * 0.05 + seed));
  vec2 d = (p - c) * vec2(1.0, 0.82);
  float f = length(d) + 0.06 * sin(d.y * 3.1 + t * 0.11 + seed) + 0.04 * sin(d.x * 4.3 - t * 0.09);
  float v = f * 11.0 - t * 0.03;   // v208b: tighter bands
  float b = fract(v);
  vec3 col = mix(c0, c1, smoothstep(0.0, 0.62, b));
  col = mix(col, c2, smoothstep(0.62, 1.0, b) * 0.85);
  col = mix(col, c0, smoothstep(0.965, 1.0, b));   // a soft step into the next band: no jagged edge
  col *= 0.88 + 0.12 * smoothstep(0.0, 1.2, f);
  col += (h(gl_FragCoord.xy + t) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}`;
  if (opts.bands) {
    const live = new Set();
    const make = (sec, kind, k) => {
      const cv = document.createElement("canvas"); cv.className = "cfx-bands"; cv.setAttribute("aria-hidden", "true");
      sec.insertBefore(cv, sec.firstChild); sec.classList.add("cfx-onbands");
      const gl = cv.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
      if (!gl) { cv.remove(); sec.classList.remove("cfx-onbands"); return null; }
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }"));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); sec.classList.remove("cfx-onbands"); return null; }
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      const U = (n) => gl.getUniformLocation(pr, n), pal = BANDS[kind] || BANDS.blue;
      gl.uniform3fv(U("c0"), pal[0]); gl.uniform3fv(U("c1"), pal[1]); gl.uniform3fv(U("c2"), pal[2]); gl.uniform1f(U("seed"), k * 1.7);
      const ur = U("r"), ut = U("t");
      let raf = 0, last = 0, t0 = performance.now() - k * 9000;
      const size = () => { const q = Math.min(devicePixelRatio || 1, 2) * 0.6;   // under device resolution: the bands are soft, so it can't be seen
        const w = Math.max(2, Math.round(sec.clientWidth * q)), hh = Math.max(2, Math.round(sec.clientHeight * q));
        if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; gl.viewport(0, 0, w, hh); } gl.uniform2f(ur, w, hh); };
      const draw = (now) => { size(); gl.uniform1f(ut, (now - t0) / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
      const loop = (now) => { raf = requestAnimationFrame(loop); if (now - last < 33) return; last = now; draw(now); };   // ~30 fps is plenty
      return { start: () => { if (reduce) { draw(performance.now()); return; } if (!raf) raf = requestAnimationFrame(loop); },
               stop: () => { cancelAnimationFrame(raf); raf = 0; } };
    };
    const made = new Map();
    const bio = new IntersectionObserver((es) => es.forEach((e) => {
      const i = +e.target.dataset.i;
      if (e.isIntersecting) { if (!made.has(i)) made.set(i, make(e.target, sections[i][3], i)); made.get(i)?.start(); }
      else made.get(i)?.stop();
    }), { rootMargin: "300px 0px" });
    secs.forEach((s, i) => { if (sections[i] && sections[i][3]) bio.observe(s); });
    cleanups.push(() => { bio.disconnect(); made.forEach((m) => m?.stop()); });
  }

  const H = (i) => +sections[i][1];
  const place = (i, el, x, y, w, h) => { Object.assign(el.style, { left: x / W * 100 + "%", top: y / H(i) * 100 + "%", width: w / W * 100 + "%", height: h / H(i) * 100 + "%" }); secs[i].appendChild(el); return el; };

  // sections arrive as you scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("cfx-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.02 });
  secs.forEach((s, i) => { if (i < 1 || reduce || !opts.reveal || opts.reveal === "none") s.classList.add("cfx-in"); else io.observe(s); });
  // v206 mask reveal: drop the mask after it has played (and at once for sections that never animate), with a timer as a backstop
  if (opts.reveal === "mask") secs.forEach((s, i) => {
    const done = () => s.classList.add("cfx-done");
    if (i < 1 || reduce) return done();
    s.addEventListener("transitionend", (e) => { if (e.target === s && /mask/.test(e.propertyName)) done(); });
    const mo = new MutationObserver(() => { if (s.classList.contains("cfx-in")) { setTimeout(done, 1800); mo.disconnect(); } }); mo.observe(s, { attributes: true, attributeFilter: ["class"] });
    cleanups.push(() => mo.disconnect());
  });
  cleanups.push(() => io.disconnect());

  // films play in place, only while on screen
  for (const [i, x, y, w, h, f, rad] of opts.videos || []) {
    if (!secs[i]) continue;
    const box = document.createElement("div"); box.className = "cfx-video";
    box.innerHTML = `<video muted loop playsinline preload="none" aria-label="Project film"></video><button type="button" class="cfx-vbtn" aria-label="Pause the film">❚❚</button>`;
    place(i, box, x, y, w, h);
    if (rad) box.style.borderRadius = `${rad / w * 100}% / ${rad / h * 100}%`;
    const vid = box.querySelector("video"), btn = box.querySelector("button");
    vid.src = asset(f);
    let user = false;   // a visitor's pause wins over autoplay
    const set = (play) => { if (play) vid.play().catch(() => {}); else vid.pause(); };
    // v194: fade the film in only once its first frame is actually on screen (on "play" the box showed black while the file loaded)
    const show = () => box.classList.add("on");
    vid.addEventListener("playing", () => { if (vid.requestVideoFrameCallback) vid.requestVideoFrameCallback(show); else show(); });
    vid.addEventListener("play", () => { btn.textContent = "❚❚"; btn.setAttribute("aria-label", "Pause the film"); });
    vid.addEventListener("pause", () => { btn.textContent = "▶"; btn.setAttribute("aria-label", "Play the film"); });
    btn.addEventListener("click", (e) => { e.stopPropagation(); user = !vid.paused; set(vid.paused); });
    const vio = new IntersectionObserver((es) => { const on = es[0].isIntersecting; if (on && !user && !reduce) { vid.preload = "auto"; set(true); } if (!on) set(false); }, { threshold: 0.35 });
    vio.observe(box);
    if (reduce) { vid.preload = "metadata"; box.classList.add("on"); vid.controls = true; btn.hidden = true; }
    cleanups.push(() => { vio.disconnect(); vid.pause(); vid.removeAttribute("src"); vid.load(); });
  }

  // drag to compare (two images of the same place, e.g. day and night)
  if (opts.compare && secs[opts.compare[0]]) {
    const [i, x, y, w, h, f, la, lb] = opts.compare;
    const box = document.createElement("div"); box.className = "cfx-compare"; box.tabIndex = 0;
    box.setAttribute("role", "slider"); box.setAttribute("aria-label", `${la} or ${lb}: drag to compare`); box.setAttribute("aria-valuemin", "0"); box.setAttribute("aria-valuemax", "100");
    box.innerHTML = `<img src="${asset(f)}" srcset="${asset(f)} 1x, ${asset(f.replace(/\.(\w+)$/, "@2x.$1"))} 2x" alt="${lb}" decoding="async" loading="lazy"><i class="cfx-handle"><b></b></i><span class="cfx-tag l">${la}</span><span class="cfx-tag r">${lb}</span>`;
    place(i, box, x, y, w, h);
    let p = 100;
    const setP = (v) => { p = Math.max(0, Math.min(100, v)); box.style.setProperty("--p", p + "%"); box.setAttribute("aria-valuenow", Math.round(100 - p)); };
    const at = (e) => { const r = box.getBoundingClientRect(); setP((e.clientX - r.left) / r.width * 100); };
    let drag = false;
    box.addEventListener("pointerdown", (e) => { drag = true; box.setPointerCapture(e.pointerId); box.classList.add("drag"); at(e); });
    box.addEventListener("pointermove", (e) => { if (drag) at(e); });
    const up = () => { drag = false; box.classList.remove("drag"); };
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    box.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") { setP(p - 5); e.preventDefault(); } if (e.key === "ArrowRight") { setP(p + 5); e.preventDefault(); } });
    setP(50);   // rests at the middle: day on the left, night on the right; drag to compare

  }

  // a line that draws itself (Carekin: the anxiety curve, with the two red hand-off moments pulsing)
  if (opts.draw && secs[opts.draw[0]]) {
    const [i, x, y, w, h, f, pts = []] = opts.draw;
    const box = document.createElement("div"); box.className = "cfx-draw"; box.setAttribute("aria-hidden", "true");
    box.innerHTML = `<img src="${asset(f)}" srcset="${asset(f)} 1x, ${asset(f.replace(/\.(\w+)$/, "@2x.$1"))} 2x" alt="" decoding="async">` +
      pts.map(([px, py], k) => `<i class="cfx-ring" style="left:${(px - x) / w * 100}%;top:${(py - y) / h * 100}%;--d:${k * 0.35}s"></i>`).join("");
    place(i, box, x, y, w, h);
    secs[i].classList.add("cfx-drawsec");
    if (reduce) box.classList.add("on");
    else { const dio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { box.classList.add("on"); dio.disconnect(); } }, { threshold: 0.45 }); dio.observe(box); cleanups.push(() => dio.disconnect()); }
  }

  // v179: layers that rise into place when seen, one after another (Handovo: the four big numbers in the context section)
  // v182: the numbers stay in the still; each pop covers its own with the section colour and animates a copy in, so if this
  // script can't run the numbers still show, and a slow observer gets a 700 ms in-view check as a backstop
  if (opts.pops) opts.pops.forEach(([i, x, y, w, h, f, bg], k) => {
    if (!secs[i]) return;
    const box = document.createElement("div"); box.className = "cfx-pop"; box.setAttribute("aria-hidden", "true"); box.style.setProperty("--d", (k % 3) * 0.16 + "s"); if (bg) box.style.background = bg;
    box.innerHTML = `<img src="${asset(f)}" srcset="${asset(f)} 1x, ${asset(f.replace(/\.(\w+)$/, "@2x.$1"))} 2x" alt="" decoding="async">`;
    place(i, box, x, y, w, h);
    if (reduce) box.classList.add("on");
    else {
      const on = () => { box.classList.add("on"); o.disconnect(); clearInterval(t); };
      const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) on(); }, { threshold: 0.3 }); o.observe(box);
      const t = setInterval(() => { const r = box.getBoundingClientRect(); if (r.height && r.top < innerHeight - r.height * 0.3 && r.bottom > r.height * 0.3) on(); }, 700);
      cleanups.push(() => { o.disconnect(); clearInterval(t); });
    }
  });

  // v188: live phones (Carekin). Each plays a short loop of real prototype screens: a pause, a finger tap where the button is,
  // the next screen. steps: [[frame, tapX, tapY], …] with taps in the 412 × 917 prototype frame; a step without a tap ends the loop.
  if (opts.seqs) opts.seqs.forEach(([i, x, y, w, h, steps]) => {
    if (!secs[i]) return;
    const box = document.createElement("div"); box.className = "cfx-seq"; box.setAttribute("aria-hidden", "true");
    box.innerHTML = steps.map(([f]) => `<img src="${asset("live-" + f + ".webp")}" alt="" decoding="async">`).join("") + '<i class="cfx-tap"></i>';
    place(i, box, x, y, w, h);
    const imgs = [...box.querySelectorAll("img")], tap = box.querySelector(".cfx-tap");
    let k = 0, timer = 0; imgs[0].classList.add("on");
    const show = (n) => { imgs[k].classList.remove("on"); k = n; imgs[k].classList.add("on"); };
    const step = () => {
      const [, tx, ty] = steps[k];
      if (tx == null) { timer = setTimeout(() => { show(0); timer = setTimeout(step, 1400); }, 2600); return; }
      tap.style.left = (tx / 412) * 100 + "%"; tap.style.top = (ty / 917) * 100 + "%";
      tap.classList.remove("go"); void tap.offsetWidth; tap.classList.add("go");
      timer = setTimeout(() => { show((k + 1) % steps.length); timer = setTimeout(step, 1800); }, 430);
    };
    if (reduce) return;   // reduced motion: the first screen stays put
    const o = new IntersectionObserver((es) => { clearTimeout(timer); if (es[0].isIntersecting) timer = setTimeout(step, 900); }, { threshold: 0.35 });
    o.observe(box); cleanups.push(() => { o.disconnect(); clearTimeout(timer); });
  });

  // v211 travel: a chat bubble follows your scroll from stop to stop (staff message -> Read -> the rule), each stop lighting up as
  // it arrives. opts.travel = { i, stops: [[x, y, w, h], ...], text }. Scroll back and it goes back. Skipped under reduced motion.
  if (opts.travel && secs[opts.travel.i] && !reduce) {
    const { i, stops, text } = opts.travel, sec = secs[i];
    const hl = stops.map(([x, y, w, h]) => { const d = document.createElement("i"); d.className = "cfx-stop"; return place(i, d, x, y, w, h); });
    const bub = document.createElement("div"); bub.className = "cfx-bubble"; bub.textContent = text; bub.setAttribute("aria-hidden", "true"); sec.appendChild(bub);
    const pt = stops.map(([x, y, w, h], k) => [(k === stops.length - 1 ? x + 70 : x + w / 2), y + h / 2]);
    const mid = (stops[0][1] + stops[0][3] / 2);
    const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const KEYS = [[0, .18, 0, 0], [.18, .42, 0, 1], [.42, .58, 1, 1], [.58, .82, 1, 2], [.82, 1.01, 2, 2]];   // [from, to, stop a, stop b]
    let raf = 0;
    const draw = () => {
      raf = 0; const r = sec.getBoundingClientRect(), k = r.width / W, c = r.top + mid * k;
      const pr = Math.min(1, Math.max(0, (innerHeight * .8 - c) / (innerHeight * .5)));
      const [f, t, a, b] = KEYS.find(([f, t]) => pr >= f && pr < t) || KEYS[4];
      const u = ease(Math.min(1, (pr - f) / (t - f))), x = pt[a][0] + (pt[b][0] - pt[a][0]) * u, y = pt[a][1] + (pt[b][1] - pt[a][1]) * u;
      bub.style.left = x / W * 100 + "%"; bub.style.top = y / H(i) * 100 + "%"; bub.style.fontSize = 15 * k + "px";
      bub.classList.toggle("on", pr > .02);
      hl.forEach((d, n) => d.classList.toggle("on", pr > .02 && a === b && a === n || (n === 2 && pr >= .82)));
    };
    let sc = caseEl.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    const on = () => { if (!raf) raf = requestAnimationFrame(draw); };
    (sc || window).addEventListener("scroll", on, { passive: true }); addEventListener("resize", on); draw();
    cleanups.push(() => { (sc || window).removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); });
  }

  // v211 layers: parts of a still that draw themselves in when the section is seen (whiteboard strikes, rings, stickies).
  // opts.layers = [[section, x, y, w, h, file, anim, seq]]; the section swaps to its "-base" still only when it can animate,
  // so without this script (or under reduced motion) the complete still shows.
  if (opts.layers && !reduce) {
    const by = {};
    opts.layers.forEach((l) => { if (secs[l[0]]) (by[l[0]] ||= []).push(l); });
    Object.entries(by).forEach(([i, ls]) => {
      i = +i; const im = secs[i].querySelector(":scope > img"), f = sections[i][0].replace(".webp", "-base.webp");
      if (im) { im.srcset = `${base}work/${slug}/${f}?v=${v} 1440w, ${base}work/${slug}/${f.replace(".webp", "@2x.webp")}?v=${v} 2880w`; im.src = `${base}work/${slug}/${f}?v=${v}`; }
      const els = ls.map(([, x, y, w, h, file, anim, seq]) => {
        const [c, st] = String(seq).split(".").map(Number), e = document.createElement("img");
        e.className = "cfx-layer a-" + anim; e.alt = ""; e.setAttribute("aria-hidden", "true"); e.decoding = "async";
        e.src = asset(file); e.srcset = `${asset(file)} 1x, ${asset(file.replace(/\.(\w+)$/, "@2x.$1"))} 2x`;
        e.style.setProperty("--d", (c * .12 + st * .16).toFixed(2) + "s"); return place(i, e, x, y, w, h);
      });
      const go = () => { els.forEach((e) => e.classList.add("on")); o.disconnect(); clearInterval(t); };
      // start when the first card's top is a quarter of the way up the screen, so the whole sequence plays in view
      const first = els.reduce((m, e) => (parseFloat(e.style.top) < parseFloat(m.style.top) ? e : m), els[0]);
      const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) go(); }, { rootMargin: "0px 0px -25% 0px" }); o.observe(first);
      const t = setInterval(() => { const r = first.getBoundingClientRect(); if (r.height && r.top < innerHeight * .75 && r.bottom > 0) go(); }, 700);
      cleanups.push(() => { o.disconnect(); clearInterval(t); });
    });
  }

  // v210 jump links: [[section, x, y, w, h, targetSection, label]], real links laid over the still that scroll to a section
  if (opts.links) opts.links.forEach(([i, x, y, w, h, to, label]) => {
    if (!secs[i] || !secs[to]) return;
    const a = document.createElement("a"); a.className = "cfx-link"; a.href = "#"; a.setAttribute("aria-label", "Jump to: " + label);
    a.addEventListener("click", (e) => { e.preventDefault(); secs[to].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); });
    place(i, a, x, y, w, h);
  });

  const mo = new MutationObserver(() => { if (!caseEl.isConnected) { cleanups.forEach((f) => { try { f(); } catch (_) {} }); mo.disconnect(); } });
  mo.observe(caseEl.ownerDocument.body, { childList: true, subtree: true });
}
