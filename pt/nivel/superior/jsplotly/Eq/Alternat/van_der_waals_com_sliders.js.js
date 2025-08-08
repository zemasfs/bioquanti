const R = 0.0821;
const V_values = Array.from({ length: 100 }, (_, i) => 0.5 + i * 0.05);

function calcularPressao(V, a, b, T) {
    return (R * T) / (V - b) - (a / (V * V));
}

function gerarDados(a, b, T) {
    const y = V_values.map(V => {
        const P = calcularPressao(V, a, b, T);
        return (P > 0 && isFinite(P)) ? P : null;
    });
    return { x: V_values, y };
}

let a0 = 1.7, b0 = 0.1, T0 = 300;
const { x, y } = gerarDados(a0, b0, T0);

const trace = {
    x: x,
    y: y,
    type: 'scatter',
    mode: 'lines',
    line: { color: 'blue' },
    name: 'Van der Waals'
};

function atualizarTitulo(a, b, T) {
    return `Van der Waals (T = ${T} K, a = ${a.toFixed(2)}, b = ${b.toFixed(2)})`;
}

const layout = {
    title: atualizarTitulo(a0, b0, T0),
    xaxis: { title: 'Volume (L)', range: [0, 5] },
    yaxis: { title: 'Pressão (atm)', range: [0, 50] },
    showlegend: false,
    sliders: [
        {
            active: 12,
            pad: { t: 40 },
            currentvalue: {
                visible: true,
                prefix: 'a (interação): ',
                font: { size: 14, color: '#000' }
            },
            len: 0.8,
            ticklen: 0,
            steps: Array.from({ length: 25 }, (_, i) => {
                const a = 0.5 + i * 0.2;
                const dados = gerarDados(a, b0, T0);
                return {
                    method: 'update',
                    label: '',
                    args: [
                        { x: [dados.x], y: [dados.y] },
                        { title: atualizarTitulo(a, b0, T0) }
                    ]
                };
            })
        },
        {
            active: 1,
            pad: { t: 90 },
            currentvalue: {
                visible: true,
                prefix: 'b (volume molar): ',
                font: { size: 14, color: '#000' }
            },
            len: 0.8,
            ticklen: 0,
            steps: Array.from({ length: 20 }, (_, i) => {
                const b = 0.01 + i * 0.05;
                const dados = gerarDados(a0, b, T0);
                return {
                    method: 'update',
                    label: '',
                    args: [
                        { x: [dados.x], y: [dados.y] },
                        { title: atualizarTitulo(a0, b, T0) }
                    ]
                };
            })
        },
        {
            active: 4,
            pad: { t: 140 },
            currentvalue: {
                visible: true,
                prefix: 'Temperatura (K): ',
                font: { size: 14, color: '#000' }
            },
            len: 0.8,
            ticklen: 0,
            steps: Array.from({ length: 13 }, (_, i) => {
                const T = 200 + i * 25;
                const dados = gerarDados(a0, b0, T);
                return {
                    method: 'update',
                    label: '',
                    args: [
                        { x: [dados.x], y: [dados.y] },
                        { title: atualizarTitulo(a0, b0, T) }
                    ]
                };
            })
        }
    ]
};

return { trace, layout };
