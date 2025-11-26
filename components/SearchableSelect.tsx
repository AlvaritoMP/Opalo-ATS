import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

interface SearchableSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    label?: string;
    searchPlaceholder?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    disabled = false,
    className = '',
    label,
    searchPlaceholder = 'Buscar...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionsListRef = useRef<HTMLDivElement>(null);

    // Filtrar opciones basado en el término de búsqueda
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Obtener el valor mostrado
    const displayValue = value || placeholder;

    // Cerrar el dropdown cuando se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Enfocar el input de búsqueda cuando se abre
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 0);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Manejar teclas del teclado
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setHighlightedIndex(prev => 
                        prev < filteredOptions.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                        onChange(filteredOptions[highlightedIndex]);
                        setIsOpen(false);
                        setSearchTerm('');
                        setHighlightedIndex(-1);
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    setIsOpen(false);
                    setSearchTerm('');
                    setHighlightedIndex(-1);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredOptions, highlightedIndex, onChange]);

    // Scroll a la opción resaltada
    useEffect(() => {
        if (highlightedIndex >= 0 && optionsListRef.current) {
            const highlightedElement = optionsListRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [highlightedIndex]);

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
    };

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                setSearchTerm('');
            }
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div
                onClick={handleToggle}
                className={`
                    mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm
                    cursor-pointer flex items-center justify-between
                    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:border-gray-400'}
                    ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : ''}
                `}
            >
                <span className={`flex-1 truncate ${value ? 'text-gray-900' : 'text-gray-500'}`}>
                    {displayValue}
                </span>
                <div className="flex items-center space-x-1 ml-2">
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded hover:bg-gray-200 flex-shrink-0"
                            title="Limpiar"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                    />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setHighlightedIndex(-1);
                                }}
                                placeholder={searchPlaceholder}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div
                        ref={optionsListRef}
                        className="overflow-y-auto max-h-48"
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={option}
                                    onClick={() => handleSelect(option)}
                                    className={`
                                        px-3 py-2 cursor-pointer hover:bg-primary-50
                                        ${value === option ? 'bg-primary-100 font-medium' : ''}
                                        ${index === highlightedIndex ? 'bg-primary-100' : ''}
                                    `}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    {option}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-gray-500 text-sm text-center">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                    {filteredOptions.length > 0 && (
                        <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
                            {filteredOptions.length} {filteredOptions.length === 1 ? 'resultado' : 'resultados'}
                            {searchTerm && ` para "${searchTerm}"`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

