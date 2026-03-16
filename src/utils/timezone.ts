/**
 * Timezone utilities for Soocher
 */

/**
 * Gets the active timezone for the application.
 * prioritizes NEXT_PUBLIC_DEFAULT_TIMEZONE or NEXT_PUBLIC_DEFUALT_TIMEZONE (for testing),
 * then falls back to browser timezone, and finally Asia/Kolkata.
 */
export const getActiveTimezone = (): string => {
    if (typeof window === "undefined") {
        // Server-side
        return (
            process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ||
            process.env.NEXT_PUBLIC_DEFUALT_TIMEZONE ||
            process.env.DEFUALT_TIMEZONE ||
            "Asia/Kolkata"
        );
    }

    // Client-side
    return (
        process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ||
        process.env.NEXT_PUBLIC_DEFUALT_TIMEZONE ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "Asia/Kolkata"
    );
};

/**
 * Parses a time string (e.g., "09:00AM") and a day key (e.g., "Mon")
 * assuming it is in Asia/Kolkata (IST) and returns a UTC epoch.
 */
export const parseISTTimeToEpoch = (dayKey: string, timeStr: string): number => {
    try {
        const [time, period] = timeStr.split(/(?=[AP]M)/);
        let [hours, minutes] = time.split(":").map(Number);

        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;

        const now = new Date();
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const currentDayIndex = now.getDay();
        const selectedDayIndex = days.indexOf(dayKey);

        const daysToAdd = (selectedDayIndex - currentDayIndex + 7) % 7;
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysToAdd);

        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const h = String(hours).padStart(2, '0');
        const m = String(minutes).padStart(2, '0');

        // IST is fixed at +05:30
        const isoString = `${year}-${month}-${day}T${h}:${m}:00+05:30`;
        return new Date(isoString).getTime();
    } catch (e) {
        console.error("Error parsing IST time:", e);
        return 0;
    }
};

/**
 * Formats a timestamp into a time range string in the active timezone.
 */
export const formatTimeRange = (startEpoch: number, durationMinutes: number): string => {
    const endEpoch = startEpoch + durationMinutes * 60000;
    return `${formatDisplayTime(startEpoch)} - ${formatDisplayTime(endEpoch)}`;
};

/**
 * Formats a timestamp into a date string respect to the active timezone.
 */
export const formatDateStr = (timestamp: number, timezone?: string): string => {
    const tz = timezone || getActiveTimezone();
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: tz,
    })
        .formatToParts(new Date(timestamp))
        .filter((p) => p.type !== "literal")
        .map((p) => p.value)
        .join("/"); // Returns DD/MM/YYYY
};

/**
 * Formats a timestamp into a time string respect to the active timezone.
 */
export const formatTimeStr = (timestamp: number, timezone?: string): string => {
    const tz = timezone || getActiveTimezone();
    const parts = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: tz,
    }).formatToParts(new Date(timestamp));

    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    const dayPeriodRaw =
        parts.find((p) => p.type === "dayPeriod")?.value ||
        (new Date(timestamp).getHours() >= 12 ? "PM" : "AM");
    const dayPeriod = dayPeriodRaw.toUpperCase().replace(/\./g, "");

    return `${hour}:${minute} ${dayPeriod}`;
};

/**
 * Gets a localized date/time string for display.
 */
export const formatDisplayDateTime = (
    timestamp: number,
    timezone?: string
): string => {
    const tz = timezone || getActiveTimezone();
    return new Date(timestamp).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: tz,
    });
};

/**
 * Gets only the date for display.
 */
export const formatDisplayDate = (
    timestamp: number,
    timezone?: string
): string => {
    const tz = timezone || getActiveTimezone();
    return new Date(timestamp).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: tz,
    });
};

/**
 * Gets only the time for display.
 */
export const formatDisplayTime = (
    timestamp: number,
    timezone?: string
): string => {
    const tz = timezone || getActiveTimezone();
    return new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: tz,
    });
};

/**
 * Gets the human-readable name of the timezone.
 */
export const getTimezoneName = (timezone?: string): string => {
    const tz = timezone || getActiveTimezone();
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZoneName: "long",
            timeZone: tz,
        }).formatToParts(new Date());
        return parts.find((p) => p.type === "timeZoneName")?.value || tz;
    } catch (e) {
        return tz;
    }
};
