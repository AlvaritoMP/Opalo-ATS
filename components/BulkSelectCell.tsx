import React from 'react';
import { CustomColumn } from '../types';
import { formatCustomCellDisplay } from '../lib/bulkTableColumns';
import { selectOptionCss } from '../lib/selectOptionStyle';

interface DisplayProps {
    column: CustomColumn;
    value: unknown;
    onDoubleClick: (e: React.MouseEvent) => void;
    className?: string;
    title?: string;
}

export const BulkSelectDisplay: React.FC<DisplayProps> = ({
    column,
    value,
    onDoubleClick,
    className = '',
    title = 'Doble clic para editar',
}) => {
    const text = formatCustomCellDisplay(value, column);
    const css = selectOptionCss(column, value);
    const styled = text !== '-' && Object.keys(css).length > 0;
    return (
        <span
            className={
                styled
                    ? `bulk-cell-text inline-block max-w-full truncate px-1.5 py-0.5 rounded cursor-pointer ${className}`
                    : `bulk-cell-text text-gray-700 hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer inline-block max-w-full truncate ${className}`
            }
            style={styled ? css : undefined}
            onDoubleClick={onDoubleClick}
            title={title}
        >
            {text}
        </span>
    );
};

interface EditorProps {
    column: CustomColumn;
    initialValue: string;
    onChange: (value: string) => void;
}

export const BulkSelectEditor: React.FC<EditorProps> = ({ column, initialValue, onChange }) => (
    <select
        defaultValue={initialValue}
        autoFocus
        onChange={e => onChange(e.target.value)}
        style={selectOptionCss(column, initialValue)}
        className="w-full px-2 py-1 text-xs border border-primary-500 rounded focus:ring-1 focus:ring-primary-500"
        onClick={e => e.stopPropagation()}
    >
        <option value="">-</option>
        {(column.options || []).map(opt => (
            <option key={opt} value={opt} style={selectOptionCss(column, opt)}>
                {opt}
            </option>
        ))}
    </select>
);
