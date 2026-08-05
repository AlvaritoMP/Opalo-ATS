/** Tipos y helpers de la ficha complementaria pública (sin login). */

export type DocumentoTipo = 'DNI' | 'CE' | 'Pasaporte';
export type SexoTipo = 'Masculino' | 'Femenino';
export type EstadoCivilTipo = 'Soltero' | 'Casado' | 'Viudo' | 'Divorciado';
export type MotivoCeseTipo = 'Renuncia' | 'Despido' | 'Abandono';
export type SistemaPensionesTipo = 'AFP' | 'ONP';

export interface ComplementaryFamiliar {
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    parentesco?: string;
    edad?: string;
    telefono?: string;
}

export interface ComplementaryEducacion {
    nivel?: string;
    institucion?: string;
    lugar?: string;
    periodo?: string;
    grado?: string;
}

export interface ComplementaryExperiencia {
    empresa?: string;
    puesto?: string;
    fechaIngreso?: string;
    fechaCese?: string;
    motivoCese?: MotivoCeseTipo | '';
}

export interface ComplementarySalud {
    tipoEnfermedad?: string;
    edad?: string;
    diagnostico?: string;
    secuela?: string;
}

export interface ComplementaryFichaData {
    version: 1;
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    fechaNacimiento?: string;
    tipoDocumento?: DocumentoTipo | '';
    nroDocumento?: string;
    nacionalidad?: string;
    edad?: string;
    sexo?: SexoTipo | '';
    estadoCivil?: EstadoCivilTipo | '';
    email?: string;
    telefono?: string;
    tallaCamisa?: string;
    tallaPantalon?: string;
    tallaCalzado?: string;
    emergenciaTelefono?: string;
    emergenciaParentesco?: string;
    direccion?: string;
    distrito?: string;
    provincia?: string;
    departamento?: string;
    familiares?: ComplementaryFamiliar[];
    parienteEnOpalo?: boolean | null;
    nombreFamiliarOpalo?: string;
    educacion?: ComplementaryEducacion[];
    experienciaLaboral?: ComplementaryExperiencia[];
    antecedentesSalud?: ComplementarySalud[];
    unidadDestaque?: string;
    puestoContrato?: string;
    bancoSueldo?: string;
    bancoCts?: string;
    sistemaPensionesAnterior?: SistemaPensionesTipo | '';
    sistemaPensionesDeseado?: SistemaPensionesTipo | '';
    declaracionAceptada?: boolean;
    submittedAt?: string;
}

export interface ComplementaryLookupMatch {
    candidateId: string;
    name: string;
    processId: string;
    processTitle: string;
    alreadyFilled: boolean;
    filledAt?: string;
}

export interface ComplementaryPrefillPayload {
    candidateId: string;
    name: string;
    processId: string;
    processTitle: string;
    alreadyFilled: boolean;
    filledAt?: string;
    form: ComplementaryFichaData;
}

export function emptyComplementaryFicha(): ComplementaryFichaData {
    return {
        version: 1,
        tipoDocumento: 'DNI',
        familiares: [{ }],
        educacion: [{ }],
        experienciaLaboral: [{ }],
        antecedentesSalud: [],
        parienteEnOpalo: null,
        declaracionAceptada: false,
    };
}

export function normalizeDniDigits(dni?: string | null): string {
    return (dni || '').replace(/\D/g, '');
}

/** URL pública del formulario (sin acceso al ATS). */
export function buildPublicComplementaryFichaUrl(dni?: string): string {
    const url = new URL(window.location.origin);
    url.searchParams.set('ficha', '1');
    const digits = normalizeDniDigits(dni);
    if (digits) url.searchParams.set('dni', digits);
    return url.toString();
}

export function isPublicComplementaryFichaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('ficha');
}

export function getDniFromPublicUrl(): string {
    if (typeof window === 'undefined') return '';
    return normalizeDniDigits(new URLSearchParams(window.location.search).get('dni'));
}

export function composeFullNameFromFicha(data: ComplementaryFichaData): string {
    return [data.nombres, data.apellidoPaterno, data.apellidoMaterno]
        .map((p) => (p || '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Une ficha guardada + datos ya existentes del candidato (ATS tiene prioridad solo si ficha está vacía). */
export function mergePrefill(
    base: ComplementaryFichaData,
    fromCandidate: Partial<ComplementaryFichaData>
): ComplementaryFichaData {
    const out: ComplementaryFichaData = { ...emptyComplementaryFicha(), ...base };
    for (const [key, value] of Object.entries(fromCandidate)) {
        if (key === 'version' || key === 'familiares' || key === 'educacion' || key === 'experienciaLaboral' || key === 'antecedentesSalud') {
            continue;
        }
        const current = (out as Record<string, unknown>)[key];
        const empty =
            current === undefined ||
            current === null ||
            current === '' ||
            (typeof current === 'boolean' && current === false && key === 'declaracionAceptada');
        if (empty && value !== undefined && value !== null && value !== '') {
            (out as Record<string, unknown>)[key] = value;
        }
    }
    if (!out.familiares?.length) out.familiares = [{ }];
    if (!out.educacion?.length) out.educacion = [{ }];
    if (!out.experienciaLaboral?.length) out.experienciaLaboral = [{ }];
    if (!out.antecedentesSalud) out.antecedentesSalud = [];
    return out;
}
