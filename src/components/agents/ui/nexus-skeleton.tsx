import { clsx } from "clsx";

interface Props {
  className?: string;
  count?: number;
}

export function NexusSkeleton({ className, count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={clsx("nexus-skeleton", className)} />
      ))}
    </>
  );
}

export function NexusCardSkeleton() {
  return (
    <div className="nexus-card p-4 space-y-3">
      <div className="nexus-skeleton h-4 w-24" />
      <div className="nexus-skeleton h-8 w-16" />
      <div className="nexus-skeleton h-3 w-32" />
    </div>
  );
}
