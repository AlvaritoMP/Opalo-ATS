/**
 * Upsert Tally → candidato (Node / webhooks). Mantener alineado con lib/tallyCandidateUpsert.ts
 */

function normalizeDniKey(dni) {
    return (dni || '').replace(/\D/g, '');
}

function normalizePhoneKey(phone) {
    return (phone || '').replace(/\D/g, '');
}

function isPlaceholderImportEmail(email) {
    if (!email) return false;
    return /@import\.opalo$/i.test(email) || /^sin-email\./i.test(email);
}

function hasBulkCellValue(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return true;
    if (typeof val === 'number') return !Number.isNaN(val);
    if (typeof val === 'string') return val.trim() !== '';
    return true;
}

const STANDARD_MERGE_KEYS = [
    'name', 'email', 'phone', 'phone2', 'description', 'source',
    'salary_expectation', 'dni', 'linkedin_url', 'address', 'province', 'district', 'age',
];

function normalizeEmailKey(email) {
    return (email || '').trim().toLowerCase();
}

function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    return false;
}

function pickMergedValue(existing, incoming) {
    if (!isEmptyValue(existing)) return existing;
    if (!isEmptyValue(incoming)) return incoming;
    return existing;
}

function mergeBulkColumnValues(existing, incoming, customColumns) {
    if (!incoming || Object.keys(incoming).length === 0) return existing || undefined;
    const base = { ...(existing || {}) };
    for (const [key, value] of Object.entries(incoming)) {
        if (!hasBulkCellValue(base[key]) && hasBulkCellValue(value)) {
            base[key] = value;
        }
    }
    return Object.keys(base).length > 0 ? base : undefined;
}

export function matchExistingCandidateRow(rows, incoming) {
    const dniKey = normalizeDniKey(incoming.dni);
    const emailKey = normalizeEmailKey(incoming.email);
    const phoneKey = normalizePhoneKey(incoming.phone);
    const hasRealEmail = emailKey && !isPlaceholderImportEmail(emailKey);

    if (dniKey) {
        const byDni = rows.find(r => normalizeDniKey(r.dni) === dniKey);
        if (byDni) return byDni;
    }
    if (hasRealEmail) {
        const byEmail = rows.find(
            r => normalizeEmailKey(r.email) === emailKey && !isPlaceholderImportEmail(r.email)
        );
        if (byEmail) return byEmail;
    }
    if (phoneKey) {
        const byPhone = rows.find(r => normalizePhoneKey(r.phone) === phoneKey);
        if (byPhone) return byPhone;
    }
    return undefined;
}

export async function findExistingCandidateInProcess(supabase, processId, appName, incoming) {
    const dniKey = normalizeDniKey(incoming.dni);
    const emailKey = normalizeEmailKey(incoming.email);
    const phoneKey = normalizePhoneKey(incoming.phone);
    if (!dniKey && !emailKey && !phoneKey) return null;

    const { data, error } = await supabase
        .from('candidates')
        .select(
            'id, name, email, phone, phone2, description, source, salary_expectation, dni, linkedin_url, address, province, district, age, bulk_column_values, application_count, first_application_at, created_at, stage_id, application_started_date'
        )
        .eq('process_id', processId)
        .eq('app_name', appName)
        .eq('archived', false);

    if (error) throw error;
    if (!data?.length) return null;
    return matchExistingCandidateRow(data, incoming) || null;
}

function buildMergeUpdatePayload(existing, incoming, customColumns, nowIso) {
    const update = {
        created_at: nowIso,
        application_count: Math.max(1, Number(existing.application_count) || 1) + 1,
    };

    if (!existing.first_application_at && existing.created_at) {
        update.first_application_at = existing.created_at;
    }

    for (const key of STANDARD_MERGE_KEYS) {
        const merged = pickMergedValue(existing[key], incoming[key]);
        if (merged !== undefined && merged !== existing[key]) {
            update[key] = merged;
        }
    }

    const mergedBulk = mergeBulkColumnValues(
        existing.bulk_column_values,
        incoming.bulk_column_values,
        customColumns
    );
    if (mergedBulk) update.bulk_column_values = mergedBulk;

    if (isEmptyValue(existing.application_started_date)) {
        update.application_started_date = nowIso;
    }
    update.application_completed_date = nowIso;

    return update;
}

export async function processTallyCandidateUpsert(supabase, params) {
    const { processId, appName, stageId, candidateData } = params;
    const customColumns = params.customColumns || [];
    const nowIso = new Date().toISOString();

    const existing = await findExistingCandidateInProcess(
        supabase,
        processId,
        appName,
        candidateData
    );

    if (existing?.id) {
        const updatePayload = buildMergeUpdatePayload(existing, candidateData, customColumns, nowIso);

        const { data: updated, error: updateError } = await supabase
            .from('candidates')
            .update(updatePayload)
            .eq('id', existing.id)
            .eq('app_name', appName)
            .select('id, application_count')
            .single();

        if (updateError) throw updateError;

        await supabase.from('candidate_history').insert({
            candidate_id: existing.id,
            stage_id: existing.stage_id || stageId,
            moved_at: nowIso,
            moved_by: null,
            app_name: appName,
        });

        return {
            candidateId: updated.id,
            isReapplication: true,
            applicationCount: updated.application_count || 2,
        };
    }

    const bulkValues = candidateData.bulk_column_values;
    const insertPayload = { ...candidateData };
    delete insertPayload.bulk_column_values;

    const { data: created, error: insertError } = await supabase
        .from('candidates')
        .insert({
            ...insertPayload,
            created_at: nowIso,
            first_application_at: nowIso,
            application_count: 1,
            application_started_date: nowIso,
            application_completed_date: nowIso,
        })
        .select('id, application_count')
        .single();

    if (insertError) throw insertError;

    if (bulkValues && Object.keys(bulkValues).length > 0) {
        const { error: bulkError } = await supabase
            .from('candidates')
            .update({ bulk_column_values: bulkValues })
            .eq('id', created.id);
        if (bulkError) console.warn('bulk_column_values no guardado:', bulkError.message);
    }

    await supabase.from('candidate_history').insert({
        candidate_id: created.id,
        stage_id: stageId,
        moved_at: nowIso,
        moved_by: null,
        app_name: appName,
    });

    return {
        candidateId: created.id,
        isReapplication: false,
        applicationCount: 1,
    };
}
