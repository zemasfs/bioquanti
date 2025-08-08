const pKa = {
    Asp: 3.9, Glu: 4.1, His: 6.0,
    Cys: 8.3, Tyr: 10.1, Lys: 10.5,
    Arg: 12.5
};

const tipoGrupo = {
    Asp: "acido", Glu: "acido", Cys: "acido", Tyr: "acido",
    His: "base", Lys: "base", Arg: "base"
};

const sequenciaStr = "Asp,Glu,His,Arg,Cys,Tyr,Lys,Val,Leu,Thr,Ser,Gly,Pro";
const seq = sequenciaStr.replace(/\s+/g, '').split(',');

// Função de carga por pH
function calcularCargas(pH) {
    return seq.map(aa => {
        if (!(aa in pKa)) return 0;
        const pk = pKa[aa];
        const tipo = tipoGrupo[aa];
        const delta = tipo === "acido" ? pk - pH : pH - pk;
        const carga = 1 / (1 + Math.pow(10, delta));
        return tipo === "acido" ? -carga : +carga;
    });
}

const x_values = Array.from({ length: seq.length }, (_, i) => i + 1);

// Dados iniciais
let pH_inicial = 7.0;
let y_values = calcularCargas(pH_inicial);
let cargaTotal = y_values.reduce((a, b) => a + b, 0).toFixed(2);

// Gráfico inicial
let trace = [{
    x: x_values,
    y: y_values,
    type: 'bar',
    marker: { color: 'teal' }
}];

let layout = {
    title: `Carga por Resíduo — pH: ${pH_inicial.toFixed(2)} | Carga Líquida: ${cargaTotal}`,
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
    },
    sliders: [{
        pad: { t: 30 },
        currentvalue: {
            prefix: "pH = ",
            font: { size: 16 }
        },
        steps: []
    }]
};

// Criar passos do slider
let steps = [];
for (let ph = 2.0; ph <= 11.0; ph += 0.1) {
    let pHval = parseFloat(ph.toFixed(2));
    let y_temp = calcularCargas(pHval);
    let total = y_temp.reduce((a, b) => a + b, 0).toFixed(2);

    steps.push({
        label: pHval.toFixed(1),
        method: 'update',
        args: [
            { y: [y_temp] },
            { title: `Carga por Resíduo — pH: ${pHval.toFixed(2)} | Carga Líquida: ${total}` }
        ]
    });
}

layout.sliders[0].steps = steps;

return { trace, layout };
