import type {WeekDay} from '@/entities/group';
import type {Holiday} from '@/shared/api';

const DAY_NUM: Record<WeekDay, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

function toLocalIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Calculate the subscription period end date.
 *
 * Walks forward from `periodStart`, counting class days that fall on the
 * group's `weekDays` and are not holidays. Schedules
 * `classesTotal + illnesses` slots total (illnesses = makeup classes).
 *
 * @returns ISO date string (YYYY-MM-DD) of the last scheduled class, or
 *          `null` when inputs are insufficient to produce a result.
 */
export function calcPeriodEnd(
    periodStart: string,
    weekDays: WeekDay[],
    classesTotal: number,
    illnesses: number,
    holidays: Holiday[],
): string | null {
    if (!periodStart || weekDays.length === 0 || classesTotal <= 0) return null;

    const totalSlots = classesTotal + Math.max(0, illnesses);
    const classDayNums = new Set(weekDays.map(d => DAY_NUM[d]));
    const holidaySet = new Set(
        holidays.map(h => h.date).filter((d): d is string => Boolean(d)),
    );

    const cursor = new Date(`${periodStart}T00:00:00`);
    if (isNaN(cursor.getTime())) return null;

    let counted = 0;
    const MAX_DAYS = 1825; // ~5 years safety limit

    for (let i = 0; i < MAX_DAYS; i++) {
        const iso = toLocalIso(cursor);
        if (classDayNums.has(cursor.getDay()) && !holidaySet.has(iso)) {
            counted++;
            if (counted === totalSlots) return iso;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return null;
}
