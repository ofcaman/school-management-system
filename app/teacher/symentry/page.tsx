
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Student, Teacher } from "@/lib/models"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function SymbolNumberEntryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [classes, setClasses] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [availableSections, setAvailableSections] = useState<string[]>([])
  const [loadingClassData, setLoadingClassData] = useState(true)
  const [grade, setGrade] = useState("")
  const [section, setSection] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [baseSymbolNumber, setBaseSymbolNumber] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    checkPermission()
    fetchClassesAndSections()
  }, [])

  useEffect(() => {
    if (grade) {
      setAvailableSections(sections)
    } else {
      setAvailableSections([])
      setSection("")
      setStudents([])
    }
  }, [grade, sections])

  useEffect(() => {
    if (grade && section) {
      fetchStudents()
    } else {
      setStudents([])
    }
  }, [grade, section])

  const fetchClassesAndSections = async () => {
    setLoadingClassData(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      if (isDemoMode) {
        setClasses(["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
        setSections(["A", "B", "C", "D"])
        setLoadingClassData(false)
        return
      }

      const classesSnapshot = await getDocs(collection(db, "classes"))
      const classesData = classesSnapshot.docs.map((doc) => doc.data().name || doc.id)
      const sortedClasses = classesData.sort((a, b) => {
        if (a === "P.G") return -1
        if (b === "P.G") return 1
        if (a === "Nursery") return -1
        if (b === "Nursery") return 1
        if (a === "LKG") return -1
        if (b === "LKG") return 1
        if (a === "UKG") return -1
        if (b === "UKG") return 1
        return Number.parseInt(a) - Number.parseInt(b)
      })

      setClasses(sortedClasses.length > 0 ? sortedClasses : ["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
      const sectionsSnapshot = await getDocs(collection(db, "sections"))
      const sectionsData = sectionsSnapshot.docs.map((doc) => doc.data().name || doc.id)
      setSections(sectionsData.length > 0 ? sectionsData : ["A", "B", "C", "D"])
    } catch (error) {
      console.error("Error fetching classes and sections:", error)
      setClasses(["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())])
      setSections(["A", "B", "C", "D"])
    } finally {
      setLoadingClassData(false)
    }
  }

  const checkPermission = async () => {
    setPermissionChecking(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
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
        setPermissionChecking(false)
        return
      }

      const user = auth.currentUser
      if (!user) {
        const teacherId = localStorage.getItem("teacherId")
        if (teacherId) {
          await checkTeacherPermission(teacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Please sign in to manage symbol numbers")
          router.push("/teacher/login")
        }
      } else {
        const teachersRef = collection(db, "teachers")
        const q = query(teachersRef, where("email", "==", user.email))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          const teacherId = querySnapshot.docs[0].id
          await checkTeacherPermission(teacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Teacher not found in database")
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

  const checkTeacherPermission = async (teacherId: string) => {
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId))
      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)
        if (teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")) {
          setHasPermission(true)
        } else {
          setHasPermission(false)
          setPermissionMessage("Only principal or computer teacher can manage symbol numbers")
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

  const fetchStudents = async () => {
    setLoadingStudents(true)
    setStudents([])
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      let studentsData: Student[] = []
      if (isDemoMode) {
        studentsData = Array.from({ length: 5 }, (_, i) => ({
          id: `demo${i + 1}`,
          firstName: `Student${i + 1}`,
          middleName: "",
          lastName: "Doe",
          name: `Student${i + 1} Doe`,
          rollNumber: `${i + 1}`,
          grade,
          section,
          symbolNumber: "",
          address: "",
          attendance: 0,
          attendanceId: "",
          attendanceStatus: "",
          busRoute: "",
          contactNumber: "",
          currentSubject: null,
          dob: "",
          dues: 0,
          fatherName: "",
          motherName: "",
          monthlyFee: 0,
          percentage: 0,
          profilePictureUrl: "",
          qrCode: null,
          rank: 0,
          resultPdfUrl: "",
          selected: false,
          subjects: [],
          transportationFee: 0,
          usesBus: false,
          janmaDartaUrl: "",
          janmaDartaNumber: "",
          janmaDartaSection: "",
        }))
      } else {
        const studentsRef = collection(db, "students")
        const q = query(
          studentsRef,
          where("grade", "==", grade),
          where("section", "==", section)
        )
        const querySnapshot = await getDocs(q)
        studentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Student))
      }
      // Sort students by roll number
      studentsData.sort((a, b) => Number.parseInt(a.rollNumber) - Number.parseInt(b.rollNumber))
      setStudents(studentsData)
    } catch (error) {
      console.error("Error fetching students:", error)
      setFormErrors({ fetch: "Failed to load students. Please try again." })
    } finally {
      setLoadingStudents(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!grade) errors.grade = "Please select a grade"
    if (!section) errors.section = "Please select a section"
    if (!baseSymbolNumber.trim()) {
      errors.baseSymbolNumber = "Base symbol number is required"
    } else if (!/^\d+$/.test(baseSymbolNumber)) {
      errors.baseSymbolNumber = "Base symbol number must be numeric"
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      const baseNumber = Number.parseInt(baseSymbolNumber)
      if (isNaN(baseNumber)) {
        setFormErrors({ baseSymbolNumber: "Invalid base symbol number" })
        setLoading(false)
        return
      }

      for (let i = 0; i < students.length; i++) {
        const student = students[i]
        const symbolNumber = (baseNumber + i).toString()
        if (isDemoMode) {
          // Update local state for demo mode
          setStudents((prev) =>
            prev.map((s, index) =>
              index === i ? { ...s, symbolNumber } : s
            )
          )
        } else {
          const studentRef = doc(db, "students", student.id)
          await updateDoc(studentRef, { symbolNumber })
        }
      }
      alert(`Symbol numbers assigned successfully starting from ${baseSymbolNumber}`)
      setBaseSymbolNumber("")
      await fetchStudents() // Refresh student list to reflect changes
    } catch (error: any) {
      console.error("Error assigning symbol numbers:", error)
      setFormErrors({ submit: `Error assigning symbol numbers: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  if (permissionChecking || loadingClassData) {
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
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Assign Symbol Numbers</h1>
      </div>

      {formErrors.submit && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formErrors.submit}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Symbol Number Assignment</CardTitle>
          <CardDescription>
            Select a class and section, then enter the base symbol number to assign sequentially based on roll numbers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">
                  Grade <span className="text-red-500">*</span>
                </Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className={formErrors.grade ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.grade && <p className="text-red-500 text-sm">{formErrors.grade}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">
                  Section <span className="text-red-500">*</span>
                </Label>
                <Select value={section} onValueChange={setSection} disabled={!grade}>
                  <SelectTrigger className={formErrors.section ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        Section {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.section && <p className="text-red-500 text-sm">{formErrors.section}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseSymbolNumber">
                  Base Symbol Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="baseSymbolNumber"
                  value={baseSymbolNumber}
                  onChange={(e) => setBaseSymbolNumber(e.target.value)}
                  placeholder="e.g., 1110"
                  className={formErrors.baseSymbolNumber ? "border-red-500" : ""}
                />
                {formErrors.baseSymbolNumber && (
                  <p className="text-red-500 text-sm">{formErrors.baseSymbolNumber}</p>
                )}
              </div>
            </div>

            {loadingStudents && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            {students.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">Student List (Sorted by Roll Number)</h3>
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-3 text-left">Roll No.</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Current Symbol No.</th>
                        <th className="p-3 text-left">New Symbol No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr key={student.id} className="border-t">
                          <td className="p-3">{student.rollNumber}</td>
                          <td className="p-3">{student.name}</td>
                          <td className="p-3">{student.symbolNumber || "Not assigned"}</td>
                          <td className="p-3">
                            {baseSymbolNumber && !formErrors.baseSymbolNumber
                              ? (Number.parseInt(baseSymbolNumber) + index).toString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {grade && section && students.length === 0 && !loadingStudents && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No students found for {grade} Section {section}.</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !grade || !section || !baseSymbolNumber || students.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Assign Symbol Numbers
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
