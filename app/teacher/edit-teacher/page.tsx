"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Upload, Trash2, Save, ArrowLeft } from "lucide-react"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export default function EditTeacherPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [qualification, setQualification] = useState("")
  const [roles, setRoles] = useState<string[]>([])
  const [assignedClass, setAssignedClass] = useState("")
  const [assignedSection, setAssignedSection] = useState("")
  const [active, setActive] = useState(true)

  // State for classes and sections from database
  const [classes, setClasses] = useState<string[]>(["none"])
  const [sections, setSections] = useState<string[]>([])
  const [availableSections, setAvailableSections] = useState<string[]>([])
  const [loadingClassData, setLoadingClassData] = useState(true)

  const roleOptions = [
    { id: "principal", label: "Principal" },
    { id: "computer_teacher", label: "Computer Teacher" },
    { id: "class_teacher", label: "Class Teacher" },
    { id: "subject_teacher", label: "Subject Teacher" },
  ]

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/dashboard")
      return
    }

    checkPermission()
    fetchClassesAndSections()
  }, [teacherId, router])

  // Update available sections when class changes
  useEffect(() => {
    if (assignedClass && assignedClass !== "none") {
      setAvailableSections(sections)
    } else {
      setAvailableSections([])
      setAssignedSection("")
    }
  }, [assignedClass, sections])

  const fetchClassesAndSections = async () => {
    setLoadingClassData(true)
    try {
      // Check if we're in demo mode
      if (isDemoMode) {
        // Use default classes and sections in demo mode
        setClasses(["none", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
        setSections(["A", "B", "C", "D"])
        setLoadingClassData(false)
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
      setLoadingClassData(false)
    }
  }

  const checkPermission = async () => {
    setPermissionChecking(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
        setCurrentTeacher({
          id: "demo123",
          name: "DEMO TEACHER",
          email: "demo@sajhaschool.edu",
          phone: "9876543210",
          qualification: "M.Ed",
          profileImageUrl: "",
          roles: ["principal", "computer_teacher"],
          assignedClass: "10",
          active: true,
        })
        setHasPermission(true)
        loadTeacherData()
        setPermissionChecking(false)
        return
      }

      const user = auth.currentUser

      if (!user) {
        // Check if we have a teacher ID in localStorage
        const loggedInTeacherId = localStorage.getItem("teacherId")

        if (loggedInTeacherId) {
          await checkTeacherPermission(loggedInTeacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Please sign in to edit teacher details")
          router.push("/teacher/login")
        }
      } else {
        // Get the teacher document for the current user
        const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data() as Teacher
          teacherData.id = teacherDoc.id
          setCurrentTeacher(teacherData)

          // Check if teacher is admin or editing their own profile
          if (
            teacherData.roles?.includes("principal") ||
            teacherData.roles?.includes("computer_teacher") ||
            teacherData.id === teacherId
          ) {
            setHasPermission(true)
            loadTeacherData()
          } else {
            setHasPermission(false)
            setPermissionMessage("You don't have permission to edit this teacher")
          }
        } else {
          setHasPermission(false)
          setPermissionMessage("Teacher not found")
        }
      }
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
    }
  }

  const checkTeacherPermission = async (loggedInTeacherId: string) => {
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", loggedInTeacherId))

      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)

        // Check if teacher is admin or editing their own profile
        if (
          teacherData.roles?.includes("principal") ||
          teacherData.roles?.includes("computer_teacher") ||
          teacherData.id === teacherId
        ) {
          setHasPermission(true)
          loadTeacherData()
        } else {
          setHasPermission(false)
          setPermissionMessage("You don't have permission to edit this teacher")
        }
      } else {
        setHasPermission(false)
        setPermissionMessage("Teacher account not found")
      }
    } catch (error: any) {
      console.error("Error checking teacher permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    }
  }

  const loadTeacherData = async () => {
    setLoading(true)

    try {
      if (isDemoMode) {
        // Create demo teacher data based on the ID
        const demoTeacher: Teacher = {
          id: teacherId || "demo123",
          name: teacherId === "demo123" ? "DEMO TEACHER" : `Teacher ${teacherId?.slice(-1)}`,
          email: teacherId === "demo123" ? "demo@sajhaschool.edu" : `teacher${teacherId?.slice(-1)}@sajhaschool.edu`,
          phone: `98765432${teacherId?.slice(-1) || "10"}`,
          qualification: "M.Ed",
          profileImageUrl: "",
          roles: teacherId === "demo123" ? ["principal", "computer_teacher"] : ["class_teacher", "subject_teacher"],
          assignedClass: teacherId === "demo123" ? "10" : `${Number.parseInt(teacherId?.slice(-1) || "5")}`,
          assignedSection: "A",
          active: true,
        }

        setTeacherToEdit(demoTeacher)
        populateFormFields(demoTeacher)
      } else {
        // Fetch teacher data from Firestore
        const teacherDoc = await getDoc(doc(db, "teachers", teacherId!))

        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data() as Teacher
          teacherData.id = teacherDoc.id
          setTeacherToEdit(teacherData)
          populateFormFields(teacherData)
        } else {
          setFormErrors({ general: "Teacher not found" })
        }
      }
    } catch (error: any) {
      console.error("Error loading teacher data:", error)
      setFormErrors({ general: `Error loading teacher data: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const populateFormFields = (teacher: Teacher) => {
    setName(teacher.name || "")
    setEmail(teacher.email || "")
    setPhone(teacher.phone || "")
    setQualification(teacher.qualification || "")
    setRoles(teacher.roles || [])
    setAssignedClass(teacher.assignedClass || "")
    setAssignedSection(teacher.assignedSection || "")
    setActive(teacher.active !== false)

    if (teacher.profileImageUrl) {
      setImagePreview(teacher.profileImageUrl)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (checked) {
      setRoles([...roles, roleId])
    } else {
      setRoles(roles.filter((r) => r !== roleId))
    }

    // If class teacher is selected and a class is assigned (not "none"), add class_teacher role
    if (roleId === "class_teacher" && checked && assignedClass && assignedClass !== "none") {
      setRoles((prevRoles) => [...prevRoles, "class_teacher"])
    }

    // If class_teacher role is removed, reset assigned class
    if (roleId === "class_teacher" && !checked) {
      setAssignedClass("")
      setAssignedSection("")
    }
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

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!name.trim()) errors.name = "Name is required"

    if (!email.trim()) {
      errors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Enter a valid email address"
    }

    if (!phone.trim()) {
      errors.phone = "Phone number is required"
    } else if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      errors.phone = "Enter a valid 10-digit phone number"
    }

    if (!qualification.trim()) errors.qualification = "Qualification is required"

    if (roles.length === 0) errors.roles = "Select at least one role"

    if (roles.includes("class_teacher") && !assignedClass) {
      errors.assignedClass = "Class teacher must have an assigned class"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const uploadImageToStorage = async (file: File): Promise<string> => {
    if (isDemoMode) {
      // In demo mode, return a placeholder URL
      return "/placeholder-user.jpg"
    }

    const storageRef = ref(storage, `teacher_profile_pics/${Date.now()}_${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSaving(true)

    try {
      // Upload image if selected
      let profileImageUrl = teacherToEdit?.profileImageUrl || ""
      if (selectedImage) {
        profileImageUrl = await uploadImageToStorage(selectedImage)
      }

      // Create updated teacher object
      const updatedTeacher: Partial<Teacher> = {
        name: name.trim().toUpperCase(),
        email: email.trim(),
        phone: phone.trim(),
        qualification: qualification.trim(),
        roles: roles,
        assignedClass: roles.includes("class_teacher") ? assignedClass : "",
        assignedSection: roles.includes("class_teacher") ? assignedSection : "",
        active: active,
        profileImageUrl: profileImageUrl,
      }

      if (isDemoMode) {
        // In demo mode, just show success message and redirect
        alert("Teacher updated successfully (Demo Mode)")
        router.push("/teacher/dashboard?id=demo123")
      } else {
        // Update in Firestore
        await updateDoc(doc(db, "teachers", teacherId!), updatedTeacher)

        // Success - redirect back to dashboard
        router.push("/teacher/dashboard?id=" + currentTeacher?.id)
      }
    } catch (error: any) {
      console.error("Error updating teacher:", error)
      setFormErrors({ general: `Error updating teacher: ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      if (isDemoMode) {
        // In demo mode, just show success message and redirect
        alert("Teacher deleted successfully (Demo Mode)")
        router.push("/teacher/dashboard?id=demo123")
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "teachers", teacherId!))

        // Success - redirect back to dashboard
        router.push("/teacher/dashboard?id=" + currentTeacher?.id)
      }
    } catch (error: any) {
      console.error("Error deleting teacher:", error)
      alert(`Error deleting teacher: ${error.message}`)
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (permissionChecking || loading || loadingClassData) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Permission Denied</CardTitle>
            <CardDescription>{permissionMessage}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push("/teacher/dashboard?id=" + currentTeacher?.id)}>
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Edit Teacher</h1>
            <p className="text-muted-foreground">Update the details of the teacher</p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/teacher/dashboard?id=${currentTeacher?.id}`)}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher Information</CardTitle>
          <CardDescription>Update the details of the teacher</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {formErrors.general && (
              <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700 mb-4">
                {formErrors.general}
              </div>
            )}

            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-gray-400">👤</span>
                )}
              </div>
              <div className="flex items-center">
                <Label
                  htmlFor="picture"
                  className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Picture
                </Label>
                <Input id="picture" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            </div>

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
                  className={formErrors.name ? "border-red-500" : ""}
                  required
                />
                {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
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
                  className={formErrors.email ? "border-red-500" : ""}
                  required
                />
                {formErrors.email && <p className="text-red-500 text-sm">{formErrors.email}</p>}
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
                  className={formErrors.phone ? "border-red-500" : ""}
                  required
                />
                {formErrors.phone && <p className="text-red-500 text-sm">{formErrors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualification">
                  Qualification <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="qualification"
                  placeholder="Enter qualification"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className={formErrors.qualification ? "border-red-500" : ""}
                />
                {formErrors.qualification && <p className="text-red-500 text-sm">{formErrors.qualification}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Assigned Class</Label>
                <Select value={assignedClass} onValueChange={handleClassChange}>
                  <SelectTrigger id="class" className={formErrors.assignedClass ? "border-red-500" : ""}>
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
                {formErrors.assignedClass && <p className="text-red-500 text-sm">{formErrors.assignedClass}</p>}
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
                {roleOptions.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={roles.includes(role.id)}
                      onCheckedChange={(checked) => handleRoleChange(role.id, checked as boolean)}
                      disabled={role.id === "class_teacher" && !!assignedClass && assignedClass !== "none"}
                    />
                    <Label htmlFor={`role-${role.id}`}>{role.label}</Label>
                  </div>
                ))}
              </div>
              {formErrors.roles && <p className="text-red-500 text-sm mt-2">{formErrors.roles}</p>}
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="active">Active Teacher</Label>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Teacher
              </Button>

              <Button type="submit" disabled={saving || deleting}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this teacher? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
