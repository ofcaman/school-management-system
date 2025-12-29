"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, setDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"

// Add the import for the Nepali date picker
import { NepaliDatePicker } from "@/components/nepali-date-picker"
import { BsCalendar, type BsDate, nepaliMonths, toNepaliDigits } from "@/lib/nepali-date"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Interface for Attendance record
interface Attendance {
  id?: string
  studentId: string
  date: string // AD date in YYYY-MM-DD format
  bsDate: string // BS date in YYYY-MM-DD format
  bsYear: number // BS year
  bsMonth: number // BS month
  bsDay: number // BS day
  status: string
  teacherId: string
  teacherName: string
  grade: string
  section?: string
  sectionId?: string
  classId?: string
}

// Interface for Class
interface Class {
  id: string
  name: string
  order?: number
  sections?: string[]
}

// Interface for Section
interface Section {
  id: string
  name: string
  classId?: string
}

// Interface for Class Teacher Assignment
interface ClassTeacherAssignment {
  teacherId: string
  classId: string
  sectionId: string
  academicYear: string
  className?: string
  sectionName?: string
}

export default function AttendancePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)

  // Updated to store both ID and name
  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<ClassTeacherAssignment[]>([])

  // Updated to store both ID and name
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedClassName, setSelectedClassName] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [selectedSectionName, setSelectedSectionName] = useState("")

  // Use BS date as the primary date
  const [currentBsDate, setCurrentBsDate] = useState<BsDate>(BsCalendar.getCurrentBsDate())
  const [currentDate, setCurrentDate] = useState(currentBsDate.adDate)
  const [dateString, setDateString] = useState("")
  const [bsDateString, setBsDateString] = useState("")

  const [showNepaliDigits, setShowNepaliDigits] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allStudents, setAllStudents] = useState<Student[]>([])

  useEffect(() => {
    checkPermission()
  }, [])

  // Load all students once at the beginning
  useEffect(() => {
    if (hasPermission) {
      loadAllStudents()
    }
  }, [hasPermission])

  // Update the useEffect that handles date changes
  useEffect(() => {
    // Format the AD date string for Firebase queries (YYYY-MM-DD)
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, "0")
    const day = String(currentDate.getDate()).padStart(2, "0")
    setDateString(`${year}-${month}-${day}`)

    // Format the BS date string (YYYY-MM-DD)
    const bsYear = currentBsDate.year
    const bsMonth = String(currentBsDate.month).padStart(2, "0")
    const bsDay = String(currentBsDate.day).padStart(2, "0")
    setBsDateString(`${bsYear}-${bsMonth}-${bsDay}`)

    if (selectedClassId && students.length > 0) {
      loadAttendanceForDate()
    }
  }, [currentDate, currentBsDate, selectedClassId, selectedSectionId])

  // When class or section changes, filter students from the already loaded allStudents array
  useEffect(() => {
    if (selectedClassName && allStudents.length > 0) {
      filterStudentsByClassAndSection()
    }
  }, [selectedClassName, selectedSectionName, allStudents])

  const checkPermission = async () => {
    setPermissionChecking(true)
    setError(null)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        setCurrentTeacher({
          id: "demo123",
          name: "DEMO TEACHER",
          email: "demo@sajhaschool.edu",
          phone: "9876543210",
          qualification: "M.Ed",
          profileImageUrl: "",
          roles: ["principal", "computer_teacher", "class_teacher"],
          assignedClass: "10",
          active: true,
        })
        setHasPermission(true)
        loadDemoData()
        setPermissionChecking(false)
        return
      }

      // Check if we have a teacher ID from URL params
      if (teacherId) {
        await checkTeacherPermission(teacherId)
        return
      }

      const user = auth.currentUser

      if (!user) {
        // Check if we have a teacher ID in localStorage
        const storedTeacherId = localStorage.getItem("teacherId")

        if (storedTeacherId) {
          await checkTeacherPermission(storedTeacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Please sign in to access attendance")
          router.push("/teacher/login")
        }
      } else {
        // Get the teacher document for the current user
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
      setError(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
    }
  }

  const loadDemoData = () => {
    // Set demo classes with IDs and names
    const demoClasses: Class[] = [
      { id: "class1", name: "P.G" },
      { id: "class2", name: "Nursery" },
      { id: "class3", name: "LKG" },
      { id: "class4", name: "UKG" },
      { id: "class5", name: "1" },
      { id: "class6", name: "2" },
      { id: "class7", name: "3" },
      { id: "class8", name: "4" },
      { id: "class9", name: "5" },
      { id: "class10", name: "6" },
      { id: "class11", name: "7" },
      { id: "class12", name: "8" },
      { id: "class13", name: "9" },
      { id: "class14", name: "10" },
    ]

    // Set demo sections
    const demoSections: Section[] = [
      { id: "section1", name: "A", classId: "class14" },
      { id: "section2", name: "B", classId: "class14" },
      { id: "section3", name: "C", classId: "class14" },
    ]

    // Set demo class teacher assignments
    const demoAssignments: ClassTeacherAssignment[] = [
      {
        teacherId: "demo123",
        classId: "class14",
        sectionId: "section1",
        academicYear: "2082",
        className: "10",
        sectionName: "A",
      },
    ]

    setClasses(demoClasses)
    setSections(demoSections)
    setClassTeacherAssignments(demoAssignments)

    // Set selected class and section based on teacher assignment
    setSelectedClassId("class14")
    setSelectedClassName("10")
    setSelectedSectionId("section1")
    setSelectedSectionName("A")

    // Create demo students
    const demoStudents: Student[] = Array.from({ length: 10 }, (_, i) => ({
      id: `student${i + 1}`,
      firstName: `Student`,
      middleName: "",
      lastName: `${i + 1}`,
      name: `Student ${i + 1}`,
      fatherName: `Father ${i + 1}`,
      motherName: `Mother ${i + 1}`,
      contactNumber: `98765${i.toString().padStart(5, "0")}`,
      dob: "2065-01-15",
      rollNumber: `${i + 1}`,
      grade: "10",
      section: "A",
      sectionId: "section1",
      symbolNumber: null,
      address: "Kathmandu",
      usesBus: i % 3 === 0,
      busRoute: i % 3 === 0 ? "Route A" : "",
      resultPdfUrl: "",
      subjects: [],
      totalMarks: 0,
      percentage: 0,
      rank: 0,
      attendance: 0,
      totalClasses: 0,
      monthlyFee: 1500,
      dues: i % 5 === 0 ? 1500 : 0,
      currentSubject: null,
      attendanceStatus: i % 3 === 0 ? "present" : i % 3 === 1 ? "absent" : "late",
      attendanceId: `attendance${i}`,
      isSelected: false,
      qrCode: null,
      profilePictureUrl: null,
      transportationFee: i % 3 === 0 ? 500 : 0,
    }))

    setStudents(demoStudents)
    setAllStudents(demoStudents)
    setLoading(false)
  }

  const checkTeacherPermission = async (teacherId: string) => {
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)
        setHasPermission(true)

        // Load teacher's assigned classes and sections
        await loadTeacherAssignments(teacherData)
      } else {
        setHasPermission(false)
        setPermissionMessage("Teacher account not found")
      }
    } catch (error: any) {
      console.error("Error checking teacher permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
      setError(`Error checking teacher permission: ${error.message}`)
    }
  }

  const loadTeacherAssignments = async (teacherData: Teacher) => {
    try {
      // First, load all classes
      await loadClasses()

      // If teacher is a class teacher, check for their assigned class and section
      if (teacherData.roles?.includes("class_teacher")) {
        // Check class_teachers collection for assignments
        const classTeachersQuery = query(collection(db, "class_teachers"), where("teacherId", "==", teacherData.id))
        const classTeachersSnapshot = await getDocs(classTeachersQuery)

        if (!classTeachersSnapshot.empty) {
          const assignments: ClassTeacherAssignment[] = []

          for (const docSnapshot of classTeachersSnapshot.docs) {
            const data = docSnapshot.data() as ClassTeacherAssignment

            // Store the assignment data
            const assignment: ClassTeacherAssignment = {
              teacherId: data.teacherId,
              classId: data.classId,
              sectionId: data.sectionId,
              academicYear: data.academicYear,
            }

            // Get class name
            if (data.classId) {
              try {
                const classDocRef = doc(db, "classes", data.classId)
                const classDoc = await getDoc(classDocRef)
                if (classDoc.exists()) {
                  assignment.className = classDoc.data().name
                }
              } catch (error) {
                console.error("Error getting class name:", error)
              }
            }

            // Get section name
            if (data.sectionId) {
              try {
                const sectionDocRef = doc(db, "sections", data.sectionId)
                const sectionDoc = await getDoc(sectionDocRef)
                if (sectionDoc.exists()) {
                  assignment.sectionName = sectionDoc.data().name
                }
              } catch (error) {
                console.error("Error getting section name:", error)
              }
            }

            assignments.push(assignment)
          }

          setClassTeacherAssignments(assignments)

          // If there's at least one assignment, use the first one
          if (assignments.length > 0) {
            const firstAssignment = assignments[0]

            // Set selected class
            if (firstAssignment.classId) {
              setSelectedClassId(firstAssignment.classId)
              setSelectedClassName(firstAssignment.className || "")

              // Load sections for this class
              await loadSectionsForClass(firstAssignment.classId)

              // Now set the selected section
              if (firstAssignment.sectionId) {
                // Find the section in the loaded sections
                const matchingSection = sections.find((s) => s.id === firstAssignment.sectionId)

                if (matchingSection) {
                  setSelectedSectionId(matchingSection.id)
                  setSelectedSectionName(matchingSection.name)
                } else {
                  // If section not found in loaded sections, set it directly
                  setSelectedSectionId(firstAssignment.sectionId)
                  setSelectedSectionName(firstAssignment.sectionName || "")
                }
              }
            }
          } else {
            await fallbackToDefaultClassSection()
          }
        } else {
          // If no assignments found in class_teachers collection, check the legacy assignedClass field
          await fallbackToDefaultClassSection()
        }
      } else {
        // For other teachers, allow selection of any class
        await fallbackToDefaultClassSection()
      }
    } catch (error: any) {
      console.error("Error loading teacher assignments:", error)
      setError(`Error loading teacher assignments: ${error.message}`)
      await fallbackToDefaultClassSection()
    } finally {
      setLoading(false)
    }
  }

  const fallbackToDefaultClassSection = async () => {
    try {
      // Fallback to using the first available class and section
      if (classes.length > 0) {
        const firstClass = classes[0]
        setSelectedClassId(firstClass.id)
        setSelectedClassName(firstClass.name)

        // Load sections for this class
        await loadSectionsForClass(firstClass.id)

        // If there are sections, select the first one
        if (sections.length > 0) {
          const firstSection = sections[0]
          setSelectedSectionId(firstSection.id)
          setSelectedSectionName(firstSection.name)
        }
      }
    } catch (error: any) {
      console.error("Error in fallback:", error)
      setError(`Error in fallback: ${error.message}`)
    }
  }

  const loadClasses = async () => {
    try {
      // Query the classes collection
      const classesQuery = query(collection(db, "classes"))
      const classesSnapshot = await getDocs(classesQuery)

      if (!classesSnapshot.empty) {
        const classesList: Class[] = []

        classesSnapshot.forEach((doc) => {
          const data = doc.data()
          classesList.push({
            id: doc.id,
            name: data.name || data.displayName || doc.id,
            order: data.order || 0,
            sections: data.sections || [],
          })
        })

        // Sort by order if available, otherwise by name
        classesList.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order
          }
          return a.name.localeCompare(b.name)
        })

        setClasses(classesList)
      } else {
        // If no classes found, use default classes
        const defaultClasses: Class[] = [
          { id: "pg", name: "P.G" },
          { id: "nursery", name: "Nursery" },
          { id: "lkg", name: "LKG" },
          { id: "ukg", name: "UKG" },
          { id: "1", name: "1" },
          { id: "2", name: "2" },
          { id: "3", name: "3" },
          { id: "4", name: "4" },
          { id: "5", name: "5" },
          { id: "6", name: "6" },
          { id: "7", name: "7" },
          { id: "8", name: "8" },
          { id: "9", name: "9" },
          { id: "10", name: "10" },
        ]

        setClasses(defaultClasses)
      }
    } catch (error: any) {
      console.error("Error loading classes:", error)
      setError(`Error loading classes: ${error.message}`)

      // Set default classes on error
      const defaultClasses: Class[] = [
        { id: "pg", name: "P.G" },
        { id: "nursery", name: "Nursery" },
        { id: "lkg", name: "LKG" },
        { id: "ukg", name: "UKG" },
        { id: "1", name: "1" },
        { id: "2", name: "2" },
        { id: "3", name: "3" },
        { id: "4", name: "4" },
        { id: "5", name: "5" },
        { id: "6", name: "6" },
        { id: "7", name: "7" },
        { id: "8", name: "8" },
        { id: "9", name: "9" },
        { id: "10", name: "10" },
      ]

      setClasses(defaultClasses)
    }
  }

  const loadSectionsForClass = async (classId: string) => {
    try {
      // Reset sections array
      setSections([])

      // First check if the class has sections array
      const classObj = classes.find((c) => c.id === classId)

      if (classObj && classObj.sections && classObj.sections.length > 0) {
        // Load sections from the sections array in the class document
        const sectionsList: Section[] = []

        for (const sectionId of classObj.sections) {
          try {
            const sectionDocRef = doc(db, "sections", sectionId)
            const sectionDoc = await getDoc(sectionDocRef)

            if (sectionDoc.exists()) {
              const sectionData = sectionDoc.data()
              sectionsList.push({
                id: sectionDoc.id,
                name: sectionData.name || sectionDoc.id,
                classId: classId,
              })
            }
          } catch (error) {
            console.error(`Error loading section ${sectionId}:`, error)
          }
        }

        setSections(sectionsList)
      } else {
        // If no sections in class document, query the sections collection
        const sectionsQuery = query(collection(db, "sections"), where("classId", "==", classId))
        const sectionsSnapshot = await getDocs(sectionsQuery)

        if (!sectionsSnapshot.empty) {
          const sectionsList: Section[] = []

          sectionsSnapshot.forEach((doc) => {
            const data = doc.data()
            sectionsList.push({
              id: doc.id,
              name: data.name || doc.id,
              classId: classId,
            })
          })

          setSections(sectionsList)
        } else {
          // If no sections found, create default sections A, B, C
          const defaultSections: Section[] = [
            { id: "A", name: "A", classId: classId },
            { id: "B", name: "B", classId: classId },
            { id: "C", name: "C", classId: classId },
          ]

          setSections(defaultSections)
        }
      }
    } catch (error: any) {
      console.error("Error loading sections:", error)
      setError(`Error loading sections: ${error.message}`)

      // Set default sections on error
      const defaultSections: Section[] = [
        { id: "A", name: "A", classId: classId },
        { id: "B", name: "B", classId: classId },
        { id: "C", name: "C", classId: classId },
      ]

      setSections(defaultSections)
    }
  }

  // Load all students at once
  const loadAllStudents = async () => {
    setLoading(true)
    setError(null)

    try {
      const studentsQuery = query(collection(db, "students"))
      const querySnapshot = await getDocs(studentsQuery)

      const studentsList: Student[] = []

      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const student = doc.data() as Student
          student.id = doc.id
          student.attendanceStatus = ""
          student.attendanceId = ""
          studentsList.push(student)
        })

        setAllStudents(studentsList)

        // If we have a class and section selected, filter the students
        if (selectedClassName) {
          filterStudentsByClassAndSection(studentsList)
        }
      } else {
        setStudents([])
      }
    } catch (error: any) {
      console.error("Error loading all students:", error)
      setError(`Error loading all students: ${error.message}`)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  // Filter students from the already loaded allStudents array
  const filterStudentsByClassAndSection = (studentsList = allStudents) => {
    if (!selectedClassName || studentsList.length === 0) return

    setLoading(true)

    try {
      // Create arrays of possible grade values to match against
      const possibleGradeValues = [
        selectedClassName,
        selectedClassName.toLowerCase(),
        selectedClassName.toUpperCase(),
        `Class ${selectedClassName}`,
        `class ${selectedClassName}`,
        `CLASS ${selectedClassName}`,
      ]

      // For numeric grades, add the number version
      if (!isNaN(Number(selectedClassName))) {
        possibleGradeValues.push(Number(selectedClassName).toString())
      }

      // Create arrays of possible section values
      const possibleSectionValues = selectedSectionName
        ? [
            selectedSectionName,
            selectedSectionName.toLowerCase(),
            selectedSectionName.toUpperCase(),
            `Section ${selectedSectionName}`,
            `section ${selectedSectionName}`,
            `SECTION ${selectedSectionName}`,
          ]
        : []

      // Filter students based on class and section
      const filteredStudents = studentsList.filter((student) => {
        // Check if student matches the class
        const matchesClass = possibleGradeValues.includes(student.grade) || student.classId === selectedClassId

        // If no section is selected, or if the student matches the section
        const matchesSection =
          !selectedSectionName ||
          possibleSectionValues.includes(student.section) ||
          student.sectionId === selectedSectionId

        return matchesClass && matchesSection
      })

      // Sort by roll number
      filteredStudents.sort((a, b) => {
        const rollA = Number.parseInt(a.rollNumber) || Number.MAX_SAFE_INTEGER
        const rollB = Number.parseInt(b.rollNumber) || Number.MAX_SAFE_INTEGER
        return rollA - rollB
      })

      setStudents(filteredStudents)

      // Load attendance for the current date
      if (dateString && filteredStudents.length > 0) {
        loadAttendanceForDate(filteredStudents)
      }
    } catch (error: any) {
      console.error("Error filtering students:", error)
      setError(`Error filtering students: ${error.message}`)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const loadAttendanceForDate = async (studentsList: Student[] = students) => {
    if (!dateString || studentsList.length === 0) return

    setRefreshing(true)

    // Reset attendance status for all students
    const updatedStudents = studentsList.map((student) => ({
      ...student,
      attendanceStatus: "",
      attendanceId: "",
    }))

    try {
      // For each student, check if there's an attendance record for this date
      for (const student of updatedStudents) {
        // First try to find by BS date
        let attendanceQuery = query(
          collection(db, "attendance"),
          where("studentId", "==", student.id),
          where("bsDate", "==", bsDateString),
        )

        let querySnapshot = await getDocs(attendanceQuery)

        // If not found by BS date, try AD date (for backward compatibility)
        if (querySnapshot.empty) {
          attendanceQuery = query(
            collection(db, "attendance"),
            where("studentId", "==", student.id),
            where("date", "==", dateString),
          )
          querySnapshot = await getDocs(attendanceQuery)
        }

        if (!querySnapshot.empty) {
          const attendanceDoc = querySnapshot.docs[0]
          const attendance = attendanceDoc.data() as Attendance
          student.attendanceStatus = attendance.status
          student.attendanceId = attendanceDoc.id
        }
      }

      setStudents([...updatedStudents])
    } catch (error: any) {
      console.error("Error loading attendance:", error)
      setError(`Error loading attendance: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  const saveAttendance = async (student: Student, status: string) => {
    setRefreshing(true)
    setError(null)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // In demo mode, just update the local state
        setStudents(
          students.map((s) =>
            s.id === student.id ? { ...s, attendanceStatus: status, attendanceId: "demo-attendance-id" } : s,
          ),
        )
      } else {
        const attendance: Attendance = {
          studentId: student.id,
          date: dateString,
          bsDate: bsDateString,
          bsYear: currentBsDate.year,
          bsMonth: currentBsDate.month,
          bsDay: currentBsDate.day,
          status: status,
          teacherId: currentTeacher?.id || "",
          teacherName: currentTeacher?.name || "",
          grade: selectedClassName,
          section: selectedSectionName,
          sectionId: selectedSectionId,
          classId: selectedClassId,
        }

        if (student.attendanceId) {
          // Update existing attendance record
          await setDoc(doc(db, "attendance", student.attendanceId), attendance)
        } else {
          // Create new attendance record
          const docRef = await addDoc(collection(db, "attendance"), attendance)
          student.attendanceId = docRef.id
        }

        // Update local state
        setStudents(
          students.map((s) =>
            s.id === student.id ? { ...s, attendanceStatus: status, attendanceId: student.attendanceId } : s,
          ),
        )
      }
    } catch (error: any) {
      console.error("Error saving attendance:", error)
      setError(`Error saving attendance: ${error.message}`)
      alert(`Error saving attendance: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDateChange = (date: BsDate) => {
    setCurrentBsDate(date)
    setCurrentDate(date.adDate)
  }

  const formatBsDate = () => {
    if (showNepaliDigits) {
      return `${toNepaliDigits(currentBsDate.year)} ${nepaliMonths[currentBsDate.month - 1]} ${toNepaliDigits(currentBsDate.day)}`
    }
    return `${currentBsDate.year} ${nepaliMonths[currentBsDate.month - 1]} ${currentBsDate.day}`
  }

  // Format AD date
  const formatAdDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
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
          <CardContent className="pt-6">
            <p className="text-red-500">{permissionMessage}</p>
            <Button className="mt-4" onClick={() => router.push("/teacher/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Attendance Management</h1>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Date Navigation with Nepali Date Picker */}
      <Card className="mb-6 bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-md">
              <NepaliDatePicker
                value={currentBsDate}
                onChange={handleDateChange}
                showNepaliDigits={showNepaliDigits}
                className="bg-white rounded-md text-foreground"
              />
            </div>

            <div className="mt-4 text-center">
              <p className="text-lg font-medium">{formatBsDate()}</p>
              <p className="text-sm opacity-90">{formatAdDate(currentDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class and Section Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Class</label>
          <Select
            value={selectedClassId}
            onValueChange={(value) => {
              const classObj = classes.find((c) => c.id === value)
              setSelectedClassId(value)
              setSelectedClassName(classObj ? classObj.name : "")
              loadSectionsForClass(value)
            }}
            disabled={currentTeacher?.roles?.includes("class_teacher") && classTeacherAssignments.length > 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select class">
                {selectedClassName
                  ? selectedClassName.includes("P.G") ||
                    selectedClassName.includes("LKG") ||
                    selectedClassName.includes("UKG") ||
                    selectedClassName.includes("Nursery")
                    ? selectedClassName
                    : `Class ${selectedClassName}`
                  : "Select class"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name.includes("P.G") ||
                  cls.name.includes("LKG") ||
                  cls.name.includes("UKG") ||
                  cls.name.includes("Nursery")
                    ? cls.name
                    : `Class ${cls.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Section</label>
          <Select
            value={selectedSectionId}
            onValueChange={(value) => {
              const sectionObj = sections.find((s) => s.id === value)
              setSelectedSectionId(value)
              setSelectedSectionName(sectionObj ? sectionObj.name : "")
              filterStudentsByClassAndSection()
            }}
            disabled={
              (currentTeacher?.roles?.includes("class_teacher") && classTeacherAssignments.length > 0) ||
              !selectedClassId ||
              sections.length === 0
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select section">{selectedSectionName || "Select section"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Class Teacher Assignment Info */}
      {currentTeacher?.roles?.includes("class_teacher") && classTeacherAssignments.length > 0 && (
        <Card className="mb-6 bg-muted">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You are assigned as class teacher for{" "}
                {selectedClassName
                  ? selectedClassName.includes("P.G") ||
                    selectedClassName.includes("LKG") ||
                    selectedClassName.includes("UKG") ||
                    selectedClassName.includes("Nursery")
                    ? selectedClassName
                    : `Class ${selectedClassName}`
                  : ""}
                {selectedSectionName ? ` Section ${selectedSectionName}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reload Students Button */}
      <div className="flex justify-end mb-6">
        <Button onClick={() => loadAllStudents()} variant="outline" className="mr-2" disabled={loading || refreshing}>
          {(loading || refreshing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Reload All Students
        </Button>
        <Button
          onClick={() => filterStudentsByClassAndSection()}
          variant="outline"
          disabled={loading || refreshing || !selectedClassName}
        >
          {(loading || refreshing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Filter Students
        </Button>
      </div>

      {/* Attendance Legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge className="bg-green-500 hover:bg-green-600">Present</Badge>
        <Badge className="bg-red-500 hover:bg-red-600">Absent</Badge>
        <Badge className="bg-yellow-500 hover:bg-yellow-600">Late</Badge>
      </div>

      {/* Students List */}
      <h2 className="text-xl font-semibold mb-4">
        Students List
        {selectedClassName && selectedSectionName && (
          <span className="text-base font-normal ml-2 text-muted-foreground">
            (
            {selectedClassName.includes("P.G") ||
            selectedClassName.includes("LKG") ||
            selectedClassName.includes("UKG") ||
            selectedClassName.includes("Nursery")
              ? selectedClassName
              : `Class ${selectedClassName}`}{" "}
            - Section {selectedSectionName})
          </span>
        )}
        <span className="text-base font-normal ml-2 text-muted-foreground">({students.length} students)</span>
      </h2>

      {loading || refreshing ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : students.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Roll No.</th>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Grade</th>
                    <th className="text-left p-4">Section</th>
                    <th className="text-left p-4">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="p-4">
                        {showNepaliDigits ? toNepaliDigits(Number(student.rollNumber)) : student.rollNumber}
                      </td>
                      <td className="p-4">{student.name}</td>
                      <td className="p-4">{student.grade}</td>
                      <td className="p-4">{student.section}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={student.attendanceStatus === "present" ? "default" : "outline"}
                            className={student.attendanceStatus === "present" ? "bg-green-500 hover:bg-green-600" : ""}
                            onClick={() => saveAttendance(student, "present")}
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant={student.attendanceStatus === "absent" ? "default" : "outline"}
                            className={student.attendanceStatus === "absent" ? "bg-red-500 hover:bg-red-600" : ""}
                            onClick={() => saveAttendance(student, "absent")}
                          >
                            Absent
                          </Button>
                          <Button
                            size="sm"
                            variant={student.attendanceStatus === "late" ? "default" : "outline"}
                            className={student.attendanceStatus === "late" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                            onClick={() => saveAttendance(student, "late")}
                          >
                            Late
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {selectedClassId ? "No students found for this class and section" : "Please select a class and section"}
        </div>
      )}
    </div>
  )
}
