"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { ArrowLeft } from 'lucide-react'
import { toast } from "@/components/ui/use-toast"

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
    
    toast({
      title: `Demo Mode ${newDemoMode ? "Enabled" : "Disabled"}`,
      description: newDemoMode 
        ? "The system will now use demo data instead of real data." 
        : "The system will now use real data from the database.",
      duration: 3000,
    })
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

          <div className="mt-6 space-y-4">
            <div className={`p-4 rounded-md ${isDemoMode ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"}`}>
              <p className="font-medium mb-1">
                {isDemoMode ? "⚠️ Demo Mode Active" : "✅ Using Real Data"}
              </p>
              <p className="text-sm">
                {isDemoMode
                  ? "The system is generating mock data instead of using real data from the database. This is useful for testing and demonstrations."
                  : "The system is using real data from the database. All actions will affect real data."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.push("/teacher/dashboard")}
              >
                Go to Dashboard
              </Button>
              
              <Button 
                onClick={() => {
                  handleToggleDemoMode();
                  setTimeout(() => router.push("/teacher/dashboard"), 500);
                }}
              >
                {isDemoMode ? "Switch to Real Data" : "Switch to Demo Mode"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}