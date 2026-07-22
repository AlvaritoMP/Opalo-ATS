/**
 * Smoke checks for worker name composition / legacy parse.
 * Run: node scripts/verify-worker-handoff-names.mjs
 */

function composeWorkerFullName(nombres, apellidoPaterno, apellidoMaterno) {
  return [nombres, apellidoPaterno, apellidoMaterno]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLegacyFullName(fullName) {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};
  if (tokens.length === 1) return { nombres: tokens[0] };
  if (tokens.length === 2) {
    return { nombres: tokens[0], apellidoPaterno: tokens[1] };
  }
  return {
    nombres: tokens.slice(0, -2).join(' '),
    apellidoPaterno: tokens[tokens.length - 2],
    apellidoMaterno: tokens[tokens.length - 1],
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Composition
assertEqual(
  composeWorkerFullName('Juan', 'Pérez', 'García'),
  'Juan Pérez García',
  'compose three parts'
);
assertEqual(
  composeWorkerFullName('María Elena', 'López', undefined),
  'María Elena López',
  'compose missing maternal'
);
assertEqual(composeWorkerFullName('', 'Pérez', 'García'), 'Pérez García', 'compose without nombres');

// Legacy parse
const parsed = parseLegacyFullName('Juan Carlos Pérez García');
assertEqual(parsed.nombres, 'Juan Carlos', 'legacy nombres');
assertEqual(parsed.apellidoPaterno, 'Pérez', 'legacy paternal');
assertEqual(parsed.apellidoMaterno, 'García', 'legacy maternal');
assertEqual(
  composeWorkerFullName(parsed.nombres, parsed.apellidoPaterno, parsed.apellidoMaterno),
  'Juan Carlos Pérez García',
  'legacy round-trip'
);

const sampleIdentity = {
  nombres: 'Juan',
  apellidoPaterno: 'Pérez',
  apellidoMaterno: 'García',
  fullName: 'Juan Pérez García',
  dni: '12345678',
};
for (const key of ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'fullName']) {
  if (!sampleIdentity[key]) throw new Error(`sample missing ${key}`);
}
assertEqual(
  composeWorkerFullName(
    sampleIdentity.nombres,
    sampleIdentity.apellidoPaterno,
    sampleIdentity.apellidoMaterno
  ),
  sampleIdentity.fullName,
  'sample identity matches OpsFlow composition'
);

// Inferencia desde claves __name__ (como en bulk_column_values sin customColumns en memoria)
function inferPart(labelNorm) {
  if (/^nombres?$/.test(labelNorm) && !/completo/.test(labelNorm)) return 'given_names';
  if (/^apellido\s*paterno$/.test(labelNorm) || labelNorm === 'paterno') return 'paternal_surname';
  if (/^apellido\s*materno$/.test(labelNorm) || labelNorm === 'materno') return 'maternal_surname';
  return null;
}
const row = {
  '__name__nombres': 'Fernando',
  '__name__apellido paterno': 'Ramírez',
  '__name__apellido materno': 'Quispe',
};
const parts = {};
for (const [k, v] of Object.entries(row)) {
  const label = k.startsWith('__name__') ? k.slice('__name__'.length) : k;
  const part = inferPart(label);
  if (part === 'given_names') parts.nombres = v;
  if (part === 'paternal_surname') parts.apellidoPaterno = v;
  if (part === 'maternal_surname') parts.apellidoMaterno = v;
}
assertEqual(parts.nombres, 'Fernando', 'bulk row nombres');
assertEqual(parts.apellidoPaterno, 'Ramírez', 'bulk row paternal');
assertEqual(parts.apellidoMaterno, 'Quispe', 'bulk row maternal');
assertEqual(
  composeWorkerFullName(parts.nombres, parts.apellidoPaterno, parts.apellidoMaterno),
  'Fernando Ramírez Quispe',
  'bulk row fullName'
);

console.log('verify-worker-handoff-names: OK');
