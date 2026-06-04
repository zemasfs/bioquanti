const cenario = "Impulso"; 
// "MRU", "MUV", "Forca constante", "Freada", "Impulso"

const m = 2.0;
const x0 = 0.0;
const v0 = 5.0;

const aConst = 1.0;
const Fconst = 40.0;

const tImp = 5.0;
const dtImp = 0.5;
const J = -6.0;

const dt = 0.05;
const tMax = 10.0;

const t = [];
const x = [];
const v = [];
const a = [];
const F = [];

let xAtual = x0;
let vAtual = v0;

for (let tempo = 0; tempo <= tMax; tempo += dt) {
  let forca = 0;
  let aceleracao = 0;

  if (cenario === "MRU") {
    forca = 0;
    aceleracao = 0;
  }

  if (cenario === "MUV") {
    aceleracao = aConst;
    forca = m * aceleracao;
  }

  if (cenario === "Forca constante") {
    forca = Fconst;
    aceleracao = forca / m;
  }

  if (cenario === "Freada") {
    aceleracao = -Math.abs(aConst);
    forca = m * aceleracao;
  }

  if (cenario === "Impulso") {
    forca = 0;
    aceleracao = 0;

    if (tempo >= tImp && tempo <= tImp + dtImp) {
      forca = J / dtImp;
      aceleracao = forca / m;
    }
  }

  vAtual = vAtual + aceleracao * dt;
  xAtual = xAtual + vAtual * dt;

  t.push(tempo);
  x.push(xAtual);
  v.push(vAtual);
  a.push(aceleracao);
  F.push(forca);
}

const traces = [
  {
    x: t,
    y: x,
    type: "scatter",
    mode: "lines",
    name: "posicao x(t)",
    xaxis: "x1",
    yaxis: "y1"
  },
  {
    x: t,
    y: v,
    type: "scatter",
    mode: "lines",
    name: "velocidade v(t)",
    xaxis: "x2",
    yaxis: "y2"
  },
  {
    x: t,
    y: a,
    type: "scatter",
    mode: "lines",
    name: "aceleracao a(t)",
    xaxis: "x3",
    yaxis: "y3"
  },
  {
    x: t,
    y: F,
    type: "scatter",
    mode: "lines",
    name: "forca F(t)",
    xaxis: "x4",
    yaxis: "y4"
  }
];

const layout = {
  title: "Mecanica integrada",
  grid: { rows: 2, columns: 2, pattern: "independent" },

  xaxis: { title: "tempo (s)" },
  yaxis: { title: "posicao (m)" },

  xaxis2: { title: "tempo (s)" },
  yaxis2: { title: "velocidade (m/s)" },

  xaxis3: { title: "tempo (s)" },
  yaxis3: { title: "aceleracao (m/s^2)" },

  xaxis4: { title: "tempo (s)" },
  yaxis4: { title: "forca (N)" },

  showlegend: true
};

return { data: traces, layout: layout };