import { AppShimmer } from "@/components/loading/AppShimmer";

// The doctor detail page leads with a large avatar + bio block, which the
// profile variant mirrors more closely than the card-grid variant.
export default function Loading() {
  return <AppShimmer variant="profile" />;
}
