/* ThermoStab-Toolkit (ETK) — v2d
   - Grids 2×2 largos (plotbox 640px) + resize responsivo
   - Painel de parâmetros redimensionável/rolável
   - Diagnóstico sem duplicar (buffer + flush)
   - MM fit robusto (LM), reset randômico
   - Eyring/Arrhenius, CSV/HTML export, link opcional t1/2 a Km & kcat(T)
*/
(function(){
  // ===== helpers =====
  const W = {
    q:(s,el=document)=>el.querySelector(s),
    c:(tag,attrs={},parent)=>{
      const e=document.createElement(tag);
      for(const k in attrs){
        if(k==="style") Object.assign(e.style, attrs[k]);
        else if(k==="text") e.textContent=attrs[k];
        else if(k==="html") e.innerHTML=attrs[k];
        else e.setAttribute(k, attrs[k]);
      }
      (parent||document.body).appendChild(e); return e;
    }
  };

  // ===== consts =====
  const R = 8.314462618;       // J/mol/K
  const kB = 1.380649e-23;     // J/K
  const h  = 6.62607015e-34;   // J*s
  const E0 = 1.0;              // uM fixo

  const toK = Tc => (Number(Tc)||0) + 273.15;
  const range=(a,b,n)=>{const out=[];const step=(b-a)/Math.max(1,(n-1));for(let i=0;i<n;i++)out.push(a+i*step);return out;};
  const mean = arr => arr.length?arr.reduce((s,x)=>s+x,0)/arr.length:0;
  const linreg=(x,y)=>{
    const n=x.length; if(n!==y.length||n<2) return null;
    const mx=mean(x), my=mean(y);
    let num=0, den=0;
    for(let i=0;i<n;i++){ const dx=x[i]-mx, dy=y[i]-my; num+=dx*dy; den+=dx*dx; }
    if(den===0) return null;
    const m=num/den, b=my - m*mx; return {m,b};
  };
  const parsePairs=(str)=>{
    if(!str||!str.trim())return[];
    return str.split(/;|\n/).map(s=>s.trim()).filter(Boolean).map(s=>{
      const ab=s.split(/,|\s+/).map(Number); return {x:ab[0],y:ab[1]};
    });
  };

  // ===== estilos =====
  const css = `
  body{background:#ffffff;color:#0b1220}
  .topbar{display:flex;gap:.5rem;align-items:center;padding:.6rem .8rem;flex-wrap:wrap}
  .topbar .title{font-weight:700;font-size:20px;margin-right:8px}
  .topbar .btn{border:none;background:#e9eef6;border-radius:16px;padding:.45rem .75rem;cursor:pointer}
  .topbar .btn.red{background:#ff6b6b;color:#fff}
  .topbar .btn.blue{background:#5090ff;color:#fff}

  /* grid 2×2 full width */
  .grid{
    display:grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap:28px;
    padding:14px 18px;
    width:100%;
    max-width:2000px;
    margin:0 auto;
  }
  @media (max-width:1100px){ .grid{grid-template-columns:1fr} }

  .card{background:#fff;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.12);padding:12px}
  .card h3{margin:0 0 6px 0;font-size:16px}
  .plotbox{width:100%;height:640px}

  /* janelas flutuantes (redimensionáveis/roláveis) */
  .floating{
    position:fixed;right:16px;top:86px;min-width:560px;max-width:820px;
    background:#ffffff;border:1px solid #c9d4ee;border-radius:12px;
    box-shadow:0 10px 26px rgba(0,0,0,.18);display:none;z-index:999999;
    resize: both; overflow: hidden;
  }
  .floating .head{
    position:relative;font-weight:700;padding:10px 44px 10px 12px;
    background:#f1f5ff;border-bottom:1px solid rgba(0,0,0,.12);cursor:grab
  }
  .floating .close{
    position:absolute;right:10px;top:8px;width:28px;height:28px;border-radius:6px;
    border:1px solid #c9d4ee;background:#fff;cursor:pointer;font-weight:700;line-height:26px;text-align:center
  }
  .floating .close:hover{background:#ffefef;border-color:#ffb3b3}
  .floating .body{padding:10px 12px; max-height:75vh; overflow:auto}

  .floating label{display:block;font-size:12px;color:#3854a0;margin-top:6px}
  .floating input, .floating textarea{width:100%;padding:.35rem .5rem;border-radius:8px;border:1px solid #c9d4ee;background:#fff;color:#0b1220}
  .floating table{width:100%;border-collapse:collapse;font-size:12px}
  .floating td,.floating th{border:1px solid #c9d4ee;padding:3px 5px;text-align:center}
  .floating .row{display:flex;gap:10px;flex-wrap:wrap}
  .floating .row>div{flex:1 1 280px}

  .diag pre{white-space:pre-wrap;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;background:#fbfdff;border:1px dashed #c9d4ee;border-radius:10px;padding:8px;margin:0}
  `;
  W.c("style",{text:css},document.head);

  // ===== estrutura =====
  const host = W.q("#grafico") || W.q("#plot") || W.c("div",{},document.body);
  const bar  = W.c("div",{class:"topbar"},host);
  W.c("span",{class:"title",text:"ThermoStab-Toolkit (ETK)"},bar);
  const bReset = W.c("button",{class:"btn red",text:"RESET"},bar);
  const bHTML  = W.c("button",{class:"btn blue",text:"HTML"},bar);
  const bDiag  = W.c("button",{class:"btn",text:"DIAGNOSTICO"},bar);
  const bParams= W.c("button",{class:"btn",text:"PARAMETROS"},bar);
  const bEq    = W.c("button",{class:"btn",text:"EQUACOES"},bar);
  const bCSV   = W.c("button",{class:"btn",text:"CSV"},bar);
  const bLoad  = W.c("button",{class:"btn",text:"LOAD"},bar);
  const fileIn = W.c("input",{type:"file",accept:".csv",style:{display:"none"}},bar);

  const grid = W.c("div",{class:"grid"},host);
  function makeCard(title){
    const card = W.c("div",{class:"card"},grid);
    W.c("h3",{text:title},card);
    const plot=W.c("div",{class:"plotbox"},card);
    return {card,plot};
  }
  const C_MM = makeCard("Michaelis-Menten");
  const C_EY = makeCard("Eyring: ln(k*h/kB*T) vs 1/T");
  const C_AR = makeCard("Arrhenius: ln k vs 1/T");
  const C_KD = makeCard("Meia-vida t1/2 vs T");

  // ===== paineis =====
  function panel(title, cls){
    const p=W.c("div",{class:"floating "+(cls||"")},document.body);
    const head=W.c("div",{class:"head",text:title},p);
    const x=W.c("button",{class:"close",text:"✕",title:"Fechar"},head);
    const body=W.c("div",{class:"body"},p);

    let drag=false,ox=0,oy=0;
    head.addEventListener("mousedown",e=>{ if(e.target===x) return; drag=true;ox=e.clientX-p.offsetLeft;oy=e.clientY-p.offsetTop;});
    window.addEventListener("mousemove",e=>{if(!drag) return; p.style.left=(e.clientX-ox)+"px"; p.style.top=(e.clientY-oy)+"px";});
    window.addEventListener("mouseup",()=>drag=false);
    x.addEventListener("click",()=>{ p.style.display="none"; });

    return {box:p,body};
  }
  const P = panel("Parametros");
  const D = panel("Diagnostico","diag");
  const E = panel("Equacoes");

  function toggle(el){ el.style.display = (el.style.display==="none"||!el.style.display) ? "block" : "none"; }
  bParams.onclick=()=>toggle(P.box);
  bDiag.onclick=()=>toggle(D.box);
  bEq.onclick=()=>toggle(E.box);
  bLoad.onclick=()=>fileIn.click();
  fileIn.onchange=(ev)=>{ const f=ev.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>applyCSV(r.result); r.readAsText(f); };

  // === Equacoes (LaTeX blocos grandes) ===
  E.body.innerHTML = [
    "$$\\textbf{Arrhenius:}\\quad k = A\\,e^{-E_a/(RT)}$$",
    "$$\\textbf{Eyring:}\\quad k = \\frac{k_B T}{h}\\, e^{\\Delta S^{\\ddagger}/R}\\, e^{-\\Delta H^{\\ddagger}/(RT)}$$",
    "$$\\textbf{Michaelis\\text{-}Menten:}\\quad v = \\frac{k_{cat} E_0 [S]}{K_m + [S]}\\quad (E_0=1.0\\,\\mu M)$$",
    "$$\\textbf{t_{1/2}:}\\quad t_{1/2} = \\frac{\\ln 2}{k_d}$$",
    "$$\\textbf{Rela\\c{c}\\~oes:}\\quad \\Delta G^{\\ddagger} = \\Delta H^{\\ddagger} - T\\,\\Delta S^{\\ddagger},\\qquad E_a = \\Delta H^{\\ddagger} + RT$$"
  ].join("<br/>");
  if(!window.__MATHJAX_LOADED__){
    window.__MATHJAX_LOADED__ = true;
    const mj = document.createElement("script");
    mj.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
    mj.onload = ()=>{ if(window.MathJax) window.MathJax.typesetPromise([E.body]); };
    document.head.appendChild(mj);
  } else if(window.MathJax){ window.MathJax.typesetPromise([E.body]); }

  // ===== inputs =====
  const rowAB=W.c("div",{class:"row"},P.body);
  const colA=W.c("div",{},rowAB);
  const colB=W.c("div",{},rowAB); colB.style.display="none";
  let B_enabled=false;

  function inp(parent,label,def,step,type){
    W.c("label",{text:label},parent);
    const el=W.c("input",{type: type||"number", value:String(def)},parent);
    if(step) el.step=step; return el;
  }

  const nameA = W.c("input",{type:"text",value:"Controle",placeholder:"Prot A"},colA); nameA.style.marginBottom="6px";
  const kcatA = inp(colA,"kcat A (1/s)",10,"0.01");
  const KmA   = inp(colA,"Km A (mM)",0.20,"0.001");

  const nameB = W.c("input",{type:"text",value:"Teste",placeholder:"Prot B"},colB);  nameB.style.marginBottom="6px";
  const kcatB = inp(colB,"kcat B (1/s)",12,"0.01");
  const KmB   = inp(colB,"Km B (mM)",0.15,"0.001");

  const btnAB = W.c("div",{class:"row"},P.body);
  const bAddB = W.c("button",{class:"btn",text:"Adicionar Prot B"},btnAB);
  const bHideB= W.c("button",{class:"btn",text:"Ocultar Prot B"},btnAB); bHideB.style.display="none";
  bAddB.onclick=()=>{colB.style.display="block"; B_enabled=true; bAddB.style.display="none"; bHideB.style.display="inline-block"; plotAll();};
  bHideB.onclick=()=>{colB.style.display="none"; B_enabled=false; bAddB.style.display="inline-block"; bHideB.style.display="none"; plotAll();};

  const mmS   = inp(P.body,"Faixa [S] (mM; a,b)","0, 1.0",null,"text");
  const mmAexp= W.c("textarea",{placeholder:"Dados A: S(mM),v(uM/s); ; ou quebra de linha",text:"0.05,0.4; 0.1,0.7; 0.2,1.1; 0.5,1.6; 1,1.8"},P.body);
  const mmBexp= W.c("textarea",{placeholder:"Dados B: S(mM),v(uM/s)",text:"0.05,0.5; 0.1,0.85; 0.2,1.3; 0.5,1.9; 1,2.2"},P.body);
  const btnsMM= W.c("div",{class:"row"},P.body);
  const bMM   = W.c("button",{text:"Plotar MM",class:"btn blue"},btnsMM);
  const bMMfit= W.c("button",{text:"Ajustar Km/kcat",class:"btn"},btnsMM);

  // Eyring
  W.c("hr",{},P.body);
  W.c("div",{text:"Eyring (T em C e kcat em 1/s)"},P.body);
  function mkTable(title,def){
    W.c("label",{text:title},P.body);
    const tbl=W.c("table",{},P.body);
    const tb =W.c("tbody",{},tbl);
    def.forEach(r=>{
      const tr=W.c("tr",{},tb);
      W.c("td",{contenteditable:"true",text:String(r[0])},tr);
      W.c("td",{contenteditable:"true",text:String(r[1])},tr);
    });
    return tb;
  }
  const TBA = mkTable("Prot A (T[C], kcat[1/s])",[[15,4.2],[25,7.0],[35,10.5],[45,14.0]]);
  const TBB = mkTable("Prot B (T[C], kcat[1/s])",[[15,5.0],[25,8.2],[35,12.4],[45,16.7]]);
  TBB.parentElement.style.display="none";

  const bEY = W.c("button",{text:"Plotar Eyring",class:"btn blue"},P.body);
  const bARfromEY=W.c("button",{text:"Arrhenius a partir das tabelas",class:"btn"},P.body);

// === Ea manual (opcional) + Tref p/ ΔS‡ e ΔG‡ ===
const EaRow = W.c("div",{class:"row"},P.body);
const EaA = inp(EaRow,"Ea A (kJ/mol) — opcional","",null,"number");
const EaB = inp(EaRow,"Ea B (kJ/mol) — opcional","",null,"number");
const TrefInp = inp(P.body,"Tref para ΔS* e ΔG* (°C)",25,"0.1");

  // KD
  W.c("hr",{},P.body);
  W.c("div",{text:"Deativacao (kd) — usar 1 ou 2 pontos"},P.body);
  const kdRow=W.c("div",{class:"row"},P.body);
  const kdColA=W.c("div",{},kdRow), kdColB=W.c("div",{},kdRow);
  function kdInputs(col, lab){
    W.c("label",{text:lab},col);
    const Tref=inp(col,"Tref (C)",60);
    const kd1 =inp(col,"kd@Tref (1/min)",0.027,"0.0001");
    const T2  =inp(col,"2o ponto T (C)",50);
    const kd2 =inp(col,"kd@T2 (1/min)",0.004,"0.0001");
    return {Tref,kd1,T2,kd2};
  }
  const KDA=kdInputs(kdColA,"Prot A");
  const KDB=kdInputs(kdColB,"Prot B");
  kdColB.style.display="none";
  const bKD=W.c("button",{text:"Atualizar t1/2",class:"btn blue"},P.body);

  // Link t1/2
  W.c("hr",{},P.body);
  const linkRow = W.c("div",{class:"row"},P.body);
  const linkCol1 = W.c("div",{},linkRow);
  const linkCol2 = W.c("div",{},linkRow);
  W.c("label",{text:"Linkar t1/2 a Km e kcat(T) (assume k1 difusão-limitado)"}, linkCol1);
  const linkChk = W.c("input",{type:"checkbox"}, linkCol1); linkChk.style.marginTop="6px";
  W.c("label",{text:"k1 (1/M/s) — sugestão: 1e8"}, linkCol2);
  const k1Input = W.c("input",{type:"number",value:"1e8",step:"1e7"}, linkCol2);

  function syncBVisibility(){
    TBB.parentElement.style.display = B_enabled ? "block" : "none";
    kdColB.style.display = B_enabled ? "block" : "none";
  }

  // ===== diag buffer =====
  let DIAG = [];
  function diagClear(){ DIAG = []; D.body.innerHTML=""; }
  function diagPush(lines){ if(!Array.isArray(lines)) lines=[String(lines)]; DIAG.push(...lines); }
  function diagFlush(){ const pre=W.c("pre",{},D.body); pre.textContent=DIAG.join("\n"); }

  // ===== modelos / plots =====
  function theoreticalMM(S,kcat,Km){ const Vmax=kcat*E0; return S.map(s=>({x:s,y:(Vmax*s)/(Km+s)})); }
  function parseExpMM(s){ return parsePairs(s).map(p=>({x:p.x,y:p.y})); }

  let FIG_MM=null, FIG_EY=null, FIG_AR=null, FIG_KD=null;
  let EY_LR_A=null, EY_LR_B=null;

  function plotMM(){
    const ab=mmS.value.split(",").map(Number);
    const smin=isFinite(ab[0])?ab[0]:0, smax=isFinite(ab[1])?ab[1]:1;
    const S=range(smin, smax, 200);
    const A=theoreticalMM(S, +kcatA.value, +KmA.value);
    const data=[ {x:A.map(p=>p.x), y:A.map(p=>p.y), mode:"lines", name:(nameA.value||"Prot A")} ];
    const Aexp=parseExpMM(mmAexp.value);
    if(Aexp.length) data.push({x:Aexp.map(p=>p.x),y:Aexp.map(p=>p.y),mode:"markers",name:(nameA.value||"Prot A")+" exp"});

    if(B_enabled){
      const B=theoreticalMM(S, +kcatB.value, +KmB.value);
      data.push({x:B.map(p=>p.x), y:B.map(p=>p.y), mode:"lines", name:(nameB.value||"Prot B")});
      const Bexp=parseExpMM(mmBexp.value);
      if(Bexp.length) data.push({x:Bexp.map(p=>p.x),y:Bexp.map(p=>p.y),mode:"markers",name:(nameB.value||"Prot B")+" exp"});
    }

    const layout={xaxis:{title:"[S] (mM)"},yaxis:{title:"v (uM/s)"}, margin:{t:20,r:10,l:60,b:50}};
    Plotly.newPlot(C_MM.plot,data,layout,{displaylogo:false,responsive:true});
    setTimeout(()=>Plotly.Plots.resize(C_MM.plot),0);
    FIG_MM={data,layout};

    // diag MM @25C
    const T=298.15;
    const dgES_A=-R*T*Math.log(1/(+KmA.value||1));
    const dgET_A=-R*T*Math.log((+kcatA.value||1)/(+KmA.value||1));
    const L=[
      "MM Prot A @25C (E0=1.0 fixo)",
      "Km (mM): "+(+KmA.value).toFixed(4),
      "kcat (1/s): "+(+kcatA.value).toFixed(4),
      "Vmax (uM/s): "+(+kcatA.value*E0).toFixed(4),
      "dG_ES* (kJ/mol): "+(dgES_A/1000).toFixed(2),
      "dG_ET* (kJ/mol): "+(dgET_A/1000).toFixed(2),
    ];
    if(B_enabled){
      const dgES_B=-R*T*Math.log(1/(+KmB.value||1));
      const dgET_B=-R*T*Math.log((+kcatB.value||1)/(+KmB.value||1));
      L.push("","MM Prot B @25C (E0=1.0 fixo)",
        "Km (mM): "+(+KmB.value).toFixed(4),
        "kcat (1/s): "+(+kcatB.value).toFixed(4),
        "Vmax (uM/s): "+(+kcatB.value*E0).toFixed(4),
        "dG_ES* (kJ/mol): "+(dgES_B/1000).toFixed(2),
        "dG_ET* (kJ/mol): "+(dgET_B/1000).toFixed(2));
    }
    diagPush(L);
  }
  
  

  function readTable(tb){
    const out=[]; tb.querySelectorAll("tr").forEach(tr=>{
      const t=Number(tr.children[0].textContent.trim());
      const k=Number(tr.children[1].textContent.trim());
      if(Number.isFinite(t)&&Number.isFinite(k)) out.push([toK(t),k]);
    }); return out;
  }
  
  // --- Util: Ea por Arrhenius a partir das tabelas (fallback se user não digitar) ---
function Ea_fromTables(tb){
  const dat = readTable(tb); if(!dat.length) return null;
  const x = dat.map(d=>1/d[0]), y = dat.map(d=>Math.log(d[1]));
  const lr = linreg(x,y); if(!lr) return null;
  const EaJ = -lr.m * R;               // J/mol
  const Tm  = mean(dat.map(d=>d[0]));  // K (média dos pontos)
  return {EaJ, Tm};
}

// --- Util: pacote ΔH‡, ΔS‡, ΔG‡, ΔG_ES, ΔG_ET a partir de Ea+kcat+Km em Tref ---
function thermo_from_Ea_kcat_Km(EaJ, kcat, Km_mM, TrefK){
  // Eyring: k = (kB T / h) * exp(ΔS‡/R) * exp(-ΔH‡/(R T))
  // Relações usadas: ΔH‡ = Ea - R T   ;   ΔS‡ = R[ ln k - ln(kB T/h) + ΔH‡/(R T) ]
  const dH = EaJ - R*TrefK; // J/mol
  const dS = R*( Math.log(kcat) - Math.log((kB*TrefK)/h) + (dH/(R*TrefK)) ); // J/mol/K
  const dG = dH - TrefK*dS; // J/mol

  // Pedagógico (mesmo estilo das versões anteriores):
  const Km_val = +Km_mM || 1e-9;                     // usa a escala digitada (mM)
  const dG_ES = -R*TrefK*Math.log(1/(Km_val));       // J/mol
  const dG_ET = -R*TrefK*Math.log( (kcat)/(Km_val) );// J/mol

  return {dH, dS, dG, dG_ES, dG_ET};
}

// --- Diag a partir de Ea (se preenchido) ---
function diagFromEa(){
  const TrefK = toK(+TrefInp.value || 25);
  // Prot A
  if(String(EaA.value).trim().length || !String(EaA.value).trim().length){
    // pega Ea A: prioridade ao campo; senão, tenta Arrhenius das tabelas
    let EaJ = null, Tm = null;
    if(String(EaA.value).trim().length){
      EaJ = (+EaA.value)*1000; // kJ/mol -> J/mol
      Tm  = TrefK;
    } else {
      const est = Ea_fromTables(TBA);
      if(est){ EaJ = est.EaJ; Tm = est.Tm; }
    }
    if(EaJ){
      const pack = thermo_from_Ea_kcat_Km(EaJ, +kcatA.value, +KmA.value, TrefK);
      const L = [
        "",
        "=== Parâmetros (Prot A) a partir de Ea/kcat/Km ===",
        "Tref (K): " + TrefK.toFixed(2),
        "Ea (kJ/mol): " + (EaJ/1000).toFixed(2) + (Tm?`   [ref: ${Tm.toFixed(2)} K]`:""),
        "ΔH* (kJ/mol): " + (pack.dH/1000).toFixed(2),
        "ΔS* (J/mol/K): " + (pack.dS).toFixed(2),
        "ΔG* (kJ/mol): " + (pack.dG/1000).toFixed(2),
        "ΔG_ES (kJ/mol): " + (pack.dG_ES/1000).toFixed(2) + "   (usa Km em mM, pedagógico)",
        "ΔG_ET (kJ/mol): " + (pack.dG_ET/1000).toFixed(2) + "   (usa kcat/Km com Km em mM)",
      ];
      diagPush(L);
    }
  }
  // Prot B (se habilitado)
  if(B_enabled){
    let EaJ = null, Tm = null;
    if(String(EaB.value).trim().length){
      EaJ = (+EaB.value)*1000;
      Tm  = TrefK;
    } else {
      const est = Ea_fromTables(TBB);
      if(est){ EaJ = est.EaJ; Tm = est.Tm; }
    }
    if(EaJ){
      const pack = thermo_from_Ea_kcat_Km(EaJ, +kcatB.value, +KmB.value, TrefK);
      const L = [
        "",
        "=== Parâmetros (Prot B) a partir de Ea/kcat/Km ===",
        "Tref (K): " + TrefK.toFixed(2),
        "Ea (kJ/mol): " + (EaJ/1000).toFixed(2) + (Tm?`   [ref: ${Tm.toFixed(2)} K]`:""),
        "ΔH* (kJ/mol): " + (pack.dH/1000).toFixed(2),
        "ΔS* (J/mol/K): " + (pack.dS).toFixed(2),
        "ΔG* (kJ/mol): " + (pack.dG/1000).toFixed(2),
        "ΔG_ES (kJ/mol): " + (pack.dG_ES/1000).toFixed(2) + "   (usa Km em mM, pedagógico)",
        "ΔG_ET (kJ/mol): " + (pack.dG_ET/1000).toFixed(2) + "   (usa kcat/Km com Km em mM)",
      ];
      diagPush(L);
    }
  }
}


  function plotEyring(){
    const A=readTable(TBA), Aname=nameA.value||"Prot A";
    function ey(dat){
      const x=dat.map(d=>1/d[0]);
      const y=dat.map(d=>Math.log((d[1]*h)/(kB*d[0])));
      const lr=linreg(x,y); if(!lr) return null;
      const dH = -lr.m*R;          // J/mol
      const dS =  lr.b*R;          // J/mol/K
      const Tm = mean(dat.map(d=>d[0]));
      const dG = dH - Tm*dS;       // J/mol
      const Ea = dH + R*Tm;        // J/mol
      return {x,y,lr,dH,dS,dG,Ea,Tm};
    }
    const EA=ey(A); EY_LR_A = EA?.lr || null;

    let data=[
      {x:EA.x,y:EA.y,mode:"markers",name:Aname},
      {x:range(Math.min(...EA.x),Math.max(...EA.x),80),
       y:range(Math.min(...EA.x),Math.max(...EA.x),80).map(xx=>EA.lr.m*xx+EA.lr.b),
       mode:"lines",name:Aname+" ajuste"}
    ];

    let lines=[
      "","Eyring",
      "Tbar (K): "+EA.Tm.toFixed(2),
      "dH* (kJ/mol): "+(EA.dH/1000).toFixed(2),
      "dS* (J/mol/K): "+(EA.dS).toFixed(2),
      "dG* (kJ/mol): "+(EA.dG/1000).toFixed(2),
      "Ea (kJ/mol): "+(EA.Ea/1000).toFixed(2)+"  (checagem: Ea = dH* + R*Tbar)"
    ];

    if(B_enabled){
      const B=readTable(TBB), Bname=nameB.value||"Prot B";
      const EB=ey(B); EY_LR_B = EB?.lr || null;
      const xl = range(Math.min(...EA.x,...EB.x), Math.max(...EA.x,...EB.x), 80);
      data=[
        {x:EA.x,y:EA.y,mode:"markers",name:Aname},
        {x:EB.x,y:EB.y,mode:"markers",name:Bname},
        {x:xl,y:xl.map(xx=>EA.lr.m*xx+EA.lr.b),mode:"lines",name:Aname+" ajuste"},
        {x:xl,y:xl.map(xx=>EB.lr.m*xx+EB.lr.b),mode:"lines",name:Bname+" ajuste"}
      ];
      lines.push("",
        "Eyring (Prot B)",
        "Tbar (K): "+EB.Tm.toFixed(2),
        "dH* (kJ/mol): "+(EB.dH/1000).toFixed(2),
        "dS* (J/mol/K): "+(EB.dS).toFixed(2),
        "dG* (kJ/mol): "+(EB.dG/1000).toFixed(2),
        "Ea (kJ/mol): "+(EB.Ea/1000).toFixed(2)+"  (checagem: Ea = dH* + R*Tbar)");
    }

    const layout={xaxis:{title:"1/T (K^-1)"},yaxis:{title:"ln(k*h/kB*T)"}, margin:{t:20,r:10,l:60,b:50}};
    Plotly.newPlot(C_EY.plot,data,layout,{displaylogo:false,responsive:true});
    setTimeout(()=>Plotly.Plots.resize(C_EY.plot),0);
    FIG_EY={data,layout};

    diagPush(lines);
  }

  function plotArrhenius(){
    const A=readTable(TBA), xA=A.map(d=>1/d[0]), yA=A.map(d=>Math.log(d[1]));
    const lA=linreg(xA,yA), Aname=nameA.value||"Prot A";
    let data=[
      {x:xA,y:yA,mode:"markers",name:Aname},
      {x:range(Math.min(...xA),Math.max(...xA),80), y:range(Math.min(...xA),Math.max(...xA),80).map(xx=>lA.m*xx+lA.b), mode:"lines",name:Aname+" ajuste"}
    ];
    const EaA = -lA.m*R;
    let lines=["","Arrhenius (kcat)", "Ea (kJ/mol): "+(EaA/1000).toFixed(2)];

    if(B_enabled){
      const B=readTable(TBB), xB=B.map(d=>1/d[0]), yB=B.map(d=>Math.log(d[1]));
      const lB=linreg(xB,yB), Bname=nameB.value||"Prot B";
      const xl=range(Math.min(...xA,...xB),Math.max(...xA,...xB),80);
      data=[
        {x:xA,y:yA,mode:"markers",name:Aname},
        {x:xB,y:yB,mode:"markers",name:Bname},
        {x:xl,y:xl.map(xx=>lA.m*xx+lA.b),mode:"lines",name:Aname+" ajuste"},
        {x:xl,y:xl.map(xx=>lB.m*xx+lB.b),mode:"lines",name:Bname+" ajuste"}
      ];
      const EaB = -lB.m*R;
      lines=["","Arrhenius (kcat)",
        "Ea Prot A (kJ/mol): "+(EaA/1000).toFixed(2),
        "Ea Prot B (kJ/mol): "+(EaB/1000).toFixed(2)];
    }

    const layout={xaxis:{title:"1/T (K^-1)"},yaxis:{title:"ln k"}, margin:{t:20,r:10,l:60,b:50}};
    Plotly.newPlot(C_AR.plot,data,layout,{displaylogo:false,responsive:true});
    setTimeout(()=>Plotly.Plots.resize(C_AR.plot),0);
    FIG_AR={data,layout};

    diagPush(lines);
  }

  function kcatFromEyring(lr, T){
    if(!lr) return null;
    return (kB*T/h) * Math.exp(lr.m*(1/T) + lr.b);
  }

  function kd_twoPoint(TK,T1C,kd1,T2C,kd2){
    const x=[1/toK(T1C),1/toK(T2C)], y=[Math.log(kd1),Math.log(kd2)];
    const lr=linreg(x,y); if(!lr) return kd1; const lnA=lr.b, m=lr.m; return Math.exp(lnA+m*(1/TK));
  }

  function plotKD(){
    const TlistC = [20,30,40,50,60,70,80];
    const usingLink = !!linkChk.checked;
    const k1 = Number(k1Input.value)||1e8;
    const KmA_M = (+KmA.value)/1000, KmB_M=(+KmB.value)/1000;

    function curv_link(lr, Km_M){
      return TlistC.map(Tc=>{
        const TK = toK(Tc);
        const kcatT = kcatFromEyring(lr, TK) ?? (+kcatA.value);
        const kd_s = Math.max(k1*Km_M - kcatT, 1e-9);
        const t12_min = (Math.log(2)/kd_s)/60;
        return {Tc, TK, t12:t12_min};
      });
    }
    function curv_free(col){
      const T=TlistC;
      const kd = (Number(col.T2.value)
        ? T.map(t=>kd_twoPoint(toK(t), +col.Tref.value, +col.kd1.value, +col.T2.value, +col.kd2.value))
        : T.map(()=>+col.kd1.value));
      const t12=kd.map(k=>Math.log(2)/k);
      return {T,t12};
    }

    let data=[];
    if(usingLink){
      const Apts = curv_link(EY_LR_A, KmA_M);
      data.push({x:Apts.map(p=>p.TK), y:Apts.map(p=>p.t12), mode:"lines+markers", name:(nameA.value||"Prot A")+" (linkado)"});
      if(B_enabled){
        const Bpts = curv_link(EY_LR_B, KmB_M);
        data.push({x:Bpts.map(p=>p.TK), y:Bpts.map(p=>p.t12), mode:"lines+markers", name:(nameB.value||"Prot B")+" (linkado)"});
      }
    } else {
      const A=curv_free(KDA);
      data.push({x:A.T.map(toK),y:A.t12,mode:"lines+markers",name:(nameA.value||"Prot A")});
      if(B_enabled){
        const B=curv_free(KDB);
        data.push({x:B.T.map(toK),y:B.t12,mode:"lines+markers",name:(nameB.value||"Prot B")});
      }
    }

    const layout={xaxis:{title:"T (K)"},yaxis:{title:"t1/2 (min)"}, margin:{t:20,r:10,l:60,b:50}};
    Plotly.newPlot(C_KD.plot,data,layout,{displaylogo:false,responsive:true});
    setTimeout(()=>Plotly.Plots.resize(C_KD.plot),0);
    FIG_KD={data,layout};

    if(usingLink){
      diagPush(["","t1/2 (linkado): assumindo k1 = "+(k1.toExponential(2))+" 1/M/s e kd(T) ≈ k1*Km - kcat(T).",
                "Nota: modelo didático; kd aqui não é a desativação térmica."]);
    }
  }

  // ===== ajuste MM (LM) =====
  function MM_model(x, Km, kcat){ const Vmax=kcat*E0; return (Vmax*x)/(Km+x); }
  function fitMM(points){
    if(!points.length) return null;
    const xs=points.map(p=>+p.x), ys=points.map(p=>+p.y);

    const vmaxGuess = Math.max(...ys);
    let Km = 0.2;
    const half = 0.5*vmaxGuess;
    for(const p of points){ if(p.y>=half){ Km = Math.max(1e-6, +p.x); break; } }
    let kcat = Math.max(1e-6, vmaxGuess/E0);

    let lam = 1e-2, SSEprev = Infinity;
    for(let it=0; it<120; it++){
      let J11=0,J12=0,J22=0, g1=0,g2=0, SSE=0;
      for(let i=0;i<xs.length;i++){
        const x=xs[i], y=ys[i];
        const denom=(Km+x);
        const f = (kcat*E0*x)/denom;
        const r = y - f; SSE += r*r;
        const dfdKm   = -(kcat*E0*x)/(denom*denom);
        const dfdkcat =  (E0*x)/denom;
        J11 += dfdKm*dfdKm;       J22 += dfdkcat*dfdkcat;
        J12 += dfdKm*dfdkcat;
        g1  += dfdKm*r;           g2  += dfdkcat*r;
      }
      const a11=J11+lam, a12=J12, a22=J22+lam;
      const det=a11*a22 - a12*a12 || 1e-12;
      const dKm   = ( g1*a22 - g2*a12)/det;
      const dkcat = (-g1*a12 + g2*a11)/det;

      const Km_new   = Math.max(1e-6, Km   + dKm);
      const kcat_new = Math.max(1e-6, kcat + dkcat);

      let SSEnew=0;
      for(let i=0;i<xs.length;i++){
        const x=xs[i], y=ys[i];
        const f = (kcat_new*E0*x)/(Km_new+x);
        const r = y - f; SSEnew += r*r;
      }
      if(SSEnew < SSEprev - 1e-12){ Km = Km_new; kcat = kcat_new; SSEprev = SSEnew; lam *= 0.33; }
      else { lam *= 10; }
      if(Math.abs(dKm)+Math.abs(dkcat) < 1e-8) break;
    }
    return {Km, Vmax:kcat*E0, kcat};
  }
  function doMMfit(){
    const fA=fitMM(parseExpMM(mmAexp.value));
    if(fA){ kcatA.value=(fA.kcat).toFixed(4); KmA.value=fA.Km.toFixed(5); }
    if(B_enabled){
      const fB=fitMM(parseExpMM(mmBexp.value));
      if(fB){ kcatB.value=(fB.kcat).toFixed(4); KmB.value=fB.Km.toFixed(5); }
    }
    diagClear(); plotMM(); 
      diagFromEa();   // <--- NOVO
      diagFlush();
  }

  // ===== CSV =====
  function tableToStr(tb){
    return Array.from(tb.querySelectorAll("tr")).map(tr=>{
      const t=tr.children[0].textContent.trim(), k=tr.children[1].textContent.trim(); return t+":"+k;
    }).join("|");
  }
  function stateToCSV(){
    const kv=[]; const Psh=(k,v)=>kv.push(k+","+v);
    Psh("A_name",nameA.value); Psh("A_kcat",kcatA.value); Psh("A_Km",KmA.value);
    if(B_enabled){ Psh("B_name",nameB.value); Psh("B_kcat",kcatB.value); Psh("B_Km",KmB.value); }
    Psh("MM_range",mmS.value);
    Psh("MM_A_exp",mmAexp.value.replace(/;/g,"|"));
    if(B_enabled) Psh("MM_B_exp",mmBexp.value.replace(/;/g,"|"));
    Psh("EYR_A",tableToStr(TBA));
    if(B_enabled) Psh("EYR_B",tableToStr(TBB));
    Psh("KD_A", KDA.Tref.value+":"+KDA.kd1.value+"|"+KDA.T2.value+":"+KDA.kd2.value);
    if(B_enabled) Psh("KD_B", KDB.Tref.value+":"+KDB.kd1.value+"|"+KDB.T2.value+":"+KDB.kd2.value);
    return "key,value\n"+kv.join("\n");
  }
  function applyCSV(text){
    const map={}; text.split(/\r?\n/).slice(1).forEach(line=>{
      const i=line.indexOf(","); if(i>0){ map[line.slice(0,i)] = line.slice(i+1); }
    });
    if(map.A_name) nameA.value=map.A_name;
    if(map.A_kcat) kcatA.value=map.A_kcat;
    if(map.A_Km)   KmA.value=map.A_Km;

    if(map.B_name || map.B_kcat || map.B_Km){
      colB.style.display="block"; B_enabled=true; bAddB.style.display="none"; bHideB.style.display="inline-block"; syncBVisibility();
      if(map.B_name) nameB.value=map.B_name;
      if(map.B_kcat) kcatB.value=map.B_kcat;
      if(map.B_Km)   KmB.value=map.B_Km;
    }

    if(map.MM_range) mmS.value=map.MM_range;
    if(map.MM_A_exp) mmAexp.value=map.MM_A_exp.replace(/\|/g,";");
    if(map.MM_B_exp){ mmBexp.value=map.MM_B_exp.replace(/\|/g,";"); B_enabled=true; colB.style.display="block"; bAddB.style.display="none"; bHideB.style.display="inline-block"; }

    if(map.EYR_A){
      const rows=map.EYR_A.split("|").map(s=>s.split(":"));
      const tb=TBA; tb.innerHTML="";
      rows.forEach(([t,k])=>{
        const tr=document.createElement("tr");
        const td1=document.createElement("td"); td1.contentEditable="true"; td1.textContent=t;
        const td2=document.createElement("td"); td2.contentEditable="true"; td2.textContent=k;
        tr.append(td1,td2); tb.appendChild(tr);
      });
    }
    if(map.EYR_B){
      const rows=map.EYR_B.split("|").map(s=>s.split(":"));
      const tb=TBB; tb.parentElement.style.display="block"; B_enabled=true; colB.style.display="block"; bAddB.style.display="none"; bHideB.style.display="inline-block";
      tb.innerHTML="";
      rows.forEach(([t,k])=>{
        const tr=document.createElement("tr");
        const td1=document.createElement("td"); td1.contentEditable="true"; td1.textContent=t;
        const td2=document.createElement("td"); td2.contentEditable="true"; td2.textContent=k;
        tr.append(td1,td2); tb.appendChild(tr);
      });
    }
    if(map.KD_A){
      const [p1,p2]=map.KD_A.split("|"); if(p1){const [t,k]=p1.split(":"); KDA.Tref.value=t; KDA.kd1.value=k;} if(p2){const [t,k]=p2.split(":"); KDA.T2.value=t; KDA.kd2.value=k;}
    }
    if(map.KD_B){
      const [p1,p2]=map.KD_B.split("|"); kdColB.style.display="block"; B_enabled=true; colB.style.display="block"; bAddB.style.display="none"; bHideB.style.display="inline-block";
      if(p1){const [t,k]=p1.split(":"); KDB.Tref.value=t; KDB.kd1.value=k;} if(p2){const [t,k]=p2.split(":"); KDB.T2.value=t; KDB.kd2.value=k;}
    }
    plotAll();
  }
  bCSV.onclick = ()=>{
    const blob=new Blob([stateToCSV()],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="ThermoStab_Toolkit.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  // ===== Export HTML (DOM) =====
  function exportHTML(){
    const diagTxt = Array.from(D.body.querySelectorAll("pre")).map(p=>p.textContent).join("\n\n");
    const figMM = FIG_MM ? JSON.parse(JSON.stringify(FIG_MM)) : null;
    const figEY = FIG_EY ? JSON.parse(JSON.stringify(FIG_EY)) : null;
    const figAR = FIG_AR ? JSON.parse(JSON.stringify(FIG_AR)) : null;
    const figKD = FIG_KD ? JSON.parse(JSON.stringify(FIG_KD)) : null;

    const w = window.open(""); const doc = w.document;
    doc.open(); doc.write("<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"); doc.close();
    doc.title = "ThermoStab-Toolkit";

    const style = doc.createElement("style");
    style.textContent = "body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#ffffff;color:#0b1220;margin:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:1100px){.grid{grid-template-columns:1fr}}.card{background:#fff;border:1px solid #c9d4ee;border-radius:12px;padding:10px}.card h2{font-size:16px;margin:0 0 6px 0}pre{white-space:pre-wrap;background:#fbfdff;border:1px dashed #c9d4ee;border-radius:10px;padding:8px}";
    doc.head.appendChild(style);

    const h1=doc.createElement("h1"); h1.textContent="ThermoStab-Toolkit (export)"; doc.body.appendChild(h1);
    const grid=doc.createElement("div"); grid.className="grid"; doc.body.appendChild(grid);

    function addCard(title,id){
      const card=doc.createElement("div"); card.className="card";
      const h2=doc.createElement("h2"); h2.textContent=title;
      const d=doc.createElement("div"); d.id=id; card.appendChild(h2); card.appendChild(d); grid.appendChild(card);
    }
    addCard("Michaelis-Menten","mm"); addCard("Eyring: ln(k*h/kB*T) vs 1/T","ey"); addCard("Arrhenius: ln k vs 1/T","ar"); addCard("Meia-vida t1/2 vs T","kd");

    const h2=doc.createElement("h2"); h2.textContent="Diagnostico"; doc.body.appendChild(h2);
    const pre=doc.createElement("pre"); pre.textContent=diagTxt; doc.body.appendChild(pre);

    const s=doc.createElement("script");
    s.src="https://cdn.plot.ly/plotly-2.35.2.min.js";
    s.onload=()=>{
      const P=w.Plotly;
      if(figMM) P.newPlot(doc.getElementById("mm"), figMM.data, figMM.layout, {displaylogo:false});
      if(figEY) P.newPlot(doc.getElementById("ey"), figEY.data, figEY.layout, {displaylogo:false});
      if(figAR) P.newPlot(doc.getElementById("ar"), figAR.data, figAR.layout, {displaylogo:false});
      if(figKD) P.newPlot(doc.getElementById("kd"), figKD.data, figKD.layout, {displaylogo:false});
    };
    doc.head.appendChild(s);
  }
  bHTML.onclick=exportHTML;

  // ===== reset =====
  function randIn(a,b){ return a + Math.random()*(b-a); }
  function jitter(x,rel){ return x*(1+rel*(Math.random()*2-1)); }
  function doRESET(){
    kcatA.value = randIn(4,18).toFixed(2);
    KmA.value   = randIn(0.03,0.40).toFixed(3);
    if(B_enabled){
      kcatB.value = randIn(4,18).toFixed(2);
      KmB.value   = randIn(0.03,0.40).toFixed(3);
    }
    function fillEY(tb, kcatBase){
      const temps = [15,25,35,45];
      tb.innerHTML="";
      temps.forEach((tC,i)=>{
        const base = kcatBase * (0.55 + 0.18*i);
        const val  = jitter(base, 0.12);
        const tr=document.createElement("tr");
        const td1=document.createElement("td"); td1.contentEditable="true"; td1.textContent=String(tC);
        const td2=document.createElement("td"); td2.contentEditable="true"; td2.textContent=String(Math.max(val,0.01).toFixed(3));
        tr.append(td1,td2); tb.appendChild(tr);
      });
    }
    fillEY(TBA, +kcatA.value);
    if(B_enabled){ fillEY(TBB, +kcatB.value); }

    function resetKD(col){
      col.Tref.value = 60;
      col.kd1.value  = randIn(0.010,0.040).toFixed(4);
      col.T2.value   = 50;
      const scale    = randIn(0.09,0.18);
      col.kd2.value  = (col.kd1.value * scale).toFixed(4);
    }
    resetKD(KDA);
    if(B_enabled){ resetKD(KDB); }

    mmS.value = "0, 1.0";
    const seedA = [+KmA.value,+kcatA.value];
    const Svals = [0.04,0.08,0.12,0.20,0.50,1.0];
    mmAexp.value = Svals.map(s=>{
      const v = (seedA[1]*E0*s)/(seedA[0]+s);
      return `${s.toFixed(2)},${jitter(v,0.15).toFixed(3)}`;
    }).join("; ");
    if(B_enabled){
      const seedB = [+KmB.value,+kcatB.value];
      mmBexp.value = Svals.map(s=>{
        const v = (seedB[1]*E0*s)/(seedB[0]+s);
        return `${s.toFixed(2)},${jitter(v,0.15).toFixed(3)}`;
      }).join("; ");
    }

    plotAll();
  }
  bReset.onclick=doRESET;

  // ===== wires (botões individuais limpam/mostram) =====
  bMM.onclick = ()=>{ diagClear(); plotMM(); diagFlush(); };
  bMMfit.onclick = doMMfit;
  bEY.onclick = ()=>{ diagClear(); plotEyring(); 
    diagFromEa();   // <--- NOVO
    diagFlush(); };
  bARfromEY.onclick = ()=>{ diagClear(); plotArrhenius();
    diagFromEa();   // <--- NOVO
    diagFlush(); };
  bKD.onclick = ()=>{ diagClear(); plotKD(); 
    diagFromEa();   // <--- NOVO
    diagFlush(); };

  function plotAll(){ syncBVisibility(); diagClear(); plotMM(); plotEyring(); plotArrhenius(); plotKD(); 
    diagFromEa();     // <--- NOVO
    diagFlush(); }

  // resize responsivo
  window.addEventListener('resize', ()=>{
    [C_MM.plot, C_EY.plot, C_AR.plot, C_KD.plot].forEach(p=>{
      try{ Plotly.Plots.resize(p); }catch(_){}
    });
  });

  // inicial
  plotAll();
})();