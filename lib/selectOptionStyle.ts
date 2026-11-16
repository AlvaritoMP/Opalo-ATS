import { CustomColumn, SelectOptionStyle } from '../types';

export function compactSelectOptionStyle(style?: SelectOptionStyle | null): SelectOptionStyle | undefined {
    if (!style) return undefined;
    const out: SelectOptionStyle = {};
    const bg = style.bgColor?.trim();
    const text = style.textColor?.trim();
    if (bg) out.bgColor = bg;
    if (text) out.textColor = text;
    if (style.bold) out.bold = true;
    if (style.italic) out.italic = true;
    if (style.underline) out.underline = true;
    return Object.keys(out).length > 0 ? out : undefined;
}

export function findSelectOptionStyle(
    column: Pick<CustomColumn, 'optionStyles'> | undefined,
    value: unknown
): SelectOptionStyle | undefined {
    const styles = column?.optionStyles;
    if (!styles) return undefined;
    const raw = String(value ?? '').trim();
    if (!raw) return undefined;
    if (styles[raw]) return compactSelectOptionStyle(styles[raw]);
    const key = Object.keys(styles).find(k => k.toLowerCase() === raw.toLowerCase());
    return key ? compactSelectOptionStyle(styles[key]) : undefined;
}

export type SelectOptionCss = {
    backgroundColor?: string;
    color?: string;
    fontWeight?: number;
    fontStyle?: 'italic' | 'normal';
    textDecoration?: 'underline';
};

export function selectOptionCss(
    column: Pick<CustomColumn, 'optionStyles'> | undefined,
    value: unknown
): SelectOptionCss {
    const style = findSelectOptionStyle(column, value);
    if (!style) return {};
    const css: SelectOptionCss = {};
    if (style.bgColor) css.backgroundColor = style.bgColor;
    if (style.textColor) css.color = style.textColor;
    if (style.bold) css.fontWeight = 700;
    if (style.italic) css.fontStyle = 'italic';
    if (style.underline) css.textDecoration = 'underline';
    return css;
}

export const SELECT_TEXT_COLOR_PRESETS: { id: string; label: string; value: string }[] = [
    { id: 'auto', label: 'Automático', value: '' },
    { id: 'dark', label: 'Negro', value: '#111827' },
    { id: 'white', label: 'Blanco', value: '#FFFFFF' },
    { id: 'red', label: 'Rojo', value: '#B91C1C' },
    { id: 'green', label: 'Verde', value: '#166534' },
    { id: 'blue', label: 'Azul', value: '#1D4ED8' },
    { id: 'orange', label: 'Naranja', value: '#C2410C' },
];
