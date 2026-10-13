/**
 * Utilidad para formatear fechas en formato peruano
 * Formato: "26 de Noviembre de 2025"
 */

const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Formatea una fecha en formato peruano: "26 de Noviembre de 2025"
 * 
 * @param date - Fecha a formatear (Date object o string ISO). Si no se proporciona, usa la fecha actual.
 * @returns String con la fecha formateada en formato peruano
 */
export function formatearFechaPeruana(date?: Date | string): string {
    let fecha: Date;
    
    if (!date) {
        fecha = new Date();
    } else if (typeof date === 'string') {
        const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
        fecha = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(date);
    } else {
        fecha = date;
    }
    
    // Validar que la fecha sea válida
    if (isNaN(fecha.getTime())) {
        fecha = new Date(); // Usar fecha actual si la fecha proporcionada no es válida
    }
    
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    
    return `${dia} de ${mes} de ${anio}`;
}

/**
 * Obtiene la fecha de emisión en formato peruano (fecha actual)
 * Esta función se usa para generar automáticamente la fecha de emisión de cartas
 * 
 * @returns String con la fecha actual en formato peruano
 */
export function obtenerFechaEmision(): string {
    return formatearFechaPeruana(new Date());
}

