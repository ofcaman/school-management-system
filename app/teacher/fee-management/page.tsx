"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import FeeManagement from "@/components/fee-management"

export default function FeeManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  if (!teacherId) {
    router.push("/teacher/login")
    return null
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Monthly Fee Management</h1>
      </div>

      <div className="space-y-6">
        <FeeManagement
          onFeesUpdated={() => {
            console.log("Fees updated successfully")
          }}
        />
      </div>
    </div>
  )
}
