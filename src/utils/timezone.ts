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
 * Returns the offset (ms) of a given IANA timezone at a given instant.
 * Positive when the zone is ahead of UTC (e.g. Asia/Dubai → +4h).
 */
const getTimezoneOffsetMs = (timezone: string, at: Date): number => {
    const tzString = at.toLocaleString("en-US", { timeZone: timezone });
    const utcString = at.toLocaleString("en-US", { timeZone: "UTC" });
    return new Date(tzString).getTime() - new Date(utcString).getTime();
};

/**
 * Parses a time string (e.g., "09:00AM") and a day key (e.g., "Mon")
 * as a wall-clock time in the given IANA timezone and returns the corresponding
 * UTC epoch. Defaults to Asia/Kolkata when no timezone is supplied.
 */
export const parseTimeToEpoch = (
    dayKey: string,
    timeStr: string,
    timezone: string = "Asia/Kolkata"
): number => {
    try {
        const [time, period] = timeStr.split(/(?=[AP]M)/);
        const [rawHours, minutes] = time.split(":").map(Number);
        let hours = rawHours;

        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;

        const now = new Date();
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const currentDayIndex = now.getDay();
        const selectedDayIndex = days.indexOf(dayKey);

        const daysToAdd = (selectedDayIndex - currentDayIndex + 7) % 7;
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysToAdd);

        // Treat (year, month, day, hours, minutes) as a wall-clock time in the
        // doctor's timezone, then subtract that zone's offset to get UTC epoch.
        const naive = Date.UTC(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            hours,
            minutes
        );
        const offset = getTimezoneOffsetMs(timezone, new Date(naive));
        return naive - offset;
    } catch (e) {
        console.error("Error parsing time:", e);
        return 0;
    }
};

/**
 * Back-compat alias — same as parseTimeToEpoch defaulting to Asia/Kolkata.
 */
export const parseISTTimeToEpoch = (dayKey: string, timeStr: string): number =>
    parseTimeToEpoch(dayKey, timeStr, "Asia/Kolkata");

/**
 * Formats a timestamp into a time range string, in the supplied timezone
 * (defaults to the active timezone if none is given).
 */
export const formatTimeRange = (
    startEpoch: number,
    durationMinutes: number,
    timezone?: string
): string => {
    const endEpoch = startEpoch + durationMinutes * 60000;
    return `${formatDisplayTime(startEpoch, timezone)} - ${formatDisplayTime(endEpoch, timezone)}`;
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
        // Try getting official timezone string from Intl
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZoneName: "long",
            timeZone: tz,
        }).formatToParts(new Date());
        
        let officialName = parts.find((p) => p.type === "timeZoneName")?.value;

        // If a valid official name was found and it's not a generic GMT offset, use it.
        if (officialName && !officialName.startsWith("GMT") && !officialName.startsWith("UTC")) {
            return officialName;
        }

        // If it's a generic IANA string fallback to city extraction
        if (tz && tz.includes("/")) {
            const cityNameRaw = tz.split("/").pop() || "";
            if (cityNameRaw) {
                const cityName = cityNameRaw.replace(/_/g, " ");
                return `${cityName} Standard Time`;
            }
        }

        return officialName || tz;

    } catch (e) {
        // Fallback for weird string errors
        if (tz && tz.includes("/")) {
            const cityName = tz.split("/").pop()?.replace(/_/g, " ");
            return `${cityName} Standard Time`;
        }
        return tz;
    }
};
