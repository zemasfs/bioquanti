
// Função Quadrática
const a = -0.2;   
const b = 2.5;    
const c = 0.5;    

const x_values = [];
const y_values = [];
for (let i = 0; i <= 20; i += 0.5) {
  x_values.push(i);
  y_values.push(a * Math.pow(i, 2) + b * i + c);
}


const x_range = [0, 15];
const y_range = [0, Math.max(...y_values)];
const x_label = "Valores de X";
const y_label = "Valores de Y";
const title = "Função Quadrática";

return { x_values, y_values, x_range, y_range, x_label, y_label, title };