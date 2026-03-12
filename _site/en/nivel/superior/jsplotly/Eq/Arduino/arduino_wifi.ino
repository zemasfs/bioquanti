#include <WiFiS3.h>
#include <WiFiServer.h>

const char* AP_SSID = "BioCell-01";
const char* AP_PASS = "12345678";
WiFiServer server(80);

// ===== leitura A0 =====
const uint8_t PIN_ADC = A0;
const int     ADC_BITS = 12;                      // UNO R4
const int     ADC_MAX  = (1 << ADC_BITS) - 1;     // 4095
const float   VREF     = 5.0;                     // ~5 V
const unsigned long SAMPLE_MS = 1000;             // 1 ponto/s
const int     N_AVG    = 8;                       // média simples

// ===== página HTML (Canvas + SSE) =====
const char page[] PROGMEM = R"HTML(<!doctype html>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>BioCell — V × t</title>
<style>
 body{font-family:system-ui,Arial,sans-serif;margin:0;background:#fafafa}
 header{padding:10px 14px;font-weight:600}
 .card{background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06);padding:12px;margin:0 12px 16px}
 #c{width:100%;height:64vh;border:1px solid #ddd;border-radius:8px;background:#fff}
 #info{color:#444;margin:8px 0 0 6px}
 button{padding:.5rem .8rem;border-radius:8px;border:1px solid #ccc;background:#f5f5f5;margin:6px}
</style>
<header>BioCell — Potencial × Tempo</header>
<div class="card">
  <canvas id="c"></canvas>
  <div>
    <button id="clr">Limpar</button>
    <span id="info">Conectando…</span>
  </div>
</div>
<script>
const cvs=document.getElementById('c'), ctx=cvs.getContext('2d');
const info=document.getElementById('info'), btnClr=document.getElementById('clr');
let T=[], V=[], t0=null, ymax=5.0; const KEEP=900;
function resize(){ const r=cvs.getBoundingClientRect(); cvs.width=r.width; cvs.height=r.height; draw(); }
addEventListener('resize', resize); resize();

function draw(){
  const w=cvs.width,h=cvs.height,m={l:48,r:12,t:16,b:28}, gw=w-m.l-m.r, gh=h-m.t-m.b;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#bbb"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(m.l,m.t); ctx.lineTo(m.l,m.t+gh); ctx.lineTo(m.l+gw,m.t+gh); ctx.stroke();
  ctx.font="12px sans-serif"; ctx.fillStyle="#555"; ctx.textAlign="right";
  for(let i=0;i<=5;i++){const vy=i/5*ymax,y=m.t+gh-(vy/ymax)*gh;
    ctx.strokeStyle="#eee"; ctx.beginPath(); ctx.moveTo(m.l,y); ctx.lineTo(m.l+gw,y); ctx.stroke();
    ctx.fillStyle="#555"; ctx.fillText(vy.toFixed(1)+" V",m.l-6,y+4);}
  ctx.textAlign="center"; ctx.fillText("Tempo (s)", m.l+gw/2, h-6);
  ctx.save(); ctx.translate(12, m.t+gh/2); ctx.rotate(-Math.PI/2); ctx.fillText("Potencial (V)",0,0); ctx.restore();
  if(T.length<2) return;
  const tmin=T[0], tmax=T[T.length-1];
  ctx.strokeStyle="#1565c0"; ctx.lineWidth=2; ctx.beginPath();
  for(let i=0;i<T.length;i++){const x=m.l+((T[i]-tmin)/(tmax-tmin))*gw, y=m.t+gh-(V[i]/ymax)*gh;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);}
  ctx.stroke();
}

btnClr.onclick=()=>{T=[];V=[];t0=null;draw();};

const sse=new EventSource('/events');
sse.onmessage=(e)=>{
  const d=JSON.parse(e.data);
  if(t0===null){t0=d.t; resize();}
  const ts=(d.t-t0)/1000.0;
  T.push(ts); V.push(d.v);
  if(T.length>KEEP){T.shift();V.shift();}
  info.textContent=`V = ${d.v.toFixed(3)} V   |   t = ${ts.toFixed(1)} s`;
  draw();
};
sse.onerror=()=>{ info.textContent="Conexão perdida. Recarregue a página."; };
</script>)HTML";


float readV(){
  long acc=0; for(int i=0;i<N_AVG;i++){ acc+=analogRead(PIN_ADC); delay(2); }
  float adc = acc / (float)N_AVG;
  float v = (adc * VREF) / ADC_MAX;
  if(v<0) v=0; if(v>VREF) v=VREF;
  return v;
}

void setup(){
  Serial.begin(9600);
  analogReadResolution(ADC_BITS);
  pinMode(PIN_ADC, INPUT);

  delay(1200);
  Serial.println("\n=== BioCell AP + Grafico V(t) — robusto ===");
  if (WiFi.beginAP(AP_SSID, AP_PASS) != WL_AP_LISTENING) {
    Serial.println("ERRO ao iniciar AP. Reinicie.");
  } else {
    Serial.print("AP: "); Serial.println(AP_SSID);
    Serial.println("No celular: conecte-se ao AP e abra http://192.168.4.1");
  }
  server.begin();
}

void serveIndex(WiFiClient& c){
  c.println("HTTP/1.1 200 OK");
  c.println("Content-Type: text/html; charset=utf-8");
  c.println("Cache-Control: no-cache");
  c.println("Connection: close");
  c.println();
  c.print(page);
  c.flush();
  c.stop();              // <<< fecha a conexão da página normal
}

void serveSSE(WiFiClient& c){
  c.println("HTTP/1.1 200 OK");
  c.println("Content-Type: text/event-stream");
  c.println("Cache-Control: no-cache");
  c.println("Connection: keep-alive");
  c.println();           // fim dos headers

  unsigned long lastPing = millis();
  while (c.connected()){
    unsigned long t = millis();
    float v = readV();
    c.print("data: {\"t\":"); c.print(t); c.print(",\"v\":"); c.print(v,3); c.println("}");
    c.println(); // evento termina com linha em branco
    c.flush();

    // ping comentado a cada 15 s para manter conexao viva em navegadores mais chatos
    if (millis() - lastPing > 15000) { c.println(": ping"); c.println(); c.flush(); lastPing = millis(); }

    delay(SAMPLE_MS);
  }
  c.stop();
}

void loop(){
  WiFiClient c = server.available();
  if(!c) return;

  // lê a 1ª linha (muito curta) sem travar
  String req = c.readStringUntil('\n'); // pega "GET /... HTTP/1.1"
  if (req.indexOf("GET /events") != -1) {
    serveSSE(c);
  } else {
    serveIndex(c);
  }
}
