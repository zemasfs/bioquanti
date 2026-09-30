// Constantes padrão
const T0 = 298;              // Temperatura de referência (K)
const delta_H0 = -50000;     // Enthalpia padrão (J/mol)
const delta_S0 = -100;       // Entropia padrão (J/mol·K)
const delta_Cp = 1500;         // Capacidade calorífica ΔCp (J/mol·K) — pode variar para testar não linearidade

// Intervalo de temperatura
const T_values = [];
const G_values = [];
const T_min = 250;
const T_max = 500;
const n = 200;

for (let i = 0; i < n; i++) {
    const T = T_min + i * (T_max - T_min) / (n - 1);
    T_values.push(T);

    // Equação expandida de Gibbs-Helmholtz
    const delta_G = delta_H0 - T * delta_S0 + delta_Cp * (T - T0 - T * Math.log(T / T0));
    G_values.push(delta_G / 1000); // converter para kJ/mol
}

// Layout do gráfico
const layout = {
    title: 'Variação de Energia de Gibbs com Temperatura',
    xaxis: { title: 'Temperatura (K)', range: [T_min, T_max] },
    yaxis: { title: 'ΔG (kJ/mol)' },
    showlegend: true
};

// Retornar os valores esperados pelo JSPlotly
return { x_values: T_values, y_values: G_values, x_range: [T_min, T_max], y_range: [Math.min(...G_values), Math.max(...G_values)], layout };
