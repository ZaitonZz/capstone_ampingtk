export const CLINIC_TIME_ZONE = 'Asia/Manila';

type DateTimeFormatOptions = Intl.DateTimeFormatOptions;

const dateTimeFormatOptions: DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: CLINIC_TIME_ZONE,
};

const dateFormatOptions: DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeZone: CLINIC_TIME_ZONE,
};

const timeFormatOptions: DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: CLINIC_TIME_ZONE,
};

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatInClinicTime(
    value: string | null | undefined,
    options: DateTimeFormatOptions,
): string {
    const date = parseDate(value);

    if (!date) return '';

    return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function formatClinicDateTime(value: string | null | undefined): string {
    return formatInClinicTime(value, dateTimeFormatOptions);
}

export function formatClinicDate(value: string | null | undefined): string {
    return formatInClinicTime(value, dateFormatOptions);
}

export function formatClinicTime(value: string | null | undefined): string {
    return formatInClinicTime(value, timeFormatOptions);
}

export function getClinicDateKey(
    value: string | Date | null | undefined,
): string {
    const date = value instanceof Date ? value : parseDate(value);

    if (!date) return '';

    const parts = new Intl.DateTimeFormat('en-CA', {
        day: '2-digit',
        month: '2-digit',
        timeZone: CLINIC_TIME_ZONE,
        year: 'numeric',
    }).formatToParts(date);

    const lookup = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
    );

    return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function isClinicToday(value: string | null | undefined): boolean {
    const dateKey = getClinicDateKey(value);

    return dateKey !== '' && dateKey === getClinicDateKey(new Date());
}

export function toClinicDatetimeLocal(
    value: string | null | undefined,
): string {
    const date = parseDate(value);

    if (!date) return '';

    const parts = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
        minute: '2-digit',
        month: '2-digit',
        timeZone: CLINIC_TIME_ZONE,
        year: 'numeric',
    }).formatToParts(date);

    const lookup = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
    );

    return `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}`;
}
