// Curva de desnaturação de DNA com efeito de trehalose (estabilizante) e guanidina (desestabilizante)

// Parâmetros base
const Tm = 40; // Temperatura de fusão padrão (sem osmólito)

// Efeitos sobre a inclinação da curva
const trehalose_mM = 100; // concentração de trehalose (estabilizante)
const guanidina_mM = 500; // concentração de GuHCl (desestabilizante)

const beta0 = 5; // parâmetro base de transição
const beta = beta0 * (1 + 0.005 * guanidina_mM - 0.003 * trehalose_mM);

// Geração dos pontos de temperatura
const x_values = Array.from({ length: 200 }, (_, i) => i * (100 / 199));
const y_values = x_values.map(T => 1 / (1 + Math.exp(-(T - Tm) / beta)));

const layout = {
    title: `Desnaturação de DNA: Tm=${Tm.toFixed(1)}°C, β=${beta.toFixed(2)} (Trehalose: ${trehalose_mM} mM, GuHCl: ${guanidina_mM} mM)`,
    xaxis: { title: "Temperatura (°C)", range: [0, 100] },
    yaxis: { title: "Fração de DNA Desnaturado", range: [0, 1] }
};

return {
    x_values,
    y_values,
    layout
};
