// === Voltimetro_Simples_Media ===
// Arduino UNO R4 (12 bits), 0–5V no pino A0
// Mede pilhas, fontes ou potenciômetro (≤ 5V).

const uint8_t PIN_ADC = A0;
const int ADC_BITS = 12;
const float VREF = 5.000;    // ajuste fino se quiser (ex.: 4.985)

void setup() {
  analogReadResolution(ADC_BITS);
  pinMode(PIN_ADC, INPUT);
  Serial.begin(115200);
  Serial.println("t_ms,V_medio");
}

float mediaAnalogica(int n) {
  long soma = 0;
  for (int i = 0; i < n; i++) {
    soma += analogRead(PIN_ADC);
    delayMicroseconds(200);  // espaçamento pequeno entre amostras
  }
  return (float)soma / n;
}

void loop() {
  int nAmostras = 200;               // média de 100 leituras
  float mediaRaw = mediaAnalogica(nAmostras);
  float V = (mediaRaw / ((1 << ADC_BITS) - 1)) * VREF;

  Serial.print(millis());
  Serial.print(",");
  Serial.println(V, 4);

  delay(2000); // exibe a cada 0,5 s
}
