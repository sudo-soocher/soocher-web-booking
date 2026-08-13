import { BookingsShimmer } from "@/components/loading/BookingsShimmer";

// Shown on the first frame after the Bookings tab is tapped. Same markup as the
// page's own loading state, so the placeholder never changes shape.
export default function Loading() {
  return <BookingsShimmer />;
}
