// === Contagem de palavras (PT-BR) com barras e limpeza ===
const texto = "A educação no Brasil enfrenta desafios históricos e estruturais. A desigualdade de acesso à escolas, a qualidade do ensino e a valorização dos professores são temas recorrentes nos debates públicos de educação. Muitos estudantes, especialmente em regiões periféricas e com comprometimentos históricos no ensino, convivem com a precariedade das escolas, a falta de recursos e a ausência de políticas consistentes. Investir em educação é investir no futuro. Entretanto, políticas públicas nem sempre acompanham a urgência do problema em educação. A falta de planejamento em educação, os cortes orçamentários e a burocracia dificultam a implementação de melhoriaspara as escolas. É preciso garantir equidade da educação, promover inclusão e assegurar que cada criança e jovem tenha acesso a uma educação de qualidade. Sem isso, o desenvolvimento do país segue comprometido.";

// 1) Normalização: minúsculas, remover acentos e sinais não alfanuméricos
const textoLimpo = texto
  .toLowerCase()
  .normalize('NFD')                        // separa acentos
  .replace(/\p{Diacritic}/gu, '')         // remove acentos
  .replace(/[^\p{L}\p{N}\s]/gu, ' ');     // mantém só letras/números/espaço

// 2) Stopwords básicas (pode ajustar conforme a turma)
const stopwords = new Set([
  'a','as','o','os','um','uma','uns','umas',
  'de','do','da','dos','das','no','na','nos','nas','ao','aos','à','às',
  'e','ou','em','para','por','com','sem','sobre','entre','apenas',
  'que','se','sua','seu','suas','seus','sao','ser','foi','é','esta','este','esta','esse','essa',
  'ao','aos','dos','das','num','numa','mesmo','mais','menos'
]);

// 3) Tokenização + filtro
const palavras = textoLimpo
  .split(/\s+/)
  .filter(w => w.length >= 3 && !stopwords.has(w));

// 4) Frequências
const freq = {};
for (const w of palavras) freq[w] = (freq[w] || 0) + 1;

// 5) Top 20
const entradas = Object.entries(freq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

const x_values = entradas.map(e => e[0]);
const y_values = entradas.map(e => e[1]);

// 6) Gráfico de barras (um único trace)
const trace = {
  type: 'bar',
  x: x_values,
  y: y_values,
  text: y_values.map(String),
  textposition: 'outside'
};

const layout = {
  title: '20 palavras mais frequentes (texto limpo)',
  xaxis: { title: 'Palavra', tickangle: -45, categoryorder: 'array', categoryarray: x_values },
  yaxis: { title: 'Frequência', rangemode: 'tozero' },
  margin: { t: 70, b: 110, r: 20, l: 50 }
};

return { trace, layout };
