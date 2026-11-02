import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <PageSkeleton title="Brokerage accounts" stats={false} cards={3} />;
}
