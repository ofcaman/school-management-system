import { Loader2 } from "lucide-react"

export default function UpdateBillLoading() {
  return (
    <div className="container flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}
