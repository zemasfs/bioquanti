// Parâmetros iniciais
let K = 1000;    // Capacidade de suporte
let N0 = 100;     // População inicial
let r = 0.04;     // Taxa de crescimento
let t0 = 30;     // Retardo (fase lag)

const t_values = Array.from({ length: 300 }, (_, i) => i * 0.2);  // tempo de 0 a 60

function calcularPopulacao(t, r, K, N0, t0) {
    const atraso = 1 / (1 + Math.exp(-0.5 * (t - t0)));
    const Nt = K / (1 + ((K - N0) / N0) * Math.exp(-r * atraso * t));
    return Nt;
}

const N_values = t_values.map(t => calcularPopulacao(t, r, K, N0, t0));

// Gera cor aleatória
function corAleatoria() {
    const cores = ['red', 'blue', 'green', 'orange', 'purple', 'brown', 'pink', 'black', 'teal'];
    return cores[Math.floor(Math.random() * cores.length)];
}

const trace = {
    x: t_values,
    y: N_values,
    type: 'scatter',
    mode: 'lines',
    line: { color: corAleatoria() },
    name: `K=${K}, r=${r}, t₀=${t0}`
};

const layout = {
    title: 'Crescimento Populacional com Fase Lag (Modelo logístico com retardo)',
    xaxis: { title: 'Tempo (h)', range: [0, 60] },
    yaxis: { title: 'População (N)', range: [0, K * 1.1] },
    showlegend: true
};

return { trace, layout };
