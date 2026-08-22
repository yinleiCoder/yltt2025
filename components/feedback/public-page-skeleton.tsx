import { Skeleton } from "@/components/ui/skeleton";

export function PublicPageSkeleton() {
  return (
    <main
      aria-busy="true"
      className="min-h-dvh bg-[rgb(233,233,233)] px-5 py-12 sm:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-6 h-16 max-w-2xl" />
        <Skeleton className="mt-4 h-5 max-w-xl" />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="border border-[#d9d9d4] p-3" key={index}>
              <Skeleton className="aspect-[3/2] w-full" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-3 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
