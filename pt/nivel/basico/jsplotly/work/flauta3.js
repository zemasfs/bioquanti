if (typeof Tone === "undefined") {
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js";
  document.head.appendChild(s);
  s.onload = iniciarFlautaFinal;
} else {
  iniciarFlautaFinal();
}

function iniciarFlautaFinal() {
  const naturais = ["C5", "D5", "E5", "F5", "G5", "A5", "B5"];
  const sustenidos = ["C#5", "D#5", "F5", "F#5", "G#5", "A#5", "B5"];
  const synths = naturais.map(n => new Tone.Synth().toDestination());
  const sharpSynths = sustenidos.map(n => new Tone.Synth().toDestination());

  let notaAtiva = null;

  window.tocarNota = i => {
    pararTodas();
    synths[i].triggerAttack(naturais[i]);
    synths[i].tocando = true;
    notaAtiva = synths[i];
  };

  window.pararNota = i => {
    if (synths[i].tocando) {
      synths[i].triggerRelease();
      synths[i].tocando = false;
      notaAtiva = null;
    }
  };

  window.tocarSustenido = i => {
    pararTodas();
    sharpSynths[i].triggerAttack(sustenidos[i]);
    sharpSynths[i].tocando = true;
    notaAtiva = sharpSynths[i];
  };

  window.pararSustenido = i => {
    if (sharpSynths[i].tocando) {
      sharpSynths[i].triggerRelease();
      sharpSynths[i].tocando = false;
      notaAtiva = null;
    }
  };

  function pararTodas() {
    if (notaAtiva && notaAtiva.tocando) {
      notaAtiva.triggerRelease();
      notaAtiva.tocando = false;
      notaAtiva = null;
    }
  }

  const largura = 680;
  const altura = 160;
  const espacamento = 80;
  const raio = 24;

  const svg = `
  <svg width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">
    <rect x="40" y="40" width="${largura - 80}" height="60" rx="10" ry="10"
          fill="#f4e2c0" stroke="#aa9966" stroke-width="2"/>
    <polygon points="${largura},40 ${largura - 40},30 ${largura - 40},110 ${largura},100"
             fill="#e2cfaa" stroke="#aa9966" stroke-width="2"/>
    ${naturais.map((nota, i) => {
      const cx = 100 + i * espacamento;
      return `
        <path d="M${cx},70 m-${raio},0 a${raio},${raio} 0 0,1 ${2 * raio},0"
              fill="white" stroke="#444" stroke-width="2"
              onmousedown="tocarSustenido(${i})"
              onmouseup="pararSustenido(${i})"
              ontouchstart="tocarSustenido(${i}); event.preventDefault();"
              ontouchend="pararSustenido(${i}); event.preventDefault();" />
        <circle cx="${cx}" cy="70" r="${raio / 2}"
                fill="white" stroke="#222" stroke-width="2"
                onmousedown="tocarNota(${i})"
                onmouseup="pararNota(${i})"
                ontouchstart="tocarNota(${i}); event.preventDefault();"
                ontouchend="pararNota(${i}); event.preventDefault();" />
      `;
    }).join("")}
  </svg>`;

  document.getElementById("grafico").innerHTML = svg;
}

// --- Salvar HTML funcional ---
function salvarProjetoSomenteGrafico() {
  const svg = document.getElementById("grafico").querySelector("svg");
  const temaEscuro = document.body.classList.contains("dark-mode");

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Flauta Interativa</title>
  <script src="https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js"></script>
  <style>
    body {
      font-family: sans-serif;
      background-color: ${temaEscuro ? "#1e1e1e" : "#ffffff"};
      color: ${temaEscuro ? "#e0e0e0" : "#000000"};
      margin: 20px;
      text-align: center;
    }
    #grafico {
      max-width: 100%;
    }
    svg {
      width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div id="grafico">
    ${svg.outerHTML}
  </div>
  <script>
    const naturais = ["C5", "D5", "E5", "F5", "G5", "A5", "B5"];
    const sustenidos = ["C#5", "D#5", "F5", "F#5", "G#5", "A#5", "B5"];
    const synths = naturais.map(n => new Tone.Synth().toDestination());
    const sharpSynths = sustenidos.map(n => new Tone.Synth().toDestination());
    let notaAtiva = null;

    window.tocarNota = i => {
      pararTodas();
      synths[i].triggerAttack(naturais[i]);
      synths[i].tocando = true;
      notaAtiva = synths[i];
    };
    window.pararNota = i => {
      if (synths[i].tocando) {
        synths[i].triggerRelease();
        synths[i].tocando = false;
        notaAtiva = null;
      }
    };
    window.tocarSustenido = i => {
      pararTodas();
      sharpSynths[i].triggerAttack(sustenidos[i]);
      sharpSynths[i].tocando = true;
      notaAtiva = sharpSynths[i];
    };
    window.pararSustenido = i => {
      if (sharpSynths[i].tocando) {
        sharpSynths[i].triggerRelease();
        sharpSynths[i].tocando = false;
        notaAtiva = null;
      }
    };
    function pararTodas() {
      if (notaAtiva && notaAtiva.tocando) {
        notaAtiva.triggerRelease();
        notaAtiva.tocando = false;
        notaAtiva = null;
      }
    }
  </script>
</body>
</html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "play.html";
  a.click();
}

// Força o botão HTML a usar esta versão
document.querySelectorAll("button").forEach(btn => {
  if (btn.textContent.toLowerCase().includes("html")) {
    btn.onclick = salvarProjetoSomenteGrafico;
  }
});
