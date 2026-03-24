// Simulador simples de biorreator em batelada
// Biomassa (X), Substrato (S) e Produto (P)
// Com controles interativos para atualizar o gráfico em tempo real

const valoresPadrao = {
  X0: 0.2,      // g/L
  S0: 20,       // g/L
  P0: 0.0,      // g/L
  muMax: 0.45,  // 1/h
  Ks: 1.2,      // g/L
  Yxs: 0.5,     // gX/gS
  alpha: 0.25,  // gP/gX
  beta: 0.01,   // gP/(gX.h)
  tf: 30,       // h
  dt: 0.1       // h
};

function simularBiorreator(param) {
  const tempo = [];
  const biomassa = [];
  const substrato = [];
  const produto = [];

  let X = Number(param.X0);
  let S = Number(param.S0);
  let P = Number(param.P0);

  const tf = Number(param.tf);
  const dt = Number(param.dt);
  const muMax = Number(param.muMax);
  const Ks = Number(param.Ks);
  const Yxs = Number(param.Yxs);
  const alpha = Number(param.alpha);
  const beta = Number(param.beta);

  for (let t = 0; t <= tf; t += dt) {
    tempo.push(Number(t.toFixed(2)));
    biomassa.push(X);
    substrato.push(S);
    produto.push(P);

    const mu = muMax * S / (Ks + S + 1e-9);

    const dX = mu * X * dt;
    const dS = -(1 / Yxs) * dX;
    const dP = (alpha * mu * X + beta * X) * dt;

    X = Math.max(0, X + dX);
    S = Math.max(0, S + dS);
    P = Math.max(0, P + dP);

    if (S <= 0.0001) {
      S = 0;
    }
  }

  return { tempo, biomassa, substrato, produto };
}

function montarFigura(param) {
  const resultado = simularBiorreator(param);

  const data = [
    {
      x: resultado.tempo,
      y: resultado.biomassa,
      type: "scatter",
      mode: "lines",
      name: "Biomassa (X)",
      line: { width: 3 }
    },
    {
      x: resultado.tempo,
      y: resultado.substrato,
      type: "scatter",
      mode: "lines",
      name: "Substrato (S)",
      line: { width: 3, dash: "dot" }
    },
    {
      x: resultado.tempo,
      y: resultado.produto,
      type: "scatter",
      mode: "lines",
      name: "Produto (P)",
      line: { width: 3, dash: "dash" }
    }
  ];

  const layout = {
    title: "Simulador simples de biorreator",
    xaxis: {
      title: "Tempo (h)",
      zeroline: false
    },
    yaxis: {
      title: "Concentração (g/L)",
      zeroline: false
    },
    hovermode: "x unified",
    template: "plotly_white",
    legend: {
      orientation: "h",
      x: 0,
      y: 1.12
    },
    margin: {
      l: 60,
      r: 25,
      t: 70,
      b: 55
    },
    annotations: [
      {
        xref: "paper",
        yref: "paper",
        x: 1,
        y: -0.2,
        showarrow: false,
        text:
          "Modelo: μ = μmax·S/(Ks+S) | produção associada ao crescimento e manutenção",
        font: { size: 12, color: "#666" }
      }
    ]
  };

  return { data, layout };
}

function garantirControles() {
  const idPainel = "painel-biorreator-gsplotly";
  let painel = document.getElementById(idPainel);

  if (!painel) {
    const alvo = document.querySelector(".container");
    if (!alvo) return;

    alvo.insertAdjacentHTML(
      "beforebegin",
      `
      <div id="${idPainel}" style="
        margin: 10px 0 16px 0;
        padding: 14px 16px;
        border: 1px solid #d9e2ea;
        border-radius: 12px;
        background: #f8fbfd;
        font-family: Arial, sans-serif;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      ">
        <div style="font-weight: bold; margin-bottom: 12px; font-size: 15px;">
          Controles do biorreator
        </div>

        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px 16px;
          align-items: end;
        ">
          <label style="display:block;">
            <div style="font-size:13px; margin-bottom:4px;">Biomassa inicial X₀ (g/L)</div>
            <input id="bio_X0" type="range" min="0.05" max="3" step="0.05" value="${valoresPadrao.X0}" style="width:100%;">
            <div id="bio_X0_val" style="font-size:12px; color:#555;"></div>
          </label>

          <label style="display:block;">
            <div style="font-size:13px; margin-bottom:4px;">Substrato inicial S₀ (g/L)</div>
            <input id="bio_S0" type="range" min="1" max="60" step="1" value="${valoresPadrao.S0}" style="width:100%;">
            <div id="bio_S0_val" style="font-size:12px; color:#555;"></div>
          </label>

          <label style="display:block;">
            <div style="font-size:13px; margin-bottom:4px;">Produto inicial P₀ (g/L)</div>
            <input id="bio_P0" type="range" min="0" max="10" step="0.1" value="${valoresPadrao.P0}" style="width:100%;">
            <div id="bio_P0_val" style="font-size:12px; color:#555;"></div>
          </label>

          <label style="display:block;">
            <div style="font-size:13px; margin-bottom:4px;">μmax (1/h)</div>
            <input id="bio_muMax" type="range" min="0.05" max="1.2" step="0.01" value="${valoresPadrao.muMax}" style="width:100%;">
            <div id="bio_muMax_val" style="font-size:12px; color:#555;"></div>
          </label>

          <label style="display:block;">
            <div style="font-size:13px; margin-bottom:4px;">Tempo final (h)</div>
            <input id="bio_tf" type="range" min="5" max="80" step="1" value="${valoresPadrao.tf}" style="width:100%;">
            <div id="bio_tf_val" style="font-size:12px; color:#555;"></div>
          </label>

          <div style="display:flex; gap:8px; align-items:end;">
            <button id="bio_reset" style="
              padding: 9px 12px;
              border: 1px solid #c9d7e1;
              border-radius: 8px;
              background: white;
              cursor: pointer;
            ">Resetar</button>
          </div>
        </div>
      </div>
      `
    );
  }

  const ids = ["bio_X0", "bio_S0", "bio_P0", "bio_muMax", "bio_tf"];

  function lerParametros() {
    return {
      X0: Number(document.getElementById("bio_X0").value),
      S0: Number(document.getElementById("bio_S0").value),
      P0: Number(document.getElementById("bio_P0").value),
      muMax: Number(document.getElementById("bio_muMax").value),
      tf: Number(document.getElementById("bio_tf").value),
      Ks: valoresPadrao.Ks,
      Yxs: valoresPadrao.Yxs,
      alpha: valoresPadrao.alpha,
      beta: valoresPadrao.beta,
      dt: valoresPadrao.dt
    };
  }

  function atualizarTextos() {
    document.getElementById("bio_X0_val").textContent = Number(document.getElementById("bio_X0").value).toFixed(2);
    document.getElementById("bio_S0_val").textContent = Number(document.getElementById("bio_S0").value).toFixed(0);
    document.getElementById("bio_P0_val").textContent = Number(document.getElementById("bio_P0").value).toFixed(1);
    document.getElementById("bio_muMax_val").textContent = Number(document.getElementById("bio_muMax").value).toFixed(2);
    document.getElementById("bio_tf_val").textContent = Number(document.getElementById("bio_tf").value).toFixed(0);
  }

  function atualizarGrafico() {
    atualizarTextos();
    const figura = montarFigura(lerParametros());
    if (window.Plotly && document.getElementById("grafico")) {
      Plotly.react("grafico", figura.data, figura.layout, config);
    }
  }

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el.dataset.vinculado) {
      el.addEventListener("input", atualizarGrafico);
      el.dataset.vinculado = "sim";
    }
  });

  const botaoReset = document.getElementById("bio_reset");
  if (botaoReset && !botaoReset.dataset.vinculado) {
    botaoReset.addEventListener("click", function () {
      document.getElementById("bio_X0").value = valoresPadrao.X0;
      document.getElementById("bio_S0").value = valoresPadrao.S0;
      document.getElementById("bio_P0").value = valoresPadrao.P0;
      document.getElementById("bio_muMax").value = valoresPadrao.muMax;
      document.getElementById("bio_tf").value = valoresPadrao.tf;
      atualizarGrafico();
    });
    botaoReset.dataset.vinculado = "sim";
  }

  atualizarTextos();
  setTimeout(atualizarGrafico, 120);
}

setTimeout(garantirControles, 120);

const figuraInicial = montarFigura(valoresPadrao);
return {
  data: figuraInicial.data,
  layout: figuraInicial.layout
};