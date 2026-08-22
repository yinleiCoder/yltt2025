import { Skeleton } from "@/components/ui/skeleton";

export function CommentsSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="正在加载评论"
      className="mt-16 border-t border-[#d9d9d4] pt-8"
    >
      <Skeleton className="h-7 w-28" />
      <div className="mt-6 divide-y divide-[#d9d9d4] border-y border-[#d9d9d4]">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="py-4" key={index}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-16 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
