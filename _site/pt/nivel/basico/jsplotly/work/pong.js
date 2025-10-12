
// === Função central com toda a lógica do Pong ===
function criarPongInterativo() {
  new p5((sketch) => {
    let bola, raquete, jogando = true, pontos = 0;
    let colisoesSeguidas = 0;

    sketch.setup = function () {
      const canvas = sketch.createCanvas(400, 300).parent("jogoArea");
      canvas.canvas.tabIndex = '1';
      canvas.canvas.focus();

      const warp = parseFloat(document.getElementById("warpSlider").value);
      const velInicial = Math.pow(1.5, warp);
      const angulo = Math.random() * Math.PI / 2 + Math.PI / 4;

      bola = {
        x: sketch.width / 2,
        y: 100,
        vx: velInicial * Math.cos(angulo),
        vy: velInicial * Math.sin(angulo),
        r: 10
      };

      raquete = {
        w: 80,
        h: 10,
        x: sketch.width / 2 - 40,
        y: sketch.height - 30,
        vel: 5
      };
    };

    sketch.draw = function () {
      sketch.background(240);

      if (!jogando) {
        sketch.fill(0);
        sketch.textSize(24);
        sketch.textAlign(sketch.CENTER);
        sketch.text("💥 Game Over", sketch.width / 2, sketch.height / 2 - 10);
        sketch.textSize(18);
        sketch.text(`Pontuação final: ${pontos}`, sketch.width / 2, sketch.height / 2 + 20);
        return;
      }

      const warp = parseFloat(document.getElementById("warpSlider").value);
      const nivel = parseInt(document.getElementById("nivelSlider").value);
      document.getElementById("warpValor").textContent = `Warp ${warp.toFixed(1)}`;
      document.getElementById("nivelValor").textContent = nivel;

      const base = Math.pow(1.5, warp);
      const impulso = 1 + colisoesSeguidas * 0.03;
      const velocidade = base * impulso;
      const direcao = Math.atan2(bola.vy, bola.vx);
      bola.vx = velocidade * Math.cos(direcao);
      bola.vy = velocidade * Math.sin(direcao);

      sketch.fill(80);
      sketch.textSize(16);
      sketch.textAlign(sketch.LEFT, sketch.TOP);
      sketch.text(`Pontuação: ${pontos}`, 10, 10);

      sketch.fill(50, 100, 200);
      sketch.circle(bola.x, bola.y, bola.r * 2);
      bola.x += bola.vx;
      bola.y += bola.vy;

      if (bola.x < bola.r || bola.x > sketch.width - bola.r) {
        bola.vx *= -1;
        colisoesSeguidas++;
      }

      if (bola.y < bola.r) {
        bola.vy *= -1;
        colisoesSeguidas++;
      }

      sketch.fill(200, 50, 50);
      sketch.rect(raquete.x, raquete.y, raquete.w, raquete.h);
      raquete.x = sketch.constrain(raquete.x, 0, sketch.width - raquete.w);

      if (
        bola.y + bola.r >= raquete.y &&
        bola.x >= raquete.x &&
        bola.x <= raquete.x + raquete.w &&
        bola.vy > 0
      ) {
        bola.vy *= -1;
        bola.y = raquete.y - bola.r;
        colisoesSeguidas++;
        pontos++;
      }

      if (bola.y - bola.r > sketch.height) {
        jogando = false;
      }

      if (colisoesSeguidas > 0 && sketch.frameCount % 120 === 0) {
        colisoesSeguidas--;
      }
    };

    sketch.touchMoved = function () {
      raquete.x = sketch.constrain(sketch.mouseX - raquete.w / 2, 0, sketch.width - raquete.w);
      return false;
    };
  });
}

// === Executa no JSPlotly apenas se houver gráfico ===
if (typeof editor !== "undefined" && document.getElementById("grafico")) {
  const graficoDiv = document.getElementById("grafico");
  graficoDiv.innerHTML = `
    <div style="text-align:center; margin-top:20px">
      <button id="btnIniciar">Iniciar Jogo</button><br><br>
      <label>Modalidade: <span id="nivelValor">1</span></label><br>
      <input type="range" id="nivelSlider" min="1" max="5" step="1" value="1"><br><br>
      <label>Velocidade: <span id="warpValor">Warp 1.5</span></label><br>
      <input type="range" id="warpSlider" min="0" max="5" step="0.1" value="1.5"><br>
    </div>
    <div id="jogoArea" style="margin-top: 20px;"></div>
  `;

  
  document.getElementById("btnIniciar").addEventListener("click", () => {
    document.getElementById("jogoArea").innerHTML = "";
    criarPongInterativo();
  });
}

// === Exportação autossuficiente via botão HTML ===
window.salvarProjetoSomenteGrafico = function () {
  const temaEscuro = document.body.classList.contains("dark-mode");
  const codigoSketch = criarPongInterativo.toString();

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Pong Interativo</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
  <style>
    body {
      background-color: ${temaEscuro ? "#1e1e1e" : "#ffffff"};
      color: ${temaEscuro ? "#e0e0e0" : "#000000"};
      font-family: sans-serif;
      text-align: center;
      margin: 20px;
    }
  </style>
</head>
<body>
  <h2>Jogo Pong</h2>
  <button id="btnIniciar">Iniciar Jogo</button><br><br>
  
  <label>Velocidade: <span id="warpValor">Warp 1.5</span></label><br>
  <input type="range" id="warpSlider" min="0" max="5" step="0.1" value="1.5"><br>
  <div id="jogoArea" style="margin-top: 20px;"></div>

  <script>
  ${codigoSketch}
  <\/script>

  <script>
    document.getElementById("btnIniciar").addEventListener("click", () => {
      document.getElementById("jogoArea").innerHTML = "";
      criarPongInterativo();
    });

        document.getElementById("warpSlider").addEventListener("input", function () {
      document.getElementById("warpValor").innerText = "Warp " + this.value;
    });
  <\/script>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pong_interativo.html";
  a.click();
};
