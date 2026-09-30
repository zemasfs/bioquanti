// Aminoácidos com grupos ionizáveis e seus pKa
const pKa = {
    Asp: 3.9, Glu: 4.1, His: 6.0,
    Cys: 8.3, Tyr: 10.1, Lys: 10.5,
    Arg: 12.5
};

const tipoGrupo = {
    Asp: "acido", Glu: "acido", Cys: "acido", Tyr: "acido",
    His: "base", Lys: "base", Arg: "base"
};

// Sequência da Angiotensina II
const sequenciaStr = "Asp,Arg,Val,Tyr,Ile,His,Pro,Phe";
const seq = sequenciaStr.split(",");

// Geração do controle deslizante (slider) de pH
const slider = document.createElement("input");
slider.type = "range";
slider.min = 0;
slider.max = 14;
slider.step = 0.1;
slider.value = 7.0;
slider.style.width = "100%";

const sliderLabel = document.createElement("label");
sliderLabel.innerHTML = `pH: ${slider.value}`;
sliderLabel.style.marginRight = "1em";

// Inserção no painel
let painel = document.getElementById("inputs") || document.body;
painel.appendChild(document.createElement("br"));
painel.appendChild(sliderLabel);
painel.appendChild(slider);

// Função para calcular a carga de um resíduo em dado pH
function carga(aa, pH) {
    if (!(aa in pKa)) return 0;
    const pk = pKa[aa];
    const tipo = tipoGrupo[aa];
    const expoente = tipo === "acido" ? pk - pH : pH - pk;
    const fracao = 1 / (1 + Math.pow(10, expoente));
    return tipo === "acido" ? -fracao : +fracao;
}

// Coordenadas iniciais
let pH = parseFloat(slider.value);
let x_values = Array.from({ length: seq.length }, (_, i) => i + 1);
let y_values = seq.map(aa => carga(aa, pH));

// Definição do traço
let trace = {
    x: x_values,
    y: y_values,
    mode: "lines+markers",
    type: "scatter",
    marker: { color: "blue", size: 10 },
    line: { color: "gray" }
};

// Layout inicial
let layout = {
    title: `Carga dos resíduos da Angiotensina II em pH ${pH}`,
    xaxis: {
        title: 'Posição na sequência',
        tickmode: 'array',
        tickvals: x_values,
        ticktext: seq,
        tickangle: 45
    },
    yaxis: {
        title: 'Carga elétrica',
        zeroline: true
    }
};

// Atualização dinâmica ao mover o slider
slider.addEventListener("input", () => {
    pH = parseFloat(slider.value);
    sliderLabel.innerHTML = `pH: ${pH}`;
    y_values = seq.map(aa => carga(aa, pH));
    trace.y = y_values;
    layout.title = `Carga dos resíduos da Angiotensina II em pH ${pH}`;
});


// Retorno para JSPlotly
return { trace, layout };
