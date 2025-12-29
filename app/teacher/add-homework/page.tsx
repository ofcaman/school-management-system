"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import type { TeacherAssignment } from "@/lib/models/homework-models"
import { ArrowLeft, Loader2, Upload, File, AlertCircle, RefreshCw } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Default data for fallback
const DEFAULT_GRADES = ["10", "9", "8"]
const DEFAULT_GRADE_SUBJECTS_MAP: Record<string, string[]> = {
  "10": ["Mathematics", "Science", "Computer"],
  "9": ["English", "Social Studies"],
  "8": ["Nepali", "Science"],
}
const DEFAULT_SECTIONS = ["A", "B", "C", "D"]

export default function AddHomeworkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Main state
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Loading states
  const [initializing, setInitializing] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sectionError, setSectionError] = useState<string | null>(null)

  // Grade and subject states
  const [assignedGrades, setAssignedGrades] = useState<string[]>(DEFAULT_GRADES)
  const [gradeToSubjectsMap, setGradeToSubjectsMap] = useState<Record<string, string[]>>(DEFAULT_GRADE_SUBJECTS_MAP)
  const [selectedGrade, setSelectedGrade] = useState<string>(DEFAULT_GRADES[0])
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>(
    DEFAULT_GRADE_SUBJECTS_MAP[DEFAULT_GRADES[0]] || [],
  )
  const [selectedSubject, setSelectedSubject] = useState<string>("")

  // Section states
  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS)
  const [selectedSection, setSelectedSection] = useState<string>(DEFAULT_SECTIONS[0])

  // Initialize the page
  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/dashboard")
      return
    }

    // Set a timeout to force initialization to complete
    const timeoutId = setTimeout(() => {
      if (initializing) {
        console.log("Initialization timed out, using default values")
        setInitializing(false)
        setError("Loading timed out. Using default values.")
      }
    }, 10000) // 10 seconds timeout

    // Start initialization
    initializePage()

    // Cleanup
    return () => clearTimeout(timeoutId)
  }, [teacherId, router])

  // Update subjects when grade changes
  useEffect(() => {
    if (selectedGrade) {
      const subjects = gradeToSubjectsMap[selectedGrade] || []
      setAssignedSubjects(subjects)
      if (subjects.length > 0) {
        setSelectedSubject(subjects[0])
      } else {
        setSelectedSubject("")
      }

      // Fetch sections for the selected grade
      fetchSectionsFromCollection()
    }
  }, [selectedGrade, gradeToSubjectsMap])

  // Initialize the page
  const initializePage = async () => {
    setInitializing(true)
    setError(null)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
        // Use demo data
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

        // Use default values
        setAssignedGrades(DEFAULT_GRADES)
        setGradeToSubjectsMap(DEFAULT_GRADE_SUBJECTS_MAP)
        setSelectedGrade(DEFAULT_GRADES[0])
        setSections(DEFAULT_SECTIONS)
        setSelectedSection(DEFAULT_SECTIONS[0])

        // Complete initialization
        setInitializing(false)
        return
      }

      // Get current user
      const user = auth.currentUser
      const storedTeacherId = localStorage.getItem("teacherId")

      if (!user && !storedTeacherId) {
        router.push("/teacher/login")
        return
      }

      // Get teacher data
      const teacherDocId = teacherId || storedTeacherId
      if (!teacherDocId) {
        setError("Teacher ID not found")
        setInitializing(false)
        return
      }

      // Fetch teacher data with timeout
      const teacherPromise = getDoc(doc(db, "teachers", teacherDocId))
      const teacherTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Teacher fetch timed out")), 5000),
      )

      try {
        const teacherDoc = (await Promise.race([teacherPromise, teacherTimeout])) as any

        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data() as Teacher
          teacherData.id = teacherDoc.id
          setCurrentTeacher(teacherData)

          // Fetch teacher assignments
          try {
            await fetchTeacherAssignments(teacherData.id)
          } catch (err) {
            console.error("Error fetching assignments:", err)
            setError("Failed to load assignments. Using default values.")
            // Use default values on error
            setAssignedGrades(DEFAULT_GRADES)
            setGradeToSubjectsMap(DEFAULT_GRADE_SUBJECTS_MAP)
          }

          // Set default grade from teacher data if available
          if (teacherData.assignedClass && DEFAULT_GRADES.includes(teacherData.assignedClass)) {
            setSelectedGrade(teacherData.assignedClass)
          }

          // Sections will be fetched when grade is selected via useEffect
        } else {
          setError("Teacher not found")
          // Use default values
          setAssignedGrades(DEFAULT_GRADES)
          setGradeToSubjectsMap(DEFAULT_GRADE_SUBJECTS_MAP)
        }
      } catch (err) {
        console.error("Error fetching teacher:", err)
        setError("Failed to load teacher data. Using default values.")
        // Use default values on error
        setAssignedGrades(DEFAULT_GRADES)
        setGradeToSubjectsMap(DEFAULT_GRADE_SUBJECTS_MAP)
      }
    } catch (err) {
      console.error("Initialization error:", err)
      setError("Initialization error. Using default values.")
      // Use default values on error
      setAssignedGrades(DEFAULT_GRADES)
      setGradeToSubjectsMap(DEFAULT_GRADE_SUBJECTS_MAP)
    } finally {
      // Always complete initialization
      setInitializing(false)
    }
  }

  // Fetch teacher assignments
  const fetchTeacherAssignments = async (teacherId: string) => {
    try {
      console.log("Fetching assignments for teacher:", teacherId)

      // Query teacher assignments with timeout
      const assignmentsPromise = getDocs(
        query(collection(db, "teacher_assignments"), where("teacherId", "==", teacherId)),
      )
      const assignmentsTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Assignments fetch timed out")), 5000),
      )

      const querySnapshot = (await Promise.race([assignmentsPromise, assignmentsTimeout])) as any

      if (querySnapshot.empty) {
        console.log("No assignments found for teacher:", teacherId)
        // Use default values if no assignments found
        return
      }

      const grades: string[] = []
      const gradeSubjectsMap: Record<string, string[]> = {}

      querySnapshot.forEach((doc: any) => {
        const assignment = doc.data() as TeacherAssignment
        const grade = assignment.grade?.trim()
        const subject = assignment.subject?.trim()

        if (grade && subject) {
          if (!grades.includes(grade)) {
            grades.push(grade)
          }

          if (!gradeSubjectsMap[grade]) {
            gradeSubjectsMap[grade] = []
          }

          if (!gradeSubjectsMap[grade].includes(subject)) {
            gradeSubjectsMap[grade].push(subject)
          }
        }
      })

      console.log("Fetched grades:", grades)
      console.log("Fetched grade-subject map:", gradeSubjectsMap)

      // Only update if we found valid data
      if (grades.length > 0) {
        grades.sort()
        setAssignedGrades(grades)
        setGradeToSubjectsMap(gradeSubjectsMap)

        // Update selected grade if needed
        if (!grades.includes(selectedGrade)) {
          setSelectedGrade(grades[0])
        }
      }
    } catch (err) {
      console.error("Error fetching assignments:", err)
      // Keep using default values on error
      throw err
    }
  }

  // Fetch sections from the sections collection
  const fetchSectionsFromCollection = async () => {
    setLoadingSections(true)
    setSectionError(null)

    try {
      console.log("Fetching sections from sections collection")

      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        console.log("Using demo sections")
        setSections(DEFAULT_SECTIONS)
        setSelectedSection(DEFAULT_SECTIONS[0])
        setLoadingSections(false)
        return
      }

      // Query the sections collection directly
      const sectionsQuery = query(collection(db, "sections"))
      const sectionsSnapshot = await getDocs(sectionsQuery)

      if (!sectionsSnapshot.empty) {
        const sectionsList: string[] = []

        sectionsSnapshot.forEach((doc) => {
          const sectionData = doc.data()
          if (sectionData.name) {
            sectionsList.push(sectionData.name)
          }
        })

        console.log("Fetched sections from collection:", sectionsList)

        if (sectionsList.length > 0) {
          // Sort sections alphabetically
          sectionsList.sort()
          setSections(sectionsList)

          // Set teacher's assigned section if available
          if (currentTeacher?.assignedSection && sectionsList.includes(currentTeacher.assignedSection)) {
            setSelectedSection(currentTeacher.assignedSection)
          } else {
            setSelectedSection(sectionsList[0])
          }

          setLoadingSections(false)
          return
        }
      }

      // If we get here, we didn't find valid sections
      console.log("No valid sections found in collection, using defaults")
      setSections(DEFAULT_SECTIONS)

      // Set teacher's assigned section if available
      if (currentTeacher?.assignedSection && DEFAULT_SECTIONS.includes(currentTeacher.assignedSection)) {
        setSelectedSection(currentTeacher.assignedSection)
      } else {
        setSelectedSection(DEFAULT_SECTIONS[0])
      }
    } catch (err) {
      console.error("Error fetching sections from collection:", err)
      setSectionError("Failed to load sections. Using default values.")
      setSections(DEFAULT_SECTIONS)
      setSelectedSection(DEFAULT_SECTIONS[0])
    } finally {
      setLoadingSections(false)
    }
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!selectedGrade) {
      errors.grade = "Please select a grade"
    }

    if (!selectedSection) {
      errors.section = "Please select a section"
    }

    if (!selectedSubject) {
      errors.subject = "Please select a subject"
    }

    if (!title.trim()) {
      errors.title = "Title is required"
    }

    if (!description.trim()) {
      errors.description = "Description is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !currentTeacher) return

    setSaving(true)

    try {
      let fileUrl = ""
      let fileName = ""

      // Upload file if selected
      if (selectedFile) {
        const fileRef = ref(storage, `homework/${Date.now()}_${selectedFile.name}`)
        await uploadBytes(fileRef, selectedFile)
        fileUrl = await getDownloadURL(fileRef)
        fileName = selectedFile.name
      }

      const homeworkData = {
        grade: selectedGrade,
        section: selectedSection,
        subject: selectedSubject,
        title: title.trim(),
        description: description.trim(),
        timestamp: new Date(),
        teacherId: currentTeacher.id,
        teacherName: currentTeacher.name,
        ...(fileUrl && { fileUrl, fileName }),
      }

      if (isDemoMode) {
        // In demo mode, just show success message and redirect
        alert("Homework added successfully (Demo Mode)")
        router.push(`/teacher/homework?id=${currentTeacher.id}`)
      } else {
        // Save to Firestore
        await addDoc(collection(db, "homework"), {
          ...homeworkData,
          timestamp: serverTimestamp(),
        })

        // Redirect to homework page
        router.push(`/teacher/homework?id=${currentTeacher.id}`)
      }
    } catch (error: any) {
      console.error("Error adding homework:", error)
      alert(`Error adding homework: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (initializing) {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <p className="text-lg mb-8">Loading homework form...</p>
        <Button
          variant="outline"
          onClick={() => {
            setInitializing(false)
            setError("Loading canceled. Using default values.")
          }}
        >
          Skip Loading
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add Homework</h1>
      </div>

      {error && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={initializePage} className="ml-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {sectionError && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Section Loading Issue</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{sectionError}</span>
            <Button variant="outline" size="sm" onClick={fetchSectionsFromCollection} className="ml-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Homework Assignment</CardTitle>
          <CardDescription>Assign homework to students in your classes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Grade Selection */}
              <div className="space-y-2">
                <Label htmlFor="grade">
                  Grade <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade} disabled={saving}>
                  <SelectTrigger id="grade" className={formErrors.grade ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.grade && <p className="text-red-500 text-sm">{formErrors.grade}</p>}
              </div>

              {/* Section Selection */}
              <div className="space-y-2">
                <Label htmlFor="section">
                  Section <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={saving || loadingSections}>
                  <SelectTrigger id="section" className={formErrors.section ? "border-red-500" : ""}>
                    {loadingSections ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Select section" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        Section {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.section && <p className="text-red-500 text-sm">{formErrors.section}</p>}
              </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                  disabled={saving || assignedSubjects.length === 0}
                >
                  <SelectTrigger id="subject" className={formErrors.subject ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.subject && <p className="text-red-500 text-sm">{formErrors.subject}</p>}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={formErrors.title ? "border-red-500" : ""}
                placeholder="e.g., Chapter 5 Exercises"
                disabled={saving}
              />
              {formErrors.title && <p className="text-red-500 text-sm">{formErrors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={formErrors.description ? "border-red-500" : ""}
                placeholder="Provide detailed instructions for the homework assignment"
                rows={5}
                disabled={saving}
              />
              {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">Attachment (Optional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                  disabled={saving}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedFile ? "Change File" : "Upload File"}
                </Button>
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  disabled={saving}
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{selectedFile.name}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Supported file types: Images (JPG, PNG) and PDF documents</p>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Assign Homework"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
