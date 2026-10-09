import React from 'react';

export const AssessmentCheckCell: React.FC<{ checked: boolean }> = ({ checked }) => (
    <input
        type="checkbox"
        checked={checked}
        onChange={() => undefined}
        onClick={(event) => event.preventDefault()}
        className="w-4 h-4 accent-teal-700 cursor-default"
        title={checked ? 'Prueba enviada' : 'Todavía no envía esta prueba'}
        aria-label={checked ? 'Prueba enviada' : 'Prueba pendiente'}
    />
);
