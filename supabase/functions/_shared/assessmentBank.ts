export type AssessmentProfile = 'mandos' | 'operativos';
export type AssessmentTestId = 'barsit' | 'inteligencia' | 'personalidad';
export type DiscFactor = 'D' | 'I' | 'S' | 'C';

export interface PublicQuestion {
  id: string;
  kind: 'choice' | 'series' | 'disc' | 'figure';
  prompt?: string;
  options?: string[];
  words?: string[];
  image?: string;
  optionCount?: number;
}

interface ChoiceItem {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
}

interface SeriesItem {
  id: string;
  prompt: string;
  answers: number[];
}

const BARSIT_CHOICES: ChoiceItem[] = [
  { id: 'b1', prompt: 'El queso se fabrica de:', options: ['Las flores', 'La harina', 'La leche', 'Las uvas', 'El azúcar'], answer: 'La leche' },
  { id: 'b2', prompt: 'Lo contrario de abierto es:', options: ['Liso', 'Cerrado', 'Delante', 'Claro', 'Despejado'], answer: 'Cerrado' },
  { id: 'b3', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['rojo', 'amarillo', 'morado', 'bandera', 'verde'], answer: 'bandera' },
  { id: 'b4', prompt: 'El pájaro canta, y el perro:', options: ['habla', 'rebuzna', 'cacarea', 'maúlla', 'ladra'], answer: 'ladra' },
  { id: 'b6', prompt: 'Para medir la temperatura se emplea el:', options: ['litro', 'gramo', 'termómetro', 'metro', 'kilovatio'], answer: 'termómetro' },
  { id: 'b7', prompt: 'Lo contrario de dormido', options: ['noche', 'luz', 'amanecer', 'despierto', 'claridad'], answer: 'despierto' },
  { id: 'b8', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['agua', 'platino', 'café', 'te', 'cerveza'], answer: 'platino' },
  { id: 'b9', prompt: 'El zapato protege al pie, y el sombrero protege a:', options: ['la cabeza', 'la mano', 'el dedo', 'el brazo', 'la rodilla'], answer: 'la cabeza' },
  { id: 'b11', prompt: 'El triángulo es una figura formada por:', options: ['4 lados', '6 lados', '5 lados', '3 lados', '9 lados'], answer: '3 lados' },
  { id: 'b12', prompt: 'Lo contrario de negro es:', options: ['oscuro', 'sombra', 'opaco', 'sucio', 'blanco'], answer: 'blanco' },
  { id: 'b13', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['Pedro', 'Enrique', 'Ana', 'José', 'Carlos'], answer: 'Ana' },
  { id: 'b14', prompt: 'El naranjo es un árbol, y el perro es:', options: ['un objeto', 'un animal', 'una cosa', 'un mineral', 'un vegetal'], answer: 'un animal' },
  { id: 'b16', prompt: 'El gato es un:', options: ['insecto', 'mamífero', 'ave', 'pez', 'reptil'], answer: 'mamífero' },
  { id: 'b17', prompt: 'Lo contrario de triste es:', options: ['alegre', 'preocupado', 'dolorido', 'desgraciado', 'enfermo'], answer: 'alegre' },
  { id: 'b18', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['Bogotá', 'Lima', 'Alpes', 'Caracas', 'Quito'], answer: 'Alpes' },
  { id: 'b19', prompt: 'La piel cubre al hombre, y las plumas cubren a:', options: ['la vaca', 'el perro', 'el gato', 'la gallina', 'el caballo'], answer: 'la gallina' },
  { id: 'b21', prompt: 'Treinta es el triple de:', options: ['quince', 'tres', 'diez', 'doce', 'cinco'], answer: 'diez' },
  { id: 'b22', prompt: 'Lo contrario de calor es:', options: ['sudor', 'fatiga', 'blanco', 'frío', 'luz'], answer: 'frío' },
  { id: 'b23', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['cuchara', 'plato', 'tenedor', 'cuchillo', 'cucharita'], answer: 'plato' },
  { id: 'b24', prompt: 'Para coser se emplea la aguja, y para dibujar se emplea:', options: ['lapiz', 'bastón', 'tintero', 'pie', 'ojo'], answer: 'lapiz' },
  { id: 'b26', prompt: 'La cordillera de los Andes está en:', options: ['Europa', 'Asia', 'América', 'Australia', 'África'], answer: 'América' },
  { id: 'b27', prompt: 'Lo contrario de arriba es:', options: ['Dentro', 'abajo', 'cerca', 'completo', 'lejos'], answer: 'abajo' },
  { id: 'b28', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['General', 'Teniente', 'Capitán', 'Presidente', 'África'], answer: 'África' },
  { id: 'b29', prompt: 'Con el cuero se fabrica el calzado, y con la tela:', options: ['piel', 'lana', 'algodón', 'seda', 'vestidos'], answer: 'vestidos' },
  { id: 'b31', prompt: 'Roma es la capital de:', options: ['Nicaragua', 'España', 'Grecia', 'Italia', 'Paraguay'], answer: 'Italia' },
  { id: 'b32', prompt: 'Lo contrario de sí es:', options: ['antes', 'afirmar', 'duda', 'luego', 'no'], answer: 'no' },
  { id: 'b33', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['vaso', 'copa', 'agua', 'jarra', 'olla'], answer: 'agua' },
  { id: 'b34', prompt: 'La nariz sirve para oler, y los ojos sirven para:', options: ['oír', 'ver', 'gustar', 'tocar', 'andar'], answer: 'ver' },
  { id: 'b36', prompt: 'El idioma oficial de Haití es el:', options: ['inglés', 'francés', 'español', 'holandés', 'portugués'], answer: 'francés' },
  { id: 'b37', prompt: 'Lo contrario de despacio es:', options: ['de prisa', 'lento', 'pausado', 'débil', 'grueso'], answer: 'de prisa' },
  { id: 'b38', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['Carpintero', 'Herrero', 'Médico', 'Albañil', 'Zapatero'], answer: 'Médico' },
  { id: 'b39', prompt: 'Al lunes sigue el martes, y a enero sigue:', options: ['junio', 'viernes', 'mes', 'febrero', 'año'], answer: 'febrero' },
  { id: 'b41', prompt: 'Fernando de Magallanes fue un famoso:', options: ['militar', 'aviador', 'navegante', 'sabio', 'sacerdote'], answer: 'navegante' },
  { id: 'b42', prompt: 'Lo contrario de blando es:', options: ['suave', 'duro', 'liso', 'grueso', 'débil'], answer: 'duro' },
  { id: 'b43', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['ver', 'oír', 'liso', 'olfato', 'gusto'], answer: 'liso' },
  { id: 'b44', prompt: 'El codo articula el brazo, y la rodilla articula:', options: ['el corazón', 'los dedos', 'los pulmones', 'el cerebro', 'la pierna'], answer: 'la pierna' },
  { id: 'b46', prompt: 'Cristóbal Colón descubrió América en el:', options: ['siglo XIII', 'siglo XVIII', 'siglo IV', 'siglo XV', 'siglo XIV'], answer: 'siglo XV' },
  { id: 'b47', prompt: 'Lo contrario de fuera es:', options: ['libre', 'lejos', 'distinto', 'malo', 'dentro'], answer: 'dentro' },
  { id: 'b48', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['Venus', 'Júpiter', 'Satélite', 'Urano', 'Neptuno'], answer: 'Satélite' },
  { id: 'b49', prompt: 'Octubre es anterior a noviembre, y jueves es anterior a:', options: ['diciembre', 'viernes', 'septiembre', 'miércoles', 'día'], answer: 'viernes' },
  { id: 'b51', prompt: 'Los primeros ferrocarriles empezaron a funcionar hacia:', options: ['1909', '1800', '1825', '1750', '1710'], answer: '1825' },
  { id: 'b52', prompt: 'Lo contrario de empezar es:', options: ['iniciar', 'adelantar', 'obstruir', 'terminar', 'buscar'], answer: 'terminar' },
  { id: 'b53', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['feliz', 'triste', 'satisfecho', 'alegre', 'contento'], answer: 'triste' },
  { id: 'b54', prompt: 'La paz viene después de la guerra, y la calma viene después de:', options: ['la tormenta', 'el crepúsculo', 'el bienestar', 'la felicidad', 'el ocaso'], answer: 'la tormenta' },
  { id: 'b56', prompt: 'La bitácora es de uso indispensable en:', options: ['música', 'biología', 'navegación', 'teatro', 'química'], answer: 'navegación' },
  { id: 'b57', prompt: 'Lo contrario de homogéneo es:', options: ['compacto', 'heterogéneo', 'abstracto', 'sutil', 'neutro'], answer: 'heterogéneo' },
  { id: 'b58', prompt: 'De estas cinco palabras una pertenece a una clase diferente. ¿Cuál es?', options: ['Strawinski', 'Bach', 'Mozart', 'Newton', 'Chopin'], answer: 'Newton' },
  { id: 'b59', prompt: 'La biblioteca es para guardar libros y la pinacoteca para guardar:', options: ['Periódicos', 'Discos', 'Películas', 'Monedas', 'Cuadros'], answer: 'Cuadros' },
];

const BARSIT_SERIES: SeriesItem[] = [
  { id: 'b5', prompt: 'Escriba los dos números que faltan a esta serie: 10 15 20 25 35 40 45 55', answers: [30, 50] },
  { id: 'b10', prompt: 'Escriba los dos números que faltan a esta serie: 06 09 12 18 21 24 30', answers: [15, 27] },
  { id: 'b15', prompt: 'Escriba los dos números que faltan a esta serie: 07 09 11 13 17 21 23', answers: [15, 19] },
  { id: 'b20', prompt: 'Escriba los dos números que faltan a esta serie: 07 14 21 28 42 49 63 70', answers: [35, 56] },
  { id: 'b25', prompt: 'Escriba los dos números que faltan a esta serie: 40 36 32 28 20 16 12 04', answers: [24, 8] },
  { id: 'b30', prompt: 'Escriba los dos números que faltan a esta serie: 64 58 52 46 34 28 16 10 04', answers: [40, 22] },
  { id: 'b35', prompt: 'Escriba los dos números que faltan a esta serie: 05 10 20 80 160 640 1280', answers: [40, 320] },
  { id: 'b40', prompt: 'Escriba los dos números que faltan a esta serie: 02 04 16 32 128 256', answers: [8, 64] },
  { id: 'b45', prompt: 'Escriba los dos números que faltan a esta serie: 05 06 08 11 15 20 33 41 60', answers: [26, 50] },
  { id: 'b50', prompt: 'Escriba los dos números que faltan a esta serie: 90 80 71 63 50 45 38 36 35', answers: [56, 41] },
  { id: 'b55', prompt: 'Escriba los dos números que faltan a esta serie: 120 100 82 66 40 30 16 12 10', answers: [52, 22] },
  { id: 'b60', prompt: 'Escriba los dos números que faltan a esta serie: 6561 2187 729 81 09 03', answers: [243, 27] },
];

/** Clave oficial Barsit. A = primera opción, E = quinta. Las series van aparte. */
const BARSIT_LETTER: Record<string, 'A' | 'B' | 'C' | 'D' | 'E'> = {
  b1: 'C', b2: 'B', b3: 'D', b4: 'E', b6: 'C', b7: 'D', b8: 'B', b9: 'A',
  b11: 'D', b12: 'E', b13: 'C', b14: 'B', b16: 'B', b17: 'A', b18: 'C', b19: 'D',
  b21: 'C', b22: 'D', b23: 'B', b24: 'A', b26: 'C', b27: 'B', b28: 'E', b29: 'E',
  b31: 'D', b32: 'E', b33: 'C', b34: 'B', b36: 'B', b37: 'A', b38: 'C', b39: 'D',
  b41: 'C', b42: 'B', b43: 'C', b44: 'E', b46: 'D', b47: 'E', b48: 'C', b49: 'B',
  b51: 'C', b52: 'D', b53: 'B', b54: 'A', b56: 'C', b57: 'B', b58: 'D', b59: 'E',
};

function barsitChoiceAnswer(item: ChoiceItem): string {
  const letter = BARSIT_LETTER[item.id];
  const index = letter.charCodeAt(0) - 65;
  return item.options[index] || item.answer;
}

const BARSIT_ORDER = [
  'b1','b2','b3','b4','b5','b6','b7','b8','b9','b10',
  'b11','b12','b13','b14','b15','b16','b17','b18','b19','b20',
  'b21','b22','b23','b24','b25','b26','b27','b28','b29','b30',
  'b31','b32','b33','b34','b35','b36','b37','b38','b39','b40',
  'b41','b42','b43','b44','b45','b46','b47','b48','b49','b50',
  'b51','b52','b53','b54','b55','b56','b57','b58','b59','b60',
];

/** Cada grupo tiene una palabra por factor: D, I, S y C. MÁS suma 1, MENOS resta 1. */
const DISC_GROUPS: { id: string; words: { text: string; factor: DiscFactor }[] }[] = [
  { id: 'd1', words: [{ text: 'Entusiasta', factor: 'I' }, { text: 'Rápido(a)', factor: 'D' }, { text: 'Lógico(a)', factor: 'C' }, { text: 'Apacible', factor: 'S' }] },
  { id: 'd2', words: [{ text: 'Cauteloso(a)', factor: 'C' }, { text: 'Decidido(a)', factor: 'D' }, { text: 'Receptivo(a)', factor: 'I' }, { text: 'Bondadoso(a)', factor: 'S' }] },
  { id: 'd3', words: [{ text: 'Amigable(a)', factor: 'I' }, { text: 'Preciso(a)', factor: 'C' }, { text: 'Franco(a)', factor: 'D' }, { text: 'Tranquilo(a)', factor: 'S' }] },
  { id: 'd4', words: [{ text: 'Elocuente', factor: 'I' }, { text: 'Controlado(a)', factor: 'C' }, { text: 'Tolerante', factor: 'S' }, { text: 'Decisivo(a)', factor: 'D' }] },
  { id: 'd5', words: [{ text: 'Atrevido(a)', factor: 'D' }, { text: 'Concienzudo(a)', factor: 'C' }, { text: 'Comunicativo(a)', factor: 'I' }, { text: 'Moderado(a)', factor: 'S' }] },
  { id: 'd6', words: [{ text: 'Ameno(a)', factor: 'S' }, { text: 'Ingenioso(a)', factor: 'I' }, { text: 'Investigador(a)', factor: 'C' }, { text: 'Acepta riesgos', factor: 'D' }] },
  { id: 'd7', words: [{ text: 'Expresivo(a)', factor: 'I' }, { text: 'Cuidadoso(a)', factor: 'C' }, { text: 'Dominante', factor: 'D' }, { text: 'Sensible', factor: 'S' }] },
  { id: 'd8', words: [{ text: 'Extrovertido(a)', factor: 'I' }, { text: 'Precavido(a)', factor: 'C' }, { text: 'Constante', factor: 'S' }, { text: 'Impaciente', factor: 'D' }] },
  { id: 'd9', words: [{ text: 'Discreto(a)', factor: 'C' }, { text: 'Complaciente', factor: 'S' }, { text: 'Encantador(a)', factor: 'I' }, { text: 'Insistente', factor: 'D' }] },
  { id: 'd10', words: [{ text: 'Valeroso(a)', factor: 'D' }, { text: 'Anima a los demás', factor: 'I' }, { text: 'Pacífico(a)', factor: 'S' }, { text: 'Perfeccionista', factor: 'C' }] },
  { id: 'd11', words: [{ text: 'Reservado(a)', factor: 'C' }, { text: 'Atento(a)', factor: 'S' }, { text: 'Osado(a)', factor: 'D' }, { text: 'Alegre', factor: 'I' }] },
  { id: 'd12', words: [{ text: 'Estimulante', factor: 'I' }, { text: 'Gentil', factor: 'S' }, { text: 'Perceptivo(a)', factor: 'C' }, { text: 'Independiente', factor: 'D' }] },
  { id: 'd13', words: [{ text: 'Competitivo(a)', factor: 'D' }, { text: 'Considerado(a)', factor: 'S' }, { text: 'Alegre', factor: 'I' }, { text: 'Sagaz', factor: 'C' }] },
  { id: 'd14', words: [{ text: 'Meticuloso(a)', factor: 'C' }, { text: 'Obediente', factor: 'S' }, { text: 'Ideas Firmes', factor: 'D' }, { text: 'Alentador(a)', factor: 'I' }] },
  { id: 'd15', words: [{ text: 'Popular', factor: 'I' }, { text: 'Reflexivo(a)', factor: 'C' }, { text: 'Tenaz', factor: 'D' }, { text: 'Calmado(a)', factor: 'S' }] },
  { id: 'd16', words: [{ text: 'Analítico(a)', factor: 'C' }, { text: 'Audaz', factor: 'D' }, { text: 'Leal', factor: 'S' }, { text: 'Promotor(a)', factor: 'I' }] },
  { id: 'd17', words: [{ text: 'Sociable', factor: 'I' }, { text: 'Paciente', factor: 'S' }, { text: 'Autosuficiente', factor: 'D' }, { text: 'Certero(a)', factor: 'C' }] },
  { id: 'd18', words: [{ text: 'Adaptable', factor: 'S' }, { text: 'Resuelto(a)', factor: 'D' }, { text: 'Prevenido(a)', factor: 'C' }, { text: 'Vivaz', factor: 'I' }] },
  { id: 'd19', words: [{ text: 'Agresivo(a)', factor: 'D' }, { text: 'Impetuoso(a)', factor: 'I' }, { text: 'Amistoso(a)', factor: 'S' }, { text: 'Discerniente', factor: 'C' }] },
  { id: 'd20', words: [{ text: 'De trato fácil', factor: 'I' }, { text: 'Compasivo(a)', factor: 'S' }, { text: 'Cauto(a)', factor: 'C' }, { text: 'Habla directo', factor: 'D' }] },
  { id: 'd21', words: [{ text: 'Evaluador(a)', factor: 'C' }, { text: 'Generoso(a)', factor: 'S' }, { text: 'Animado(a)', factor: 'I' }, { text: 'Persistente', factor: 'D' }] },
  { id: 'd22', words: [{ text: 'Impulsivo(a)', factor: 'I' }, { text: 'Cuida los detalles', factor: 'C' }, { text: 'Enérgico(a)', factor: 'D' }, { text: 'Tranquilo(a)', factor: 'S' }] },
  { id: 'd23', words: [{ text: 'Sociable', factor: 'I' }, { text: 'Sistemático', factor: 'C' }, { text: 'Vigoroso(a)', factor: 'D' }, { text: 'Tolerante', factor: 'S' }] },
  { id: 'd24', words: [{ text: 'Cautivador(a)', factor: 'I' }, { text: 'Contento(a)', factor: 'S' }, { text: 'Exigente', factor: 'D' }, { text: 'Apegado(a) a las normas', factor: 'C' }] },
  { id: 'd25', words: [{ text: 'Le agrada discutir', factor: 'D' }, { text: 'Metódico(a)', factor: 'C' }, { text: 'Comedido(a)', factor: 'S' }, { text: 'Desenvuelto(a)', factor: 'I' }] },
  { id: 'd26', words: [{ text: 'Jovial', factor: 'I' }, { text: 'Preciso(a)', factor: 'C' }, { text: 'Directo(a)', factor: 'D' }, { text: 'Ecuánime', factor: 'S' }] },
  { id: 'd27', words: [{ text: 'Inquieto(a)', factor: 'D' }, { text: 'Amable', factor: 'S' }, { text: 'Elocuente', factor: 'I' }, { text: 'Cuidadoso(a)', factor: 'C' }] },
  { id: 'd28', words: [{ text: 'Prudente', factor: 'C' }, { text: 'Pionero(a)', factor: 'D' }, { text: 'Espontáneo(a)', factor: 'I' }, { text: 'Colaborador', factor: 'S' }] },
];

/** Clave oficial de la prueba de figuras (Raven), ítems 1 a 15. */
const INTEL_ANSWERS: number[] = [2, 6, 3, 5, 5, 6, 5, 5, 1, 8, 6, 5, 5, 1, 2];

const INTEL_OPTIONS = [6, 6, 8, 8, 6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 8];

export const TEST_META: Record<AssessmentTestId, {
  title: string;
  instructions: string;
  timeLimitSec: number | null;
}> = {
  barsit: {
    title: 'Prueba Barsit',
    instructions:
      'A continuación se encuentran 60 preguntas. En la mayoría debe escoger la opción correcta entre cinco. En las series numéricas debe escribir los dos números que faltan.\n\nEs mejor hacer las cosas bien que de prisa, pero si no sabe cómo resolver una pregunta, pase a la siguiente.\n\nDispone de 15 minutos como máximo. El tiempo empieza cuando confirme que desea comenzar. Al cumplirse, la prueba se envía con lo respondido.',
    timeLimitSec: 15 * 60,
  },
  inteligencia: {
    title: 'Prueba de inteligencia',
    instructions:
      'Dispone de 15 figuras incompletas. En cada una elija, entre las opciones numeradas, la pieza que completa exactamente la figura grande.\n\nTiene 10 minutos. El tiempo empieza cuando confirme que desea comenzar. Al cumplirse, la prueba se envía con lo respondido.',
    timeLimitSec: 10 * 60,
  },
  personalidad: {
    title: 'Prueba de personalidad (D)',
    instructions:
      'En cada uno de los 28 grupos, marque la palabra que más lo(a) represente en MÁS y la que menos lo(a) represente en MENOS. Solo una palabra por columna, y no puede ser la misma.\n\nTiene 15 minutos como máximo. El tiempo empieza cuando confirme que desea comenzar. Al cumplirse, la prueba se envía con lo respondido.',
    timeLimitSec: 15 * 60,
  },
};

export function testsForProfile(profile: AssessmentProfile): AssessmentTestId[] {
  if (profile === 'mandos') return ['barsit', 'personalidad'];
  return ['inteligencia', 'personalidad'];
}

export function publicQuestions(testId: AssessmentTestId): PublicQuestion[] {
  if (testId === 'barsit') {
    const byId = new Map<string, PublicQuestion>();
    for (const item of BARSIT_CHOICES) {
      byId.set(item.id, { id: item.id, kind: 'choice', prompt: item.prompt, options: item.options });
    }
    for (const item of BARSIT_SERIES) {
      byId.set(item.id, { id: item.id, kind: 'series', prompt: item.prompt });
    }
    return BARSIT_ORDER.map((id) => byId.get(id)!);
  }
  if (testId === 'personalidad') {
    return DISC_GROUPS.map((g) => ({
      id: g.id,
      kind: 'disc',
      words: g.words.map((w) => w.text),
    }));
  }
  return INTEL_OPTIONS.map((count, i) => ({
    id: `i${i + 1}`,
    kind: 'figure',
    prompt: `Pregunta ${i + 1}`,
    image: `/pruebas/inteligencia/${String(i + 1).padStart(2, '0')}.jpg`,
    optionCount: count,
  }));
}

function norm(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function seriesNumbers(raw: unknown): number[] {
  const text = String(raw ?? '');
  const found = text.match(/\d+/g) || [];
  return found.map((n) => Number.parseInt(n, 10)).filter((n) => Number.isFinite(n));
}

function sameNumberSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((n, i) => n === right[i]);
}

export interface ScoredTest {
  score: number | null;
  maxScore: number | null;
  scaledScore: number | null;
  factors?: Record<DiscFactor, { most: number; least: number; net: number }>;
  dominant?: DiscFactor | null;
  items: Array<Record<string, unknown>>;
}

export function scoreTest(testId: AssessmentTestId, answers: unknown): ScoredTest {
  const map = answers && typeof answers === 'object' && !Array.isArray(answers)
    ? answers as Record<string, unknown>
    : {};

  if (testId === 'barsit') {
    const items: Array<Record<string, unknown>> = [];
    let score = 0;
    for (const id of BARSIT_ORDER) {
      const choice = BARSIT_CHOICES.find((c) => c.id === id);
      const series = BARSIT_SERIES.find((s) => s.id === id);
      if (choice) {
        const given = String(map[id] ?? '').trim();
        const expectedText = barsitChoiceAnswer(choice);
        const letter = BARSIT_LETTER[choice.id];
        const correct = norm(given) === norm(expectedText) || norm(given) === norm(letter);
        if (correct) score += 1;
        items.push({
          id,
          prompt: choice.prompt,
          answer: given,
          expected: `${letter} · ${expectedText}`,
          correct,
        });
      } else if (series) {
        const given = String(map[id] ?? '').trim();
        const correct = sameNumberSet(seriesNumbers(given), series.answers);
        if (correct) score += 1;
        items.push({
          id,
          prompt: series.prompt,
          answer: given,
          expected: series.answers.join(' y '),
          correct,
        });
      }
    }
    return { score, maxScore: 60, scaledScore: score, items };
  }

  if (testId === 'personalidad') {
    const factors: Record<DiscFactor, { most: number; least: number; net: number }> = {
      D: { most: 0, least: 0, net: 0 },
      I: { most: 0, least: 0, net: 0 },
      S: { most: 0, least: 0, net: 0 },
      C: { most: 0, least: 0, net: 0 },
    };
    const items: Array<Record<string, unknown>> = [];
    for (const group of DISC_GROUPS) {
      const raw = map[group.id];
      const mostIdx = raw && typeof raw === 'object' ? Number((raw as { most?: unknown }).most) : NaN;
      const leastIdx = raw && typeof raw === 'object' ? Number((raw as { least?: unknown }).least) : NaN;
      const most = group.words[mostIdx];
      const least = group.words[leastIdx];
      if (most && least && mostIdx !== leastIdx) {
        factors[most.factor].most += 1;
        factors[least.factor].least += 1;
      }
      items.push({
        id: group.id,
        most: most?.text || '',
        least: least?.text || '',
        mostFactor: most?.factor || null,
        leastFactor: least?.factor || null,
      });
    }
    (Object.keys(factors) as DiscFactor[]).forEach((f) => {
      factors[f].net = factors[f].most - factors[f].least;
    });
    const dominant = (Object.keys(factors) as DiscFactor[]).sort((a, b) => factors[b].net - factors[a].net)[0];
    return { score: null, maxScore: null, scaledScore: null, factors, dominant, items };
  }

  const keyed = INTEL_ANSWERS.filter((n) => n != null).length;
  let score = 0;
  const items: Array<Record<string, unknown>> = [];
  INTEL_OPTIONS.forEach((count, i) => {
    const id = `i${i + 1}`;
    const choice = Number(map[id]);
    const expected = INTEL_ANSWERS[i];
    const valid = Number.isInteger(choice) && choice >= 1 && choice <= count;
    const correct = expected == null ? null : valid && choice === expected;
    if (correct === true) score += 1;
    items.push({
      id,
      prompt: `Pregunta ${i + 1}`,
      image: `/pruebas/inteligencia/${String(i + 1).padStart(2, '0')}.jpg`,
      choice: valid ? choice : null,
      expected,
      correct,
    });
  });
  const hasKey = keyed === INTEL_ANSWERS.length;
  const scaled = hasKey ? Math.round((score / INTEL_OPTIONS.length) * 60) : null;
  return {
    score: hasKey ? score : null,
    maxScore: hasKey ? INTEL_OPTIONS.length : null,
    scaledScore: scaled,
    items,
  };
}

export const DEFAULT_INTELLECTUAL_RANGES: { id: string; name: string; min: number; max: number }[] = [
  { id: 'inferior', name: 'Inferior', min: 0, max: 15 },
  { id: 'normal_inferior', name: 'Normal Inferior', min: 16, max: 25 },
  { id: 'normal_promedio', name: 'Normal Promedio', min: 26, max: 40 },
  { id: 'normal_superior', name: 'Normal Superior', min: 41, max: 50 },
  { id: 'superior', name: 'Superior', min: 51, max: 60 },
];

export function levelIdForScore(
  score: number,
  levels: { id: string; scoreRange?: string }[] | null | undefined
): string {
  const parsed = (levels || [])
    .map((level) => {
      const match = String(level.scoreRange || '').match(/(\d+)\s*[-–]\s*(\d+)/);
      if (!match) return null;
      return { id: level.id, min: Number(match[1]), max: Number(match[2]) };
    })
    .filter((x): x is { id: string; min: number; max: number } => !!x);
  const ranges = parsed.length ? parsed : DEFAULT_INTELLECTUAL_RANGES;
  const found = ranges.find((r) => score >= r.min && score <= r.max);
  return found?.id || ranges[ranges.length - 1].id;
}

export function netToPersonalityLevel(net: number): 'bajo' | 'promedio' | 'alto' {
  if (net >= 5) return 'alto';
  if (net <= -2) return 'bajo';
  return 'promedio';
}

export function factorForTrait(id: string, name: string): DiscFactor | null {
  const text = norm(`${id} ${name}`);
  if (/sociab|influyen|relacion|extraver/.test(text)) return 'I';
  if (/estabil|emocion|seren|calma/.test(text)) return 'S';
  if (/autoconcept|seguridad|dominan|lider|confianza/.test(text)) return 'D';
  if (/norma|detalle|cumpl|conscien|perfeccion|rigor/.test(text)) return 'C';
  return null;
}
