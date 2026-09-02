import { AppSettings } from '../types';

const SETTINGS_KEY = 'ats_pro_settings';

export const getSettings = (): AppSettings | null => {
    try {
        const rawSettings = localStorage.getItem(SETTINGS_KEY);
        if (rawSettings) {
            return JSON.parse(rawSettings) as AppSettings;
        }
        return null;
    } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
        return null;
    }
};

/** Backup local ligero: logos/plantillas en data URL pueden llenar la cuota (~5 MB). */
function toLocalSettingsBackup(settings: AppSettings): AppSettings {
    const stripDataUrl = (value?: string | null) =>
        value && value.startsWith('data:') ? '' : (value || '');

    return {
        ...settings,
        logoUrl: stripDataUrl(settings.logoUrl),
        poweredByLogoUrl: stripDataUrl(settings.poweredByLogoUrl) || undefined,
        templates: undefined,
        psycholaboralInventory: undefined,
        reportTheme: settings.reportTheme
            ? {
                ...settings.reportTheme,
                psycholaboralHeroImageUrl: stripDataUrl(settings.reportTheme.psycholaboralHeroImageUrl) || null,
            }
            : undefined,
    };
}

export const saveSettings = (settings: AppSettings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(toLocalSettingsBackup(settings)));
    } catch (error) {
        console.error("Failed to save settings to localStorage", error);
        try {
            localStorage.removeItem(SETTINGS_KEY);
        } catch {
            /* ignore */
        }
    }
};