const beta = 2.5;  // parâmetro de decaimento radial
const n = 100;
const x_values = [];
const y_values = [];
const Z = [];

for (let i = 0; i < n; i++) {
    let x = -10 + (20 * i) / (n - 1);
    x_values.push(x);
}

for (let j = 0; j < n; j++) {
    let y = -10 + (20 * j) / (n - 1);
    y_values.push(y);

    let row = [];
    for (let i = 0; i < n; i++) {
        let r = Math.sqrt(Math.pow(x_values[i], 2) + Math.pow(y, 2));
        let z = Math.cos(r) * Math.exp(-r / beta);
        row.push(z);
    }
    Z.push(row);
}

let trace = {
    x: x_values,
    y: y_values,
    z: Z,
    type: 'surface',
    colorscale: 'Viridis',
    name: 'Z = cos(r) · exp(-r/β)'
};

let layout = {
    title: 'Modelo Radial Amortecido — Potencial Biofísico com Decaimento',
    scene: {
        xaxis: { title: 'x (Å)' },
        yaxis: { title: 'y (Å)' },
        zaxis: { title: 'Z (Potencial Relativo)' }
    },
    autosize: true
};

return { trace, layout };
