// Parâmetros fixos da equação
const P50_ref = 26;     // P50 padrão em mmHg a pH_ref
const pH_ref = 7.4;     // pH de referência
const alpha = 50;        // ΔP50 por unidade de pH (intensidade do efeito de Bohr)
const n = 2.8;          // Coeficiente de Hill

// Pressão de O2 de 0 a 100 mmHg
const O2_values = Array.from({length: 200}, (_, i) => i * (100 / 199));

// Valor de pH para esta curva (pode ser alterado pelo usuário)
const pH_val = 7.2;   // Modifique para outro valor de pH

// Cálculo de P50 ajustado pelo efeito Bohr
const P50 = P50_ref + alpha * (pH_ref - pH_val);

// Cálculo da saturação Y para cada valor de O2
const Y_values = O2_values.map(O2 => Math.pow(O2, n) / (Math.pow(P50, n) + Math.pow(O2, n)));

// Título e rótulos personalizados
const title = 'Efeito de Bohr na Saturação da Hemoglobina';
const x_label = 'Pressão de O₂ (mmHg)';
const y_label = 'Saturação da Hemoglobina (Y)';

// Layout do gráfico
const layout = {
    title: title,
    xaxis: { title: x_label, range: [0, 100] },
    yaxis: { title: y_label, range: [0, 1] },
    showlegend: true
};

// Retornar dados para o Editor
return {
    x_values: O2_values,
    y_values: Y_values,
    layout
};

