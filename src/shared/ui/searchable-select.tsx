import {Check, ChevronDown, X} from 'lucide-react';
import {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
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

const POPUP_GAP = 4;
const POPUP_MAX_HEIGHT = 240;
const POPUP_MIN_SPACE = 160;
const POPUP_VIEWPORT_PADDING = 8;

interface PopupPosition {
    left: number;
    top: number;
    width: number;
    maxHeight: number;
    placement: 'below' | 'above';
    strategy: 'fixed' | 'absolute';
    container: HTMLElement;
}

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
    const [position, setPosition] = useState<PopupPosition | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

    const reactId = useId();
    const dropdownId = `searchable-select-dropdown-${reactId.replace(/:/g, '')}`;

    const selectedLabel = options.find(o => o.value === value)?.label ?? '';
    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()),
    );

    const recomputePosition = useCallback(() => {
        const input = inputRef.current;
        if (!input) return;
        const rect = input.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom - POPUP_VIEWPORT_PADDING;
        const spaceAbove = rect.top - POPUP_VIEWPORT_PADDING;

        const placeBelow = spaceBelow >= POPUP_MIN_SPACE || spaceBelow >= spaceAbove;
        const available = placeBelow ? spaceBelow : spaceAbove;
        const maxHeight = Math.max(120, Math.min(POPUP_MAX_HEIGHT, available - POPUP_GAP));

        // Portal into the nearest Radix Dialog so react-remove-scroll permits
        // touch scrolling inside the popup. Outside a dialog, use document.body.
        const dialog = input.closest('[role="dialog"]') as HTMLElement | null;
        const container: HTMLElement = dialog ?? document.body;
        const strategy: 'fixed' | 'absolute' = dialog ? 'absolute' : 'fixed';
        const originRect = dialog ? dialog.getBoundingClientRect() : null;
        const offsetLeft = originRect ? originRect.left : 0;
        const offsetTop = originRect ? originRect.top : 0;
        // When using `absolute` inside a scrolled container, account for its scroll
        // so the popup stays anchored to the input.
        const scrollLeft = dialog ? dialog.scrollLeft : 0;
        const scrollTop = dialog ? dialog.scrollTop : 0;

        const topViewport = placeBelow
            ? rect.bottom + POPUP_GAP
            : rect.top - POPUP_GAP - maxHeight;

        setPosition({
            left: rect.left - offsetLeft + scrollLeft,
            top: topViewport - offsetTop + scrollTop,
            width: rect.width,
            maxHeight,
            placement: placeBelow ? 'below' : 'above',
            strategy,
            container,
        });
    }, []);

    // Close when the user taps outside both the trigger and the portaled popup.
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            const inTrigger = containerRef.current?.contains(target) ?? false;
            const inPopup = popupRef.current?.contains(target) ?? false;
            if (!inTrigger && !inPopup) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    // Position the popup once it opens, then keep it in sync with scroll/resize.
    useLayoutEffect(() => {
        if (!open) return;
        recomputePosition();
        const onScroll = () => recomputePosition();
        const onResize = () => recomputePosition();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        window.visualViewport?.addEventListener('resize', onResize);
        window.visualViewport?.addEventListener('scroll', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
            window.visualViewport?.removeEventListener('resize', onResize);
            window.visualViewport?.removeEventListener('scroll', onScroll);
        };
    }, [open, recomputePosition]);

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

            {open && position && createPortal(
                <div
                    ref={popupRef}
                    id={dropdownId}
                    role="listbox"
                    style={{
                        position: position.strategy,
                        left: position.left,
                        top: position.top,
                        width: position.width,
                        maxHeight: position.maxHeight,
                        overscrollBehavior: 'contain',
                        touchAction: 'pan-y',
                    }}
                    className="z-[60] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
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
                                    onMouseMove={() => setHighlightedIndex(index)}
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
                </div>,
                position.container,
            )}
        </div>
    );
}
