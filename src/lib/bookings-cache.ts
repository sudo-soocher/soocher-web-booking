import type { Consultation } from "@/types/consultation";

// Memory-only cache: makes client-side revisits instant without persisting
// consultation or medical data in browser storage.
const bookingsByUser = new Map<string, Consultation[]>();

export function getCachedBookings(userId: string): Consultation[] | null {
  return bookingsByUser.get(userId) ?? null;
}

export function setCachedBookings(userId: string, bookings: Consultation[]): void {
  bookingsByUser.set(userId, bookings);
}

export function clearCachedBookings(userId?: string): void {
  if (userId) bookingsByUser.delete(userId);
  else bookingsByUser.clear();
}
