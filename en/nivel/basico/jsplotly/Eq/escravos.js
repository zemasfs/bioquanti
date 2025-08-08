// Tráfico de Escravos nas Américas (1500-1888)

const dados = {
  'Século XVI': {
    regioes: ['Brasil', 'Caribe Espanhol', 'Caribe Britânico', 'América do Norte'],
    valores: [300000, 150000, 20000, 5000]
  },
  'Século XVII': {
    regioes: ['Brasil', 'Caribe Espanhol', 'Caribe Britânico', 'América do Norte'],
    valores: [1000000, 400000, 250000, 30000]
  },
  'Século XVIII': {
    regioes: ['Brasil', 'Caribe Espanhol', 'Caribe Britânico', 'América do Norte'],
    valores: [2500000, 600000, 900000, 500000]
  },
  'Século XIX': {
    regioes: ['Brasil', 'Caribe Espanhol', 'Caribe Britânico', 'América do Norte'],
    valores: [1000000, 300000, 100000, 200000]
  }
};

const secoes = Object.keys(dados);

const trace = {
  x: dados['Século XVIII'].regioes,
  y: dados['Século XVIII'].valores,
  type: 'bar',
  marker: { color: 'indigo' },
  name: 'Século XVIII'
};

const layout = {
  title: 'Tráfico Atlântico de Escravizados por Região',
  xaxis: { title: 'Região das Américas' },
  yaxis: { title: 'Número estimado de escravizados', rangemode: 'tozero' },
  updatemenus: [{
    y: 1.15,
    buttons: secoes.map(sec => ({
      method: 'restyle',
      args: [
        { x: [dados[sec].regioes], y: [dados[sec].valores], name: sec }
      ],
      label: sec
    })),
    direction: 'down',
    showactive: true
  }]
};

return { trace, layout };
