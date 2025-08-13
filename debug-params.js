// Script simple para debuggear parámetros
console.log('=== DEBUG PARÁMETROS FOTOS ===');

// Simular los parámetros que deberían llegar
const debugParams = {
  jefeNombre: 'José García', // Ejemplo del jefe de obra
  usuario: 'admin123',       // Usuario actual
  obraNombre: 'Obra Centro',
  instalacionNombre: 'Instalación A',
  itemId: 'ITEM001'
};

console.log('Parámetros originales:');
console.log('- jefeNombre (debería usarse):', debugParams.jefeNombre);
console.log('- usuario (NO debería usarse):', debugParams.usuario);
console.log('- obraNombre:', debugParams.obraNombre);
console.log('- instalacionNombre:', debugParams.instalacionNombre);

// Simular la función normalize
const normalize = (str) => (str ? String(str).trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '') : 'sin-obra');

const jefeGrupo = debugParams.jefeNombre ? String(debugParams.jefeNombre).trim() : 'sin-jefe';
const obra = normalize(debugParams.obraNombre);
const instalacion = normalize(debugParams.instalacionNombre);
const folder = `checklist-photos/${jefeGrupo}/${obra}/${instalacion}/${debugParams.itemId}`;

console.log('\nProcesamiento:');
console.log('- jefeGrupo:', jefeGrupo);
console.log('- obra normalizada:', obra);
console.log('- instalacion normalizada:', instalacion);
console.log('- folder final:', folder);

console.log('\n¿Es correcto? La carpeta debería tener el nombre del jefe de obra, no del usuario actual.');
