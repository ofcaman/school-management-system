"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Loader2, RefreshCcw, Printer, Eye } from "lucide-react"
import { format } from "date-fns"
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
  orderBy,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { firebaseConfig } from "@/lib/firebase-config"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Types
interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  qualification: string
  profileImageUrl: string
  roles: string[]
  assignedClass: string
  active: boolean
}

interface Student {
  id: string
  name: string
  fatherName: string
  motherName: string
  dob: string
  rollNumber: string
  grade: string
  section?: string
  sectionId?: string
  symbolNumber: string | null
  address: string
  contactNumber: string
  resultPdfUrl?: string
}

interface Subject {
  id: string
  name: string
  theoryMarks: number
  practicalMarks: number
  finalGrade: string
  gradePoint: number
  maxTheoryMarks: number
  maxPracticalMarks: number
  hasPractical: boolean
  totalMarks: number
  examTerm: string
  creditHours: number
}

interface Attendance {
  id: string
  studentId: string
  date: Date
  status: string
  grade: string
  section?: string
  sectionId?: string
}

interface StudentWithMarks {
  student: Student
  totalMarks: number
  subjects: Subject[]
  rank: number
  attendanceList: Attendance[]
  gpa?: number
  percentage: number // UPDATED: Made required and consistent
}

interface ExamTerm {
  id: string
  name: string
  academicYear: string
  startDate: Date
  endDate: Date
  isActive: boolean
}

interface GeneratedReport {
  id: string
  grade: string
  section?: string
  sectionId?: string
  examTerm: string
  generatedBy: string
  generatedAt: Date
  batchId: string
  totalStudents: number
  successfulReports: number
  failedReports: number
  reportPath: string
  summaryUrl?: string
}

interface Section {
  id: string
  name: string
  grade: string
  classId?: string
}

interface Class {
  id: string
  name: string
  displayName: string
  sections?: string[]
}

export default function GenerateReportPage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStatus, setGenerationStatus] = useState("")
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [sections, setSections] = useState<Section[]>([])
  const [selectedExamTerm, setSelectedExamTerm] = useState("")
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([])
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null)
  const [reportData, setReportData] = useState<StudentWithMarks[]>([])
  const [viewingReport, setViewingReport] = useState<string | null>(null)
  const [printingReport, setPrintingReport] = useState<string | null>(null)
  const printFrameRef = useRef<HTMLIFrameElement>(null)
  const [studentGradeSheets, setStudentGradeSheets] = useState<{ id: string; name: string; url: string }[]>([])
  const [batchPrinting, setBatchPrinting] = useState(false)
  const [loadingSections, setLoadingSections] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [gradeNameMap, setGradeNameMap] = useState<Map<string, string>>(new Map())

  // NEW: Fixed total marks system
  const getFixedTotalMarks = (grade: string): number => {
  const gradeNum = Number.parseInt(grade);

  if (!isNaN(gradeNum)) {
    if (gradeNum >= 1 && gradeNum <= 5) {
      return 700;
    }
    if (gradeNum === 6) {
      return 800; // Make sure comment and value match
    }
  }

  // Handle non-numeric grades
  switch (grade) {
    case "P.G":
    case "Nursery":
      return 650;
    case "Lkg":
    case "Ukg":
      return 800;
    default:
      return 650; // Default fallback
  }
};


  // NEW: Function to calculate percentage using fixed total marks
  const calculatePercentage = (obtainedMarks: number, grade: string): number => {
    const fixedTotalMarks = getFixedTotalMarks(grade)
    return (obtainedMarks / fixedTotalMarks) * 100
  }

  // Add a new diagnostic function at the top of the component (after the state declarations)
  const runDiagnosticForNursery = async () => {
    console.log("🔍 RUNNING NURSERY DIAGNOSTIC 🔍")
    try {
      // 1. Check classes collection
      console.log("Checking classes collection...")
      const classesSnapshot = await getDocs(collection(db, "classes"))
      console.log(`Found ${classesSnapshot.size} classes`)
      classesSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`Class: ${doc.id} - name: ${data.name}, displayName: ${data.displayName}`)
        if (data.name === "Nursery" || data.displayName === "Nursery") {
          console.log("FOUND NURSERY CLASS:", {
            id: doc.id,
            name: data.name,
            displayName: data.displayName,
            sections: data.sections,
          })
        }
      })

      // 2. Check sections collection
      console.log("\nChecking sections collection...")
      const sectionsSnapshot = await getDocs(collection(db, "sections"))
      console.log(`Found ${sectionsSnapshot.size} sections`)
      const nurserySections = []
      sectionsSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.grade === "Nursery" || data.classId === selectedClassId) {
          nurserySections.push({
            id: doc.id,
            name: data.name,
            grade: data.grade,
            classId: data.classId,
          })
          console.log("FOUND NURSERY SECTION:", {
            id: doc.id,
            name: data.name,
            grade: data.grade,
            classId: data.classId,
          })
        }
      })

      // 3. Check students collection
      console.log("\nChecking students collection...")
      // Try different approaches to find Nursery students
      const approaches = [
        { field: "grade", value: "Nursery", name: "grade=Nursery" },
        { field: "grade", value: "nursery", name: "grade=nursery" },
        { field: "grade", value: "2", name: "grade=2" },
        { field: "class", value: "Nursery", name: "class=Nursery" },
        { field: "class", value: "nursery", name: "class=nursery" },
        { field: "class", value: "2", name: "class=2" },
        { field: "className", value: "Nursery", name: "className=Nursery" },
        { field: "className", value: "nursery", name: "className=nursery" },
        { field: "className", value: "2", name: "className=2" },
      ]

      for (const approach of approaches) {
        try {
          const studentsQuery = query(collection(db, "students"), where(approach.field, "==", approach.value))
          const studentsSnapshot = await getDocs(studentsQuery)
          console.log(`${approach.name}: Found ${studentsSnapshot.size} students`)
          if (studentsSnapshot.size > 0) {
            console.log("SAMPLE STUDENT DATA:")
            const sampleDoc = studentsSnapshot.docs[0]
            console.log({
              id: sampleDoc.id,
              ...sampleDoc.data(),
            })
          }
        } catch (error) {
          console.log(`Error with ${approach.name}:`, error)
        }
      }

      // 4. Check if any students have sectionId matching our sections
      if (nurserySections.length > 0) {
        console.log("\nChecking students by sectionId...")
        for (const section of nurserySections) {
          try {
            const studentsQuery = query(collection(db, "students"), where("sectionId", "==", section.id))
            const studentsSnapshot = await getDocs(studentsQuery)
            console.log(`sectionId=${section.id} (${section.name}): Found ${studentsSnapshot.size} students`)
            if (studentsSnapshot.size > 0) {
              console.log("SAMPLE STUDENT DATA:")
              const sampleDoc = studentsSnapshot.docs[0]
              console.log({
                id: sampleDoc.id,
                ...sampleDoc.data(),
              })
            }
          } catch (error) {
            console.log(`Error with sectionId=${section.id}:`, error)
          }
        }
      }

      // 5. Check attendance collection to find students
      console.log("\nChecking attendance collection for Nursery students...")
      try {
        const attendanceQuery = query(collection(db, "attendance"), where("grade", "==", "Nursery"))
        const attendanceSnapshot = await getDocs(attendanceQuery)
        console.log(`Found ${attendanceSnapshot.size} attendance records for Nursery`)
        if (attendanceSnapshot.size > 0) {
          const studentIds = new Set()
          attendanceSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.studentId) {
              studentIds.add(data.studentId)
            }
          })
          console.log(`Found ${studentIds.size} unique student IDs in attendance records`)
          if (studentIds.size > 0) {
            // Get a sample student
            const sampleStudentId = Array.from(studentIds)[0]
            const studentDoc = await getDoc(doc(db, "students", sampleStudentId))
            if (studentDoc.exists()) {
              console.log("SAMPLE STUDENT FROM ATTENDANCE:")
              console.log({
                id: studentDoc.id,
                ...studentDoc.data(),
              })
            }
          }
        }
      } catch (error) {
        console.log("Error checking attendance:", error)
      }

      console.log("🔍 NURSERY DIAGNOSTIC COMPLETE 🔍")
    } catch (error) {
      console.error("Error in diagnostic:", error)
    }
  }

  // Add this diagnostic function to help identify subject data issues
  // Add this after the runDiagnosticForNursery function
  const runSubjectDiagnostic = async (studentId: string, examTerm: string) => {
    console.log(`🔍 RUNNING SUBJECT DIAGNOSTIC FOR STUDENT ${studentId} 🔍`)
    try {
      // 1. Check if the student exists
      const studentDoc = await getDoc(doc(db, "students", studentId))
      if (!studentDoc.exists()) {
        console.log(`Student ${studentId} does not exist`)
        return
      }

      const studentData = studentDoc.data()
      console.log("Student data:", {
        id: studentId,
        name:
          studentData.name ||
          `${studentData.firstName || ""} ${studentData.middleName || ""} ${studentData.lastName || ""}`.trim(),
        grade: studentData.grade,
        section: studentData.section,
        sectionId: studentData.sectionId,
      })

      // 2. Check subjects collection structure
      console.log(`Checking subjects collection structure for student ${studentId}`)
      // First try the standard path: students/{studentId}/subjects
      try {
        const standardPath = collection(db, "students", studentId, "subjects")
        const standardSnapshot = await getDocs(standardPath)
        console.log(`Found ${standardSnapshot.size} subjects in standard path (students/${studentId}/subjects)`)
        if (standardSnapshot.size > 0) {
          console.log("Sample subject data:")
          standardSnapshot.docs.slice(0, 2).forEach((doc) => {
            console.log({
              id: doc.id,
              ...doc.data(),
            })
          })
        }
      } catch (error) {
        console.error("Error checking standard subjects path:", error)
      }

      // Try alternative paths
      const alternativePaths = [
        { path: `subjects`, filter: "studentId", value: studentId, name: "subjects collection with studentId filter" },
        { path: `marks`, filter: "studentId", value: studentId, name: "marks collection with studentId filter" },
        { path: `student_subjects`, filter: "studentId", value: studentId, name: "student_subjects collection" },
        { path: `student_marks`, filter: "studentId", value: studentId, name: "student_marks collection" },
      ]

      for (const pathInfo of alternativePaths) {
        try {
          const altQuery = query(collection(db, pathInfo.path), where(pathInfo.filter, "==", pathInfo.value))
          const altSnapshot = await getDocs(altQuery)
          console.log(`Found ${altSnapshot.size} documents in ${pathInfo.name}`)
          if (altSnapshot.size > 0) {
            console.log("Sample data:")
            altSnapshot.docs.slice(0, 2).forEach((doc) => {
              console.log({
                id: doc.id,
                ...doc.data(),
              })
            })
          }
        } catch (error) {
          console.error(`Error checking ${pathInfo.name}:`, error)
        }
      }

      // 3. Check for exam term specific collections
      try {
        const examTermPath = collection(db, "exam_results")
        const examTermQuery = query(
          examTermPath,
          where("studentId", "==", studentId),
          where("examTerm", "==", examTerm),
        )
        const examTermSnapshot = await getDocs(examTermQuery)
        console.log(`Found ${examTermSnapshot.size} documents in exam_results for term ${examTerm}`)
        if (examTermSnapshot.size > 0) {
          console.log("Sample exam result data:")
          examTermSnapshot.docs.slice(0, 2).forEach((doc) => {
            console.log({
              id: doc.id,
              ...doc.data(),
            })
          })
        }
      } catch (error) {
        console.error("Error checking exam_results:", error)
      }

      console.log(`🔍 SUBJECT DIAGNOSTIC COMPLETE FOR STUDENT ${studentId} 🔍`)
    } catch (error) {
      console.error("Error in subject diagnostic:", error)
    }
  }

  // Add this function to help debug the report viewing issue
  // Add it right after the runSubjectDiagnostic function
  const debugReportData = (report: GeneratedReport) => {
    console.log("🔍 DEBUGGING REPORT DATA 🔍")
    console.log("Report details:", {
      id: report.id,
      grade: report.grade,
      section: report.section,
      sectionId: report.sectionId,
      examTerm: report.examTerm,
      totalStudents: report.totalStudents,
      successfulReports: report.successfulReports,
      failedReports: report.failedReports,
    })

    // Check if the report exists in Firestore
    getDoc(doc(db, "generated_reports", report.id))
      .then((docSnap) => {
        if (docSnap.exists()) {
          console.log("Report exists in Firestore:", docSnap.data())
        } else {
          console.log("Report does not exist in Firestore!")
        }
      })
      .catch((error) => {
        console.error("Error checking report in Firestore:", error)
      })

    // Check for students in this grade
    const studentsQuery = query(collection(db, "students"), where("grade", "==", report.grade))
    getDocs(studentsQuery)
      .then((snapshot) => {
        console.log(`Found ${snapshot.size} students with grade=${report.grade}`)
        if (snapshot.size > 0) {
          console.log("Sample student:", snapshot.docs[0].data())
        }
      })
      .catch((error) => {
        console.error("Error checking students:", error)
      })

    // Check for subjects
    console.log(`Checking subjects for sample student`)
    if (reportData.length > 0) {
      const sampleStudentId = reportData[0].student.id
      console.log(`Checking subjects for sample student ${sampleStudentId}`)
      getDocs(collection(db, "students", sampleStudentId, "subjects"))
        .then((subjectsSnapshot) => {
          console.log(`Found ${subjectsSnapshot.size} subjects for sample student`)
          if (subjectsSnapshot.size > 0) {
            console.log("Sample subject:", subjectsSnapshot.docs[0].data())
          }
        })
        .catch((error) => {
          console.error("Error checking subjects:", error)
        })
    }

    console.log("🔍 DEBUG COMPLETE 🔍")
  }

  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  // Updated grades array to match your database values exactly
  const grades = ["P.G", "Nursery", "Lkg", "Ukg", "1", "2", "3", "4", "5", "6"]

  // NEW: Function to get fixed total marks based on grade
  // Helper function to get grade from marks
  const getGradeFromMarks = (marks: number, maxMarks = 100): string => {
    const percentage = (marks / maxMarks) * 100
    if (percentage >= 91) return "A+"
    if (percentage >= 81) return "A"
    if (percentage >= 71) return "B+"
    if (percentage >= 61) return "B"
    if (percentage >= 51) return "C+"
    if (percentage >= 41) return "C"
    if (percentage >= 35) return "D"
    return "NG"
  }

  // Helper function to get all unique subject names from report data
  const getAllSubjectNames = (studentsData: StudentWithMarks[]): string[] => {
    const subjectNames = new Set<string>()
    studentsData.forEach((student) => {
      student.subjects.forEach((subject) => {
        subjectNames.add(subject.name)
      })
    })
    return Array.from(subjectNames).sort()
  }

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }
    checkPermission()
    loadClasses()
  }, [teacherId, router])

  // Update the useEffect for selectedGrade to handle the class selection better
  useEffect(() => {
    if (selectedGrade) {
      // Find the class object for the selected grade
      const selectedClass = classes.find((c) => c.displayName === selectedGrade || c.name === selectedGrade)
      console.log("Selected grade changed to:", selectedGrade)
      console.log("Found matching class:", selectedClass ? `${selectedClass.name} (${selectedClass.id})` : "none")
      if (selectedClass) {
        setSelectedClassId(selectedClass.id)
        loadSections(selectedClass)
      } else {
        console.log("No matching class found for grade:", selectedGrade)
        setSections([])
        setSelectedSection("")
      }
    } else {
      setSections([])
      setSelectedSection("")
    }
  }, [selectedGrade, classes])

  const checkPermission = async () => {
    setPermissionChecking(true)
    try {
      // Get the current user (teacher) document
      const currentTeacherDoc = await getDoc(doc(db, "teachers", teacherId as string))
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
        setPermissionMessage("You don't have permission to generate reports")
        setPermissionChecking(false)
        return
      }

      setHasPermission(true)
      loadExamTerms()
      loadGeneratedReports()
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
      setLoading(false)
    }
  }

  // Update the loadClasses function to better handle the class data and add more logging
  const loadClasses = async () => {
    try {
      console.log("Loading classes from database...")
      // Get classes from the classes collection
      const classesQuery = query(collection(db, "classes"))
      const classesSnapshot = await getDocs(classesQuery)

      if (classesSnapshot.empty) {
        console.log("No classes found in database, using fallback grades")
        // Fallback to hardcoded grades
        const classesList = grades.map((grade) => ({
          id: grade,
          name: grade,
          displayName: grade,
        }))
        setClasses(classesList)
        // Create a mapping of displayName to name for later use
        const nameMap = new Map<string, string>()
        classesList.forEach((c) => {
          nameMap.set(c.displayName, c.name)
        })
        setGradeNameMap(nameMap)
        if (classesList.length > 0) {
          setSelectedGrade(classesList[0].name)
        }
        return
      }

      const classesList: Class[] = []
      const nameMap = new Map<string, string>()

      classesSnapshot.forEach((doc) => {
        const data = doc.data()
        const name = data.name || ""
        const displayName = data.displayName || data.name || ""

        classesList.push({
          id: doc.id,
          name: name,
          displayName: displayName,
          sections: data.sections || [],
        })

        // Store the mapping between displayName and name
        nameMap.set(displayName, name)
      })

      setGradeNameMap(nameMap)
      console.log(
        "Found classes:",
        classesList.map((c) => ({
          id: c.id,
          name: c.name,
          displayName: c.displayName,
          sectionsCount: c.sections?.length || 0,
        })),
      )
      console.log("Grade name mapping:", Object.fromEntries(nameMap))

      // Sort classes by name
      classesList.sort((a, b) => {
        // Try to sort numerically if possible
        const aNum = Number.parseInt(a.name)
        const bNum = Number.parseInt(b.name)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }
        // Otherwise sort alphabetically
        return a.name.localeCompare(b.name)
      })

      setClasses(classesList)

      // Select the first class by default
      if (classesList.length > 0) {
        const firstClass = classesList[0]
        console.log("Setting default class:", firstClass.displayName || firstClass.name)
        setSelectedGrade(firstClass.displayName || firstClass.name)
        setSelectedClassId(firstClass.id)
      }
    } catch (error: any) {
      console.error("Error loading classes:", error)
      toast({
        title: "Error",
        description: `Failed to load classes: ${error.message}`,
        variant: "destructive",
      })
      // Fallback to hardcoded grades
      const classesList = grades.map((grade) => ({
        id: grade,
        name: grade,
        displayName: grade,
      }))
      setClasses(classesList)
      // Create a mapping of displayName to name for later use
      const nameMap = new Map<string, string>()
      classesList.forEach((c) => {
        nameMap.set(c.displayName, c.name)
      })
      setGradeNameMap(nameMap)
      if (classesList.length > 0) {
        setSelectedGrade(classesList[0].name)
      }
    }
  }

  // Update the loadSections function to better handle section loading and add more logging
  const loadSections = async (selectedClass: Class) => {
    setLoadingSections(true)
    try {
      console.log(`Loading sections for class: ${selectedClass.name} (${selectedClass.id})`)
      const sectionsList: Section[] = []

      // If the class has sections array, use it to get section documents
      if (selectedClass.sections && selectedClass.sections.length > 0) {
        console.log(
          `Class ${selectedClass.name} has ${selectedClass.sections.length} sections in its array:`,
          selectedClass.sections,
        )
        for (const sectionId of selectedClass.sections) {
          try {
            console.log(`Fetching section document for ID: ${sectionId}`)
            const sectionDoc = await getDoc(doc(db, "sections", sectionId))
            if (sectionDoc.exists()) {
              const data = sectionDoc.data()
              sectionsList.push({
                id: sectionDoc.id,
                name: data.name || "",
                grade: selectedClass.name,
                classId: selectedClass.id,
              })
              console.log(`Found section: ${data.name} (${sectionDoc.id})`)
            } else {
              console.log(`Section document ${sectionId} does not exist`)
            }
          } catch (error) {
            console.error(`Error fetching section ${sectionId}:`, error)
          }
        }
      } else {
        // If no sections array, query the sections collection by classId
        console.log(`Looking for sections with classId = ${selectedClass.id}`)
        const sectionsQuery = query(collection(db, "sections"), where("classId", "==", selectedClass.id))
        const sectionsSnapshot = await getDocs(sectionsQuery)

        if (sectionsSnapshot.empty) {
          console.log(`No sections found with classId = ${selectedClass.id}`)
        } else {
          sectionsSnapshot.forEach((doc) => {
            const data = doc.data()
            sectionsList.push({
              id: doc.id,
              name: data.name || "",
              grade: selectedClass.name,
              classId: selectedClass.id,
            })
            console.log(`Found section: ${data.name} (${doc.id})`)
          })
        }
      }

      // If still no sections found, try one more approach - query by grade name
      if (sectionsList.length === 0) {
        console.log(`Trying to find sections by grade name: ${selectedClass.name}`)
        const sectionsQuery = query(collection(db, "sections"), where("grade", "==", selectedClass.name))
        const sectionsSnapshot = await getDocs(sectionsQuery)

        if (sectionsSnapshot.empty) {
          console.log(`No sections found with grade = ${selectedClass.name}`)
        } else {
          sectionsSnapshot.forEach((doc) => {
            const data = doc.data()
            sectionsList.push({
              id: doc.id,
              name: data.name || "",
              grade: selectedClass.name,
              classId: selectedClass.id,
            })
            console.log(`Found section: ${data.name} (${doc.id})`)
          })
        }
      }

      // Sort sections alphabetically
      sectionsList.sort((a, b) => a.name.localeCompare(b.name))

      console.log(`Found ${sectionsList.length} sections for class ${selectedClass.name}`)
      setSections(sectionsList)

      // If there's only one section, select it automatically
      if (sectionsList.length === 1) {
        console.log(`Auto-selecting the only section: ${sectionsList[0].name} (${sectionsList[0].id})`)
        setSelectedSection(sectionsList[0].id)
      } else if (sectionsList.length > 0) {
        setSelectedSection("") // Reset selection if multiple sections
      } else {
        setSelectedSection("")
        console.log(`No sections found for class: ${selectedClass.name}`)
      }
    } catch (error: any) {
      console.error("Error loading sections:", error)
      toast({
        title: "Error",
        description: `Failed to load sections: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoadingSections(false)
    }
  }

  const loadExamTerms = async () => {
    try {
      const currentYear = new Date().getFullYear()
      const academicYear =
        new Date().getMonth() < 3 ? `${currentYear - 1}-${currentYear}` : `${currentYear}-${currentYear + 1}`

      const examTermsQuery = query(
        collection(db, "exam_terms"),
        where("academicYear", "==", academicYear),
        orderBy("startDate"),
      )
      const querySnapshot = await getDocs(examTermsQuery)

      if (querySnapshot.empty) {
        toast({
          title: "No exam terms found",
          description: `No exam terms found for academic year ${academicYear}`,
          variant: "destructive",
        })
        return
      }

      const examTermsList: ExamTerm[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const examTerm: ExamTerm = {
          id: doc.id,
          name: data.name,
          academicYear: data.academicYear,
          startDate:
            data.startDate && typeof data.startDate.toDate === "function" ? data.startDate.toDate() : new Date(),
          endDate: data.endDate && typeof data.endDate.toDate === "function" ? data.endDate.toDate() : new Date(),
          isActive: data.isActive || false,
        }
        examTermsList.push(examTerm)
      })

      setExamTerms(examTermsList)
      if (examTermsList.length > 0) {
        setSelectedExamTerm(examTermsList[0].name)
      }
    } catch (error: any) {
      console.error("Error loading exam terms:", error)
      toast({
        title: "Error",
        description: `Failed to load exam terms: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const loadGeneratedReports = async () => {
    try {
      setRefreshing(true)
      const reportsQuery = query(
        collection(db, "generated_reports"),
        where("generatedBy", "==", teacherId),
        orderBy("generatedAt", "desc"),
      )
      const querySnapshot = await getDocs(reportsQuery)

      const reportsList: GeneratedReport[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const report: GeneratedReport = {
          id: doc.id,
          grade: data.grade,
          section: data.section,
          sectionId: data.sectionId,
          examTerm: data.examTerm,
          generatedBy: data.generatedBy,
          generatedAt:
            data.generatedAt && typeof data.generatedAt.toDate === "function" ? data.generatedAt.toDate() : new Date(),
          batchId: data.batchId,
          totalStudents: data.totalStudents || 0,
          successfulReports: data.successfulReports || 0,
          failedReports: data.failedReports || 0,
          reportPath: data.reportPath,
          summaryUrl: data.summaryUrl,
        }
        reportsList.push(report)
      })

      setGeneratedReports(reportsList)
    } catch (error: any) {
      console.error("Error loading generated reports:", error)
      toast({
        title: "Error",
        description: `Failed to load generated reports: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleGenerateReportsClick = () => {
    if (!selectedGrade) {
      toast({
        title: "Error",
        description: "Please select a grade",
        variant: "destructive",
      })
      return
    }

    if (!selectedExamTerm) {
      toast({
        title: "Error",
        description: "Please select an exam term",
        variant: "destructive",
      })
      return
    }

    setConfirmDialogOpen(true)
  }

  // UPDATED: handleGenerateReports function with fixed percentage calculation
  const handleGenerateReports = async () => {
    setConfirmDialogOpen(false)
    setGenerating(true)
    setGenerationProgress(0)
    setGenerationStatus("Preparing to generate reports...")

    // Debug information
    console.log("Starting report generation with:", {
      selectedGrade,
      selectedSection,
      selectedClassId,
      selectedExamTerm,
      sections: sections.map((s) => ({ id: s.id, name: s.name, grade: s.grade })),
    })

    // Special case for Nursery - run diagnostic if needed
    if (selectedGrade === "Nursery") {
      console.log("SPECIAL HANDLING FOR NURSERY GRADE")
      await runDiagnosticForNursery()
    }

    try {
      const startTime = Date.now()
      // Create a batch ID for this generation
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss")
      const sectionInfo =
        selectedSection && selectedSection !== "all"
          ? `_${sections.find((s) => s.id === selectedSection)?.name || ""}`
          : ""
      const batchId = `${selectedGrade}${sectionInfo}_${selectedExamTerm.replace(/\s+/g, "_")}_${timestamp}`

      // Step 1: Get students for the selected grade and section
      setGenerationStatus("Fetching students data...")
      // Use the selectedGrade directly since it matches your database values
      const gradeToQuery = selectedGrade

      console.log("Querying students with grade:", gradeToQuery)

      // Debug: Log what we're searching for
      console.log("🔍 STUDENT SEARCH DEBUG:", {
        selectedGrade,
        gradeToQuery,
        selectedSection,
        sectionName: selectedSection ? sections.find((s) => s.id === selectedSection)?.name : "none",
        classesAvailable: classes.map((c) => ({ id: c.id, name: c.name, displayName: c.displayName })),
      })

      // Try multiple approaches to find students
      let studentsSnapshot = null
      const students: Student[] = []

      // APPROACH 1: Direct query by grade field (this should work for your data structure)
      try {
        console.log("Approach 1: Querying students by exact grade field:", gradeToQuery)
        let studentsQuery = query(collection(db, "students"), where("grade", "==", gradeToQuery))

        // Add section filter if selected
        if (selectedSection && selectedSection !== "all") {
          console.log("Adding section filter:", selectedSection)
          studentsQuery = query(
            collection(db, "students"),
            where("grade", "==", gradeToQuery),
            where("sectionId", "==", selectedSection),
          )
        }

        studentsSnapshot = await getDocs(studentsQuery)
        console.log(`Approach 1: Found ${studentsSnapshot.size} students matching grade=${gradeToQuery}`)

        if (studentsSnapshot.size > 0) {
          studentsSnapshot.forEach((doc) => {
            const data = doc.data()
            console.log("Sample student data:", {
              id: doc.id,
              name: data.name,
              grade: data.grade,
              section: data.section,
              sectionId: data.sectionId,
            })
            students.push({
              id: doc.id,
              name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
              fatherName: data.fatherName || "",
              motherName: data.motherName || "",
              dob: data.dob || "",
              rollNumber: data.rollNumber || "",
              grade: data.grade || "",
              section: data.section || "",
              sectionId: data.sectionId || "",
              symbolNumber: data.symbolNumber || null,
              address: data.address || "",
              contactNumber: data.contactNumber || "",
              resultPdfUrl: data.resultPdfUrl || "",
            })
          })
        }
      } catch (error) {
        console.error("Error in approach 1:", error)
      }

      // APPROACH 2: Try without section filter if no students found and section was selected
      if (students.length === 0 && selectedSection && selectedSection !== "all") {
        try {
          console.log("Approach 2: Querying students by grade without section filter:", gradeToQuery)
          const studentsQuery = query(collection(db, "students"), where("grade", "==", gradeToQuery))
          studentsSnapshot = await getDocs(studentsQuery)
          console.log(
            `Approach 2: Found ${studentsSnapshot.size} students matching grade=${gradeToQuery} (no section filter)`,
          )

          if (studentsSnapshot.size > 0) {
            studentsSnapshot.forEach((doc) => {
              const data = doc.data()
              console.log("Sample student data (no section filter):", {
                id: doc.id,
                name: data.name,
                grade: data.grade,
                section: data.section,
                sectionId: data.sectionId,
              })
              // Only add students that match the section if section is selected
              if (
                !selectedSection ||
                selectedSection === "all" ||
                data.sectionId === selectedSection ||
                data.section === sections.find((s) => s.id === selectedSection)?.name
              ) {
                students.push({
                  id: doc.id,
                  name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
                  fatherName: data.fatherName || "",
                  motherName: data.motherName || "",
                  dob: data.dob || "",
                  rollNumber: data.rollNumber || "",
                  grade: data.grade || "",
                  section: data.section || "",
                  sectionId: data.sectionId || "",
                  symbolNumber: data.symbolNumber || null,
                  address: data.address || "",
                  contactNumber: data.contactNumber || "",
                  resultPdfUrl: data.resultPdfUrl || "",
                })
              }
            })
          }
        } catch (error) {
          console.error("Error in approach 2:", error)
        }
      }

      // APPROACH 3: Debug - Check what grades actually exist in the database
      if (students.length === 0) {
        try {
          console.log("Approach 3: Checking what grades actually exist in the database...")
          const allStudentsQuery = query(collection(db, "students"))
          const allStudentsSnapshot = await getDocs(allStudentsQuery)
          const gradesFound = new Set<string>()
          const sampleStudents: any[] = []

          allStudentsSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.grade) {
              gradesFound.add(data.grade)
            }
            if (sampleStudents.length < 10) {
              sampleStudents.push({
                id: doc.id,
                name: data.name,
                grade: data.grade,
                section: data.section,
                sectionId: data.sectionId,
              })
            }
          })

          console.log("All grades found in database:", Array.from(gradesFound).sort())
          console.log("Sample students:", sampleStudents)
          console.log(`Looking for grade: "${gradeToQuery}" (type: ${typeof gradeToQuery})`)

          // Try to find students with the exact grade again
          const exactGradeQuery = query(collection(db, "students"), where("grade", "==", gradeToQuery))
          const exactGradeSnapshot = await getDocs(exactGradeQuery)
          console.log(`Direct query for grade "${gradeToQuery}" returned ${exactGradeSnapshot.size} students`)
        } catch (error) {
          console.error("Error in approach 3:", error)
        }
      }

      // APPROACH 4: Try with string conversion (in case of type mismatch)
      if (students.length === 0) {
        try {
          const gradeAsString = String(gradeToQuery)
          console.log("Approach 4: Trying with string conversion:", gradeAsString)
          let studentsQuery = query(collection(db, "students"), where("grade", "==", gradeAsString))
          if (selectedSection && selectedSection !== "all") {
            studentsQuery = query(
              collection(db, "students"),
              where("grade", "==", gradeAsString),
              where("sectionId", "==", selectedSection),
            )
          }
          studentsSnapshot = await getDocs(studentsQuery)
          console.log(`Approach 4: Found ${studentsSnapshot.size} students matching grade=${gradeAsString}`)
          if (studentsSnapshot.size > 0) {
            studentsSnapshot.forEach((doc) => {
              const data = doc.data()
              students.push({
                id: doc.id,
                name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
                fatherName: data.fatherName || "",
                motherName: data.motherName || "",
                dob: data.dob || "",
                rollNumber: data.rollNumber || "",
                grade: data.grade || "",
                section: data.section || "",
                sectionId: data.sectionId || "",
                symbolNumber: data.symbolNumber || null,
                address: data.address || "",
                contactNumber: data.contactNumber || "",
                resultPdfUrl: data.resultPdfUrl || "",
              })
            })
          }
        } catch (error) {
          console.error("Error in approach 4:", error)
        }
      }

      // APPROACH 5: Try with just the section ID if we have one
      if (students.length === 0 && selectedSection && selectedSection !== "all") {
        try {
          console.log("Approach 5: Querying students by just sectionId:", selectedSection)
          const studentsQuery = query(collection(db, "students"), where("sectionId", "==", selectedSection))
          studentsSnapshot = await getDocs(studentsQuery)
          console.log(`Approach 5: Found ${studentsSnapshot.size} students matching sectionId=${selectedSection}`)
          if (studentsSnapshot.size > 0) {
            studentsSnapshot.forEach((doc) => {
              const data = doc.data()
              students.push({
                id: doc.id,
                name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
                fatherName: data.fatherName || "",
                motherName: data.motherName || "",
                dob: data.dob || "",
                rollNumber: data.rollNumber || "",
                grade: data.grade || "",
                section: data.section || "",
                sectionId: data.sectionId || "",
                symbolNumber: data.symbolNumber || null,
                address: data.address || "",
                contactNumber: data.contactNumber || "",
                resultPdfUrl: data.resultPdfUrl || "",
              })
            })
          }
        } catch (error) {
          console.error("Error in approach 5:", error)
        }
      }

      // APPROACH 6: Find students through attendance records
      if (students.length === 0) {
        try {
          console.log("Approach 6: Finding students through attendance records")
          // First get attendance records for this grade/section
          let attendanceQuery
          if (selectedSection && selectedSection !== "all") {
            attendanceQuery = query(
              collection(db, "attendance"),
              where("grade", "==", gradeToQuery),
              where("sectionId", "==", selectedSection),
            )
          } else {
            attendanceQuery = query(collection(db, "attendance"), where("grade", "==", gradeToQuery))
          }

          const attendanceSnapshot = await getDocs(attendanceQuery)
          console.log(`Found ${attendanceSnapshot.size} attendance records`)

          // Extract unique student IDs
          const studentIds = new Set<string>()
          attendanceSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.studentId) {
              studentIds.add(data.studentId)
            }
          })

          console.log(`Found ${studentIds.size} unique student IDs from attendance`)

          // Fetch each student
          for (const studentId of studentIds) {
            try {
              const studentDoc = await getDoc(doc(db, "students", studentId))
              if (studentDoc.exists()) {
                const data = studentDoc.data()
                students.push({
                  id: studentDoc.id,
                  name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
                  fatherName: data.fatherName || "",
                  motherName: data.motherName || "",
                  dob: data.dob || "",
                  rollNumber: data.rollNumber || "",
                  grade: data.grade || "",
                  section: data.section || "",
                  sectionId: data.sectionId || "",
                  symbolNumber: data.symbolNumber || null,
                  address: data.address || "",
                  contactNumber: data.contactNumber || "",
                  resultPdfUrl: data.resultPdfUrl || "",
                })
              }
            } catch (error) {
              console.error(`Error fetching student ${studentId}:`, error)
            }
          }
        } catch (error) {
          console.error("Error in approach 6:", error)
        }
      }

      // Sort students by roll number
      if (students.length > 0) {
        students.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })
      }

      if (students.length === 0) {
        const sectionName =
          selectedSection && selectedSection !== "all"
            ? `, section ${sections.find((s) => s.id === selectedSection)?.name || selectedSection}`
            : ""
        // Log for debugging but don't use console.error which causes unhandled error
        console.log(`No students found for grade ${selectedGrade}${sectionName}`)
        toast({
          title: "No students found",
          description: `No students found in grade ${selectedGrade}${sectionName}. Please check if students are assigned to this grade and section.`,
          variant: "destructive",
        })
        setGenerating(false)
        return
      }

      // Rest of the function remains the same...
      // Step 2: Process each student
      const totalStudents = students.length
      const studentsWithMarks: StudentWithMarks[] = []
      const successfulReports: string[] = []
      const failedReports: string[] = []
      const allSubjectNames = new Set<string>()

      for (let i = 0; i < students.length; i++) {
        const student = students[i]
        setGenerationStatus(`Processing data for ${student.name} (${i + 1}/${totalStudents})`)
        setGenerationProgress(Math.floor((i / totalStudents) * 50)) // First 50% for data processing

        try {
          // Run diagnostic for the first student to help identify issues
          if (i === 0) {
            console.log("Running subject diagnostic for the first student")
            await runSubjectDiagnostic(student.id, selectedExamTerm)
          }

          // Get subjects for this student - try multiple approaches
          let subjects: Subject[] = []
          let totalMarks = 0

          // APPROACH 1: Standard path - students/{studentId}/subjects
          console.log(`Trying to get subjects for ${student.name} (${student.id}) from standard path`)
          try {
            const subjectsQuery = query(
              collection(db, "students", student.id, "subjects"),
              where("examTerm", "==", selectedExamTerm),
            )
            const subjectsSnapshot = await getDocs(subjectsQuery)
            console.log(`Found ${subjectsSnapshot.size} subjects in standard path for exam term ${selectedExamTerm}`)

            if (subjectsSnapshot.size > 0) {
              subjectsSnapshot.forEach((doc) => {
                const data = doc.data()
                const subject: Subject = {
                  id: doc.id,
                  name: data.name || "",
                  theoryMarks: data.theoryMarks || 0,
                  practicalMarks: data.practicalMarks || 0,
                  finalGrade: data.finalGrade || "",
                  gradePoint: data.gradePoint || 0,
                  maxTheoryMarks: data.maxTheoryMarks || 100,
                  maxPracticalMarks: 0,
                  hasPractical: data.hasPractical || false,
                  totalMarks: data.totalMarks || 100,
                  examTerm: data.examTerm || "",
                  creditHours: data.creditHours || 0,
                }
                subjects.push(subject)
                totalMarks += subject.theoryMarks + subject.practicalMarks
                allSubjectNames.add(subject.name)
              })
            }
          } catch (error) {
            console.error(`Error getting subjects from standard path for ${student.name}:`, error)
          }

          // APPROACH 2: Try exam_results collection if no subjects found
          if (subjects.length === 0) {
            console.log(`No subjects found in standard path, trying exam_results collection for ${student.name}`)
            try {
              const examResultsQuery = query(
                collection(db, "exam_results"),
                where("studentId", "==", student.id),
                where("examTerm", "==", selectedExamTerm),
              )
              const examResultsSnapshot = await getDocs(examResultsQuery)
              console.log(`Found ${examResultsSnapshot.size} exam results for ${student.name}`)

              if (examResultsSnapshot.size > 0) {
                examResultsSnapshot.forEach((doc) => {
                  const data = doc.data()
                  // Check if this is a subject-specific document
                  if (data.subjectName || data.subject) {
                    const subject: Subject = {
                      id: doc.id,
                      name: data.subjectName || data.subject || "",
                      theoryMarks: data.theoryMarks || data.theory || 0,
                      practicalMarks: data.practicalMarks || data.practical || 0,
                      finalGrade: data.finalGrade || data.grade || "",
                      gradePoint: data.gradePoint || 0,
                      maxTheoryMarks: data.maxTheoryMarks || 100,
                      maxPracticalMarks: 0,
                      hasPractical: data.hasPractical || data.practical > 0 ? true : false,
                      totalMarks: data.totalMarks || 100,
                      examTerm: data.examTerm || "",
                      creditHours: data.creditHours || 1,
                    }
                    subjects.push(subject)
                    totalMarks += subject.theoryMarks + subject.practicalMarks
                    allSubjectNames.add(subject.name)
                  }
                })
              }
            } catch (error) {
              console.error(`Error getting exam results for ${student.name}:`, error)
            }
          }

          // APPROACH 3: Try marks collection if still no subjects
          if (subjects.length === 0) {
            console.log(`No subjects found in exam_results, trying marks collection for ${student.name}`)
            try {
              const marksQuery = query(
                collection(db, "marks"),
                where("studentId", "==", student.id),
                where("examTerm", "==", selectedExamTerm),
              )
              const marksSnapshot = await getDocs(marksQuery)
              console.log(`Found ${marksSnapshot.size} marks for ${student.name}`)

              if (marksSnapshot.size > 0) {
                marksSnapshot.forEach((doc) => {
                  const data = doc.data()
                  const subject: Subject = {
                    id: doc.id,
                    name: data.subjectName || data.subject || "",
                    theoryMarks: data.theoryMarks || data.theory || 0,
                    practicalMarks: data.practicalMarks || data.practical || 0,
                    finalGrade: data.finalGrade || data.grade || "",
                    gradePoint: data.gradePoint || 0,
                    maxTheoryMarks: data.maxTheoryMarks || 100,
                    maxPracticalMarks: 0,
                    hasPractical: data.hasPractical || data.practical > 0 ? true : false,
                    totalMarks: data.totalMarks || 100,
                    examTerm: data.examTerm || "",
                    creditHours: data.creditHours || 1,
                  }
                  subjects.push(subject)
                  totalMarks += subject.theoryMarks + subject.practicalMarks
                  allSubjectNames.add(subject.name)
                })
              }
            } catch (error) {
              console.error(`Error getting marks for ${student.name}:`, error)
            }
          }

          // If still no subjects found, create dummy subjects for the report
          if (subjects.length === 0) {
            console.log(`No subjects found for ${student.name}, creating dummy subjects`)
            // Create some default subjects based on grade
            const defaultSubjects = getDefaultSubjectsForGrade(student.grade)
            subjects = defaultSubjects.map((name) => ({
              id: `dummy-${name.replace(/\s+/g, "-").toLowerCase()}`,
              name: name,
              theoryMarks: 0,
              practicalMarks: 0,
              finalGrade: "N/A",
              gradePoint: 0,
              maxTheoryMarks: 100,
              maxPracticalMarks: 0,
              hasPractical: false,
              totalMarks: 100,
              examTerm: selectedExamTerm,
              creditHours: 1,
            }))
            defaultSubjects.forEach((name) => allSubjectNames.add(name))
          }

          // Get attendance for this student
          let attendanceQuery = query(
            collection(db, "attendance"),
            where("studentId", "==", student.id),
            where("grade", "==", student.grade),
          )

          // Add section filter if selected
          if (student.sectionId) {
            attendanceQuery = query(
              collection(db, "attendance"),
              where("studentId", "==", student.id),
              where("grade", "==", student.grade),
              where("sectionId", "==", student.sectionId),
            )
          }

          const attendanceSnapshot = await getDocs(attendanceQuery)
          const attendanceList: Attendance[] = []
          attendanceSnapshot.forEach((doc) => {
            const data = doc.data()
            attendanceList.push({
              id: doc.id,
              studentId: data.studentId,
              date: data.date && typeof data.date.toDate === "function" ? data.date.toDate() : new Date(),
              status: data.status || "",
              grade: data.grade || "",
              section: data.section || "",
              sectionId: data.sectionId || "",
            })
          })

          // UPDATED: Calculate GPA and percentage using fixed total marks
          let totalGradePoints = 0
          let subjectCount = 0

          subjects.forEach((subject) => {
            totalGradePoints += subject.gradePoint
            subjectCount++
          })

          const gpa = subjectCount > 0 ? totalGradePoints / subjectCount : 0
          // UPDATED: Use fixed percentage calculation
          const percentage = calculatePercentage(totalMarks, student.grade)

          studentsWithMarks.push({
            student,
            totalMarks,
            subjects,
            rank: 0, // Will be calculated later
            attendanceList,
            gpa,
            percentage,
          })
        } catch (error: any) {
          console.error(`Error processing student ${student.name}:`, error)
          failedReports.push(student.name)
        }
      }

      // Step 3: Calculate ranks
      studentsWithMarks.sort((a, b) => b.totalMarks - a.totalMarks)
      studentsWithMarks.forEach((student, index) => {
        student.rank = index + 1
      })

      // Step 4: Generate PDFs for each student
      for (let i = 0; i < studentsWithMarks.length; i++) {
        const studentWithMarks = studentsWithMarks[i]
        setGenerationStatus(
          `Generating PDF for ${studentWithMarks.student.name} (${i + 1}/${studentsWithMarks.length})`,
        )
        setGenerationProgress(50 + Math.floor((i / studentsWithMarks.length) * 40)) // Next 40% for PDF generation

        try {
          // Generate PDF
          const pdfBlob = await generateStudentPDF(studentWithMarks, Array.from(allSubjectNames))

          // Upload to Firebase Storage
          const studentFileName = `${studentWithMarks.student.name.replace(/\s+/g, "_")}.pdf`
          const studentStorageReference = storageRef(storage, `resultcard/${studentFileName}`)
          await uploadBytes(studentStorageReference, pdfBlob)
          const downloadURL = await getDownloadURL(studentStorageReference)

          // Add this code to store the URL in the student object for easy access later
          studentWithMarks.student.resultPdfUrl = downloadURL

          // Update student's resultPdfUrl in Firestore with additional fields for mobile app compatibility
          await updateDoc(doc(db, "students", studentWithMarks.student.id), {
            resultPdfUrl: downloadURL,
            resultPdfGeneratedAt: serverTimestamp(), // Add timestamp for mobile app
            resultPdfExamTerm: selectedExamTerm, // Add exam term for mobile app
          })

          successfulReports.push(studentWithMarks.student.name)
        } catch (error: any) {
          console.error(`Error generating PDF for ${studentWithMarks.student.name}:`, error)
          failedReports.push(studentWithMarks.student.name)
        }
      }

      // Step 5: Generate summary PDF
      setGenerationStatus("Generating summary report...")
      setGenerationProgress(90)
      let summaryUrl = ""
      try {
        const summaryPdfBlob = await generateSummaryPDF(studentsWithMarks, Array.from(allSubjectNames))
        const sectionInfo =
          selectedSection && selectedSection !== "all"
            ? `_${sections.find((s) => s.id === selectedSection)?.name || ""}`
            : ""
        const summaryFileName = `${selectedGrade}${sectionInfo}_${selectedExamTerm.replace(/\s+/g, "_")}.pdf`
        const summaryStorageReference = storageRef(storage, `summary/${summaryFileName}`)
        await uploadBytes(summaryStorageReference, summaryPdfBlob)
        summaryUrl = await getDownloadURL(summaryStorageReference)
      } catch (error: any) {
        console.error("Error generating summary PDF:", error)
      }

      // Step 6: Create a record of the generated reports
      setGenerationStatus("Finalizing report generation...")
      setGenerationProgress(95)
      const totalTimeSeconds = Math.floor((Date.now() - startTime) / 1000)

      // Get section info if selected
      const selectedSectionObj = selectedSection ? sections.find((s) => s.id === selectedSection) : null

      const report: GeneratedReport = {
        id: "",
        grade: selectedGrade,
        section: selectedSectionObj?.name,
        sectionId: selectedSection || undefined,
        examTerm: selectedExamTerm,
        generatedBy: teacherId as string,
        generatedAt: new Date(),
        batchId: batchId,
        totalStudents: totalStudents,
        successfulReports: successfulReports.length,
        failedReports: failedReports.length,
        reportPath: `reports/${batchId}`,
        summaryUrl: summaryUrl,
      }

      const reportRef = await addDoc(collection(db, "generated_reports"), {
        ...report,
        generatedAt: serverTimestamp(),
      })
      report.id = reportRef.id

      setGeneratedReports([report, ...generatedReports])
      setGenerationProgress(100)
      setGenerationStatus("Report generation complete!")

      toast({
        title: "Success",
        description: `Generated ${successfulReports.length} reports in ${totalTimeSeconds} seconds${failedReports.length > 0 ? `, ${failedReports.length} failed` : ""}`,
      })

      // Show the summary report if available
      if (summaryUrl) {
        setSelectedReport(report)
        await loadReportData(report)
        setViewDialogOpen(true)
      }
    } catch (error: any) {
      console.error("Error generating reports:", error)
      toast({
        title: "Error",
        description: `Failed to generate reports: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  // UPDATED: Function to generate a student PDF with fixed percentage calculation
  const generateStudentPDF = async (studentWithMarks: StudentWithMarks, allSubjectNames: string[]): Promise<Blob> => {
    // Create PDF with A4 size
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
    })

    const { student, subjects, rank, attendanceList } = studentWithMarks

    // Calculate GPA and percentage using fixed total marks
    let totalGradePoints = 0
    let subjectCount = 0
    let totalMarks = 0

    subjects.forEach((subject) => {
      totalGradePoints += subject.gradePoint
      totalMarks += subject.theoryMarks + subject.practicalMarks
      subjectCount++
    })

    const gpa = subjectCount > 0 ? totalGradePoints / subjectCount : 0
    // UPDATED: Use fixed percentage calculation
    const percentage = calculatePercentage(totalMarks, student.grade)

    // Calculate attendance
    const totalDays = attendanceList.length
    const daysPresent = attendanceList.filter((a) => a.status.toLowerCase() === "present").length

    // Set page dimensions
    const pageWidth = 210
    const pageHeight = 297
    const margin = 10
    const contentWidth = pageWidth - margin * 2

    // Draw border around the entire page
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.rect(margin, margin, contentWidth, pageHeight - margin * 2)

    // School Logo (using a simple placeholder)
    // School Logo - using a fallback approach
    try {
      // Use the actual school logo from public directory
      const logoUrl = "/school_logo.png"
      const img = new Image()
      img.crossOrigin = "anonymous" // Prevent CORS issues

      // Create a promise to handle image loading
      const loadImage = new Promise((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = (error) => {
          console.error("Error loading school logo:", error)
          reject(error)
        }
        img.src = logoUrl
      })

      // Wait for image to load
      await loadImage
      // Add the logo to the PDF
      const logoWidth = 30
      const logoHeight = 30
      doc.addImage(img, "PNG", margin + 5, margin + 5, logoWidth, logoHeight)
    } catch (error) {
      console.error("Error adding school logo to PDF:", error)
      // Fallback if image fails to load
      doc.setFillColor(240, 240, 240)
      doc.circle(margin + 15, margin + 15, 10, "F")
      doc.setFontSize(6)
      doc.setFont("helvetica", "bold")
      doc.text("SCHOOL", margin + 15, margin + 15, { align: "center" })
      doc.text("LOGO", margin + 15, margin + 18, { align: "center" })
    }

    // School Header - centered
    const centerX = pageWidth / 2
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("SAJHA BOARDING SCHOOL", centerX, margin + 15, { align: "center" })

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("CHANDRAPUR-7, BANBAHUARY", centerX, margin + 22, { align: "center" })
    doc.text("ESTD :- 2067", centerX, margin + 27, { align: "center" })

    // Grade Sheet Title Box - centered with gray background
    doc.setFillColor(220, 220, 220)
    doc.rect(centerX - 25, margin + 32, 50, 10, "F")
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("GRADE-SHEET", centerX, margin + 39, { align: "center" })

    // Student Information - Exact positioning based on the mobile app
    const infoStartY = margin + 50

    // Left column labels
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("THE GRADE(S) SECURED BY :", margin + 5, infoStartY)
    doc.text("DATE OF BIRTH :", margin + 5, infoStartY + 10)
    // doc.text("SYMBOL NO :", margin + 5, infoStartY + 20)
    doc.text("FATHER NAME :", margin + 5, infoStartY + 20)

    // Right column labels
    doc.text("ROLL NUMBER :", margin + 120, infoStartY)
    doc.text("GRADE :", margin + 120, infoStartY + 10)
    // doc.text("FATHER NAME :", margin + 120, infoStartY + 20)

    // Left column values with underlines
    doc.setFont("helvetica", "normal")
    doc.text(student.name.toUpperCase(), margin + 70, infoStartY)
    doc.line(margin + 70, infoStartY + 1, margin + 115, infoStartY + 1)

    doc.text(student.dob || " ", margin + 70, infoStartY + 10)
    doc.line(margin + 70, infoStartY + 11, margin + 115, infoStartY + 11)

    // doc.text(String(student.symbolNumber ?? "N/A"), margin + 70, infoStartY + 20)
    // doc.line(margin + 70, infoStartY + 21, margin + 115, infoStartY + 21)
    doc.text(student.fatherName.substring(0, 20) || " ", margin + 70, infoStartY + 20)
     doc.line(margin + 70, infoStartY + 21, margin + 115, infoStartY + 21)

    // Right column values with underlines
    doc.text(student.rollNumber || "N/A", margin + 170, infoStartY)
    doc.line(margin + 170, infoStartY + 1, margin + 190, infoStartY + 1)

    // Include section with grade if available
    const gradeWithSection = student.section ? `${student.grade} - ${student.section}` : student.grade || "N/A"
    doc.text(gradeWithSection, margin + 170, infoStartY + 10)
    doc.line(margin + 170, infoStartY + 11, margin + 190, infoStartY + 11)

    // doc.text(student.fatherName.substring(0, 20) || " ", margin + 147, infoStartY + 20)
    // doc.line(margin + 147, infoStartY + 21, margin + 190, infoStartY + 21)

    // Exam Term row - Exact positioning based on the mobile app
    let examTermDisplay = "IN THE TERMINAL EXAMINATION OF:"
    if (subjects.length > 0) {
      const examTerm = subjects[0].examTerm.toLowerCase()
      if (examTerm === "first term") examTermDisplay = "IN THE 1ST TERMINAL EXAMINATION OF:"
      else if (examTerm === "second term") examTermDisplay = "IN THE 2ND TERMINAL EXAMINATION OF:"
      else if (examTerm === "third term") examTermDisplay = "IN THE 3RD TERMINAL EXAMINATION OF:"
      else if (examTerm === "fourth term") examTermDisplay = "IN THE 4TH TERMINAL EXAMINATION OF:"
    }

    doc.setFont("helvetica", "bold")
    doc.text(examTermDisplay, margin + 5, infoStartY + 30)

    const currentYear = new Date().getFullYear()
    const nepaliYear = currentYear + 57 // Approximate conversion to Nepali year
    doc.setFont("helvetica", "normal")
    doc.text(nepaliYear.toString(), margin + 70, infoStartY + 30)
    doc.line(margin + 70, infoStartY + 31, margin + 85, infoStartY + 31)

    // Add exam term text at the right side
    const examTermText = subjects.length > 0 ? subjects[0].examTerm.toUpperCase() : "TERM EXAM"
    doc.setFont("helvetica", "bold")
    doc.text(examTermText, margin + contentWidth - 5, infoStartY + 40, { align: "right" })

    // Prepare data for the subjects table
    const tableStartY = infoStartY + 45

    // Create table headers
    const headers = [
      [
        { content: "SN", styles: { halign: "center" }, rowSpan: 2 },
        { content: "SUBJECTS", styles: { halign: "center" }, rowSpan: 2 },
        { content: "CREDIT HOUR", styles: { halign: "center" }, rowSpan: 2 },
        { content: "GRADE OBTAINED", styles: { halign: "center" }, colSpan: 2 },
        { content: "FINAL GRADE", styles: { halign: "center" }, rowSpan: 2 },
        { content: "GRADE POINT", styles: { halign: "center" }, rowSpan: 2 },
        { content: "REMARKS", styles: { halign: "center" }, rowSpan: 2 },
      ],
      [
        { content: "TH", styles: { halign: "center" } },
        { content: "PR", styles: { halign: "center" } },
      ],
    ]

    // Create table data
    const tableData: any[] = []

    // Add subject rows
    allSubjectNames.forEach((subjectName, index) => {
      const subject = subjects.find((s) => s.name === subjectName)
      if (subject) {
        const theoryGrade = subject.theoryMarks > 0 ? subject.finalGrade : "NG"
        const practicalGrade = subject.hasPractical ? (subject.practicalMarks > 0 ? subject.finalGrade : "NG") : "-"

        tableData.push([
          (index + 1).toString(),
          subject.name.toUpperCase(),
          subject.creditHours.toString(),
          theoryGrade,
          practicalGrade,
          subject.finalGrade,
          subject.gradePoint.toFixed(1),
          getRemarkFromGrade(subject.finalGrade),
        ])
      } else {
        tableData.push([(index + 1).toString(), subjectName.toUpperCase(), "N/A", "N/A", "-", "N/A", "N/A", "N/A"])
      }
    })

    // Generate table
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: tableStartY,
      theme: "grid",
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        fontSize: 7,
        cellPadding: 2,
      },
      bodyStyles: {
        halign: "center",
        fontSize: 7,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 10 }, // SN
        1: { cellWidth: 50, halign: "left" }, // SUBJECTS
        2: { cellWidth: 20 }, // CREDIT HOUR
        3: { cellWidth: 20 }, // TH
        4: { cellWidth: 15 }, // PR
        5: { cellWidth: 25 }, // FINAL GRADE
        6: { cellWidth: 25 }, // GRADE POINT
        7: { cellWidth: 25 }, // REMARKS
      },
      margin: { left: margin, right: margin },
    })

    // Get the final Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY + 10

    // Summary Section with UPDATED percentage calculation
    const summaryTable = [
      [
        { content: "GRADE POINT AVERAGE (GPA):", styles: { fontStyle: "bold", halign: "right" } },
        { content: gpa.toFixed(2), styles: { halign: "center" } },
        { content: "FINAL GRADE:", styles: { fontStyle: "bold", halign: "right" } },
        { content: getGradeFromGPA(gpa), styles: { halign: "center" } },
      ],
      [
        { content: "TOTAL MARKS OBTAINED:", styles: { fontStyle: "bold", halign: "right" } },
        { content: totalMarks.toString(), styles: { halign: "center" } },
        { content: "PERCENTAGE OBTAINED:", styles: { fontStyle: "bold", halign: "right" } },
        { content: percentage.toFixed(2) + "%", styles: { halign: "center" } },
      ],
      [
//        {
//   content: "ATTENDANCE:",
//   styles: { fontStyle: "bold", halign: "right" }
// },
// {
//   content: daysPresent === 0 ? " " : daysPresent.toString(),
//   styles: { halign: "center" }
// }

        // { content: "OUT OF:", styles: { fontStyle: "bold", halign: "right" } },
        // { content: totalDays.toString(), styles: { halign: "center" } },
      ],
      [
        { content: "", styles: { fontStyle: "bold", halign: "right" } },
        { content: "", styles: { halign: "center" } },
        { content: "RANK:", styles: { fontStyle: "bold", halign: "right" } },
        { content: rank.toString(), styles: { halign: "center" } },
      ],
    ]

    autoTable(doc, {
      body: summaryTable,
      startY: finalY,
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: 1,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 30 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
    })

    // Grade Details Table
    const gradeDetailsY = (doc as any).lastAutoTable.finalY + 5
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("DETAILS OF GRADE SHEET", centerX, gradeDetailsY, { align: "center" })

    const gradeHeaders = [
      { content: "S.N", styles: { halign: "center" } },
      { content: "INTERVAL IN MARKS", styles: { halign: "center" } },
      { content: "GRADE POINT", styles: { halign: "center" } },
      { content: "GRADE LETTER", styles: { halign: "center" } },
      { content: "DESCRIPTION", styles: { halign: "center" } },
    ]

    const gradeData = [
      ["1", "91 TO 100", "4.0", "A+", "OUTSTANDING"],
      ["2", "81 TO BELOW 90", "3.6", "A", "EXCELLENT"],
      ["3", "71 TO BELOW 80", "3.2", "B+", "VERY GOOD"],
      ["4", "61 TO BELOW 70", "2.8", "B", "GOOD"],
      ["5", "51 TO BELOW 60", "2.4", "C+", "SATISFACTORY"],
      ["6", "41 TO BELOW 50", "2.0", "C", "ACCEPTABLE"],
      ["7", "35 TO BELOW 40", "1.6", "D", "BASIC"],
      ["8", "BELOW 35", "NG", "NG", "NON GRADED"],
    ]

    autoTable(doc, {
      head: [gradeHeaders],
      body: gradeData,
      startY: gradeDetailsY + 3,
      theme: "grid",
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
        fontSize: 7,
      },
      bodyStyles: {
        halign: "center",
        fontSize: 7,
        cellPadding: 1,
      },
      margin: { left: margin, right: margin },
    })

    // Notes Section
    const notesY = (doc as any).lastAutoTable.finalY + 2
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.text("1. ONE CREDIT HOUR(S) EQUALS 32 WORKING HOUR(S)", margin + 5, notesY)
    doc.text("2. TH*: THEORY, PR*: PRACTICAL", margin + 5, notesY + 4)
    doc.text("3. ABS: ABSENT", margin + 5, notesY + 8)

    // Signature Section
    const signatureY = notesY + 12
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")

    // Guardian signature
    doc.line(margin + 30, signatureY, margin + 60, signatureY)
    doc.text("GUARDIAN", margin + 45, signatureY + 5, { align: "center" })

    // Class Teacher signature
    doc.line(margin + 95, signatureY, margin + 125, signatureY)
    doc.text("CLASS TEACHER", margin + 110, signatureY + 5, { align: "center" })

    // Principal signature
    doc.line(margin + 160, signatureY, margin + 190, signatureY)
    doc.text("PRINCIPAL", margin + 175, signatureY + 5, { align: "center" })

    return doc.output("blob")
  }

  // UPDATED: Function to generate a summary PDF with fixed percentage calculation
  const generateSummaryPDF = async (
    studentsWithMarks: StudentWithMarks[],
    allSubjectNames: string[],
  ): Promise<Blob> => {
    // Create PDF with A4 size
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
    })

    // Set narrow margins
    const margin = 15 // 15mm margin
    const pageWidth = 210 - margin * 2 // A4 width minus margins
    const centerX = 210 / 2 // Center of page

    // Header with school logo
    // Create a simple placeholder logo
    try {
      // Use the actual school logo from public directory
      const logoUrl = "/school_logo.png"
      const img = new Image()
      img.crossOrigin = "anonymous" // Prevent CORS issues

      // Create a promise to handle image loading
      const loadImage = new Promise((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = (error) => {
          console.error("Error loading school logo:", error)
          reject(error)
        }
        img.src = logoUrl
      })

      // Wait for image to load
      await loadImage
      // Add the logo to the PDF
      const logoWidth = 25
      const logoHeight = 25
      doc.addImage(img, "PNG", margin + 5, margin + 10, logoWidth, logoHeight)
    } catch (error) {
      console.error("Error adding school logo to PDF:", error)
      // Fallback if image fails to load
      doc.setFillColor(240, 240, 240)
      doc.circle(margin + 10, margin + 15, 10, "F")
      doc.setFontSize(6)
      doc.setFont("helvetica", "bold")
      doc.text("SCHOOL", margin + 10, margin + 15, { align: "center" })
      doc.text("LOGO", margin + 10, margin + 18, { align: "center" })
    }

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("SAJHA BOARDING SCHOOL", centerX, margin + 15, { align: "center" })

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("CHANDRAPUR-7, BANBAHUARY", centerX, margin + 22, { align: "center" })
    doc.text("ESTD :- 2067", centerX, margin + 27, { align: "center" })

    // Title
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(`CLASS RESULT SHEET - ${selectedExamTerm.toUpperCase()}`, centerX, margin + 32, { align: "center" })

    // Report Info
    const infoStartY = margin + 40
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Grade:", margin, infoStartY)
    doc.setFont("helvetica", "normal")
    doc.text(selectedGrade, margin + 20, infoStartY)

    // Add section info if available
    if (selectedSection && selectedSection !== "all") {
      const sectionName = sections.find((s) => s.id === selectedSection)?.name || ""
      doc.setFont("helvetica", "bold")
      doc.text("Section:", margin + 50, infoStartY)
      doc.setFont("helvetica", "normal")
      doc.text(sectionName, margin + 80, infoStartY)
    }

    doc.setFont("helvetica", "bold")
    doc.text("Exam Term:", margin + 120, infoStartY)
    doc.setFont("helvetica", "normal")
    doc.text(selectedExamTerm, margin + 160, infoStartY)

    const currentYear = new Date().getFullYear()
    doc.setFont("helvetica", "bold")
    doc.text("Academic Year:", margin, infoStartY + 8)
    doc.setFont("helvetica", "normal")
    doc.text(`${currentYear}-${currentYear + 1}`, margin + 50, infoStartY + 8)

    doc.setFont("helvetica", "bold")
    doc.text("Date:", margin + 120, infoStartY + 8)
    doc.setFont("helvetica", "normal")
    const today = new Date()
    const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${today.getFullYear()}`
    doc.text(dateStr, margin + 160, infoStartY + 8)

    // Prepare table headers
    const tableHeaders = [
      { content: "Rank", styles: { halign: "center" } },
      { content: "Roll No.", styles: { halign: "center" } },
      { content: "Student Name", styles: { halign: "center" } },
    ]

    // Add subject headers
    allSubjectNames.forEach((subject) => {
      tableHeaders.push({ content: subject, styles: { halign: "center" } })
    })

    // Add total, percentage, GPA, grade, result headers
    tableHeaders.push(
      { content: "Total", styles: { halign: "center" } },
      { content: "%", styles: { halign: "center" } },
      { content: "GPA", styles: { halign: "center" } },
      { content: "Grade", styles: { halign: "center" } },
      { content: "Result", styles: { halign: "center" } },
    )

    // UPDATED: Prepare table data with fixed percentage calculation
    const tableData = studentsWithMarks.map((studentWithMarks) => {
      const { student, subjects, rank, totalMarks } = studentWithMarks

      // Calculate GPA
      let totalGradePoints = 0
      let subjectCount = 0

      subjects.forEach((subject) => {
        totalGradePoints += subject.gradePoint
        subjectCount++
      })

      const gpa = subjectCount > 0 ? totalGradePoints / subjectCount : 0
      // UPDATED: Use fixed percentage calculation
      const percentage = calculatePercentage(totalMarks, student.grade)
      const finalGrade = getGradeFromGPA(gpa)
      const isPass = gpa >= 1.6

      // Create row data
      const row = [rank.toString(), student.rollNumber || "", student.name]

      // Add subject marks
      allSubjectNames.forEach((subjectName) => {
        const subject = subjects.find((s) => s.name === subjectName)
        const mark = subject ? (subject.theoryMarks + subject.practicalMarks).toString() : "-"
        row.push(mark)
      })

      // Add total, percentage, GPA, grade, result
      row.push(totalMarks.toString(), percentage.toFixed(2) + "%", gpa.toFixed(2), finalGrade, isPass ? "Pass" : "Fail")

      return row
    })

    // Generate the table using autoTable
    autoTable(doc, {
      startY: infoStartY + 15,
      head: [tableHeaders],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        fontSize: 8,
        cellPadding: 2,
      },
      bodyStyles: {
        halign: "center",
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 15 }, // Rank
        1: { cellWidth: 20 }, // Roll No
        2: { cellWidth: 40, halign: "left" }, // Student Name
        // Other columns will auto-size
      },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
      didDrawPage: (data) => {
        // Add header to each page
        if (data.pageNumber > 1) {
          doc.setFontSize(10)
          doc.setFont("helvetica", "bold")
          doc.text("SAJHA BOARDING SCHOOL - CLASS RESULT SHEET", centerX, 10, { align: "center" })
        }
      },
    })

    // Class Summary section
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Class Summary", margin, finalY)

    // Calculate summary data
    const totalStudents = studentsWithMarks.length
    const passCount = studentsWithMarks.filter((s) => {
      // Calculate GPA for each student
      let totalGradePoints = 0
      let subjectCount = 0
      s.subjects.forEach((subject) => {
        totalGradePoints += subject.gradePoint
        subjectCount++
      })
      const gpa = subjectCount > 0 ? totalGradePoints / subjectCount : 0
      return gpa >= 1.6
    }).length

    const failCount = totalStudents - passCount
    const passPercentage = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0

    // Create summary grid using autoTable
    autoTable(doc, {
      startY: finalY + 5,
      body: [
        [
          { content: "Total Students", styles: { fontStyle: "bold", fillColor: [245, 245, 245] } },
          { content: totalStudents.toString(), styles: { fontStyle: "bold", fillColor: [245, 245, 245] } },
          { content: "Pass", styles: { fontStyle: "bold", fillColor: [240, 253, 244] } },
          { content: passCount.toString(), styles: { fontStyle: "bold", fillColor: [240, 253, 244] } },
          { content: "Fail", styles: { fontStyle: "bold", fillColor: [254, 242, 242] } },
          { content: failCount.toString(), styles: { fontStyle: "bold", fillColor: [254, 242, 242] } },
          { content: "Pass Percentage", styles: { fontStyle: "bold", fillColor: [239, 246, 255] } },
          { content: passPercentage.toFixed(2) + "%", styles: { fontStyle: "bold", fillColor: [239, 246, 255] } },
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 5,
        halign: "center",
      },
      margin: { left: margin, right: margin },
    })

    // Signature Section
    const signatureY = (doc as any).lastAutoTable.finalY + 30
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")

    // Class Teacher signature
    doc.line(margin + 40, signatureY, margin + 80, signatureY)
    doc.text("Class Teacher", margin + 60, signatureY + 5, { align: "center" })

    // Exam Coordinator signature
    doc.line(margin + 100, signatureY, margin + 140, signatureY)
    doc.text("Exam Coordinator", margin + 120, signatureY + 5, { align: "center" })

    // Principal signature
    doc.line(margin + 160, signatureY, margin + 190, signatureY)
    doc.text("Principal", margin + 175, signatureY + 5, { align: "center" })

    // Footer
    const footerY = signatureY + 20
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.text("This is a computer-generated report and does not require a signature.", centerX, footerY, {
      align: "center",
    })
    doc.text(`© ${new Date().getFullYear()} Sajha Boarding School. All rights reserved.`, centerX, footerY + 5, {
      align: "center",
    })

    return doc.output("blob")
  }

  const printAllGradeSheets = async (report: GeneratedReport) => {
    try {
      setBatchPrinting(true)
      // First load the report data if not already loaded
      if (!reportData.length || selectedReport?.id !== report.id) {
        setSelectedReport(report)
        await loadReportData(report)
      }

      // Show a toast with the number of grade sheets being prepared
      toast({
        title: "Preparing Grade Sheets",
        description: `Preparing ${reportData.length} grade sheets for printing. This may take a moment...`,
      })

      // Generate individual PDFs for each student
      const pdfBlobs: Blob[] = []
      const pdfUrls: string[] = []

      for (const studentData of reportData) {
        try {
          // Generate the PDF blob for this student
          const pdfBlob = await generateStudentPDF(
            studentData,
            studentData.subjects.map((s) => s.name),
          )
          pdfBlobs.push(pdfBlob)

          // Create a URL for this PDF
          const url = URL.createObjectURL(pdfBlob)
          pdfUrls.push(url)
        } catch (error) {
          console.error(`Error generating PDF for ${studentData.student.name}:`, error)
        }
      }

      if (pdfUrls.length === 0) {
        toast({
          title: "Error",
          description: "Failed to generate any grade sheets for printing",
          variant: "destructive",
        })
        setBatchPrinting(false)
        return
      }

      // Create a new window for printing
      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Pop-up blocked. Please allow pop-ups and try again.",
          variant: "destructive",
        })
        setBatchPrinting(false)
        return
      }

      // Create HTML content with all PDFs embedded in a single page
      let htmlContent = `<!DOCTYPE html><html><head>
  <title>Grade Sheets - ${report.grade} - ${report.examTerm}</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .pdf-container {
       width: 100%;
       height: 100vh;
       page-break-after: always;
       margin-bottom: 20px;
    }
    .pdf-container:last-child {
      page-break-after: auto;
    }
    iframe, embed, object {
      width: 100%;
      height: 100%;
      border: none;
    }
    @media print {
      .pdf-container {
         height: 100vh;
         page-break-inside: avoid;
        page-break-after: always;
      }
      .print-controls {
        display: none !important;
      }
    }
    .print-controls {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f8f9fa;
      padding: 10px;
      border-bottom: 1px solid #ddd;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-info {
      margin-right: 20px;
      font-size: 14px;
      font-weight: bold;
    }
    .button-container {
      display: flex;
      gap: 10px;
    }
    .print-button {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      transition: background 0.2s;
    }
    .print-button:hover {
      background: #4338ca;
    }
    .content-area {
      margin-top: 60px;
    }
  </style>
</head>
<body>
  <div class="print-controls">
    <div class="print-info">Total Grade Sheets: ${pdfUrls.length}</div>
    <div class="button-container">
      <button class="print-button" onclick="printAllGradeSheets()">Print All Grade Sheets</button>
    </div>
  </div>
  <div class="content-area">`

      // Add each PDF as an embedded object
      pdfUrls.forEach((url, index) => {
        const studentName = reportData[index]?.student.name || `Student ${index + 1}`
        htmlContent += `  <div class="pdf-container" id="pdf-container-${index}">
    <iframe src="${url}" type="application/pdf" title="${studentName}'s Grade Sheet"></iframe>
  </div>`
      })

      // Add script to handle cleanup and direct printing
      htmlContent += `  </div>
  <script>
    // Function to print all grade sheets directly
    function printAllGradeSheets() {
      try {
        const frames = document.querySelectorAll('iframe');
        let printCount = 0;
        
        frames.forEach((frame, index) => {
          try {
            // Try to access the iframe's contentWindow
            if (frame.contentWindow) {
              // Try different approaches to print
              setTimeout(() => {
                try {
                  // Try to call print directly on the contentWindow
                  frame.contentWindow.print();
                  printCount++;
                } catch (e) {
                  console.error("Error printing iframe " + index + ":", e);
                }
              }, index * 500); // Stagger printing to avoid browser limitations
            }
          } catch (e) {
            console.error("Error accessing iframe " + index + ":", e);
          }
        });
        
        // Show success message
        setTimeout(() => {
          alert("Printing complete! " + printCount + " grade sheets were sent to printer.");
        }, frames.length * 500 + 1000);
        
      } catch (e) {
        console.error("Error in direct print:", e);
        // Fallback to standard print
        alert("Direct printing failed. Falling back to standard print dialog.");
        window.print();
      }
    }
    
    // Auto-start printing after a short delay to allow PDFs to load
    setTimeout(printAllGradeSheets, 1500);
    
    // Cleanup function for when the window is closed
    window.addEventListener('beforeunload', function() {
      // Cleanup URLs before closing
      ${pdfUrls.map((url) => `URL.revokeObjectURL("${url}");`).join("\n")}
    });
  </script>
</body>
</html>`

      // Write the content to the new window
      printWindow.document.open()
      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // Let the user know it's ready
      toast({
        title: "Printing Grade Sheets",
        description: `${pdfUrls.length} grade sheets are being sent to your printer.`,
      })
    } catch (error: any) {
      console.error("Error batch printing grade sheets:", error)
      toast({
        title: "Error",
        description: `Failed to print grade sheets: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setBatchPrinting(false)
    }
  }

  // UPDATED: Print a report with fixed percentage calculation
  const printReport = async (report: GeneratedReport) => {
    setPrintingReport(report.id)
    try {
      if (!reportData.length) {
        await loadReportData(report)
      }

      // Create print content with UPDATED percentage calculation
      const printContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Class Report - Grade ${report.grade}${report.section ? ` - Section ${report.section}` : ""} - ${report.examTerm}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        color: #333;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
      }
      .school-header {
        text-align: center;
        margin-bottom: 20px;
      }
      .school-name {
        font-size: 20px;
        font-weight: bold;
        margin: 0;
      }
      .school-address {
        font-size: 12px;
        margin: 5px 0;
      }
      .report-title {
        font-size: 16px;
        font-weight: bold;
        text-align: center;
        margin: 15px 0;
        text-transform: uppercase;
      }
      .report-info {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }
      .info-item {
        margin-right: 30px;
        margin-bottom: 5px;
      }
      .info-label {
        font-weight: bold;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 12px;
      }
      th, td {
        padding: 6px;
        text-align: center;
        border-bottom: 1px solid #ddd;
      }
      th {
        font-weight: bold;
        border-bottom: 2px solid #ddd;
      }
      .summary {
        margin: 20px 0;
      }
      .summary-title {
        font-weight: bold;
        margin-bottom: 10px;
        font-size: 14px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .summary-item {
        background-color: #f9f9f9;
        padding: 10px;
        border: 1px solid #ddd;
        text-align: center;
      }
      .summary-label {
        font-size: 12px;
        color: #666;
      }
      .summary-value {
        font-size: 16px;
        font-weight: bold;
        margin-top: 5px;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
      }
      .signature-box {
        text-align: center;
        flex: 1;
        margin: 0 20px;
      }
      .signature-line {
        border-top: 1px solid #000;
        margin-top: 40px;
        padding-top: 5px;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
        font-size: 10px;
        color: #666;
      }
      @media print {
        body {
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="school-header">
        <h1 class="school-name">SAJHA BOARDING SCHOOL</h1>
        <p class="school-address">CHANDRAPUR-7, BANBAHUARY</p>
        <p class="school-address">ESTD :- 2067</p>
      </div>
      
      <div class="report-title">CLASS RESULT SHEET - ${report.examTerm.toUpperCase()}</div>
      
      <div class="report-info">
        <div class="info-item">
          <span class="info-label">Grade:</span> ${report.grade}
        </div>
        ${
          report.section
            ? `
        <div class="info-item">
          <span class="info-label">Section:</span> ${report.section}
        </div>`
            : ""
        }
        <div class="info-item">
          <span class="info-label">Exam Term:</span> ${report.examTerm}
        </div>
        <div class="info-item">
          <span class="info-label">Academic Year:</span> ${new Date().getFullYear()}-${new Date().getFullYear() + 1}
        </div>
        <div class="info-item">
          <span class="info-label">Date:</span> ${format(new Date(), "dd/MM/yyyy")}
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Roll No.</th>
            <th>Student Name</th>
            ${
              getAllSubjectNames(reportData)
                .map((subject) => `<th>${subject}</th>`)
                .join("") || ""
            }
            <th>Total</th>
            <th>%</th>
            <th>GPA</th>
            <th>Grade</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${reportData
            .map((student) => {
              const isPass = student.gpa && student.gpa >= 1.6
              const allSubjects = getAllSubjectNames(reportData)
              // UPDATED: Use fixed percentage calculation
              const percentage = calculatePercentage(student.totalMarks, student.student.grade)
              return `
              <tr>
                <td>${student.rank}</td>
                <td>${student.student.rollNumber}</td>
                <td>${student.student.name}</td>
                ${allSubjects
                  .map((subjectName) => {
                    const subject = student.subjects.find((s) => s.name === subjectName)
                    if (subject) {
                      // Show the final grade if available, otherwise calculate from marks
                      const displayGrade =
                        subject.finalGrade && subject.finalGrade !== ""
                          ? subject.finalGrade
                          : getGradeFromMarks(
                              subject.theoryMarks + subject.practicalMarks,
                              subject.maxTheoryMarks + (subject.hasPractical ? subject.maxPracticalMarks : 0),
                            )
                      return `<td>${displayGrade}</td>`
                    } else {
                      return `<td>-</td>`
                    }
                  })
                  .join("")}
                <td>${student.totalMarks}</td>
                <td>${percentage.toFixed(2)}%</td>
                <td>${student.gpa?.toFixed(2) || 0}</td>
                <td>${getGradeFromGPA(student.gpa || 0)}</td>
                <td>${isPass ? "Pass" : "Fail"}</td>
              </tr>
            `
            })
            .join("")}
        </tbody>
      </table>
      
      <div class="summary">
        <div class="summary-title">Class Summary</div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Total Students</div>
            <div class="summary-value">${reportData.length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Pass</div>
            <div class="summary-value">${reportData.filter((s) => (s.gpa || 0) >= 1.6).length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Fail</div>
            <div class="summary-value">${reportData.filter((s) => (s.gpa || 0) < 1.6).length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Pass Percentage</div>
            <div class="summary-value">${((reportData.filter((s) => (s.gpa || 0) >= 1.6).length / reportData.length) * 100).toFixed(2)}%</div>
          </div>
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">Class Teacher</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Exam Coordinator</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Principal</div>
        </div>
      </div>
      
      <div class="footer">
        <p>This is a computer-generated report and does not require a signature.</p>
        <p>© ${new Date().getFullYear()} Sajha Boarding School. All rights reserved.</p>
      </div>
    </div>
    <script>
      window.onload = function() {
        window.print();
      }
    </script>
  </body>
  </html>`

      // Use iframe for printing
      if (printFrameRef.current) {
        const iframe = printFrameRef.current
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc) {
          iframeDoc.open()
          iframeDoc.write(printContent)
          iframeDoc.close()

          // Wait for content to load then print
          setTimeout(() => {
            iframe.contentWindow?.focus()
            iframe.contentWindow?.print()
            setPrintingReport(null)
          }, 500)
        }
      }
    } catch (error: any) {
      console.error("Error printing report:", error)
      toast({
        title: "Error",
        description: `Failed to print report: ${error.message}`,
        variant: "destructive",
      })
      setPrintingReport(null)
    }
  }

  // UPDATED: downloadReport function with fixed percentage calculation
  const downloadReport = async (report: GeneratedReport) => {
    // If the report has a summary URL, open it in a new tab
    if (report.summaryUrl) {
      window.open(report.summaryUrl, "_blank")
      return
    }

    // Otherwise, try to load the data and generate a summary
    try {
      if (!reportData.length) {
        await loadReportData(report)
      }

      const doc = new jsPDF()

      // Header
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("SAJHA BOARDING SCHOOL", 105, 20, { align: "center" })

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text("CHANDRAPUR-7, BANBAHUARY", 105, 27, { align: "center" })
      doc.text("ESTD :- 2067", 105, 32, { align: "center" })

      // Title with section if available
      const titleText = report.section
        ? `SUMMARY REPORT - ${report.grade} - Section ${report.section} - ${report.examTerm}`
        : `SUMMARY REPORT - ${report.grade} - ${report.examTerm}`

      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(titleText, 105, 42, { align: "center" })

      // Create table headers
      const headers = ["Rank", "Roll", "Name", "Total", "%", "GPA", "Grade", "Result"]

      // UPDATED: Create table data with fixed percentage calculation
      const tableData = reportData.map((student) => {
        const isPass = student.gpa && student.gpa >= 1.6
        // UPDATED: Use fixed percentage calculation
        const percentage = calculatePercentage(student.totalMarks, student.student.grade)
        return [
          student.rank.toString(),
          student.student.rollNumber,
          student.student.name,
          student.totalMarks.toString(),
          percentage.toFixed(2) + "%",
          student.gpa?.toFixed(2) || "0",
          getGradeFromGPA(student.gpa || 0),
          isPass ? "Pass" : "Fail",
        ]
      })

      // Generate table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 50,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: "bold" },
      })

      // Add date at the bottom
      doc.setFontSize(8)
      doc.setFont("helvetica", "italic")
      const dateStr = format(new Date(), "dd MMM yyyy, HH:mm")
      doc.text(`Generated on: ${dateStr}`, 190, 280, { align: "right" })

      // Save the PDF with section info if available
      const fileName = report.section
        ? `Report_Grade${report.grade}_Section${report.section}_${report.examTerm.replace(/\s+/g, "_")}.pdf`
        : `Report_Grade${report.grade}_${report.examTerm.replace(/\s+/g, "_")}.pdf`

      doc.save(fileName)

      toast({
        title: "Download Started",
        description: `Downloading report for Grade ${report.grade}${report.section ? `, Section ${report.section}` : ""}, ${report.examTerm}`,
      })
    } catch (error: any) {
      console.error("Error downloading report:", error)
      toast({
        title: "Error",
        description: `Failed to download report: ${error.message}`,
        variant: "destructive",
      })
    }
  }

 const getGradeFromGPA = (gpa: number): string => {
  if (gpa >= 4.1) return "A+"
  if (gpa >= 3.6) return "A+"
  if (gpa >= 3.2) return "A"
  if (gpa >= 2.8) return "B+"
  if (gpa >= 2.4) return "B"
  if (gpa >= 2.0) return "C+"
  if (gpa >= 1.6) return "C"
  if (gpa >= 1.2) return "D+"
  if (gpa >= 0.8) return "D"
  return "NG"
}

const getRemarkFromGrade = (grade: string): string => {
  switch (grade) {
    case "A+":
      return "OUTSTANDING"
    case "A":
      return "EXCELLENT"
    case "B+":
      return "VERY GOOD"
    case "B":
      return "GOOD"
    case "C+":
      return "SATISFACTORY"
    case "C":
      return "ACCEPTABLE"
    case "D+":
      return "PARTIALLY ACCEPTABLE" // Added remark for D+
    case "D":
      return "BASIC"
    default:
      return "NON GRADED"
  }
}

  // UPDATED: loadReportData function with fixed percentage calculation
  const loadReportData = async (report: GeneratedReport): Promise<void> => {
    setViewingReport(report.id)
    console.log("Loading report data for:", report)

    try {
      // Use the report.grade directly since it matches your database values
      const gradeToQuery = report.grade

      // Try multiple approaches to find students - just like in handleGenerateReports
      const students: Student[] = []

      // APPROACH 1: Direct query by grade field (this should work for your data structure)
      console.log("Approach 1: Querying students by exact grade field:", gradeToQuery)
      let studentsQuery = query(collection(db, "students"), where("grade", "==", gradeToQuery))

      // Add section filter if available
      if (report.sectionId && report.sectionId !== "all") {
        console.log("Adding section filter:", report.sectionId)
        studentsQuery = query(
          collection(db, "students"),
          where("grade", "==", gradeToQuery),
          where("sectionId", "==", report.sectionId),
        )
      }

      let studentsSnapshot = await getDocs(studentsQuery)
      console.log(`Approach 1: Found ${studentsSnapshot.size} students matching grade=${gradeToQuery}`)

      if (studentsSnapshot.size > 0) {
        studentsSnapshot.forEach((doc) => {
          const data = doc.data()
          students.push({
            id: doc.id,
            name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
            fatherName: data.fatherName || "",
            motherName: data.motherName || "",
            dob: data.dob || "",
            rollNumber: data.rollNumber || "",
            grade: data.grade || "",
            section: data.section || "",
            sectionId: data.sectionId || "",
            symbolNumber: data.symbolNumber || null,
            address: data.address || "",
            contactNumber: data.contactNumber || "",
            resultPdfUrl: data.resultPdfUrl || "",
          })
        })
      }

      // APPROACH 2: Try without section filter if no students found and section was selected
      if (students.length === 0 && report.sectionId && report.sectionId !== "all") {
        try {
          console.log("Approach 2: Querying students by grade without section filter:", gradeToQuery)
          const studentsQuery = query(collection(db, "students"), where("grade", "==", gradeToQuery))
          studentsSnapshot = await getDocs(studentsQuery)
          console.log(
            `Approach 2: Found ${studentsSnapshot.size} students matching grade=${gradeToQuery} (no section filter)`,
          )

          if (studentsSnapshot.size > 0) {
            studentsSnapshot.forEach((doc) => {
              const data = doc.data()
              // Only add students that match the section if section is selected
              if (
                !report.sectionId ||
                report.sectionId === "all" ||
                data.sectionId === report.sectionId ||
                data.section === sections.find((s) => s.id === report.sectionId)?.name
              ) {
                students.push({
                  id: doc.id,
                  name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
                  fatherName: data.fatherName || "",
                  motherName: data.motherName || "",
                  dob: data.dob || "",
                  rollNumber: data.rollNumber || "",
                  grade: data.grade || "",
                  section: data.section || "",
                  sectionId: data.sectionId || "",
                  symbolNumber: data.symbolNumber || null,
                  address: data.address || "",
                  contactNumber: data.contactNumber || "",
                  resultPdfUrl: data.resultPdfUrl || "",
                })
              }
            })
          }
        } catch (error) {
          console.error("Error in approach 2:", error)
        }
      }

      // APPROACH 3: Debug - Check what grades actually exist in the database
      if (students.length === 0) {
        try {
          console.log("Approach 3: Checking what grades actually exist in the database...")
          const allStudentsQuery = query(collection(db, "students"))
          const allStudentsSnapshot = await getDocs(allStudentsQuery)
          const gradesFound = new Set<string>()
          const sampleStudents: any[] = []

          allStudentsSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.grade) {
              gradesFound.add(data.grade)
            }
            if (sampleStudents.length < 10) {
              sampleStudents.push({
                id: doc.id,
                name: data.name,
                grade: data.grade,
                section: data.section,
                sectionId: data.sectionId,
              })
            }
          })

          console.log("All grades found in database:", Array.from(gradesFound).sort())
          console.log("Sample students:", sampleStudents)
          console.log(`Looking for grade: "${gradeToQuery}" (type: ${typeof gradeToQuery})`)
        } catch (error) {
          console.error("Error in approach 3:", error)
        }
      }

      // APPROACH 4: Try with string conversion (in case of type mismatch)
      if (students.length === 0) {
        try {
          const gradeAsString = String(gradeToQuery)
          console.log("Approach 4: Trying with string conversion:", gradeAsString)
          let studentsQuery = query(collection(db, "students"), where("grade", "==", gradeAsString))
          if (report.sectionId && report.sectionId !== "all") {
            studentsQuery = query(
              collection(db, "students"),
              where("grade", "==", gradeAsString),
              where("sectionId", "==", report.sectionId),
            )
          }
          studentsSnapshot = await getDocs(studentsQuery)
          console.log(`Approach 4: Found ${studentsSnapshot.size} students matching grade=${gradeAsString}`)
          if (studentsSnapshot.size > 0) {
            studentsSnapshot.forEach((doc) => {
              const data = doc.data()
              students.push({
                id: doc.id,
                name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
                fatherName: data.fatherName || "",
                motherName: data.motherName || "",
                dob: data.dob || "",
                rollNumber: data.rollNumber || "",
                grade: data.grade || "",
                section: data.section || "",
                sectionId: data.sectionId || "",
                symbolNumber: data.symbolNumber || null,
                address: data.address || "",
                contactNumber: data.contactNumber || "",
                resultPdfUrl: data.resultPdfUrl || "",
              })
            })
          }
        } catch (error) {
          console.error("Error in approach 4:", error)
        }
      }

      // APPROACH 5: Try with just the section ID if we have one
      if (students.length === 0 && report.sectionId && report.sectionId !== "all") {
        try {
          console.log("Approach 5: Querying students by just sectionId:", report.sectionId)
          const studentsQuery = query(collection(db, "students"), where("sectionId", "==", report.sectionId))
          studentsSnapshot = await getDocs(studentsQuery)
          console.log(`Approach 5: Found ${studentsSnapshot.size} students matching sectionId=${report.sectionId}`)
          if (studentsSnapshot.size > 0) {
            studentsSnapshot.forEach((doc) => {
              const data = doc.data()
              students.push({
                id: doc.id,
                name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
                fatherName: data.fatherName || "",
                motherName: data.motherName || "",
                dob: data.dob || "",
                rollNumber: data.rollNumber || "",
                grade: data.grade || "",
                section: data.section || "",
                sectionId: data.sectionId || "",
                symbolNumber: data.symbolNumber || null,
                address: data.address || "",
                contactNumber: data.contactNumber || "",
                resultPdfUrl: data.resultPdfUrl || "",
              })
            })
          }
        } catch (error) {
          console.error("Error in approach 5:", error)
        }
      }

      // APPROACH 6: Find students through attendance records
      if (students.length === 0) {
        try {
          console.log("Approach 6: Finding students through attendance records")
          // First get attendance records for this grade/section
          let attendanceQuery
          if (report.sectionId && report.sectionId !== "all") {
            attendanceQuery = query(
              collection(db, "attendance"),
              where("grade", "==", gradeToQuery),
              where("sectionId", "==", report.sectionId),
            )
          } else {
            attendanceQuery = query(collection(db, "attendance"), where("grade", "==", gradeToQuery))
          }

          const attendanceSnapshot = await getDocs(attendanceQuery)
          console.log(`Found ${attendanceSnapshot.size} attendance records`)

          // Extract unique student IDs
          const studentIds = new Set<string>()
          attendanceSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.studentId) {
              studentIds.add(data.studentId)
            }
          })

          console.log(`Found ${studentIds.size} unique student IDs from attendance`)

          // Fetch each student
          for (const studentId of studentIds) {
            try {
              const studentDoc = await getDoc(doc(db, "students", studentId))
              if (studentDoc.exists()) {
                const data = studentDoc.data()
                students.push({
                  id: studentDoc.id,
                  name: data.name || `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim(),
                  fatherName: data.fatherName || "",
                  motherName: data.motherName || "",
                  dob: data.dob || "",
                  rollNumber: data.rollNumber || "",
                  grade: data.grade || "",
                  section: data.section || "",
                  sectionId: data.sectionId || "",
                  symbolNumber: data.symbolNumber || null,
                  address: data.address || "",
                  contactNumber: data.contactNumber || "",
                  resultPdfUrl: data.resultPdfUrl || "",
                })
              }
            } catch (error) {
              console.error(`Error fetching student ${studentId}:`, error)
            }
          }
        } catch (error) {
          console.error("Error in approach 6:", error)
        }
      }

      if (students.length === 0) {
        console.log("No students found for this report")
        setReportData([])
        setViewingReport(null)
        return
      }

      // Sort students by roll number
      students.sort((a, b) => {
        const rollA = Number.parseInt(a.rollNumber) || 0
        const rollB = Number.parseInt(b.rollNumber) || 0
        return rollA - rollB
      })

      // Process each student to get their marks and subjects
      const studentsWithMarks: StudentWithMarks[] = []

      for (const student of students) {
        try {
          // Get subjects for this student - try multiple approaches
          let subjects: Subject[] = []
          let totalMarks = 0

          // APPROACH 1: Standard path - students/{studentId}/subjects
          try {
            const subjectsQuery = query(
              collection(db, "students", student.id, "subjects"),
              where("examTerm", "==", report.examTerm),
            )
            const subjectsSnapshot = await getDocs(subjectsQuery)
            if (subjectsSnapshot.size > 0) {
              subjectsSnapshot.forEach((doc) => {
                const data = doc.data()
                const subject: Subject = {
                  id: doc.id,
                  name: data.name || "",
                  theoryMarks: data.theoryMarks || 0,
                  practicalMarks: data.practicalMarks || 0,
                  finalGrade: data.finalGrade || "",
                  gradePoint: data.gradePoint || 0,
                  maxTheoryMarks: data.maxTheoryMarks || 100,
                  maxPracticalMarks: 0,
                  hasPractical: data.hasPractical || false,
                  totalMarks: data.totalMarks || 100,
                  examTerm: report.examTerm || "",
                  creditHours: data.creditHours || 0,
                }
                subjects.push(subject)
                totalMarks += subject.theoryMarks + subject.practicalMarks
              })
            }
          } catch (error) {
            console.error(`Error getting subjects from standard path for ${student.name}:`, error)
          }

          // APPROACH 2: Try exam_results collection if no subjects found
          if (subjects.length === 0) {
            try {
              const examResultsQuery = query(
                collection(db, "exam_results"),
                where("studentId", "==", student.id),
                where("examTerm", "==", report.examTerm),
              )
              const examResultsSnapshot = await getDocs(examResultsQuery)
              if (examResultsSnapshot.size > 0) {
                examResultsSnapshot.forEach((doc) => {
                  const data = doc.data()
                  // Check if this is a subject-specific document
                  if (data.subjectName || data.subject) {
                    const subject: Subject = {
                      id: doc.id,
                      name: data.subjectName || data.subject || "",
                      theoryMarks: data.theoryMarks || data.theory || 0,
                      practicalMarks: data.practicalMarks || data.practical || 0,
                      finalGrade: data.finalGrade || data.grade || "",
                      gradePoint: data.gradePoint || 0,
                      maxTheoryMarks: data.maxTheoryMarks || 100,
                      maxPracticalMarks: 0,
                      hasPractical: data.hasPractical || data.practical > 0 ? true : false,
                      totalMarks: data.totalMarks || 100,
                      examTerm: report.examTerm || "",
                      creditHours: data.creditHours || 1,
                    }
                    subjects.push(subject)
                    totalMarks += subject.theoryMarks + subject.practicalMarks
                  }
                })
              }
            } catch (error) {
              console.error(`Error getting exam results for ${student.name}:`, error)
            }
          }

          // APPROACH 3: Try marks collection if still no subjects
          if (subjects.length === 0) {
            try {
              const marksQuery = query(
                collection(db, "marks"),
                where("studentId", "==", student.id),
                where("examTerm", "==", report.examTerm),
              )
              const marksSnapshot = await getDocs(marksQuery)
              if (marksSnapshot.size > 0) {
                marksSnapshot.forEach((doc) => {
                  const data = doc.data()
                  const subject: Subject = {
                    id: doc.id,
                    name: data.subjectName || data.subject || "",
                    theoryMarks: data.theoryMarks || data.theory || 0,
                    practicalMarks: data.practicalMarks || data.practical || 0,
                    finalGrade: data.finalGrade || data.grade || "",
                    gradePoint: data.gradePoint || 0,
                    maxTheoryMarks: data.maxTheoryMarks || 100,
                    maxPracticalMarks: 0,
                    hasPractical: data.hasPractical || data.practical > 0 ? true : false,
                    totalMarks: data.totalMarks || 100,
                    examTerm: report.examTerm || "",
                    creditHours: data.creditHours || 1,
                  }
                  subjects.push(subject)
                  totalMarks += subject.theoryMarks + subject.practicalMarks
                })
              }
            } catch (error) {
              console.error(`Error getting marks for ${student.name}:`, error)
            }
          }

          // If still no subjects found, create dummy subjects for the report
          if (subjects.length === 0) {
            console.log(`No subjects found for ${student.name}, creating dummy subjects`)
            // Create some default subjects based on grade
            const defaultSubjects = getDefaultSubjectsForGrade(student.grade)
            subjects = defaultSubjects.map((name) => ({
              id: `dummy-${name.replace(/\s+/g, "-").toLowerCase()}`,
              name: name,
              theoryMarks: 0,
              practicalMarks: 0,
              finalGrade: "N/A",
              gradePoint: 0,
              maxTheoryMarks: 100,
              maxPracticalMarks: 0,
              hasPractical: false,
              totalMarks: 100,
              examTerm: report.examTerm,
              creditHours: 1,
            }))
          }

          // Get attendance for this student
          let attendanceQuery = query(
            collection(db, "attendance"),
            where("studentId", "==", student.id),
            where("grade", "==", student.grade),
          )

          // Add section filter if available
          if (student.sectionId) {
            attendanceQuery = query(
              collection(db, "attendance"),
              where("studentId", "==", student.id),
              where("grade", "==", student.grade),
              where("sectionId", "==", student.sectionId),
            )
          }

          const attendanceSnapshot = await getDocs(attendanceQuery)
          const attendanceList: Attendance[] = []
          attendanceSnapshot.forEach((doc) => {
            const data = doc.data()
            attendanceList.push({
              id: doc.id,
              studentId: data.studentId,
              date: data.date && typeof data.date.toDate === "function" ? data.date.toDate() : new Date(),
              status: data.status || "",
              grade: data.grade || "",
              section: data.section || "",
              sectionId: data.sectionId || "",
            })
          })

          // UPDATED: Calculate GPA and percentage using fixed total marks
          let totalGradePoints = 0
          let subjectCount = 0

          subjects.forEach((subject) => {
            totalGradePoints += subject.gradePoint
            subjectCount++
          })

          const gpa = subjectCount > 0 ? totalGradePoints / subjectCount : 0
          // UPDATED: Use fixed percentage calculation
          const percentage = calculatePercentage(totalMarks, student.grade)

          studentsWithMarks.push({
            student,
            totalMarks,
            subjects,
            rank: 0, // Will be calculated later
            attendanceList,
            gpa,
            percentage,
          })
        } catch (error: any) {
          console.error(`Error processing student ${student.name}:`, error)
        }
      }

      // Calculate ranks
      studentsWithMarks.sort((a, b) => b.totalMarks - a.totalMarks)
      studentsWithMarks.forEach((student, index) => {
        student.rank = index + 1
      })

      setReportData(studentsWithMarks)
    } catch (error: any) {
      console.error("Error loading report data:", error)
      toast({
        title: "Error",
        description: `Failed to load report data: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setViewingReport(null)
    }
  }

  const getDefaultSubjectsForGrade = (grade: string): string[] => {
    // Define default subjects based on grade
    const subjectsByGrade: { [key: string]: string[] } = {
      "P.G": ["English", "Nepali", "Math", "Science", "Social Studies"],
      Nursery: ["English", "Nepali", "Math", "Drawing", "General Knowledge"],
      Lkg: ["English", "Nepali", "Math", "Drawing", "General Knowledge"],
      Ukg: ["English", "Nepali", "Math", "Drawing", "General Knowledge"],
      "1": ["English", "Nepali", "Math", "Science", "Social Studies"],
      "2": ["English", "Nepali", "Math", "Science", "Social Studies"],
      "3": ["English", "Nepali", "Math", "Science", "Social Studies"],
      "4": ["English", "Nepali", "Math", "Science", "Social Studies"],
      "5": ["English", "Nepali", "Math", "Science", "Social Studies"],
      "6": ["English", "Nepali", "Math", "Science", "Social Studies"],
    }

    return subjectsByGrade[grade] || ["English", "Nepali", "Math", "Science", "Social Studies"]
  }

  const handleViewReport = async (report: GeneratedReport) => {
    setSelectedReport(report)
    await loadReportData(report)
    setViewDialogOpen(true)
  }

  // Function to download all grade sheets as a ZIP file
  const downloadAllGradeSheets = async (report: GeneratedReport) => {
    try {
      setBatchPrinting(true)

      // First load the report data if not already loaded
      if (!reportData.length || selectedReport?.id !== report.id) {
        setSelectedReport(report)
        await loadReportData(report)
      }

      // Show a toast with the number of grade sheets being prepared
      toast({
        title: "Preparing Grade Sheets",
        description: `Preparing ${reportData.length} grade sheets for download. This may take a moment...`,
      })

      // Generate individual PDFs for each student
      const pdfBlobs: Blob[] = []
      for (const studentData of reportData) {
        try {
          // Generate the PDF blob for this student
          const pdfBlob = await generateStudentPDF(
            studentData,
            studentData.subjects.map((s) => s.name),
          )
          pdfBlobs.push(pdfBlob)
        } catch (error) {
          console.error(`Error generating PDF for ${studentData.student.name}:`, error)
        }
      }

      if (pdfBlobs.length === 0) {
        toast({
          title: "Error",
          description: "Failed to generate any grade sheets for download",
          variant: "destructive",
        })
        setBatchPrinting(false)
        return
      }

      // Create a ZIP file
      const zip = new JSZip()
      pdfBlobs.forEach((blob, index) => {
        const studentName = reportData[index]?.student.name || `Student ${index + 1}`
        zip.file(`${studentName}.pdf`, blob)
      })

      // Generate the ZIP file as a blob
      const zipBlob = await zip.generateAsync({ type: "blob" })

      // Save the ZIP file
      const sectionInfo = report.section ? `_Section${report.section}` : ""
      const zipFileName = `GradeSheets_Grade${report.grade}${sectionInfo}_${report.examTerm.replace(/\s+/g, "_")}.zip`
      saveAs(zipBlob, zipFileName)

      toast({
        title: "Download Started",
        description: `Downloading ${reportData.length} grade sheets as a ZIP file.`,
      })
    } catch (error: any) {
      console.error("Error downloading grade sheets:", error)
      toast({
        title: "Error",
        description: `Failed to download grade sheets: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setBatchPrinting(false)
    }
  }

  if (permissionChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Permission Required</AlertTitle>
              <AlertDescription>{permissionMessage}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push("/teacher/login")} className="w-full mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Generate Reports</h1>
              <p className="text-gray-600">Generate grade reports for students</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/teacher/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Generation Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Generate New Report</CardTitle>
                <CardDescription>Select grade, section, and exam term to generate reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Grade Selection */}
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.displayName || classItem.name}>
                          {classItem.displayName || classItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Selection */}
                <div className="space-y-2">
                  <Label htmlFor="section">Section (Optional)</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection} disabled={loadingSections}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSections ? "Loading sections..." : "Select section"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Term Selection */}
                <div className="space-y-2">
                  <Label htmlFor="examTerm">Exam Term</Label>
                  <Select value={selectedExamTerm} onValueChange={setSelectedExamTerm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam term" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTerms.map((term) => (
                        <SelectItem key={term.id} value={term.name}>
                          {term.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateReportsClick}
                  disabled={generating || !selectedGrade || !selectedExamTerm}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Reports"
                  )}
                </Button>

                {/* Progress */}
                {generating && (
                  <div className="space-y-2">
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-gray-600">{generationStatus}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Generated Reports List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Generated Reports</CardTitle>
                    <CardDescription>Previously generated reports</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadGeneratedReports} disabled={refreshing}>
                    <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {generatedReports.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No reports generated yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {generatedReports.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">
                                Grade {report.grade}
                                {report.section && ` - Section ${report.section}`}
                              </h3>
                              <span className="text-sm text-gray-500">• {report.examTerm}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>Total: {report.totalStudents}</span>
                              <span className="text-green-600">Success: {report.successfulReports}</span>
                              {report.failedReports > 0 && (
                                <span className="text-red-600">Failed: {report.failedReports}</span>
                              )}
                              <span>Generated: {format(report.generatedAt, "MMM dd, yyyy HH:mm")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReport(report)}
                              disabled={viewingReport === report.id}
                            >
                              {viewingReport === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadReport(report)}
                              disabled={viewingReport === report.id}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => printReport(report)}
                              disabled={printingReport === report.id}
                            >
                              {printingReport === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Report Generation</DialogTitle>
              <DialogDescription>
                Are you sure you want to generate reports for Grade {selectedGrade}
                {selectedSection && ` - Section ${sections.find((s) => s.id === selectedSection)?.name}`} for{" "}
                {selectedExamTerm}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateReports}>Generate Reports</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Report Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Report - Grade {selectedReport?.grade}
                {selectedReport?.section && ` - Section ${selectedReport.section}`} - {selectedReport?.examTerm}
              </DialogTitle>
              <DialogDescription>
                Generated on {selectedReport && format(selectedReport.generatedAt, "MMM dd, yyyy 'at' HH:mm")}
              </DialogDescription>
            </DialogHeader>
            {reportData.length > 0 && (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="individual">Individual Grade Sheets</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Class Summary</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedReport && downloadReport(selectedReport)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Summary
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedReport && printReport(selectedReport)}
                        disabled={printingReport === selectedReport?.id}
                      >
                        {printingReport === selectedReport?.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        Print Summary
                      </Button>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{reportData.length}</div>
                      <div className="text-sm text-blue-600">Total Students</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {reportData.filter((s) => (s.gpa || 0) >= 1.6).length}
                      </div>
                      <div className="text-sm text-green-600">Pass</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {reportData.filter((s) => (s.gpa || 0) < 1.6).length}
                      </div>
                      <div className="text-sm text-red-600">Fail</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {((reportData.filter((s) => (s.gpa || 0) >= 1.6).length / reportData.length) * 100).toFixed(2)}%
                      </div>
                      <div className="text-sm text-purple-600">Pass Rate</div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Rank</TableHead>
                          <TableHead className="text-center">Roll</TableHead>
                          <TableHead>Name</TableHead>
                          {getAllSubjectNames(reportData).map((subject) => (
                            <TableHead key={subject} className="text-center">
                              {subject}
                            </TableHead>
                          ))}
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">%</TableHead>
                          <TableHead className="text-center">GPA</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-center">Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((student) => {
                          const isPass = student.gpa && student.gpa >= 1.6
                          const allSubjects = getAllSubjectNames(reportData)
                          return (
                            <TableRow key={student.student.id}>
                              <TableCell className="text-center font-medium">{student.rank}</TableCell>
                              <TableCell className="text-center">{student.student.rollNumber}</TableCell>
                              <TableCell className="font-medium">{student.student.name}</TableCell>
                              {allSubjects.map((subjectName) => {
                                const subject = student.subjects.find((s) => s.name === subjectName)
                                if (subject) {
                                  // Show the final grade if available, otherwise calculate from marks
                                  const displayGrade =
                                    subject.finalGrade && subject.finalGrade !== ""
                                      ? subject.finalGrade
                                      : getGradeFromMarks(
                                          subject.theoryMarks + subject.practicalMarks,
                                          subject.maxTheoryMarks +
                                            (subject.hasPractical ? subject.maxPracticalMarks : 0),
                                        )
                                  return (
                                    <TableCell key={subjectName} className="text-center">
                                      {displayGrade}
                                    </TableCell>
                                  )
                                } else {
                                  return (
                                    <TableCell key={subjectName} className="text-center text-gray-400">
                                      -
                                    </TableCell>
                                  )
                                }
                              })}
                              <TableCell className="text-center font-medium">{student.totalMarks}</TableCell>
                              <TableCell className="text-center">{student.percentage.toFixed(2)}%</TableCell>
                              <TableCell className="text-center">{student.gpa?.toFixed(2) || 0}</TableCell>
                              <TableCell className="text-center font-medium">
                                {getGradeFromGPA(student.gpa || 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isPass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {isPass ? "Pass" : "Fail"}
                                </span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                <TabsContent value="individual" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Individual Grade Sheets</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedReport && downloadAllGradeSheets(selectedReport)}
                        disabled={batchPrinting}
                      >
                        {batchPrinting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedReport && printAllGradeSheets(selectedReport)}
                        disabled={batchPrinting}
                      >
                        {batchPrinting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        Print All
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {reportData.map((student) => (
                      <div key={student.student.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h4 className="font-medium">{student.student.name}</h4>
                            <p className="text-sm text-gray-600">
                              Roll: {student.student.rollNumber} | Rank: {student.rank} | GPA:{" "}
                              {student.gpa?.toFixed(2) || 0} | Percentage: {student.percentage.toFixed(2)}%
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {student.student.resultPdfUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(student.student.resultPdfUrl, "_blank")}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {student.subjects.map((subject) => (
                            <div key={subject.id} className="bg-gray-50 p-3 rounded">
                              <div className="font-medium text-sm">{subject.name}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                {/* Show the final grade if available, otherwise calculate from marks */}
                                Grade:{" "}
                                {subject.finalGrade && subject.finalGrade !== ""
                                  ? subject.finalGrade
                                  : getGradeFromMarks(
                                      subject.theoryMarks + subject.practicalMarks,
                                      subject.maxTheoryMarks + (subject.hasPractical ? subject.maxPracticalMarks : 0),
                                    )}
                              </div>
                              <div className="text-xs text-gray-600">
                                Marks: {subject.theoryMarks + subject.practicalMarks}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Hidden iframe for printing */}
        <iframe ref={printFrameRef} style={{ display: "none" }} />
      </div>
    </div>
  )
}
