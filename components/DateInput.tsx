import React, { useEffect, useState } from 'react';
import {
    formatBulkDate,
    normalizeBulkDateInput,
    parseBulkDateToIso,
} from '../lib/bulkTableColumns';

export interface DateInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    /** Formato emitido: 'iso' (yyyy-mm-dd, default) o 'display' (dd/mm/yyyy). */
    outputFormat?: 'iso' | 'display';
}

function toDisplayValue(value: string, outputFormat: 'iso' | 'display'): string {
    if (!value?.trim()) return '';
    if (outputFormat === 'display') return formatBulkDate(value);
    return formatBulkDate(value);
}

function toOutputValue(display: string, outputFormat: 'iso' | 'display'): string {
    if (!display.trim()) return '';
    if (outputFormat === 'display') return normalizeBulkDateInput(display);
    return parseBulkDateToIso(display);
}

function clampToMin(iso: string, min?: string): string {
    if (!iso || !min) return iso;
    return iso < min ? min : iso;
}

export const DateInput: React.FC<DateInputProps> = ({
    value,
    onChange,
    outputFormat = 'iso',
    min,
    placeholder = 'dd/mm/aaaa',
    className,
    onBlur,
    ...rest
}) => {
    const [text, setText] = useState(() => toDisplayValue(value, outputFormat));

    useEffect(() => {
        setText(toDisplayValue(value, outputFormat));
    }, [value, outputFormat]);

    const commitValue = (raw: string) => {
        const normalized = normalizeBulkDateInput(raw);
        setText(normalized);
        let output = toOutputValue(normalized, outputFormat);
        if (outputFormat === 'iso') {
            output = clampToMin(output, typeof min === 'string' ? min : undefined);
            if (output && output !== toOutputValue(normalized, 'iso')) {
                setText(formatBulkDate(output));
            }
        }
        onChange(output);
    };

    return (
        <input
            {...rest}
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            value={text}
            className={className}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => {
                commitValue(e.target.value);
                onBlur?.(e);
            }}
        />
    );
};
