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
  x: girias,
  y: dados['1980'],
  type: 'bar',
  marker: { color: 'purple' },
  name: '1980'
};

const layout = {
  title: 'Popularidade de Gírias por Década',
  xaxis: { title: 'Gírias' },
  yaxis: { title: 'Frequência Estimada' },
  updatemenus: [{
    buttons: decadas.map(dec => ({
      method: 'update',
      label: dec,
      args: [
        { y: [dados[dec]] },
        { title: `Popularidade de Gírias na Década de ${dec}` }
      ]
    })),
    direction: 'down',
    showactive: true,
    x: 0,
    xanchor: 'left',
    y: 1.15,
    yanchor: 'top'
  }]
};

return { trace, layout };
