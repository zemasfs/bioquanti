// Curva de desnaturação de DNA com efeitos de osmólito (Tm), trealose (estabilizante) e GuHCl (desestabilizante)

// Parâmetros base
const Tm_base = 60; // Temperatura de fusão sem proteção
const osm_poder = 0.7; // efeito do osmólito no deslocamento de Tm (0 a 1)
const delta_Tm = 15 * osm_poder;
const Tm = Tm_base + delta_Tm;

// Efeitos sobre a inclinação da curva
const trehalose_mM = 100; // concentração de trealose (estabilizante)
const guanidina_mM = 200; // concentração de GuHCl (desestabilizante)

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
