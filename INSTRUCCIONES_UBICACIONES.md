# Instrucciones para Integrar Datos de Ubicaciones

Este documento explica cómo integrar tus listas JSON de departamentos, provincias y distritos en la aplicación.

## 📁 Archivos Creados

1. **`lib/locationData.ts`** - Archivo principal que maneja los datos de ubicaciones
2. **`lib/ubicaciones.json`** - Archivo JSON de ejemplo (puedes reemplazarlo con tus datos)

## 🔄 Opciones para Integrar tus Datos

### Opción 1: Pegar datos directamente en `locationData.ts` (Recomendado)

1. Abre el archivo `lib/locationData.ts`
2. Busca la línea que dice:
   ```typescript
   export const locationDataFromUser: LocationData | null = null;
   ```
3. Reemplázala con tus datos. Ejemplo:

   **Si tus datos tienen estructura jerárquica (Departamento → Provincia → Distrito):**
   ```typescript
   export const locationDataFromUser: LocationData = {
       departments: [
           {
               name: "Lima",
               provinces: [
                   {
                       name: "Lima",
                       districts: ["Lima", "San Isidro", "Miraflores", "Surco"]
                   },
                   {
                       name: "Callao",
                       districts: ["Callao", "La Perla", "Bellavista"]
                   }
               ]
           },
           // ... más departamentos
       ]
   };
   ```

   **Si tus datos tienen estructura simple (Provincia → Distrito):**
   ```typescript
   export const locationDataFromUser: LocationData = {
       provinces: ["Lima", "Arequipa", "Cusco"],
       districts: {
           "Lima": ["Lima", "San Isidro", "Miraflores"],
           "Arequipa": ["Arequipa", "Yanahuara", "Cerro Colorado"],
           "Cusco": ["Cusco", "Santiago", "San Sebastián"]
       }
   };
   ```

### Opción 2: Usar archivo JSON externo

1. Reemplaza el contenido del archivo `lib/ubicaciones.json` con tus datos JSON
2. Asegúrate de que el JSON sea válido (puedes validarlo en https://jsonlint.com/)
3. En `lib/locationData.ts`, descomenta las líneas de importación si es necesario

### Opción 3: Estructura de tu JSON

El sistema soporta dos formatos:

#### Formato Jerárquico (Departamento → Provincia → Distrito)
```json
{
  "departments": [
    {
      "name": "Lima",
      "provinces": [
        {
          "name": "Lima",
          "districts": ["Lima", "San Isidro", "Miraflores"]
        },
        {
          "name": "Callao",
          "districts": ["Callao", "La Perla"]
        }
      ]
    }
  ]
}
```

#### Formato Simple (Provincia → Distrito)
```json
{
  "provinces": ["Lima", "Arequipa", "Cusco"],
  "districts": {
    "Lima": ["Lima", "San Isidro", "Miraflores"],
    "Arequipa": ["Arequipa", "Yanahuara"],
    "Cusco": ["Cusco", "Santiago"]
  }
}
```

## ✅ Verificación

Después de integrar tus datos:

1. La aplicación cargará automáticamente tus datos al iniciar
2. Ve a **Configuración → Provincias y Distritos** para verificar que se cargaron correctamente
3. Al agregar o editar candidatos, verás tus provincias y distritos en los campos correspondientes

## 🛠️ Notas Técnicas

- Los datos se convierten automáticamente al formato necesario para la aplicación
- Si hay departamentos en tu JSON, se "aplana" a provincias y distritos para mantener compatibilidad
- Los datos se guardan en la configuración de la aplicación y se pueden editar desde Settings

## 💡 Ejemplo Completo

Si tienes un JSON con esta estructura:
```json
{
  "departments": [
    {
      "name": "Lima",
      "provinces": [
        {
          "name": "Lima",
          "districts": ["Lima", "San Isidro", "Miraflores"]
        }
      ]
    }
  ]
}
```

Puedes pegarlo directamente en `locationData.ts` así:
```typescript
export const locationDataFromUser: LocationData = {
    departments: [
        {
            name: "Lima",
            provinces: [
                {
                    name: "Lima",
                    districts: ["Lima", "San Isidro", "Miraflores"]
                }
            ]
        }
    ]
};
```

¡Y listo! La aplicación usará tus datos automáticamente.

