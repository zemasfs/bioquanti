/* EK-Toolkit v13 — CSV + Load (PT-BR)
   - Exporta CSV (separador ';', decimal vírgula) com MM/LB/Replot + ajustes + Ki
   - Importa CSV exportado e reconstrói os 3 gráficos e Diagnóstico
   - Mantém Dixon robusto, LaTeX, anotações editáveis, legenda única, modais arrastáveis
*/

(function(){
  // ---------- helpers ----------
  function el(t,c,p,h){const e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; if(p)p.appendChild(e); return e;}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const linspace=(a,b,n)=>{const r=[],s=(b-a)/Math.max(1,n-1); for(let i=0;i<n;i++) r.push(a+i*s); return r;};
  function randn(){const u=1-Math.random(),v=1-Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
  const addNoise=(y,rel)=>rel<=0?y.slice():y.map(v=>v+v*rel*randn());
  const minmax=a=>{let mn=Infinity,mx=-Infinity; for(const v of a){ if(v<mn) mn=v; if(v>mx) mx=v; } return (!isFinite(mn)||!isFinite(mx))?{min:0,max:1}:{min:mn,max:mx};};
  const clone=o=>Object.assign({},o);

  // WLS 1/y^2 (LB e replot slope/intercept)
  function wlsFit_1_over_y2(x,y){let sw=0,sx=0,sy=0,sxx=0,sxy=0,used=0;
    for(let i=0;i<x.length;i++){const yi=y[i]; if(!isFinite(yi)||Math.abs(yi)<1e-12) continue; const w=1/(yi*yi); sw+=w; sx+=w*x[i]; sy+=w*y[i]; sxx+=w*x[i]*x[i]; sxy+=w*x[i]*y[i]; used++; }
    const D=sw*sxx - sx*sx; if(Math.abs(D)<1e-12||used<2) return {ok:false,a:0,b:0,r2:0};
    const b=(sw*sxy - sx*sy)/D, a=(sy - b*sx)/sw, ym=sy/sw;
    let ssT=0, ssR=0; for(let i=0;i<x.length;i++){const yi=y[i]; if(!isFinite(yi)||Math.abs(yi)<1e-12) continue; const w=1/(yi*yi), f=a+b*x[i]; ssR+=w*(yi-f)*(yi-f); ssT+=w*(yi-ym)*(yi-ym); }
    return {ok:true,a,b,r2:(ssT>0?1-ssR/ssT:0)};
  }
  // OLS (Dixon)
  function olsFit(x,y){const n=Math.min(x.length,y.length); if(n<2) return {ok:false,a:0,b:0,r2:0};
    let sx=0,sy=0,sxx=0,sxy=0,c=0; for(let i=0;i<n;i++){const xi=+x[i], yi=+y[i]; if(!isFinite(xi)||!isFinite(yi)) continue; sx+=xi; sy+=yi; sxx+=xi*xi; sxy+=xi*yi; c++; }
    const D=c*sxx - sx*sx; if(Math.abs(D)<1e-12) return {ok:false,a:0,b:0,r2:0};
    const b=(c*sxy - sx*sy)/D, a=(sy - b*sx)/c;
    let ssT=0, ssR=0, ym=sy/c; for(let i=0;i<n;i++){const f=a+b*x[i]; ssT+=(y[i]-ym)*(y[i]-ym); ssR+=(y[i]-f)*(y[i]-f);}
    return {ok:true,a,b,r2:(ssT>0?1-ssR/ssT:0)};
  }
  const vLine=()=>({type:"line",xref:"x",yref:"paper",x0:0,x1:0,y0:0,y1:1,line:{color:"#333",width:1}});
  const hLine=()=>({type:"line",xref:"paper",yref:"y",x0:0,x1:1,y0:0,y1:0,line:{color:"#333",width:1}});
  function ensureMathJax(cb){ if(window.MathJax&&window.MathJax.typeset){cb();return;} const s=el("script","",document.head); s.src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"; s.onload=()=>setTimeout(cb,60); }
  function download(name,txt){const b=new Blob([txt],{type:"text/html"}),a=el("a","",document.body); a.href=URL.createObjectURL(b); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800); a.remove();}
  function downloadTxt(name,txt){const b=new Blob([txt],{type:"text/csv;charset=utf-8"}),a=el("a","",document.body); a.href=URL.createObjectURL(b); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),800); a.remove();}
  const fmtNumBR=n=> (Number.isFinite(n)? (Math.abs(n)<1e-15? "0": String(Number(n)).replace('.',',') ) : "");
  const joinBR=arr=> arr.join(';');

  // ---------- paletas ----------
  const PA=["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd"];
  const PB=["#17becf","#bcbd22","#8c564b","#e377c2","#7f7f7f"];
  const colorFor=(tag,i)=>(tag==="A"?PA:PB)[i%5];

  // ---------- modelos ----------
  const Models={
    "Michaelis-Menten":{group:"Geral",latex:"v = \\dfrac{V_{max}S}{K_m+S}",plain:"v = (Vmax*S)/(Km+S)",params:["Km","Vmax"],evalv:(p,S)=>(p.Vmax*S)/(p.Km+S),def:{Km:2,Vmax:10}},
    "Excesso de Substrato":{group:"Geral",latex:"v = \\dfrac{V_{max}S}{K_m+S+\\dfrac{S^2}{K_{is}}}",plain:"v = (Vmax*S)/(Km+S+S^2/Kis)",params:["Km","Vmax","Kis"],evalv:(p,S)=>(p.Vmax*S)/(p.Km+S+(S*S)/(p.Kis||1e9)),def:{Km:2,Vmax:10,Kis:20}},
    "Inibicao Irreversivel":{group:"Geral",latex:"v = \\dfrac{V_{max}(1-f)S}{K_m+S}",plain:"v = (Vmax*(1-f))*S/(Km+S)",params:["Km","Vmax","f"],evalv:(p,S)=> (p.Vmax*(1-Math.max(0,Math.min(0.99,p.f||0))))*S/(p.Km+S),def:{Km:2,Vmax:10,f:0.3}},
    "Competitiva":{group:"Inibidores",latex:"v = \\dfrac{V_{max}S}{K_m(1+I/K_i)+S}",plain:"v = Vmax*S/(Km*(1+I/Ki)+S)",params:["Km","Vmax","Ki","I"],evalv:(p,S)=>{const a=p.Km*(1+(p.I||0)/(p.Ki||1e-9)); return (p.Vmax*S)/(a+S);},def:{Km:2,Vmax:10,Ki:5,I:0}},
    "Nao-competitiva (pura)":{group:"Inibidores",latex:"v = \\dfrac{V_{max}}{1+I/K_i}\\cdot\\dfrac{S}{K_m+S}",plain:"v = (Vmax/(1+I/Ki))*S/(Km+S)",params:["Km","Vmax","Ki","I"],evalv:(p,S)=>{const f=1+(p.I||0)/(p.Ki||1e-9); return (p.Vmax/f)*S/(p.Km+S);},def:{Km:2,Vmax:10,Ki:5,I:0}},
    "Mista":{group:"Inibidores",latex:"v = \\dfrac{V_{max}}{1+I/K_{i2}}\\cdot\\dfrac{S}{K_m(1+I/K_{i1})+S}",plain:"v = (Vmax/(1+I/Ki2))*S/(Km*(1+I/Ki1)+S)",params:["Km","Vmax","Ki1","Ki2","I"],evalv:(p,S)=>{const f1=p.Km*(1+(p.I||0)/(p.Ki1||1e-9)); const f2=p.Vmax/(1+(p.I||0)/(p.Ki2||1e-9)); return (f2*S)/(f1+S);},def:{Km:2,Vmax:10,Ki1:5,Ki2:8,I:0}},
    "Incompetitiva":{group:"Inibidores",latex:"v = \\dfrac{V_{max}S}{K_m + S(1+I/K_i)}",plain:"v = Vmax*S/(Km + S*(1+I/Ki))",params:["Km","Vmax","Ki","I"],evalv:(p,S)=>{const a=p.Km+S*(1+(p.I||0)/(p.Ki||1e-9)); return p.Vmax*S/a;},def:{Km:2,Vmax:10,Ki:5,I:0}},
    "BiBi Random Seq":{group:"Bi-Substrato",latex:"v = \\dfrac{V_{max}AB}{K_aK_b+K_aB+K_bA+AB}",plain:"v = Vmax*A*B/(Ka*Kb + Ka*B + Kb*A + A*B)",params:["Vmax","Ka","Kb","Aconst","Bconst","scanSub"],evalv:(p,S)=>{const A=p.scanSub==="A"?S:(p.Aconst||2), B=p.scanSub==="B"?S:(p.Bconst||2); return p.Vmax*A*B/(p.Ka*p.Kb+p.Ka*B+p.Kb*A+A*B);},def:{Vmax:10,Ka:2,Kb:3,Aconst:2,Bconst:2,scanSub:"A"}},
    "BiBi Ordered Seq":{group:"Bi-Substrato",latex:"v = \\dfrac{V_{max}AB}{K_aK_b + K_bA + AB}",plain:"v = Vmax*A*B/(Ka*Kb + Kb*A + A*B)",params:["Vmax","Ka","Kb","Aconst","Bconst","scanSub"],evalv:(p,S)=>{const A=p.scanSub==="A"?S:(p.Aconst||2), B=p.scanSub==="B"?S:(p.Bconst||2); return p.Vmax*A*B/(p.Ka*p.Kb+p.Kb*A+A*B);},def:{Vmax:10,Ka:2,Kb:3,Aconst:2,Bconst:2,scanSub:"A"}},
    "BiBi Ping-Pong":{group:"Bi-Substrato",latex:"v = \\dfrac{V_{max}AB}{K_bA + K_aB + AB}",plain:"v = Vmax*A*B/(Kb*A + Ka*B + A*B)",params:["Vmax","Ka","Kb","Aconst","Bconst","scanSub"],evalv:(p,S)=>{const A=p.scanSub==="A"?S:(p.Aconst||2), B=p.scanSub==="B"?S:(p.Bconst||2); return p.Vmax*A*B/(p.Kb*A+p.Ka*B+A*B);},def:{Vmax:10,Ka:2,Kb:3,Aconst:2,Bconst:2,scanSub:"A"}},
    "Hill (cooperatividade)":{group:"Multisito",latex:"v = \\dfrac{V_{max}S^n}{K^n+S^n}",plain:"v = Vmax*S^n/(K^n + S^n)",params:["Vmax","K","nH"],evalv:(p,S)=>{const n=p.nH||1, Sn=Math.pow(S,n), Kn=Math.pow(p.K||2,n); return p.Vmax*Sn/(Kn+Sn);},def:{Vmax:10,K:2,nH:1}},
    "Ativador (Vmax-up)":{group:"Multisito",latex:"v = \\dfrac{V_{max}(1+A/K_{aA})S}{K_m+S}",plain:"v = (Vmax*(1+A/KaA))*S/(Km+S)",params:["Km","Vmax","KaA","A"],evalv:(p,S)=>{const f=1+(p.A||0)/(p.KaA||1e-9); return (p.Vmax*f)*S/(p.Km+S);},def:{Km:2,Vmax:10,KaA:5,A:0}},
    "User":{group:"User",latex:"v = f(S,\\,params)",plain:"v = f(S, params)",params:["equacao","paramNames","paramVals"],
      evalv:(p,S)=>{try{const names=(p.paramNames||"Km;Vmax").split(";").map(s=>s.trim()).filter(Boolean);
        const vals=(p.paramVals||"2;10").split(";").map(s=>parseFloat(s.trim().replace(',','.')));
        const argN=["S",...names]; if(!argN.includes("I")) argN.push("I"); if(!argN.includes("A")) argN.push("A");
        const F=Function.apply(null,[...argN, "return "+(p.equacao||"(Vmax*S)/(Km+S)")+";"]);
        const args=[S]; for(let j=0;j<names.length;j++) args.push(isFinite(vals[j])?vals[j]:0); if(argN.includes("I")) args.push(p.I||0); if(argN.includes("A")) args.push(p.A||0);
        const out=F.apply(null,args); return isFinite(out)?out:NaN; }catch(e){ return NaN; }},
      def:{equacao:"(Vmax*S)/(Km+S)",paramNames:"Km;Vmax",paramVals:"2;10"}}
  };

  // ---------- estado ----------
  const state={Smin:0.1,Smax:20,Npts:20,errRel:0.05,
    modelA:"Michaelis-Menten",modelB:null,paramsA:{},paramsB:{},
    modifierKind:"auto",modifierSeries:[0,1,2,5,10],
    replotMetric:"slope",replotXLabel:"Modificador (I ou A)",
    showLegend:false,compareAB:false,showNotes:false,
    csvMode:false, csvData:null // quando true, renderiza a partir do CSV importado
  };
  fillDef(state.paramsA,state.modelA);
  function fillDef(dst,name){const d=Models[name]?.def||{}; Object.keys(d).forEach(k=>dst[k]=d[k]);}
  function detectMod(name){
    if(!name) return (state.modifierKind==="A"?"A":"I");
    const m=Models[name]; if(!m||!m.params) return (state.modifierKind==="A"?"A":"I");
    if(state.modifierKind==="I") return "I"; if(state.modifierKind==="A") return "A";
    return m.params.includes("I")?"I":(m.params.includes("A")?"A":"I");
  }
  const pickThreeS=()=>{const a=state.Smin,b=state.Smax; return [a+0.2*(b-a), a+0.5*(b-a), a+0.8*(b-a)];};

  // ---------- UI ----------
  let host=document.getElementById("ek13-host"); if(!host){host=el("div","ek-host",document.body); host.id="ek13-host";}
  el("style","",document.head,
    ".ek-host{font-family:system-ui,Arial,sans-serif}.ek-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}"+
    ".ek-btn{padding:6px 10px;border:1px solid #ccc;border-radius:8px;background:#f7f7f7;cursor:pointer}"+
    ".ek-switch{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid #ccc;border-radius:999px;background:#fafafa}"+
    ".ek-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.ek-card{border:1px solid #ddd;border-radius:10px;padding:6px;background:#fff;min-height:300px}.ek-title{font-weight:bold;margin-bottom:4px}"+
    ".ek-modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:none;align-items:center;justify-content:center;z-index:9999}"+
    ".ek-panel{background:#fff;max-width:1100px;width:95%;max-height:85vh;overflow:auto;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18)}"+
    ".ek-panel .cap{cursor:move;user-select:none;padding:12px 12px 0 12px;font-weight:600} .ek-panel .body{padding:8px 12px} .ek-panel .foot{padding:8px 12px}"+
    ".ek-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.ek-tab{padding:4px 8px;border:1px solid #ccc;border-radius:999px;cursor:pointer}.ek-tab.active{background:#222;color:#fff;border-color:#222}"+
    ".ek-field label{font-size:12px;color:#333}.ek-field input,.ek-field select{width:100%;padding:6px;border:1px solid #ccc;border-radius:6px}.ek-cols2{display:grid;grid-template-columns:1fr 1fr;gap:10px}"
  );

  const bar=el("div","ek-bar",host);
  const bModel=el("button","ek-btn",bar,"Modelos");
  const bParams=el("button","ek-btn",bar,"Parametros");
  const bEq=el("button","ek-btn",bar,"Equações");
  const bDiag=el("button","ek-btn",bar,"Diagnóstico");
  const bExport=el("button","ek-btn",bar,"Exportar HTML");
  const bCSV=el("button","ek-btn",bar,"CSV");
  const bLoad=el("button","ek-btn",bar,"Load");
  const bClear=el("button","ek-btn",bar,"Limpar CSV"); bClear.style.display="none";

  const sw=el("label","ek-switch",bar); sw.innerHTML='<input id="ek-cmp" type="checkbox"/> <span>Comparar A/B</span>';
  sw.querySelector("input").onchange=function(){state.compareAB=this.checked; if(state.compareAB&&!state.modelB){state.modelB="Competitiva";state.paramsB={};fillDef(state.paramsB,state.modelB);} if(!state.compareAB){state.modelB=null;state.paramsB={};} renderAll();};

  const selMetric=el("select","",bar); [{v:"slope",t:"Replot: slope (LB)"},{v:"intercept",t:"Replot: intercept (LB)"},{v:"invV",t:"Replot: 1/v (Dixon)"}].forEach(o=>{const op=el("option","",selMetric,o.t); op.value=o.v;});
  selMetric.onchange=function(){state.replotMetric=this.value; renderAll();};

  const bXLab=el("button","ek-btn",bar,"Eixo X: "+state.replotXLabel); bXLab.onclick=function(){const nv=prompt("Rótulo do eixo X do Replot:",state.replotXLabel); if(nv){state.replotXLabel=nv; bXLab.textContent="Eixo X: "+nv; renderAll();}};
  const bLegend=el("button","ek-btn",bar,"Legenda: OFF"); bLegend.onclick=function(){state.showLegend=!state.showLegend; bLegend.textContent="Legenda: "+(state.showLegend?"ON":"OFF"); renderAll();};
  const bNotes=el("button","ek-btn",bar,"Anotações: OFF"); bNotes.onclick=function(){state.showNotes=!state.showNotes; bNotes.textContent="Anotações: "+(state.showNotes?"ON":"OFF"); renderAll();};

  const grid=el("div","ek-grid3",host);
  const c1=el("div","ek-card",grid); el("div","ek-title",c1,"v vs [S]"); const g1=el("div","",c1);
  const c2=el("div","ek-card",grid); el("div","ek-title",c2,"Lineweaver–Burk"); const g2=el("div","",c2);
  const c3=el("div","ek-card",grid); el("div","ek-title",c3,"Replot"); const g3=el("div","",c3);

  // modal (arrastável)
  const modal=el("div","ek-modal",document.body);
  const panel=el("div","ek-panel",modal);
  const cap=el("div","cap",panel,"");
  const body=el("div","body",panel,"");
  const foot=el("div","foot",panel,""); const closeBtn=el("button","ek-btn",foot,"Fechar"); closeBtn.onclick=()=>modal.style.display="none";
  function makeDraggable(handle,container){
    let ox=0, oy=0, dragging=false, sx=0, sy=0;
    handle.addEventListener("pointerdown",e=>{dragging=true; sx=e.clientX; sy=e.clientY; const r=container.getBoundingClientRect(); ox=r.left; oy=r.top; container.style.position="fixed"; container.style.left=ox+"px"; container.style.top=oy+"px"; container.setPointerCapture(e.pointerId);});
    handle.addEventListener("pointermove",e=>{ if(!dragging) return; container.style.left=(ox+(e.clientX-sx))+"px"; container.style.top=(oy+(e.clientY-sy))+"px";});
    handle.addEventListener("pointerup",()=>{dragging=false;});
  }
  makeDraggable(cap,panel);

  bModel.onclick=()=>openModel();
  bParams.onclick=()=>openParams();
  bEq.onclick=()=>openEq();
  bDiag.onclick=()=>openDiag();
  bExport.onclick=()=>exportHTML();
  bCSV.onclick=()=>exportCSV();
  bLoad.onclick=()=>triggerLoad();
  bClear.onclick=()=>{state.csvMode=false; state.csvData=null; bClear.style.display="none"; renderAll();};

  // ---------- cache para CSV ----------
  let datasetCache=null; // será preenchido no render

  // ---------- Modals ----------
  function openModel(){
    cap.textContent="Modelos e Equações (texto)";
    const groups=["Geral","Inibidores","Bi-Substrato","Multisito","User"];
    body.innerHTML='<div class="ek-tabs">'+groups.map(g=>`<span class="ek-tab" data-t="${g}">${g}</span>`).join("")+'</div><div id="ml"></div>';
    body.querySelectorAll(".ek-tab").forEach(t=>t.onclick=()=>load(t.dataset.t));
    function load(group){
      const lst=body.querySelector("#ml"); let out="";
      if(group==="User"){
        const p=state.paramsA.equacao?state.paramsA:Models.User.def;
        out+=`<div style="border:1px solid #eee;border-radius:8px;padding:8px;margin-bottom:8px;">
          <div style="font-weight:bold">User</div><div><code>v = f(S, params)</code></div>
          <div class="ek-field"><label>Equação</label><input id="ueq" value="${p.equacao||Models.User.def.equacao}"/></div>
          <div class="ek-cols2">
            <div class="ek-field"><label>Parâmetros (nomes;)</label><input id="un" value="${p.paramNames||Models.User.def.paramNames}"/></div>
            <div class="ek-field"><label>Valores (;)</label><input id="uv" value="${p.paramVals||Models.User.def.paramVals}"/></div>
          </div>
          <div style="margin-top:6px"><button class="ek-btn" id="setA">Usar como A</button> <button class="ek-btn" id="setB">Usar como B</button></div>
        </div>`;
        lst.innerHTML=out;
        lst.querySelector("#setA").onclick=()=>{state.modelA="User";state.paramsA={equacao:lst.querySelector("#ueq").value,paramNames:lst.querySelector("#un").value,paramVals:lst.querySelector("#uv").value}; modal.style.display="none"; renderAll();};
        lst.querySelector("#setB").onclick=()=>{state.modelB="User";state.paramsB={equacao:lst.querySelector("#ueq").value,paramNames:lst.querySelector("#un").value,paramVals:lst.querySelector("#uv").value}; state.compareAB=true; document.getElementById("ek-cmp").checked=true; modal.style.display="none"; renderAll();};
      } else {
        for(const k in Models){const m=Models[k]; if(m.group!==group) continue;
          out+=`<div style="border:1px solid #eee;border-radius:8px;padding:8px;margin-bottom:8px;">
            <div style="font-weight:bold">${k}</div><div class="ek-mini"><code>${m.plain}</code></div>
            <div style="margin-top:6px"><button class="ek-btn" data-k="${k}" data-as="A">Usar como A</button> <button class="ek-btn" data-k="${k}" data-as="B">Usar como B</button></div>
          </div>`;
        }
        lst.innerHTML=out;
        lst.querySelectorAll("button[data-k]").forEach(b=>b.onclick=()=>{
          const name=b.getAttribute("data-k"), as=b.getAttribute("data-as");
          if(as==="A"){state.modelA=name; state.paramsA={}; fillDef(state.paramsA,name);}
          else {state.modelB=name; state.paramsB={}; fillDef(state.paramsB,name); state.compareAB=true; document.getElementById("ek-cmp").checked=true;}
          modal.style.display="none"; renderAll();
        });
      }
      body.querySelectorAll(".ek-tab").forEach(t=>{t.classList.remove("active"); if(t.textContent===group) t.classList.add("active");});
    }
    load("Geral"); modal.style.display="flex";
  }

  function openParams(){
    cap.textContent="Parâmetros e Faixas";
    body.innerHTML='<div class="ek-tabs"><span class="ek-tab active" data-p="A">Modelo A</span><span class="ek-tab" data-p="B">Modelo B</span></div><div id="pb"></div>';
    body.querySelectorAll(".ek-tab").forEach(t=>t.onclick=()=>{body.querySelectorAll(".ek-tab").forEach(x=>x.classList.remove("active")); t.classList.add("active"); mount(t.dataset.p);});
    mount("A"); modal.style.display="flex";

    function mount(which){
      const modelName=which==="A"?state.modelA:state.modelB, m=modelName?Models[modelName]:null, p=which==="A"?state.paramsA:state.paramsB;
      let h='';
      h+=`<div class="ek-cols2"><div class="ek-field"><label>Smin</label><input id="Smin" value="${state.Smin}"/></div><div class="ek-field"><label>Smax</label><input id="Smax" value="${state.Smax}"/></div></div>`;
      h+=`<div class="ek-cols2"><div class="ek-field"><label>Npts</label><input id="Npts" value="${state.Npts}"/></div><div class="ek-field"><label>Erro relativo (0-0.5)</label><input id="errRel" value="${state.errRel}"/></div></div>`;
      h+=`<div class="ek-cols2"><div class="ek-field"><label>Modificadores (csv, 5)</label><input id="mods" value="${state.modifierSeries.join(",")}"/></div><div class="ek-field"><label>Tipo de modificador</label><select id="modk"><option value="auto">auto</option><option value="I">I</option><option value="A">A</option></select></div></div>`;
      if(m){
        h+='<div style="margin-top:8px;font-weight:bold">Parâmetros de '+modelName+'</div><div class="ek-cols2">';
        if(modelName==="User"){
          const equ=(p.equacao??Models.User.def.equacao), pnames=(p.paramNames??Models.User.def.paramNames), pvals=(p.paramVals??Models.User.def.paramVals);
          h+=`</div><div class="ek-field"><label>Equação</label><input id="ueq" value="${equ}"/></div><div class="ek-cols2"><div class="ek-field"><label>Parâmetros (nomes;)</label><input id="un" value="${pnames}"/></div><div class="ek-field"><label>Valores (;)</label><input id="uv" value="${pvals}"/></div></div>`;
        } else {
          for(const nm of m.params){const val=(p[nm]!=null)?p[nm]:(m.def[nm]??0);
            if(nm==="scanSub"){ h+=`<div class="ek-field"><label>scanSub</label><select id="scan"><option value="A"${val==="A"?' selected':''}>A</option><option value="B"${val==="B"?' selected':''}>B</option></select></div>`; }
            else { h+=`<div class="ek-field"><label>${nm}</label><input id="p_${nm}" value="${val}"/></div>`; }
          }
          h+='</div>';
        }
      } else { h+='<div>Selecione um modelo em "Modelos".</div>'; }
      body.querySelector("#pb").innerHTML=h;

      const bindCommon=b=>{
        b.querySelector("#Smin").onchange=b.querySelector("#Smin").onblur=function(){const v=parseFloat(this.value.replace(',','.')); if(isFinite(v)) state.Smin=v; renderAll();};
        b.querySelector("#Smax").onchange=b.querySelector("#Smax").onblur=function(){const v=parseFloat(this.value.replace(',','.')); if(isFinite(v)) state.Smax=v; renderAll();};
        b.querySelector("#Npts").onchange=b.querySelector("#Npts").onblur=function(){const v=parseFloat(this.value.replace(',','.')); if(isFinite(v)) state.Npts=Math.max(5,Math.round(v)); renderAll();};
        b.querySelector("#errRel").onchange=b.querySelector("#errRel").onblur=function(){const v=parseFloat(this.value.replace(',','.')); if(isFinite(v)) state.errRel=clamp(v,0,0.5); renderAll();};
        b.querySelector("#mods").onchange=b.querySelector("#mods").onblur=function(){const arr=this.value.split(",").map(s=>parseFloat(s.trim().replace(',','.'))).filter(Number.isFinite); if(arr.length>=2){state.modifierSeries=arr.slice(0,5); while(state.modifierSeries.length<5) state.modifierSeries.push(state.modifierSeries[state.modifierSeries.length-1]);} renderAll();};
        const mk=b.querySelector("#modk"); mk.value=state.modifierKind; mk.onchange=function(){state.modifierKind=this.value; renderAll();};
      };
      bindCommon(body.querySelector("#pb"));
      if(m){
        if(modelName==="User"){
          body.querySelector("#ueq").onchange=body.querySelector("#ueq").onblur=function(){p.equacao=this.value; renderAll();};
          body.querySelector("#un").onchange=body.querySelector("#un").onblur=function(){p.paramNames=this.value; renderAll();};
          body.querySelector("#uv").onchange=body.querySelector("#uv").onblur=function(){p.paramVals=this.value; renderAll();};
        } else {
          for(const nm of m.params){const node=body.querySelector("#p_"+nm)||body.querySelector("#scan"); if(!node) continue;
            node.onchange=node.onblur=function(){ if(nm==="scanSub"){ (which==="A"?state.paramsA:state.paramsB).scanSub=this.value; } else { const num=parseFloat(this.value.replace(',','.')); if(isFinite(num)) (which==="A"?state.paramsA:state.paramsB)[nm]=num; } renderAll(); };
          }
        }
      }
    }
  }

  function openEq(){
    cap.textContent="Equações (LaTeX) — Todas";
    const list=Object.keys(Models);
    body.innerHTML='<div class="ek-cols2">'+list.map(k=>`<div style="border:1px solid #eee;border-radius:8px;padding:8px;margin-bottom:8px;"><b>${k}</b><div>$$ ${Models[k].latex||""} $$</div><div style="font-size:12px;color:#666;margin-top:4px;"><code>${Models[k].plain}</code></div></div>`).join("")+'</div>';
    ensureMathJax(()=>window.MathJax?.typeset());
    modal.style.display="flex";
  }
  function openDiag(){ cap.textContent="Diagnóstico e Parâmetros"; body.innerHTML=lastFigs.diag+lastFigs.paramHTML; modal.style.display="flex"; }

  // ---------- motor ----------
  let lastFigs={diag:"",paramHTML:"",vS:null,LB:null,RP:null,kiA:null,kiB:null};
  function evalModel(name,p,S){const m=Models[name]; if(!m) return S.map(()=>NaN); return S.map(s=>{const v=m.evalv(p,s); return isFinite(v)?v:NaN;});}

  function renderAll(){
    if(state.csvMode && state.csvData){ return renderFromCSV(); }
    datasetCache={rows:[], meta:{}, ki:{A:null,B:null}};
    const S=linspace(state.Smin,state.Smax,state.Npts);
    const series=state.modifierSeries.slice(0,5); while(series.length<5) series.push(series[series.length-1]||0);
    const tracesV=[], tracesLB=[], annLB=[], xInts=[];
    const dashes=["solid","dot","dash","longdash","dashdot"];

    function addBundle(tag,name,base){
      if(!name) return; const mk=detectMod(name);
      for(let mindex=0;mindex<series.length;mindex++){
        const mod=+series[mindex]; const p=clone(base); if(mk==="I") p.I=mod; else p.A=mod;
        const color=colorFor(tag,mindex);
        const yN=addNoise(evalModel(name,p,S),state.errRel);
        // cache MM
        for(let i=0;i<S.length;i++){ datasetCache.rows.push({plot:"MM",tag,modelo:name,modificador:mod,S:S[i],v:yN[i],invS: (S[i]>0?1/S[i]:""),invV:(yN[i]>0?1/yN[i]:"")}); }
        tracesV.push({x:S,y:yN,mode:"markers",marker:{size:6,color},name:`${tag} ${mk}=${mod} pts`,showlegend:false});

        // LB pts + fit
        const xLB=[],yLB=[]; for(let i=0;i<S.length;i++){ if(S[i]>0 && yN[i]>0){xLB.push(1/S[i]); yLB.push(1/yN[i]);} }
        const fit=wlsFit_1_over_y2(xLB,yLB);
        for(let i=0;i<xLB.length;i++){ datasetCache.rows.push({plot:"LB",tag,modelo:name,modificador:mod,S:"",v:"",invS:xLB[i],invV:yLB[i]}); }
        if(fit.ok){
          datasetCache.rows.push({plot:"LB_fit",tag,modelo:name,modificador:mod,S:"",v:"",invS:fit.b,invV:fit.a, slope:fit.b, intercept:fit.a, r2:fit.r2});
          const Vmax=1/fit.a, Km=fit.b/fit.a, Sfine=linspace(state.Smin,state.Smax,120), curve=Sfine.map(s=>(Vmax*s)/(Km+s));
          tracesV.push({x:Sfine,y:curve,mode:"lines",line:{dash:dashes[mindex%5],width:(mindex===0?2:1),color},name:`${tag} ${mk}=${mod}`,showlegend:state.showLegend});
          const xi=Math.abs(fit.b)>1e-12?(-fit.a/fit.b):null; if(xi!=null) xInts.push(xi);
          const mm=minmax(xLB), x0=Math.min(0,mm.min,xi??mm.min), x1=Math.max(0,mm.max,xi??mm.max), xs=[x0,x1], ys=[fit.a+fit.b*x0, fit.a+fit.b*x1];
          tracesLB.push({x:xLB,y:yLB,mode:"markers",marker:{size:6,color},name:`${tag} ${mk}=${mod} pts`,showlegend:false});
          tracesLB.push({x:xs,y:ys,mode:"lines",line:{color},name:`${tag} ${mk}=${mod}`,showlegend:state.showLegend});
          if(state.showNotes) annLB.push({x:x1,y:ys[1],ax:0,ay:-20-6*mindex,showarrow:true,arrowhead:2,text:`a=${fit.a.toFixed(3)}, b=${fit.b.toFixed(3)}, r²=${fit.r2.toFixed(3)}${xi!=null?`, x₀=${xi.toFixed(3)}`:""}`});
        }
      }
    }
    addBundle("A",state.modelA,state.paramsA);
    if(state.modelB){ if(!state.paramsB||!Object.keys(state.paramsB).length) fillDef(state.paramsB,state.modelB); addBundle("B",state.modelB,state.paramsB); }

    Plotly.newPlot(g1,tracesV,{margin:{l:50,r:10,t:10,b:50},xaxis:{title:"[S]"},yaxis:{title:"v"},legend:{orientation:"h"}},{displaylogo:false});

    const poolX=[0]; tracesLB.forEach(t=>{if(t.x){const m=minmax(t.x); poolX.push(m.min,m.max);}}); xInts.forEach(v=>poolX.push(v));
    const M=minmax(poolX), pad=(M.max-M.min)*0.06||1;
    Plotly.newPlot(g2,tracesLB,{margin:{l:50,r:10,t:10,b:50},xaxis:{title:"1/[S]",range:[M.min-pad,M.max+pad]},yaxis:{title:"1/v"},legend:{orientation:(state.showLegend?"v":"h"),x:(state.showLegend?1.02:0),xanchor:"left",y:1,yanchor:"top"},shapes:[vLine(),hLine()],annotations:(state.showNotes?annLB:[])},{displaylogo:false});

    // Replot
    const tracesRP=[], annRP=[], allX=[0], allY=[0];
    let kiA=null, kiB=null;
    function addRP(xs,ys,label,colors,accKi,isDixon,tag,modelo){
      if(!xs||!xs.length) return;
      // cache pontos Replot
      for(let i=0;i<xs.length;i++){ datasetCache.rows.push({plot:"Replot",tag,modelo,modificador:xs[i],S:"",v:"",invS:"",invV:ys[i]});}
      // pontos
      const xr=minmax(xs), yr=minmax(ys); allX.push(xr.min,xr.max); allY.push(yr.min,yr.max);
      tracesRP.push({x:xs,y:ys,mode:"markers",marker:{size:7,color:colors?.[0]||"#444"},name:label+" pts",showlegend:false});
      const f=isDixon?olsFit(xs,ys):wlsFit_1_over_y2(xs,ys); if(!f.ok) return;
      const mm=minmax(xs), xi=(Math.abs(f.b)>1e-12?(-f.a/f.b):null), x0=Math.min(0,mm.min,xi??mm.min), x1=Math.max(0,mm.max,xi??mm.max);
      const yr0=f.a+f.b*x0, yr1=f.a+f.b*x1; allX.push(x0,x1); allY.push(yr0,yr1);
      tracesRP.push({x:[x0,x1],y:[yr0,yr1],mode:"lines",line:{width:2,color:colors?.[1]||"#000"},name:label,showlegend:state.showLegend});
      if(state.showNotes) annRP.push({x:x1,y:yr1,ax:0,ay:-24,showarrow:true,arrowhead:2,text:`a=${f.a.toFixed(3)}, b=${f.b.toFixed(3)}, r²=${f.r2.toFixed(3)}${xi!=null?`, x₀=${xi.toFixed(3)}`:""}`});
      datasetCache.rows.push({plot:"Replot_fit",tag,modelo,modificador:"",S:"",v:"",invS:f.b,invV:f.a, slope:f.b, intercept:f.a, r2:f.r2});
      if(accKi && xi!=null && isFinite(xi)) accKi.push(xi);
    }

    if(state.replotMetric==="invV"){
      const S3=pickThreeS(), palA=[PA[0],PA[3]], palB=[PB[0],PB[3]];
      function drawDixon(tag,name,p0,kiAcc){ if(!name) return; const mk=detectMod(name);
        for(const s of S3){
          const xs=[], ys=[];
          for(const mRaw of state.modifierSeries){
            const mod=+mRaw; const p=clone(p0); if(mk==="I") p.I=mod; else p.A=mod;
            const v=Models[name].evalv(p,s); if(isFinite(v) && v>0){ xs.push(mod); ys.push(1/v); }
          }
          addRP(xs,ys,`${tag} S=${s.toFixed(2)}`,(tag==="A"?palA:palB),kiAcc,true,tag,name);
        }
      }
      const accA=[], accB=[];
      drawDixon("A",state.modelA,state.paramsA,accA);
      if(state.modelB) drawDixon("B",state.modelB,state.paramsB,accB);
      const mkA=detectMod(state.modelA), mkB=detectMod(state.modelB);
      if(accA.length && mkA==="I"){ kiA=accA.reduce((s,v)=>s+v,0)/accA.length; tracesRP.push({x:[kiA,kiA],y:[Math.min(...allY),Math.max(...allY)],mode:"lines",line:{dash:"dot",width:2,color:PA[4]},name:"Ki (A)",showlegend:state.showLegend}); annRP.push({x:kiA,y:0,ax:0,ay:-30,showarrow:true,arrowhead:2,text:"Ki (A) ≈ "+kiA.toFixed(3)}); datasetCache.rows.push({plot:"Ki",tag:"A",modelo:state.modelA,modificador:kiA,S:"",v:"",invS:"",invV:""}); allX.push(kiA); }
      if(accB.length && mkB==="I"){ kiB=accB.reduce((s,v)=>s+v,0)/accB.length; tracesRP.push({x:[kiB,kiB],y:[Math.min(...allY),Math.max(...allY)],mode:"lines",line:{dash:"dot",width:2,color:PB[4]},name:"Ki (B)",showlegend:state.showLegend}); annRP.push({x:kiB,y:0,ax:0,ay:-30,showarrow:true,arrowhead:2,text:"Ki (B) ≈ "+kiB.toFixed(3)}); datasetCache.rows.push({plot:"Ki",tag:"B",modelo:state.modelB||"",modificador:kiB,S:"",v:"",invS:"",invV:""}); allX.push(kiB); }
    } else {
      function collect(tag,name,p0){ if(!name) return; const mk=detectMod(name); const xs=[], ys=[];
        for(const mRaw of state.modifierSeries){ const mod=+mRaw; const p=clone(p0); if(mk==="I") p.I=mod; else p.A=mod;
          const yN=addNoise(evalModel(name,p,S),state.errRel); const xLB=[],yLB=[]; for(let i=0;i<S.length;i++){ if(S[i]>0 && yN[i]>0){ xLB.push(1/S[i]); yLB.push(1/yN[i]); } }
          const fit=wlsFit_1_over_y2(xLB,yLB); if(fit.ok){ xs.push(mod); ys.push(state.replotMetric==="slope"?fit.b:fit.a); }
        }
        addRP(xs,ys,tag,(tag==="A"?[PA[0],PA[4]]:[PB[0],PB[4]]),null,false,tag,name);
      }
      collect("A",state.modelA,state.paramsA);
      if(state.modelB) collect("B",state.modelB,state.paramsB);
    }

    const mX=minmax([0, ...gatherX(g3,tracesRP)]), mY=minmax([0, ...gatherY(g3,tracesRP)]);
    const padX=(mX.max-mX.min)*0.06||1, padY=(mY.max-mY.min)*0.06||1;
    Plotly.newPlot(g3,tracesRP,{margin:{l:50,r:10,t:10,b:50},xaxis:{title:state.replotXLabel,range:[mX.min-padX,mX.max+padX]},yaxis:{title:(state.replotMetric==="slope"?"slope (LB)":state.replotMetric==="intercept"?"intercept (LB)":"1/v"),range:[mY.min-padY,mY.max+padY]},legend:{orientation:"h"},shapes:[vLine(),hLine()],annotations:(state.showNotes?annRP:[])},{displaylogo:false});

    function gatherX(div,traces){const xs=[]; traces.forEach(t=>{if(t.x) xs.push(...t.x);}); return xs;}
    function gatherY(div,traces){const ys=[]; traces.forEach(t=>{if(t.y) ys.push(...t.y);}); return ys;}

    // click-editar anotações
    g2.on('plotly_clickannotation',ev=>{const idx=ev.index, txt=g2.layout.annotations[idx].text, nv=prompt("Editar anotação:",txt); if(nv!=null){const A=g2.layout.annotations.slice(); A[idx]=Object.assign({},A[idx],{text:nv}); Plotly.relayout(g2,{annotations:A});}});
    g3.on('plotly_clickannotation',ev=>{const idx=ev.index, txt=g3.layout.annotations[idx].text, nv=prompt("Editar anotação:",txt); if(nv!=null){const A=g3.layout.annotations.slice(); A[idx]=Object.assign({},A[idx],{text:nv}); Plotly.relayout(g3,{annotations:A});}});

    // diagnóstico / export
    lastFigs.vS={data:tracesV,layout:g1.layout}; lastFigs.LB={data:tracesLB,layout:g2.layout}; lastFigs.RP={data:g3.data,layout:g3.layout};
    lastFigs.kiA=null; lastFigs.kiB=null; // serão preenchidos acima nos pushes Ki
    const kiArow=datasetCache.rows.find(r=>r.plot==="Ki"&&r.tag==="A"); const kiBrow=datasetCache.rows.find(r=>r.plot==="Ki"&&r.tag==="B");
    if(kiArow) lastFigs.kiA=kiArow.modificador; if(kiBrow) lastFigs.kiB=kiBrow.modificador;

    lastFigs.diag=`<h3>Diagnóstico</h3><ul>
      <li>Métrica do replot: ${state.replotMetric}</li>
      <li>Eixo X replot: ${state.replotXLabel}</li>
      ${lastFigs.kiA!=null?`<li>Ki (A) ≈ ${(+lastFigs.kiA).toFixed(4)}</li>`:""}
      ${lastFigs.kiB!=null?`<li>Ki (B) ≈ ${(+lastFigs.kiB).toFixed(4)}</li>`:""}
      <li>Modificadores: [${state.modifierSeries.join(", ")}]</li>
      <li>[S]: ${state.Smin}→${state.Smax} (${state.Npts} pts), erro rel=${state.errRel}</li>
      <li>Legenda: ${state.showLegend?"ON":"OFF"}</li></ul>`;
    lastFigs.paramHTML=(function(){const fmt=o=>"<ul>"+Object.keys(o).map(k=>`<li>${k}: ${o[k]}</li>`).join("")+"</ul>";
      let s="<h3>Parâmetros dos modelos</h3><b>A — "+state.modelA+"</b>"+fmt(state.paramsA); if(state.modelB) s+="<b>B — "+state.modelB+"</b>"+fmt(state.paramsB); return s;})();
  }

  // --------- render a partir de CSV importado ---------
  function renderFromCSV(){
    // csvData.rows é lista de objetos já normalizados (numéricos em ponto nos fields numéricos)
    const rows=state.csvData.rows;
    const tracesV=[], tracesLB=[], tracesRP=[], annLB=[], annRP=[];
    const byKey=(r)=>`${r.tag}|${r.modelo}|${r.modificador}`;
    // MM
    const groupsMM={};
    rows.filter(r=>r.plot==="MM").forEach(r=>{const key=byKey(r); (groupsMM[key]||(groupsMM[key]=[])).push(r);});
    Object.keys(groupsMM).forEach((k,i)=>{
      const arr=groupsMM[k].sort((a,b)=>a.S-b.S); const color=(arr[0]?.tag==="A")?PA[i%5]:PB[i%5];
      tracesV.push({x:arr.map(r=>r.S),y:arr.map(r=>r.v),mode:"markers",marker:{size:6,color},name:`${arr[0].tag} ${arr[0].modelo} mod=${arr[0].modificador}`,showlegend:false});
    });

    // LB
    const groupsLB={};
    rows.filter(r=>r.plot==="LB").forEach(r=>{const key=byKey(r); (groupsLB[key]||(groupsLB[key]=[])).push(r);});
    Object.keys(groupsLB).forEach((k,i)=>{
      const arr=groupsLB[k].sort((a,b)=>a.invS-b.invS); const tag=arr[0].tag, color=(tag==="A")?PA[i%5]:PB[i%5];
      tracesLB.push({x:arr.map(r=>r.invS),y:arr.map(r=>r.invV),mode:"markers",marker:{size:6,color},name:`${tag} mod=${arr[0].modificador} pts`,showlegend:false});
    });
    // LB fits
    rows.filter(r=>r.plot==="LB_fit").forEach((r,i)=>{
      const color=(r.tag==="A")?PA[i%5]:PB[i%5];
      const xi = Math.abs(r.slope)>1e-12?(-r.intercept/r.slope):null;
      const mm=minmax(rows.filter(q=>q.plot==="LB" && q.tag===r.tag).map(q=>q.invS)); const x0=Math.min(0,mm.min,xi??mm.min), x1=Math.max(0,mm.max,xi??mm.max);
      const y0=r.intercept + r.slope*x0, y1=r.intercept + r.slope*x1;
      tracesLB.push({x:[x0,x1],y:[y0,y1],mode:"lines",line:{color},name:`${r.tag} mod=${r.modificador}`,showlegend:false});
      annLB.push({x:x1,y:y1,ax:0,ay:-24,showarrow:true,arrowhead:2,text:`a=${r.intercept.toFixed(3)}, b=${r.slope.toFixed(3)}, r²=${(r.r2||0).toFixed(3)}${xi!=null?`, x₀=${xi.toFixed(3)}`:""}`});
    });

    // Replot
    const groupsRP={};
    rows.filter(r=>r.plot==="Replot").forEach(r=>{const key=`${r.tag}|${r.modelo}`; (groupsRP[key]||(groupsRP[key]=[])).push(r);});
    Object.keys(groupsRP).forEach((k,i)=>{
      const arr=groupsRP[k].sort((a,b)=>a.modificador-b.modificador); const tag=arr[0].tag, color=(tag==="A")?PA[i%5]:PB[i%5];
      tracesRP.push({x:arr.map(r=>r.modificador), y:arr.map(r=>r.invV), mode:"markers", marker:{size:7,color}, name:`${tag} replot`, showlegend:false});
    });
    rows.filter(r=>r.plot==="Replot_fit").forEach((r,i)=>{
      const color=(r.tag==="A")?PA[i%5]:PB[i%5];
      // range por dados replot desse tag
      const arr=rows.filter(q=>q.plot==="Replot" && q.tag===r.tag);
      const mm=minmax(arr.map(q=>q.modificador));
      const xi=Math.abs(r.slope)>1e-12?(-r.intercept/r.slope):null;
      const x0=Math.min(0,mm.min,xi??mm.min), x1=Math.max(0,mm.max,xi??mm.max);
      const y0=r.intercept+r.slope*x0, y1=r.intercept+r.slope*x1;
      tracesRP.push({x:[x0,x1],y:[y0,y1],mode:"lines",line:{width:2,color},name:`${r.tag} replot`,showlegend:false});
      annRP.push({x:x1,y:y1,ax:0,ay:-24,showarrow:true,arrowhead:2,text:`a=${r.intercept.toFixed(3)}, b=${r.slope.toFixed(3)}, r²=${(r.r2||0).toFixed(3)}${xi!=null?`, x₀=${xi.toFixed(3)}`:""}`});
    });
    // Ki markers
    const kis=rows.filter(r=>r.plot==="Ki");
    kis.forEach((r,i)=>{const color=(r.tag==="A")?PA[4]:PB[4]; tracesRP.push({x:[r.modificador,r.modificador],y:[-1,1],mode:"lines",line:{dash:"dot",width:2,color},name:`Ki (${r.tag})`,showlegend:false});});

    // plot
    Plotly.newPlot(g1,tracesV,{margin:{l:50,r:10,t:10,b:50},xaxis:{title:"[S]"},yaxis:{title:"v"},legend:{orientation:"h"}},{displaylogo:false});
    Plotly.newPlot(g2,tracesLB,{margin:{l:50,r:10,t:10,b:50},xaxis:{title:"1/[S]"},yaxis:{title:"1/v"},legend:{orientation:"h"},shapes:[vLine(),hLine()],annotations:(state.showNotes?annLB:[])},{displaylogo:false});
    Plotly.newPlot(g3,tracesRP,{margin:{l:50,r:10,t:10,b:50},xaxis:{title:state.replotXLabel},yaxis:{title:"Replot (carregado)"},legend:{orientation:"h"},shapes:[vLine(),hLine()],annotations:(state.showNotes?annRP:[])},{displaylogo:false});

    // diag a partir do CSV
    lastFigs.vS={data:tracesV,layout:g1.layout}; lastFigs.LB={data:tracesLB,layout:g2.layout}; lastFigs.RP={data:tracesRP,layout:g3.layout};
    lastFigs.kiA = (kis.find(r=>r.tag==="A")||{}).modificador ?? null;
    lastFigs.kiB = (kis.find(r=>r.tag==="B")||{}).modificador ?? null;

    lastFigs.diag=`<h3>Diagnóstico (CSV)</h3><ul>
      ${lastFigs.kiA!=null?`<li>Ki (A) ≈ ${(+lastFigs.kiA).toFixed(4)}</li>`:""}
      ${lastFigs.kiB!=null?`<li>Ki (B) ≈ ${(+lastFigs.kiB).toFixed(4)}</li>`:""}
      <li>Fonte: CSV importado</li></ul>`;
    lastFigs.paramHTML=`<h3>Parâmetros</h3><div>Parâmetros originais não são reconstruídos a partir do CSV (apenas dados e ajustes).</div>`;
  }

  // ---------- CSV Export ----------
  function exportCSV(){
    if(!datasetCache || !datasetCache.rows) { alert("Gere os gráficos antes de exportar."); return; }
    const head=["plot","tag","modelo","modificador","S","v","1/S","1/v","slope","intercept","r2"];
    const lines=[ joinBR(head) ];
    datasetCache.rows.forEach(r=>{
      const row=[r.plot||"", r.tag||"", r.modelo||"", r.modificador, r.S, r.v, r.invS, r.invV, r.slope, r.intercept, r.r2];
      // decimal vírgula
      const conv=row.map(v=>{
        if(typeof v==="number"){ return fmtNumBR(v); }
        if(v==null) return "";
        if(typeof v==="string" && v!=="" && !isNaN(v)) return fmtNumBR(parseFloat(v));
        return String(v);
      });
      lines.push( joinBR(conv) );
    });
    const csv=lines.join("\n");
    downloadTxt("ektoolkit.csv", csv);
  }

  // ---------- CSV Load ----------
  function triggerLoad(){
    const inp=el("input","",document.body); inp.type="file"; inp.accept=".csv,text/csv";
    inp.onchange=function(){
      const file=inp.files[0]; if(!file){inp.remove(); return;}
      const fr=new FileReader();
      fr.onload=function(){
        const txt=fr.result;
        const rows=parseCSV_BR(txt);
        if(!rows || !rows.length){ alert("CSV vazio ou inválido."); inp.remove(); return; }
        state.csvMode=true; state.csvData={rows}; bClear.style.display="inline-block"; renderAll();
        inp.remove();
      };
      fr.readAsText(file,'utf-8');
    };
    inp.click();
  }
  function parseCSV_BR(txt){
    // separador ';', decimal vírgula -> ponto
    const lines=txt.split(/\r?\n/).filter(l=>l.trim().length>0);
    if(lines.length<2) return [];
    const head=lines[0].split(';').map(h=>h.trim());
    const idx=(k)=>head.indexOf(k);
    const R=[];
    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(';');
      const obj={};
      head.forEach((h,ix)=>{
        let val=cols[ix]!=null?cols[ix].trim():"";
        // numéricos: trocar vírgula por ponto
        if(["modificador","S","v","1/S","1/v","slope","intercept","r2"].includes(h)){
          obj[ mapKey(h) ] = val===""? "" : parseFloat(val.replace(',','.'));
        } else {
          obj[ mapKey(h) ] = val;
        }
      });
      R.push(obj);
    }
    return R;
    function mapKey(h){
      if(h==="1/S") return "invS";
      if(h==="1/v") return "invV";
      return h;
    }
  }

  // ---------- HTML Export (já existente) ----------
  function exportHTML(){
    const P="https://cdn.plot.ly/plotly-2.32.0.min.js", M="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    const esc=x=>JSON.stringify(x);
    const eqA=Models[state.modelA]?.latex||"", eqB=Models[state.modelB]?.latex||"";
    const eqBlock=`<h3>Equações (LaTeX)</h3><div class="cols2"><div><b>Modelo A</b><div>$$ ${eqA} $$</div></div><div><b>Modelo B</b><div>${eqB?('$$ '+eqB+' $$'):'(não selecionado)'}</div></div></div>`;
    const html=`<!doctype html><html><head><meta charset="utf-8"/><title>EK Export</title><script src="${P}"></script><script src="${M}"></script>
      <style>body{font-family:system-ui,Arial,sans-serif;margin:12px}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.card{border:1px solid #ddd;border-radius:10px;padding:6px}h2{margin:.2em 0 .4em}.cols2{display:grid;grid-template-columns:1fr 1fr;gap:12px}</style>
      </head><body><h2>EK-Toolkit — Export</h2>
      <div class="grid"><div class="card"><h3>v vs [S]</h3><div id="d1"></div></div>
      <div class="card"><h3>Lineweaver–Burk</h3><div id="d2"></div></div>
      <div class="card"><h3>Replot</h3><div id="d3"></div></div></div>
      <div class="card" style="margin-top:10px">${lastFigs.diag}</div>
      <div class="card" style="margin-top:10px">${lastFigs.paramHTML}</div>
      <div class="card" style="margin-top:10px">${eqBlock}</div>
      <script>var f1=${esc(lastFigs.vS)},f2=${esc(lastFigs.LB)},f3=${esc(lastFigs.RP)};Plotly.newPlot('d1',f1.data,f1.layout,{displaylogo:false});Plotly.newPlot('d2',f2.data,f2.layout,{displaylogo:false});Plotly.newPlot('d3',f3.data,f3.layout,{displaylogo:false}); if(window.MathJax&&MathJax.typeset){MathJax.typeset();}</script></body></html>`;
    download("ektoolkit_export.html", html);
  }

  // GO
  renderAll();
})();
