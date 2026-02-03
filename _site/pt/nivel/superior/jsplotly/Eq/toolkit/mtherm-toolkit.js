/* Denat-Toolkit (final mix: script3 + script9 + script12)
   • 2 gráficos: Sinal × [D] (sigmoide ascendente) e ΔG_eff × [D]
   • Prot A (controle) e Prot B (comparação, opcional)
   • Multímeros: n = 1–3 (Eq. 4 de Park para f_U; Eq. 5 para ΔG_eff)
   • Osmólito apenas na Prot B: ΔG°_H2O(B) ← ΔG°_H2O(B) + α·O + β·O·D
   • CSV: exporta e importa (2 colunas: D,S_obs)
   • Caixa de regressão arrastável (A e B)
   • Equações em LaTeX entre $$…$$
   • Tudo ASCII-safe em código (gregos apenas em rótulos)
*/

(function(){

/* ================== helpers & constantes ================== */
const R = 8.314462618;           // J/mol/K
const PT_MONOMER = 2e-6;         // M (texto de Park: indiferente quando Cm fixo)
const clamp = (x,a,b)=>Math.min(b,Math.max(a,x));
const byId = id => document.getElementById(id);
const linspace=(a,b,n)=>{const o=[]; if(n<=1){o.push(a);return o;} const h=(b-a)/(n-1); for(let i=0;i<n;i++)o.push(a+i*h); return o;};
function movingRand(){ let s=(Math.random()*2**32)>>>0; return ()=>((s^=s<<13,s^=s>>>17,s^=s<<5)>>>0)/4294967296; }
function round(x, d=3){const k=10**d; return Math.round(x*k)/k;}
function rngNoise(sd){ const r=movingRand(); return ()=> sd*(2*r()-1); }

/* regressões */
function linreg(x,y){
  const n=x.length; let sx=0,sy=0,sxx=0,sxy=0;
  for(let i=0;i<n;i++){ sx+=x[i]; sy+=y[i]; sxx+=x[i]*x[i]; sxy+=x[i]*y[i]; }
  const den = n*sxx - sx*sx || 1e-30;
  const m = (n*sxy - sx*sy)/den; const b=(sy - m*sx)/n;
  let ybar=sy/n, ssTot=0, ssRes=0;
  for(let i=0;i<n;i++){ const fi=m*x[i]+b; ssTot+=(y[i]-ybar)**2; ssRes+=(y[i]-fi)**2; }
  return {m,b,r2:(ssTot>0?1-ssRes/ssTot:1)};
}
function quadreg(x,y){
  const n=x.length; let s1=0,sx=0,sx2=0,sx3=0,sx4=0, sy=0,sxy=0,sx2y=0;
  for(let i=0;i<n;i++){
    const xi=x[i], yi=y[i], x2=xi*xi;
    s1+=1; sx+=xi; sx2+=x2; sx3+=x2*xi; sx4+=x2*x2;
    sy+=yi; sxy+=xi*yi; sx2y+=x2*yi;
  }
  // resolve 3x3 (a,b,c)
  let A=[[sx4,sx3,sx2],[sx3,sx2,sx],[sx2,sx,s1]], B=[sx2y,sxy,sy];
  // Gauss
  for(let k=0;k<3;k++){
    let p=k; for(let i=k+1;i<3;i++) if(Math.abs(A[i][k])>Math.abs(A[p][k])) p=i;
    if(p!==k){ [A[k],A[p]]=[A[p],A[k]]; [B[k],B[p]]=[B[p],B[k]]; }
    const piv=A[k][k]||1e-12;
    for(let j=k;j<3;j++) A[k][j]/=piv; B[k]/=piv;
    for(let i=0;i<3;i++) if(i!==k){
      const f=A[i][k];
      for(let j=k;j<3;j++) A[i][j]-=f*A[k][j];
      B[i]-=f*B[k];
    }
  }
  const [a,b,c]=B;
  let ybar=sy/n, ssTot=0, ssRes=0;
  for(let i=0;i<n;i++){ const fi=a*x[i]*x[i]+b*x[i]+c; ssTot+=(y[i]-ybar)**2; ssRes+=(y[i]-fi)**2; }
  return {a,b,c,r2:(ssTot>0?1-ssRes/ssTot:1)};
}

/* ================== termodinâmica ================== */
/* Eq. 4 (Park): dG0_J - m_J_M*D + RT ln( n f^n / (Pt^(n-1)(1-f)) ) = 0 → resolver f∈(0,1) */
function fU_from_eq4(dG0_J, m_J_M, D, n, T){
  if(n<=1){ // monômero
    const dG = dG0_J - m_J_M*D; // J/mol
    const K = Math.exp(-dG/(R*T));
    return clamp(K/(1+K), 1e-9, 1-1e-9);
  }
  const Pt = PT_MONOMER; // M
  const F = (f)=>{
    if(f<=0) return +1e12;
    if(f>=1) return -1e12;
    return (dG0_J - m_J_M*D) + R*T*Math.log( (n*Math.pow(f,n))/(Math.pow(Pt,n-1)*(1-f)) );
  };
  let a=1e-9, b=1-1e-9, fa=F(a), fb=F(b);
  // bracket se necessário
  if(fa*fb>0){
    for(let k=1;k<100;k++){
      const x=k/101, fx=F(x);
      if(fa*fx<0){ b=x; fb=fx; break; }
      if(fx*fb<0){ a=x; fa=fx; break; }
    }
  }
  for(let i=0;i<80;i++){
    const m=(a+b)/2, fm=F(m);
    if(Math.abs(fm)<1e-12) return clamp(m,1e-9,1-1e-9);
    (fa*fm<=0)? (b=m, fb=fm) : (a=m, fa=fm);
  }
  return clamp((a+b)/2,1e-9,1-1e-9);
}
/* Eq. 5 (Park): ΔG_eff = -RT ln(f/(1-f)) */
const Geff_from_f = (f,T)=> -R*T*Math.log(f/(1-f)); // J/mol

/* ================== estado ================== */
const state = {
  T: 298.15,
  Dmin: 0, Dmax: 8, n_theory: 200, n_exp: 18,
  // Prot A
  nA: 1, dG0A_kJ: 24, mA_kJ_M: 9, SF: 0.2, SU: 1.0,
  // Prot B (+ osmólito)
  showB: false, nB: 1, dG0B_kJ: 24, mB_kJ_M: 9,
  O_B: 0.7, alpha_B: 0.5, beta_B: 0.3, // O in M; ΔG° += α·O + β·O·D (kJ/mol)
  // ruído (apenas no S)
  noise_sd: 0.02,
  data:null
};

function randomizeState(){
  const r=movingRand();
  state.T = 293 + 15*r();
  state.Dmin=0; state.Dmax = 6 + 2*r();
  state.n_theory=200; state.n_exp = 18 + Math.round(6*r());
  state.nA = 1; state.dG0A_kJ = 20+18*r(); state.mA_kJ_M = 6+6*r();
  state.SF = 0.18 + 0.08*r(); state.SU = 0.95 + 0.08*r();
  if(state.SU<=state.SF){ const t=state.SF; state.SF=state.SU-0.1; state.SU=t+0.1; }
  state.showB=false; state.nB=1; state.dG0B_kJ=state.dG0A_kJ; state.mB_kJ_M=state.mA_kJ_M;
  state.O_B=0.7; state.alpha_B=0.5; state.beta_B=0.3;
  state.noise_sd = 0.015 + 0.02*r();
}

/* ================== UI (topbar + painéis) ================== */
const root = document.createElement("div");
root.style.cssText="font-family:system-ui,Arial,sans-serif;padding:8px;border-bottom:1px solid #ddd;background:#f8fafc";
root.innerHTML = `
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
    <button id="btn-reset">reset</button>
    <button id="btn-html">html</button>
    <button id="btn-csv">csv</button>
    <button id="btn-load">load</button>
    <button id="btn-diag">diagnóstico</button>
    <button id="btn-param">parâmetros</button>
    <button id="btn-eqs">equações</button>
    <div style="margin-left:auto;font-size:12px">Denat-Toolkit (ΔG<sub>eff</sub>, m<sub>eff</sub>, multímeros; osmólito só em B)</div>
  </div>
  <details id="eqs" style="margin-top:6px; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:8px; font-size:13px; line-height:1.4">
    <summary style="cursor:pointer; font-weight:700">Equações usadas (modelo de 2 estados)</summary>
    <div style="margin-top:6px">
      $$\\textbf{Energia padrão vs desnaturante (monômero):}\\quad
      \\Delta G^\\circ(D)=\\Delta G^\\circ(\\mathrm{H_2O})-m\\,D$$

      $$\\textbf{Multímero }F_n\\rightleftharpoons nU\\ (\\text{massa-ação}):\\quad
      \\Delta G^\\circ + RT\\,\\ln\\!\\left(\\frac{n\\,f_U^{\\;n}}{P_t^{\\,n-1}(1-f_U)}\\right)=0\\quad(\\text{resolver }f_U)$$

      $$\\textbf{Energia efetiva do “pseudomonômero”:}\\quad
      \\Delta G_{\\rm eff}(D)=-RT\\,\\ln\\!\\left(\\frac{f_U}{1-f_U}\\right)$$

      $$\\textbf{Osmólito (somente em B):}\\quad
      \\Delta G^\\circ_{\\rm H_2O,B}\\to\\Delta G^\\circ_{\\rm H_2O,B}+\\alpha\\,O+\\beta\\,O\\,D$$
    </div>
  </details>
  <div id="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
    <div id="p1" style="height:360px;background:#fff;border:1px solid #eee;border-radius:8px;"></div>
    <div id="p2" style="height:360px;background:#fff;border:1px solid #eee;border-radius:8px;position:relative"></div>
  </div>
`;
document.body.insertBefore(root, document.body.firstChild);

/* diagnóstico (movível) */
const diag = document.createElement("div");
diag.style.cssText="position:fixed;inset:0;display:none;background:rgba(0,0,0,.35);z-index:9999";
diag.innerHTML = `
  <div id="dg" style="position:absolute;top:12vh;left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.3);width:min(760px,95vw);">
    <div id="dg-h" style="padding:12px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px;background:#f8fafc;border-top-left-radius:12px;border-top-right-radius:12px">
      <div style="font-weight:700">Diagnóstico</div>
      <div style="margin-left:auto"></div>
      <button id="diag-close" style="padding:6px 10px;border:1px solid #cbd5e1;background:#eef2f7;border-radius:8px;cursor:pointer">fechar</button>
    </div>
    <pre id="diag-body" style="padding:12px 16px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap"></pre>
  </div>`;
document.body.appendChild(diag);

/* parâmetros (movível) */
const modal = document.createElement("div");
modal.style.cssText="position:fixed;inset:0;display:none;background:rgba(0,0,0,.35);z-index:9998";
modal.innerHTML=`
  <div id="pm" style="position:absolute;top:10vh;left:50%;transform:translateX(-50%);background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.3);width:min(1000px,96vw);">
    <div id="pm-h" style="padding:12px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px;background:#f8fafc;border-top-left-radius:12px;border-top-right-radius:12px">
      <div style="font-weight:700">Parâmetros</div>
      <div style="margin-left:auto"></div>
      <button id="btn-close" style="padding:6px 10px;border:1px solid #cbd5e1;background:#eef2f7;border-radius:8px;cursor:pointer">fechar</button>
    </div>
    <div style="padding:12px 16px;display:grid;grid-template-columns:repeat(3,minmax(260px,1fr));gap:16px">
      <div>
        <h4>Condições</h4>
        <label>T (K) <input id="T" type="number" step="0.1"></label><br>
        <label>Dmin (M) <input id="Dmin" type="number" step="0.1"></label><br>
        <label>Dmax (M) <input id="Dmax" type="number" step="0.1"></label><br>
        <label>pontos exp. <input id="nexp" type="number" step="1"></label><br>
        <label>ruído (sd) <input id="noise" type="number" step="0.001"></label><br>
        <button id="btn-rand">randomize</button>
      </div>
      <div>
        <h4>Prot A (controle)</h4>
        <label>n<sub>A</sub> (1–3) <input id="nA" type="number" step="1" min="1" max="3"></label><br>
        <label>ΔG°<sub>H2O</sub> (kJ/mol) <input id="g0A" type="number" step="0.1"></label><br>
        <label>m (kJ/mol/M) <input id="mA" type="number" step="0.1"></label><br>
        <label>S<sub>F</sub> <input id="SF" type="number" step="0.01"></label><br>
        <label>S<sub>U</sub> <input id="SU" type="number" step="0.01"></label><br>
      </div>
      <div>
        <h4>Prot B (comparar)</h4>
        <label><input id="showB" type="checkbox"> habilitar B</label><br>
        <label>n<sub>B</sub> (1–3) <input id="nB" type="number" step="1" min="1" max="3"></label><br>
        <label>ΔG°<sub>H2O,B</sub> (kJ/mol) <input id="g0B" type="number" step="0.1"></label><br>
        <label>m<sub>B</sub> (kJ/mol/M) <input id="mB" type="number" step="0.1"></label><br>
        <h4>Osmólito em B</h4>
        <label>O (M) <input id="OB" type="number" step="0.1"></label><br>
        <label>α (kJ/mol/M) <input id="aB" type="number" step="0.1"></label><br>
        <label>β (kJ/mol/M/M) <input id="bB" type="number" step="0.1"></label><br>
        <button id="apply">aplicar</button>
      </div>
      <div style="grid-column:1/-1;border-top:1px dashed #e5e7eb;padding-top:8px">
        <button id="btn-save-json">save JSON</button>
        <button id="btn-copy-json">copy</button>
        <button id="btn-load-json">load</button>
        <input id="file-json" type="file" accept=".json" style="display:none">
      </div>
    </div>
  </div>`;
document.body.appendChild(modal);

/* arrastáveis */
function makeDraggable(panel, header){
  let sx=0, sy=0, dragging=false;
  header.style.cursor="move";
  header.onmousedown = (e)=>{ dragging=true; sx=e.clientX-panel.offsetLeft; sy=e.clientY-panel.offsetTop; e.preventDefault(); };
  window.addEventListener("mousemove",(e)=>{ if(!dragging) return; panel.style.left=(e.clientX-sx)+"px"; panel.style.top=(e.clientY-sy)+"px"; panel.style.right="auto"; panel.style.bottom="auto"; });
  window.addEventListener("mouseup",()=> dragging=false);
}
makeDraggable(byId("dg"), byId("dg-h"));
makeDraggable(byId("pm"), byId("pm-h"));

/* ================== simulação ================== */
function simulateProtein(params){
  const {T, Dmin, Dmax, n_theory, n_exp, n, dG0_kJ, m_kJ_M, SF, SU, noise_sd, osmolite} = params;
  const Dgrid = linspace(Dmin, Dmax, n_theory);
  const epsF = 1e-3; // evita singularidades quando inverter S→f
  const noise = rngNoise(noise_sd);

  const rows = Dgrid.map(D=>{
    const dG0J = ( (osmolite?.dG0_shift_kJ || 0) + dG0_kJ + (osmolite?.beta_kJ_per_MM || 0)*(osmolite?.O_M||0)*D )*1000; // J/mol
    const mJ = m_kJ_M*1000; // J/mol/M
    const fU = fU_from_eq4(dG0J, mJ, D, n, T);
    const Geff_kJ = Geff_from_f(fU, T)/1000;
    const S = (1-fU)*SF + fU*SU; // ascendente
    return {D, fU, Geff_kJ, S};
  });

  // EXP: usa só Dexp e ruído no S; ΔG_eff(exp) por inversão de S (clamp nas bordas)
  const Dexp = linspace(Dmin, Dmax, n_exp);
  const exp = Dexp.map(D=>{
    // reusa cálculo exato p/ f_true
    const dG0J = ( (osmolite?.dG0_shift_kJ || 0) + dG0_kJ + (osmolite?.beta_kJ_per_MM || 0)*(osmolite?.O_M||0)*D )*1000;
    const mJ = m_kJ_M*1000;
    const f_true = fU_from_eq4(dG0J, mJ, D, n, T);
    let S = (1-f_true)*SF + f_true*SU + noise();
    S = clamp(S, SF+1e-5, SU-1e-5);
    // inversão linear do sinal p/ estimar f
    const f_est = clamp( (S - SF)/((SU - SF)||1e-9), epsF, 1-epsF );
    const Geff_kJ = Geff_from_f(f_est, T)/1000;
    return {D, S, Geff_kJ};
  });

  // ajuste em ΔG_eff × D
  const xs = exp.map(o=>o.D), ys = exp.map(o=>o.Geff_kJ);
  const fit = (n===1)? linreg(xs,ys) : quadreg(xs,ys);

  // C_m (f_U=0.5) na malha suave
  let Cm=null;
  for(let i=1;i<rows.length;i++){
    const f0=rows[i-1].fU, f1=rows[i].fU;
    if((f0-0.5)*(f1-0.5)<=0){
      const x0=rows[i-1].D, x1=rows[i].D;
      Cm = x0 + (0.5-f0)*(x1-x0)/((f1-f0)||1e-12);
      break;
    }
  }
  return {rows, exp, fit, Cm};
}

/* ================== computa & desenha ================== */
function compute(){
  const A = simulateProtein({
    T:state.T, Dmin:state.Dmin, Dmax:state.Dmax, n_theory:state.n_theory, n_exp:state.n_exp,
    n:state.nA, dG0_kJ:state.dG0A_kJ, m_kJ_M:state.mA_kJ_M, SF:state.SF, SU:state.SU, noise_sd:state.noise_sd,
    osmolite:null
  });
  let B=null;
  if(state.showB){
    const dG0shift = state.alpha_B * state.O_B; // kJ/mol
    B = simulateProtein({
      T:state.T, Dmin:state.Dmin, Dmax:state.Dmax, n_theory:state.n_theory, n_exp:state.n_exp,
      n:state.nB, dG0_kJ:state.dG0B_kJ, m_kJ_M:state.mB_kJ_M, SF:state.SF, SU:state.SU, noise_sd:state.noise_sd,
      osmolite:{ dG0_shift_kJ:dG0shift, O_M:state.O_B, beta_kJ_per_MM:state.beta_B }
    });
  }
  state.data = {A,B};
}

function draw(){
  const {A,B} = state.data;

  /* Sinal × [D] — só linha do modelo + pontos exp */
  const tA={x:A.rows.map(o=>o.D), y:A.rows.map(o=>o.S), mode:"lines", name:"modelo (A)", line:{width:3}};
  const eA={x:A.exp.map(o=>o.D),  y:A.exp.map(o=>o.S),  mode:"markers", name:"exp (A)", marker:{size:7}};
  const t1=[tA,eA];
  if(B){
    t1.push(
      {x:B.rows.map(o=>o.D), y:B.rows.map(o=>o.S), mode:"lines", name:"modelo (B)", line:{width:3, dash:"dot"}},
      {x:B.exp.map(o=>o.D),  y:B.exp.map(o=>o.S),  mode:"markers", name:"exp (B)", marker:{size:7, symbol:"square"}}
    );
  }
  Plotly.newPlot("p1", t1, {
    title:"Sinal × [Desnaturante]",
    xaxis:{title:"[D] (M)"},
    yaxis:{title:"S_obs"},
    margin:{t:36}
  }, {displaylogo:false,responsive:true});

  /* ΔG_eff × [D] — só EXP + ajuste; anotação arrastável */
  const xs=A.exp.map(o=>o.D);
  const fitA = A.fit;
  const yfitA = (state.nA===1) ? xs.map(x=>fitA.m*x+fitA.b) : xs.map(x=>fitA.a*x*x+fitA.b*x+fitA.c);
  const gA = {x: A.exp.map(o=>o.D), y: A.exp.map(o=>o.Geff_kJ), mode:"markers", name:"exp (A)", marker:{size:7, color:"#d62728"}};
  const fA = {x: xs, y: yfitA, mode:"lines", name:"ajuste (A)", line:{width:2, dash:"dashdot", color:"#d62728"}};
  const t2=[gA,fA];

  let ann=[];
  if(A.Cm!=null) ann.push({x:A.Cm, y:0, text:"C_m (A)", showarrow:true, ay:-30});
  if(B){
    const fitB=B.fit;
    const yfitB=(state.nB===1)? xs.map(x=>fitB.m*x+fitB.b) : xs.map(x=>fitB.a*x*x+fitB.b*x+fitB.c);
    t2.push(
      {x:B.exp.map(o=>o.D), y:B.exp.map(o=>o.Geff_kJ), mode:"markers", name:"exp (B)", marker:{size:7, symbol:"square", color:"#2ca02c"}},
      {x:xs, y:yfitB, mode:"lines", name:"ajuste (B)", line:{width:2, dash:"dot", color:"#2ca02c"}}
    );
    if(B.Cm!=null) ann.push({x:B.Cm, y:0, text:"C_m (B)", showarrow:true, ay:-30});
  }

  Plotly.newPlot("p2", t2, {
    title:"ΔG_eff × [D] (kJ/mol)",
    xaxis:{title:"[D] (M)"},
    yaxis:{title:"ΔG_eff (kJ/mol)"},
    margin:{t:36},
    annotations: ann.concat([{xref:"paper",yref:"paper",x:0,y:0.02,showarrow:false,text:"",align:"left"}])
  }, {displaylogo:false,responsive:true}).then(()=>{
    // adiciona caixa flutuante/arrastável com os parâmetros de ajuste
    addFitPanel(A.fit, state.nA, B?B.fit:null, B?state.nB:null);
  });
}

/* painel arrastável com resultados de regressão */
function addFitPanel(fitA, nA, fitB, nB){
  // remove anterior
  const old = document.getElementById("fit-panel");
  if(old) old.remove();
  const panel = document.createElement("div");
  panel.id="fit-panel";
  panel.style.cssText="position:absolute;right:18px;bottom:12px;z-index:999;"+
  "background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;"+
  "box-shadow:0 8px 18px rgba(0,0,0,.08);";
  const head = document.createElement("div");
  head.style.cssText="padding:6px 8px;border-bottom:1px solid #eee;cursor:move;background:#f8fafc;font:600 12px system-ui";
  head.textContent="Ajustes (ΔG = a·[D] + b  |  se n>1: quadrático)";
  const body = document.createElement("div");
  body.style.cssText="font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;padding:8px 10px;white-space:pre";
  const fmtA = (nA===1)
    ? `a=${round(fitA.m,3)} kJ/mol/M; b=${round(fitA.b,3)} kJ/mol; R²=${round(fitA.r2,4)}`
    : `a2=${round(fitA.a,3)}; b1=${round(fitA.b,3)}; c0=${round(fitA.c,3)}; R²=${round(fitA.r2,4)}`;
  let text = `ΔG = a·[D] + b (A)\n${fmtA}`;
  if(fitB){
    const fmtB = (nB===1)
      ? `a=${round(fitB.m,3)} kJ/mol/M; b=${round(fitB.b,3)} kJ/mol; R²=${round(fitB.r2,4)}`
      : `a2=${round(fitB.a,3)}; b1=${round(fitB.b,3)}; c0=${round(fitB.c,3)}; R²=${round(fitB.r2,4)}`;
    text += `\n\nΔG = a·[D] + b (B)\n${fmtB}`;
  }
  body.textContent = text;
  panel.appendChild(head); panel.appendChild(body);
  const host = byId("p2");
  host.style.position="relative";
  host.appendChild(panel);
  // tornar arrastável
  (function(){
    let ox=0, oy=0, dragging=false;
    head.onmousedown = (e)=>{ dragging=true; ox=e.clientX-panel.offsetLeft; oy=e.clientY-panel.offsetTop; e.preventDefault(); };
    window.addEventListener("mousemove",(e)=>{ if(!dragging) return; panel.style.left=(e.clientX-ox)+"px"; panel.style.top=(e.clientY-oy)+"px"; panel.style.right="auto"; panel.style.bottom="auto"; });
    window.addEventListener("mouseup",()=> dragging=false);
  })();
}

/* ================== exportações ================== */
function exportCSV(){
  const A=state.data.A, B=state.data.B;
  const rows=[];
  rows.push("D,S_obs_A,Geff_A_kJmol" + (B?",S_obs_B,Geff_B_kJmol":""));
  const N=Math.max(A.exp.length, B?B.exp.length:0);
  for(let i=0;i<N;i++){
    const a = A.exp[i] || A.exp[A.exp.length-1];
    if(B){
      const b = B.exp[i] || B.exp[B.exp.length-1];
      rows.push([a.D, round(a.S,6), round(a.Geff_kJ,6), round(b.S,6), round(b.Geff_kJ,6)].join(","));
    }else{
      rows.push([a.D, round(a.S,6), round(a.Geff_kJ,6)].join(","));
    }
  }
  const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="denat_data.csv";
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
}

/* importa CSV com 2 colunas: D,S_obs  (Prot A) */
function importCSV(text){
  const lines=text.trim().split(/\r?\n/);
  const data=[];
  for(let i=0;i<lines.length;i++){
    const L=lines[i].trim();
    if(!L || /^D\s*(,|;)/i.test(L)) continue; // pula header
    const parts=L.split(/[,\t;]/).map(s=>s.trim());
    if(parts.length<2) continue;
    const D=parseFloat(parts[0]), S=parseFloat(parts[1]);
    if(isFinite(D)&&isFinite(S)) data.push({D,S});
  }
  if(data.length<3){ alert("CSV precisa ter ao menos 3 linhas válidas (D,S_obs)."); return; }

  // substitui Prot A por dados carregados e recalcula ΔG_eff a partir do S (com clamp seguro)
  const epsF=1e-3;
  const Aexp = data.map(({D,S})=>{
    const Scl = clamp(S, state.SF+1e-5, state.SU-1e-5);
    const f_est = clamp((Scl-state.SF)/((state.SU-state.SF)||1e-9), epsF, 1-epsF);
    const Geff_kJ = Geff_from_f(f_est, state.T)/1000;
    return {D, S:Scl, Geff_kJ};
  }).sort((a,b)=>a.D-b.D);

  // refaz “rows” do modelo em A para acompanhar (mesma malha padrão)
  const Dgrid = linspace(state.Dmin, state.Dmax, state.n_theory);
  const rows = Dgrid.map(D=>{
    const dG0J = state.dG0A_kJ*1000;
    const mJ = state.mA_kJ_M*1000;
    const fU = fU_from_eq4(dG0J, mJ, D, state.nA, state.T);
    const Geff_kJ = Geff_from_f(fU, state.T)/1000;
    const S = (1-fU)*state.SF + fU*state.SU;
    return {D, fU, Geff_kJ, S};
  });

  // ajuste linear/quadrático com os pontos carregados
  const xs=Aexp.map(o=>o.D), ys=Aexp.map(o=>o.Geff_kJ);
  const fit = (state.nA===1)? linreg(xs,ys) : quadreg(xs,ys);
  // Cm a partir do modelo
  let Cm=null; for(let i=1;i<rows.length;i++){ const f0=rows[i-1].fU, f1=rows[i].fU;
    if((f0-0.5)*(f1-0.5)<=0){ const x0=rows[i-1].D, x1=rows[i].D; Cm=x0+(0.5-f0)*(x1-x0)/((f1-f0)||1e-12); break; } }

  state.data.A = {rows, exp:Aexp, fit, Cm};
  draw();
}

/* export HTML simples (gráficos + diag) */
function exportHTML(){
  const P = {
    T:state.T, Dmin:state.Dmin, Dmax:state.Dmax,
    A: state.data.A,
    B: state.showB? state.data.B : null,
    diag: buildDiag()
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Denat-Toolkit export</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#f8fafc;margin:8px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px}</style></head>
<body>
<h3>Desnaturação por desnaturante — ΔG_eff e m_eff</h3>
<div class="card"><pre id="diag"></pre></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
  <div id="p1" class="card" style="height:360px"></div>
  <div id="p2" class="card" style="height:360px; position:relative"></div>
</div>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script>
const P=${JSON.stringify(P)};
(function(){
  document.getElementById("diag").textContent=P.diag;

  const t1=[{x:P.A.rows.map(o=>o.D), y:P.A.rows.map(o=>o.S), mode:"lines", name:"modelo (A)", line:{width:3}},
            {x:P.A.exp.map(o=>o.D),  y:P.A.exp.map(o=>o.S),  mode:"markers", name:"exp (A)", marker:{size:7}}];
  if(P.B){ t1.push({x:P.B.rows.map(o=>o.D), y:P.B.rows.map(o=>o.S), mode:"lines", name:"modelo (B)", line:{width:3, dash:"dot"}},
                 {x:P.B.exp.map(o=>o.D),  y:P.B.exp.map(o=>o.S),  mode:"markers", name:"exp (B)", marker:{size:7, symbol:"square"}}); }
  Plotly.newPlot("p1", t1, {title:"Sinal × [D]", xaxis:{title:"[D] (M)"}, yaxis:{title:"S_obs"}, margin:{t:36}}, {displaylogo:false});

  const xs=P.A.exp.map(o=>o.D);
  const fitA=P.A.fit;
  const yfitA = (P.A.nA===1)? xs.map(x=>fitA.m*x+fitA.b) : xs.map(x=>fitA.a*x*x+fitA.b*x+fitA.c);
  const t2=[{x:P.A.exp.map(o=>o.D), y:P.A.exp.map(o=>o.Geff_kJ), mode:"markers", name:"exp (A)", marker:{size:7, color:"#d62728"}},
            {x:xs, y:yfitA, mode:"lines", name:"ajuste (A)", line:{width:2, dash:"dashdot", color:"#d62728"}}];
  let ann=[];
  if(P.A.Cm!=null) ann.push({x:P.A.Cm, y:0, text:"C_m (A)", showarrow:true, ay:-30});
  if(P.B){
    const fitB=P.B.fit;
    const yfitB = xs.map(x=>(fitB.a!=null)? (fitB.a*x*x+fitB.b*x+fitB.c) : (fitB.m*x+fitB.b));
    t2.push({x:P.B.exp.map(o=>o.D), y:P.B.exp.map(o=>o.Geff_kJ), mode:"markers", name:"exp (B)", marker:{size:7, symbol:"square", color:"#2ca02c"}},
            {x:xs, y:yfitB, mode:"lines", name:"ajuste (B)", line:{width:2, dash:"dot", color:"#2ca02c"}});
    if(P.B.Cm!=null) ann.push({x:P.B.Cm, y:0, text:"C_m (B)", showarrow:true, ay:-30});
  }
  Plotly.newPlot("p2", t2, {title:"ΔG_eff × [D] (kJ/mol)", xaxis:{title:"[D] (M)"}, yaxis:{title:"ΔG_eff (kJ/mol)"}, margin:{t:36}, annotations:ann}, {displaylogo:false});
})();
</script></body></html>`;
  const blob = new Blob([html],{type:"text/html;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="DenatToolkit_export.html";
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
}

/* diagnóstico (texto) */
function buildDiag(){
  const A=state.data.A, B=state.data.B;
  const L=[];
  L.push(`T=${round(state.T,2)} K`);
  L.push(`D: ${round(state.Dmin,2)}–${round(state.Dmax,2)} M`);
  L.push(`Prot A — n=${state.nA}; ΔG°(H2O)=${round(state.dG0A_kJ,3)} kJ/mol; m=${round(state.mA_kJ_M,3)} kJ/mol/M; S_F=${round(state.SF,3)}; S_U=${round(state.SU,3)}`);
  L.push(`Ajuste A: ${ (state.nA===1)? `a=${round(A.fit.m,3)}; b=${round(A.fit.b,3)}; R²=${round(A.fit.r2,4)}`
                              : `a2=${round(A.fit.a,3)}; b1=${round(A.fit.b,3)}; c0=${round(A.fit.c,3)}; R²=${round(A.fit.r2,4)}` }`);
  if(B){
    L.push(`\nProt B — n=${state.nB}; ΔG°(H2O)=${round(state.dG0B_kJ,3)}; m=${round(state.mB_kJ_M,3)}; O=${round(state.O_B,3)} M; α=${round(state.alpha_B,3)}; β=${round(state.beta_B,3)}`);
    L.push(`Ajuste B: ${ (state.nB===1)? `a=${round(B.fit.m,3)}; b=${round(B.fit.b,3)}; R²=${round(B.fit.r2,4)}`
                                : `a2=${round(B.fit.a,3)}; b1=${round(B.fit.b,3)}; c0=${round(B.fit.c,3)}; R²=${round(B.fit.r2,4)}` }`);
  }
  return L.join("\n");
}

/* ================== eventos UI ================== */
byId("btn-diag").onclick = ()=>{ byId("diag-body").textContent=buildDiag(); diag.style.display="block"; };
byId("diag-close").onclick = ()=> diag.style.display="none";

byId("btn-param").onclick = ()=>{
  modal.style.display="block";
  byId("T").value=state.T; byId("Dmin").value=state.Dmin; byId("Dmax").value=state.Dmax;
  byId("nexp").value=state.n_exp; byId("noise").value=state.noise_sd;
  byId("nA").value=state.nA; byId("g0A").value=state.dG0A_kJ; byId("mA").value=state.mA_kJ_M; byId("SF").value=state.SF; byId("SU").value=state.SU;
  byId("showB").checked=state.showB; byId("nB").value=state.nB; byId("g0B").value=state.dG0B_kJ; byId("mB").value=state.mB_kJ_M;
  byId("OB").value=state.O_B; byId("aB").value=state.alpha_B; byId("bB").value=state.beta_B;
};
byId("btn-close").onclick = ()=> modal.style.display="none";

byId("btn-rand").onclick = ()=>{ randomizeState();
  byId("T").value=state.T; byId("Dmin").value=state.Dmin; byId("Dmax").value=state.Dmax;
  byId("nexp").value=state.n_exp; byId("noise").value=state.noise_sd;
  byId("nA").value=state.nA; byId("g0A").value=state.dG0A_kJ; byId("mA").value=state.mA_kJ_M; byId("SF").value=state.SF; byId("SU").value=state.SU;
  byId("showB").checked=state.showB; byId("nB").value=state.nB; byId("g0B").value=state.dG0B_kJ; byId("mB").value=state.mB_kJ_M;
  byId("OB").value=state.O_B; byId("aB").value=state.alpha_B; byId("bB").value=state.beta_B;
};

byId("apply").onclick = ()=>{
  state.T=parseFloat(byId("T").value);
  state.Dmin=parseFloat(byId("Dmin").value); state.Dmax=parseFloat(byId("Dmax").value);
  state.n_exp=Math.max(6,Math.round(parseFloat(byId("nexp").value)||18));
  state.noise_sd=parseFloat(byId("noise").value)||0;

  state.nA=clamp(Math.round(parseFloat(byId("nA").value)||1),1,3);
  state.dG0A_kJ=parseFloat(byId("g0A").value); state.mA_kJ_M=parseFloat(byId("mA").value);
  state.SF=parseFloat(byId("SF").value); state.SU=parseFloat(byId("SU").value);
  if(state.SU<=state.SF){ const mid=(state.SF+state.SU)/2; state.SF=mid-0.4; state.SU=mid+0.4; }

  state.showB=byId("showB").checked;
  state.nB=clamp(Math.round(parseFloat(byId("nB").value)||1),1,3);
  state.dG0B_kJ=parseFloat(byId("g0B").value); state.mB_kJ_M=parseFloat(byId("mB").value);
  state.O_B=parseFloat(byId("OB").value); state.alpha_B=parseFloat(byId("aB").value); state.beta_B=parseFloat(byId("bB").value);
  modal.style.display="none";
  compute(); draw();
};

byId("btn-reset").onclick = ()=>{ randomizeState(); compute(); draw(); };
byId("btn-html").onclick  = exportHTML;
byId("btn-csv").onclick   = exportCSV;

byId("btn-load").onclick = ()=>{
  const inp=document.createElement("input"); inp.type="file"; inp.accept=".csv,text/csv";
  inp.onchange = (e)=>{ const f=e.target.files[0]; if(!f) return;
    const rd=new FileReader(); rd.onload=()=> importCSV(rd.result); rd.readAsText(f);
  }; inp.click();
};

/* JSON presets */
byId("btn-save-json").onclick = ()=>{
  const payload = {version:1, state:{...state, data:undefined}};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="DenatToolkit_preset.json";
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
};
byId("btn-copy-json").onclick = ()=> navigator.clipboard?.writeText(JSON.stringify({version:1,state:{...state,data:undefined}},null,2)).then(()=>alert("copiado!")).catch(()=>{});
byId("btn-load-json").onclick = ()=> byId("file-json").click();
byId("file-json").addEventListener("change",(e)=>{ const f=e.target.files?.[0]; if(!f) return;
  const r=new FileReader(); r.onload=()=>{ try{
    const obj=JSON.parse(r.result); Object.assign(state, obj.state||obj); compute(); draw(); alert("preset carregado!");
  }catch(_){ alert("JSON inválido."); } }; r.readAsText(f);
  e.target.value="";
});

/* inicia */
(function init(){
  randomizeState(); compute(); draw();
  // MathJax para LaTeX, se disponível
  if(!window.MathJax){
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"; s.async=true;
    document.head.appendChild(s);
  }
})();
})();
