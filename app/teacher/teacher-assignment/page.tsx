"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  updateDoc,
  deleteDoc,
} from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import type { TeacherAssignment } from "@/lib/models/teacher-assignment-models"
import { ArrowLeft, Edit, Plus, Trash2, Loader2 } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function TeacherAssignmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("teacherId")
  const currentUserId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [targetTeacher, setTargetTeacher] = useState<Teacher | null>(null)
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentAssignment, setCurrentAssignment] = useState<TeacherAssignment | null>(null)
  const [formData, setFormData] = useState({
    grade: "",
    subject: "",
    academicYear: new Date().getFullYear().toString(),
  })
  const [isDemoMode, setIsDemoMode] = useState(false)

  const [classes, setClasses] = useState<{ id: string; name: string; displayName: string }[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [sections, setSections] = useState<string[]>([])
  const [loadingSections, setLoadingSections] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [subjectGroups, setSubjectGroups] = useState<{ id: string; name: string; code: string; forClass: string }[]>([])
  const [selectedSubjectGroup, setSelectedSubjectGroup] = useState<string>("")
  const [selectedSubjectGroupId, setSelectedSubjectGroupId] = useState<string>("")
  const [loadingSubjectGroups, setLoadingSubjectGroups] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string; name: string }[]>([])
  const [useFallback, setUseFallback] = useState(false)
  const [isFallbackSubjectsUsed, setIsFallbackSubjectsUsed] = useState(false)

  // List of grades and subjects
  const grades = ["pg", "nursery", "lkg", "ukg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  const subjects = [
    "Math",
    "Science",
    "English",
    "Serofero",
    "Computer",
    "Nepali",
    "Samajik",
    "Health",
    "O.PT",
    "Grammar",
    "Translation",
  ]

  // Fallback subjects if no subject groups are found
  const FALLBACK_SUBJECTS = {
    primary: [
      "Math",
      "Science",
      "English",
      "Serofero",
      "Computer",
      "Nepali",
      "Samajik",
      "Health",
      "O.PT",
      "Grammar",
      "Translation",
    ],
    secondary: [
      "Math",
      "Science",
      "English",
      "Serofero",
      "Computer",
      "Nepali",
      "Samajik",
      "Health",
      "O.PT",
      "Grammar",
      "Translation",
    ],
    preschool: ["English", "Nepali", "Mathematics", "Drawing", "General Knowledge", "Handwriting"],
  }

  useEffect(() => {
    if (!teacherId || !currentUserId) {
      router.push("/teacher/dashboard")
      return
    }

    checkPermission()
  }, [teacherId, currentUserId, router])

  const checkPermission = async () => {
    setPermissionChecking(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
        // In demo mode, set up demo data
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

        setTargetTeacher({
          id: teacherId,
          name: "DEMO TARGET TEACHER",
          email: "target@sajhaschool.edu",
          phone: "9876543211",
          qualification: "B.Ed",
          profileImageUrl: "",
          roles: ["class_teacher"],
          assignedClass: "9",
          active: true,
        })

        setHasPermission(true)
        loadDemoAssignments()
        setPermissionChecking(false)
        return
      }

      // Get the current user (teacher) document
      const currentTeacherDoc = await getDoc(doc(db, "teachers", currentUserId))

      if (!currentTeacherDoc.exists()) {
        setHasPermission(false)
        setPermissionMessage("Current teacher not found")
        setPermissionChecking(false)
        return
      }

      const currentTeacherData = currentTeacherDoc.data() as Teacher
      currentTeacherData.id = currentTeacherDoc.id
      setCurrentTeacher(currentTeacherData)

      // Check if current teacher is principal or computer_teacher
      const isAdmin =
        currentTeacherData.roles?.includes("principal") || currentTeacherData.roles?.includes("computer_teacher")

      if (!isAdmin) {
        setHasPermission(false)
        setPermissionMessage("You don't have permission to manage teacher assignments")
        setPermissionChecking(false)
        return
      }

      // Get the target teacher document
      const targetTeacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (!targetTeacherDoc.exists()) {
        setHasPermission(false)
        setPermissionMessage("Target teacher not found")
        setPermissionChecking(false)
        return
      }

      const targetTeacherData = targetTeacherDoc.data() as Teacher
      targetTeacherData.id = targetTeacherDoc.id
      setTargetTeacher(targetTeacherData)

      setHasPermission(true)
      loadAssignments()
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
    }
  }

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      if (isDemoMode) {
        // Use demo classes
        const demoClasses = [
          { id: "pg", name: "pg", displayName: "Class P.G." },
          { id: "nursery", name: "nursery", displayName: "Class Nursery" },
          { id: "lkg", name: "lkg", displayName: "Class LKG" },
          { id: "ukg", name: "ukg", displayName: "Class UKG" },
          ...Array.from({ length: 12 }, (_, i) => {
            const grade = (i + 1).toString()
            return { id: grade, name: grade, displayName: `Grade ${grade}` }
          }),
        ]
        setClasses(demoClasses)
      } else {
        // Fetch classes from Firestore
        const classesRef = collection(db, "classes")
        const querySnapshot = await getDocs(classesRef)

        const classesData: { id: string; name: string; displayName: string }[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          classesData.push({
            id: doc.id,
            name: data.name || doc.id,
            displayName: data.displayName || `Class ${data.name || doc.id}`,
          })
        })

        // Sort classes in logical order
        classesData.sort((a, b) => {
          const order = ["pg", "nursery", "lkg", "ukg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
          const aIndex = order.indexOf(a.name.toLowerCase())
          const bIndex = order.indexOf(b.name.toLowerCase())
          return aIndex - bIndex
        })

        setClasses(classesData)

        // If no classes were found, use default classes
        if (classesData.length === 0) {
          const defaultClasses = [
            { id: "pg", name: "pg", displayName: "Class P.G." },
            { id: "nursery", name: "nursery", displayName: "Class Nursery" },
            { id: "lkg", name: "lkg", displayName: "Class LKG" },
            { id: "ukg", name: "ukg", displayName: "Class UKG" },
            ...Array.from({ length: 12 }, (_, i) => {
              const grade = (i + 1).toString()
              return { id: grade, name: grade, displayName: `Grade ${grade}` }
            }),
          ]
          setClasses(defaultClasses)
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      // Fallback to default classes
      const defaultClasses = [
        { id: "pg", name: "pg", displayName: "Class P.G." },
        { id: "nursery", name: "nursery", displayName: "Class Nursery" },
        { id: "lkg", name: "lkg", displayName: "Class LKG" },
        { id: "ukg", name: "ukg", displayName: "Class UKG" },
        ...Array.from({ length: 12 }, (_, i) => {
          const grade = (i + 1).toString()
          return { id: grade, name: grade, displayName: `Grade ${grade}` }
        }),
      ]
      setClasses(defaultClasses)
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSections = async () => {
    if (!selectedGrade) return

    setLoadingSections(true)
    try {
      if (isDemoMode) {
        // Use demo sections
        const demoSections = ["A", "B", "C", "D"]
        setSections(demoSections)
      } else {
        // Find the class document
        const classQuery = query(collection(db, "classes"), where("name", "==", selectedGrade))
        const classSnapshot = await getDocs(classQuery)

        if (!classSnapshot.empty) {
          const classDoc = classSnapshot.docs[0]
          const classData = classDoc.data()

          if (classData.sections && Array.isArray(classData.sections) && classData.sections.length > 0) {
            // Ensure sections are simple strings like "A", "B", etc.
            const processedSections = classData.sections.map((section: any) => {
              if (typeof section === "string") {
                // If it's already a simple string but looks like an ID, use a default
                if (section.length > 10) {
                  return String.fromCharCode(65 + classData.sections.indexOf(section)) // A, B, C, etc.
                }
                return section
              }
              // If it's an object, try to get the name property
              if (section && typeof section === "object" && section.name) {
                return section.name
              }
              // Fallback to index-based section name
              return String.fromCharCode(65 + classData.sections.indexOf(section)) // A, B, C, etc.
            })

            setSections(processedSections)
          } else {
            // Default sections if none defined
            const defaultSections = ["A", "B", "C", "D"]
            setSections(defaultSections)
          }
        } else {
          // Default sections if class not found
          const defaultSections = ["A", "B", "C", "D"]
          setSections(defaultSections)
        }
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      // Fallback to default sections
      const defaultSections = ["A", "B", "C", "D"]
      setSections(defaultSections)
    } finally {
      setLoadingSections(false)
    }
  }

  const fetchSubjectGroups = async () => {
    if (!selectedGrade) return

    setLoadingSubjectGroups(true)
    setSubjectGroups([])
    setSelectedSubjectGroup("")
    setSelectedSubjectGroupId("")

    try {
      if (isDemoMode) {
        // Use demo subject groups
        const demoSubjectGroups = [
          {
            id: "group1",
            name: "for class 1 to 3",
            code: "one-three",
            forClass: selectedGrade,
          },
          {
            id: "group2",
            name: "for class 4 to 5",
            code: "four-five",
            forClass: selectedGrade,
          },
        ]
        setSubjectGroups(demoSubjectGroups)

        // Auto-select the first group
        if (demoSubjectGroups.length > 0) {
          setSelectedSubjectGroup(demoSubjectGroups[0].name)
          setSelectedSubjectGroupId(demoSubjectGroups[0].id)
        }
      } else {
        // Find the class ID
        const classObj = classes.find((c) => c.name === selectedGrade)
        const classId = classObj ? classObj.id : selectedGrade

        console.log("Fetching subject groups for class ID:", classId)

        // Fetch all subject groups from Firestore
        const subjectGroupsRef = collection(db, "subject_groups")
        const querySnapshot = await getDocs(subjectGroupsRef)

        const groupsData: { id: string; name: string; code: string; forClass: string }[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          // Include groups that are either for this specific class or don't have a class specified (for all classes)
          if (!data.forClass || data.forClass === classId || data.forClass === "all") {
            groupsData.push({
              id: doc.id,
              name: data.name || `Group ${groupsData.length + 1}`,
              code: data.code || doc.id,
              forClass: data.forClass || "all",
            })
          }
        })

        console.log("Found subject groups:", groupsData.length)
        setSubjectGroups(groupsData)

        // Auto-select the first group
        if (groupsData.length > 0) {
          setSelectedSubjectGroup(groupsData[0].name)
          setSelectedSubjectGroupId(groupsData[0].id)
        } else {
          console.warn("No subject groups found for this class")
          // If no subject groups found, use fallback subjects
          setUseFallback(true)
        }
      }
    } catch (error) {
      console.error("Error fetching subject groups:", error)
      // If error, use fallback subjects
      setUseFallback(true)
    } finally {
      setLoadingSubjectGroups(false)
    }
  }

  const fetchSubjects = async () => {
    if (!selectedSubjectGroupId && !useFallback) return

    setLoadingSubjects(true)
    setAvailableSubjects([])

    try {
      if (useFallback) {
        // Determine which subject set to use based on grade
        let subjectSet: string[] = []
        const gradeName = selectedGrade.toLowerCase()

        if (["pg", "nursery", "lkg", "ukg"].includes(gradeName)) {
          subjectSet = FALLBACK_SUBJECTS.preschool
        } else {
          const gradeNum = Number.parseInt(selectedGrade)
          if (!isNaN(gradeNum)) {
            if (gradeNum <= 8) {
              subjectSet = FALLBACK_SUBJECTS.primary
            } else {
              subjectSet = FALLBACK_SUBJECTS.secondary
            }
          } else {
            // Default to primary if we can't determine
            subjectSet = FALLBACK_SUBJECTS.primary
          }
        }

        // Convert to the expected format
        const fallbackSubjects = subjectSet.map((name, index) => ({
          id: `fallback-${index}`,
          name,
        }))

        setAvailableSubjects(fallbackSubjects)
        setIsFallbackSubjectsUsed(true)
        console.log("Using fallback subjects:", fallbackSubjects)
      } else if (isDemoMode) {
        // Use demo subjects
        const demoSubjects = [
          { id: "subject1", name: "Mathematics" },
          { id: "subject2", name: "English" },
          { id: "subject3", name: "Science" },
          { id: "subject4", name: "Social Studies" },
          { id: "subject5", name: "Computer" },
        ]

        setAvailableSubjects(demoSubjects)
        console.log("Using demo subjects:", demoSubjects)
      } else {
        console.log("Fetching subjects for subject group ID:", selectedSubjectGroupId)

        // First, get the subject group document to check for subjects array
        const groupDoc = await getDoc(doc(db, "subject_groups", selectedSubjectGroupId))

        if (groupDoc.exists()) {
          console.log("Subject group document found:", groupDoc.data())

          // Check if the subjects field exists and is an array
          if (groupDoc.data().subjects && Array.isArray(groupDoc.data().subjects)) {
            const subjectIds = groupDoc.data().subjects || []
            console.log("Subject IDs found in group:", subjectIds)

            const subjectsData: { id: string; name: string }[] = []

            // Fetch each subject document by ID
            for (const subjectId of subjectIds) {
              try {
                // Check if subjectId is a string (it should be a document ID)
                if (typeof subjectId === "string") {
                  console.log("Fetching subject with ID:", subjectId)
                  const subjectDoc = await getDoc(doc(db, "subjects", subjectId))

                  if (subjectDoc.exists()) {
                    const subjectData = subjectDoc.data()
                    console.log("Subject found:", subjectData)
                    subjectsData.push({
                      id: subjectDoc.id,
                      name: subjectData.name || subjectDoc.id,
                    })
                  } else {
                    console.warn(`Subject document ${subjectId} not found`)
                  }
                } else {
                  console.warn(`Invalid subject ID format:`, subjectId)
                }
              } catch (err) {
                console.error(`Error fetching subject ${subjectId}:`, err)
              }
            }

            console.log("Final subjects data:", subjectsData)

            if (subjectsData.length > 0) {
              setAvailableSubjects(subjectsData)
            } else {
              console.warn("No subjects found in the subject group, using fallback")
              setUseFallback(true)
              fetchSubjects() // Call again with useFallback set to true
            }
          } else {
            console.warn("No subjects array found in subject group document or invalid format")
            setUseFallback(true)
            fetchSubjects() // Call again with useFallback set to true
          }
        } else {
          console.warn("Subject group document not found")
          setUseFallback(true)
          fetchSubjects() // Call again with useFallback set to true
        }
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      setUseFallback(true)
      fetchSubjects() // Call again with useFallback set to true
    } finally {
      setLoadingSubjects(false)
    }
  }

  useEffect(() => {
    if (hasPermission) {
      fetchClasses()
    }
  }, [hasPermission])

  useEffect(() => {
    if (selectedGrade) {
      fetchSections()
      fetchSubjectGroups()
      // Reset subject-related state when grade changes
      setSelectedSubjectGroup("")
      setSelectedSubjectGroupId("")
      setFormData((prev) => ({ ...prev, subject: "" }))
    }
  }, [selectedGrade])

  useEffect(() => {
    if (selectedSubjectGroupId) {
      console.log("Subject group ID changed, fetching subjects:", selectedSubjectGroupId)
      setUseFallback(false) // Reset fallback flag when subject group changes
      fetchSubjects()
    } else if (useFallback && selectedGrade) {
      console.log("Using fallback subjects for grade:", selectedGrade)
      fetchSubjects()
    }
  }, [selectedSubjectGroupId, useFallback, selectedGrade])

  const loadDemoAssignments = () => {
    // Create demo assignments
    const demoAssignments: TeacherAssignment[] = [
      {
        id: "assignment1",
        teacherId: teacherId || "",
        teacherName: "DEMO TARGET TEACHER",
        grade: "9",
        subject: "Math",
        academicYear: "2023",
      },
      {
        id: "assignment2",
        teacherId: teacherId || "",
        teacherName: "DEMO TARGET TEACHER",
        grade: "10",
        subject: "Science",
        academicYear: "2023",
      },
    ]

    setAssignments(demoAssignments)
    setLoading(false)
  }

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const assignmentsQuery = query(collection(db, "teacher_assignments"), where("teacherId", "==", teacherId))

      const querySnapshot = await getDocs(assignmentsQuery)
      const assignmentsList: TeacherAssignment[] = []

      querySnapshot.forEach((doc) => {
        const assignment = doc.data() as TeacherAssignment
        assignment.id = doc.id
        assignmentsList.push(assignment)
      })

      setAssignments(assignmentsList)
    } catch (error: any) {
      console.error("Error loading assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAssignment = async () => {
    if (!targetTeacher) return

    const newAssignment: Omit<TeacherAssignment, "id"> = {
      teacherId: targetTeacher.id,
      teacherName: targetTeacher.name,
      grade: formData.grade,
      subject: formData.subject,
      academicYear: formData.academicYear,
      subjectGroup: selectedSubjectGroup || "",
      subjectGroupId: selectedSubjectGroupId || "",
    }

    try {
      if (isDemoMode) {
        // In demo mode, just add to local state
        const demoAssignment: TeacherAssignment = {
          ...newAssignment,
          id: `assignment${assignments.length + 1}`,
        }
        setAssignments([...assignments, demoAssignment])
      } else {
        // Add to Firestore
        const docRef = await addDoc(collection(db, "teacher_assignments"), newAssignment)
        const addedAssignment: TeacherAssignment = {
          ...newAssignment,
          id: docRef.id,
        }
        setAssignments([...assignments, addedAssignment])
      }

      // Reset form and close dialog
      setFormData({
        grade: "",
        subject: "",
        academicYear: new Date().getFullYear().toString(),
      })
      setSelectedGrade("")
      setSelectedSubjectGroup("")
      setSelectedSubjectGroupId("")
      setIsAddDialogOpen(false)
    } catch (error: any) {
      console.error("Error adding assignment:", error)
      alert(`Error adding assignment: ${error.message}`)
    }
  }

  const handleEditAssignment = async () => {
    if (!currentAssignment) return

    const updatedAssignment: TeacherAssignment = {
      ...currentAssignment,
      grade: formData.grade,
      subject: formData.subject,
      academicYear: formData.academicYear,
      subjectGroup: selectedSubjectGroup || currentAssignment.subjectGroup || "",
      subjectGroupId: selectedSubjectGroupId || currentAssignment.subjectGroupId || "",
    }

    try {
      if (isDemoMode) {
        // In demo mode, just update local state
        const updatedAssignments = assignments.map((assignment) =>
          assignment.id === currentAssignment.id ? updatedAssignment : assignment,
        )
        setAssignments(updatedAssignments)
      } else {
        // Update in Firestore
        await updateDoc(doc(db, "teacher_assignments", currentAssignment.id), {
          grade: formData.grade,
          subject: formData.subject,
          academicYear: formData.academicYear,
          subjectGroup: selectedSubjectGroup || currentAssignment.subjectGroup || "",
          subjectGroupId: selectedSubjectGroupId || currentAssignment.subjectGroupId || "",
        })

        // Update local state
        const updatedAssignments = assignments.map((assignment) =>
          assignment.id === currentAssignment.id ? updatedAssignment : assignment,
        )
        setAssignments(updatedAssignments)
      }

      // Reset form and close dialog
      setCurrentAssignment(null)
      setSelectedGrade("")
      setSelectedSubjectGroup("")
      setSelectedSubjectGroupId("")
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Error updating assignment:", error)
      alert(`Error updating assignment: ${error.message}`)
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return

    try {
      if (isDemoMode) {
        // In demo mode, just update local state
        const filteredAssignments = assignments.filter((assignment) => assignment.id !== assignmentId)
        setAssignments(filteredAssignments)
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "teacher_assignments", assignmentId))

        // Update local state
        const filteredAssignments = assignments.filter((assignment) => assignment.id !== assignmentId)
        setAssignments(filteredAssignments)
      }
    } catch (error: any) {
      console.error("Error deleting assignment:", error)
      alert(`Error deleting assignment: ${error.message}`)
    }
  }

  const openEditDialog = (assignment: TeacherAssignment) => {
    setCurrentAssignment(assignment)
    setFormData({
      grade: assignment.grade,
      subject: assignment.subject,
      academicYear: assignment.academicYear,
    })
    setSelectedGrade(assignment.grade)

    // If the assignment has subject group info, set it
    if (assignment.subjectGroup && assignment.subjectGroupId) {
      console.log("Setting subject group from assignment:", assignment.subjectGroup, assignment.subjectGroupId)
      setSelectedSubjectGroup(assignment.subjectGroup)
      setSelectedSubjectGroupId(assignment.subjectGroupId)
    } else {
      // If no subject group ID, trigger fetching subject groups
      console.log("No subject group in assignment, fetching subject groups for grade:", assignment.grade)
      // Reset subject group state
      setSelectedSubjectGroup("")
      setSelectedSubjectGroupId("")
      // This will trigger the useEffect that calls fetchSubjectGroups
    }

    setIsEditDialogOpen(true)
  }

  if (permissionChecking) {
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
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{permissionMessage}</p>
            <Button className="mt-4 w-full" onClick={() => router.push(`/teacher/dashboard?id=${currentUserId}`)}>
              Back to Dashboard
            </Button>
          </CardContent>
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
        <h1 className="text-2xl font-bold">Teacher Assignments</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{targetTeacher?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div>
              <p>
                <strong>Email:</strong> {targetTeacher?.email}
              </p>
              <p>
                <strong>Phone:</strong> {targetTeacher?.phone}
              </p>
              <p>
                <strong>Qualification:</strong> {targetTeacher?.qualification}
              </p>
              <p>
                <strong>Roles:</strong> {targetTeacher?.roles?.join(", ")}
              </p>
              {targetTeacher?.assignedClass && (
                <p>
                  <strong>Assigned Class:</strong> {targetTeacher.assignedClass}
                </p>
              )}
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Current Assignments</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : assignments.length > 0 ? (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {["pg", "nursery", "lkg", "ukg"].includes(assignment.grade)
                        ? assignment.grade.toUpperCase()
                        : `Grade ${assignment.grade}`}{" "}
                      - {assignment.subject}
                    </h3>
                    <p className="text-muted-foreground">Academic Year: {assignment.academicYear}</p>
                    {assignment.subjectGroup && (
                      <p className="text-muted-foreground">Subject Group: {assignment.subjectGroup}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(assignment)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No assignments found for this teacher.</p>
            <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Assignment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Assignment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              {loadingClasses ? (
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <Select
                  value={selectedGrade}
                  onValueChange={(value) => {
                    setSelectedGrade(value)
                    setFormData({ ...formData, grade: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.name}>
                        {cls.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectGroup">Subject Group</Label>
              {loadingSubjectGroups ? (
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <Select
                  value={selectedSubjectGroup}
                  onValueChange={(value) => {
                    const group = subjectGroups.find((g) => g.name === value)
                    if (group) {
                      setSelectedSubjectGroup(value)
                      setSelectedSubjectGroupId(group.id)
                    }
                  }}
                  disabled={!selectedGrade || subjectGroups.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name} ({group.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              {loadingSubjects ? (
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.length > 0
                      ? availableSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.name}>
                            {subject.name}
                          </SelectItem>
                        ))
                      : subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAssignment}
              disabled={!selectedGrade || !formData.subject || !formData.academicYear}
            >
              Add Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              {loadingClasses ? (
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <Select
                  value={formData.grade}
                  onValueChange={(value) => {
                    setFormData({ ...formData, grade: value })
                    setSelectedGrade(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.name}>
                        {cls.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectGroup">Subject Group</Label>
              {loadingSubjectGroups ? (
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <Select
                  value={selectedSubjectGroup}
                  onValueChange={(value) => {
                    const group = subjectGroups.find((g) => g.name === value)
                    if (group) {
                      setSelectedSubjectGroup(value)
                      setSelectedSubjectGroupId(group.id)
                    }
                  }}
                  disabled={!formData.grade || subjectGroups.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name} ({group.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              {loadingSubjects ? (
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.length > 0
                      ? availableSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.name}>
                            {subject.name}
                          </SelectItem>
                        ))
                      : subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditAssignment}
              disabled={!formData.grade || !formData.subject || !formData.academicYear}
            >
              Update Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Extend the TeacherAssignment type if needed
declare module "@/lib/models/teacher-assignment-models" {
  interface TeacherAssignment {
    subjectGroup?: string
    subjectGroupId?: string
  }
}
