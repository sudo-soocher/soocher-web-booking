import { ProfileShimmer } from "@/components/loading/ProfileShimmer";

// Shown on the first frame after the Profile tab is tapped. Same markup as the
// page's own loading state, so the placeholder never changes shape.
export default function Loading() {
  return <ProfileShimmer />;
}
