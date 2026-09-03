import { Skeleton } from "@/components/ui/skeleton";

export function AdminPageSkeleton({ editor = false }: { editor?: boolean }) {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full container px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-40" />
      {editor ? (
        <div className="mt-8 grid max-w-3xl gap-5">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton className={index === 4 ? "h-80 w-full" : "h-10 w-full"} key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid border-b sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="border p-6" key={index}>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-3 h-9 w-16" />
              </div>
            ))}
          </div>
          <div className="mt-8 overflow-x-auto border">
            <div className="min-w-[46rem] p-4">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton className="mb-3 h-10 w-full" key={index} />
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
