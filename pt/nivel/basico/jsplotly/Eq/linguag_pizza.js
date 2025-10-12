// Gírias faladas no Brasil (1980 - 2020)

const girias = ['massa', 'maneiro', 'da hora', 'top', 'cringe'];
const decadas = ['1980', '1990', '2000', '2010', '2020'];

const dados = {
  '1980': [20, 5, 0, 0, 0],
  '1990': [10, 15, 20, 0, 0],
  '2000': [0, 5, 15, 10, 0],
  '2010': [0, 0, 5, 20, 5],
  '2020': [0, 0, 0, 10, 25]
};

const trace = {
  labels: girias,
  values: dados['1980'],
  type: 'pie',
  name: '1980',
  hole: 0.3
};

const layout = {
  title: 'Distribuição de Gírias na Década de 1980',
  updatemenus: [{
    buttons: decadas.map(dec => ({
      method: 'restyle',
      label: dec,
      args: [
        { values: [dados[dec]] },
        { title: `Distribuição de Gírias na Década de ${dec}` }
      ]
    })),
    direction: 'down',
    showactive: true,
    x: 0,
    xanchor: 'left',
    y: 1.2,
    yanchor: 'top'
  }]
};

return { trace, layout };
