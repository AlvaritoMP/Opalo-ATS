import type { Process, UserAlertSettings } from '../types';

export const EMPTY_USER_ALERT_SETTINGS: UserAlertSettings = {
    disabledClientIds: [],
    disabledProcessIds: [],
};

function stringIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function normalizeUserAlertSettings(raw: unknown): UserAlertSettings {
    if (!raw || typeof raw !== 'object') return { ...EMPTY_USER_ALERT_SETTINGS };
    const obj = raw as Record<string, unknown>;
    return {
        disabledClientIds: stringIds(obj.disabledClientIds),
        disabledProcessIds: stringIds(obj.disabledProcessIds),
    };
}

/** Un proceso no genera avisos si él o su cliente están apagados. */
export function areAlertsEnabledForProcess(
    process: Pick<Process, 'id' | 'clientId'>,
    settings?: UserAlertSettings | null
): boolean {
    const config = settings ?? EMPTY_USER_ALERT_SETTINGS;
    if (process.clientId && config.disabledClientIds.includes(process.clientId)) return false;
    if (config.disabledProcessIds.includes(process.id)) return false;
    return true;
}
