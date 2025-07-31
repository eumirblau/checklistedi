# Script para eliminar duplicados de pantallas y assets
# Ejecuta esto en PowerShell desde la raíz del proyecto


# Eliminar carpeta screens duplicada
$screensPath = "screens"
if (Test-Path $screensPath) {
    Remove-Item -Recurse -Force $screensPath
    Write-Host "Carpeta 'screens/' eliminada."
}

# Eliminar carpeta src/assets si ya tienes los assets en assets/
$srcAssetsPath = "src/assets"
if (Test-Path $srcAssetsPath) {
    Remove-Item -Recurse -Force $srcAssetsPath
    Write-Host "Carpeta 'src/assets/' eliminada."
}

Write-Host "Limpieza completada. Verifica que tus imports apunten a las carpetas correctas."
