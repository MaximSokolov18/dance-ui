import {useEffect, useId, useRef, useState} from 'react';
import {Check, ChevronDown, X} from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    id?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
}

const inputClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function SearchableSelect({
    id,
    options,
    value,
    onChange,
    placeholder = 'Select…',
    required,
}: SearchableSelectProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

    const reactId = useId();
    const dropdownId = `searchable-select-dropdown-${reactId.replace(/:/g, '')}`;

    const selectedLabel = options.find(o => o.value === value)?.label ?? '';
    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()),
    );

    // Close when the user taps outside the whole select (input + listbox).
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    // After opening, nudge the input into view so both it and the listbox below
    // are visible inside the dialog's scroll area.
    useEffect(() => {
        if (!open) return;
        const raf = requestAnimationFrame(() => {
            listboxRef.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
        });
        return () => cancelAnimationFrame(raf);
    }, [open]);

    // Keep keyboard-highlighted option visible within the listbox.
    useEffect(() => {
        if (!open) return;
        optionRefs.current[highlightedIndex]?.scrollIntoView({block: 'nearest'});
    }, [highlightedIndex, open]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setHighlightedIndex(0);
        if (!open) setOpen(true);
        if (e.target.value === '') onChange('');
    };

    const handleFocus = () => {
        setOpen(true);
        setQuery('');
        const idx = options.findIndex(o => o.value === value);
        setHighlightedIndex(idx >= 0 ? idx : 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(i => (i + 1) % filtered.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(i => (i - 1 + filtered.length) % filtered.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
                    handleSelect(filtered[highlightedIndex]);
                }
                break;
            case 'Escape':
                setOpen(false);
                setQuery('');
                break;
        }
    };

    const handleSelect = (option: Option) => {
        onChange(option.value);
        setQuery('');
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
    };

    return (
        <div ref={containerRef} className="relative">
            {required && (
                <input
                    type="text"
                    value={value}
                    required
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1}}
                />
            )}
            <input
                ref={inputRef}
                id={id}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={open ? dropdownId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={
                    open && highlightedIndex >= 0 && highlightedIndex < filtered.length
                        ? `${dropdownId}-opt-${highlightedIndex}`
                        : undefined
                }
                value={open ? query : selectedLabel}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={open ? 'Search…' : placeholder}
                className={`${inputClass} pr-16`}
                autoComplete="off"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
                {!open && value && (
                    <button
                        type="button"
                        aria-label="Clear selection"
                        tabIndex={-1}
                        onPointerDown={e => {
                            e.preventDefault();
                            handleClear(e as unknown as React.MouseEvent);
                        }}
                        className="pointer-events-auto rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
                <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </div>

            {open && (
                <div
                    ref={listboxRef}
                    id={dropdownId}
                    role="listbox"
                    className="mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
                >
                    {filtered.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-muted-foreground">No results</div>
                    ) : (
                        filtered.map((option, index) => {
                            const isSelected = option.value === value;
                            const isHighlighted = index === highlightedIndex;
                            return (
                                <div
                                    key={option.value}
                                    id={`${dropdownId}-opt-${index}`}
                                    ref={el => { optionRefs.current[index] = el; }}
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => handleSelect(option)}
                                    onPointerMove={() => setHighlightedIndex(index)}
                                    className={`flex cursor-pointer items-center gap-2 px-3 py-3 text-sm ${
                                        isHighlighted
                                            ? 'bg-accent text-accent-foreground'
                                            : 'hover:bg-accent hover:text-accent-foreground'
                                    }`}
                                >
                                    <Check
                                        className={`pointer-events-none h-4 w-4 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    {option.label}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
