(function(){
  if (typeof Plotly === "undefined") { alert("Plotly not found."); return; }

  // ===== Helpers basicos (ASCII-safe) =====
  var F = 96485, VOLUME_L = 0.05, NE_GLUC = 24;
  var DT = 1, TMAX = 1800, EPS = 1e-9;

  function fmt(x,d){ if(!isFinite(x)) return "NA"; return Number(x).toFixed(d==null?3:d); }
  function clamp(x,a,b){ return Math.max(a,Math.min(b,x)); }
  function linspace(a,b,n){ var out=[],i; if(n<=1){out.push(a); return out;} for(i=0;i<n;i++) out.push(a+i*(b-a)/(n-1)); return out; }
  function logspace(a,b,n){ var L=linspace(Math.log10(a),Math.log10(b),n), out=[],i; for(i=0;i<L.length;i++) out.push(Math.pow(10,L[i])); return out; }
  function trapz(y,dx){ var s=0,i; for(i=1;i<y.length;i++) s+=0.5*(y[i]+y[i-1])*dx; return s; }

  // Divide texto em linhas sem regex (evita erros de regex/ASCII)
  function splitLines(text){
    var s = String(text || "");
    var out = [], start = 0, i, c;
    for (i=0;i<s.length;i++){
      c = s.charCodeAt(i);
      if (c === 10){ out.push(s.slice(start,i)); start = i+1; }
    }
    out.push(s.slice(start));
    for (i=0;i<out.length;i++){
      if (out[i].length && out[i].charCodeAt(out[i].length-1) === 13){ out[i] = out[i].slice(0,-1); }
    }
    return out;
  }

  // ===== Cena aleatoria =====
  var SCENE = randomScene();
  function randomScene(){
    return {
      e0: 0.64 + Math.random()*0.20,
      r0: 30   + Math.random()*90,
      beta: 0.45 + Math.random()*0.50,
      a_act: 0.05 + Math.random()*0.06,
      c_conc_mul: 0.08 + Math.random()*0.07
    };
  }

  // ===== UI =====
  var root = document.createElement("div");
  root.id = "mfc-app";
  root.style.cssText = "padding:8px;border:1px solid #ddd;border-radius:12px;background:#fafafa;margin:8px 0 16px;font-family:system-ui,Arial,sans-serif";
  root.innerHTML = [
    '<div id="mfc_banner" style="display:none;padding:6px 10px;margin-bottom:8px;border-radius:8px;background:#fff7e6;border:1px solid #ffd591;font-size:13px"></div>',
    '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">',
      '<div>',
        '<label style="font-weight:600">Faixa de resistores (Ohm)</label><br>',
        '<input id="mfc_rmin" type="number" value="100" min="1" step="1" style="padding:6px;width:90px"> ',
        '<span>ate</span> ',
        '<input id="mfc_rmax" type="number" value="100000" min="1" step="1" style="padding:6px;width:110px">',
        '<div style="font-size:11px;color:#666;margin-top:4px">Log-espalhados; se min = max, usa 1 resistor.</div>',
      '</div>',

      '<div style="margin-top:6px">',
        '<label style="font-weight:600">Numero de resistores</label><br>',
        '<input id="mfc_nres" type="number" value="20" min="1" max="100" step="1" style="padding:6px;width:100px">',
        '<div style="font-size:11px;color:#666;margin-top:2px">(define quantidade na distribuicao log)</div>',
      '</div>',

      '<div>',
        '<label style="font-weight:600">Presets</label><br>',
        '<select id="mfc_preset" style="padding:6px;width:220px">',
          '<option value="none">-- Selecionar --</option>',
          '<option value="fresh">Fresh (start-up)</option>',
          '<option value="grown">Biofilme maduro</option>',
          '<option value="starved">Substrato escasso</option>',
          '<option value="highRint">Alta R_int</option>',
          '<option value="clean">Catodo/anodo limpos</option>',
          '<option value="overshoot">Overshoot (visual)</option>',
        '</select>',
      '</div>',

      '<div>',
        '<label style="font-weight:600">Modificadores</label><br>',
        '<div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:4px;max-width:560px">',
          '<label><input type="checkbox" class="mfc_mod" value="ADP"> ADP</label>',
          '<label><input type="checkbox" class="mfc_mod" value="NAD+"> NAD+</label>',
          '<label><input type="checkbox" class="mfc_mod" value="citrate"> citrato</label>',
          '<label><input type="checkbox" class="mfc_mod" value="pyruvate"> piruvato</label>',
          '<label><input type="checkbox" class="mfc_mod" value="G6P"> glicose-6P</label>',
          '<label><input type="checkbox" class="mfc_mod" value="F26BP"> Fru-2,6-bifosfato</label>',
          '<label><input type="checkbox" class="mfc_mod" value="2DG"> 2-deoxiglicose</label>',
        '</div>',
      '</div>',

      '<div style="min-width:320px">',
        '<label style="font-weight:600">Intensidade dos modificadores</label>',
        '<div style="display:flex;gap:8px;align-items:center">',
          '<input id="mfc_modint" type="range" min="0" max="300" value="100" style="width:220px">',
          '<span id="mfc_modint_lbl">100%</span>',
        '</div>',
      '</div>',

      '<label style="font-size:12px;display:flex;align-items:center;gap:6px;border:1px solid #aaa;padding:6px 8px;border-radius:8px;background:#fff;height:36px">',
        '<input id="mfc_logpow" type="checkbox"> I (potencia) em log',
      '</label>',

      '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">',
        '<button id="mfc_reset" style="padding:8px 12px;border-radius:8px;border:1px solid #444;background:#fff;cursor:pointer">Reset</button>',
        '<button id="mfc_eq"    style="padding:8px 12px;border-radius:8px;border:1px solid #444;background:#fff;cursor:pointer">Equacoes</button>',
        '<button id="mfc_csv"   style="padding:8px 12px;border-radius:8px;border:1px solid #444;background:#fff;cursor:pointer">CSV</button>',
        '<button id="mfc_load"  style="padding:8px 12px;border-radius:8px;border:1px solid #444;background:#fff;cursor:pointer">Load CSV</button>',
        '<input id="mfc_file" type="file" accept=".csv,text/csv,application/json" style="display:none">',
        '<button id="mfc_json_save" style="padding:8px 12px;border-radius:8px;border:1px solid #444;background:#fff;cursor:pointer">JSON</button>',
        '<button id="mfc_json_load" style="padding:8px 12px;border-radius:8px;border:1px solid #444;background:#fff;cursor:pointer">Load JSON</button>',
        '<button id="mfc_save"  style="padding:8px 12px;border-radius:8px;border:1px solid #444;background:#fff;cursor:pointer">Salvar HTML</button>',
      '</div>',
    '</div>',

    '<div style="margin-top:6px;font-size:12px;color:#444">Modelo: Thevenin com sobretensoes visuais. V = E_OCV - I*R_int. Potencia parabolica (Jacobi).</div>',

    '<div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap">',
      '<div id="mfc_tV"  style="flex:1 1 520px;min-width:420px;height:500px;border:1px solid #eee;border-radius:10px;background:#fff"></div>',
      '<div id="mfc_pol" style="flex:1 1 520px;min-width:420px;height:500px;border:1px solid #eee;border-radius:10px;background:#fff"></div>',
      '<div id="mfc_pow" style="flex:1 1 520px;min-width:420px;height:500px;border:1px solid #eee;border-radius:10px;background:#fff"></div>',
    '</div>',

    '<div id="mfc_metrics" style="margin-top:12px;font-size:14px;padding:10px;background:#fff;border:1px solid #eee;border-radius:10px">',
      '<b>Caracterizacao</b><br>',
      'R_int,lin: <span id="mfc_rint_lin">-</span> Ohm | ',
      'R_int,ideal: <span id="mfc_rint_j">-</span> Ohm | ',
      'P_max: <span id="mfc_pmax">-</span> mW em R=<span id="mfc_pmaxR">-</span> Ohm | ',
      'eta_Q: <span id="mfc_etaQ">-</span>% | ',
      'eta_E: <span id="mfc_etaE">-</span>%',
    '</div>'
  ].join("");
  (document.getElementById("app")||document.body).appendChild(root);

  // ===== Modal Equacoes =====
  var eqModal = document.createElement("div");
  eqModal.id = "mfc_modal";
  eqModal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:9999;align-items:center;justify-content:center";
  eqModal.innerHTML =
    '<div style="background:#fff;max-width:900px;width:92%;border-radius:12px;padding:12px;border:1px solid #ddd;resize:both;overflow:auto">'+
    '  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'+
    '    <div style="font-weight:700;font-size:15px">Equacoes do modelo</div>'+
    '    <button id="mfc_modal_close" style="padding:6px 10px;border-radius:8px;border:1px solid #999;background:#f8f8f8;cursor:pointer">Fechar</button>'+
    '  </div>'+
    '  <div id="mfc_eq_body" style="font-size:14px;line-height:1.55">'+
    '    <ol>'+
    '      <li><b>Fonte de Thevenin</b>: \\[ I = \\frac{E_{\\mathrm{OCV}}}{R_{\\mathrm{int}} + R_{\\mathrm{ext}}},\\quad V = I\\,R_{\\mathrm{ext}} \\]</li>'+
    '      <li><b>Potencia (ideal)</b>: \\[ P = E\\,I - R_{\\mathrm{int}} I^2 = \\frac{E_{\\mathrm{OCV}}^{2}\\,R_{\\mathrm{ext}}}{(R_{\\mathrm{int}}+R_{\\mathrm{ext}})^2} \\] pico em \\( R_{\\mathrm{ext}}=R_{\\mathrm{int}} \\).</li>'+
    '      <li><b>Sobretensoes (visual)</b>: \\[ V_{\\mathrm{pol}} = V_{\\mathrm{lin}} - \\eta_{\\mathrm{act}} - \\eta_{\\mathrm{conc}} \\] com \\( \\eta_{\\mathrm{act}}=A\\,\\ln(1+I/I_0) \\) e \\( \\eta_{\\mathrm{conc}}=C\\,\\frac{(I/I_{\\mathrm{lim}})^2}{1-I/I_{\\mathrm{lim}}} \\).</li>'+
    '      <li><b>Dinamica</b>: \\[ E_{\\mathrm{OCV}}(t)=E_{\\max}(1-e^{-k_{\\mathrm{act}} t})\\,s(f),\\quad R_{\\mathrm{int}}(t)=R_0(1+\\beta(1-f)) \\] com \\( s(f)=0.40+0.60f \\), \\( f=Q/Q_{\\mathrm{teor}} \\).</li>'+
    '      <li><b>Carga/Energia e eficiencias</b>: \\( Q_{\\mathrm{teor}}=n_{\\mathrm{gluc}} n_e F \\); \\( \\eta_Q=100\\,\\frac{\\int I\\,dt}{Q_{\\mathrm{teor}}}\\,\\% \\); \\( \\eta_E=100\\,\\frac{\\int IV\\,dt}{Q_{\\mathrm{teor}}E_{\\max}}\\,\\% \\).</li>'+
    '      <li><b>Estimativa didatica de R_int</b>: reta de \\( V\\times I \\) sobre a porcao mais linear da curva real: \\( V \\approx E_0 - I R_{\\mathrm{int}} \\Rightarrow R_{\\mathrm{int}}=-\\text{slope} \\).</li>'+
    '    </ol>'+
    '  </div>'+
    '</div>';
  (document.getElementById("app")||document.body).appendChild(eqModal);
  if (typeof MathJax==="undefined"){ var sMJ=document.createElement("script"); sMJ.src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"; sMJ.async=true; document.head.appendChild(sMJ); }

  // ===== Modificadores/presets =====
  var CONC_REF_mM = 20;

  function getMods(){
    var a = [].slice.call(root.querySelectorAll(".mfc_mod"));
    return a.filter(function(b){return b.checked;}).map(function(b){return b.value;});
  }

  function modifierEffects(mods,intensityPct){
    var rate=1,rint=1,eboost=1; var s=intensityPct/100;
    mods.forEach(function(m){
      if(m==="ADP"||m==="NAD+"){ rate*=(1+0.50*s); rint*=(1-0.25*s); }
      if(m==="citrate"){ rate*=(1-0.40*s); rint*=(1+0.25*s); }
      if(m==="pyruvate"){ rate*=(1-0.30*s); rint*=(1+0.18*s); }
      if(m==="G6P"){ rate*=(1-0.50*s); rint*=(1+0.30*s); }
      if(m==="F26BP"){ rate*=(1+0.60*s); rint*=(1-0.20*s); eboost*=(1+0.10*s); }
      if(m==="2DG"){ rate*=(1-0.55*s); rint*=(1+0.28*s); eboost*=(1-0.12*s); }
    });
    return {rateFactor:clamp(rate,0.1,5), rintFactor:clamp(rint,0.2,5), eboost:clamp(eboost,0.6,1.6)};
  }

  function applyPreset(name){
    if(name==="none") return;
    if(name==="fresh"){ SCENE.e0=0.62; SCENE.r0=80; SCENE.beta=0.55; SCENE.a_act=0.08; SCENE.c_conc_mul=0.11; }
    if(name==="grown"){ SCENE.e0=0.70; SCENE.r0=40; SCENE.beta=0.35; SCENE.a_act=0.05; SCENE.c_conc_mul=0.08; }
    if(name==="starved"){ SCENE.e0=0.58; SCENE.r0=95; SCENE.beta=0.65; SCENE.a_act=0.07; SCENE.c_conc_mul=0.12; }
    if(name==="highRint"){ SCENE.e0=0.66; SCENE.r0=140; SCENE.beta=0.60; SCENE.a_act=0.06; SCENE.c_conc_mul=0.09; }
    if(name==="clean"){ SCENE.e0=0.72; SCENE.r0=35; SCENE.beta=0.30; SCENE.a_act=0.045; SCENE.c_conc_mul=0.07; }
    if(name==="overshoot"){
      SCENE.a_act = 0.16;
      SCENE.c_conc_mul = 0.32;
      SCENE.r0   = 120;
      SCENE.beta = 0.70;
    }
  }

  function baseParams(mods,modIntensity){
    var me=modifierEffects(mods,modIntensity);
    var n_mol=Math.max(0,CONC_REF_mM)*1e-3*VOLUME_L;
    var Q_theor=n_mol*NE_GLUC*F;
    var E0=SCENE.e0*me.eboost, Emax=E0*(1-Math.exp(-CONC_REF_mM/10));
    var k_act=0.015*me.rateFactor, R0=SCENE.r0*me.rintFactor, betaR=SCENE.beta;
    return {Q_theor:(Emax>0?Q_theor:0), Emax:Emax, k_act:k_act, R0:R0, betaR:betaR};
  }

  // ===== Simulacao por resistor =====
  function simulateBranch(Rext,mods,modIntensity){
    var prm=baseParams(mods,modIntensity);
    var t=[],V=[],I=[],EocTrace=[];
    var Q_av=prm.Q_theor, Q_out=0;
    for(var k=0;k<=TMAX;k+=DT){
      var ramp=1-Math.exp(-prm.k_act*k);
      var f=(prm.Q_theor>0)?clamp(Q_av/prm.Q_theor,0,1):0;
      var Eoc=prm.Emax*ramp*(0.40+0.60*f);
      var Rint=prm.R0*(1+prm.betaR*(1-f));
      var I_now=Eoc/(Rint+Rext+EPS);
      var V_now=I_now*Rext;
      var dQ=I_now*DT, use=Math.min(Q_av,dQ);
      Q_av-=use; Q_out+=use;
      t.push(k); V.push(V_now); I.push(I_now); EocTrace.push(Eoc);
    }
    var E_el=trapz(I.map(function(ii,idx){return ii*V[idx];}),DT);
    var CE=prm.Q_theor>0? 100*(Q_out/prm.Q_theor):0;
    var Eth=prm.Q_theor*prm.Emax;
    var EE=Eth>0? 100*(E_el/Eth):0;
    var n=t.length-1;
    return {t:t,V:V,I:I,Eoc:EocTrace[n],Rext:Rext,Q_out:Q_out,E_el:E_el,CE:CE,EE:EE,Rint_est:(EocTrace[n]/(I[n]+EPS))-Rext};
  }

  // ===== Pontos de polarizacao =====
  function polarizationPoints(branches){
    var pts=branches.map(function(br){
      var E=br.Eoc, Rint=Math.max(1,br.Rint_est);
      var Ilin=E/(Rint+br.Rext);
      var Vlin=Ilin*br.Rext;

      var minR = Math.min.apply(null, branches.map(function(b){return b.Rext;}));
      var I0   = 0.02*(E/(Rint+minR));
      var Ilim = 0.98*(E/(Rint+minR));

      var A=SCENE.a_act, C=SCENE.c_conc_mul*E;
      var eta_act=A*Math.log(1+Math.max(0,Ilin)/(I0+1e-9));
      var x=clamp(Ilin/(Ilim+1e-9),0,0.999);
      var eta_con=C*(x*x)/(1-x+1e-9);
      var Vnl=clamp(Vlin-eta_act-eta_con,0,E);

      return {I:Ilin,Vlin:Vlin,Vnl:Vnl,R:br.Rext,E:E,Rint:Rint};
    }).sort(function(a,b){return a.I-b.I;});
    return pts;
  }

  // ===== Ajustes lineares =====
  function fitLinearVnl(pts){
    var n=pts.length; if(n<3) return {Rint:NaN,Eoc:NaN,line:null};
    var I=pts.map(function(p){return p.I;}), V=pts.map(function(p){return p.Vnl;});
    var wMin=Math.max(3,Math.floor(0.15*n)), wMax=Math.max(wMin,Math.floor(0.35*n));
    function linfit(x,y){
      var m=x.length, i, sx=0,sy=0,sxx=0,sxy=0;
      for(i=0;i<m;i++){ sx+=x[i]; sy+=y[i]; sxx+=x[i]*x[i]; sxy+=x[i]*y[i]; }
      var denom=(m*sxx-sx*sx)||1e-12;
      var a=(m*sxy-sx*sy)/denom, b=(sy-a*sx)/m;
      var ybar=sy/m, ssTot=0, ssRes=0;
      for(i=0;i<m;i++){ var yh=a*x[i]+b; ssRes+=(y[i]-yh)*(y[i]-yh); ssTot+=(y[i]-ybar)*(y[i]-ybar); }
      var R2=1-(ssRes/(ssTot||1e-12));
      return {a:a,b:b,R2:R2};
    }
    var best={R2:-1e9,a:0,b:0,i0:0,i1:0};
    for(var w=wMin; w<=wMax; w++){
      for(var i0=0; i0+w<=n; i0++){
        var i1=i0+w-1;
        var r=linfit(I.slice(i0,i1+1), V.slice(i0,i1+1));
        if(r.a<0 && r.R2>best.R2 && Math.min.apply(null, V.slice(i0,i1+1))>=0){ best={R2:r.R2,a:r.a,b:r.b,i0:i0,i1:i1}; }
      }
    }
    if(best.R2<=-0.5) return {Rint:NaN,Eoc:NaN,line:null};
    var x0=I[best.i0], x1=I[best.i1];
    return { Rint:Math.max(1,-best.a), Eoc:Math.max(0,best.b),
             line:{x:[x0,x1],y:[best.a*x0+best.b,best.a*x1+best.b]} };
  }

  function fitLinearThevenin(pts){
    var n=pts.length; if(n<3) return {Rint:NaN,Eoc:NaN};
    var I=pts.map(function(p){return p.I;}), V=pts.map(function(p){return p.Vlin;});
    var wMin=Math.max(3,Math.floor(0.15*n)), wMax=Math.max(wMin,Math.floor(0.35*n));
    function linfit(x,y){
      var m=x.length,i,sx=0,sy=0,sxx=0,sxy=0;
      for(i=0;i<m;i++){ sx+=x[i]; sy+=y[i]; sxx+=x[i]*x[i]; sxy+=x[i]*y[i]; }
      var denom=(m*sxx-sx*sx)||1e-12;
      var a=(m*sxy-sx*sy)/denom, b=(sy-a*sx)/m;
      var ybar=sy/m, ssTot=0, ssRes=0;
      for(i=0;i<m;i++){ var yh=a*x[i]+b; ssRes+=(y[i]-yh)*(y[i]-yh); ssTot+=(y[i]-ybar)*(y[i]-ybar); }
      var R2=1-(ssRes/(ssTot||1e-12));
      return {a:a,b:b,R2:R2};
    }
    var best={R2:-1e9,a:0,b:0}, w,i0;
    for(w=wMin; w<=wMax; w++){
      for(i0=0; i0+w<=n; i0++){
        var r=linfit(I.slice(i0,i0+w), V.slice(i0,i0+w));
        if(r.a<0 && r.R2>best.R2) best=r;
      }
    }
    return {Rint:Math.max(1,-best.a), Eoc:Math.max(0,best.b)};
  }

  // ===== Curvas de potencia =====

  // Parabolica ideal a partir de Eoc e Rint (Thevenin)
  function powerCurveContinuous(Eoc,Rint){
    var Rs=linspace(Math.max(0.05*Rint,1),30*Rint,240), out=[];
    for(var i=0;i<Rs.length;i++){
      var R=Rs[i], I=Eoc/(Rint+R), P=(Eoc*Eoc*R)/((Rint+R)*(Rint+R));
      out.push({I:I,P:P,R:R});
    }
    return out;
  }

  // Curva continua alinhada aos pontos discretos (usada no preset overshoot)
  function powerCurveFromDiscrete(branches, samples){
    samples = samples || 240;
    var I = [], P = [];
    for (var b=0; b<branches.length; b++){
      var br = branches[b];
      var n = br.t.length - 1;
      var Ii = br.I[n], Vi = br.V[n];
      if (isFinite(Ii) && isFinite(Vi) && Ii>=0 && Vi>=0){
        I.push(Ii);
        P.push(Ii*Vi);
      }
    }
    if (I.length < 2) return [];

    var idx = I.map(function(_,k){return k;}).sort(function(a,b){ return I[a]-I[b]; });
    I = idx.map(function(k){return I[k];});
    P = idx.map(function(k){return P[k];});

    var Iu = [I[0]], Pu = [P[0]];
    for (var k=1;k<I.length;k++){
      if (Math.abs(I[k]-Iu[Iu.length-1]) < 1e-12){
        if (P[k] > Pu[Pu.length-1]) Pu[Pu.length-1] = P[k];
      } else {
        Iu.push(I[k]); Pu.push(P[k]);
      }
    }

    function lerp(x0,y0,x1,y1,x){ return y0 + (y1-y0)*((x-x0)/(x1-x0)); }
    function interp(xs, ys, x){
      if (x <= xs[0]) return ys[0];
      if (x >= xs[xs.length-1]) return ys[ys.length-1];
      var lo = 0, hi = xs.length-1;
      while (hi-lo > 1){
        var mid = (lo+hi)>>1;
        if (xs[mid] <= x) lo = mid; else hi = mid;
      }
      return lerp(xs[lo],ys[lo],xs[hi],ys[hi],x);
    }

    var Imax = Iu[Iu.length-1];
    var grid = [];
    for (var s=0; s<samples; s++){
      var x = (Imax * s)/(samples-1);
      var p = interp(Iu, Pu, x);
      if (p < 0) p = 0;
      grid.push({ I: x, P: p });
    }
    return grid;
  }

  // ===== Plotagem =====
  function plotTimeV(branches){
    var data=branches.map(function(br){
      return { x:br.t, y:br.V.map(function(v){return 1000*v;}), mode:"lines+markers",
               name:"R="+br.Rext+" Ohm", marker:{size:4}, line:{width:2},
               hovertemplate:"t=%{x}s<br>V=%{y:.1f} mV<extra>%{fullData.name}</extra>" };
    });
    Plotly.newPlot("mfc_tV", data,
      {title:"Tempo x Potencial", xaxis:{title:"tempo (s)"}, yaxis:{title:"V (mV)"},
       margin:{l:70,r:20,t:56,b:56}, height:500},
      {responsive:true, displaylogo:false});
  }

  function plotPolarization(pts, fit){
    var single = pts.length === 1;
    var data = [{
      x: pts.map(function(p){return 1e6*p.I;}), y: pts.map(function(p){return 1e3*p.Vnl;}),
      mode: single ? "markers" : "markers+lines",
      marker: { size: single ? 10 : 6 },
      name: "polarizacao (com sobretensoes)",
      hovertemplate: "I=%{x:.0f} uA<br>V=%{y:.1f} mV<extra></extra>"
    }];
    if (fit && fit.line){
      data.push({
        x: fit.line.x.map(function(v){return 1e6*v;}),
        y: fit.line.y.map(function(v){return 1e3*v;}),
        mode: "lines",
        name: "ajuste linear (Vnl)",
        line: { dash: "dot", width: 3 }
      });
    }
    var maxI=1e-9, i;
    for(i=0;i<pts.length;i++) if(pts[i].I>maxI) maxI=pts[i].I;
    Plotly.newPlot("mfc_pol", data,
      {title:"Curva de polarizacao (V x I)",
       xaxis:{title:"corrente I (uA)", range:[-0.02*1e6*maxI, 1.20*1e6*maxI]},
       yaxis:{title:"potencial V (mV)"}, margin:{l:80,r:20,t:56,b:60}, height:500},
      {responsive:true, displaylogo:false});
  }

  function plotPower(cont,discrete,useLogX){
    var single=discrete.length===1;
    var data=[
      {x:cont.map(function(p){return 1e6*p.I;}), y:cont.map(function(p){return 1e3*p.P;}), mode:"lines", name:"potencia (continua)",
       hovertemplate:"I=%{x:.0f} uA<br>P=%{y:.3f} mW<extra></extra>"},
      {x:discrete.map(function(p){return 1e6*p.I;}), y:discrete.map(function(p){return 1e3*p.P;}), mode:"markers", name:"pontos discretos",
       marker:{size: single?10:6}, hovertemplate:"I=%{x:.0f} uA<br>P=%{y:.3f} mW<extra></extra>"}
    ];
    var ymax=1e-6, i;
    for(i=0;i<cont.length;i++) if(cont[i].P>ymax) ymax=cont[i].P;
    for(i=0;i<discrete.length;i++) if(discrete[i].P>ymax) ymax=discrete[i].P;
    Plotly.newPlot("mfc_pow", data,
      {title:"Curva de potencia (I x P)",
       xaxis:{title:"corrente I (uA)", type: useLogX?"log":"linear"},
       yaxis:{title:"potencia P (mW)", range:[0,1e3*ymax*1.1]},
       margin:{l:80,r:20,t:56,b:60}, height:500},
      {responsive:true, displaylogo:false});
  }

  // ===== Metricas & cache =====
  function updateMetrics(branches,fit,pcont,fitTh){
    var disc=branches.map(function(b){ var n=b.t.length-1; return {I:b.I[n], P:b.I[n]*b.V[n], R:b.Rext, CE:b.CE, EE:b.EE}; });
    var best={P:-1,I:0,R:0,CE:0,EE:0}, i;
    for(i=0;i<disc.length;i++){ if(disc[i].P>best.P) best=disc[i]; }
    document.getElementById("mfc_pmax").textContent=fmt(1000*best.P,3);
    document.getElementById("mfc_pmaxR").textContent=String(best.R);
    document.getElementById("mfc_etaQ").textContent=fmt(best.CE,2);
    document.getElementById("mfc_etaE").textContent=fmt(best.EE,2);
    document.getElementById("mfc_rint_lin").textContent=fmt(fit.Rint,2);
    document.getElementById("mfc_rint_j").textContent=fmt(fitTh.Rint,2);

    root._lastRun={branches:branches,fit:fit,fitTh:fitTh,pcont:pcont,params:currentParams(),figs:grabFigures(),best:best};
  }

  function currentParams(){
    return {
      resistors_ohm: JSON.stringify(root._resistors||[]),
      modifiers: getMods().join(", ")||"none",
      modifier_intensity_pct: Number(document.getElementById("mfc_modint").value),
      time_s:TMAX, dt_s:DT, scene:JSON.stringify(SCENE),
      logI: document.getElementById("mfc_logpow").checked,
      preset: document.getElementById("mfc_preset").value
    };
  }

  // ===== Export HTML (ASCII-safe) =====
  function grabFigure(id){
    var gd=document.getElementById(id);
    return {data:JSON.parse(JSON.stringify(gd.data||[])),
            layout:JSON.parse(JSON.stringify(gd.layout||{})),
            config:{responsive:true, displaylogo:false}};
  }
  function grabFigures(){ return {tV:grabFigure("mfc_tV"), pol:grabFigure("mfc_pol"), pow:grabFigure("mfc_pow")}; }

  function saveHTML(){
    if(!root._lastRun) run();
    var fit=root._lastRun.fit, fitTh=root._lastRun.fitTh, best=root._lastRun.best;
    var rows=[
      ["Rint_lin (ohm)", fmt(fit.Rint,2)],
      ["Rint_ideal (ohm)", fmt(fitTh.Rint,2)],
      ["E0_ideal (V)", fmt(fitTh.Eoc,4)],
      ["Pmax (mW)", fmt(1000*best.P,3)],
      ["R@Pmax (ohm)", String(best.R)],
      ["etaQ (%)", fmt(best.CE,2)],
      ["etaE (%)", fmt(best.EE,2)],
      ["Resistores (ohm)", (root._resistors||[]).join(" , ")||"single"],
      ["Modificadores", getMods().join(", ")||"none"],
      ["Intensidade mods (%)", String(Number(document.getElementById("mfc_modint").value)||100)],
      ["I eixo potencia em log", String(document.getElementById("mfc_logpow").checked)]
    ];
    var table=rows.map(function(rv){var k=rv[0],v=rv[1]; return '<tr><td style="padding:6px 8px;border:1px solid #ddd">'+k+'</td><td style="padding:6px 8px;border:1px solid #ddd">'+v+'</td></tr>';}).join("");
    var figs=root._lastRun.figs;
    var html='<!doctype html><meta charset="utf-8"><title>MFC Export</title>'
      + '<script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>'
      + '<style>body{font-family:system-ui,Arial,sans-serif;padding:16px} .card{border:1px solid #ddd;border-radius:12px;padding:12px;background:#fff;margin-bottom:14px} .grid{display:flex;gap:12px;flex-wrap:wrap}</style>'
      + '<h1>Bio Fuel Cell - Export</h1>'
      + '<div class="card"><b>Parametros caracteristicos</b><table style="margin-top:8px;border-collapse:collapse">'+table+'</table></div>'
      + '<div class="card"><b>Figuras</b>'
      + '  <div class="grid">'
      + '    <div><div>Tempo x V (mV)</div><div id="tV"  style="width:760px;height:560px"></div></div>'
      + '    <div><div>Polarizacao (VxI)</div><div id="pol" style="width:760px;height:560px"></div></div>'
      + '    <div><div>Potencia (IxP)</div><div id="pow" style="width:760px;height:560px"></div></div>'
      + '  </div>'
      + '</div>'
      + '<script>'
      + 'const figs='+JSON.stringify(figs)+';'
      + "Plotly.newPlot('tV',figs.tV.data,figs.tV.layout,figs.tV.config);"
      + "Plotly.newPlot('pol',figs.pol.data,figs.pol.layout,figs.pol.config);"
      + "Plotly.newPlot('pow',figs.pow.data,figs.pow.layout,figs.pow.config);"
      + '</script>';
    var blob=new Blob([html],{type:"text/html"}), a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="MFC_export_"+new Date().toISOString().replace(/[:.]/g,"-")+".html";
    document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},1000); a.remove();
  }

  // ===== CSV / JSON =====
  function toCSV(){
    if(!root._lastRun) run();
    var p=currentParams(), k, lines=["section,key,value"];
    for(k in p){ if(Object.prototype.hasOwnProperty.call(p,k)){ lines.push("param,"+k+","+(String(p[k]).split(",").join(";"))); } }
    var blob=new Blob([lines.join("\n")],{type:"text/csv"}), a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    var iso=(new Date()).toISOString().split(".").join("-").split(":").join("-");
    a.download="MFC_"+iso+".csv";
    document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},1000); a.remove();
  }

  function fromCSV(text){
    var params={}, lines=splitLines(String(text).trim()), i;
    for(i=0;i<lines.length;i++){
      var line=lines[i]; if(!line||line.indexOf("section")===0) continue;
      var parts=line.split(","), section=parts[0], key=parts[1], rest=parts.slice(2).join(",");
      if(section!=="param") continue;
      params[key]=rest.split(";").join(",").trim();
    }
    if(params.modifiers){
      var mods=params.modifiers.split(",").map(function(s){return s.trim();}).filter(Boolean);
      var set=new Set(mods);
      [].slice.call(root.querySelectorAll(".mfc_mod")).forEach(function(chk){ chk.checked=set.has(chk.value); });
    }
    if(params.modifier_intensity_pct){
      var v=Number(params.modifier_intensity_pct)||100; var el=document.getElementById("mfc_modint");
      el.value=v; document.getElementById("mfc_modint_lbl").textContent=v+"%";
    }
    if(params.resistors_ohm){
      try{
        var arr=JSON.parse(params.resistors_ohm);
        if(Array.isArray(arr)&&arr.length>0){
          document.getElementById("mfc_rmin").value=Math.max(1,Math.min.apply(null,arr));
          document.getElementById("mfc_rmax").value=Math.max.apply(null,arr);
        }
      }catch(e){}
    }
    if(params.scene){ try{ SCENE=JSON.parse(params.scene);}catch(e){} }
    if(params.logI){ document.getElementById("mfc_logpow").checked=(String(params.logI).toLowerCase()==="true"); }
    if(params.preset){ document.getElementById("mfc_preset").value=params.preset; }
    scheduleRun();
  }

  function saveJSON(){
    if(!root._lastRun) run();
    var payload={version:"v11", params:currentParams(), scene:SCENE};
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}), a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    var iso=(new Date()).toISOString().split(".").join("-").split(":").join("-");
    a.download="MFC_condition_"+iso+".json";
    document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},1000); a.remove();
  }

  function loadJSON(text){
    try{
      var obj=JSON.parse(text); if(obj.scene) SCENE=obj.scene;
      var p=obj.params||{};
      if(p.resistors_ohm){ try{ var arr=JSON.parse(p.resistors_ohm);
        if(arr.length){ document.getElementById("mfc_rmin").value=Math.max(1,Math.min.apply(null,arr));
                        document.getElementById("mfc_rmax").value=Math.max.apply(null,arr);} }catch(e){} }
      if(p.modifiers){
        var mods=p.modifiers.split(",").map(function(s){return s.trim();}).filter(Boolean);
        var set=new Set(mods);
        [].slice.call(root.querySelectorAll(".mfc_mod")).forEach(function(chk){ chk.checked=set.has(chk.value); });
      }
      if(p.modifier_intensity_pct){ var v=Number(p.modifier_intensity_pct)||100;
        var el=document.getElementById("mfc_modint"); el.value=v; document.getElementById("mfc_modint_lbl").textContent=v+"%"; }
      if(typeof p.logI!=="undefined"){ document.getElementById("mfc_logpow").checked=!!p.logI; }
      if(p.preset){ document.getElementById("mfc_preset").value=p.preset; }
      scheduleRun();
    }catch(e){ alert("JSON invalido."); }
  }

  // ===== Banner/Equacoes =====
  function openEq(){ document.getElementById("mfc_modal").style.display="flex"; if(window.MathJax&&MathJax.typesetPromise) MathJax.typesetPromise(); }
  function closeEq(){ document.getElementById("mfc_modal").style.display="none"; }
  function banner(msg){ var el=document.getElementById("mfc_banner"); el.textContent=msg; el.style.display="block"; }
  function bannerHide(){ document.getElementById("mfc_banner").style.display="none"; }

  // ===== Resistores =====
  function pickResistors(rminInput, rmaxInput){
    var lo = Math.max(1, Number(rminInput) || 50);
    var hi = Math.max(1, Number(rmaxInput) || 100000);
    var n  = Math.max(1, Number(document.getElementById("mfc_nres").value) || 20);
    if (lo === hi) return [lo];

    var arr = logspace(lo, hi, n).map(function(v){ return Math.round(v); });
    var seen = {}, out = [];
    for (var i=0; i<arr.length; i++){
      if (!seen[arr[i]]) { seen[arr[i]] = 1; out.push(arr[i]); }
    }
    out.sort(function(a,b){ return a-b; });
    return out;
  }

  // ===== Pipeline =====
  function run(){
    var rmin=Math.max(1,Number(document.getElementById("mfc_rmin").value)||50);
    var rmax=Math.max(1,Number(document.getElementById("mfc_rmax").value)||100000);
    var preset=document.getElementById("mfc_preset").value; applyPreset(preset);
    var mods=getMods();
    var modInt=Number(document.getElementById("mfc_modint").value)||100;
    var useLogX=document.getElementById("mfc_logpow").checked;

    var resistors=pickResistors(rmin,rmax);
    root._resistors=resistors;

    var branches=resistors.map(function(R){ return simulateBranch(R,mods,modInt); });
    plotTimeV(branches);

    var pts=polarizationPoints(branches);
    var fit=fitLinearVnl(pts);
    plotPolarization(pts,fit);

    var fitTh=fitLinearThevenin(pts);
    var p_cont = (preset==="overshoot")
      ? powerCurveFromDiscrete(branches)  // alinha com pontos
      : powerCurveContinuous(fitTh.Eoc,fitTh.Rint); // ideal parabolica

    var p_disc=branches.map(function(b){ var n=b.t.length-1; return {I:b.I[n],P:b.I[n]*b.V[n],R:b.Rext}; });
    plotPower(p_cont,p_disc,useLogX);

    updateMetrics(branches,fit,p_cont,fitTh);
  }

  var to=null; function scheduleRun(){ if(to) clearTimeout(to); to=setTimeout(run,60); }

  // ===== Eventos =====
  ["mfc_rmin","mfc_rmax","mfc_modint","mfc_logpow","mfc_preset"].forEach(function(id){
    var el=document.getElementById(id);
    if(id==="mfc_modint"){ el.addEventListener("input",function(){ document.getElementById("mfc_modint_lbl").textContent=el.value+"%"; scheduleRun(); }); }
    else if(id==="mfc_logpow"||id==="mfc_preset"){ el.addEventListener("change",scheduleRun); }
    else { el.addEventListener("input",scheduleRun); el.addEventListener("change",scheduleRun); }
  });
  [].slice.call(root.querySelectorAll(".mfc_mod")).forEach(function(chk){ chk.addEventListener("change",scheduleRun); });
  document.getElementById("mfc_save").addEventListener("click",saveHTML);
  document.getElementById("mfc_eq").addEventListener("click",openEq);
  document.getElementById("mfc_modal_close").addEventListener("click",closeEq);
  document.getElementById("mfc_modal").addEventListener("click",function(e){ if(e.target.id==="mfc_modal") closeEq(); });
  document.getElementById("mfc_csv").addEventListener("click",toCSV);
  document.getElementById("mfc_load").addEventListener("click",function(){ var f=document.getElementById("mfc_file"); f.accept=".csv,text/csv"; f.click(); });
  document.getElementById("mfc_json_save").addEventListener("click",saveJSON);
  document.getElementById("mfc_json_load").addEventListener("click",function(){ var f=document.getElementById("mfc_file"); f.accept="application/json,.json"; f.click(); });
  document.getElementById("mfc_file").addEventListener("change",function(ev){
    var file=ev.target.files[0]; if(!file) return;
    var fr=new FileReader();
    fr.onload=function(){ if((file.type||"").indexOf("json")>=0 || file.name.toLowerCase().slice(-5)===".json") loadJSON(fr.result); else fromCSV(fr.result); };
    fr.readAsText(file); ev.target.value="";
  });
  document.getElementById("mfc_reset").addEventListener("click",function(){
    SCENE=randomScene(); banner("Novo cenario aleatorio aplicado."); scheduleRun(); setTimeout(bannerHide,2500);
  });
  document.getElementById("mfc_nres").addEventListener("input", scheduleRun);

  // Primeira renderizacao
  scheduleRun();
})();
