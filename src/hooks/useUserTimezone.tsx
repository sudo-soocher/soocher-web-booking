"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";

export type TimezoneSource = "geolocation" | "browser" | "default";

export interface UserTimezoneState {
    timezone: string;
    source: TimezoneSource;
    loading: boolean;
    permissionDenied: boolean;
    coords: { latitude: number; longitude: number } | null;
}

const FALLBACK_TZ = "Asia/Kolkata";
const STORAGE_KEY = "user_location_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredLocation {
    timezone: string;
    source: TimezoneSource;
    coords: { latitude: number; longitude: number } | null;
    at: number;
}

const readBrowserTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ;
    } catch {
        return FALLBACK_TZ;
    }
};

const readStorage = (): StoredLocation | null => {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredLocation;
        if (!parsed?.timezone) return null;
        if (Date.now() - (parsed.at || 0) > CACHE_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeStorage = (data: Omit<StoredLocation, "at">) => {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...data, at: Date.now() } satisfies StoredLocation)
        );
    } catch {
        // localStorage may be blocked; ignore.
    }
};

const DEFAULT_STATE: UserTimezoneState = {
    timezone: FALLBACK_TZ,
    source: "default",
    loading: true,
    permissionDenied: false,
    coords: null,
};

const UserTimezoneContext = createContext<UserTimezoneState>(DEFAULT_STATE);

export function UserTimezoneProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<UserTimezoneState>(DEFAULT_STATE);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const stored = readStorage();
        if (stored) {
            setState({
                timezone: stored.timezone,
                source: stored.source,
                loading: false,
                permissionDenied: false,
                coords: stored.coords,
            });
            // Any cached answer is good enough for the cache window. Previously
            // only a "geolocation" result short-circuited, so a visitor who had
            // denied location paid the full 8s geolocation timeout — plus an
            // external timeapi.io round trip — on every single launch.
            return;
        } else {
            setState({
                timezone: readBrowserTimezone(),
                source: "browser",
                loading: true,
                permissionDenied: false,
                coords: null,
            });
        }

        if (!navigator.geolocation) {
            setState((prev) => ({ ...prev, loading: false }));
            return;
        }

        let cancelled = false;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                if (cancelled) return;
                const { latitude, longitude } = position.coords;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 6000);
                    const res = await fetch(
                        `https://timeapi.io/api/TimeZone/coordinate?latitude=${latitude}&longitude=${longitude}`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);

                    if (!res.ok) throw new Error(`tz api ${res.status}`);
                    const data = (await res.json()) as { timeZone?: string };
                    if (cancelled) return;

                    if (data.timeZone) {
                        const next: UserTimezoneState = {
                            timezone: data.timeZone,
                            source: "geolocation",
                            loading: false,
                            permissionDenied: false,
                            coords: { latitude, longitude },
                        };
                        writeStorage({
                            timezone: next.timezone,
                            source: next.source,
                            coords: next.coords,
                        });
                        setState(next);
                    } else {
                        setState((prev) => ({ ...prev, loading: false }));
                    }
                } catch (err) {
                    console.warn("Timezone coordinate lookup failed:", err);
                    if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
                }
            },
            (err) => {
                if (cancelled) return;
                console.info("Geolocation unavailable:", err.message);
                const denied = err.code === err.PERMISSION_DENIED;
                const browserTz = readBrowserTimezone();
                writeStorage({
                    timezone: browserTz,
                    source: "browser",
                    coords: null,
                });
                setState({
                    timezone: browserTz,
                    source: "browser",
                    loading: false,
                    permissionDenied: denied,
                    coords: null,
                });
            },
            { timeout: 8000, maximumAge: CACHE_TTL_MS }
        );

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <UserTimezoneContext.Provider value={state}>
            {children}
        </UserTimezoneContext.Provider>
    );
}

export function useUserTimezone(): UserTimezoneState {
    return useContext(UserTimezoneContext);
}
