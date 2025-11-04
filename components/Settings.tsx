

import React, { useState, useEffect } from 'react';
import { useAppState } from '../App';
import { AppSettings } from '../types';
import { Save, Database, HardDrive, Globe } from 'lucide-react';

export const Settings: React.FC = () => {
    const { state, actions } = useAppState();
    const [settings, setSettings] = useState<AppSettings | null>(state.settings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSettings(state.settings);
    }, [state.settings]);

    if (!settings) {
        return null; // Or a loading state
    }
    
    const handleDbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({
            ...settings,
            database: {
                ...settings.database,
                [e.target.name]: e.target.value,
            }
        });
    };

    const handleFileStorageToggle = () => {
        setSettings({
            ...settings,
            fileStorage: {
                ...settings.fileStorage,
                connected: !settings.fileStorage.connected,
            }
        });
    };

    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        setSettings({
            ...settings,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        await actions.saveSettings(settings);
        setIsSaving(false);
        // Maybe show a toast notification here
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 disabled:bg-primary-300"
                >
                    <Save className="w-5 h-5 mr-2" /> {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            <div className="space-y-8 max-w-4xl">
                {/* Localization Settings */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold mb-1 flex items-center"><Globe className="mr-2"/> Localization</h2>
                    <p className="text-sm text-gray-500 mb-6">Set your preferred currency symbol.</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="currencySymbol" className="block text-sm font-medium text-gray-700">Currency Symbol</label>
                            <input 
                                type="text" 
                                id="currencySymbol" 
                                name="currencySymbol" 
                                value={settings.currencySymbol || ''} 
                                onChange={handleSettingChange} 
                                placeholder="$" 
                                className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
                            />
                        </div>
                    </div>
                </div>

                {/* Database Settings */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold mb-1 flex items-center"><Database className="mr-2"/> Database Connection</h2>
                    <p className="text-sm text-gray-500 mb-6">Configure the connection to your database (e.g., Baserow).</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Database Type</label>
                            <input type="text" value="Baserow" disabled className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700">API URL</label>
                            <input type="text" id="apiUrl" name="apiUrl" value={settings.database.apiUrl} onChange={handleDbChange} placeholder="https://api.baserow.io" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                        <div>
                            <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700">API Token</label>
                            <input type="password" id="apiToken" name="apiToken" value={settings.database.apiToken} onChange={handleDbChange} placeholder="••••••••••••••••••••" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                    </div>
                </div>
                {/* File Storage Settings */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold mb-1 flex items-center"><HardDrive className="mr-2"/> File Storage</h2>
                    <p className="text-sm text-gray-500 mb-6">Connect to a cloud storage provider for candidate attachments.</p>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div>
                            <p className="font-medium">Google Drive</p>
                            <span className={`text-sm ${settings.fileStorage.connected ? 'text-green-600' : 'text-gray-500'}`}>
                                {settings.fileStorage.connected ? 'Connected' : 'Not Connected'}
                            </span>
                        </div>
                        <button
                            onClick={handleFileStorageToggle}
                            className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm ${
                                settings.fileStorage.connected
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                           {settings.fileStorage.connected ? 'Disconnect' : 'Connect with Google Drive'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};