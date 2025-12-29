"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function ToggleDemoModePage() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Get current demo mode status from localStorage
    const demoMode = localStorage.getItem("isDemoMode") === "true"
    setIsDemoMode(demoMode)
  }, [])

  const handleToggleDemoMode = () => {
    const newDemoMode = !isDemoMode
    // Update localStorage
    localStorage.setItem("isDemoMode", newDemoMode.toString())
    setIsDemoMode(newDemoMode)
  }

  return (
    <div className="container py-6 max-w-md">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demo Mode Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="demo-mode" className="text-base">
                Demo Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                {isDemoMode
                  ? "Currently using demo data. Toggle off to use real data."
                  : "Currently using real data. Toggle on to use demo data."}
              </p>
            </div>
            <Switch id="demo-mode" checked={isDemoMode} onCheckedChange={handleToggleDemoMode} />
          </div>

          <div className="mt-6">
            <p className="text-sm">
              <strong>Note:</strong>{" "}
              {isDemoMode
                ? "Demo mode is currently ON. The system will generate mock data instead of using real data from the database."
                : "Demo mode is currently OFF. The system will use real data from the database."}
            </p>

            <Button className="mt-4 w-full" onClick={() => router.push("/teacher/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
