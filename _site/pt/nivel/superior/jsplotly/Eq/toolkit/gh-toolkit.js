/* GH-Toolkit — Gibbs–Helmholtz & Van’t Hoff (educacional, ΔΔC_p)
   • Botões: reset | html | csv | equações | parâmetros | diagnóstico
   • Modal central (cenário, comportamento, presets, comparação ΔΔC_p, salvar/carregar JSON, ΔG(Tm)=0)
   • 4 gráficos: ΔG×T (com Tm), lnK×1/T, ΔH×T, T·ΔS×T
   • Unidades: kJ/mol & J/mol/K  ↔  kcal/mol & cal/mol/K
   • Exporta HTML (gráficos+diagnóstico) e CSV (modelo A/B + exp A)
*/

(function(){
  const R = 8.314462618; // J/mol/K
  const byId = id => document.getElementById(id);

  // =================== Termodinâmica (ΔCp const.) ===================
  function dH(T,p){ return (p.dH0_kJ*1000) + p.dCp*(T - p.T0); }          // J/mol
  function dS(T,p){ return p.dS0 + p.dCp*Math.log(T/p.T0); }              // J/mol/K
  function dG(T,p){ return dH(T,p) - T*dS(T,p); }                         // J/mol
  function K(T,p){ return Math.exp(-dG(T,p)/(R*T)); }

  // ============================ Utils ===============================
  function linspace(a,b,n){ const o=[]; if(n<=1){o.push(a);return o;} const h=(b-a)/(n-1); for(let i=0;i<n;i++) o.push(a+i*h); return o; }
  function rng(){ let s=(Math.random()*2**32)>>>0; return ()=>((s^=s<<13, s^=s>>>17, s^=s<<5)>>>0)/4294967296; }
  function randRange([lo,hi], r){ return lo + (hi-lo)*r(); }

  // conversores
  const KJ_TO_KCAL = 0.239005736;  // kJ → kcal
  const J_TO_CAL   = 1/4.184;      //  J → cal
  function eLabel(unit){ return unit==="kcal" ? "kcal/mol" : "kJ/mol"; }
  function sLabel(unit){ return unit==="kcal" ? "cal/mol/K" : "J/mol/K"; }
  function eConv_kJ(x,unit){ return unit==="kcal" ? x*KJ_TO_KCAL : x; }
  function sConv_J(x,unit){ return unit==="kcal" ? x*J_TO_CAL   : x; }

  // Bissecção para Tm (ΔG=0)
  function findTm(p,Tmin,Tmax){
    const f=T=>dG(T,p); let a=Tmin,b=Tmax,fa=f(a),fb=f(b);
    if(fa*fb>0) return null;
    for(let i=0;i<64;i++){ const m=(a+b)/2, fm=f(m); if(Math.abs(fm)<1e-9) return m; (fa*fm<=0)? (b=m, fb=fm) : (a=m, fa=fm); }
    return (a+b)/2;
  }

  // Ajuste ΔG(Tm_alvo)=0 resolvendo ΔS0
  function setTmByDeltaS0(p, Tm){
    // 0 = ΔH(Tm) - Tm ΔS(Tm)
    // ΔS0 = [ΔH0*1e3 + ΔCp (Tm-T0) - Tm ΔCp ln(Tm/T0)] / Tm
    const num = (p.dH0_kJ*1000) + p.dCp*(Tm - p.T0) - Tm*p.dCp*Math.log(Tm/p.T0);
    return num / Tm; // J/mol/K
  }
  
  
// ===== Regressões =====
function linreg(x, y){
  const n=x.length;
  let sx=0, sy=0, sxx=0, sxy=0;
  for(let i=0;i<n;i++){ const xi=x[i], yi=y[i]; sx+=xi; sy+=yi; sxx+=xi*xi; sxy+=xi*yi; }
  const den = n*sxx - sx*sx;
  const m = den!==0 ? (n*sxy - sx*sy)/den : 0;
  const b = (sy - m*sx)/n;
  // R²
  const ybar = sy/n;
  let ssTot=0, ssRes=0;
  for(let i=0;i<n;i++){ ssTot += (y[i]-ybar)**2; ssRes += (y[i]-(m*x[i]+b))**2; }
  const r2 = ssTot>0 ? 1-ssRes/ssTot : 1;
  return {m,b,r2};
}

// resolve A·coef = b (3x3) via eliminação de Gauss
function solve3(A,b){
  A=A.map(r=>r.slice()); b=b.slice();
  for(let k=0;k<3;k++){
    // pivot
    let p=k; for(let i=k+1;i<3;i++) if(Math.abs(A[i][k])>Math.abs(A[p][k])) p=i;
    if(p!==k){ [A[k],A[p]]=[A[p],A[k]]; [b[k],b[p]]=[b[p],b[k]]; }
    const piv=A[k][k]||1e-12;
    for(let j=k;j<3;j++) A[k][j]/=piv; b[k]/=piv;
    for(let i=0;i<3;i++) if(i!==k){
      const f=A[i][k];
      for(let j=k;j<3;j++) A[i][j]-=f*A[k][j];
      b[i]-=f*b[k];
    }
  }
  return b; // solução
}

function quadreg(x,y){
  // y ~ a x^2 + b x + c
  const n=x.length;
  let s1=0,sx=0,sx2=0,sx3=0,sx4=0, sy=0,sxY=0,sx2Y=0;
  for(let i=0;i<n;i++){
    const xi=x[i], yi=y[i], x2=xi*xi;
    s1+=1; sx+=xi; sx2+=x2; sx3+=x2*xi; sx4+=x2*x2;
    sy+=yi; sxY+=xi*yi; sx2Y+=x2*yi;
  }
  const A=[[sx4,sx3,sx2],[sx3,sx2,sx],[sx2,sx,s1]];
  const B=[sx2Y,sxY,sy];
  const [a,b,c] = solve3(A,B);
  // R²
  const ybar = sy/n;
  let ssTot=0, ssRes=0;
  for(let i=0;i<n;i++){ const fi=a*x[i]*x[i]+b*x[i]+c; ssTot+=(y[i]-ybar)**2; ssRes+=(y[i]-fi)**2; }
  const r2 = ssTot>0 ? 1-ssRes/ssTot : 1;
  return {a,b,c,r2};
}


  // ======================== Simulação ===============================
  function simulate(p){
    const Tgrid = linspace(p.Tmin,p.Tmax,p.n_theory);
    const Texp  = linspace(p.Tmin,p.Tmax,p.n_exp);
    const r = rng();

    const modelA = {
      Tgrid,
      dG_kJ: Tgrid.map(T=> dG(T,p)/1000),
      invT:  Tgrid.map(T=> 1/T),
      lnK:   Tgrid.map(T=> Math.log(K(T,p))),
      dH_kJ: Tgrid.map(T=> dH(T,p)/1000),
      TdS_kJ: Tgrid.map(T=> (T*dS(T,p))/1000)
    };

    const expA = Texp.map(T=>{
      const nG = (r()*2-1)*p.noise_J;             // J/mol
      const nH = (r()*2-1)*(0.35*p.noise_J);      // J/mol
      const dG_obs_J = dG(T,p) + nG;
      const dH_obs_J = dH(T,p) + nH;
      return {
        T, dG_kJ: dG_obs_J/1000,
        invT: 1/T, lnK: -dG_obs_J/(R*T),
        dH_kJ: dH_obs_J/1000,
        TdS_kJ: (dH_obs_J - dG_obs_J)/1000
      };
    });

    return {modelA, expA};
  }

  function simulateB(p, delta_dCp){
    if(!delta_dCp) return null;
    const pB = Object.assign({}, p, { dCp: p.dCp + delta_dCp });
    const Tgrid = linspace(pB.Tmin,pB.Tmax,pB.n_theory);
    return {
      pB,
      Tgrid,
      dG_kJ: Tgrid.map(T=> dG(T,pB)/1000),
      invT:  Tgrid.map(T=> 1/T),
      lnK:   Tgrid.map(T=> Math.log(K(T,pB))),
      dH_kJ: Tgrid.map(T=> dH(T,pB)/1000),
      TdS_kJ: Tgrid.map(T=> (T*dS(T,pB))/1000)
    };
  }

  // ============================= UI =================================
  const root = document.createElement("div");
  root.id="gh-root";
  root.style.cssText="font-family:system-ui,Arial,sans-serif;padding:8px;border-bottom:1px solid #ddd;background:#f8fafc";
  root.innerHTML=`
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <button id="btn-reset">reset</button>
      <button id="btn-html">html</button>
      <button id="btn-csv">csv</button>
      <button id="btn-eqs">equações</button>
      <button id="btn-param">parâmetros</button>
      <button id="btn-diag">diagnóstico</button>
      <div style="margin-left:auto;display:flex;align-items:center;gap:6px;">
        <label style="font-size:12px">unidades</label>
        <select id="sel-unit" style="padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px">
          <option value="kJ">kJ/mol & J/mol/K</option>
          <option value="kcal">kcal/mol & cal/mol/K</option>
        </select>
      </div>
    </div>

    <details id="gh-eqs" style="margin-top:6px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:8px; font-size:13px; line-height:1.4">
  <summary style="cursor:pointer; font-weight:700">Equações (ΔC<sub>p</sub> constante e variantes)</summary>
  <div style="margin-top:6px">
    <b>Formas dependentes de T (ΔC<sub>p</sub> constante)</b><br>
    ΔH(T) = ΔH° + ΔC<sub>p</sub>(T − T₀)<br>
    ΔS(T) = ΔS° + ΔC<sub>p</sub> ln(T/T₀)<br>
    <i>Gibbs–Helmholtz integrada (referida a T₀)</i>:<br>
    ΔG(T) = ΔH° − T·ΔS° + ΔC<sub>p</sub>[(T − T₀) − T ln(T/T₀)]<br>
    ln K = −ΔG(T) / (R·T)<br><br>

    <b>Forma centrada em T<sub>m</sub> (usa ΔH<sub>m</sub> e ΔC<sub>p</sub>)</b><br>
    ΔG(T) = ΔH<sub>m</sub>(1 − T/T<sub>m</sub>) + ΔC<sub>p</sub>[(T − T<sub>m</sub>) − T ln(T/T<sub>m</sub>)]<br><br>

    <b>ΔC<sub>p</sub> com variação linear em T (ΔΔC<sub>p</sub>)</b><br>
    C<sub>p</sub>(T) = C<sub>pr</sub> + ΔΔC<sub>p</sub>(T − T<sub>r</sub>)
  </div>
</details>


    </div>

    <div id="gh-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
      <div id="plot-gh" style="height:360px;background:#fff;border:1px solid #eee;border-radius:6px;"></div>
      <div id="plot-vh" style="height:360px;background:#fff;border:1px solid #eee;border-radius:6px;"></div>
      <div id="plot-dh" style="height:220px;background:#fff;border:1px solid #eee;border-radius:6px;"></div>
      <div id="plot-ts" style="height:220px;background:#fff;border:1px solid #eee;border-radius:6px;"></div>
    </div>
  `;
  document.body.insertBefore(root, document.body.firstChild);

  // Diagnóstico (modal)
  const diagOverlay = document.createElement("div");
  diagOverlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:none;z-index:10000";
  diagOverlay.innerHTML=`
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.3);width:min(760px,95vw);">
      <div style="padding:12px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px">
        <div style="font-weight:700">Diagnóstico</div>
        <div style="margin-left:auto"></div>
        <button id="diag-close" style="padding:6px 10px;border:1px solid #cbd5e1;background:#f1f5f9;border-radius:8px;cursor:pointer">fechar</button>
      </div>
      <div id="diag-body" style="padding:12px 16px; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px; white-space:pre-wrap"></div>
    </div>
  `;
  document.body.appendChild(diagOverlay);
  byId("diag-close").addEventListener("click", ()=> diagOverlay.style.display="none");
  
  document.addEventListener("keydown", (e)=>{
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if(k==="r"){ byId("btn-reset").click(); }
  else if(k==="h"){ byId("btn-html").click(); }
  else if(k==="c"){ byId("btn-csv").click(); }
  else if(k==="d"){ byId("btn-diag").click(); }
  else if(k==="p"){ byId("btn-param").click(); }
  else if(k==="e"){ byId("btn-eqs").click(); }
});


  // Parâmetros (modal)
  const overlay = document.createElement("div");
  overlay.id="gh-overlay";
  overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:none;z-index:9999";
  overlay.innerHTML=`
    <div id="gh-modal" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:#fff; border-radius:12px; box-shadow:0 20px 50px rgba(0,0,0,0.3); width:min(1060px,96vw);">
      <div style="padding:12px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px">
        <div style="font-weight:700">Parâmetros</div>
        <div style="margin-left:auto"></div>
        <button id="btn-close-param" style="padding:6px 10px;border:1px solid #cbd5e1;background:#f1f5f9;border-radius:8px;cursor:pointer">fechar</button>
      </div>
      <div style="padding:12px 16px;display:grid; grid-template-columns:repeat(4,minmax(240px,1fr)); gap:16px;">
        <div>
          <h4 style="margin:6px 0">Referências</h4>
          <label>T<sub>0</sub> (K) <input id="p-T0" type="number" step="0.1" value="298.15"></label><br>
          <label>T<sub>min</sub> (K) <input id="p-Tmin" type="number" step="0.1" value="273.15"></label><br>
          <label>T<sub>max</sub> (K) <input id="p-Tmax" type="number" step="0.1" value="333.15"></label><br>
          <small>Resolução fixa: teoria=200; exp=15</small><br>
          <label>ruído base (J/mol) <input id="p-noise" type="number" step="1" value="150"></label>
          
          <label>unidades
  <select id="p-unit" style="padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;width:auto">
    <option value="kJ">kJ/mol & J/mol/K</option>
    <option value="kcal">kcal/mol & cal/mol/K</option>
  </select>
</label>


        </div>

        <div>
          <h4 style="margin:6px 0">Parâmetros (Prot A)</h4>
          <label>ΔH<sup>0</sup> (kJ/mol) <input id="p-dH0" type="number" step="0.1" value="-40.0"></label><br>
          <label>ΔS<sup>0</sup> (J/mol/K) <input id="p-dS0" type="number" step="0.1" value="-50.0"></label><br>
          <label>ΔC<sub>p</sub> (J/mol/K) <input id="p-dCp" type="number" step="0.1" value="1200.0"></label><br><br>
          <label>T<sub>m</sub> alvo (K) <input id="p-TmTarget" type="number" step="0.1" value="320.0"></label>
          <button id="btn-set-tm" title="Ajustar ΔG(Tm)=0">ajustar ΔG=0</button>
          <hr style="margin:8px 0;border:none;border-top:1px solid #eee">
<div style="font-weight:600;margin:4px 0">Simular por (Tm, ΔHₘ, ΔCₚ)</div>
<label>T<sub>m</sub> (K) <input id="p-sim-Tm" type="number" step="0.01" value="320.0"></label><br>
<label>ΔH<sub>m</sub> (<span class="unitH">kJ/mol</span>) <input id="p-sim-dHm" type="number" step="0.1" value="180.0"></label><br>
<label>ΔC<sub>p</sub> (<span class="unitS">J/mol/K</span>) <input id="p-sim-dCp" type="number" step="1" value="3000"></label><br>
<button id="btn-sim-eq99" title="Usar Eq. 9.9 para construir ΔG(T)">gerar por Eq. 9.9</button>
<small style="display:block;color:#555;margin-top:4px">Converte (T<sub>m</sub>, ΔH<sub>m</sub>, ΔC<sub>p</sub>) em ΔH°(T₀) e ΔS°(T₀) coerentes com a curva de estabilidade.</small>

          <small style="display:block;margin-top:6px;color:#555">Ajusta ΔS° para que ΔG(T<sub>m</sub>)=0 (com ΔC<sub>p</sub> atual).</small>
        </div>

        <div>
          <h4 style="margin:6px 0">Didática</h4>
          <label>Cenário
            <select id="p-cenario">
              <option value="fold_exo">Folding exotérmico</option>
              <option value="fold_endo">Folding endotérmico</option>
              <option value="unfold">Unfolding</option>
              <option value="bind_exo">Binding exotérmico</option>
              <option value="bind_endo">Binding endotérmico</option>
            </select>
          </label><br>
          <label>Comportamento
            <select id="p-comp">
              <option value="meso">Mesófilo</option>
              <option value="thermo">Termófilo</option>
              <option value="psycho">Psicrófilo (frio)</option>
            </select>
          </label><br>
          <label>Preset
            <select id="p-preset">
              <option value="none">Nenhum (aleatório coerente)</option>
              <option value="g_up">termo ↑ΔG global (ΔS₀ mais negativo)</option>
              <option value="cp_down">termo ↓ΔCₚ (curva mais reta)</option>
              <option value="cp_up_psy">psicro ↑ΔCₚ (curvatura ↑)</option>
              <option value="bind_cpn">binder ΔCₚ &lt; 0 (opcional)</option>
            </select>
          </label><br><br>
          <label><input id="p-compare" type="checkbox"> Comparar duas proteínas (usar ΔΔCₚ)</label><br>
          <label>ΔΔCₚ (J/mol/K) <input id="p-ddcp" type="number" step="1" value="300"></label><br><br>
          <button id="btn-apply" style="padding:6px 10px;border:1px solid #cbd5e1;background:#f1f5f9;border-radius:8px;cursor:pointer">aplicar</button>
        </div>

        <div>
<h4 style="margin:6px 0">Presets (JSON)</h4>
<button id="btn-save-json">salvar JSON</button>
<button id="btn-copy-json">copiar</button>
<button id="btn-load-json">arquivo</button>   <!-- ADICIONADO -->
<button id="btn-toggle-jsontext">colar</button>
<input id="file-json" type="file" accept=".json" style="display:none">
<div id="jsontext-wrap" style="display:none;margin-top:6px">
  <textarea id="jsontext" rows="6" style="width:100%;font-family:ui-monospace,monospace"></textarea>
  <div style="margin-top:6px;display:flex;gap:6px">
    <button id="btn-load-jsontext">carregar do texto</button>
    <button id="btn-hide-jsontext">fechar</button>
  </div>
</div>
<small style="display:block;margin-top:6px;color:#555">Copie/cole o preset diretamente ou use arquivo.</small>


        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // estilos mínimos
  const style = document.createElement("style");
  style.textContent = `
    #gh-root button{ padding:6px 10px; border:1px solid #cbd5e1; background:#f1f5f9; border-radius:8px; cursor:pointer }
    #gh-root button:hover{ filter:brightness(0.96) }
    #gh-modal input[type=number], #gh-modal select{ width:200px }
  `;
  document.head.appendChild(style);

  // ============================ Estado =============================
  const state = {
    T0:298.15, Tmin:273.15, Tmax:333.15,
    n_theory:200, n_exp:15,
    dH0_kJ:-40, dS0:-50, dCp:1200,
    noise_J:150,
    cenario:"fold_exo",
    comp:"meso",
    preset:"none",
    compare:false,
    dDeltaCp:300,
    unit:"kJ",          // 'kJ' | 'kcal'
    showEq:false,
    data:null,
    modelB:null
  };

  // ========== presets & comportamentos (PURO) + helpers ==========
  function applyScenarioTweaks(base, sel){
    const out = { ...base };
    if(sel.comp==="thermo"){
      out.Tmin = 300; out.Tmax = 360;
      out.dS0  = out.dS0 - 30;
      out.dCp  = Math.max(600, out.dCp*0.85);
    }else if(sel.comp==="psycho"){
      out.Tmin = 260; out.Tmax = 310;
      out.dS0  = out.dS0 + 20;
      out.dCp  = out.dCp*1.20;
    }else{ out.Tmin = 273.15; out.Tmax = 333.15; }

    switch(sel.cenario){
      case "fold_exo": out.dH0_kJ = Math.min(-20, out.dH0_kJ); break;
      case "fold_endo": out.dH0_kJ = Math.abs(out.dH0_kJ); out.dS0 = Math.abs(out.dS0)+60; break;
      case "unfold": out.dH0_kJ = -out.dH0_kJ; out.dS0 = -out.dS0; break;
      case "bind_exo": out.dH0_kJ = Math.min(-10, out.dH0_kJ); break;
      case "bind_endo": out.dH0_kJ = Math.abs(out.dH0_kJ)*0.6; out.dS0 = Math.abs(out.dS0)+80; break;
    }
    if(sel.preset==="g_up"){ out.dS0 -= 60; }
    else if(sel.preset==="cp_down"){ out.dCp = Math.max(200, out.dCp*0.6); }
    else if(sel.preset==="cp_up_psy"){ out.dCp = Math.min(4000, out.dCp*1.6); }
    else if(sel.preset==="bind_cpn"){ out.dCp = -Math.abs(out.dCp*0.5) || -400; }
    if(sel.preset!=="bind_cpn" && out.dCp<=0) out.dCp = Math.abs(out.dCp)+300;
    return out;
  }
  function getSelectionsFromModal(){
    return {
      cenario: (byId("p-cenario")?.value) || state.cenario,
      comp:    (byId("p-comp")?.value)    || state.comp,
      preset:  (byId("p-preset")?.value)  || state.preset,
      compare: (byId("p-compare")?.checked) ?? state.compare,
      dDeltaCp: parseFloat(byId("p-ddcp")?.value || state.dDeltaCp)
    };
  }
  function randomBase(){
    const r = (()=>{ let s=(Math.random()*2**32)>>>0; return ()=>((s^=s<<13, s^=s>>>17, s^=s<<5)>>>0)/4294967296; })();
    const rr = (a,b)=> a + (b-a)*r();
    return {
      T0: 298.15,
      Tmin: rr(268, 305),
      Tmax: rr(315, 360),
      n_theory: 200, n_exp: 15,
      noise_J: Math.round(rr(80,220)),
      dH0_kJ: -rr(20,120),
      dS0: rr(-250, 50),
      dCp: rr(500,2500)
    };
  }
  function setStateFromAdjusted(adj, sel){
    state.T0 = adj.T0; state.Tmin=adj.Tmin; state.Tmax=adj.Tmax;
    state.n_theory=adj.n_theory; state.n_exp=adj.n_exp;
    state.noise_J=adj.noise_J;
    state.dH0_kJ=adj.dH0_kJ; state.dS0=adj.dS0; state.dCp=adj.dCp;
    state.cenario=sel.cenario; state.comp=sel.comp; state.preset=sel.preset;
    state.compare=sel.compare; state.dDeltaCp=sel.dDeltaCp;
  }

function deriveH0S0FromTm(p, Tm, dHm_kJ, dCp){ 
  // p.T0 em K; dHm_kJ em kJ/mol; dCp em J/mol/K
  const H0_J = (dHm_kJ*1000) + dCp*(p.T0 - Tm);
  const S0_JK= (dHm_kJ*1000)/Tm + dCp*Math.log(p.T0/Tm);
  return { dH0_kJ: H0_J/1000, dS0: S0_JK };
}

  // ======================== Refresh & Draw ==========================
  function refresh(){
    const pA = {
      T0:state.T0, Tmin:state.Tmin, Tmax:state.Tmax,
      n_theory:state.n_theory, n_exp:state.n_exp,
      dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp,
      noise_J:state.noise_J
    };
    state.data = simulate(pA);
    state.modelB = state.compare ? simulateB(pA, state.dDeltaCp) : null;
    draw();
  }

  function draw(){
    const {modelA, expA} = state.data;
    const unit = state.unit;

    // Model A (convertidos p/ exibição)
    const Tgrid = modelA.Tgrid;
    const m_dG = modelA.dG_kJ.map(v=>eConv_kJ(v,unit));
    const m_dH = modelA.dH_kJ.map(v=>eConv_kJ(v,unit));
    const m_TdS= modelA.TdS_kJ.map(v=>eConv_kJ(v,unit));
    const m_invT= modelA.invT, m_lnK=modelA.lnK;
    const S_JK = state.data.modelA.TdS_kJ.map((_,i)=> dS(Tgrid[i], {T0:state.T0,dH0_kJ:state.dH0_kJ,dS0:state.dS0,dCp:state.dCp})); // J/mol/K
const S_u   = S_JK.map(v => sConv_J(v, state.unit)); // cal/mol/K ou J/mol/K
const lnT   = Tgrid.map(T => Math.log(T));

// ajuste linear ΔS vs ln T
const { m:ms, b:bs, r2:r2s } = linreg(lnT, S_u);
const fitS = {
  x:[lnT[0], lnT[lnT.length-1]],
  y:[ms*lnT[0]+bs, ms*lnT[lnT.length-1]+bs],
  mode:"lines", name:"ajuste linear", line:{width:2, dash:"dashdot"}
};
const annS = [{
  xref:"paper", yref:"paper", x:0.02, y:0.98, xanchor:"left", yanchor:"top",
  text:`ΔS = m·ln T + b<br>m=${ms.toFixed(3)} ${sLabel(unit)}; b=${bs.toFixed(3)} ${sLabel(unit)}<br>R²=${r2s.toFixed(4)}`,
  showarrow:false, bgcolor:"rgba(255,255,255,0.85)", bordercolor:"#ddd"
}];


    // ===== Ajustes didáticos =====
const isCpZero = Math.abs(state.dCp) < 1e-9;

// (A) ΔG x T
let fitTrGH=[], annFitGH=[];
if(isCpZero){
  const {m,b,r2}=linreg(Tgrid, m_dG);
  fitTrGH.push({x:[Tgrid[0],Tgrid[Tgrid.length-1]], y:[m*Tgrid[0]+b, m*Tgrid[Tgrid.length-1]+b],
                mode:"lines", name:"ajuste linear (A)", line:{width:2, dash:"dashdot"}});
  annFitGH.push({xref:"paper", yref:"paper", x:0.02, y:0.98, xanchor:"left", yanchor:"top",
    text:`ΔG = m·T + b<br>m=${m.toFixed(4)} ${eLabel(unit)}/K; b=${b.toFixed(3)} ${eLabel(unit)}<br>R²=${r2.toFixed(4)}`,
    showarrow:false, bgcolor:"rgba(255,255,255,0.8)", bordercolor:"#ddd"});
} else {
  const {a,b,c,r2}=quadreg(Tgrid, m_dG);
  // curva suave para exibição
  const Tfine = linspace(Tgrid[0], Tgrid[Tgrid.length-1], 200);
  fitTrGH.push({x:Tfine, y:Tfine.map(t=>a*t*t+b*t+c),
                mode:"lines", name:"ajuste quadrático (A)", line:{width:2, dash:"dashdot"}});
  annFitGH.push({xref:"paper", yref:"paper", x:0.02, y:0.98, xanchor:"left", yanchor:"top",
    text:`ΔG = a·T² + b·T + c<br>a=${a.toExponential(3)} ${eLabel(unit)}/K²; b=${b.toExponential(3)} ${eLabel(unit)}/K;<br>c=${c.toFixed(3)} ${eLabel(unit)}; R²=${r2.toFixed(4)}`,
    showarrow:false, bgcolor:"rgba(255,255,255,0.8)", bordercolor:"#ddd"});
}

// (B) lnK x 1/T
let fitTrVH=[], annFitVH=[];
if(isCpZero){
  const {m,b,r2}=linreg(m_invT, m_lnK);
  const x0=m_invT[0], x1=m_invT[m_invT.length-1];
  fitTrVH.push({x:[x0,x1], y:[m*x0+b, m*x1+b], mode:"lines", name:"ajuste linear (A)", line:{width:2, dash:"dashdot"}});
  annFitVH.push({xref:"paper", yref:"paper", x:0.02, y:0.98, xanchor:"left", yanchor:"top",
    text:`lnK = m·(1/T) + b<br>m=${m.toFixed(4)}; b=${b.toFixed(3)}<br>R²=${r2.toFixed(4)}`,
    showarrow:false, bgcolor:"rgba(255,255,255,0.8)", bordercolor:"#ddd"});
} else {
  const {a,b,c,r2}=quadreg(m_invT, m_lnK);
  const Xfine = linspace(m_invT[0], m_invT[m_invT.length-1], 200);
  fitTrVH.push({x:Xfine, y:Xfine.map(x=>a*x*x+b*x+c), mode:"lines", name:"ajuste quadrático (A)", line:{width:2, dash:"dashdot"}});
  annFitVH.push({xref:"paper", yref:"paper", x:0.02, y:0.98, xanchor:"left", yanchor:"top",
    text:`lnK = a·x² + b·x + c<br>a=${a.toExponential(3)}; b=${b.toExponential(3)}; c=${c.toFixed(3)}; R²=${r2.toFixed(4)}`,
    showarrow:false, bgcolor:"rgba(255,255,255,0.8)", bordercolor:"#ddd"});
}

// plot 3 (ΔH × T) — ajuste linear sempre
const {m:mh, b:bh, r2:r2h} = linreg(Tgrid, m_dH);
const fitH = {x:[Tgrid[0],Tgrid.at(-1)], y:[mh*Tgrid[0]+bh, mh*Tgrid.at(-1)+bh],
              mode:"lines", name:"ajuste linear", line:{width:2, dash:"dashdot"}};
const annH = [{xref:"paper", yref:"paper", x:0.02, y:0.98, xanchor:"left", yanchor:"top",
  text:`ΔH = m·T + b<br>m=${mh.toFixed(3)} ${eLabel(state.unit)}/K; b=${bh.toFixed(3)} ${eLabel(state.unit)}<br>R²=${r2h.toFixed(4)}`,
  showarrow:false, bgcolor:"rgba(255,255,255,0.85)", bordercolor:"#ddd"}];
  
// (D) T·ΔS x T (linear quando ΔCp=0)
let fitTrTS=[], annFitTS=[];
if(isCpZero){
  const {m,b,r2}=linreg(Tgrid, m_TdS);
  fitTrTS.push({x:[Tgrid[0],Tgrid[Tgrid.length-1]], y:[m*Tgrid[0]+b, m*Tgrid[Tgrid.length-1]+b],
                mode:"lines", name:"ajuste linear (A)", line:{width:2, dash:"dashdot"}});
  annFitTS.push({xref:"paper", yref:"paper", x:0.02, y:0.98, xanchor:"left", yanchor:"top",
    text:`T·ΔS = m·T + b<br>m=${m.toFixed(4)} ${eLabel(unit)}/K; b=${b.toFixed(3)} ${eLabel(unit)}; R²=${r2.toFixed(4)}`,
    showarrow:false, bgcolor:"rgba(255,255,255,0.8)", bordercolor:"#ddd"});
}


    // Exp A
    const Texp = expA.map(o=>o.T);
    const e_dG = expA.map(o=>eConv_kJ(o.dG_kJ,unit));
    const e_dH = expA.map(o=>eConv_kJ(o.dH_kJ,unit));
    const e_TdS= expA.map(o=>eConv_kJ(o.TdS_kJ,unit));
    const e_invT = expA.map(o=>o.invT);
    const e_lnK  = expA.map(o=>o.lnK);

    // Prot B
    let tracesB = { dG:[], lnK:[], dH:[], TdS:[] };
    let shapes=[], ann=[];
    // Tm A
    const pA={T0:state.T0, dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp};
    const TmA = findTm(pA, state.Tmin, state.Tmax);
    if(TmA){
      const ymin=Math.min(...m_dG, ...e_dG), ymax=Math.max(...m_dG, ...e_dG);
      shapes.push({type:"line", x0:TmA, x1:TmA, y0:ymin, y1:ymax, line:{width:2,dash:"dash"}});
      ann.push({x:TmA, y:ymax, text:"Tm (A)", showarrow:true, ay:-30});
    }
    if(state.modelB){
      const pB={T0:state.T0, dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp+state.dDeltaCp};
      const TmB = findTm(pB, state.Tmin, state.Tmax);
      const mB_dG = state.modelB.dG_kJ.map(v=>eConv_kJ(v,unit));
      const mB_dH = state.modelB.dH_kJ.map(v=>eConv_kJ(v,unit));
      const mB_TdS= state.modelB.TdS_kJ.map(v=>eConv_kJ(v,unit));
      if(TmB){
        const ymin=Math.min(...m_dG, ...e_dG, ...mB_dG), ymax=Math.max(...m_dG, ...e_dG, ...mB_dG);
        shapes.push({type:"line", x0:TmB, x1:TmB, y0:ymin, y1:ymax, line:{width:2, dash:"dot"}});
        ann.push({x:TmB, y:ymax, text:"Tm (B)", showarrow:true, ay:-30});
      }
      const dash="dot";
      tracesB.dG.push({x:state.modelB.Tgrid, y:mB_dG, mode:"lines", name:"modelo (B)", line:{width:3, dash}});
      tracesB.lnK.push({x:state.modelB.invT,  y:state.modelB.lnK,   mode:"lines", name:"modelo (B)", line:{width:3, dash}});
      tracesB.dH.push({x:state.modelB.Tgrid,  y:mB_dH, mode:"lines", name:"ΔH (B)",   line:{width:3, dash}});
      tracesB.TdS.push({x:state.modelB.Tgrid, y:mB_TdS,mode:"lines", name:"T·ΔS (B)", line:{width:3, dash}});
    }

    // (1) ΔG × T
    Plotly.newPlot("plot-gh", [
  {x:Tgrid, y:m_dG, mode:"lines", name:"modelo (A)", line:{width:3}},
  ...tracesB.dG,
  {x:Texp,  y:e_dG, mode:"markers", name:"exp (A)", marker:{size:7}},
  ...fitTrGH
], {
  title:`ΔG × T (${eLabel(unit)})`,
  xaxis:{title:"T (K)"}, yaxis:{title:`ΔG (${eLabel(unit)})`},
  margin:{t:36}, shapes, annotations:[...(ann||[]), ...annFitGH]
}, {responsive:true, displaylogo:false});


    // (2) lnK × 1/T
Plotly.newPlot("plot-vh", [
  {x:m_invT, y:m_lnK, mode:"lines", name:"modelo (A)", line:{width:3}},
  ...tracesB.lnK,
  {x:e_invT, y:e_lnK, mode:"markers", name:"exp (A)", marker:{size:7}},
  ...fitTrVH
], {
  title:"Van’t Hoff: ln(K) × 1/T",
  xaxis:{title:"1/T (1/K)"}, yaxis:{title:"ln(K)"},
  margin:{t:36}, annotations:annFitVH
}, {responsive:true, displaylogo:false});


    // (3) ΔH × T
Plotly.newPlot("plot-dh", [
  {x:Tgrid, y:m_dH, mode:"lines", name:"ΔH (A)", line:{width:3}},
  ...tracesB.dH,
  fitH
], { title:`ΔH × T (${eLabel(state.unit)})`,
     xaxis:{title:"T (K)"}, yaxis:{title:`ΔH (${eLabel(state.unit)})`},
     margin:{t:36}, annotations:annH
}, {responsive:true, displaylogo:false});

// 4º gráfico agora: ΔS × ln T
Plotly.newPlot("plot-ts", [
  {x:lnT, y:S_u, mode:"lines", name:"ΔS (A)", line:{width:3}},
  fitS
], { title:`ΔS × ln T (${sLabel(state.unit)})`,
     xaxis:{title:"ln T"}, yaxis:{title:`ΔS (${sLabel(state.unit)})`},
     margin:{t:36}, annotations:annS
}, {responsive:true, displaylogo:false});
}

  // ======================= Diagnóstico ==============================
  function labelCenario(v){
    return {fold_exo:"Folding exotérmico", fold_endo:"Folding endotérmico",
            unfold:"Unfolding", bind_exo:"Binding exotérmico", bind_endo:"Binding endotérmico"}[v] || v;
  }
  function labelComp(v){
    return {meso:"Mesófilo", thermo:"Termófilo", psycho:"Psicrófilo (frio)"}[v] || v;
  }
  function labelPreset(v){
    return {none:"Nenhum", g_up:"termo ↑ΔG global", cp_down:"termo ↓ΔCₚ", cp_up_psy:"psicro ↑ΔCₚ", bind_cpn:"binder ΔCₚ<0"}[v] || v;
  }
  function buildInterp(){
    if(!state.modelB) return "Interpretação: cenário de proteína única.\nA curvatura é modulada por ΔCₚ; estabilidade relativa por ΔH e T·ΔS.";
    const pA={T0:state.T0, dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp};
    const pB={T0:state.T0, dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp+state.dDeltaCp};
    const TmA=findTm(pA,state.Tmin,state.Tmax), TmB=findTm(pB,state.Tmin,state.Tmax);
    if(!(TmA&&TmB)) return "Interpretação: Tm de uma das proteínas está fora da janela — ajuste a faixa de T.\nΔΔCₚ altera a curvatura e pode deslocar Tm.";
    const dTm = TmB-TmA;
    const dir = dTm>0? "aumentou" : (dTm<0? "diminuiu":"não mudou");
    const mag = Math.abs(dTm);
    const dica = Math.abs(state.dDeltaCp)>Math.max(0.25*Math.abs(state.dCp), 200)
      ? "O deslocamento de Tm sugere forte contribuição de ΔCₚ (curvatura)."
      : "ΔCₚ moderado: ΔH e T·ΔS dominam a estabilidade no entorno de Tm.";
    return `Interpretação (A vs B):
Tm ${dir} em ${mag.toFixed(2)} K ao aplicar ΔΔCₚ=${state.dDeltaCp.toFixed(0)} J/mol/K.
${dica}`;
  }
  function buildDiagHTML(){
    const pA={T0:state.T0, dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp};
    const TmA=findTm(pA,state.Tmin,state.Tmax);
    const dH_T0=eConv_kJ(dH(state.T0,pA)/1000,state.unit);
    const dS_T0=sConv_J(dS(state.T0,pA),state.unit);
    const dG_T0=eConv_kJ(dG(state.T0,pA)/1000,state.unit);

    let html = "";
    html += `T₀: ${state.T0.toFixed(2)} K    Faixa T: ${state.Tmin.toFixed(2)}–${state.Tmax.toFixed(2)} K\n`;
    html += `Unidades: ${eLabel(state.unit)} ; ${sLabel(state.unit)}\n`;
    html += `Cenário: ${labelCenario(state.cenario)}    Comportamento: ${labelComp(state.comp)}    Preset: ${labelPreset(state.preset)}\n\n`;
    html += `Prot A — ΔH₀=${eConv_kJ(state.dH0_kJ,state.unit).toFixed(2)} ${eLabel(state.unit)};  ΔS₀=${sConv_J(state.dS0,state.unit).toFixed(2)} ${sLabel(state.unit)};  ΔCₚ=${sConv_J(state.dCp,state.unit).toFixed(2)} ${sLabel(state.unit)}\n`;
    html += `Em T₀: ΔG=${dG_T0.toFixed(3)} ${eLabel(state.unit)};  ΔH=${dH_T0.toFixed(3)} ${eLabel(state.unit)};  ΔS=${dS_T0.toFixed(3)} ${sLabel(state.unit)}\n`;
    html += `Tm (A): ${TmA? TmA.toFixed(2)+" K":"—"}\n`;

    if(state.modelB){
      const pB={T0:state.T0,dH0_kJ:state.dH0_kJ,dS0:state.dS0,dCp:state.dCp+state.dDeltaCp};
      const TmB=findTm(pB,state.Tmin,state.Tmax);
      html += `\nProt B — ΔΔCₚ=${state.dDeltaCp.toFixed(0)} J/mol/K → ΔCₚ(B)=${(state.dCp+state.dDeltaCp).toFixed(2)} J/mol/K\n`;
      html += `Tm (B): ${TmB? TmB.toFixed(2)+" K":"—"}    ΔTm=${(TmB&&TmA)? (TmB-TmA).toFixed(2)+" K":"—"}\n`;
      html += `\n${buildInterp()}\n`;
    } else {
      html += `\n${buildInterp()}\n`;
    }
    return html;
  }
  
  function copyJSON(){
  const payload = {
    version:1,
    state: {
      T0:state.T0, Tmin:state.Tmin, Tmax:state.Tmax,
      n_theory:state.n_theory, n_exp:state.n_exp,
      dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp,
      noise_J:state.noise_J, cenario:state.cenario, comp:state.comp, preset:state.preset,
      compare:state.compare, dDeltaCp:state.dDeltaCp, unit:state.unit
    }
  };
  navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))
    .then(()=>alert("JSON copiado!"))
    .catch(()=>{ byId("jsontext").value = JSON.stringify(payload, null, 2); byId("jsontext-wrap").style.display="block"; });
}
function loadJSONFromText(){
  try{
    const obj = JSON.parse(byId("jsontext").value);
    const s = obj.state || obj;
    state.T0=s.T0; state.Tmin=s.Tmin; state.Tmax=s.Tmax;
    state.n_theory=s.n_theory??200; state.n_exp=s.n_exp??15;
    state.dH0_kJ=s.dH0_kJ; state.dS0=s.dS0; state.dCp=s.dCp;
    state.noise_J=s.noise_J??150; state.cenario=s.cenario||state.cenario; state.comp=s.comp||state.comp; state.preset=s.preset||"none";
    state.compare=!!s.compare; state.dDeltaCp=s.dDeltaCp??300; state.unit=s.unit||"kJ";
    reflectParamsToModal(); refresh(); alert("Preset carregado!"); byId("p-unit").value = state.unit;
  }catch(e){ alert("JSON inválido."); }
}

byId("btn-copy-json").onclick = copyJSON;
byId("btn-toggle-jsontext").onclick = ()=>{ byId("jsontext-wrap").style.display="block"; };
byId("btn-hide-jsontext").onclick = ()=>{ byId("jsontext-wrap").style.display="none"; byId("jsontext").value=""; };
byId("btn-load-jsontext").onclick = loadJSONFromText;


  // ======================= Exportações ==============================
  function exportAppOnly(filename="GH_toolkit_plots.html"){
    const pack = (function(){
      const {modelA, expA} = state.data;
      const pA={T0:state.T0, dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp};
      const TmA=findTm(pA,state.Tmin,state.Tmax);
      let TmB=null, modelB=null;
      if(state.modelB){
        const pB={T0:state.T0, dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp+state.dDeltaCp};
        TmB=findTm(pB,state.Tmin,state.Tmax);
        modelB=state.modelB;
      }
      return {
        diag: buildDiagHTML(),
        unit: state.unit,
        A: {
          Tgrid:modelA.Tgrid, dG:modelA.dG_kJ, invT:modelA.invT, lnK:modelA.lnK, dH:modelA.dH_kJ, TdS:modelA.TdS_kJ,
          Texp: expA.map(o=>o.T), dGexp: expA.map(o=>o.dG_kJ), invTexp: expA.map(o=>o.invT), lnKexp: expA.map(o=>o.lnK), dHexp: expA.map(o=>o.dH_kJ), TdSexp: expA.map(o=>o.TdS_kJ),
          Tm: TmA
        },
        B: modelB ? { Tgrid:modelB.Tgrid, dG:modelB.dG_kJ, invT:modelB.invT, lnK:modelB.lnK, dH:modelB.dH_kJ, TdS:modelB.TdS_kJ, Tm: TmB } : null
      };
    })();

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>GH Toolkit — gráficos</title>
<style>
 body{font-family:system-ui,Arial,sans-serif;background:#f8fafc;margin:8px}
 .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 pre{white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
</style>
</head>
<body>
<h3>Gibbs–Helmholtz & Van’t Hoff — Bioquanti (gráficos + diagnóstico)</h3>
<div class="card"><pre id="diag"></pre></div>
<div class="grid" style="margin-top:10px">
  <div id="plot1" class="card" style="height:360px"></div>
  <div id="plot2" class="card" style="height:360px"></div>
  <div id="plot3" class="card" style="height:220px"></div>
  <div id="plot4" class="card" style="height:220px"></div>
</div>
<script>window.PLOTLYENV=window.PLOTLYENV||{};</script>
<script>
(function(){
  const P=${JSON.stringify(pack)};
  const unit=P.unit;
  const KJ_TO_KCAL=${KJ_TO_KCAL}; function eConv(x){ return unit==="kcal"? x*KJ_TO_KCAL : x; }
  document.getElementById("diag").textContent=P.diag;
  function ready(cb){ if(window.Plotly){cb();return;} const s=document.createElement("script"); s.src="https://cdn.plot.ly/plotly-2.35.2.min.js"; s.onload=cb; document.head.appendChild(s); }
  function eLabel(){ return unit==="kcal" ? "kcal/mol" : "kJ/mol"; }
  ready(function(){
    const shapes=[], ann=[];
    if(P.A.Tm){ const ymin=Math.min.apply(null, P.A.dG.map(eConv).concat(P.A.dGexp.map(eConv))); const ymax=Math.max.apply(null, P.A.dG.map(eConv).concat(P.A.dGexp.map(eConv)));
      shapes.push({type:"line", x0:P.A.Tm, x1:P.A.Tm, y0:ymin, y1:ymax, line:{width:2, dash:"dash"}}); ann.push({x:P.A.Tm, y:ymax, text:"Tm (A)", showarrow:true, ay:-30}); }
    if(P.B && P.B.Tm!=null){ const ymin2=Math.min.apply(null, P.A.dG.map(eConv).concat(P.A.dGexp.map(eConv), P.B.dG.map(eConv))); const ymax2=Math.max.apply(null, P.A.dG.map(eConv).concat(P.A.dGexp.map(eConv), P.B.dG.map(eConv)));
      shapes.push({type:"line", x0:P.B.Tm, x1:P.B.Tm, y0:ymin2, y1:ymax2, line:{width:2, dash:"dot"}}); ann.push({x:P.B.Tm, y:ymax2, text:"Tm (B)", showarrow:true, ay:-30}); }
    const t1=[{x:P.A.Tgrid, y:P.A.dG.map(eConv), mode:"lines", name:"modelo (A)", line:{width:3}},
              ...(P.B?[{x:P.B.Tgrid, y:P.B.dG.map(eConv), mode:"lines", name:"modelo (B)", line:{width:3, dash:"dot"}}]:[]),
              {x:P.A.Texp, y:P.A.dGexp.map(eConv), mode:"markers", name:"exp (A)", marker:{size:7}}];
    Plotly.newPlot("plot1", t1, {title:"ΔG × T ("+eLabel()+")", xaxis:{title:"T (K)"}, yaxis:{title:"ΔG ("+eLabel()+")"}, margin:{t:36}, shapes, annotations:ann}, {displaylogo:false});

    const t2=[{x:P.A.invT, y:P.A.lnK, mode:"lines", name:"modelo (A)", line:{width:3}},
              ...(P.B?[{x:P.B.invT, y:P.B.lnK, mode:"lines", name:"modelo (B)", line:{width:3, dash:"dot"}}]:[]),
              {x:P.A.invTexp, y:P.A.lnKexp, mode:"markers", name:"exp (A)", marker:{size:7}}];
    Plotly.newPlot("plot2", t2, {title:"Van’t Hoff: ln(K) × 1/T", xaxis:{title:"1/T (1/K)"}, yaxis:{title:"ln(K)"}, margin:{t:36}}, {displaylogo:false});

    const t3=[{x:P.A.Tgrid, y:P.A.dH.map(eConv), mode:"lines", name:"ΔH (A)", line:{width:3}},
              ...(P.B?[{x:P.B.Tgrid, y:P.B.dH.map(eConv), mode:"lines", name:"ΔH (B)", line:{width:3, dash:"dot"}}]:[]),
              {x:P.A.Texp, y:P.A.dHexp.map(eConv), mode:"markers", name:"exp (A)", marker:{size:6}}];
    Plotly.newPlot("plot3", t3, {title:"ΔH × T ("+eLabel()+")", xaxis:{title:"T (K)"}, yaxis:{title:"ΔH ("+eLabel()+")"}, margin:{t:36}}, {displaylogo:false});

    const t4=[{x:P.A.Tgrid, y:P.A.TdS.map(eConv), mode:"lines", name:"T·ΔS (A)", line:{width:3}},
              ...(P.B?[{x:P.B.Tgrid, y:P.B.TdS.map(eConv), mode:"lines", name:"T·ΔS (B)", line:{width:3, dash:"dot"}}]:[]),
              {x:P.A.Texp, y:P.A.TdSexp.map(eConv), mode:"markers", name:"exp (A)", marker:{size:6}}];
    Plotly.newPlot("plot4", t4, {title:"T·ΔS × T ("+eLabel()+")", xaxis:{title:"T (K)"}, yaxis:{title:"T·ΔS ("+eLabel()+")"}, margin:{t:36}}, {displaylogo:false});
  });
})();
</script>
</body></html>`;
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
  }

  function exportCSV(){
    const unit = state.unit;
    const {modelA, expA} = state.data;
    const hasB = !!state.modelB;
    const rows = [];
    const header = [
      "T(K)",
      `dG_A(${eLabel(unit)})`,`dH_A(${eLabel(unit)})`,`T·dS_A(${eLabel(unit)})`,"lnK_A",
      ...(hasB? [`dG_B(${eLabel(unit)})`,`dH_B(${eLabel(unit)})`,`T·dS_B(${eLabel(unit)})`]:[]),
      "Texp_A(K)",`dGexp_A(${eLabel(unit)})`,`dHexp_A(${eLabel(unit)})`,`T·dSexp_A(${eLabel(unit)})`,"lnKexp_A"
    ];
    rows.push(header.join(","));
    const N = modelA.Tgrid.length;
    for(let i=0;i<N;i++){
      const T = modelA.Tgrid[i];
      const dG_A = eConv_kJ(modelA.dG_kJ[i],unit);
      const dH_A = eConv_kJ(modelA.dH_kJ[i],unit);
      const TdS_A= eConv_kJ(modelA.TdS_kJ[i],unit);
      const lnK_A= modelA.lnK[i];
      let bcols = [];
      if(hasB){
        bcols = [
          eConv_kJ(state.modelB.dG_kJ[i],unit),
          eConv_kJ(state.modelB.dH_kJ[i],unit),
          eConv_kJ(state.modelB.TdS_kJ[i],unit)
        ];
      }
      // casamos índice experimental aproximando por i*(n_exp-1)/(N-1)
      const j = Math.round(i*(state.n_exp-1)/(N-1));
      const Tex= expA[j].T;
      const dGex= eConv_kJ(expA[j].dG_kJ,unit);
      const dHex= eConv_kJ(expA[j].dH_kJ,unit);
      const TdSex= eConv_kJ(expA[j].TdS_kJ,unit);
      const lnKex= expA[j].lnK;
      rows.push([T,dG_A,dH_A,TdS_A,lnK_A, ...bcols, Tex,dGex,dHex,TdSex,lnKex].join(","));
    }
    const blob = new Blob([rows.join("\n")], {type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="GH_data.csv";
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
  }

  function saveJSON(){
    const payload = {
      version:1,
      state: {
        T0:state.T0, Tmin:state.Tmin, Tmax:state.Tmax,
        n_theory:state.n_theory, n_exp:state.n_exp,
        dH0_kJ:state.dH0_kJ, dS0:state.dS0, dCp:state.dCp,
        noise_J:state.noise_J, cenario:state.cenario, comp:state.comp, preset:state.preset,
        compare:state.compare, dDeltaCp:state.dDeltaCp, unit:state.unit
      }
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="GH_preset.json";
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
  }
  function loadJSON(file){
    const reader=new FileReader();
    reader.onload = (e)=>{
      try{
        const obj=JSON.parse(e.target.result);
        const s=obj.state||obj;
        state.T0=s.T0; state.Tmin=s.Tmin; state.Tmax=s.Tmax;
        state.n_theory=s.n_theory??200; state.n_exp=s.n_exp??15;
        state.dH0_kJ=s.dH0_kJ; state.dS0=s.dS0; state.dCp=s.dCp;
        state.noise_J=s.noise_J??150; state.cenario=s.cenario||state.cenario; state.comp=s.comp||state.comp; state.preset=s.preset||"none";
        state.compare=!!s.compare; state.dDeltaCp=s.dDeltaCp??300; state.unit=s.unit||"kJ";
        reflectParamsToModal(); refresh();
      }catch(err){ alert("JSON inválido."); }
    };
    reader.readAsText(file);
  }

  // ========================== Eventos ===============================
  function reflectParamsToModal(){
    byId("p-T0").value = state.T0.toFixed(2);
    byId("p-Tmin").value = state.Tmin.toFixed(2);
    byId("p-Tmax").value = state.Tmax.toFixed(2);
    byId("p-noise").value = state.noise_J.toFixed(0);
    byId("p-dH0").value = state.dH0_kJ.toFixed(1);
    byId("p-dS0").value = state.dS0.toFixed(1);
    byId("p-dCp").value = state.dCp.toFixed(1);
    byId("p-cenario").value = state.cenario;
    byId("p-comp").value = state.comp;
    byId("p-preset").value = state.preset;
    byId("p-compare").checked = state.compare;
    byId("p-ddcp").value = state.dDeltaCp.toFixed(0);
    byId("sel-unit").value = state.unit;
const det = byId("gh-eqs");
if(det) det.open = !!state.showEq;
  }

  const openParams = ()=>{ overlay.style.display="block"; reflectParamsToModal(); };
  const closeParams = ()=>{ overlay.style.display="none"; };

  byId("btn-param").onclick = openParams;
  byId("btn-close-param").onclick = closeParams;

  byId("btn-apply").onclick = ()=>{
    // valores digitados (sem presets)
    state.T0   = parseFloat(byId("p-T0").value);
    state.Tmin = parseFloat(byId("p-Tmin").value);
    state.Tmax = parseFloat(byId("p-Tmax").value);
    state.noise_J = parseFloat(byId("p-noise").value);
    state.dH0_kJ  = parseFloat(byId("p-dH0").value);
    state.dS0     = parseFloat(byId("p-dS0").value);
    state.dCp     = parseFloat(byId("p-dCp").value);
    // seletores (efeito só no próximo reset)
    state.cenario = byId("p-cenario").value;
    state.comp    = byId("p-comp").value;
    state.preset  = byId("p-preset").value;
    state.compare = byId("p-compare").checked;
    state.dDeltaCp= parseFloat(byId("p-ddcp").value);
    overlay.style.display="none";
    refresh();
  };

  // ΔG(Tm)=0 => ajusta ΔS0
  byId("btn-set-tm").onclick = ()=>{
    const Tm = parseFloat(byId("p-TmTarget").value);
    if(!isFinite(Tm) || Tm<=0){ alert("Tm inválido."); return; }
    const s0 = setTmByDeltaS0({dH0_kJ:parseFloat(byId("p-dH0").value), dCp:parseFloat(byId("p-dCp").value), T0:parseFloat(byId("p-T0").value)}, Tm);
    byId("p-dS0").value = s0.toFixed(2);
  };
  
  // Simular ΔG(T) a partir de (Tm, ΔH_m, ΔC_p) — Eq. 9.9
byId("btn-sim-eq99").onclick = ()=>{
  const Tm = parseFloat(byId("p-sim-Tm").value);
  let dHm = parseFloat(byId("p-sim-dHm").value);   // pode estar em kJ ou kcal
  const dCp = parseFloat(byId("p-sim-dCp").value); // J/mol/K (ou cal se unidade kcal)
  if(!isFinite(Tm) || !isFinite(dHm) || !isFinite(dCp) || Tm<=0){ alert("Preencha Tm, ΔHₘ e ΔCₚ corretamente."); return; }

  // se unidade atual for kcal, converter para kJ e J:
  if(state.unit==="kcal"){ dHm = dHm / KJ_TO_KCAL; } // kcal -> kJ
  const dCp_J = (state.unit==="kcal") ? (dCp/ J_TO_CAL) : dCp;

  const { dH0_kJ, dS0 } = deriveH0S0FromTm({T0: parseFloat(byId("p-T0").value)}, Tm, dHm, dCp_J);
  // aplicar nos campos-base
  byId("p-dH0").value = dH0_kJ.toFixed(3);
  byId("p-dS0").value = dS0.toFixed(3);
  byId("p-dCp").value = dCp_J.toFixed(1);
  // e atualizar estado
  state.dH0_kJ = dH0_kJ;
  state.dS0 = dS0;
  state.dCp = dCp_J;
  refresh();
  alert("Parâmetros convertidos via Eq. 9.9 e aplicados.");
};


  // JSON salvar/carregar
  byId("btn-save-json").onclick = saveJSON;
  byId("btn-load-json").onclick = ()=> byId("file-json").click();
  byId("file-json").addEventListener("change", (e)=>{ const f=e.target.files?.[0]; if(f) loadJSON(f); e.target.value=""; });

  // Topbar
  byId("btn-diag").onclick  = ()=>{ const body = diagOverlay.querySelector("#diag-body"); body.textContent = buildDiagHTML(); diagOverlay.style.display="block"; };
  byId("btn-html").onclick  = ()=> exportAppOnly("GH_toolkit_plots.html");
  byId("btn-csv").onclick   = exportCSV;
byId("btn-eqs").onclick = ()=>{
  const det = byId("gh-eqs");
  det.open = !det.open;
  state.showEq = det.open;
  if(det.open) det.scrollIntoView({behavior:"smooth", block:"start"});
};

  byId("sel-unit").onchange = (e)=>{ state.unit = e.target.value; draw(); };
// sincronia de unidade (topbar <-> modal)
byId("p-unit").onchange = (e)=>{ 
  state.unit = e.target.value; 
 
};
byId("sel-unit").onchange = (e)=>{
  state.unit = e.target.value;
  const pu = byId("p-unit"); if(pu) pu.value = state.unit;
  draw();
};


function refreshUnitLabels(){
  const uh = document.querySelectorAll(".unitH");
  const us = document.querySelectorAll(".unitS");
  uh.forEach(el=> el.textContent = eLabel(state.unit));
  us.forEach(el=> el.textContent = sLabel(state.unit));
}
const _oldDraw = draw;
draw = function(){ _oldDraw(); refreshUnitLabels(); };
refreshUnitLabels();


  // Reset: novo base + seletores atuais (aplica presets)
  byId("btn-reset").onclick = ()=>{
    const sel = getSelectionsFromModal();
    const base = randomBase();
    const adj  = applyScenarioTweaks(base, sel);
    setStateFromAdjusted(adj, sel);
    reflectParamsToModal();
    refresh();
  };

  // inicializa
  (function init(){
    const sel = { cenario: state.cenario, comp: state.comp, preset: state.preset, compare: state.compare, dDeltaCp: state.dDeltaCp };
    const base = randomBase();
    const adj  = applyScenarioTweaks(base, sel);
    setStateFromAdjusted(adj, sel);
    reflectParamsToModal();
    refresh();
  })();

})();
