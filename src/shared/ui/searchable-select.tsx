import {useEffect, useRef, useState} from 'react';

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
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedLabel = options.find(o => o.value === value)?.label ?? '';
    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()),
    );

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        if (!open) setOpen(true);
        if (e.target.value === '') onChange('');
    };

    const handleFocus = () => {
        setOpen(true);
        setQuery('');
    };

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
                id={id}
                type="text"
                value={open ? query : selectedLabel}
                onChange={handleInputChange}
                onFocus={handleFocus}
                placeholder={open ? 'Search…' : placeholder}
                className={inputClass}
                autoComplete="off"
            />
            {open && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-input bg-background shadow-md">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
                    ) : (
                        filtered.map(option => (
                            <div
                                key={option.value}
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
                </div>
            )}
        </div>
    );
}
