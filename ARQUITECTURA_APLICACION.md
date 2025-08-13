# Arquitectura de la Aplicación

## Estructura del Proyecto

```
src/
├── screens/           # Pantallas principales
├── components/        # Componentes reutilizables
├── services/          # Servicios de API y datos
├── navigation/        # Configuración de navegación
├── config/           # Configuraciones (Firebase, etc.)
└── types/            # Definiciones de tipos TypeScript
```

## Servicios Principales

- **ApiService**: Integración con Google Sheets
- **CloudPhotoService**: Subida de fotos a Firebase Storage
- **FirebasePhotoService**: Gestión local de fotos

## Flujo de Datos

1. Usuario → Pantallas → Servicios → APIs externas
2. Datos cacheados localmente con AsyncStorage
3. Fotos subidas a Firebase Storage con estructura organizada