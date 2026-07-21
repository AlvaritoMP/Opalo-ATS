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

console.log('verify-worker-handoff-names: OK');
