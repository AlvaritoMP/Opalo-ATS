import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react';
import {
    lookupComplementaryFicha,
    submitComplementaryFicha,
} from '../lib/api/complementaryFicha';
import {
    ComplementaryEducacion,
    ComplementaryExperiencia,
    ComplementaryFamiliar,
    ComplementaryFichaData,
    ComplementaryLookupMatch,
    ComplementaryPrefillPayload,
    ComplementarySalud,
    emptyComplementaryFicha,
    getDniFromPublicUrl,
    normalizeDniDigits,
} from '../lib/complementaryFicha';

type Step = 'dni' | 'pick' | 'form' | 'done';

const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const labelClass = 'block text-sm font-medium text-gray-700';

const sectionClass = 'bg-white rounded-xl border border-gray-200 p-4 md:p-5 space-y-4';

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className={labelClass}>
                {label}
                {required ? <span className="text-red-500"> *</span> : null}
            </label>
            {children}
        </div>
    );
}

function RepeatHeader({
    title,
    onAdd,
}: {
    title: string;
    onAdd: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
                <Plus className="w-3.5 h-3.5" />
                Agregar
            </button>
        </div>
    );
}

export const PublicComplementaryFicha: React.FC = () => {
    const [step, setStep] = useState<Step>('dni');
    const [dni, setDni] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [matches, setMatches] = useState<ComplementaryLookupMatch[]>([]);
    const [prefillMeta, setPrefillMeta] = useState<Omit<ComplementaryPrefillPayload, 'form'> | null>(null);
    const [form, setForm] = useState<ComplementaryFichaData>(emptyComplementaryFicha());

    useEffect(() => {
        const fromUrl = getDniFromPublicUrl();
        if (fromUrl) setDni(fromUrl);
    }, []);

    const title = useMemo(() => {
        if (prefillMeta?.processTitle) return `Ficha de datos — ${prefillMeta.processTitle}`;
        return 'Ficha de datos complementaria';
    }, [prefillMeta]);

    const patchForm = (patch: Partial<ComplementaryFichaData>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const applyPrefill = (payload: ComplementaryPrefillPayload) => {
        setPrefillMeta({
            candidateId: payload.candidateId,
            name: payload.name,
            processId: payload.processId,
            processTitle: payload.processTitle,
            alreadyFilled: payload.alreadyFilled,
            filledAt: payload.filledAt,
        });
        setForm({ ...emptyComplementaryFicha(), ...payload.form, version: 1 });
        setStep('form');
    };

    const handleLookup = async (candidateId?: string) => {
        setError('');
        const digits = normalizeDniDigits(dni);
        if (digits.length < 8) {
            setError('Ingresa un número de documento válido (mínimo 8 dígitos).');
            return;
        }
        setBusy(true);
        try {
            const result = await lookupComplementaryFicha(digits, candidateId);
            if (result.multiple === true) {
                setMatches(result.matches);
                setStep('pick');
                return;
            }
            applyPrefill(result.prefill);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo buscar el documento.');
        } finally {
            setBusy(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prefillMeta?.candidateId) return;
        setError('');
        if (!form.declaracionAceptada) {
            setError('Debes aceptar la declaración para enviar la ficha.');
            return;
        }
        setBusy(true);
        try {
            await submitComplementaryFicha({
                dni,
                candidateId: prefillMeta.candidateId,
                form: {
                    ...form,
                    nroDocumento: normalizeDniDigits(form.nroDocumento || dni),
                    version: 1,
                },
            });
            setStep('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar la ficha.');
        } finally {
            setBusy(false);
        }
    };

    const updateFamiliar = (index: number, patch: Partial<ComplementaryFamiliar>) => {
        const list = [...(form.familiares || [])];
        list[index] = { ...list[index], ...patch };
        patchForm({ familiares: list });
    };

    const updateEducacion = (index: number, patch: Partial<ComplementaryEducacion>) => {
        const list = [...(form.educacion || [])];
        list[index] = { ...list[index], ...patch };
        patchForm({ educacion: list });
    };

    const updateExperiencia = (index: number, patch: Partial<ComplementaryExperiencia>) => {
        const list = [...(form.experienciaLaboral || [])];
        list[index] = { ...list[index], ...patch };
        patchForm({ experienciaLaboral: list });
    };

    const updateSalud = (index: number, patch: Partial<ComplementarySalud>) => {
        const list = [...(form.antecedentesSalud || [])];
        list[index] = { ...list[index], ...patch };
        patchForm({ antecedentesSalud: list });
    };

    return (
        <div className="min-h-screen bg-slate-100 text-gray-900">
            <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
                <div className="mb-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-700 mb-3">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
                    <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
                        Completa o confirma tu información antes de la entrevista. Este enlace no da acceso al sistema;
                        solo permite enviar tu ficha de datos.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {step === 'dni' && (
                    <div className={sectionClass}>
                        <Field label="Número de documento (DNI / CE / Pasaporte)" required>
                            <input
                                className={inputClass}
                                inputMode="numeric"
                                autoComplete="off"
                                value={dni}
                                onChange={(e) => setDni(e.target.value)}
                                placeholder="Ej. 12345678"
                            />
                        </Field>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleLookup()}
                            className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Continuar
                        </button>
                    </div>
                )}

                {step === 'pick' && (
                    <div className={`${sectionClass} space-y-3`}>
                        <p className="text-sm text-slate-600">
                            Encontramos más de un proceso con ese documento. Elige el que corresponde a tu entrevista:
                        </p>
                        {matches.map((m) => (
                            <button
                                key={m.candidateId}
                                type="button"
                                disabled={busy}
                                onClick={() => handleLookup(m.candidateId)}
                                className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition"
                            >
                                <div className="font-medium text-slate-900">{m.processTitle}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{m.name}</div>
                                {m.alreadyFilled ? (
                                    <div className="text-xs text-amber-700 mt-1">Ya enviaste una ficha (puedes actualizarla)</div>
                                ) : null}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="text-sm text-slate-600 hover:text-slate-800"
                            onClick={() => {
                                setStep('dni');
                                setMatches([]);
                            }}
                        >
                            Volver
                        </button>
                    </div>
                )}

                {step === 'done' && (
                    <div className={`${sectionClass} text-center py-10`}>
                        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <h2 className="text-xl font-semibold text-slate-900">Ficha enviada</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Gracias. Tu información quedó registrada para el equipo de selección / área usuaria.
                        </p>
                    </div>
                )}

                {step === 'form' && prefillMeta && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                            <div>
                                <span className="font-medium">Candidato:</span> {prefillMeta.name}
                            </div>
                            <div>
                                <span className="font-medium">Proceso:</span> {prefillMeta.processTitle}
                            </div>
                            {prefillMeta.alreadyFilled ? (
                                <div className="mt-1 text-amber-800">
                                    Ya existe una ficha enviada
                                    {prefillMeta.filledAt
                                        ? ` (${new Date(prefillMeta.filledAt).toLocaleString()})`
                                        : ''}
                                    . Puedes corregir y volver a enviar.
                                </div>
                            ) : (
                                <div className="mt-1 text-slate-600">
                                    Revisamos y precargamos lo que ya teníamos. Completa solo lo que falte.
                                </div>
                            )}
                        </div>

                        <section className={sectionClass}>
                            <h2 className="text-base font-semibold text-slate-900">I. Datos personales</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Nombres" required>
                                    <input
                                        className={inputClass}
                                        required
                                        value={form.nombres || ''}
                                        onChange={(e) => patchForm({ nombres: e.target.value })}
                                    />
                                </Field>
                                <Field label="Apellido paterno" required>
                                    <input
                                        className={inputClass}
                                        required
                                        value={form.apellidoPaterno || ''}
                                        onChange={(e) => patchForm({ apellidoPaterno: e.target.value })}
                                    />
                                </Field>
                                <Field label="Apellido materno">
                                    <input
                                        className={inputClass}
                                        value={form.apellidoMaterno || ''}
                                        onChange={(e) => patchForm({ apellidoMaterno: e.target.value })}
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Fecha de nacimiento (dd/mm/aaaa)">
                                    <input
                                        type="text"
                                        className={inputClass}
                                        inputMode="numeric"
                                        placeholder="dd/mm/aaaa"
                                        value={form.fechaNacimiento || ''}
                                        onChange={(e) => patchForm({ fechaNacimiento: e.target.value })}
                                    />
                                </Field>
                                <Field label="Tipo de documento">
                                    <select
                                        className={inputClass}
                                        value={form.tipoDocumento || 'DNI'}
                                        onChange={(e) =>
                                            patchForm({
                                                tipoDocumento: e.target.value as ComplementaryFichaData['tipoDocumento'],
                                            })
                                        }
                                    >
                                        <option value="DNI">DNI</option>
                                        <option value="CE">CE</option>
                                        <option value="Pasaporte">Pasaporte</option>
                                    </select>
                                </Field>
                                <Field label="Nro. de documento" required>
                                    <input
                                        className={inputClass}
                                        required
                                        value={form.nroDocumento || dni}
                                        onChange={(e) => patchForm({ nroDocumento: e.target.value })}
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Field label="Nacionalidad">
                                    <input
                                        className={inputClass}
                                        value={form.nacionalidad || ''}
                                        onChange={(e) => patchForm({ nacionalidad: e.target.value })}
                                    />
                                </Field>
                                <Field label="Edad">
                                    <input
                                        className={inputClass}
                                        inputMode="numeric"
                                        value={form.edad || ''}
                                        onChange={(e) => patchForm({ edad: e.target.value })}
                                    />
                                </Field>
                                <Field label="Sexo">
                                    <select
                                        className={inputClass}
                                        value={form.sexo || ''}
                                        onChange={(e) =>
                                            patchForm({ sexo: e.target.value as ComplementaryFichaData['sexo'] })
                                        }
                                    >
                                        <option value="">—</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                    </select>
                                </Field>
                                <Field label="Estado civil">
                                    <select
                                        className={inputClass}
                                        value={form.estadoCivil || ''}
                                        onChange={(e) =>
                                            patchForm({
                                                estadoCivil: e.target.value as ComplementaryFichaData['estadoCivil'],
                                            })
                                        }
                                    >
                                        <option value="">—</option>
                                        <option value="Soltero">Soltero</option>
                                        <option value="Casado">Casado</option>
                                        <option value="Viudo">Viudo</option>
                                        <option value="Divorciado">Divorciado</option>
                                    </select>
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Correo electrónico" required>
                                    <input
                                        type="email"
                                        className={inputClass}
                                        required
                                        value={form.email || ''}
                                        onChange={(e) => patchForm({ email: e.target.value })}
                                    />
                                </Field>
                                <Field label="Teléfono" required>
                                    <input
                                        className={inputClass}
                                        required
                                        value={form.telefono || ''}
                                        onChange={(e) => patchForm({ telefono: e.target.value })}
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Talla camisa">
                                    <input
                                        className={inputClass}
                                        value={form.tallaCamisa || ''}
                                        onChange={(e) => patchForm({ tallaCamisa: e.target.value })}
                                    />
                                </Field>
                                <Field label="Talla pantalón">
                                    <input
                                        className={inputClass}
                                        value={form.tallaPantalon || ''}
                                        onChange={(e) => patchForm({ tallaPantalon: e.target.value })}
                                    />
                                </Field>
                                <Field label="Talla calzado">
                                    <input
                                        className={inputClass}
                                        value={form.tallaCalzado || ''}
                                        onChange={(e) => patchForm({ tallaCalzado: e.target.value })}
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Teléfono de emergencia">
                                    <input
                                        className={inputClass}
                                        value={form.emergenciaTelefono || ''}
                                        onChange={(e) => patchForm({ emergenciaTelefono: e.target.value })}
                                    />
                                </Field>
                                <Field label="Parentesco (emergencia)">
                                    <input
                                        className={inputClass}
                                        value={form.emergenciaParentesco || ''}
                                        onChange={(e) => patchForm({ emergenciaParentesco: e.target.value })}
                                    />
                                </Field>
                            </div>
                            <Field label="Dirección">
                                <input
                                    className={inputClass}
                                    value={form.direccion || ''}
                                    onChange={(e) => patchForm({ direccion: e.target.value })}
                                />
                            </Field>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Field label="Distrito">
                                    <input
                                        className={inputClass}
                                        value={form.distrito || ''}
                                        onChange={(e) => patchForm({ distrito: e.target.value })}
                                    />
                                </Field>
                                <Field label="Provincia">
                                    <input
                                        className={inputClass}
                                        value={form.provincia || ''}
                                        onChange={(e) => patchForm({ provincia: e.target.value })}
                                    />
                                </Field>
                                <Field label="Departamento">
                                    <input
                                        className={inputClass}
                                        value={form.departamento || ''}
                                        onChange={(e) => patchForm({ departamento: e.target.value })}
                                    />
                                </Field>
                            </div>
                        </section>

                        <section className={sectionClass}>
                            <RepeatHeader
                                title="II. Datos familiares"
                                onAdd={() =>
                                    patchForm({ familiares: [...(form.familiares || []), {}] })
                                }
                            />
                            {(form.familiares || []).map((row, index) => (
                                <div key={index} className="rounded-lg border border-gray-100 p-3 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500">Familiar {index + 1}</span>
                                        {(form.familiares || []).length > 1 ? (
                                            <button
                                                type="button"
                                                className="text-red-600 hover:text-red-700"
                                                onClick={() =>
                                                    patchForm({
                                                        familiares: (form.familiares || []).filter((_, i) => i !== index),
                                                    })
                                                }
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <Field label="Nombres">
                                            <input
                                                className={inputClass}
                                                value={row.nombres || ''}
                                                onChange={(e) => updateFamiliar(index, { nombres: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Apellido paterno">
                                            <input
                                                className={inputClass}
                                                value={row.apellidoPaterno || ''}
                                                onChange={(e) =>
                                                    updateFamiliar(index, { apellidoPaterno: e.target.value })
                                                }
                                            />
                                        </Field>
                                        <Field label="Apellido materno">
                                            <input
                                                className={inputClass}
                                                value={row.apellidoMaterno || ''}
                                                onChange={(e) =>
                                                    updateFamiliar(index, { apellidoMaterno: e.target.value })
                                                }
                                            />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <Field label="Parentesco">
                                            <input
                                                className={inputClass}
                                                value={row.parentesco || ''}
                                                onChange={(e) => updateFamiliar(index, { parentesco: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Edad">
                                            <input
                                                className={inputClass}
                                                value={row.edad || ''}
                                                onChange={(e) => updateFamiliar(index, { edad: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Teléfono">
                                            <input
                                                className={inputClass}
                                                value={row.telefono || ''}
                                                onChange={(e) => updateFamiliar(index, { telefono: e.target.value })}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            ))}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                <Field label="¿Pariente trabajando en la empresa?">
                                    <select
                                        className={inputClass}
                                        value={
                                            form.parienteEnOpalo === true
                                                ? 'si'
                                                : form.parienteEnOpalo === false
                                                  ? 'no'
                                                  : ''
                                        }
                                        onChange={(e) =>
                                            patchForm({
                                                parienteEnOpalo:
                                                    e.target.value === 'si'
                                                        ? true
                                                        : e.target.value === 'no'
                                                          ? false
                                                          : null,
                                            })
                                        }
                                    >
                                        <option value="">—</option>
                                        <option value="si">Sí</option>
                                        <option value="no">No</option>
                                    </select>
                                </Field>
                                <Field label="Nombre del familiar">
                                    <input
                                        className={inputClass}
                                        value={form.nombreFamiliarOpalo || ''}
                                        onChange={(e) => patchForm({ nombreFamiliarOpalo: e.target.value })}
                                        disabled={form.parienteEnOpalo !== true}
                                    />
                                </Field>
                            </div>
                        </section>

                        <section className={sectionClass}>
                            <RepeatHeader
                                title="III. Educación"
                                onAdd={() => patchForm({ educacion: [...(form.educacion || []), {}] })}
                            />
                            {(form.educacion || []).map((row, index) => (
                                <div key={index} className="rounded-lg border border-gray-100 p-3 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500">Registro {index + 1}</span>
                                        {(form.educacion || []).length > 1 ? (
                                            <button
                                                type="button"
                                                className="text-red-600"
                                                onClick={() =>
                                                    patchForm({
                                                        educacion: (form.educacion || []).filter((_, i) => i !== index),
                                                    })
                                                }
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Nivel">
                                            <input
                                                className={inputClass}
                                                value={row.nivel || ''}
                                                onChange={(e) => updateEducacion(index, { nivel: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Institución">
                                            <input
                                                className={inputClass}
                                                value={row.institucion || ''}
                                                onChange={(e) =>
                                                    updateEducacion(index, { institucion: e.target.value })
                                                }
                                            />
                                        </Field>
                                        <Field label="Lugar">
                                            <input
                                                className={inputClass}
                                                value={row.lugar || ''}
                                                onChange={(e) => updateEducacion(index, { lugar: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Periodo">
                                            <input
                                                className={inputClass}
                                                value={row.periodo || ''}
                                                onChange={(e) => updateEducacion(index, { periodo: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Grado">
                                            <input
                                                className={inputClass}
                                                value={row.grado || ''}
                                                onChange={(e) => updateEducacion(index, { grado: e.target.value })}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className={sectionClass}>
                            <RepeatHeader
                                title="IV. Experiencia laboral"
                                onAdd={() =>
                                    patchForm({
                                        experienciaLaboral: [...(form.experienciaLaboral || []), {}],
                                    })
                                }
                            />
                            {(form.experienciaLaboral || []).map((row, index) => (
                                <div key={index} className="rounded-lg border border-gray-100 p-3 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500">Experiencia {index + 1}</span>
                                        {(form.experienciaLaboral || []).length > 1 ? (
                                            <button
                                                type="button"
                                                className="text-red-600"
                                                onClick={() =>
                                                    patchForm({
                                                        experienciaLaboral: (form.experienciaLaboral || []).filter(
                                                            (_, i) => i !== index
                                                        ),
                                                    })
                                                }
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Empresa">
                                            <input
                                                className={inputClass}
                                                value={row.empresa || ''}
                                                onChange={(e) => updateExperiencia(index, { empresa: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Puesto">
                                            <input
                                                className={inputClass}
                                                value={row.puesto || ''}
                                                onChange={(e) => updateExperiencia(index, { puesto: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Fecha de ingreso">
                                            <input
                                                type="date"
                                                className={inputClass}
                                                value={row.fechaIngreso || ''}
                                                onChange={(e) =>
                                                    updateExperiencia(index, { fechaIngreso: e.target.value })
                                                }
                                            />
                                        </Field>
                                        <Field label="Fecha de cese">
                                            <input
                                                type="date"
                                                className={inputClass}
                                                value={row.fechaCese || ''}
                                                onChange={(e) =>
                                                    updateExperiencia(index, { fechaCese: e.target.value })
                                                }
                                            />
                                        </Field>
                                        <Field label="Motivo de cese">
                                            <select
                                                className={inputClass}
                                                value={row.motivoCese || ''}
                                                onChange={(e) =>
                                                    updateExperiencia(index, {
                                                        motivoCese: e.target
                                                            .value as ComplementaryExperiencia['motivoCese'],
                                                    })
                                                }
                                            >
                                                <option value="">—</option>
                                                <option value="Renuncia">Renuncia</option>
                                                <option value="Despido">Despido</option>
                                                <option value="Abandono">Abandono</option>
                                            </select>
                                        </Field>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className={sectionClass}>
                            <RepeatHeader
                                title="V. Antecedentes de salud"
                                onAdd={() =>
                                    patchForm({
                                        antecedentesSalud: [...(form.antecedentesSalud || []), {}],
                                    })
                                }
                            />
                            {(form.antecedentesSalud || []).length === 0 ? (
                                <p className="text-sm text-slate-500">Sin registros. Usa “Agregar” si aplica.</p>
                            ) : null}
                            {(form.antecedentesSalud || []).map((row, index) => (
                                <div key={index} className="rounded-lg border border-gray-100 p-3 space-y-3">
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            className="text-red-600"
                                            onClick={() =>
                                                patchForm({
                                                    antecedentesSalud: (form.antecedentesSalud || []).filter(
                                                        (_, i) => i !== index
                                                    ),
                                                })
                                            }
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Tipo de enfermedad">
                                            <input
                                                className={inputClass}
                                                value={row.tipoEnfermedad || ''}
                                                onChange={(e) => updateSalud(index, { tipoEnfermedad: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Edad">
                                            <input
                                                className={inputClass}
                                                value={row.edad || ''}
                                                onChange={(e) => updateSalud(index, { edad: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Diagnóstico">
                                            <input
                                                className={inputClass}
                                                value={row.diagnostico || ''}
                                                onChange={(e) => updateSalud(index, { diagnostico: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Secuela">
                                            <input
                                                className={inputClass}
                                                value={row.secuela || ''}
                                                onChange={(e) => updateSalud(index, { secuela: e.target.value })}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className={sectionClass}>
                            <h2 className="text-base font-semibold text-slate-900">VI. Datos para contratación</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Field label="Unidad de destaque">
                                    <input
                                        className={inputClass}
                                        value={form.unidadDestaque || ''}
                                        onChange={(e) => patchForm({ unidadDestaque: e.target.value })}
                                    />
                                </Field>
                                <Field label="Puesto">
                                    <input
                                        className={inputClass}
                                        value={form.puestoContrato || ''}
                                        onChange={(e) => patchForm({ puestoContrato: e.target.value })}
                                    />
                                </Field>
                                <Field label="Banco para sueldo">
                                    <input
                                        className={inputClass}
                                        value={form.bancoSueldo || ''}
                                        onChange={(e) => patchForm({ bancoSueldo: e.target.value })}
                                    />
                                </Field>
                                <Field label="Banco para CTS">
                                    <input
                                        className={inputClass}
                                        value={form.bancoCts || ''}
                                        onChange={(e) => patchForm({ bancoCts: e.target.value })}
                                    />
                                </Field>
                                <Field label="Sistema de pensiones anterior">
                                    <select
                                        className={inputClass}
                                        value={form.sistemaPensionesAnterior || ''}
                                        onChange={(e) =>
                                            patchForm({
                                                sistemaPensionesAnterior: e.target
                                                    .value as ComplementaryFichaData['sistemaPensionesAnterior'],
                                            })
                                        }
                                    >
                                        <option value="">—</option>
                                        <option value="AFP">AFP</option>
                                        <option value="ONP">ONP</option>
                                    </select>
                                </Field>
                                <Field label="Sistema de pensiones deseado">
                                    <select
                                        className={inputClass}
                                        value={form.sistemaPensionesDeseado || ''}
                                        onChange={(e) =>
                                            patchForm({
                                                sistemaPensionesDeseado: e.target
                                                    .value as ComplementaryFichaData['sistemaPensionesDeseado'],
                                            })
                                        }
                                    >
                                        <option value="">—</option>
                                        <option value="AFP">AFP</option>
                                        <option value="ONP">ONP</option>
                                    </select>
                                </Field>
                            </div>
                        </section>

                        <section className={sectionClass}>
                            <h2 className="text-base font-semibold text-slate-900">VII. Declaración</h2>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Declaro que la información brindada y los datos registrados en esta ficha son verdaderos
                                y tienen carácter de declaración jurada. Autorizo a LA EMPRESA a tratar mis datos
                                personales conforme a la Ley N.º 29733, Ley de protección de datos personales.
                            </p>
                            <label className="flex items-start gap-2 text-sm text-slate-800">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={Boolean(form.declaracionAceptada)}
                                    onChange={(e) => patchForm({ declaracionAceptada: e.target.checked })}
                                    required
                                />
                                <span>Acepto la declaración y el tratamiento de mis datos personales.</span>
                            </label>
                        </section>

                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                            <button
                                type="button"
                                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                                onClick={() => {
                                    setStep('dni');
                                    setPrefillMeta(null);
                                    setError('');
                                }}
                            >
                                Cambiar documento
                            </button>
                            <button
                                type="submit"
                                disabled={busy}
                                className="inline-flex justify-center items-center gap-2 py-2.5 px-5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Enviar ficha
                            </button>
                        </div>
                    </form>
                )}

                <p className="mt-8 text-center text-xs text-slate-400">Opalo ATS · Formulario público de ficha</p>
            </div>
        </div>
    );
};
