/**
 * Carga (o elimina) procesos DEMO para revisar el ATS como reclutador.
 *
 *   node scripts/seed-demo-procesos.mjs
 *   node scripts/seed-demo-procesos.mjs --delete
 *
 * Marcadores para borrar mañana: título "DEMO - …", orden DEMO-NORMAL / DEMO-MASIVO,
 * cliente "DEMO Cliente Revisión", usuario demo.reclutador@opalo-demo.pe.
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const APP = 'Opalo ATS';
const ASSETS = 'C:/Users/user/.cursor/projects/c-Users-user-Opalo-ATS/assets';
const BUCKET = 'app-files';
const PREFIX = 'demo/2026-11-26';

const CLIENT_ID = 'a1000001-0000-4000-8000-000000000001';
const USER_ID = 'a1000001-0000-4000-8000-000000000002';
const PROCESS_NORMAL = 'a1000001-0000-4000-8000-000000000010';
const PROCESS_BULK = 'a1000001-0000-4000-8000-000000000020';
const SHORTLIST_ID = 'a1000001-0000-4000-8000-000000000090';

const CAT = {
    cv: 'a1000001-0000-4000-8000-000000000031',
    dni: 'a1000001-0000-4000-8000-000000000032',
    estudios: 'a1000001-0000-4000-8000-000000000033',
    cvB: 'a1000001-0000-4000-8000-000000000034',
    dniB: 'a1000001-0000-4000-8000-000000000035',
    estudiosB: 'a1000001-0000-4000-8000-000000000036',
};

const ST_N = [
    'a1000001-0000-4000-8000-000000000011',
    'a1000001-0000-4000-8000-000000000012',
    'a1000001-0000-4000-8000-000000000013',
    'a1000001-0000-4000-8000-000000000014',
    'a1000001-0000-4000-8000-000000000015',
    'a1000001-0000-4000-8000-000000000016',
    'a1000001-0000-4000-8000-000000000017',
];
const ST_B = [
    'a1000001-0000-4000-8000-000000000021',
    'a1000001-0000-4000-8000-000000000022',
    'a1000001-0000-4000-8000-000000000023',
    'a1000001-0000-4000-8000-000000000024',
    'a1000001-0000-4000-8000-000000000025',
    'a1000001-0000-4000-8000-000000000026',
    'a1000001-0000-4000-8000-000000000027',
];

const COL = {
    experiencia: 'c1000001-0000-4000-8000-000000000001',
    disponibilidad: 'c1000001-0000-4000-8000-000000000002',
    secundaria: 'c1000001-0000-4000-8000-000000000003',
    turno: 'c1000001-0000-4000-8000-000000000004',
    observaciones: 'c1000001-0000-4000-8000-000000000005',
    asistencia: 'c1000001-0000-4000-8000-000000000006',
};

const DEMO_EMAIL = 'demo.reclutador@opalo-demo.pe';
const DEMO_PASSWORD = 'DemoOpalo2026';
const ACCESS_DNI = '90000001';
const SALA_TOKEN = 'demo-sala-analista-2026';

function loadEnv() {
    const env = readFileSync('.env.local', 'utf8');
    const get = (k) => {
        const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
        return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
    };
    return { url: get('VITE_SUPABASE_URL'), key: get('VITE_SUPABASE_ANON_KEY') };
}

function nameKey(name) {
    return '__name__' + name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function wrap(text, size = 92) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > size) {
            if (line) lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines;
}

async function makePdf({ title, subtitle, paragraphs, photoBytes }) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595, 842]);
    const ink = rgb(0.12, 0.16, 0.22);
    const muted = rgb(0.35, 0.4, 0.48);
    page.drawRectangle({ x: 0, y: 790, width: 595, height: 52, color: rgb(0.08, 0.2, 0.35) });
    page.drawText('DOCUMENTO FICTICIO  ·  PROCESO DEMO', {
        x: 40, y: 812, size: 11, font: bold, color: rgb(1, 1, 1),
    });
    page.drawText(title, { x: 40, y: 750, size: 16, font: bold, color: ink });
    let y = 728;
    if (subtitle) {
        page.drawText(subtitle, { x: 40, y, size: 11, font, color: muted });
        y -= 22;
    }
    if (photoBytes) {
        const img = await pdf.embedJpg(photoBytes);
        page.drawImage(img, { x: 450, y: 680, width: 100, height: 100 });
    }
    for (const paragraph of paragraphs) {
        for (const line of wrap(paragraph)) {
            if (y < 50) break;
            page.drawText(line, { x: 40, y, size: 11, font, color: ink });
            y -= 16;
        }
        y -= 8;
    }
    page.drawText('Este archivo no es un documento oficial. Sirve solo para recorrer Opalo ATS.', {
        x: 40, y: 36, size: 9, font, color: muted,
    });
    return Buffer.from(await pdf.save());
}

function cell(columnId, columnName, value) {
    return { [columnId]: value, [nameKey(columnName)]: value };
}

function bulkValues(parts) {
    return Object.assign({}, ...parts);
}

function psych(name, puesto, status, score, profile) {
    return {
        intellectualLevelId: score >= 45 ? 'normal_superior' : 'normal_promedio',
        intellectualScore: score,
        personality: [
            { traitId: 'estabilidad_emocional', level: 'alto', observations: 'Se mantiene estable cuando cambian las prioridades del dia.' },
            { traitId: 'autoconcepto', level: 'promedio', observations: 'Seguridad adecuada, pide apoyo cuando la tarea se sale de su experiencia.' },
            { traitId: 'sociabilidad', level: 'alto', observations: 'Se relaciona con facilidad con jefatura y con el equipo.' },
        ],
        competencies: [
            { competencyId: 'comp_calidad', obtainedScore: 8, observations: 'Revisa su trabajo antes de entregarlo.' },
            { competencyId: 'comp_planificacion', obtainedScore: 7, observations: 'Ordena las tareas de la semana y avisa si un plazo se aprieta.' },
            { competencyId: 'comp_equipo', obtainedScore: 8, observations: 'Comparte informacion y cubre a un companero cuando hace falta.' },
            { competencyId: 'comp_resultados', obtainedScore: 7, observations: 'Cierra lo comprometido dentro del plazo acordado.' },
            { competencyId: 'comp_presion', obtainedScore: 6, observations: 'Sostiene el ritmo en semanas de cierre, con algo de tension visible.' },
        ],
        conclusions: `Informe ficticio de demostracion. ${name} resulta ${status === 'apto' ? 'apto' : status === 'apto_reservas' ? 'apto con reservas' : 'no apto'} para ${puesto}.`,
        suitabilityStatus: status,
        reportDate: '2026-11-24',
        evaluatedAt: '2026-11-24T15:00:00.000Z',
        positionApplied: puesto,
        assessmentSource: { profile, updatedAt: '2026-11-24T15:00:00.000Z', personalidad: true, inteligencia: profile === 'operativos' },
    };
}

function ficha(person, extra) {
    return {
        version: 1,
        nombres: person.nombres,
        apellidoPaterno: person.apellidoPaterno,
        apellidoMaterno: person.apellidoMaterno,
        fechaNacimiento: person.nacimiento,
        tipoDocumento: 'DNI',
        nroDocumento: person.dni,
        nacionalidad: 'Peruana',
        edad: String(person.age),
        sexo: person.sexo,
        estadoCivil: person.estadoCivil,
        email: person.email,
        telefono: person.phone,
        tallaCamisa: person.tallaCamisa,
        tallaPantalon: person.tallaPantalon,
        tallaCalzado: person.tallaCalzado,
        emergenciaNombre: person.emergenciaNombre,
        emergenciaTelefono: person.emergenciaTelefono,
        emergenciaParentesco: person.emergenciaParentesco,
        direccion: person.address,
        distrito: person.district,
        provincia: person.province,
        departamento: 'Lima',
        familiares: [
            { nombres: person.familiarNombres, apellidoPaterno: person.apellidoPaterno, apellidoMaterno: person.apellidoMaterno, parentesco: 'Hermano', edad: '30', telefono: '999111222' },
        ],
        parienteEnOpalo: false,
        educacion: [
            { nivel: person.nivel, institucion: person.institucion, lugar: 'Lima', periodo: person.periodo, grado: 'Completo' },
        ],
        experienciaLaboral: [
            { empresa: person.empresa, puesto: person.puestoPrevio, fechaIngreso: '2022-03-01', fechaCese: '2026-09-30', motivoCese: 'Renuncia' },
        ],
        antecedentesSalud: [],
        unidadDestaque: 'Lima',
        puestoContrato: extra.puesto,
        bancoSueldo: 'BCP',
        bancoCts: 'BCP',
        sistemaPensionesAnterior: 'AFP',
        sistemaPensionesDeseado: 'AFP',
        declaracionAceptada: true,
        submittedAt: '2026-11-22T16:30:00.000Z',
    };
}

function discFactors(d, i, s, c) {
    const factor = (net) => ({ most: Math.max(net, 0), least: Math.max(-net, 0), net });
    return { D: factor(d), I: factor(i), S: factor(s), C: factor(c) };
}

const normalPeople = [
    {
        id: 'a1000001-0000-4000-8000-000000000101',
        foto: 'demo-foto-01.jpg',
        nombres: 'Lucia Fernanda', apellidoPaterno: 'Quispe', apellidoMaterno: 'Rojas',
        email: 'lucia.quispe.demo@correo-demo.pe', phone: '999100101', phone2: '999200101',
        age: 28, dni: '90110001', stage: 0, source: 'LinkedIn',
        district: 'MIRAFLORES', address: 'Calle Berlín 180, Miraflores',
        salary: 'S/ 5,200', agreed: null, words: null,
        sexo: 'Femenino', estadoCivil: 'Soltero', nacimiento: '1998-04-12',
        linkedin: 'https://www.linkedin.com/in/demo-lucia-quispe',
        descripcion: 'Analista de seleccion con 4 anos en reclutamiento masivo y de perfiles administrativos. Maneja entrevistas por competencia y seguimiento en ATS.',
        score: 74,
        meta: 'Perfil administrativo solido, comunicacion clara y experiencia en volumen. Aun no pasa a entrevista.',
        origin: 'manual',
    },
    {
        id: 'a1000001-0000-4000-8000-000000000102',
        foto: 'demo-foto-02.jpg',
        nombres: 'Andres Mateo', apellidoPaterno: 'Huaman', apellidoMaterno: 'Diaz',
        email: 'andres.huaman.demo@correo-demo.pe', phone: '999100102', phone2: '999200102',
        age: 31, dni: '90110002', stage: 1, source: 'Referido',
        district: 'SURQUILLO', address: 'Jr. Angamos Este 940, Surquillo',
        salary: 'S/ 6,800', agreed: null, words: null,
        sexo: 'Masculino', estadoCivil: 'Casado', nacimiento: '1995-01-20',
        linkedin: 'https://www.linkedin.com/in/demo-andres-huaman',
        descripcion: 'Viene de una consultora de busqueda. Pretension por encima de la banda y poca disponibilidad para el horario del puesto.',
        score: 48,
        meta: 'Experiencia interesante, pero la pretension y la disponibilidad no calzan con la vacante.',
        origin: 'manual',
        discarded: true,
        discardReason: 'DEMO: pretension salarial fuera de banda y disponibilidad incompatible.',
    },
    {
        id: 'a1000001-0000-4000-8000-000000000103',
        foto: 'demo-foto-03.jpg',
        nombres: 'Camila Sofia', apellidoPaterno: 'Vargas', apellidoMaterno: 'Leon',
        email: 'camila.vargas.demo@correo-demo.pe', phone: '999100103', phone2: '999200103',
        age: 34, dni: '90110003', stage: 2, source: 'Website',
        district: 'SAN ISIDRO', address: 'Av. Javier Prado Oeste 1420, San Isidro',
        salary: 'S/ 5,500', agreed: null, words: null,
        sexo: 'Femenino', estadoCivil: 'Soltero', nacimiento: '1992-08-03',
        linkedin: 'https://www.linkedin.com/in/demo-camila-vargas',
        descripcion: 'Lidero un equipo de 3 analistas en una empresa de consumo. Buena estructura de entrevista y reporte al cliente.',
        score: 86,
        meta: 'Encaja con el puesto. Entrevista de RRHH agendada. Comunicacion ordenada y ejemplos concretos.',
        origin: 'formulario',
        interview: { id: 'a1000001-0000-4000-8000-000000000303', start: '2026-11-27T15:00:00.000Z', end: '2026-11-27T15:45:00.000Z', title: 'Entrevista RRHH con Camila Sofia Vargas Leon' },
    },
    {
        id: 'a1000001-0000-4000-8000-000000000104',
        foto: 'demo-foto-04.jpg',
        nombres: 'Diego Alonso', apellidoPaterno: 'Paredes', apellidoMaterno: 'Cruz',
        email: 'diego.paredes.demo@correo-demo.pe', phone: '999100104', phone2: '999200104',
        age: 36, dni: '90110004', stage: 3, source: 'Computrabajo',
        district: 'SAN BORJA', address: 'Av. San Borja Norte 610, San Borja',
        salary: 'S/ 5,800', agreed: null, words: null,
        sexo: 'Masculino', estadoCivil: 'Casado', nacimiento: '1990-11-15',
        linkedin: 'https://www.linkedin.com/in/demo-diego-paredes',
        descripcion: 'Analista senior. Ya paso entrevista de RRHH y tiene informe psicolaboral apto con reservas por ritmo bajo al inicio.',
        score: 81,
        meta: 'Buen criterio de seleccion. Reservar el arranque: necesita una semana de doble acompanamiento.',
        origin: 'manual',
        psych: 'apto_reservas',
        psychScore: 42,
        interview: { id: 'a1000001-0000-4000-8000-000000000304', start: '2026-11-20T15:00:00.000Z', end: '2026-11-20T16:00:00.000Z', title: 'Entrevista con cliente - Diego Alonso Paredes Cruz', past: true },
        assessment: 'mandos',
    },
    {
        id: 'a1000001-0000-4000-8000-000000000105',
        foto: 'demo-foto-05.jpg',
        nombres: 'Valeria Nicole', apellidoPaterno: 'Salazar', apellidoMaterno: 'Mendoza',
        email: 'valeria.salazar.demo@correo-demo.pe', phone: '999100105', phone2: '999200105',
        age: 29, dni: '90110005', stage: 5, source: 'LinkedIn',
        district: 'SANTIAGO DE SURCO', address: 'Av. Caminos del Inca 1450, Santiago de Surco',
        salary: 'S/ 5,400', agreed: 'S/ 5,200', words: 'Cinco mil doscientos y 00/100 soles',
        sexo: 'Femenino', estadoCivil: 'Soltero', nacimiento: '1997-02-28',
        linkedin: 'https://www.linkedin.com/in/demo-valeria-salazar',
        descripcion: 'Finalista. Oferta verbal aceptada sujeta a documentos. Visible para el cliente en la sala de shortlist.',
        score: 92,
        meta: 'Mejor ajuste del proceso. Oferta en curso y documentos casi completos.',
        origin: 'formulario',
        visible: true,
        ficha: true,
        offer: '2026-11-25',
        nivel: 'Universitario', institucion: 'Universidad de Lima', periodo: '2015-2020',
        empresa: 'Consultora Norte', puestoPrevio: 'Analista de seleccion',
        tallaCamisa: 'S', tallaPantalon: '28', tallaCalzado: '37',
        emergenciaNombre: 'Rosa Mendoza', emergenciaTelefono: '999300105', emergenciaParentesco: 'Madre',
        familiarNombres: 'Pedro',
    },
    {
        id: 'a1000001-0000-4000-8000-000000000106',
        foto: 'demo-foto-06.jpg',
        nombres: 'Ricardo Jose', apellidoPaterno: 'Mamani', apellidoMaterno: 'Flores',
        email: 'ricardo.mamani.demo@correo-demo.pe', phone: '999100106', phone2: '999200106',
        age: 41, dni: '90110006', stage: 6, source: 'Referido',
        district: 'LA MOLINA', address: 'Calle Los Sauces 220, La Molina',
        salary: 'S/ 5,600', agreed: 'S/ 5,500', words: 'Cinco mil quinientos y 00/100 soles',
        sexo: 'Masculino', estadoCivil: 'Casado', nacimiento: '1985-06-09',
        linkedin: 'https://www.linkedin.com/in/demo-ricardo-mamani',
        descripcion: 'Contratado en este proceso demo para mostrar la etapa final, la fecha de ingreso y el cierre de vacante.',
        score: 90,
        meta: 'Cierre del proceso. Ingreso coordinado y documentos completos.',
        origin: 'manual',
        visible: true,
        psych: 'apto',
        psychScore: 48,
        hireDate: '2026-12-01',
        offer: '2026-11-18',
        assessment: 'mandos',
    },
];

const bulkPeople = [
    {
        id: 'a1000001-0000-4000-8000-000000000201',
        foto: 'demo-foto-07.jpg',
        nombres: 'Pedro Luis', apellidoPaterno: 'Castro', apellidoMaterno: 'Quispe',
        email: 'pedro.castro.demo@correo-demo.pe', phone: '999100201', phone2: '999200201',
        age: 23, dni: '90220001', stage: 0, source: 'Facebook',
        district: 'SAN JUAN DE LURIGANCHO', address: 'Av. Próceres 3100, San Juan de Lurigancho',
        salary: 'S/ 1,600', agreed: null, words: null,
        sexo: 'Masculino', estadoCivil: 'Soltero', nacimiento: '2003-03-14',
        descripcion: 'Primera postulacion. Secundaria completa, pero no tiene disponibilidad inmediata.',
        score: 46,
        meta: 'No pasa filtro automatico: sin disponibilidad inmediata.',
        origin: 'formulario',
        exp: 1, disp: 'No', secundaria: 'Si', turno: 'Manana', asistencia: '', obs: 'Puede empezar en dos semanas.',
    },
    {
        id: 'a1000001-0000-4000-8000-000000000202',
        foto: 'demo-foto-08.jpg',
        nombres: 'Rosa Elena', apellidoPaterno: 'Chavez', apellidoMaterno: 'Poma',
        email: 'rosa.chavez.demo@correo-demo.pe', phone: '999100202', phone2: '999200202',
        age: 27, dni: '90220002', stage: 1, source: 'WhatsApp',
        district: 'ATE', address: 'Av. Los Ingenieros 1550, Ate',
        salary: 'S/ 1,500', agreed: null, words: null,
        sexo: 'Femenino', estadoCivil: 'Soltero', nacimiento: '1999-09-01',
        descripcion: 'Operaria con experiencia en picking. Supero las preguntas filtro y espera contacto.',
        score: 71,
        meta: 'Pasa killer questions. Falta llamada de confirmacion.',
        origin: 'masivo',
        exp: 3, disp: 'Si', secundaria: 'Si', turno: 'Tarde', asistencia: '', obs: 'Vive a 25 minutos del almacen.',
    },
    {
        id: 'a1000001-0000-4000-8000-000000000203',
        foto: 'demo-foto-09.jpg',
        nombres: 'Luis Alberto', apellidoPaterno: 'Rojas', apellidoMaterno: 'Silva',
        email: 'luis.rojas.demo@correo-demo.pe', phone: '999100203', phone2: '999200203',
        age: 32, dni: '90220003', stage: 2, source: 'Referido',
        district: 'SANTA ANITA', address: 'Av. La Molina 820, Santa Anita',
        salary: 'S/ 1,700', agreed: null, words: null,
        sexo: 'Masculino', estadoCivil: 'Casado', nacimiento: '1994-12-05',
        descripcion: 'Ya fue contactado por telefono. Confirmo interes y turno rotativo.',
        score: 80,
        meta: 'Contacto exitoso. Listo para agendar entrevista.',
        origin: 'manual',
        exp: 6, disp: 'Si', secundaria: 'Si', turno: 'Rotativo', asistencia: '', obs: 'Tiene experiencia con montacarga.',
    },
    {
        id: 'a1000001-0000-4000-8000-000000000204',
        foto: 'demo-foto-10.jpg',
        nombres: 'Maria del Carmen', apellidoPaterno: 'Gutierrez', apellidoMaterno: 'Vega',
        email: 'maria.gutierrez.demo@correo-demo.pe', phone: '999100204', phone2: '999200204',
        age: 30, dni: '90220004', stage: 3, source: 'Bolsa de trabajo',
        district: 'EL AGUSTINO', address: 'Av. Riva Aguero 2400, El Agustino',
        salary: 'S/ 1,550', agreed: null, words: null,
        sexo: 'Femenino', estadoCivil: 'Soltero', nacimiento: '1996-05-22',
        descripcion: 'Entrevista agendada. Ficha complementaria ya enviada.',
        score: 88,
        meta: 'Muy buen ajuste operativo. Ficha completa y cita confirmada.',
        origin: 'formulario',
        exp: 5, disp: 'Si', secundaria: 'Si', turno: 'Manana', asistencia: 'Pendiente', obs: 'Puntual en la llamada de confirmacion.',
        ficha: true,
        interview: { id: 'a1000001-0000-4000-8000-000000000404', start: '2026-11-28T14:00:00.000Z', end: '2026-11-28T14:30:00.000Z', title: 'Entrevista operativa con Maria del Carmen Gutierrez Vega' },
        nivel: 'Tecnico', institucion: 'SENATI', periodo: '2016-2018',
        empresa: 'Almacenes del Centro', puestoPrevio: 'Operaria de picking',
        tallaCamisa: 'M', tallaPantalon: '32', tallaCalzado: '38',
        emergenciaNombre: 'Juan Vega', emergenciaTelefono: '999300204', emergenciaParentesco: 'Padre',
        familiarNombres: 'Ana',
    },
    {
        id: 'a1000001-0000-4000-8000-000000000205',
        foto: 'demo-foto-11.jpg',
        nombres: 'Jorge Antonio', apellidoPaterno: 'Medina', apellidoMaterno: 'Torres',
        email: 'jorge.medina.demo@correo-demo.pe', phone: '999100205', phone2: '999200205',
        age: 38, dni: '90220005', stage: 4, source: 'Feria laboral',
        district: 'LA VICTORIA', address: 'Av. Canada 1840, La Victoria',
        salary: 'S/ 1,800', agreed: 'S/ 1,750', words: 'Mil setecientos cincuenta y 00/100 soles',
        sexo: 'Masculino', estadoCivil: 'Casado', nacimiento: '1988-07-19',
        descripcion: 'Asistio a entrevista. Documentos en revision e informe psicolaboral apto.',
        score: 91,
        meta: 'Apto. Falta validar el certificado de estudios para pasar a incorporacion.',
        origin: 'masivo',
        exp: 10, disp: 'Si', secundaria: 'Si', turno: 'Noche', asistencia: 'Si', obs: 'Referencia laboral positiva del ultimo jefe.',
        psych: 'apto',
        psychScore: 34,
        assessment: 'operativos',
        interview: { id: 'a1000001-0000-4000-8000-000000000405', start: '2026-11-21T13:00:00.000Z', end: '2026-11-21T13:30:00.000Z', title: 'Entrevista operativa con Jorge Antonio Medina Torres', past: true },
    },
    {
        id: 'a1000001-0000-4000-8000-000000000206',
        foto: 'demo-foto-12.jpg',
        nombres: 'Elena Patricia', apellidoPaterno: 'Nuñez', apellidoMaterno: 'Ccama',
        email: 'elena.nunez.demo@correo-demo.pe', phone: '999100206', phone2: '999200206',
        age: 26, dni: '90220006', stage: 6, source: 'Referido',
        district: 'SAN LUIS', address: 'Av. San Luis 2100, San Luis',
        salary: 'S/ 1,650', agreed: 'S/ 1,600', words: 'Mil seiscientos y 00/100 soles',
        sexo: 'Femenino', estadoCivil: 'Soltero', nacimiento: '2000-10-30',
        descripcion: 'Incorporada en el proceso demo. Muestra la etapa final de un proceso masivo.',
        score: 94,
        meta: 'Incorporacion confirmada. Documentos y ficha completos.',
        origin: 'manual',
        exp: 4, disp: 'Si', secundaria: 'Si', turno: 'Rotativo', asistencia: 'Si', obs: 'Ingreso coordinado para el 1 de diciembre.',
        ficha: true,
        visible: true,
        hireDate: '2026-12-01',
        offer: '2026-11-23',
        nivel: 'Secundaria', institucion: 'I.E. San Luis', periodo: '2012-2016',
        empresa: 'Logistica Este', puestoPrevio: 'Auxiliar de almacen',
        tallaCamisa: 'S', tallaPantalon: '30', tallaCalzado: '36',
        emergenciaNombre: 'Lucia Ccama', emergenciaTelefono: '999300206', emergenciaParentesco: 'Madre',
        familiarNombres: 'Carlos',
    },
];

for (const person of [...normalPeople, ...bulkPeople]) {
    person.name = `${person.nombres} ${person.apellidoPaterno} ${person.apellidoMaterno}`;
    person.province = 'LIMA';
}

async function insertFlexible(sb, table, rows) {
    let pending = rows.map(row => ({ ...row }));
    for (let attempt = 0; attempt < 12; attempt++) {
        const { error } = await sb.from(table).insert(pending);
        if (!error) return;
        const match = `${error.message || ''}`.match(/'([^']+)' column|column "([^"]+)"/i);
        const column = match?.[1] || match?.[2];
        if (column && pending.some(row => column in row)) {
            console.warn(`  ${table}: se omite la columna ${column}`);
            pending = pending.map(row => {
                const next = { ...row };
                delete next[column];
                return next;
            });
            continue;
        }
        throw new Error(`${table}: ${error.message}`);
    }
    throw new Error(`${table}: no se pudo insertar`);
}

async function upload(sb, path, bytes, contentType) {
    const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
        contentType,
        upsert: true,
        cacheControl: '3600',
    });
    if (error) throw new Error(`Storage ${path}: ${error.message}`);
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

async function removeDemo(sb) {
    const ids = {
        candidates: [...normalPeople, ...bulkPeople].map(p => p.id),
        processes: [PROCESS_NORMAL, PROCESS_BULK],
    };
    const interviewIds = [...normalPeople, ...bulkPeople].map(p => p.interview?.id).filter(Boolean);

    const steps = [
        ['shortlist_events', 'shortlist_id', [SHORTLIST_ID]],
        ['shortlist_members', 'shortlist_id', [SHORTLIST_ID]],
        ['shortlists', 'id', [SHORTLIST_ID]],
        ['interview_events', 'id', interviewIds],
        ['attachments', 'candidate_id', ids.candidates],
        ['attachments', 'process_id', ids.processes],
        ['comments', 'candidate_id', ids.candidates],
        ['post_its', 'candidate_id', ids.candidates],
        ['candidate_history', 'candidate_id', ids.candidates],
        ['candidates', 'id', ids.candidates],
        ['document_categories', 'process_id', ids.processes],
        ['stages', 'process_id', ids.processes],
        ['processes', 'id', ids.processes],
        ['users', 'id', [USER_ID]],
        ['clients', 'id', [CLIENT_ID]],
    ];
    for (const [table, column, values] of steps) {
        if (!values.length) continue;
        const { error } = await sb.from(table).delete().in(column, values);
        if (error) console.warn(`  no se limpio ${table}: ${error.message}`);
        else console.log(`  limpio ${table}`);
    }
}

async function main() {
    const deleting = process.argv.includes('--delete');
    const { url, key } = loadEnv();
    if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
    const sb = createClient(url, key, { auth: { persistSession: false } });

    if (deleting) {
        console.log('Eliminando datos DEMO...');
        await removeDemo(sb);
        for (const folder of [`${PREFIX}/fotos`, `${PREFIX}/docs`, PREFIX]) {
            const { data, error } = await sb.storage.from(BUCKET).list(folder, { limit: 100 });
            if (error || !data?.length) continue;
            const paths = data.filter(file => file.id).map(file => `${folder}/${file.name}`);
            if (!paths.length) continue;
            const removed = await sb.storage.from(BUCKET).remove(paths);
            if (removed.error) console.warn(`  no se borraron archivos de ${folder}: ${removed.error.message}`);
            else console.log(`  archivos borrados en ${folder}: ${paths.length}`);
        }
        console.log('Listo. Los procesos DEMO quedaron eliminados.');
        return;
    }

    console.log('Preparando fotos y documentos...');
    const photos = {};
    for (const person of [...normalPeople, ...bulkPeople]) {
        photos[person.id] = readFileSync(`${ASSETS}/${person.foto}`);
    }
    const flyerNormal = readFileSync(`${ASSETS}/demo-flyer-analista.jpg`);
    const flyerBulk = readFileSync(`${ASSETS}/demo-flyer-operarios.jpg`);

    const docs = {};
    for (const person of [...normalPeople, ...bulkPeople]) {
        const puesto = person.id.startsWith('a1000001-0000-4000-8000-0000000001')
            ? 'Analista de Selección'
            : 'Operario de Almacen';
        docs[person.id] = {
            cv: await makePdf({
                title: `Curriculum - ${person.name}`,
                subtitle: `${puesto}  ·  DNI ${person.dni}  ·  ${person.age} anos`,
                photoBytes: photos[person.id],
                paragraphs: [
                    person.descripcion,
                    `Contacto: ${person.email}  ·  ${person.phone}  ·  ${person.district}, Lima.`,
                    `Pretension: ${person.salary}. Fuente de postulacion: ${person.source}.`,
                    'Experiencia reciente en Lima, con referencias laborales disponibles para la entrevista.',
                    'Disponibilidad de inicio sujeta a la etapa del proceso. Datos inventados para la demostracion.',
                ],
            }),
            ficha: await makePdf({
                title: `Ficha de datos - ${person.name}`,
                subtitle: `Documento ficticio asociado a la categoria DNI  ·  ${person.dni}`,
                paragraphs: [
                    `${person.name}, ${person.age} anos, ${person.estadoCivil}.`,
                    `Direccion de demostracion: ${person.address}.`,
                    `Correo ${person.email}. Telefono ${person.phone} y alterno ${person.phone2}.`,
                    'No es un documento de identidad oficial. Existe para que el reclutador abra un adjunto desde la ficha.',
                ],
            }),
            estudios: await makePdf({
                title: `Constancia de estudios - ${person.name}`,
                subtitle: 'Constancia ficticia para la categoria de estudios',
                paragraphs: [
                    `Se deja constancia, solo para esta demostracion, de que ${person.name} culmino estudios vinculados al puesto de ${puesto}.`,
                    'La constancia no tiene validez academica ni legal.',
                ],
            }),
        };
    }

    const perfilNormal = await makePdf({
        title: 'Perfil del puesto - Analista de Selección',
        subtitle: 'Anexo del proceso DEMO-NORMAL',
        paragraphs: [
            'Reporta a la jefatura de Gestion de Personas. Entrevista, evalua y presenta terna para posiciones administrativas.',
            'Banda referencial S/ 4,500 a S/ 6,000. Vacantes demo: 2. Inicio referencial 1 de diciembre de 2026.',
            'Competencias: entrevista por competencias, orden de seguimiento y comunicacion con el cliente interno.',
        ],
    });
    const perfilBulk = await makePdf({
        title: 'Perfil del puesto - Operario de Almacen',
        subtitle: 'Anexo del proceso DEMO-MASIVO',
        paragraphs: [
            'Picking, packing y orden de ubicaciones en almacen de Lima Este. Turnos manana, tarde, noche o rotativo.',
            'Requisito filtro: secundaria completa y disponibilidad inmediata. Banda S/ 1,500 a S/ 1,800.',
            'Vacantes demo: 8. El proceso sirve para recorrer la tabla de alta densidad.',
        ],
    });

    console.log('Subiendo archivos...');
    const urlOf = {};
    urlOf.flyerNormal = await upload(sb, `${PREFIX}/flyer-analista.jpg`, flyerNormal, 'image/jpeg');
    urlOf.flyerBulk = await upload(sb, `${PREFIX}/flyer-operarios.jpg`, flyerBulk, 'image/jpeg');
    urlOf.perfilNormal = await upload(sb, `${PREFIX}/perfil-analista.pdf`, perfilNormal, 'application/pdf');
    urlOf.perfilBulk = await upload(sb, `${PREFIX}/perfil-operario.pdf`, perfilBulk, 'application/pdf');
    for (const person of [...normalPeople, ...bulkPeople]) {
        const slug = person.dni;
        urlOf[person.id] = {
            avatar: await upload(sb, `${PREFIX}/fotos/${slug}.jpg`, photos[person.id], 'image/jpeg'),
            cv: await upload(sb, `${PREFIX}/docs/${slug}-cv.pdf`, docs[person.id].cv, 'application/pdf'),
            ficha: await upload(sb, `${PREFIX}/docs/${slug}-datos.pdf`, docs[person.id].ficha, 'application/pdf'),
            estudios: await upload(sb, `${PREFIX}/docs/${slug}-estudios.pdf`, docs[person.id].estudios, 'application/pdf'),
        };
    }

    console.log('Reemplazando una carga DEMO anterior, si existe...');
    await removeDemo(sb);

    console.log('Creando cliente, usuario y procesos...');
    await insertFlexible(sb, 'clients', [{
        id: CLIENT_ID,
        razon_social: 'DEMO Cliente Revisión',
        ruc: '20999999991',
        app_name: APP,
    }]);
    await insertFlexible(sb, 'users', [{
        id: USER_ID,
        name: 'DEMO Reclutador',
        email: DEMO_EMAIL,
        role: 'recruiter',
        password_hash: DEMO_PASSWORD,
        app_name: APP,
        permissions: null,
        visible_sections: null,
        allowed_client_ids: null,
    }]);

    const bulkConfig = {
        killerQuestions: [
            { id: 'kq-disp', question: 'Disponibilidad inmediata', type: 'yes_no', correctAnswer: 'Si', required: true },
            { id: 'kq-sec', question: 'Secundaria completa', type: 'yes_no', correctAnswer: 'Si', required: true },
        ],
        aiPrompt: 'Proceso DEMO de operarios de almacen. Prioriza disponibilidad inmediata, secundaria completa y experiencia en picking.',
        scoreThreshold: 60,
        whatsappEnabled: true,
        whatsappMessageTemplate: 'Hola {{nombre}}, te escribimos por el proceso DEMO de Operarios de Almacen. ¿Sigues disponible para una entrevista esta semana?',
        autoFilterEnabled: false,
        assessmentProfile: 'operativos',
        behavioralAssessments: true,
        highDensityTableEnabled: true,
        psycholaboral: {
            enabled: true,
            competencySetId: 'default-ventas',
            defaultPositionTitle: 'Operario de Almacen',
            defaultConclusionTemplateId: 'conclusion-apto-estandar',
        },
        customColumns: [
            { id: COL.experiencia, name: 'Experiencia (anos)', type: 'number' },
            { id: COL.disponibilidad, name: 'Disponibilidad inmediata', type: 'select', options: ['Si', 'No'] },
            { id: COL.secundaria, name: 'Secundaria completa', type: 'select', options: ['Si', 'No'] },
            { id: COL.turno, name: 'Turno', type: 'select', options: ['Manana', 'Tarde', 'Noche', 'Rotativo'] },
            { id: COL.asistencia, name: 'Asistencia a entrevista', type: 'select', options: ['Si', 'No', 'Pendiente'], dashboardSemanticField: 'interview_attendance' },
            { id: COL.observaciones, name: 'Observaciones', type: 'text' },
        ],
        columnOrder: [
            'nombres', 'apellidoPaterno', 'apellidoMaterno', 'dni', 'fichaDatos', 'email', 'phone', 'scoreIa',
            'source', 'registrationOrigin', 'province', 'district', 'nextInterview', 'stage',
            `custom_${COL.experiencia}`, `custom_${COL.disponibilidad}`, `custom_${COL.secundaria}`,
            `custom_${COL.turno}`, `custom_${COL.asistencia}`, `custom_${COL.observaciones}`,
        ],
        idealProfile: {
            enabled: true,
            greenThreshold: 80,
            yellowThreshold: 50,
            criteria: [
                { fieldId: `custom_${COL.disponibilidad}`, enabled: true, idealValue: 'Si', matchMode: 'exact' },
                { fieldId: `custom_${COL.secundaria}`, enabled: true, idealValue: 'Si', matchMode: 'exact' },
                { fieldId: `custom_${COL.experiencia}`, enabled: true, idealValue: 3, matchMode: 'minimum' },
            ],
        },
        infoPins: [
            { id: 'pin-demo', title: 'Proceso DEMO', content: 'Datos ficticios para recorrer la tabla. Se puede eliminar completo buscando DEMO-MASIVO.', color: 'yellow' },
        ],
        contactMessageTemplates: [
            { id: 'tpl-mail', channel: 'email', name: 'Invitacion DEMO', subject: 'Entrevista - Operarios de Almacen (DEMO)', body: 'Hola {{nombre}}, te invitamos a una entrevista del proceso demo de Operarios de Almacen.' },
            { id: 'tpl-wa', channel: 'whatsapp', name: 'WhatsApp DEMO', body: 'Hola {{nombre}}, confirmamos tu entrevista del proceso DEMO de almacen.' },
        ],
    };

    await insertFlexible(sb, 'processes', [
        {
            id: PROCESS_NORMAL,
            title: 'DEMO - Analista de Selección',
            description: 'Proceso normal de demostracion. Datos, fotos y documentos son ficticios. Orden de servicio DEMO-NORMAL. Se puede eliminar completo cuando termine la revision.',
            salary_range: 'S/ 4,500 - S/ 6,000',
            experience_level: '3 a 5 anos en seleccion',
            seniority: 'Analista',
            flyer_url: urlOf.flyerNormal,
            flyer_position: 'center center',
            service_order_code: 'DEMO-NORMAL',
            start_date: '2026-11-10',
            end_date: '2026-12-15',
            status: 'en_proceso',
            vacancies: 2,
            published_date: '2026-11-12',
            need_identified_date: '2026-11-03',
            client_id: CLIENT_ID,
            is_bulk_process: false,
            app_name: APP,
            bulk_config: { assessmentProfile: 'mandos', behavioralAssessments: false, psycholaboral: { enabled: true, competencySetId: 'default-ventas', defaultPositionTitle: 'Analista de Selección' } },
        },
        {
            id: PROCESS_BULK,
            title: 'DEMO - Operarios de Almacén',
            description: 'Proceso masivo de demostracion. Incluye filtros, score, ficha, entrevistas y documentos ficticios. Orden de servicio DEMO-MASIVO. Se puede eliminar completo cuando termine la revision.',
            salary_range: 'S/ 1,500 - S/ 1,800',
            experience_level: 'Experiencia en almacen deseable',
            seniority: 'Operativo',
            flyer_url: urlOf.flyerBulk,
            flyer_position: 'center center',
            service_order_code: 'DEMO-MASIVO',
            start_date: '2026-11-10',
            end_date: '2026-12-20',
            status: 'en_proceso',
            vacancies: 8,
            published_date: '2026-11-11',
            need_identified_date: '2026-11-05',
            client_id: CLIENT_ID,
            is_bulk_process: true,
            app_name: APP,
            bulk_config: bulkConfig,
        },
    ]);

    const stageRows = [
        ['Postulacion', false, 'blue'],
        ['Screening', false, 'cyan'],
        ['Entrevista RRHH', false, 'indigo'],
        ['Entrevista cliente', true, 'purple'],
        ['Evaluacion', true, 'yellow'],
        ['Oferta', false, 'orange'],
        ['Contratado', false, 'green'],
    ].map((row, index) => ({
        id: ST_N[index],
        process_id: PROCESS_NORMAL,
        name: row[0],
        order_index: index,
        is_critical: row[1],
        color: row[2],
        required_documents: index >= 5 ? [CAT.cv, CAT.dni] : null,
        app_name: APP,
    }));
    const bulkStageRows = [
        ['Postulacion inicial', false, 'blue'],
        ['Filtro', false, 'cyan'],
        ['Contactado', false, 'indigo'],
        ['Entrevista', true, 'purple'],
        ['Documentos', true, 'yellow'],
        ['Apto', false, 'orange'],
        ['Incorporado', false, 'green'],
    ].map((row, index) => ({
        id: ST_B[index],
        process_id: PROCESS_BULK,
        name: row[0],
        order_index: index,
        is_critical: row[1],
        color: row[2],
        required_documents: index >= 4 ? [CAT.cvB, CAT.dniB, CAT.estudiosB] : null,
        app_name: APP,
    }));
    await insertFlexible(sb, 'stages', [...stageRows, ...bulkStageRows]);

    await insertFlexible(sb, 'document_categories', [
        { id: CAT.cv, process_id: PROCESS_NORMAL, name: 'CV', description: 'Curriculum del candidato', required: true, app_name: APP },
        { id: CAT.dni, process_id: PROCESS_NORMAL, name: 'DNI', description: 'Ficha de datos ficticia', required: true, app_name: APP },
        { id: CAT.estudios, process_id: PROCESS_NORMAL, name: 'Estudios', description: 'Constancia ficticia', required: false, app_name: APP },
        { id: CAT.cvB, process_id: PROCESS_BULK, name: 'CV', description: 'Curriculum del candidato', required: true, app_name: APP },
        { id: CAT.dniB, process_id: PROCESS_BULK, name: 'DNI', description: 'Ficha de datos ficticia', required: true, app_name: APP },
        { id: CAT.estudiosB, process_id: PROCESS_BULK, name: 'Estudios', description: 'Constancia ficticia', required: true, app_name: APP },
    ]);

    await insertFlexible(sb, 'attachments', [
        { process_id: PROCESS_NORMAL, candidate_id: null, name: 'Perfil del puesto - Analista de Selección.pdf', url: urlOf.perfilNormal, type: 'application/pdf', size: perfilNormal.length, category: 'Perfil', app_name: APP },
        { process_id: PROCESS_NORMAL, candidate_id: null, name: 'Flyer DEMO Analista de Selección.jpg', url: urlOf.flyerNormal, type: 'image/jpeg', size: flyerNormal.length, category: 'Flyer', app_name: APP },
        { process_id: PROCESS_BULK, candidate_id: null, name: 'Perfil del puesto - Operario de Almacen.pdf', url: urlOf.perfilBulk, type: 'application/pdf', size: perfilBulk.length, category: 'Perfil', app_name: APP },
        { process_id: PROCESS_BULK, candidate_id: null, name: 'Flyer DEMO Operarios de Almacen.jpg', url: urlOf.flyerBulk, type: 'image/jpeg', size: flyerBulk.length, category: 'Flyer', app_name: APP },
    ]);

    console.log('Creando candidatos...');
    const candidateRows = [];
    const historyRows = [];
    const commentRows = [];
    const postItRows = [];
    const attachmentRows = [];
    const interviewRows = [];

    function pushPerson(person, processId, stages, cats, puesto) {
        const stageId = stages[person.stage];
        const files = urlOf[person.id];
        const values = person.exp == null ? {} : bulkValues([
            cell(COL.experiencia, 'Experiencia (anos)', person.exp),
            cell(COL.disponibilidad, 'Disponibilidad inmediata', person.disp),
            cell(COL.secundaria, 'Secundaria completa', person.secundaria),
            cell(COL.turno, 'Turno', person.turno),
            cell(COL.asistencia, 'Asistencia a entrevista', person.asistencia),
            cell(COL.observaciones, 'Observaciones', person.obs),
        ]);
        const assessment = person.assessment ? {
            profile: person.assessment,
            processId,
            updatedAt: '2026-11-24T15:00:00.000Z',
            tests: person.assessment === 'mandos'
                ? {
                    barsit: { status: 'completed', startedAt: '2026-11-24T14:00:00.000Z', submittedAt: '2026-11-24T14:25:00.000Z', durationSec: 1500, score: 38, maxScore: 60, scaledScore: person.psychScore || 42, interpretation: { band: 'normal_superior', title: 'Normal superior', summary: 'Resultado ficticio de la prueba de aptitud.', notes: ['Datos de demostracion.'] } },
                    personalidad: { status: 'completed', startedAt: '2026-11-24T14:30:00.000Z', submittedAt: '2026-11-24T14:50:00.000Z', durationSec: 1200, factors: discFactors(4, 6, 3, 5), dominant: 'I', interpretation: { band: 'I', title: 'Influencia', summary: 'Perfil ficticio orientado a la relacion con el equipo.', notes: ['Datos de demostracion.'] } },
                }
                : {
                    inteligencia: { status: 'completed', startedAt: '2026-11-24T14:00:00.000Z', submittedAt: '2026-11-24T14:20:00.000Z', durationSec: 1100, score: 30, maxScore: 60, scaledScore: person.psychScore || 34, interpretation: { band: 'normal_promedio', title: 'Normal promedio', summary: 'Resultado ficticio de inteligencia figurativa.', notes: ['Datos de demostracion.'] } },
                    personalidad: { status: 'completed', startedAt: '2026-11-24T14:25:00.000Z', submittedAt: '2026-11-24T14:45:00.000Z', durationSec: 1000, factors: discFactors(3, 4, 7, 5), dominant: 'S', interpretation: { band: 'S', title: 'Estabilidad', summary: 'Perfil ficticio estable para tarea operativa.', notes: ['Datos de demostracion.'] } },
                },
        } : null;

        candidateRows.push({
            id: person.id,
            name: person.name,
            nombres: person.nombres,
            apellido_paterno: person.apellidoPaterno,
            apellido_materno: person.apellidoMaterno,
            email: person.email,
            phone: person.phone,
            phone2: person.phone2,
            process_id: processId,
            stage_id: stageId,
            description: person.descripcion,
            avatar_url: files.avatar,
            source: person.source,
            salary_expectation: person.salary,
            agreed_salary: person.agreed,
            agreed_salary_in_words: person.words,
            age: person.age,
            dni: person.dni,
            linkedin_url: person.linkedin || null,
            address: person.address,
            province: person.province,
            district: person.district,
            archived: false,
            discarded: Boolean(person.discarded),
            discard_reason: person.discardReason || null,
            discarded_at: person.discarded ? '2026-11-18T14:00:00.000Z' : null,
            hire_date: person.hireDate || null,
            visible_to_clients: Boolean(person.visible),
            offer_accepted_date: person.offer || null,
            application_started_date: '2026-11-12',
            application_completed_date: '2026-11-12',
            application_count: person.origin === 'formulario' ? 1 : null,
            first_application_at: '2026-11-12T13:00:00.000Z',
            registration_origin: person.origin,
            created_by: USER_ID,
            score_ia: person.score,
            metadata_ia: person.meta,
            psycholaboral_evaluation: person.psych ? psych(person.name, puesto, person.psych, person.psychScore, person.assessment || 'mandos') : null,
            complementary_data: person.ficha ? ficha(person, { puesto }) : null,
            complementary_filled_at: person.ficha ? '2026-11-22T16:30:00.000Z' : null,
            assessment_results: assessment,
            bulk_column_values: values,
            app_name: APP,
        });

        for (let i = 0; i <= person.stage; i++) {
            historyRows.push({
                candidate_id: person.id,
                stage_id: stages[i],
                moved_at: new Date(Date.UTC(2026, 10, 12 + i * 2, 15, 0, 0)).toISOString(),
                moved_by: USER_ID,
                app_name: APP,
            });
        }

        commentRows.push({
            candidate_id: person.id,
            text: `Nota DEMO de ${person.name}: ${person.meta}`,
            user_id: USER_ID,
            app_name: APP,
        });
        postItRows.push({
            candidate_id: person.id,
            text: person.discarded ? 'Descartado en screening' : `Etapa demo: revisar ${puesto}`,
            color: person.discarded ? 'pink' : person.hireDate ? 'green' : 'yellow',
            created_by: USER_ID,
            app_name: APP,
        });

        const catCv = cats.cv;
        const catDni = cats.dni;
        const catEst = cats.estudios;
        attachmentRows.push(
            { candidate_id: person.id, name: `CV ${person.name}.pdf`, url: files.cv, type: 'application/pdf', size: docs[person.id].cv.length, category: 'CV', app_name: APP },
            { candidate_id: person.id, name: `Ficha de datos ${person.name}.pdf`, url: files.ficha, type: 'application/pdf', size: docs[person.id].ficha.length, category: 'DNI', app_name: APP },
            { candidate_id: person.id, name: `Constancia de estudios ${person.name}.pdf`, url: files.estudios, type: 'application/pdf', size: docs[person.id].estudios.length, category: 'Estudios', app_name: APP },
        );
        void catCv; void catDni; void catEst;

        if (person.interview) {
            interviewRows.push({
                id: person.interview.id,
                title: person.interview.title,
                start_time: person.interview.start,
                end_time: person.interview.end,
                candidate_id: person.id,
                interviewer_id: USER_ID,
                notes: person.interview.past
                    ? 'Entrevista demo ya realizada. Comentario ficticio: buena comunicacion y ejemplos concretos.'
                    : 'Entrevista demo por confirmar en el calendario.',
                attendee_emails: [person.email, DEMO_EMAIL],
                app_name: APP,
            });
        }
    }

    for (const person of normalPeople) {
        pushPerson(person, PROCESS_NORMAL, ST_N, { cv: CAT.cv, dni: CAT.dni, estudios: CAT.estudios }, 'Analista de Selección');
    }
    for (const person of bulkPeople) {
        pushPerson(person, PROCESS_BULK, ST_B, { cv: CAT.cvB, dni: CAT.dniB, estudios: CAT.estudiosB }, 'Operario de Almacen');
    }

    await insertFlexible(sb, 'candidates', candidateRows);
    await insertFlexible(sb, 'candidate_history', historyRows);
    await insertFlexible(sb, 'comments', commentRows);
    await insertFlexible(sb, 'post_its', postItRows);
    await insertFlexible(sb, 'attachments', attachmentRows);
    await insertFlexible(sb, 'interview_events', interviewRows);

    await insertFlexible(sb, 'shortlists', [{
        id: SHORTLIST_ID,
        app_name: APP,
        title: 'DEMO - Terna Analista de Selección',
        client_id: CLIENT_ID,
        client_label: 'DEMO Cliente Revisión',
        access_dni: ACCESS_DNI,
        token: SALA_TOKEN,
        status: 'open',
        show_documents: true,
        show_assessments: true,
        show_profile: true,
        created_by: USER_ID,
        created_by_name: 'DEMO Reclutador',
    }]);

    const presented = [
        { id: 'a1000001-0000-4000-8000-000000000501', person: normalPeople[2], column: 'presentacion' },
        { id: 'a1000001-0000-4000-8000-000000000502', person: normalPeople[3], column: 'entrevista' },
        { id: 'a1000001-0000-4000-8000-000000000503', person: normalPeople[4], column: 'finalista' },
    ];
    await insertFlexible(sb, 'shortlist_members', presented.map(item => ({
        id: item.id,
        app_name: APP,
        shortlist_id: SHORTLIST_ID,
        candidate_id: item.person.id,
        source_process_id: PROCESS_NORMAL,
        source_process_title: 'DEMO - Analista de Selección',
        source_stage_id: ST_N[item.person.stage],
        source_stage_name: ['Postulacion', 'Screening', 'Entrevista RRHH', 'Entrevista cliente', 'Evaluacion', 'Oferta', 'Contratado'][item.person.stage],
        source_client_label: 'DEMO Cliente Revisión',
        column_key: item.column,
        status: 'active',
        added_by: USER_ID,
        added_by_name: 'DEMO Reclutador',
    })));
    await insertFlexible(sb, 'shortlist_events', presented.map(item => ({
        app_name: APP,
        shortlist_id: SHORTLIST_ID,
        member_id: item.id,
        candidate_id: item.person.id,
        event_type: 'added',
        body: `Se presento a ${item.person.name} en la sala demo.`,
        actor_type: 'staff',
        actor_name: 'DEMO Reclutador',
        actor_user_id: USER_ID,
    })));

    const { count: normalCount } = await sb.from('candidates').select('id', { count: 'exact', head: true }).eq('process_id', PROCESS_NORMAL);
    const { count: bulkCount } = await sb.from('candidates').select('id', { count: 'exact', head: true }).eq('process_id', PROCESS_BULK);
    console.log(`Candidatos proceso normal: ${normalCount}`);
    console.log(`Candidatos proceso masivo: ${bulkCount}`);
    console.log('DEMO listo.');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
