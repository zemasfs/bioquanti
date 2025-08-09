if (typeof Tone === "undefined") {
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js";
  document.head.appendChild(s);
  s.onload = iniciarPiano;
} else {
  iniciarPiano();
}

function iniciarPiano() {
  const naturais = ["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5"];
  const sustenidos = ["C#4","D#4","","F#4","G#4","A#4","","C#5","D#5","","F#5","G#5","A#5",""];
  const synthMap = {};
  const activeNotes = new Map();

  [...naturais, ...sustenidos].forEach(n => {
    if (n) synthMap[n] = new Tone.Synth().toDestination();
  });

  let sustainTime = 700; // padrão: médio

  // Slider visual
  const slider = `
    <div style="margin-bottom: 10px; text-align: center;">
      <label for="sustain">Sustentação:</label>
      <input type="range" id="sustain" min="0" max="2" step="1" value="1"
             style="width: 200px;">
    </div>`;

  // Piano SVG
  const width = 700;
  const whiteWidth = width / 14;
  const height = 200;
  const blackHeight = 120;
  const blackWidth = whiteWidth * 0.6;

  const svg = `
<svg width="${width}" height="${height}">
  ${naturais.map((nota, i) => `
    <rect x="${i * whiteWidth}" y="0" width="${whiteWidth}" height="${height}"
          fill="white" stroke="black" stroke-width="1"
          onpointerdown="tocar('${nota}')" />
  `).join("")}
  ${sustenidos.map((nota, i) => {
    if (!nota) return '';
    const x = i * whiteWidth + whiteWidth - blackWidth / 2;
    return `
      <rect x="${x}" y="0" width="${blackWidth}" height="${blackHeight}"
            fill="black"
            onpointerdown="tocar('${nota}')" />
    `;
  }).join("")}
</svg>`;

  document.getElementById("grafico").innerHTML = slider + svg;

  document.getElementById("sustain").addEventListener("input", e => {
    const val = parseInt(e.target.value);
    sustainTime = [300, 700, 1300][val]; // curto, médio, longo
  });

  window.tocar = nota => {
    if (!synthMap[nota]) return;
    synthMap[nota].triggerAttack(nota);
    const s = synthMap[nota];
    activeNotes.set(nota, s);

    setTimeout(() => {
      if (activeNotes.has(nota)) {
        s.triggerRelease();
        activeNotes.delete(nota);
      }
    }, sustainTime);
  };

  // Garante exportação correta
  document.querySelectorAll("button").forEach(btn => {
    if (btn.textContent.toLowerCase().includes("html")) {
      btn.onclick = salvarProjetoSomenteGrafico;
    }
  });
}

// Exportação com slider + SVG + som
function salvarProjetoSomenteGrafico() {
  const div = document.getElementById("grafico");
  const svg = div.querySelector("svg");
  const temaEscuro = document.body.classList.contains("dark-mode");

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Piano Interativo</title>
  <script src="https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js"></script>
  <style>
    body {
      margin: 20px;
      text-align: center;
      font-family: sans-serif;
      background-color: ${temaEscuro ? '#1e1e1e' : '#ffffff'};
      color: ${temaEscuro ? '#e0e0e0' : '#000000'};
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div id="grafico">
    <div style="margin-bottom: 10px;">
      <label for="sustain">Sustentação:</label>
      <input type="range" id="sustain" min="0" max="2" step="1" value="1"
             style="width: 200px;">
    </div>
    ${svg.outerHTML}
  </div>
  <script>
    const naturais = ["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5"];
    const sustenidos = ["C#4","D#4","","F#4","G#4","A#4","","C#5","D#5","","F#5","G#5","A#5",""];
    const synthMap = {};
    const activeNotes = new Map();
    [...naturais, ...sustenidos].forEach(n => {
      if (n) synthMap[n] = new Tone.Synth().toDestination();
    });

    let sustainTime = 700;
    document.getElementById("sustain").addEventListener("input", e => {
      const val = parseInt(e.target.value);
      sustainTime = [300, 700, 1300][val];
    });

    window.tocar = nota => {
      if (!synthMap[nota]) return;
      synthMap[nota].triggerAttack(nota);
      const s = synthMap[nota];
      activeNotes.set(nota, s);
      setTimeout(() => {
        if (activeNotes.has(nota)) {
          s.triggerRelease();
          activeNotes.delete(nota);
        }
      }, sustainTime);
    };
  </script>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "piano.html";
  a.click();
}
