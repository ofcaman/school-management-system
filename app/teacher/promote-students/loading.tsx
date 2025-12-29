import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Skeleton className="h-10 w-24 mr-4" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      <Skeleton className="h-10 w-48 mb-6" />

      <Skeleton className="h-[500px] w-full mb-6" />
      <Skeleton className="h-32 w-full mb-6" />
    </div>
  )
}
