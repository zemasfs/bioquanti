// pKa dos grupos ionizáveis laterais
const pKa = {
    Asp: 3.9, Glu: 4.1, His: 6.0,
    Cys: 8.3, Tyr: 10.1, Lys: 10.5,
    Arg: 12.5
};

// Classificação: ácido (-) ou base (+)
const tipoGrupo = {
    Asp: "acido",
    Glu: "acido",
    Cys: "acido",
    Tyr: "acido",
    His: "base",
    Lys: "base",
    Arg: "base"
};

// pH fixo para análise
const pH = 7.5;

// Entrada do usuário
const sequenciaStr = "Asp,Glu,His,Arg,Cys,Tyr,Lys,Val,Leu,Thr,Ser,Gly,Pro";

// Processar sequência
const seq = sequenciaStr.replace(/\s+/g, '').split(',');

// Função para calcular carga de cada resíduo
function carga(aa) {
    if (!(aa in pKa)) return 0; // neutro

    const pk = pKa[aa];
    const tipo = tipoGrupo[aa];
    const delta = tipo === "acido" ? pk - pH : pH - pk;
    const carga = 1 / (1 + Math.pow(10, delta));
    return tipo === "acido" ? -carga : +carga;
}

const y_values = seq.map(carga);
const x_values = Array.from({ length: seq.length }, (_, i) => i + 1);

// Objeto trace para pontos + linha
const trace = {
    x: x_values,
    y: y_values,
    mode: "lines+markers",
    type: "scatter",
    marker: {size: 12 }
};

// Layout do gráfico
const layout = {
    title: `Carga de Resíduos em pH ${pH}`,
    xaxis: {
        title: 'Posição na Sequência',
        tickmode: 'array',
        tickvals: x_values,
        ticktext: seq,
        tickangle: 45
    },
    yaxis: {
        title: 'Carga Elétrica',
        zeroline: true
    }
};

return { trace, layout };
