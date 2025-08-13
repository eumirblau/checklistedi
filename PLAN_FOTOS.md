# Plan de Gestión de Fotos

## Estructura de Carpetas

```
checklist-photos/
├── {jefeNombre}/          # Nombre real del jefe (ej: Perico, Javier)
    ├── {obraNombre}/      # Nombre de la obra
        ├── {instalacion}/ # Nombre de la instalación
            ├── {itemId}/  # ID del ítem del checklist
                └── foto_timestamp.jpg
```

## Formato de Metadatos

- **Fecha**: DD/MM/AA
- **Hora**: HH:MM (sin segundos)
- **Usuario**: Nombre real del usuario que sube la foto
- **Ejemplo**: `[13/08/25 14:30 - Juan Pérez] Comentario de la foto`

## Servicios

- **CloudPhotoService**: Subida vía Cloud Function (uploadPhotoBase64)
- **FirebasePhotoService**: Gestión directa con Firebase SDK
- **PhotoButton**: Componente UI para captura y visualización