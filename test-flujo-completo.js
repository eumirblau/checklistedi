// Test completo del flujo de parámetros de fotos
// Simular GrupoChecklistScreen recibiendo parámetros

const params = {
  jefeNombre: 'José García',
  usuario: 'admin123',
  obraNombre: 'Obra Centro',
  instalacionNombre: 'Instalación A'
};

console.log('=== FLUJO COMPLETO DE PARÁMETROS ===\n');

console.log('1. GrupoChecklistScreen recibe params:');
console.log('   jefeNombre:', params.jefeNombre);
console.log('   usuario:', params.usuario);
console.log('   obraNombre:', params.obraNombre);
console.log('   instalacionNombre:', params.instalacionNombre);

console.log('\n2. GrupoChecklistScreen pasa a PhotoButton:');
const photoButtonProps = {
  jefeGrupo: params.jefeNombre || 'sin-jefe',
  obra: params.obraNombre || 'sin-obra',
  instalacion: params.instalacionNombre || 'sin-instalacion'
};
console.log('   jefeGrupo:', photoButtonProps.jefeGrupo);
console.log('   obra:', photoButtonProps.obra);
console.log('   instalacion:', photoButtonProps.instalacion);

console.log('\n3. PhotoButton pasa a CloudPhotoService.uploadPhoto:');
const cloudServiceOptions = {
  jefeGrupo: photoButtonProps.jefeGrupo,
  obra: photoButtonProps.obra,
  instalacion: photoButtonProps.instalacion
};
console.log('   jefeGrupo:', cloudServiceOptions.jefeGrupo);
console.log('   obra:', cloudServiceOptions.obra);
console.log('   instalacion:', cloudServiceOptions.instalacion);

console.log('\n4. CloudPhotoService procesa:');
const normalize = (str) => (str ? String(str).trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '') : 'sin-obra');
const jefeGrupo = cloudServiceOptions.jefeGrupo ? String(cloudServiceOptions.jefeGrupo).trim() : 'sin-jefe';
const obra = normalize(cloudServiceOptions.obra);
const instalacion = normalize(cloudServiceOptions.instalacion);
const itemId = 'TEST_ITEM';
const folder = `checklist-photos/${jefeGrupo}/${obra}/${instalacion}/${itemId}`;

console.log('   jefeGrupo procesado:', jefeGrupo);
console.log('   obra normalizada:', obra);
console.log('   instalacion normalizada:', instalacion);
console.log('   folder final:', folder);

console.log('\n5. Resultado:');
console.log('   ✅ Estructura correcta: checklist-photos/[JEFE]/[OBRA]/[INSTALACION]/[ITEM]');
console.log('   ✅ Usando jefe de obra:', jefeGrupo);
console.log('   ❌ NO usando usuario:', params.usuario);

console.log('\n6. Comparación:');
console.log('   Estructura CORRECTA:', folder);
console.log('   Estructura INCORRECTA sería: checklist-photos/' + params.usuario + '/' + obra + '/' + instalacion + '/' + itemId);

console.log('\n¿El problema podría ser que hay fotos existentes en la estructura incorrecta?');
