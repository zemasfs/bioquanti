// Calor Trocado e Capacidade Calorífica

// === Parâmetros editáveis pelo usuário ===
const massa = 2;         // massa em kg
const temperatura = 25;  // variação de temperatura em °C

// Eixo x: Capacidade Calorífica (c)
let x_values = [];
for (let c = 0; c <= 10; c += 0.1) {
    x_values.push(c);
}

// Eixo y: Q = c·m·ΔT
let y_values = x_values.map(c => c * massa * temperatura);

// Layout do gráfico
let layout = {
    title: `Q = c·m·ΔT | m = ${massa} kg, ΔT = ${temperatura} °C`,
    xaxis: { title: 'Capacidade Calorífica (c) [J/kg°C]' },
    yaxis: { title: 'Calor Trocado (Q) [J]' }
};

// Retorno para o JSPlotly (simples e direto)
return { x_values, y_values, layout };
