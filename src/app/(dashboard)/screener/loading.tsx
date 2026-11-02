import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <PageSkeleton title="Screener" stats={false} cards={1} />;
}
