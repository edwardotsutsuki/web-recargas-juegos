const fs = require('fs');
const { execSync } = require('child_process');

const tsErrors = fs.readFileSync('ts_errors.txt', 'utf8');
console.log('TS ERRORS DETALLE:');
console.log(tsErrors);

if (tsErrors !== 'NINGUNO') {
  // Analizar qué archivos fallaron
  const lines = tsErrors.split('\n');
  lines.forEach(l => {
    if (l.includes('error TS')) {
      console.log('TS Error:', l);
    }
  });

  // Si falló por algún import en los archivos inyectados, limpiamos o corregimos
} else {
  console.log('Compilación limpia!');
}
