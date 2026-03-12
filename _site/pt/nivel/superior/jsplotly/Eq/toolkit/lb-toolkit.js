// =====================================================
// Ligand-Binding Toolkit — vFinal (4 plots + spline + HTML export)
// =====================================================

(function () {

  // ---------- helpers ----------
  const W = {
    q: (s, el = document) => el.querySelector(s),
    c: (tag, attrs = {}, parent) => {
      const el = document.createElement(tag);
      for (const k in attrs) {
        if (k === "style") Object.assign(el.style, attrs[k]);
        else if (k === "text") el.textContent = attrs[k];
        else el.setAttribute(k, attrs[k]);
      }
      if (parent) parent.appendChild(el);
      return el;
    }
  };

  function mean(a) { return a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); }
  function pearson(x, y) {
    const mx = mean(x), my = mean(y); let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < x.length; i++) { const X = x[i] - mx, Y = y[i] - my; num += X * Y; dx += X * X; dy += Y * Y; }
    return (dx > 0 && dy > 0) ? num / Math.sqrt(dx * dy) : 0;
  }
  function linreg(x, y) {
    const mx = mean(x), my = mean(y); let Sxy = 0, Sxx = 0;
    for (let i = 0; i < x.length; i++) { const X = x[i] - mx; Sxy += X * (y[i] - my); Sxx += X * X; }
    const slope = Sxx > 0 ? Sxy / Sxx : 0;
    const intercept = my - slope * mx;
    const r2 = Math.pow(pearson(x, y), 2);
    return { slope, intercept, r2 };
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // spline linear segmentada (interpolação entre pontos ordenados em x)
  function smoothLine(x, y, steps = 220) {
    if (x.length < 2) return { xs: x.slice(), ys: y.slice() };
    const idx = x.map((_, i) => i).sort((i, j) => x[i] - x[j]);
    const X = idx.map(i => x[i]), Y = idx.map(i => y[i]);
    const xs = [], ys = [];
    const min = X[0], max = X[X.length - 1];
    for (let k = 0; k < steps; k++) {
      const xi = min + k * (max - min) / (steps - 1);
      let j = 0;
      while (j < X.length - 2 && xi > X[j + 1]) j++;
      const x0 = X[j], x1 = X[j + 1];
      const y0 = Y[j], y1 = Y[j + 1];
      const f = (x1 !== x0) ? (xi - x0) / (x1 - x0) : 0;
      xs.push(xi);
      ys.push(y0 + f * (y1 - y0));
    }
    return { xs, ys };
  }

  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = W.c("a", { href: url, download: name }, document.body);
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); a.remove();
  }
  function draggable(pop) {
    const hdr = pop.querySelector(".hdr");
    let sx = 0, sy = 0, dx = 0, dy = 0, drag = false;
    hdr.addEventListener("pointerdown", (e) => {
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = pop.getBoundingClientRect(); dx = r.left; dy = r.top; hdr.setPointerCapture(e.pointerId);
    });
    hdr.addEventListener("pointermove", (e) => {
      if (!drag) return;
      pop.style.left = (dx + (e.clientX - sx)) + "px"; pop.style.top = (dy + (e.clientY - sy)) + "px";
    });
    hdr.addEventListener("pointerup", () => { drag = false; });
  }
  function maskXY(x, y, keep) {
    const X = [], Y = [], idx = [];
    for (let i = 0; i < x.length; i++) if (keep(i)) { X.push(x[i]); Y.push(y[i]); idx.push(i); }
    return { x: X, y: Y, idx };
  }

  // ---------- base styles ----------
  (function injectCSS() {
    const css = [
      ":root{--bg:#f7fafc;--card:#fff;--card-b:#e5e7eb;--ink:#111;--grid:#cbd5e1;--muted:#eef2f7;--blue:#2563eb;--red:#ef4444;--green:#16a34a;--radius:14px;--shadow:0 10px 30px rgba(0,0,0,.08)}",
      ".lb-top{position:sticky;top:0;z-index:999;background:var(--card);border-bottom:1px solid var(--card-b);display:flex;gap:8px;align-items:center;padding:10px 12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--ink)}",
      ".lb-title{font-weight:700;letter-spacing:.4px}.lb-space{flex:1}",
      ".lb-btn{appearance:none;border:1px solid var(--card-b);background:#fff;color:#111;font-size:12px;letter-spacing:.5px;border-radius:10px;padding:8px 10px;cursor:pointer;transition:.2s background,.2s box-shadow,.2s transform}.lb-btn:active{transform:translateY(1px)}",
      ".lb-btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}.lb-btn.danger{background:var(--red);border-color:var(--red);color:#fff}.lb-btn.success{background:var(--green);border-color:var(--green);color:#fff}",
      ".lb-wrap{padding:12px;display:grid;gap:12px;grid-template-columns:1fr 1fr;grid-auto-rows:minmax(300px,auto);background:var(--bg)}",
      ".lb-card{background:var(--card);border:1px solid var(--card-b);border-radius:var(--radius);position:relative;box-shadow:var(--shadow)}",
      ".lb-card h4{position:absolute;left:12px;top:8px;margin:0;font-size:12px;opacity:.7}",
      ".lb-plot{width:100%;height:100%;min-height:280px}",
      ".lb-fit{position:absolute;right:10px;bottom:8px;top:auto;background:linear-gradient(180deg,#fff,#f8fafc);border:1px solid var(--card-b);border-radius:10px;padding:8px 10px;font-size:12px;white-space:pre;color:#111;box-shadow:var(--shadow);max-width:70%}",
      ".lb-zoom{position:absolute;right:16px;top:52px;background:#fff;border:1px solid var(--card-b);border-radius:10px;padding:6px 10px;font-size:12px;display:none;align-items:center;gap:8px;box-shadow:var(--shadow)}",
      ".lb-pop{position:fixed;left:24px;top:100px;width:560px;background:var(--card);color:#111;border:1px solid var(--card-b);border-radius:12px;display:none;z-index:1200;box-shadow:var(--shadow);resize:both;overflow:auto}",
      ".lb-pop .hdr{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;font-size:13px;border-bottom:1px solid var(--card-b);cursor:move;background:var(--muted);user-select:none}",
      ".lb-pop .body{padding:10px;font-size:13px}",
      ".lb-pop input[type='number'], .lb-pop select{height:28px;border:1px solid var(--card-b);border-radius:8px;padding:0 6px}",
      ".lb-pop label{display:inline-flex;align-items:center;gap:6px;margin:4px 0}",
      ".lb-x{cursor:pointer;border:none;background:#fff;color:#111;border:1px solid var(--card-b);border-radius:8px;padding:2px 6px;font-size:11px}",
      ".diag-grid{display:grid;grid-template-columns:auto 1fr;gap:6px 10px}.diag-key{font-weight:600}.diag-val{background:#fff;border:1px solid var(--card-b);border-radius:8px;padding:4px 6px}",
    ].join("\n");
    W.c("style", { text: css }, document.head || document.body);
  })();

  // ---------- layout ----------
  const top = W.c("div", { class: "lb-top" }, document.body);
  W.c("div", { class: "lb-title", text: "Ligand-Binding Toolkit" }, top);
  W.c("div", { class: "lb-space" }, top);
  const bReset = W.c("button", { class: "lb-btn danger", text: "RESET" }, top);
  const bHTML  = W.c("button", { class: "lb-btn primary", text: "HTML" }, top);
  const bDiag  = W.c("button", { class: "lb-btn", text: "DIAGNOSTICO" }, top);
  const bPar   = W.c("button", { class: "lb-btn", text: "PARAMETROS" }, top);
  const bEq    = W.c("button", { class: "lb-btn", text: "EQUACOES" }, top);
  const bCSV   = W.c("button", { class: "lb-btn", text: "CSV" }, top);
  const bLoad  = W.c("button", { class: "lb-btn", text: "LOAD" }, top);
  const fInput = W.c("input", { type: "file", accept: ".csv", style: { display: "none" } }, top);

  const wrap = W.c("div", { class: "lb-wrap" }, document.body);

  function card(title) {
    const c = W.c("div", { class: "lb-card" }, wrap);
    W.c("h4", { text: title }, c);
    const p = W.c("div", { class: "lb-plot" }, c);
    const z = W.c("div", { class: "lb-zoom" }, c);
    z.innerHTML = "<span>Y zoom</span><input type='range' min='10' max='300' value='100' step='1' style='width:140px'><span class='pct'>100%</span>";
    const box = W.c("div", { class: "lb-fit", text: "" }, c);
    return { card: c, plot: p, box: box, zoom: z };
  }
  const C1 = card("Binding: v vs [L]");
  const C2 = card("Scatchard: v/L vs v");
  const C3 = card("Benesi-Hildebrand: 1/[L] vs 1/v");
  const C4 = card("Hill: log(v/(n - v)) vs log[L]");

  function makePopup(pos) {
    const pop = W.c("div", { class: "lb-pop", style: pos || {} }, document.body);
    const hdr = W.c("div", { class: "hdr" }, pop);
    W.c("span", { text: "drag" }, hdr);
    const x = W.c("button", { class: "lb-x", text: "X" }, hdr);
    x.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); });
    x.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); pop.style.display = "none"; });
    const body = W.c("div", { class: "body" }, pop);
    draggable(pop);
    return { pop, body };
  }
  const Ppar = makePopup();
  const Peq  = makePopup({ right: "20px", left: "auto" });
  const Pdiag= makePopup({ right: "20px", left: "auto", bottom: "20px", top: "auto" });
  const parBody = Ppar.body, eqBody = Peq.body, diagBody = Pdiag.body;

  // ---------- state ----------
  const S = {
    L: [], v: [],
    model: "standard",
    p: {
      n: 1.0, Kd: 1e-6, nH: 1.0,
      err: 0.02, pts: 40, Lmin: 1e-8, Lmax: 1e-3,
      n1: 0.5, n2: 0.5, Kd1: 5e-7, Kd2: 2e-5,
      Kt: 1.0, KdR: 1e-6, KdT: 5e-6,
      draw_line: true,
      fit_below: true,
      hill_midrange: true,
      zoom_sliders: true
    }
  };

  // modelos
  function v_standard(L, n, Kd) { return n * (L / (Kd + L)); }
  function v_hill(L, n, Kd, nH) { const Ln = Math.pow(L, nH), Kdn = Math.pow(Kd, nH); return n * (Ln / (Kdn + Ln)); }
  function v_two(L, n1, Kd1, n2, Kd2) { return n1 * (L / (Kd1 + L)) + n2 * (L / (Kd2 + L)); }
  function v_conf(L, n, Kt, KdR, KdT) {
    const a = L / Math.max(1e-300, KdR);
    const b = L / Math.max(1e-300, KdT);
    const num = a + Kt * b;
    const den = 1 + a + Kt * (1 + b);
    return n * (num / den);
  }

  // CSV / simulate
  function parseCSV(txt) {
    const rows = txt.trim().split(/\r?\n/).map(l => l.split(/[;,]/).map(s => s.trim()));
    const h = rows[0].map(x => x.toLowerCase());
    const iL = h.indexOf("l"), iv = h.indexOf("v");
    if (iL < 0 || iv < 0) throw new Error("CSV must have L and v columns");
    const L = [], v = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]; if (r.length <= Math.max(iL, iv)) continue;
      const a = parseFloat(r[iL]), b = parseFloat(r[iv]);
      if (isFinite(a) && isFinite(b)) { L.push(a); v.push(b); }
    }
    if (L.length < 3) throw new Error("not enough points");
    S.L = L; S.v = v;
  }
  function simulate() {
    const p = S.p, L = [];
    for (let i = 0; i < p.pts; i++) {
      const t = i / (p.pts - 1);
      const logL = Math.log10(p.Lmin) + t * (Math.log10(p.Lmax) - Math.log10(p.Lmin));
      L.push(Math.pow(10, logL));
    }
    let v = [];
    if (S.model === "standard") v = L.map(x => v_standard(x, p.n, p.Kd));
    else if (S.model === "coop_pos" || S.model === "coop_neg") v = L.map(x => v_hill(x, p.n, p.Kd, p.nH));
    else if (S.model === "two_site") v = L.map(x => v_two(x, p.n1, p.Kd1, p.n2, p.Kd2));
    else if (S.model === "conf_trans") v = L.map(x => v_conf(x, p.n, p.Kt, p.KdR, p.KdT));
    v = v.map(y => clamp(y + p.err * (Math.random() * 2 - 1), 0, Math.max(1e9, p.n)));
    S.L = L; S.v = v;
  }

  // UI parametros
  function buildParUI() {
    parBody.innerHTML = [
      "<div><b>Model</b></div>",
      "<select id='p_model'>",
      "<option value='standard'>standard (nH=1)</option>",
      "<option value='coop_pos'>cooperative positive</option>",
      "<option value='coop_neg'>cooperative negative</option>",
      "<option value='two_site'>two-site (Kd1,Kd2)</option>",
      "<option value='conf_trans'>conformational transition (R/T)</option>",
      "</select>",
      "<hr>",
      "n: <input id='p_n' type='number' step='0.1' value='" + S.p.n + "'> ",
      "Kd: <input id='p_kd' type='number' step='1e-9' value='" + S.p.Kd + "'> ",
      "nH: <input id='p_nh' type='number' step='0.1' value='" + S.p.nH + "'>",
      "<br>error sigma: <input id='p_err' type='number' step='0.001' value='" + S.p.err + "'> ",
      "points: <input id='p_pts' type='number' step='1' value='" + S.p.pts + "'>",
      "<br>L min: <input id='p_lmin' type='number' step='1e-9' value='" + S.p.Lmin + "'> ",
      "L max: <input id='p_lmax' type='number' step='1e-3' value='" + S.p.Lmax + "'>",
      "<hr>",
      "<div><b>Two-site</b></div>",
      "n1: <input id='p_n1' type='number' step='0.1' value='" + S.p.n1 + "'> ",
      "n2: <input id='p_n2' type='number' step='0.1' value='" + S.p.n2 + "'>",
      "<br>Kd1: <input id='p_kd1' type='number' step='1e-9' value='" + S.p.Kd1 + "'> ",
      "Kd2: <input id='p_kd2' type='number' step='1e-9' value='" + S.p.Kd2 + "'>",
      "<hr>",
      "<div><b>Conformational (R/T)</b></div>",
      "Kt: <input id='p_Kt' type='number' step='0.1' value='" + S.p.Kt + "'> ",
      "KdR: <input id='p_KdR' type='number' step='1e-9' value='" + S.p.KdR + "'> ",
      "KdT: <input id='p_KdT' type='number' step='1e-9' value='" + S.p.KdT + "'>",
      "<hr>",
      "<label><input id='p_draw' type='checkbox' " + (S.p.draw_line ? 'checked' : '') + "> draw model line only</label> ",
      "<label style='margin-left:10px'><input id='p_fitbelow' type='checkbox' " + (S.p.fit_below ? 'checked' : '') + "> results below</label>",
      "<label style='margin-left:10px'><input id='p_hillmid' type='checkbox' " + (S.p.hill_midrange ? 'checked' : '') + "> Hill fit 10–90%</label>",
      "<label style='margin-left:10px'><input id='p_zoomsl' type='checkbox' " + (S.p.zoom_sliders ? 'checked' : '') + "> zoom sliders</label>",
      "<label style='margin-left:10px'><input id='p_auto' type='checkbox' checked> autoreplot</label>"
    ].join("");

    W.q("#p_model").value = S.model;
    W.q("#p_model").addEventListener("change", (e) => { S.model = e.target.value; if (W.q("#p_auto").checked) { simulate(); renderAll(); } });

    function bindNum(id, key) { W.q(id).addEventListener("input", (e) => { S.p[key] = parseFloat(e.target.value) || S.p[key]; if (W.q("#p_auto").checked) { simulate(); renderAll(); } }); }
    bindNum("#p_n", "n"); bindNum("#p_kd", "Kd"); bindNum("#p_nh", "nH");
    bindNum("#p_err", "err"); bindNum("#p_pts", "pts"); bindNum("#p_lmin", "Lmin"); bindNum("#p_lmax", "Lmax");
    bindNum("#p_n1", "n1"); bindNum("#p_n2", "n2"); bindNum("#p_kd1", "Kd1"); bindNum("#p_kd2", "Kd2");
    bindNum("#p_Kt", "Kt"); bindNum("#p_KdR", "KdR"); bindNum("#p_KdT", "KdT");
    W.q("#p_draw").addEventListener("change", (e) => { S.p.draw_line = e.target.checked; if (W.q("#p_auto").checked) { renderAll(); } });
    W.q("#p_fitbelow").addEventListener("change", (e) => { S.p.fit_below = e.target.checked; if (W.q("#p_auto").checked) { renderAll(); } });
    W.q("#p_hillmid").addEventListener("change", (e) => { S.p.hill_midrange = e.target.checked; if (W.q("#p_auto").checked) { renderAll(); } });
    W.q("#p_zoomsl").addEventListener("change", (e) => {
      S.p.zoom_sliders = e.target.checked;
      toggleZoomSliders(S.p.zoom_sliders);
    });
  }

  function toggleZoomSliders(on) {
    [C1, C2, C3, C4].forEach(C => C.zoom.style.display = on ? "flex" : "none");
  }

  // Equacoes
  function buildEq() {
    const tex = [
      "\\( v = n \\cdot \\dfrac{[L]}{K_d + [L]} \\)",
      "\\( v = n \\cdot \\dfrac{[L]^{n_H}}{K_d^{n_H} + [L]^{n_H}} \\)",
      "\\( v = n_1 \\cdot \\dfrac{[L]}{K_{d1} + [L]} + n_2 \\cdot \\dfrac{[L]}{K_{d2} + [L]} \\)",
      "\\( \\text{Scatchard: } \\dfrac{v}{[L]} = \\dfrac{n}{K_d} - \\dfrac{1}{K_d} v \\)",
      "\\( \\text{Benesi-Hildebrand: } \\dfrac{1}{v} \\; \\text{vs} \\; \\dfrac{1}{[L]} \\)",
      "\\( \\text{Hill: } \\log\\!\\left(\\dfrac{v}{n - v}\\right) = n_H \\log [L] - n_H \\log K_d \\)",
      "\\( \\text{Conformational (R/T): } v = n \\cdot \\dfrac{L/K_{dR} + K_t\\, L/K_{dT}}{1 + L/K_{dR} + K_t (1 + L/K_{dT})} \\)"
    ];
    Peq.body.innerHTML = tex.map(t => " - " + t).join("<br>");
    if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([Peq.body]);
  }

  // Ajuste não-linear Langmuir
  function fitLangmuir(L, v) {
    let n0 = 1, Kd0 = 1e-6;
    try {
      const x = v.slice(), y = v.map((vi, i) => vi / Math.max(1e-300, L[i]));
      const r = linreg(x, y);
      const Kd_est = r.slope !== 0 ? -1 / r.slope : Kd0;
      const n_est = isFinite(Kd_est) ? r.intercept * Kd_est : n0;
      if (isFinite(n_est) && n_est > 0) n0 = n_est;
      if (isFinite(Kd_est) && Kd_est > 0) Kd0 = Kd_est;
    } catch (e) { }
    let n = n0, Kd = Kd0, lam = 1e-2;
    for (let it = 0; it < 30; it++) {
      let J11 = 0, J12 = 0, J22 = 0, g1 = 0, g2 = 0;
      for (let i = 0; i < L.length; i++) {
        const Li = L[i], yi = v[i];
        const denom = (Kd + Li), f = n * Li / denom;
        const r = yi - f;
        const dfn = Li / denom;
        const dfk = -n * Li / (denom * denom);
        J11 += dfn * dfn; J12 += dfn * dfk; J22 += dfk * dfk;
        g1 += dfn * r; g2 += dfk * r;
      }
      J11 += lam; J22 += lam;
      const det = J11 * J22 - J12 * J12; if (Math.abs(det) < 1e-18) break;
      const dn = (g1 * J22 - g2 * J12) / det;
      const dK = (J11 * g2 - J12 * g1) / det;
      const n_new = Math.max(1e-9, n + dn);
      const Kd_new = Math.max(1e-12, Kd + dK);
      if (!isFinite(n_new) || !isFinite(Kd_new)) break;
      n = n_new; Kd = Kd_new;
    }
    return { n, Kd };
  }

  // posicionar caixa
  function placeFitBox(box, below) { box.style.top = below ? "auto" : "8px"; box.style.bottom = below ? "8px" : "auto"; }

  // layout base
  function baseLayout(xTitle, yTitle) {
    return {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      margin: { l: 60, r: 18, t: 22, b: 50 },
      xaxis: { title: xTitle, color: "#111", gridcolor: "#cbd5e1", zerolinecolor: "#cbd5e1" },
      yaxis: { title: yTitle, color: "#111", gridcolor: "#cbd5e1", zerolinecolor: "#cbd5e1" },
      showlegend: true,
      legend: { orientation: "h", x: 0, y: -0.25, xanchor: "left", yanchor: "top", bgcolor: "#fff", bordercolor: "#e5e7eb", borderwidth: 1 }
    };
  }

  // conectar sliders de zoom
  function attachZoom(C, axis) {
    const slider = C.zoom.querySelector("input");
    const pct = C.zoom.querySelector(".pct");
    slider.oninput = () => {
      pct.textContent = slider.value + "%";
      const scale = parseFloat(slider.value) / 100;
      Plotly.relayout(C.plot, { [axis]: { autorange: true } }).then(() => {
        Plotly.relayout(C.plot, { [axis + ".range"]: null });
        Plotly.relayout(C.plot, {}).then(() => {
          const ax = C.plot._fullLayout[axis];
          const c = (ax.range[0] + ax.range[1]) / 2;
          const half = (ax.range[1] - ax.range[0]) / 2 / scale;
          Plotly.relayout(C.plot, { [axis + ".range"]: [c - half, c + half] });
        });
      });
    };
  }

  // render
  function renderAll() {
    const L = S.L.slice(), v = S.v.slice(), p = S.p;

    [C1, C2, C3, C4].forEach(C => placeFitBox(C.box, p.fit_below));
    toggleZoomSliders(p.zoom_sliders);

    // 1) Binding
    const xL = L.slice(), yData = v.slice();
    const est = fitLangmuir(xL, yData);
    const xs = [];
    const minL = Math.min(...xL), maxL = Math.max(...xL);
    for (let i = 0; i < 300; i++) {
      const t = i / 299;
      const Li = Math.pow(10, Math.log10(minL) * (1 - t) + Math.log10(maxL) * t);
      xs.push(Li);
    }
    xs.sort((a, b) => a - b);
    const ysFit = xs.map(Li => est.n * (Li / (est.Kd + Li)));
    const dK = [
      { name: "data", x: xL, y: yData, mode: "markers", type: "scatter", marker: { size: 6, symbol: "circle" } },
      { name: "NL fit (n,Kd)", x: xs, y: ysFit, mode: "lines", line: { width: 2 } }
    ];
    if (p.draw_line) {
      const ysM = xs.map(Li => {
        if (S.model === "standard") return v_standard(Li, p.n, p.Kd);
        if (S.model === "coop_pos" || S.model === "coop_neg") return v_hill(Li, p.n, p.Kd, p.nH);
        if (S.model === "two_site") return v_two(Li, p.n1, p.Kd1, p.n2, p.Kd2);
        if (S.model === "conf_trans") return v_conf(Li, p.n, p.Kt, p.KdR, p.KdT);
        return 0;
      });
      dK.push({ name: "ideal (model)", x: xs, y: ysM, mode: "lines", line: { width: 1 }, opacity: .6 });
    }
    Plotly.purge(C1.plot);
    Plotly.newPlot(C1.plot, dK, baseLayout("[L]", "v"), { displayModeBar: false });
    C1.box.textContent = "nonlinear: v = n·L/(Kd+L)\n n≈" + est.n.toFixed(3) + "  Kd≈" + est.Kd.toExponential(2);
    if (p.zoom_sliders) attachZoom(C1, "yaxis");

    // 2) Scatchard — spline
    const xS = v.slice();
    const yS = v.map((vi, i) => vi / Math.max(1e-300, L[i]));
    const sS = smoothLine(xS, yS, 240);
    const dS = [
      { name: "data", x: xS, y: yS, mode: "markers", type: "scatter", marker: { size: 6, symbol: "circle" } },
      { name: "spline", x: sS.xs, y: sS.ys, mode: "lines", line: { width: 2 } }
    ];
    Plotly.purge(C2.plot);
    Plotly.newPlot(C2.plot, dS, baseLayout("v", "v/L"), { displayModeBar: false });
    C2.box.textContent = "Scatchard: spline conectando os pontos (sem ajuste paramétrico).";
    if (p.zoom_sliders) attachZoom(C2, "yaxis");

    // 3) Benesi–Hildebrand — spline
    const raw_xB = L.map(x => 1 / Math.max(1e-300, x));
    const raw_yB = v.map(y => 1 / Math.max(1e-300, y));
    const mB = maskXY(raw_xB, raw_yB, i => v[i] > 1e-12 && L[i] > 0);
    const sB = smoothLine(mB.x, mB.y, 240);
    const dB = [
      { name: "data", x: mB.x, y: mB.y, mode: "markers", type: "scatter", marker: { size: 6, symbol: "circle" } },
      { name: "spline", x: sB.xs, y: sB.ys, mode: "lines", line: { width: 2 } }
    ];
    Plotly.purge(C3.plot);
    Plotly.newPlot(C3.plot, dB, baseLayout("1/[L]", "1/v"), { displayModeBar: false });
    C3.box.textContent = "Benesi–Hildebrand: spline conectando os pontos (sem ajuste paramétrico).";
    if (p.zoom_sliders) attachZoom(C3, "yaxis");

    // 4) Hill — |y|<=5 + ajuste 10–90%
    const YMAX = 5, n_eff = S.p.n;
    const xH_all = [], yH_all = [];
    for (let i = 0; i < S.L.length; i++) {
      const Li = S.L[i], vi = S.v[i];
      if (Li > 0 && vi > 0 && n_eff > vi) {
        const x = Math.log10(Li);
        const y = Math.log10(vi / Math.max(1e-300, n_eff - vi));
        if (Number.isFinite(x) && Number.isFinite(y) && Math.abs(y) <= YMAX) {
          xH_all.push(x); yH_all.push(y);
        }
      }
    }
    let dHill = [{ name: "data", x: xH_all, y: yH_all, mode: "markers", type: "scatter", marker: { size: 6, symbol: "circle" } }];

    const xF = [], yF = [];
    for (let i = 0; i < S.v.length; i++) {
      const theta = S.v[i] / n_eff;
      if (S.v[i] > 1e-12 && S.L[i] > 0 && theta > 0.1 && theta < 0.9) {
        const xx = Math.log10(S.L[i]);
        const yy = Math.log10(S.v[i] / Math.max(1e-300, n_eff - S.v[i]));
        if (Number.isFinite(xx) && Number.isFinite(yy) && Math.abs(yy) <= YMAX) { xF.push(xx); yF.push(yy); }
      }
    }
    let hillTxt = "Hill: ";
    if (xF.length >= 2 && (S.model === "standard" || S.model === "coop_pos" || S.model === "coop_neg")) {
      const r = linreg(xF, yF);
      const xr = [Math.min(...xF), Math.max(...xF)];
      const yr = xr.map(x => r.slope * x + r.intercept);
      dHill.push({ name: "linear fit (10–90%)", x: xr, y: yr, mode: "lines", line: { width: 2 } });
      const nH = r.slope, logKd = -r.intercept / Math.max(1e-12, nH), Kd = Math.pow(10, logKd);
      hillTxt += "10–90%: nH=" + nH.toFixed(3) + ", Kd≈" + Kd.toExponential(2) + ", R²=" + r.r2.toFixed(4);
    } else {
      hillTxt += "sem ajuste (poucos pontos na faixa 10–90%).";
    }
    const layHill = baseLayout("log[L]", "log( v/(n - v) )");
    layHill.yaxis.range = [-YMAX, YMAX];
    Plotly.purge(C4.plot);
    Plotly.newPlot(C4.plot, dHill, layHill, { displayModeBar: false });
    C4.box.textContent = hillTxt;
    if (p.zoom_sliders) attachZoom(C4, "yaxis");

    // Diagnostics
    const rows = [
      "<div class='diag-key'>model</div><div class='diag-val'>" + S.model + "</div>",
      "<div class='diag-key'>points</div><div class='diag-val'>" + S.L.length + "</div>",
      "<div class='diag-key'>n</div><div class='diag-val'>" + p.n + "</div>",
      "<div class='diag-key'>Kd</div><div class='diag-val'>" + p.Kd + "</div>",
      "<div class='diag-key'>nH</div><div class='diag-val'>" + p.nH + "</div>"
    ];
    if (S.model === "two_site") {
      rows.push("<div class='diag-key'>n1,n2</div><div class='diag-val'>" + p.n1 + ", " + p.n2 + "</div>");
      rows.push("<div class='diag-key'>Kd1,Kd2</div><div class='diag-val'>" + p.Kd1 + ", " + p.Kd2 + "</div>");
    }
    if (S.model === "conf_trans") {
      rows.push("<div class='diag-key'>Kt</div><div class='diag-val'>" + p.Kt + "</div>");
      rows.push("<div class='diag-key'>KdR,KdT</div><div class='diag-val'>" + p.KdR + ", " + p.KdT + "</div>");
    }
    diagBody.innerHTML = "<div class='diag-grid'>" + rows.join("") + "</div>";
  }

  // export CSV
  function exportCSV() {
    const lines = ["L,v"]; for (let i = 0; i < S.L.length; i++) lines.push(S.L[i] + "," + S.v[i]);
    download("LB_data.csv", lines.join("\n"), "text/csv;charset=utf-8");
  }

  // ---------- HTML export (avançado) ----------
  function viewerJSString() {
    return (
`(function(){
  function onload(fn){ if(document.readyState==="complete") fn(); else window.addEventListener("load",fn); }
  function mean(a){return a.reduce((x,y)=>x+y,0)/Math.max(1,a.length)}
  function pearson(x,y){const mx=mean(x),my=mean(y);let num=0,dx=0,dy=0;for(let i=0;i<x.length;i++){const X=x[i]-mx,Y=y[i]-my;num+=X*Y;dx+=X*X;dy+=Y*Y}return(dx>0&&dy>0)?num/Math.sqrt(dx*dy):0}
  function linreg(x,y){const mx=mean(x),my=mean(y);let Sxy=0,Sxx=0;for(let i=0;i<x.length;i++){const X=x[i]-mx;Sxy+=X*(y[i]-my);Sxx+=X*X}const s=Sxx>0?Sxy/Sxx:0;const b=my-s*mx;return {slope:s,intercept:b,r2:Math.pow(pearson(x,y),2)}}
  function smoothLine(x,y,steps){ if(steps===void 0) steps=220; if(x.length<2) return {xs:x.slice(),ys:y.slice()};
    const idx=x.map((_,i)=>i).sort((i,j)=>x[i]-x[j]); const X=idx.map(i=>x[i]), Y=idx.map(i=>y[i]);
    const xs=[], ys=[], min=X[0], max=X[X.length-1];
    for(let k=0;k<steps;k++){const xi=min+k*(max-min)/(steps-1); let j=0; while(j<X.length-2 && xi>X[j+1]) j++;
      const x0=X[j], x1=X[j+1], y0=Y[j], y1=Y[j+1], f=(x1!==x0)?(xi-x0)/(x1-x0):0; xs.push(xi); ys.push(y0+f*(y1-y0));}
    return {xs,ys};
  }
  function fitLangmuir(L,v){let n0=1,Kd0=1e-6;try{const x=v.slice(),y=v.map((vi,i)=>vi/Math.max(1e-300,L[i]));const r=linreg(x,y);const Kd_est=r.slope!==0?-1/r.slope:Kd0;const n_est=isFinite(Kd_est)?r.intercept*Kd_est:n0;if(isFinite(n_est)&&n_est>0)n0=n_est;if(isFinite(Kd_est)&&Kd_est>0)Kd0=Kd_est}catch(e){}let n=n0,Kd=Kd0,lam=1e-2;for(let it=0;it<30;it++){let J11=0,J12=0,J22=0,g1=0,g2=0;for(let i=0;i<L.length;i++){const Li=L[i],yi=v[i],den=(Kd+Li),f=n*Li/den,r=yi-f,dfn=Li/den,dfk=-n*Li/(den*den);J11+=dfn*dfn;J12+=dfn*dfk;J22+=dfk*dfk;g1+=dfn*r;g2+=dfk*r}J11+=lam;J22+=lam;const det=J11*J22-J12*J12;if(Math.abs(det)<1e-18)break;const dn=(g1*J22-g2*J12)/det,dK=(J11*g2-J12*g1)/det;n=Math.max(1e-9,n+dn);Kd=Math.max(1e-12,Kd+dK)}return{n,Kd}}
  function layout(x,y){return{paper_bgcolor:"white",plot_bgcolor:"white",margin:{l:60,r:18,t:22,b:50},xaxis:{title:x},yaxis:{title:y},showlegend:true,legend:{orientation:"h",x:0,y:-0.25,xanchor:"left",yanchor:"top"}}}

  onload(function(){
    var P=window.payload, Ls=P.L.slice(), vs=P.v.slice(), pr=P.params||{}, model=P.model||"standard";
    var root=document.body;

    // Cabeçalho
    var head=document.createElement("div"); head.style.padding="10px"; head.style.borderBottom="1px solid #e5e7eb"; head.style.fontFamily="system-ui,Segoe UI,Roboto,Arial";
    head.innerHTML="<b>Modelo:</b> "+model+" &nbsp;|&nbsp; <b>n</b>: "+(pr.n??"")+" &nbsp;<b>Kd</b>: "+(pr.Kd??"")+" &nbsp;<b>nH</b>: "+(pr.nH??"");
    root.appendChild(head);

    // Grid + cards + notas
    var grid=document.createElement("div"); grid.style.display="grid"; grid.style.gridTemplateColumns="1fr 1fr"; grid.style.gap="10px"; grid.style.padding="10px"; root.appendChild(grid);
    function card(title){var c=document.createElement("div"); c.style.minHeight="300px"; c.style.border="1px solid #e5e7eb"; c.style.borderRadius="12px"; c.style.boxShadow="0 6px 20px rgba(0,0,0,.06)"; c.style.position="relative";
      var h=document.createElement("div"); h.textContent=title; h.style.fontSize="12px"; h.style.opacity=".7"; h.style.margin="6px 8px"; c.appendChild(h);
      var p=document.createElement("div"); p.style.width="100%"; p.style.height="300px"; c.appendChild(p);
      var note=document.createElement("div"); note.style.position="absolute"; note.style.right="12px"; note.style.bottom="10px"; note.style.background="rgba(255,255,255,.92)"; note.style.border="1px solid #e5e7eb"; note.style.borderRadius="10px"; note.style.padding="8px 10px"; note.style.fontSize="12px"; note.style.whiteSpace="pre"; c.appendChild(note);
      grid.appendChild(c); return {plot:p,note:note}; }

    var C1=card("Binding: v vs [L]"),
        C2=card("Scatchard: v/L vs v"),
        C3=card("Benesi-Hildebrand: 1/[L] vs 1/v"),
        C4=card("Hill: log(v/(n - v)) vs log[L]");

    // 1) Binding
    (function(){
      var d=[{name:"data",x:Ls,y:vs,mode:"markers",type:"scatter",marker:{size:6,symbol:"circle"}}];
      if(Ls.length>=3){
        var est=fitLangmuir(Ls,vs);
        var minL=Math.min.apply(null,Ls), maxL=Math.max.apply(null,Ls), xs=[];
        for(var i=0;i<300;i++){var t=i/299; xs.push(Math.pow(10, Math.log10(minL)*(1-t)+Math.log10(maxL)*t));}
        xs.sort(function(a,b){return a-b});
        var ys=xs.map(function(L){return est.n*(L/(est.Kd+L))});
        d.push({name:"NL fit (n,Kd)",x:xs,y:ys,mode:"lines"});
        C1.note.textContent="nonlinear: v=n·L/(Kd+L)\\n n≈"+est.n.toFixed(3)+"  Kd≈"+est.Kd.toExponential(2);
      }
      Plotly.newPlot(C1.plot,d,layout("[L]","v"),{displayModeBar:false});
    })();

    // 2) Scatchard (spline)
    (function(){
      var x=vs.slice(), y=vs.map(function(vi,i){return vi/Math.max(1e-300,Ls[i])});
      var s=smoothLine(x,y,240);
      var d=[{name:"data",x:x,y:y,mode:"markers",type:"scatter",marker:{size:6,symbol:"circle"}},
             {name:"spline",x:s.xs,y:s.ys,mode:"lines"}];
      C2.note.textContent="Spline entre pontos (sem ajuste paramétrico).";
      Plotly.newPlot(C2.plot,d,layout("v","v/L"),{displayModeBar:false});
    })();

    // 3) Benesi–Hildebrand (spline)
    (function(){
      var x=[],y=[]; for(var i=0;i<Ls.length;i++){ if(vs[i]>1e-12 && Ls[i]>0){ x.push(1/Ls[i]); y.push(1/Math.max(1e-300,vs[i])); } }
      var s=smoothLine(x,y,240);
      var d=[{name:"data",x:x,y:y,mode:"markers",type:"scatter",marker:{size:6,symbol:"circle"}},
             {name:"spline",x:s.xs,y:s.ys,mode:"lines"}];
      C3.note.textContent="Spline entre pontos (sem ajuste paramétrico).";
      Plotly.newPlot(C3.plot,d,layout("1/[L]","1/v"),{displayModeBar:false});
    })();

    // 4) Hill (|y|<=5, ajuste 10–90%)
    (function(){
      var YMAX=5, n=(pr.n||1), xAll=[], yAll=[];
      for(var i=0;i<Ls.length;i++){
        var Li=Ls[i], vi=vs[i];
        if(Li>0 && vi>0 && n>vi){
          var x=Math.log10(Li), y=Math.log10(vi/Math.max(1e-300,n-vi));
          if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(y)<=YMAX){ xAll.push(x); yAll.push(y); }
        }
      }
      var d=[{name:"data",x:xAll,y:yAll,mode:"markers",type:"scatter",marker:{size:6,symbol:"circle"}}];
      var xs=[],ys=[];
      for(var i=0;i<Ls.length;i++){
        var th=vs[i]/n;
        if(vs[i]>1e-12 && Ls[i]>0 && th>0.1 && th<0.9){
          var xx=Math.log10(Ls[i]), yy=Math.log10(vs[i]/Math.max(1e-300,n-vs[i]));
          if(Number.isFinite(xx)&&Number.isFinite(yy)&&Math.abs(yy)<=YMAX){ xs.push(xx); ys.push(yy); }
        }
      }
      if(xs.length>=2){
        var r=linreg(xs,ys), xr=[Math.min.apply(null,xs),Math.max.apply(null,xs)], yr=[xr[0]*r.slope+r.intercept, xr[1]*r.slope+r.intercept];
        d.push({name:"linear fit (10–90%)",x:xr,y:yr,mode:"lines"});
        var nH=r.slope, logKd=-r.intercept/Math.max(1e-12,nH), Kd=Math.pow(10,logKd);
        C4.note.textContent="10–90%: nH="+nH.toFixed(3)+", Kd≈"+Kd.toExponential(2)+", R²="+r.r2.toFixed(4);
      }
      var lay=layout("log[L]","log( v/(n - v) )"); lay.yaxis.range=[-YMAX,YMAX];
      Plotly.newPlot(C4.plot,d,lay,{displayModeBar:false});
    })();

  });
})();`
    );
  }

  function exportHTML() {
    const payload = { L: S.L, v: S.v, model: S.model, params: S.p };
    const html = [
      "<!doctype html>",
      "<html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>",
      "<title>Ligand-Binding Viewer</title>",
      "<script src='https://cdn.plot.ly/plotly-2.35.3.min.js'></script>",
      "</head><body>",
      "<script>var payload=" + JSON.stringify(payload) + "</script>",
      "<script>", viewerJSString(), "</script>",
      "</body></html>"
    ].join("");
    download("LigandBinding_viewer.html", html, "text/html;charset=utf-8");
  }

  // eventos topo
  bPar.addEventListener("click", () => { Ppar.pop.style.display = (Ppar.pop.style.display === "block") ? "none" : "block"; });
  bEq.addEventListener("click", () => { Peq.pop.style.display = (Peq.pop.style.display === "block") ? "none" : "block"; if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([eqBody]); });
  bDiag.addEventListener("click", () => { Pdiag.pop.style.display = (Pdiag.pop.style.display === "block") ? "none" : "block"; });
  bReset.addEventListener("click", () => {
    S.model = "standard";
    S.p = {
      n: 1.0, Kd: 1e-6, nH: 1.0, err: 0.02, pts: 40, Lmin: 1e-8, Lmax: 1e-3,
      n1: 0.5, n2: 0.5, Kd1: 5e-7, Kd2: 2e-5, Kt: 1.0, KdR: 1e-6, KdT: 5e-6,
      draw_line: true, fit_below: true, hill_midrange: true, zoom_sliders: true
    };
    buildParUI(); simulate(); renderAll();
  });
  bCSV.addEventListener("click", exportCSV);
  bLoad.addEventListener("click", () => fInput.click());
  fInput.addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const txt = await f.text(); parseCSV(txt); renderAll(); Pdiag.pop.style.display = "block"; }
    catch (err) { alert("CSV error: " + err.message); }
  });
  bHTML.addEventListener("click", exportHTML);

  // init
  (function injectMathJax() {
    if (window.MathJax) return;
    const s = W.c("script", { type: "text/javascript", id: "mjx-script", src: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" });
    (document.head || document.body).appendChild(s);
  })();
  buildParUI();
  buildEq();
  simulate();
  renderAll();

})();
