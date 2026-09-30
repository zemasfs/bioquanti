// Mapa do Brasil e Capitais

const trace = {
  type: 'scattergeo',
  mode: 'markers+text',
  text: [
    'Rio Branco', 'Macapá', 'Manaus', 'Belém', 'Palmas', 'São Luís', 'Porto Velho',
    'Boa Vista', 'Cuiabá', 'Campo Grande', 'Goiânia', 'Brasília', 'Belo Horizonte',
    'Vitória', 'São Paulo', 'Rio de Janeiro', 'Curitiba', 'Porto Alegre', 'Florianópolis',
    'Recife', 'Maceió', 'Aracaju', 'Salvador', 'Natal', 'João Pessoa', 'Fortaleza', 'Teresina'
  ],
  lon: [
    -67.81, -51.05, -60.02, -48.50, -48.29, -44.30, -63.90,
    -60.67, -56.10, -54.61, -49.25, -47.93, -19.92,
    -40.31, -46.63, -43.17, -49.27, -51.23, -48.55,
    -34.87, -35.73, -37.07, -38.52, -35.21, -34.87, -38.52, -42.80
  ],
  lat: [
    -9.97, 0.03, -3.10, -1.46, -10.19, -2.52, -8.76,
    2.81, -15.60, -20.45, -16.68, -15.78, -19.92,
    -20.32, -23.55, -22.91, -25.42, -30.03, -27.59,
    -8.05, -9.66, -10.91, -12.97, -5.80, -7.12, -3.71, -5.09
  ],
  marker: {
    size: 8,
    color: 'blue'
  },
  textposition: 'top center',
  name: 'Capitais',
  geo: 'geo' // 🔹 fundamental para o layout reconhecer como mapa
};

const layout = {
  title: 'Capitais do Brasil',
  geo: {
    scope: 'south america',
    projection: { type: 'mercator' },
    showland: true,
    landcolor: 'rgb(217, 217, 217)',
    countrycolor: 'rgb(255, 255, 255)',
    lonaxis: { range: [-75, -30] },
    lataxis: { range: [-35, 5] }
  }
};

return { trace, layout };
