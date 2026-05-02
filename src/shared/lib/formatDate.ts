export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const datePart = iso.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
}
