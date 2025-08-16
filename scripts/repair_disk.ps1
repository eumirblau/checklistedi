<#
repair_disk.ps1
Guía y helper para ejecutar chkdsk de forma segura desde PowerShell.

USO:
 - Ejecutar PowerShell como Administrador.
 - Revisar el contenido del script antes de ejecutarlo.
 - El script puede programar chkdsk o ejecutarlo ahora (si se acepta reinicio).
#>

function Ensure-Admin {
  $current = [Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
  if (-not $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Este script necesita privilegios de Administrador. Ejecuta PowerShell como 'Run as Administrator'."
    exit 1
  }
}

function Show-Help {
  Write-Output "Este helper prepara y ejecuta 'chkdsk' de forma interactiva."
  Write-Output "Opciones:"
  Write-Output "  - Ejecuta: chkdsk C: /F /R  (recomendada para reparar sectores y entradas dañadas)."
  Write-Output "  - Si el volumen está en uso te pedirá programar el chkdsk en el próximo reinicio."
}

param(
  [switch]$RunNow,
  [string]$Drive = 'C:'
)

Ensure-Admin
Show-Help

if (-not (Test-Path "$Drive\")) {
  Write-Error "La unidad especificada no existe: $Drive"
  exit 1
}

Write-Output "Unidad objetivo: $Drive"

if ($RunNow) {
  Write-Output "Va a ejecutar: chkdsk $Drive /F /R"
  $confirm = Read-Host "¿Deseas continuar y ejecutar chkdsk ahora? (Y/N)"
  if ($confirm -match '^[Yy]') {
    Write-Output "Ejecutando chkdsk... puede requerir reinicio."
    # Ejecutar chkdsk; si el volumen está en uso, chkdsk solicitará programarlo en el siguiente reinicio
    chkdsk $Drive /F /R
  } else {
    Write-Output "Operación cancelada por el usuario."
  }
} else {
  Write-Output "Modo interactivo: para ejecutar ahora, re-ejecuta con la opción -RunNow"
  Write-Output "Ejemplo: .\repair_disk.ps1 -RunNow -Drive C:"
}
