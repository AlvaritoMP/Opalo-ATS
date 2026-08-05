/**
 * Instituciones del sistema financiero peruano (bancos, financieras, cajas)
 * usadas con frecuencia para depósito de sueldo / CTS.
 * Fuentes orientativas: entidades supervisadas por la SBS.
 */

export const PERU_FINANCIAL_INSTITUTIONS: string[] = [
    // Bancos
    'Banco de Crédito del Perú (BCP)',
    'BBVA Perú',
    'Interbank',
    'Scotiabank Perú',
    'BanBif',
    'Banco Pichincha',
    'Banco GNB Perú',
    'Banco Falabella',
    'Banco Ripley',
    'Banco Santander Perú',
    'Citibank del Perú',
    'Banco de Comercio',
    'Banco de la Nación',
    'Alfin Banco',
    'Banco Cencosud',
    'ICBC Perú Bank',
    'Bank of China (Perú)',
    'MiBanco',
    // Financieras
    'Financiera Confianza',
    'Financiera Efectiva',
    'Financiera Oh!',
    'Crediscotia Financiera',
    'Compartamos Financiera',
    'Financiera ProEmpresa',
    'Financiera Qapaq',
    'Financiera TFC',
    // Cajas municipales
    'Caja Arequipa',
    'Caja Cusco',
    'Caja Huancayo',
    'Caja Maynas',
    'Caja Metropolitana de Lima',
    'Caja Municipal de Pisco',
    'Caja Municipal del Santa',
    'Caja Pacífico',
    'Caja Piura',
    'Caja Sullana',
    'Caja Tacna',
    'Caja Trujillo',
    'Caja Paita',
    'Caja Ica',
    // Cajas rurales / otras
    'Caja Rural Cencosud Scotia',
    'Caja Rural Los Andes',
    'Caja Rural Del Centro',
    'Caja Rural Prymera',
    'Caja Rural Raíz',
    'Caja Rural Salvavidas',
    // Cooperativas / otras de uso frecuente en planilla
    'Cooperativa Pacífico',
    'Cooperativa Ahorro y Crédito Abaco',
    'Otro',
];

/** Opciones para <select>: lista canónica + valor actual si no está en el catálogo. */
export function bankSelectOptions(currentValue?: string | null): string[] {
    const current = (currentValue || '').trim();
    if (current && !PERU_FINANCIAL_INSTITUTIONS.includes(current) && current !== 'Otro') {
        return [current, ...PERU_FINANCIAL_INSTITUTIONS];
    }
    return PERU_FINANCIAL_INSTITUTIONS;
}
