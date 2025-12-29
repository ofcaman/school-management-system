"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { initializeApp } from "firebase/app"
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { AlertCircle, Loader2, Save, SettingsIcon } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface SystemSettings {
  maintenanceMode: boolean
  maintenanceMessage: string
  allowTeacherLogin: boolean
  allowStudentLogin: boolean
  schoolName: string
  schoolAddress: string
  schoolPhone: string
  schoolEmail: string
  schoolWebsite: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    maintenanceMessage: "System is under maintenance. Please try again later.",
    allowTeacherLogin: true,
    allowStudentLogin: true,
    schoolName: "Sajha Boarding School",
    schoolAddress: "Kathmandu, Nepal",
    schoolPhone: "01-1234567",
    schoolEmail: "info@sajhaschool.edu.np",
    schoolWebsite: "www.sajhaschool.edu.np",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    fetchSettings()
  }, [teacherId, router])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use default settings in demo mode
        setTimeout(() => {
          setLoading(false)
        }, 1000)
      } else {
        // Fetch settings from Firestore
        const settingsDoc = await getDoc(doc(db, "settings", "system"))
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as SystemSettings)
        } else {
          // Create default settings if they don't exist
          await setDoc(doc(db, "settings", "system"), settings)
        }
        setLoading(false)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setError("")
    setSuccess(false)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Simulate saving settings in demo mode
        console.log("Demo mode: Saving settings", settings)
        setTimeout(() => {
          setSuccess(true)
          setSaving(false)
        }, 1000)
      } else {
        // Save settings to Firestore
        await setDoc(doc(db, "settings", "system"), settings)
        setSuccess(true)
        setSaving(false)
      }
    } catch (error: any) {
      setError(`Error saving settings: ${error.message}`)
      setSaving(false)
    }
  }

  const handleToggleMaintenanceMode = (checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      maintenanceMode: checked,
    }))
  }

  const handleToggleTeacherLogin = (checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      allowTeacherLogin: checked,
    }))
  }

  const handleToggleStudentLogin = (checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      allowStudentLogin: checked,
    }))
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure system-wide settings</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/teacher/dashboard?id=${teacherId}`)}>
          Back to Dashboard
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="school">School Info</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Configure general system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-teacher-login" className="font-medium">
                    Allow Teacher Login
                  </Label>
                  <p className="text-sm text-muted-foreground">Enable or disable teacher login functionality</p>
                </div>
                <Switch
                  id="allow-teacher-login"
                  checked={settings.allowTeacherLogin}
                  onCheckedChange={handleToggleTeacherLogin}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-student-login" className="font-medium">
                    Allow Student Login
                  </Label>
                  <p className="text-sm text-muted-foreground">Enable or disable student login functionality</p>
                </div>
                <Switch
                  id="allow-student-login"
                  checked={settings.allowStudentLogin}
                  onCheckedChange={handleToggleStudentLogin}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>Configure maintenance mode settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Enabling maintenance mode will display a maintenance message to users. This does not affect the actual
                  functionality of the application, but serves as a notification to users.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance-mode" className="font-medium">
                    Maintenance Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">Enable or disable maintenance mode</p>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={handleToggleMaintenanceMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-message" className="font-medium">
                  Maintenance Message
                </Label>
                <textarea
                  id="maintenance-message"
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  value={settings.maintenanceMessage}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      maintenanceMessage: e.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="school">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" />
                School Information
              </CardTitle>
              <CardDescription>Configure school information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-name" className="font-medium">
                    School Name
                  </Label>
                  <input
                    id="school-name"
                    className="w-full p-2 border rounded-md"
                    value={settings.schoolName}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        schoolName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school-address" className="font-medium">
                    School Address
                  </Label>
                  <input
                    id="school-address"
                    className="w-full p-2 border rounded-md"
                    value={settings.schoolAddress}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        schoolAddress: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school-phone" className="font-medium">
                    School Phone
                  </Label>
                  <input
                    id="school-phone"
                    className="w-full p-2 border rounded-md"
                    value={settings.schoolPhone}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        schoolPhone: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school-email" className="font-medium">
                    School Email
                  </Label>
                  <input
                    id="school-email"
                    className="w-full p-2 border rounded-md"
                    value={settings.schoolEmail}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        schoolEmail: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school-website" className="font-medium">
                    School Website
                  </Label>
                  <input
                    id="school-website"
                    className="w-full p-2 border rounded-md"
                    value={settings.schoolWebsite}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        schoolWebsite: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        {error && <p className="text-red-500 mr-4 self-center">{error}</p>}
        {success && <p className="text-green-500 mr-4 self-center">Settings saved successfully!</p>}
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
