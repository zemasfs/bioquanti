// Funções Trigonométricas Interativas

const N = 500;
const xmin = -2 * Math.PI;
const xmax = 2 * Math.PI;

function gerarDados(omega, func) {
    const x = [], y = [];
    for (let i = 0; i <= N; i++) {
        const xi = xmin + (i / N) * (xmax - xmin);
        x.push(xi);
        let yi;
        if (func === "sen") yi = Math.sin(omega * xi);
        else if (func === "cos") yi = Math.cos(omega * xi);
        else if (func === "tan") {
            const t = Math.tan(omega * xi);
            yi = Math.abs(t) > 10 ? null : t;
        }
        y.push(yi);
    }
    return { x, y };
}

const funcInicial = "sen";
const omegaInicial = 1;
const dados = gerarDados(omegaInicial, funcInicial);

const trace = {
    x: dados.x,
    y: dados.y,
    type: 'scatter',
    mode: 'lines',
    name: `${funcInicial}(ωx)`
};

const layout = {
    title: `Função ${funcInicial}: y = ${funcInicial}(ωx)`,
    xaxis: { title: 'x', range: [xmin, xmax] },
    yaxis: { title: 'y', range: [-2, 2] },
    updatemenus: [{
        buttons: ['sen', 'cos', 'tan'].map(func => ({
            label: `${func}(ωx)`,
            method: 'update',
            args: [
                (() => {
                    const dados = gerarDados(omegaInicial, func);
                    const rangeY = func === "tan" ? [-10, 10] : [-2, 2];
                    return {
                        x: [dados.x],
                        y: [dados.y],
                        name: `${func}(ωx)`
                    };
                })(),
                {
                    title: `Função ${func}: y = ${func}(ωx)`,
                    yaxis: { range: func === "tan" ? [-10, 10] : [-2, 2] },
                    sliders: [{
                        pad: { t: 50 },
                        currentvalue: {
                            visible: true,
                            prefix: `ω (${func}) = `,
                            font: { size: 14, color: '#000' }
                        },
                        steps: Array.from({ length: 9 }, (_, i) => {
                            const ω = i + 1;
                            const dados = gerarDados(ω, func);
                            return {
                                label: ω.toString(),
                                method: 'restyle',
                                args: [{
                                    x: [dados.x],
                                    y: [dados.y],
                                    name: `${func}(ωx)`
                                }]
                            };
                        })
                    }]
                }
            ]
        })),
        direction: 'down',
        showactive: true,
        x: 0.1,
        xanchor: 'left',
        y: 1.2,
        yanchor: 'top'
    }],
    sliders: [{
        pad: { t: 50 },
        currentvalue: {
            visible: true,
            prefix: 'ω (sen) = ',
            font: { size: 14, color: '#000' }
        },
        steps: Array.from({ length: 9 }, (_, i) => {
            const ω = i + 1;
            const dados = gerarDados(ω, "sen");
            return {
                label: ω.toString(),
                method: 'restyle',
                args: [{
                    x: [dados.x],
                    y: [dados.y],
                    name: `sen(${ω}x)`
                }]
            };
        })
    }]
};

return { trace, layout };