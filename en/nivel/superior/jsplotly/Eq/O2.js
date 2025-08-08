
// Interação de Oxigênio com Mioglobina e Hemoglobina

const P50 = 26; // Pressão parcial de O2 onde 50% da proteína está saturada (mmHg)
const nH = 2.8; // Coeficiente de Hill 
const O2_values = Array.from({length: 200}, (_, i) => i * (100 / 199)); // Pressão de O2 de 0 a 100 mmHg

const Y_values = O2_values.map(O2 => Math.pow(O2, nH) / (Math.pow(P50, nH) + Math.pow(O2, nH)));

var layout = {
    title: 'Ligação de O2 com Mioglobina e Hemoglobina',
    xaxis: { title: 'Pressão de O2 (mmHg)', range: [0, 100] },
    yaxis: { title: 'Saturação da mioglobina (Y)', range: [0, 1] },
    showlegend: true
};

return { x_values: O2_values, y_values: Y_values, x_range: [0, 100], y_range: [0, 1], layout };
