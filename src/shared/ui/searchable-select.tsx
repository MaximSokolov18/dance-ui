import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

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
    const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedLabel = options.find(o => o.value === value)?.label ?? '';
    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()),
    );

    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (
                containerRef.current && !containerRef.current.contains(e.target as Node) &&
                (!dropdownRef.current || !dropdownRef.current.contains(e.target as Node))
            ) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        if (!open) {
            setOpen(true);
            setDropdownRect(inputRef.current?.getBoundingClientRect() ?? null);
        }
        if (e.target.value === '') onChange('');
    };

    const handleFocus = () => {
        setOpen(true);
        setQuery('');
        setDropdownRect(inputRef.current?.getBoundingClientRect() ?? null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setOpen(false);
            setQuery('');
        }
    };

    useEffect(() => {
        if (!open) return;
        const vv = window.visualViewport;
        if (!vv) return;
        // Use rAF to defer measurement until after React has committed the dialog's
        // new position (e.g. bottom offset from useMobileKeyboardOffset), otherwise
        // getBoundingClientRect fires before the dialog jumps and the dropdown ends
        // up anchored to the stale pre-jump coordinates.
        const sync = () => {
            requestAnimationFrame(() => {
                setDropdownRect(inputRef.current?.getBoundingClientRect() ?? null);
            });
        };
        vv.addEventListener('resize', sync);
        vv.addEventListener('scroll', sync);
        return () => {
            vv.removeEventListener('resize', sync);
            vv.removeEventListener('scroll', sync);
        };
    }, [open]);

    const handleSelect = (option: Option) => {
        onChange(option.value);
        setQuery('');
        setOpen(false);
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
                aria-controls={open ? 'searchable-select-dropdown' : undefined}
                aria-autocomplete="list"
                value={open ? query : selectedLabel}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={open ? 'Search…' : placeholder}
                className={inputClass}
                autoComplete="off"
            />
            {open && dropdownRect && createPortal(
                <div
                    ref={dropdownRef}
                    id="searchable-select-dropdown"
                    role="listbox"
                    style={{
                        position: 'fixed',
                        top: dropdownRect.bottom + 4,
                        left: dropdownRect.left,
                        width: dropdownRect.width,
                        zIndex: 9999,
                    }}
                    className="max-h-48 overflow-y-auto rounded-md border border-border bg-secondary shadow-lg"
                >
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
                    ) : (
                        filtered.map(option => (
                            <div
                                key={option.value}
                                role="option"
                                aria-selected={option.value === value}
                                onPointerDown={e => {
                                    e.preventDefault();
                                    handleSelect(option);
                                }}
                                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                                {option.label}
                            </div>
                        ))
                    )}
                </div>,
                document.body,
            )}
        </div>
    );
}
