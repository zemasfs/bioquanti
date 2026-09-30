// Curva de Titulação de Ácido Diprótico

const pKa1 = 4.85;
const pKa2 = 9.22;
const x_values = Array.from({length: 200}, (_, i) => i * (14 / 199));
const y_values = x_values.map(pH =>
    (1 / (1 + Math.pow(10, pKa1 - pH))) + (1 / (1 + Math.pow(10, pKa2 - pH)))
);
return {
    x_values,
    y_values,
    layout: {
        title: { text: "Titulação de ácido diprótico" },
        xaxis: { title: { text: "pH" } },
        yaxis: { title: { text: "mol de H+ dissociados" } }
    }
};
