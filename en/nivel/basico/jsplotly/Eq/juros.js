const C = 1000;  // capital inicial
const i = 0.05;  // taxa de juros (3% ao mês)
const tMax = 24; // tempo total em meses

const x_values = [];
const y_values = [];

for (let t = 0; t <= tMax; t++) {
    x_values.push(t);
    y_values.push(C * Math.pow(1 + i, t));
}

const layout = {
    title: "Montante com Juros Compostos (3% ao mês)",
    xaxis: { title: "Tempo (meses)" },
    yaxis: { title: "Montante (R$)" }
};

return { x_values, y_values, layout };
