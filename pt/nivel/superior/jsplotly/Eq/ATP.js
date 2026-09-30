// Simulação da síntese de ATP a partir de ADP + Pi em função do pH

const R = 8.314; // J/mol·K
const T = 310;   // temperatura fisiológica (K)
const DG0 = 30500; // ΔG°' da síntese de ATP (inverso da hidrólise), em J/mol

// Concentrações iniciais (mol/L)
const ADP = 0.001; // 1 mM
const Pi = 0.001;  // 1 mM

// Eixo x: pH de 6,0 a 8,0
const x_values = Array.from({ length: 200 }, (_, i) => 6 + 2 * i / 199);

// Cálculo da constante de equilíbrio K = [ATP]/([ADP][Pi])
// Rearranjo: [ATP] = K × [ADP] × [Pi]
const y_values = x_values.map(pH => {
    const deltaG = DG0 - 2.303 * R * T * pH; // J/mol
    const K = Math.exp(-deltaG / (R * T));
    const ATP = K * ADP * Pi; // mol/L
    return ATP * 1000; // converte para mM
});

const layout = {
    title: "Síntese de ATP a partir de ADP + Pi em função do pH",
    xaxis: { title: "pH", range: [6, 8] },
    yaxis: { title: "[ATP] formada (mM)" }
};

return {
    x_values,
    y_values,
    layout
};