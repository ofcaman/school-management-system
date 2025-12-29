"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import { Loader2, Save, ArrowLeft } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function AddTeacherPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [qualification, setQualification] = useState("")
  const [assignedClass, setAssignedClass] = useState("")
  const [assignedSection, setAssignedSection] = useState("")
  const [roles, setRoles] = useState<string[]>(["subject_teacher"])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // State for classes and sections from database
  const [classes, setClasses] = useState<string[]>(["none"])
  const [sections, setSections] = useState<string[]>([])
  const [availableSections, setAvailableSections] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUserId = searchParams.get("id")

  // Fetch classes and sections from database
  useEffect(() => {
    const fetchClassesAndSections = async () => {
      setLoadingData(true)
      try {
        // Check if we're in demo mode
        const isDemoMode = localStorage.getItem("isDemoMode") === "true"

        if (isDemoMode) {
          // Use default classes and sections in demo mode
          setClasses(["none", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
          setSections(["A", "B", "C", "D"])
          setLoadingData(false)
          return
        }

        // Fetch classes
        const classesSnapshot = await getDocs(collection(db, "classes"))
        const classesData = classesSnapshot.docs.map((doc) => doc.data().name || doc.id)

        // Add "none" option and sort classes
        const sortedClasses = [
          "none",
          ...classesData.sort((a, b) => {
            // Custom sorting to handle special class names
            if (a === "Nursery") return -1
            if (b === "Nursery") return 1
            if (a === "LKG") return -1
            if (b === "LKG") return 1
            if (a === "UKG") return -1
            if (b === "UKG") return 1
            return Number.parseInt(a) - Number.parseInt(b)
          }),
        ]

        setClasses(sortedClasses)

        // Fetch sections
        const sectionsSnapshot = await getDocs(collection(db, "sections"))
        const sectionsData = sectionsSnapshot.docs.map((doc) => doc.data().name || doc.id)

        setSections(sectionsData)
      } catch (error) {
        console.error("Error fetching classes and sections:", error)
        // Fallback to default values
        setClasses(["none", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
        setSections(["A", "B", "C", "D"])
      } finally {
        setLoadingData(false)
      }
    }

    fetchClassesAndSections()
  }, [])

  // Update available sections when class changes
  useEffect(() => {
    if (assignedClass && assignedClass !== "none") {
      setAvailableSections(sections)
    } else {
      setAvailableSections([])
      setAssignedSection("")
    }
  }, [assignedClass, sections])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      // Validate form
      if (!name || !email || !phone) {
        setError("Please fill in all required fields")
        setLoading(false)
        return
      }

      // Create teacher object
      const teacherData: Omit<Teacher, "id"> = {
        name: name.toUpperCase(),
        email,
        phone,
        qualification,
        roles,
        assignedClass,
        assignedSection,
        profileImageUrl: "",
        active: true,
      }

      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Simulate adding a teacher in demo mode
        console.log("Demo mode: Adding teacher", teacherData)
        setTimeout(() => {
          setSuccess(true)
          setLoading(false)
          // Reset form
          setName("")
          setEmail("")
          setPhone("")
          setQualification("")
          setAssignedClass("")
          setAssignedSection("")
          setRoles(["subject_teacher"])
        }, 1000)
      } else {
        // Add teacher to Firestore
        await addDoc(collection(db, "teachers"), teacherData)

        setSuccess(true)
        setLoading(false)
        // Reset form
        setName("")
        setEmail("")
        setPhone("")
        setQualification("")
        setAssignedClass("")
        setAssignedSection("")
        setRoles(["subject_teacher"])
      }
    } catch (error: any) {
      setError(`Error adding teacher: ${error.message}`)
      setLoading(false)
    }
  }

  const toggleRole = (role: string) => {
    setRoles((prevRoles) => {
      if (prevRoles.includes(role)) {
        return prevRoles.filter((r) => r !== role)
      } else {
        return [...prevRoles, role]
      }
    })
  }

  const handleClassChange = (value: string) => {
    // Set assignedClass to empty string if "none" is selected, otherwise use the value
    setAssignedClass(value === "none" ? "" : value)
    // Reset section when class changes
    setAssignedSection("")

    // If class teacher is selected and a class is assigned (not "none"), add class_teacher role
    if (value !== "none" && !roles.includes("class_teacher")) {
      setRoles((prevRoles) => [...prevRoles, "class_teacher"])
    }

    // If "none" is selected and class_teacher role exists, remove it
    if (value === "none" && roles.includes("class_teacher")) {
      setRoles((prevRoles) => prevRoles.filter((r) => r !== "class_teacher"))
    }
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.push(`/teacher/tmanage?id=${currentUserId}`)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teacher Management
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Add Teacher</h1>
          <p className="text-muted-foreground">Add a new teacher to the system</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher Information</CardTitle>
          <CardDescription>Enter the details of the new teacher</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    placeholder="Enter qualification"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Assigned Class</Label>
                  <Select value={assignedClass} onValueChange={handleClassChange}>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls === "none" ? "None" : `Class ${cls}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Assigned Section</Label>
                  <Select
                    value={assignedSection}
                    onValueChange={setAssignedSection}
                    disabled={!assignedClass || assignedClass === "none"}
                  >
                    <SelectTrigger id="section">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((section) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6">
                <Label className="mb-2 block">Roles</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-principal"
                      checked={roles.includes("principal")}
                      onCheckedChange={() => toggleRole("principal")}
                    />
                    <Label htmlFor="role-principal">Principal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-computer-teacher"
                      checked={roles.includes("computer_teacher")}
                      onCheckedChange={() => toggleRole("computer_teacher")}
                    />
                    <Label htmlFor="role-computer-teacher">Computer Teacher</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-class-teacher"
                      checked={roles.includes("class_teacher")}
                      onCheckedChange={() => toggleRole("class_teacher")}
                      disabled={!!assignedClass && assignedClass !== "none"}
                    />
                    <Label htmlFor="role-class-teacher">Class Teacher</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-subject-teacher"
                      checked={roles.includes("subject_teacher")}
                      onCheckedChange={() => toggleRole("subject_teacher")}
                    />
                    <Label htmlFor="role-subject-teacher">Subject Teacher</Label>
                  </div>
                </div>
              </div>

              {error && <p className="mt-4 text-red-500">{error}</p>}
              {success && <p className="mt-4 text-green-500">Teacher added successfully!</p>}

              <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Teacher
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
