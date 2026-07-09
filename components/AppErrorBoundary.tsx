import React from 'react';

interface AppErrorBoundaryState {
    error: Error | null;
}

export class AppErrorBoundary extends React.Component<
    { children: React.ReactNode },
    AppErrorBoundaryState
> {
    state: AppErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        console.error('AppErrorBoundary:', error, info);
    }

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        const isQuota =
            error.name === 'QuotaExceededError' ||
            error.message.includes('QuotaExceededError') ||
            error.message.includes('exceeded the quota');

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                    <h1 className="text-lg font-semibold text-gray-900 mb-2">
                        {isQuota ? 'Almacenamiento del navegador lleno' : 'Error inesperado'}
                    </h1>
                    <p className="text-sm text-gray-600 mb-4">
                        {isQuota
                            ? 'La app no puede guardar datos locales. Sus datos en la nube están seguros.'
                            : 'Ocurrió un error al cargar la aplicación.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            try {
                                const keys: string[] = [];
                                for (let i = 0; i < localStorage.length; i++) {
                                    const k = localStorage.key(i);
                                    if (k?.startsWith('bulkColumnValues_')) keys.push(k);
                                }
                                keys.forEach(k => localStorage.removeItem(k));
                            } catch {
                                /* ignore */
                            }
                            window.location.reload();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                        Limpiar caché local y recargar
                    </button>
                </div>
            </div>
        );
    }
}
