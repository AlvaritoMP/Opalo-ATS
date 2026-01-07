// Configuración de la aplicación para aislamiento multi-tenant
// Este archivo define el nombre de la aplicación que se usa para filtrar datos en la base de datos

export const APP_NAME = 'Opalo ATS';

// Función helper para obtener el nombre de la app
export function getAppName(): string {
    return APP_NAME;
}

// Función helper para verificar si estamos usando multi-tenant
export function isMultiTenantEnabled(): boolean {
    return true;
}

