import { Candidate, Process, WorkerSnapshot, WorkerSnapshotIdentity } from '../types';
import { APP_NAME } from './appConfig';

export const SNAPSHOT_VERSION = 1;
export const TARGET_APP = 'OpsFlow';

function hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value === 'boolean') return true;
    return false;
}

function asString(value: unknown): string | undefined {
    if (!hasValue(value)) return undefined;
    return String(value).trim();
}

type FieldExtractor = (ctx: { candidate: Candidate; process?: Process }) => unknown;

const FIELD_CATALOG: Record<string, FieldExtractor> = {
    address: ({ candidate }) => candidate.address,
    province: ({ candidate }) => candidate.province,
    district: ({ candidate }) => candidate.district,
    age: ({ candidate }) => candidate.age,
    linkedinUrl: ({ candidate }) => candidate.linkedinUrl,
    source: ({ candidate }) => candidate.source,
    agreedSalary: ({ candidate }) => candidate.agreedSalary,
    agreedSalaryInWords: ({ candidate }) => candidate.agreedSalaryInWords,
    hireDate: ({ candidate }) => candidate.hireDate,
    salaryExpectation: ({ candidate }) => candidate.salaryExpectation,
    offerAcceptedDate: ({ candidate }) => candidate.offerAcceptedDate,
    applicationStartedDate: ({ candidate }) => candidate.applicationStartedDate,
    applicationCompletedDate: ({ candidate }) => candidate.applicationCompletedDate,
    processTitle: ({ process }) => process?.title,
    serviceOrderCode: ({ process }) => process?.serviceOrderCode,
    clientName: ({ process }) => process?.client?.razonSocial,
    processDescription: ({ process }) => process?.description,
    stageName: ({ candidate, process }) =>
        process?.stages.find(stage => stage.id === candidate.stageId)?.name,
};

export function buildWorkerSnapshot(candidate: Candidate, process?: Process): WorkerSnapshot {
    const identity: WorkerSnapshotIdentity = {};

    const fullName = asString(candidate.name);
    if (fullName) identity.fullName = fullName;

    const dni = asString(candidate.dni);
    if (dni) identity.dni = dni;

    const email = asString(candidate.email);
    if (email) identity.email = email;

    const phone = asString(candidate.phone);
    if (phone) identity.phone = phone;

    const phone2 = asString(candidate.phone2);
    if (phone2) identity.phone2 = phone2;

    const fields: Record<string, string | number | boolean> = {};
    const includedFieldKeys: string[] = [];
    const ctx = { candidate, process };

    for (const [key, extract] of Object.entries(FIELD_CATALOG)) {
        const raw = extract(ctx);
        if (!hasValue(raw)) continue;

        if (typeof raw === 'number') {
            fields[key] = raw;
        } else if (typeof raw === 'boolean') {
            fields[key] = raw;
        } else {
            const text = asString(raw);
            if (text) fields[key] = text;
        }
        includedFieldKeys.push(key);
    }

    const suitability = candidate.psycholaboralEvaluation?.suitabilityStatus;
    if (hasValue(suitability)) {
        fields.psycholaboralSuitability = String(suitability);
        includedFieldKeys.push('psycholaboralSuitability');
    }

    const scoreIa = candidate.scoreIa;
    if (hasValue(scoreIa)) {
        fields.scoreIa = scoreIa as number;
        includedFieldKeys.push('scoreIa');
    }

    return {
        identity,
        fields,
        meta: {
            sourceCandidateId: candidate.id,
            sourceProcessId: candidate.processId,
            sourceApp: APP_NAME,
            snapshotVersion: SNAPSHOT_VERSION,
            includedFieldKeys,
            capturedAt: new Date().toISOString(),
        },
    };
}

export function getWorkerDisplayName(snapshot: WorkerSnapshot): string {
    return snapshot.identity.fullName || snapshot.identity.dni || 'Sin nombre';
}

export function validateSnapshotForSend(snapshot: WorkerSnapshot): string | null {
    if (snapshot.identity.fullName || snapshot.identity.dni) return null;
    return 'El candidato debe tener al menos nombre o DNI para enviar a OpsFlow.';
}

export const ACTIVE_PACKAGE_STATUSES = ['sent', 'received', 'processing'] as const;

export const PACKAGE_STATUS_LABELS: Record<string, string> = {
    sent: 'Enviado',
    received: 'Recibido',
    processing: 'En proceso',
    completed: 'Completado',
    rejected: 'Rechazado',
    partially_completed: 'Parcialmente completado',
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
    pending: 'Entregando…',
    delivered: 'Entregado a OpsFlow',
    failed: 'Error de entrega',
};
