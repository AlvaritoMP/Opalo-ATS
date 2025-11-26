// Archivo para almacenar datos de ubicaciones (Departamentos, Provincias y Distritos)
// INSTRUCCIONES:
// 1. Si tienes un archivo JSON con tus datos, puedes importarlo aquí
// 2. O puedes pegar tus datos JSON directamente en este archivo
// 3. El formato puede ser:
//    - Jerárquico: { departments: [{ name: "...", provinces: [{ name: "...", districts: [...] }] }] }
//    - Simple: { provinces: [...], districts: { "Provincia": [...] } }

// Importar datos desde archivo JSON externo
import ubigeoJSON from './ubicaciones.json';

export interface LocationData {
    departments?: DepartmentData[];
    provinces?: string[];
    districts?: { [province: string]: string[] };
}

export interface DepartmentData {
    name: string;
    provinces: {
        name: string;
        districts: string[];
    }[];
}

// Interfaces para formato UBIGEO (formato oficial del Perú)
export interface UbigeoDepartamento {
    id: number;
    departamento: string;
    ubigeo: string;
}

export interface UbigeoProvincia {
    id: number;
    provincia: string;
    ubigeo: string;
    departamento_id: number;
}

export interface UbigeoDistrito {
    id: number;
    distrito: string;
    ubigeo: string;
    provincia_id: number;
    departamento_id: number;
}

export interface UbigeoData {
    ubigeo_departamentos?: UbigeoDepartamento[];
    ubigeo_provincias?: UbigeoProvincia[];
    ubigeo_distritos?: UbigeoDistrito[];
}

// Cargar datos desde archivo JSON externo
let importedLocationData: UbigeoData | null = null;
try {
    importedLocationData = ubigeoJSON as UbigeoData;
    // Verificar que tenga la estructura UBIGEO
    if (!importedLocationData.ubigeo_departamentos && !importedLocationData.ubigeo_provincias) {
        importedLocationData = null;
    }
} catch (e) {
    console.warn('No se pudo cargar ubicaciones.json, usando datos por defecto', e);
    importedLocationData = null;
}

// Si tienes datos JSON con estructura jerárquica (Departamento -> Provincia -> Distrito)
// Puedes usar esta interfaz. Ejemplo:
/*
export const locationDataFromJSON: LocationData = {
    departments: [
        {
            name: "Lima",
            provinces: [
                {
                    name: "Lima",
                    districts: ["Lima", "San Isidro", "Miraflores", "Surco", "La Molina", "Barranco"]
                },
                {
                    name: "Callao",
                    districts: ["Callao", "La Perla", "Bellavista"]
                }
            ]
        },
        {
            name: "Arequipa",
            provinces: [
                {
                    name: "Arequipa",
                    districts: ["Arequipa", "Yanahuara", "Cerro Colorado", "Cayma"]
                }
            ]
        }
    ]
};
*/

// Si prefieres la estructura simple (solo Provincias y Distritos)
// Ejemplo:
export const locationDataSimple: LocationData = {
    provinces: [
        "Lima",
        "Arequipa",
        "Cusco",
        "La Libertad",
        "Piura",
        "Lambayeque",
        "Junín",
        "Cajamarca",
        "Puno",
        "Tacna"
    ],
    districts: {
        "Lima": ["Lima", "San Isidro", "Miraflores", "Surco", "La Molina", "Barranco", "Chorrillos", "Callao"],
        "Arequipa": ["Arequipa", "Yanahuara", "Cerro Colorado", "Cayma", "Sachaca"],
        "Cusco": ["Cusco", "Santiago", "San Sebastián", "San Jerónimo", "Wanchaq"],
        "La Libertad": ["Trujillo", "La Esperanza", "El Porvenir", "Victor Larco Herrera"],
        "Piura": ["Piura", "Castilla", "Catacaos", "Veintiséis de Octubre"],
        "Lambayeque": ["Chiclayo", "Lambayeque", "Ferreñafe", "Pimentel"],
        "Junín": ["Huancayo", "Chilca", "El Tambo", "San Jerónimo"],
        "Cajamarca": ["Cajamarca", "Baños del Inca", "Los Baños del Inca"],
        "Puno": ["Puno", "Juliaca", "Ilave", "Ayaviri"],
        "Tacna": ["Tacna", "Alto de la Alianza", "Ciudad Nueva"]
    }
};

// Función para convertir datos jerárquicos (Departamento -> Provincia -> Distrito) 
// al formato simple (Provincia -> Distrito)
export function convertHierarchicalToSimple(data: { departments: DepartmentData[] }): { provinces: string[], districts: { [province: string]: string[] } } {
    const provinces: string[] = [];
    const districts: { [province: string]: string[] } = {};

    data.departments.forEach(dept => {
        dept.provinces.forEach(prov => {
            if (!provinces.includes(prov.name)) {
                provinces.push(prov.name);
            }
            districts[prov.name] = prov.districts;
        });
    });

    return { provinces, districts };
}

// Función para convertir formato UBIGEO al formato jerárquico
export function convertUbigeoToHierarchical(ubigeoData: UbigeoData): { provinces: string[], districts: { [province: string]: string[] } } {
    const provinces: string[] = [];
    const districts: { [province: string]: string[] } = {};
    
    if (!ubigeoData.ubigeo_provincias) {
        return { provinces: [], districts: {} };
    }
    
    // Asegurar que ubigeo_distritos existe (puede ser un array vacío)
    if (!ubigeoData.ubigeo_distritos) {
        ubigeoData.ubigeo_distritos = [];
    }

    // Crear mapas para facilitar el acceso
    const provinciasMap = new Map<number, string>();
    const distritosPorProvincia = new Map<number, string[]>();
    
    // Mapear provincias por su ID
    ubigeoData.ubigeo_provincias.forEach(prov => {
        provinciasMap.set(prov.id, prov.provincia);
        if (!distritosPorProvincia.has(prov.id)) {
            distritosPorProvincia.set(prov.id, []);
        }
    });
    
    // Agregar distritos a sus provincias
    ubigeoData.ubigeo_distritos.forEach(dist => {
        const provinciaId = dist.provincia_id;
        const distritos = distritosPorProvincia.get(provinciaId) || [];
        distritos.push(dist.distrito);
        distritosPorProvincia.set(provinciaId, distritos);
    });
    
    // Construir la estructura final
    ubigeoData.ubigeo_provincias.forEach(prov => {
        const nombreProvincia = prov.provincia;
        if (!provinces.includes(nombreProvincia)) {
            provinces.push(nombreProvincia);
        }
        const distritos = distritosPorProvincia.get(prov.id) || [];
        districts[nombreProvincia] = distritos;
    });
    
    return { provinces: provinces.sort(), districts };
}

// =====================================================================
// PUNTO DE ENTRADA PARA TUS DATOS JSON
// =====================================================================
// Para usar tus propios datos JSON, tienes 3 opciones:
//
// OPCIÓN 1: Pegar tus datos JSON directamente aquí abajo
//    Reemplaza locationDataSimple con tus datos, o crea una nueva variable
//    y cámbiala en el return de getLocationData()
//
// OPCIÓN 2: Crear un archivo JSON y cargarlo
//    - Crea un archivo ubicaciones.json en la carpeta lib/
//    - Descomenta las líneas de importación arriba
//    - Pega tu JSON en ese archivo
//
// OPCIÓN 3: Pasar los datos directamente al llamar getLocationData()
//    getLocationData(tusDatosJSON)
//
// FORMATOS SOPORTADOS:
//  - Estructura jerárquica: { departments: [{ name: "...", provinces: [{ name: "...", districts: [...] }] }] }
//  - Estructura simple: { provinces: [...], districts: { "Provincia": [...] } }
// =====================================================================

// =====================================================================
// PEGA TUS DATOS JSON AQUÍ
// =====================================================================
// Puedes pegar tus datos en formato UBIGEO o en formato jerárquico
// =====================================================================

// Opción 1: Formato UBIGEO (con ubigeo_departamentos, ubigeo_provincias, ubigeo_distritos)
export const ubigeoDataFromUser: UbigeoData | null = {
    ubigeo_departamentos: [
        { "id": 1, "departamento": "AMAZONAS", "ubigeo": "01" },
        { "id": 2, "departamento": "ANCASH", "ubigeo": "02" },
        { "id": 3, "departamento": "APURIMAC", "ubigeo": "03" },
        { "id": 4, "departamento": "AREQUIPA", "ubigeo": "04" },
        { "id": 5, "departamento": "AYACUCHO", "ubigeo": "05" },
        { "id": 6, "departamento": "CAJAMARCA", "ubigeo": "06" },
        { "id": 7, "departamento": "CALLAO", "ubigeo": "07" },
        { "id": 8, "departamento": "CUSCO", "ubigeo": "08" },
        { "id": 9, "departamento": "HUANCAVELICA", "ubigeo": "09" },
        { "id": 10, "departamento": "HUANUCO", "ubigeo": "10" },
        { "id": 11, "departamento": "ICA", "ubigeo": "11" },
        { "id": 12, "departamento": "JUNIN", "ubigeo": "12" },
        { "id": 13, "departamento": "LA LIBERTAD", "ubigeo": "13" },
        { "id": 14, "departamento": "LAMBAYEQUE", "ubigeo": "14" },
        { "id": 15, "departamento": "LIMA", "ubigeo": "15" },
        { "id": 16, "departamento": "LORETO", "ubigeo": "16" },
        { "id": 17, "departamento": "MADRE DE DIOS", "ubigeo": "17" },
        { "id": 18, "departamento": "MOQUEGUA", "ubigeo": "18" },
        { "id": 19, "departamento": "PASCO", "ubigeo": "19" },
        { "id": 20, "departamento": "PIURA", "ubigeo": "20" },
        { "id": 21, "departamento": "PUNO", "ubigeo": "21" },
        { "id": 22, "departamento": "SAN MARTIN", "ubigeo": "22" },
        { "id": 23, "departamento": "TACNA", "ubigeo": "23" },
        { "id": 24, "departamento": "TUMBES", "ubigeo": "24" },
        { "id": 25, "departamento": "UCAYALI", "ubigeo": "25" }
    ]
    // TODO: Agregar ubigeo_provincias y ubigeo_distritos cuando los tengas
};

// Opción 2: Formato jerárquico tradicional (departments -> provinces -> districts)
export const locationDataFromUser: LocationData | null = null;

// Función para obtener datos de ubicación en el formato esperado por la aplicación
export function getLocationData(jsonData?: any): { provinces: string[], districts: { [province: string]: string[] } } {
    // Prioridad 1: Datos proporcionados como parámetro
    if (jsonData) {
        // Formato UBIGEO
        if (jsonData.ubigeo_departamentos || jsonData.ubigeo_provincias || jsonData.ubigeo_distritos) {
            return convertUbigeoToHierarchical(jsonData as UbigeoData);
        }
        // Formato jerárquico tradicional
        if (jsonData.departments && Array.isArray(jsonData.departments)) {
            return convertHierarchicalToSimple(jsonData as { departments: DepartmentData[] });
        }
        // Formato simple
        if (jsonData.provinces && jsonData.districts) {
            return {
                provinces: jsonData.provinces,
                districts: jsonData.districts
            };
        }
    }
    
    // Prioridad 2: Datos UBIGEO desde archivo JSON externo
    if (importedLocationData) {
        // Si tiene provincias (y opcionalmente distritos), usarlos
        if (importedLocationData.ubigeo_provincias && importedLocationData.ubigeo_provincias.length > 0) {
            // Usar distritos si están disponibles, sino usar array vacío
            if (!importedLocationData.ubigeo_distritos) {
                importedLocationData.ubigeo_distritos = [];
            }
            return convertUbigeoToHierarchical(importedLocationData);
        }
    }
    
    // Prioridad 3: Datos UBIGEO del usuario (en código)
    if (ubigeoDataFromUser && (ubigeoDataFromUser.ubigeo_provincias && ubigeoDataFromUser.ubigeo_distritos)) {
        return convertUbigeoToHierarchical(ubigeoDataFromUser);
    }
    
    // Prioridad 4: Datos jerárquicos del usuario
    if (locationDataFromUser) {
        if (locationDataFromUser.departments) {
            return convertHierarchicalToSimple(locationDataFromUser as { departments: DepartmentData[] });
        }
        if (locationDataFromUser.provinces && locationDataFromUser.districts) {
            return {
                provinces: locationDataFromUser.provinces,
                districts: locationDataFromUser.districts
            };
        }
    }
    
    // Prioridad 5: Datos por defecto
    return {
        provinces: locationDataSimple.provinces || [],
        districts: locationDataSimple.districts || {}
    };
}

