const g = 9.8;
const v0 = 20; // velocidade inicial em m/s
const angleDeg = 45; // ângulo inicial (pode ser ajustado via slider)
const angleRad = angleDeg * Math.PI / 180;

// Tempo total de voo
const t_total = (2 * v0 * Math.sin(angleRad)) / g;

// Geração dos pontos
const x_values = [];
const y_values = [];
const N = 100;

for (let i = 0; i <= N; i++) {
    const t = (i / N) * t_total;
    const x = v0 * Math.cos(angleRad) * t;
    const y = v0 * Math.sin(angleRad) * t - 0.5 * g * t * t;
    x_values.push(x);
    y_values.push(y);
}

const trace = {
    x: x_values,
    y: y_values,
    mode: 'lines+markers',
    type: 'scatter',
    // ❌ Removido: line.color fixo
    name: "θ = " + angleDeg + "°"
};

const layout = {
    title: 'Lançamento Oblíquo: Trajetória da Pedra',
    xaxis: { title: 'Distância (m)', range: [0, Math.max(...x_values) * 1.1] },
    yaxis: { title: 'Altura (m)', range: [0, Math.max(...y_values) * 1.1] },
    sliders: [{
        pad: { t: 30 },
        currentvalue: {
            visible: true,
            prefix: 'Ângulo θ = ',
            suffix: '°',
            xanchor: 'right',
            font: { size: 14, color: '#000' }
        },
        steps: Array.from({ length: 10 }, (_, i) => {
            const deg = 15 + i * 9;
            const rad = deg * Math.PI / 180;
            const t_flight = (2 * v0 * Math.sin(rad)) / g;
            const x_vals = [];
            const y_vals = [];
            for (let j = 0; j <= N; j++) {
                const t = (j / N) * t_flight;
                x_vals.push(v0 * Math.cos(rad) * t);
                y_vals.push(v0 * Math.sin(rad) * t - 0.5 * g * t * t);
            }
            return {
                label: String(deg),
                method: 'restyle',
                args: [
                    {
                        x: [x_vals],
                        y: [y_vals],
                        name: "θ = " + deg + "°"
                    }
                ]
            };
        })
    }]
};

return { trace, layout };
