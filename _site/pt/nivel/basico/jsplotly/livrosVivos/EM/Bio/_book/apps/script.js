// ==========================================
// ECOLOGIA - VERSAO EDITORIAL
// DINAMICA POPULACIONAL, FASE E PIRAMIDES
// ==========================================

// ------------------------------------------
// PARAMETROS NUMERICOS
// ------------------------------------------
const tMax = 100;
const dt = 1;

// ------------------------------------------
// CENARIOS ECOLOGICOS
// ------------------------------------------
const cenarios = [
  {
    nome: "Predacao",
    presa0: 45,
    pred0: 12,
    rPresa: 0.18,
    Kpresa: 120,
    ataque: 0.015,
    eficiencia: 0.004,
    mortePred: 0.12
  },
  {
    nome: "Competicao",
    presa0: 55,
    pred0: 40,
    rPresa: 0.12,
    Kpresa: 140,
    rPred: 0.10,
    Kpred: 110,
    compAB: 0.004,
    compBA: 0.003
  },
  {
    nome: "Mutualismo",
    presa0: 30,
    pred0: 24,
    rPresa: 0.08,
    Kpresa: 100,
    rPred: 0.07,
    Kpred: 90,
    beneficioAB: 0.0018,
    beneficioBA: 0.0015
  },
  {
    nome: "Parasitismo",
    presa0: 65,
    pred0: 10,
    rHosp: 0.14,
    Khosp: 150,
    dano: 0.006,
    ganhoPar: 0.0025,
    mortalidadePar: 0.08
  }
];

// ------------------------------------------
// SIMULACAO
// ------------------------------------------
function simularEcologia(cfg) {
  const t = [];
  const presas = [];
  const predadores = [];

  let presa = cfg.presa0;
  let pred = cfg.pred0;

  for (let tempo = 0; tempo <= tMax; tempo += dt) {
    t.push(tempo);
    presas.push(presa);
    predadores.push(pred);

    let novaPresa = presa;
    let novoPred = pred;

    if (cfg.nome === "Predacao") {
      const crescimentoPresa = cfg.rPresa * presa * (1 - presa / cfg.Kpresa);
      const perdaPorPredacao = cfg.ataque * presa * pred;
      const crescimentoPred = cfg.eficiencia * presa * pred;
      const mortePred = cfg.mortePred * pred;

      novaPresa = presa + crescimentoPresa - perdaPorPredacao;
      novoPred = pred + crescimentoPred - mortePred;
    }

    if (cfg.nome === "Competicao") {
      const crescimentoA = cfg.rPresa * presa * (1 - (presa + cfg.compAB * pred) / cfg.Kpresa);
      const crescimentoB = cfg.rPred * pred * (1 - (pred + cfg.compBA * presa) / cfg.Kpred);

      novaPresa = presa + crescimentoA;
      novoPred = pred + crescimentoB;
    }

    if (cfg.nome === "Mutualismo") {
      const crescimentoA = cfg.rPresa * presa * (1 - presa / cfg.Kpresa);
      const crescimentoB = cfg.rPred * pred * (1 - pred / cfg.Kpred);

      const ganhoA = cfg.beneficioAB * presa * pred;
      const ganhoB = cfg.beneficioBA * presa * pred;

      novaPresa = presa + crescimentoA + ganhoA;
      novoPred = pred + crescimentoB + ganhoB;
    }

    if (cfg.nome === "Parasitismo") {
      const crescimentoHosp = cfg.rHosp * presa * (1 - presa / cfg.Khosp);
      const danoHosp = cfg.dano * presa * pred;
      const ganhoPar = cfg.ganhoPar * presa * pred;
      const perdaPar = cfg.mortalidadePar * pred;

      novaPresa = presa + crescimentoHosp - danoHosp;
      novoPred = pred + ganhoPar - perdaPar;
    }

    presa = Math.max(0, Math.min(200, novaPresa));
    pred = Math.max(0, Math.min(200, novoPred));

    if (!isFinite(presa)) presa = 0;
    if (!isFinite(pred)) pred = 0;
  }

  const produtores = Math.max(...presas);
  const consumidores1 = produtores * 0.10;
  const consumidores2 = consumidores1 * 0.10;

  const biomassaProd = produtores * 0.85;
  const biomassaC1 = consumidores1 * 0.70;
  const biomassaC2 = consumidores2 * 0.50;

  return {
    t: t,
    presas: presas,
    predadores: predadores,
    energia: [produtores, consumidores1, consumidores2],
    biomassa: [biomassaProd, biomassaC1, biomassaC2]
  };
}

// ------------------------------------------
// GERAR DADOS
// ------------------------------------------
const sims = cenarios.map(simularEcologia);

const sim0 = sims[0];
const sim1 = sims[1];
const sim2 = sims[2];
const sim3 = sims[3];

const todasPresas = [].concat(sim0.presas, sim1.presas, sim2.presas, sim3.presas);
const todosPred = [].concat(sim0.predadores, sim1.predadores, sim2.predadores, sim3.predadores);
const popMax = Math.max(...todasPresas, ...todosPred) * 1.12;

// ------------------------------------------
// ANOTACOES
// ------------------------------------------
function anotacoesBase(nome, tempoAtual) {
  return [
    {
      text: "Relacao ecologica: " + nome,
      x: 0.01,
      y: 1.12,
      xref: "paper",
      yref: "paper",
      showarrow: false,
      font: { size: 13 }
    },
    {
      text: "t = " + tempoAtual,
      x: 0.99,
      y: 1.12,
      xref: "paper",
      yref: "paper",
      xanchor: "right",
      showarrow: false,
      font: { size: 13 }
    }
  ];
}

// ------------------------------------------
// TRACES INICIAIS
// ------------------------------------------
const tracePresas = {
  x: sim0.t,
  y: sim0.presas,
  type: "scatter",
  mode: "lines",
  name: "Populacao A",
  xaxis: "x1",
  yaxis: "y1"
};

const tracePred = {
  x: sim0.t,
  y: sim0.predadores,
  type: "scatter",
  mode: "lines",
  name: "Populacao B",
  xaxis: "x1",
  yaxis: "y1"
};

const tracePontoPresas = {
  x: [sim0.t[0]],
  y: [sim0.presas[0]],
  type: "scatter",
  mode: "markers",
  name: "Instante A",
  marker: { size: 10 },
  xaxis: "x1",
  yaxis: "y1",
  showlegend: false
};

const tracePontoPred = {
  x: [sim0.t[0]],
  y: [sim0.predadores[0]],
  type: "scatter",
  mode: "markers",
  name: "Instante B",
  marker: { size: 10 },
  xaxis: "x1",
  yaxis: "y1",
  showlegend: false
};

const traceFase = {
  x: sim0.presas,
  y: sim0.predadores,
  type: "scatter",
  mode: "lines",
  name: "Diagrama de fase",
  xaxis: "x2",
  yaxis: "y2"
};

const traceFasePonto = {
  x: [sim0.presas[0]],
  y: [sim0.predadores[0]],
  type: "scatter",
  mode: "markers",
  marker: { size: 11 },
  name: "Estado atual",
  xaxis: "x2",
  yaxis: "y2",
  showlegend: false
};

const traceEnergia = {
  x: ["Produtores", "C1", "C2"],
  y: sim0.energia,
  type: "bar",
  name: "Energia",
  xaxis: "x3",
  yaxis: "y3"
};

const traceBiomassa = {
  x: ["Produtores", "C1", "C2"],
  y: sim0.biomassa,
  type: "bar",
  name: "Biomassa",
  xaxis: "x3",
  yaxis: "y3"
};

// ------------------------------------------
// FRAMES
// ------------------------------------------
const frames = [];

function gerarFrames(sim, prefixo, nomeExibido) {
  const nomes = [];

  for (let i = 0; i < sim.t.length; i += 1) {
    const nomeFrame = prefixo + "_" + i;
    nomes.push(nomeFrame);

    frames.push({
      name: nomeFrame,
      data: [
        {}, // tracePresas
        {}, // tracePred
        { x: [sim.t[i]], y: [sim.presas[i]] },
        { x: [sim.t[i]], y: [sim.predadores[i]] },
        {}, // traceFase
        { x: [sim.presas[i]], y: [sim.predadores[i]] },
        {}, // traceEnergia
        {}  // traceBiomassa
      ],
      layout: {
        annotations: anotacoesBase(nomeExibido, sim.t[i].toFixed(0))
      }
    });
  }

  return nomes;
}

const framesPredacao = gerarFrames(sim0, "predacao", "Predacao");
const framesCompeticao = gerarFrames(sim1, "competicao", "Competicao");
const framesMutualismo = gerarFrames(sim2, "mutualismo", "Mutualismo");
const framesParasitismo = gerarFrames(sim3, "parasitismo", "Parasitismo");

// ------------------------------------------
// LAYOUT
// ------------------------------------------
const layout = {
  title: "Ecologia: dinamica populacional e fluxo trofico",

  annotations: anotacoesBase("Predacao", "0"),

  margin: {
    t: 135,
    l: 70,
    r: 30,
    b: 70
  },

  showlegend: true,
  legend: {
    orientation: "h",
    x: 0.18,
    y: 1.05
  },

  barmode: "group",

  // Painel 1 - series temporais
  xaxis: {
    domain: [0.00, 0.48],
    anchor: "y",
    title: "tempo"
  },
  yaxis: {
    domain: [0.42, 1.00],
    anchor: "x",
    title: "populacao",
    range: [0, popMax]
  },

  // Painel 2 - fase
  xaxis2: {
    domain: [0.56, 1.00],
    anchor: "y2",
    title: "populacao A",
    range: [0, popMax]
  },
  yaxis2: {
    domain: [0.42, 1.00],
    anchor: "x2",
    title: "populacao B",
    range: [0, popMax]
  },

  // Painel 3 - piramides
  xaxis3: {
    domain: [0.12, 0.88],
    anchor: "y3",
    title: "niveis troficos"
  },
  yaxis3: {
    domain: [0.00, 0.23],
    anchor: "x3",
    title: "quantidade relativa",
    range: [0, popMax]
  },

  updatemenus: [
    {
      type: "buttons",
      direction: "right",
      x: 0.06,
      y: 1.24,
      xanchor: "left",
      yanchor: "top",
      buttons: [
        {
          label: "Predacao",
          method: "update",
          args: [
            {
              x: [
                sim0.t,
                sim0.t,
                [sim0.t[0]],
                [sim0.t[0]],
                sim0.presas,
                [sim0.presas[0]],
                ["Produtores", "C1", "C2"],
                ["Produtores", "C1", "C2"]
              ],
              y: [
                sim0.presas,
                sim0.predadores,
                [sim0.presas[0]],
                [sim0.predadores[0]],
                sim0.predadores,
                [sim0.predadores[0]],
                sim0.energia,
                sim0.biomassa
              ]
            },
            {
              annotations: anotacoesBase("Predacao", "0")
            }
          ]
        },
        {
          label: "Competicao",
          method: "update",
          args: [
            {
              x: [
                sim1.t,
                sim1.t,
                [sim1.t[0]],
                [sim1.t[0]],
                sim1.presas,
                [sim1.presas[0]],
                ["Produtores", "C1", "C2"],
                ["Produtores", "C1", "C2"]
              ],
              y: [
                sim1.presas,
                sim1.predadores,
                [sim1.presas[0]],
                [sim1.predadores[0]],
                sim1.predadores,
                [sim1.predadores[0]],
                sim1.energia,
                sim1.biomassa
              ]
            },
            {
              annotations: anotacoesBase("Competicao", "0")
            }
          ]
        },
        {
          label: "Mutualismo",
          method: "update",
          args: [
            {
              x: [
                sim2.t,
                sim2.t,
                [sim2.t[0]],
                [sim2.t[0]],
                sim2.presas,
                [sim2.presas[0]],
                ["Produtores", "C1", "C2"],
                ["Produtores", "C1", "C2"]
              ],
              y: [
                sim2.presas,
                sim2.predadores,
                [sim2.presas[0]],
                [sim2.predadores[0]],
                sim2.predadores,
                [sim2.predadores[0]],
                sim2.energia,
                sim2.biomassa
              ]
            },
            {
              annotations: anotacoesBase("Mutualismo", "0")
            }
          ]
        },
        {
          label: "Parasitismo",
          method: "update",
          args: [
            {
              x: [
                sim3.t,
                sim3.t,
                [sim3.t[0]],
                [sim3.t[0]],
                sim3.presas,
                [sim3.presas[0]],
                ["Produtores", "C1", "C2"],
                ["Produtores", "C1", "C2"]
              ],
              y: [
                sim3.presas,
                sim3.predadores,
                [sim3.presas[0]],
                [sim3.predadores[0]],
                sim3.predadores,
                [sim3.predadores[0]],
                sim3.energia,
                sim3.biomassa
              ]
            },
            {
              annotations: anotacoesBase("Parasitismo", "0")
            }
          ]
        }
      ]
    },

    {
      type: "buttons",
      direction: "right",
      x: 0.18,
      y: 1.12,
      xanchor: "left",
      yanchor: "top",
      buttons: [
        {
          label: "Animar Predacao",
          method: "animate",
          args: [
            framesPredacao,
            {
              fromcurrent: false,
              frame: { duration: 85, redraw: true },
              transition: { duration: 0 }
            }
          ]
        },
        {
          label: "Animar Competicao",
          method: "animate",
          args: [
            framesCompeticao,
            {
              fromcurrent: false,
              frame: { duration: 85, redraw: true },
              transition: { duration: 0 }
            }
          ]
        },
        {
          label: "Animar Mutualismo",
          method: "animate",
          args: [
            framesMutualismo,
            {
              fromcurrent: false,
              frame: { duration: 85, redraw: true },
              transition: { duration: 0 }
            }
          ]
        },
        {
          label: "Animar Parasitismo",
          method: "animate",
          args: [
            framesParasitismo,
            {
              fromcurrent: false,
              frame: { duration: 85, redraw: true },
              transition: { duration: 0 }
            }
          ]
        }
      ]
    }
  ]
};

// ------------------------------------------
// RETORNO
// ------------------------------------------
return {
  data: [
    tracePresas,
    tracePred,
    tracePontoPresas,
    tracePontoPred,
    traceFase,
    traceFasePonto,
    traceEnergia,
    traceBiomassa
  ],
  layout: layout,
  frames: frames
};