"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { Download, FileSpreadsheet, FileText, Loader2, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { usePDF } from "react-to-pdf"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Interface for Student
interface Student {
  id: string
  name: string
  firstName?: string
  middleName?: string
  lastName?: string
  rollNumber: string
  grade: string
  section: string
  sectionId?: string
  classId?: string
  subjects: Subject[]
  totalMarks: number
  percentage: number
  rank: number
  attendance: number
  totalClasses: number
  attendancePercentage?: number
  attendanceRecords?: AttendanceRecord[]
  [key: string]: any // Allow additional properties
}

// Interface for Subject
interface Subject {
  id: string
  name: string
  theoryMarks: number
  practicalMarks: number
  maxTheoryMarks: number
  maxPracticalMarks: number
  fullMarks?: number
  obtainedMarks?: number
  gradePoint?: number
  finalGrade?: string
  creditHours?: number
  examTerm?: string
  section?: string
  hasPractical?: boolean
  [key: string]: any // Allow additional properties
}

// Interface for Class
interface Class {
  id: string
  name: string
  displayName?: string
  order?: number
  sections?: string[]
}

// Interface for Section
interface Section {
  id: string
  name: string
  classId?: string
}

// Interface for Attendance Record
interface AttendanceRecord {
  id: string
  date: string
  bsDate?: string
  status: string
  studentId: string
  classId: string
  sectionId: string
  grade: string
  section: string
  teacherId?: string
  teacherName?: string
}

export default function ClassMarksExportPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  // Class and section state
  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [selectedClassName, setSelectedClassName] = useState<string>("")
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all")
  const [selectedSectionName, setSelectedSectionName] = useState<string>("All Sections")

  const [selectedExamTerm, setSelectedExamTerm] = useState<string>("")
  const [examTerms, setExamTerms] = useState<string[]>([])
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("marks")
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  // References for PDF generation
  const marksTableRef = useRef<HTMLDivElement>(null)
  const attendanceTableRef = useRef<HTMLDivElement>(null)

  // Initialize react-to-pdf hooks
  const { toPDF: marksTableToPDF, targetRef: marksTargetRef } = usePDF({
    filename: `class-${selectedClassName}-${selectedSectionId !== "all" ? `section-${selectedSectionName}-` : ""}${selectedExamTerm.replace(/\s+/g, "-")}.pdf`,
  })

  const { toPDF: attendanceTableToPDF, targetRef: attendanceTargetRef } = usePDF({
    filename: `attendance-class-${selectedClassName}-${selectedSectionId !== "all" ? `section-${selectedSectionName}` : "all-sections"}.pdf`,
  })

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    // Load classes first
    loadClasses()

    // Load exam terms
    fetchExamTerms()
  }, [teacherId, router])

  useEffect(() => {
    if (selectedClassId) {
      loadSectionsForClass(selectedClassId)
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedClassId && selectedExamTerm) {
      fetchStudents()
    }
  }, [selectedClassId, selectedSectionId, selectedExamTerm])

  const loadClasses = async () => {
    setLoadingClasses(true)
    setError(null)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo classes
        const demoClasses: Class[] = [
          { id: "pg", name: "PG", displayName: "P.G" },
          { id: "nursery", name: "Nursery", displayName: "Nursery" },
          { id: "lkg", name: "LKG", displayName: "LKG" },
          { id: "ukg", name: "UKG", displayName: "UKG" },
          { id: "1", name: "1", displayName: "1" },
          { id: "2", name: "2", displayName: "2" },
          { id: "3", name: "3", displayName: "3" },
          { id: "4", name: "4", displayName: "4" },
          { id: "5", name: "5", displayName: "5" },
          { id: "6", name: "6", displayName: "6" },
          { id: "7", name: "7", displayName: "7" },
          { id: "8", name: "8", displayName: "8" },
          { id: "9", name: "9", displayName: "9" },
          { id: "10", name: "10", displayName: "10" },
        ]
        setClasses(demoClasses)
      } else {
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
              displayName: data.displayName || `Class ${data.name || doc.id}`,
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
            { id: "pg", name: "PG", displayName: "P.G" },
            { id: "nursery", name: "Nursery", displayName: "Nursery" },
            { id: "lkg", name: "LKG", displayName: "LKG" },
            { id: "ukg", name: "UKG", displayName: "UKG" },
            { id: "1", name: "1", displayName: "1" },
            { id: "2", name: "2", displayName: "2" },
            { id: "3", name: "3", displayName: "3" },
            { id: "4", name: "4", displayName: "4" },
            { id: "5", name: "5", displayName: "5" },
            { id: "6", name: "6", displayName: "6" },
            { id: "7", name: "7", displayName: "7" },
            { id: "8", name: "8", displayName: "8" },
            { id: "9", name: "9", displayName: "9" },
            { id: "10", name: "10", displayName: "10" },
          ]

          setClasses(defaultClasses)
        }
      }
    } catch (error: any) {
      console.error("Error loading classes:", error)
      setError(`Error loading classes: ${error.message}`)

      // Set default classes on error
      const defaultClasses: Class[] = [
        { id: "pg", name: "PG", displayName: "P.G" },
        { id: "nursery", name: "Nursery", displayName: "Nursery" },
        { id: "lkg", name: "LKG", displayName: "LKG" },
        { id: "ukg", name: "UKG", displayName: "UKG" },
        { id: "1", name: "1", displayName: "1" },
        { id: "2", name: "2", displayName: "2" },
        { id: "3", name: "3", displayName: "3" },
        { id: "4", name: "4", displayName: "4" },
        { id: "5", name: "5", displayName: "5" },
        { id: "6", name: "6", displayName: "6" },
        { id: "7", name: "7", displayName: "7" },
        { id: "8", name: "8", displayName: "8" },
        { id: "9", name: "9", displayName: "9" },
        { id: "10", name: "10", displayName: "10" },
      ]

      setClasses(defaultClasses)
    } finally {
      setLoadingClasses(false)
    }
  }

  const loadSectionsForClass = async (classId: string) => {
    setLoadingSections(true)
    setSections([])
    setSelectedSectionId("all")
    setSelectedSectionName("All Sections")

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Use demo sections
        const demoSections: Section[] = [
          { id: "A", name: "A", classId },
          { id: "B", name: "B", classId },
          { id: "C", name: "C", classId },
        ]
        setSections(demoSections)
      } else {
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
    } finally {
      setLoadingSections(false)
    }
  }

  const fetchExamTerms = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo exam terms
        setExamTerms(["First Term", "Second Term", "Third Term", "Fourth Term"])
        setLoading(false)
      } else {
        // Load real data from Firebase
        const examTermsQuery = collection(db, "examTerms")
        const querySnapshot = await getDocs(examTermsQuery)
        const termsList: string[] = []

        querySnapshot.forEach((doc) => {
          const term = doc.data().name
          termsList.push(term)
        })

        setExamTerms(termsList.length > 0 ? termsList : ["First Term", "Second Term", "Third Term", "Fourth Term"])
        setLoading(false)
      }
    } catch (error) {
      console.error("Error fetching exam terms:", error)
      // Fallback to default terms if there's an error
      setExamTerms(["First Term", "Second Term", "Third Term", "Fourth Term"])
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    setLoadingStudents(true)
    setError(null)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo students with subjects
        const subjects = [
          { name: "English", maxTheoryMarks: 75, maxPracticalMarks: 25, hasPractical: true },
          { name: "Nepali", maxTheoryMarks: 75, maxPracticalMarks: 25, hasPractical: true },
          { name: "Mathematics", maxTheoryMarks: 100, maxPracticalMarks: 0, hasPractical: false },
          { name: "Science", maxTheoryMarks: 75, maxPracticalMarks: 25, hasPractical: true },
          { name: "Social Studies", maxTheoryMarks: 75, maxPracticalMarks: 25, hasPractical: true },
          { name: "Computer", maxTheoryMarks: 50, maxPracticalMarks: 50, hasPractical: true },
        ]

        const demoStudents: Student[] = Array.from({ length: 10 }, (_, i) => {
          // Generate random marks for each subject
          const studentSubjects: Subject[] = subjects.map((subj) => {
            const theoryMarks =
              Math.floor(Math.random() * (subj.maxTheoryMarks * 0.5)) + Math.floor(subj.maxTheoryMarks * 0.5)
            const practicalMarks = subj.hasPractical
              ? Math.floor(Math.random() * (subj.maxPracticalMarks * 0.5)) + Math.floor(subj.maxPracticalMarks * 0.5)
              : 0
            const totalMarks = theoryMarks + practicalMarks
            const percentage = (totalMarks / (subj.maxTheoryMarks + subj.maxPracticalMarks)) * 100

            let grade = ""
            let gradePoint = 0

            if (percentage >= 90) {
              grade = "A+"
              gradePoint = 4.0
            } else if (percentage >= 80) {
              grade = "A"
              gradePoint = 3.6
            } else if (percentage >= 70) {
              grade = "B+"
              gradePoint = 3.2
            } else if (percentage >= 60) {
              grade = "B"
              gradePoint = 2.8
            } else if (percentage >= 50) {
              grade = "C+"
              gradePoint = 2.4
            } else if (percentage >= 40) {
              grade = "C"
              gradePoint = 2.0
            } else if (percentage >= 30) {
              grade = "D"
              gradePoint = 1.6
            } else {
              grade = "E"
              gradePoint = 0.8
            }

            return {
              id: `subject-${i}-${subj.name}`,
              name: subj.name,
              fullMarks: subj.maxTheoryMarks + subj.maxPracticalMarks,
              passMarks: Math.floor((subj.maxTheoryMarks + subj.maxPracticalMarks) * 0.4),
              obtainedMarks: totalMarks,
              grade: grade,
              theoryMarks: theoryMarks,
              practicalMarks: practicalMarks,
              finalGrade: grade,
              gradePoint: gradePoint,
              remarks: percentage >= 40 ? "Pass" : "Fail",
              examTerm: selectedExamTerm,
              maxTheoryMarks: subj.maxTheoryMarks,
              maxPracticalMarks: subj.maxPracticalMarks,
              hasPractical: subj.hasPractical,
            }
          })

          // Filter subjects by selected exam term
          const termSubjects = studentSubjects.filter((subject) => subject.examTerm === selectedExamTerm)

          // Calculate total marks and percentage based on filtered subjects
          const totalObtained = termSubjects.reduce((sum, subj) => sum + (subj.obtainedMarks || 0), 0)
          const totalFull = termSubjects.reduce((sum, subj) => sum + (subj.fullMarks || 0), 0)
          const percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0

          // Create section based on selectedSectionId
          const sectionObj = sections.find(
            (s) => s.id === (selectedSectionId === "all" ? ["A", "B", "C"][i % 3] : selectedSectionId),
          )
          const sectionName = sectionObj ? sectionObj.name : selectedSectionId === "all" ? ["A", "B", "C"][i % 3] : "A"

          // Generate random attendance records
          const totalClasses = 200
          const presentDays = Math.floor(Math.random() * 50) + 150

          // Create demo attendance records
          const attendanceRecords: AttendanceRecord[] = Array.from({ length: totalClasses }, (_, index) => {
            const date = new Date(2025, 0, index + 1).toISOString().split("T")[0]
            return {
              id: `attendance-${i}-${index}`,
              date: date,
              bsDate: `2082-${Math.floor(index / 30) + 1}-${(index % 30) + 1}`,
              status: index < presentDays ? "present" : "absent",
              studentId: `student${i + 1}`,
              classId: selectedClassId,
              sectionId: sectionObj ? sectionObj.id : ["A", "B", "C"][i % 3],
              grade: selectedClassName,
              section: sectionName,
              teacherId: "teacher1",
              teacherName: "Demo Teacher",
            }
          })

          return {
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
            grade: selectedClassName,
            section: sectionName,
            sectionId: sectionObj
              ? sectionObj.id
              : selectedSectionId === "all"
                ? ["A", "B", "C"][i % 3]
                : selectedSectionId,
            symbolNumber: `SYM${selectedClassName}${i + 1}`,
            address: "Kathmandu",
            usesBus: i % 3 === 0,
            busRoute: i % 3 === 0 ? "Route A" : "",
            resultPdfUrl: "",
            subjects: termSubjects,
            totalMarks: totalObtained,
            percentage: percentage,
            rank: 0,
            attendance: presentDays,
            totalClasses: totalClasses,
            attendancePercentage: (presentDays / totalClasses) * 100,
            attendanceRecords: attendanceRecords,
            monthlyFee: 1500,
            dues: i % 5 === 0 ? 1500 : 0,
            currentSubject: null,
            attendanceStatus: "",
            attendanceId: "",
            isSelected: false,
            qrCode: null,
            profilePictureUrl: null,
            transportationFee: i % 3 === 0 ? 500 : 0,
          }
        })

        // Filter by section if needed
        let filteredStudents = demoStudents
        if (selectedSectionId !== "all") {
          filteredStudents = demoStudents.filter(
            (student) => student.sectionId === selectedSectionId || student.section === selectedSectionName,
          )
        }

        // Calculate ranks for filtered students
        filteredStudents.sort((a, b) => b.totalMarks - a.totalMarks)
        filteredStudents.forEach((student, index) => {
          student.rank = index + 1
        })

        // Sort by roll number for display
        filteredStudents.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setStudents(filteredStudents)
        console.log(`Demo mode: Generated ${filteredStudents.length} students with marks for ${selectedExamTerm}`)

        // After loading students, fetch their attendance
        await fetchAttendanceData(filteredStudents)
      } else {
        // Find the class name from the classes array
        const classObj = classes.find((c) => c.id === selectedClassId)
        const className = classObj ? classObj.name : selectedClassId

        // Find the section name from the sections array if a section is selected
        let sectionName = "All Sections"
        if (selectedSectionId !== "all") {
          const sectionObj = sections.find((s) => s.id === selectedSectionId)
          sectionName = sectionObj ? sectionObj.name : selectedSectionId
        }

        console.log(
          `Fetching students for class: ${className}, section: ${sectionName}, exam term: ${selectedExamTerm}`,
        )

        // Build the query based on class and section
        let studentsQuery

        if (selectedSectionId !== "all") {
          // Try to query by sectionId first
          console.log(`Querying by sectionId: ${selectedSectionId}`)
          studentsQuery = query(
            collection(db, "students"),
            where("sectionId", "==", selectedSectionId),
            orderBy("rollNumber"),
          )
        } else {
          // If no section selected, query by class
          console.log(`Querying by grade: ${className}`)
          studentsQuery = query(collection(db, "students"), where("grade", "==", className), orderBy("rollNumber"))
        }

        const querySnapshot = await getDocs(studentsQuery)
        console.log(`Query returned ${querySnapshot.size} students`)

        const studentsList: Student[] = []

        // Process each student document
        for (const studentDoc of querySnapshot.docs) {
          const student = studentDoc.data() as Student
          student.id = studentDoc.id

          console.log(`Processing student: ${student.name} (ID: ${student.id})`)

          // IMPORTANT: Query the subjects subcollection for this student
          const subjectsRef = collection(db, "students", student.id, "subjects")

          // Add examTerm filter to the query
          const subjectsQuery = query(subjectsRef, where("examTerm", "==", selectedExamTerm))
          const subjectsSnapshot = await getDocs(subjectsQuery)

          console.log(`Found ${subjectsSnapshot.size} subjects for ${student.name} in ${selectedExamTerm}`)

          // Load all subjects for this student
          const subjects: Subject[] = []

          subjectsSnapshot.forEach((subjectDoc) => {
            const subjectData = subjectDoc.data() as Subject
            subjectData.id = subjectDoc.id

            // Based on the Firebase structure, we need to calculate obtainedMarks from theoryMarks and practicalMarks
            const theoryMarks = subjectData.theoryMarks || 0
            const practicalMarks = subjectData.practicalMarks || 0

            // Set obtainedMarks as the sum of theory and practical marks
            subjectData.obtainedMarks = theoryMarks + practicalMarks

            // Set fullMarks based on maxTheoryMarks and maxPracticalMarks
            subjectData.fullMarks = (subjectData.maxTheoryMarks || 0) + (subjectData.maxPracticalMarks || 0)

            // Add the subject to the list
            subjects.push(subjectData)

            console.log(
              `Subject: ${subjectData.name}, Theory: ${theoryMarks}, Practical: ${practicalMarks}, Total: ${subjectData.obtainedMarks}`,
            )
          })

          // Assign subjects to student
          student.subjects = subjects

          // Calculate total marks and percentage
          const totalObtained = subjects.reduce((sum, subj) => sum + (subj.obtainedMarks || 0), 0)
          const totalFull = subjects.reduce((sum, subj) => sum + (subj.fullMarks || 0), 0)

          student.totalMarks = totalObtained
          student.percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0

          console.log(
            `${student.name}: Total Marks = ${totalObtained}, Percentage = ${student.percentage?.toFixed(2)}%, Subjects: ${subjects.length}`,
          )

          studentsList.push(student)
        }

        // If we queried by sectionId but got no results, try by section name
        if (studentsList.length === 0 && selectedSectionId !== "all") {
          console.log(`No results with sectionId, trying with section name: ${sectionName}`)

          studentsQuery = query(
            collection(db, "students"),
            where("grade", "==", className),
            where("section", "==", sectionName),
            orderBy("rollNumber"),
          )

          const sectionQuerySnapshot = await getDocs(studentsQuery)
          console.log(`Section name query returned ${sectionQuerySnapshot.size} students`)

          // Process each student document from the section name query
          for (const studentDoc of sectionQuerySnapshot.docs) {
            const student = studentDoc.data() as Student
            student.id = studentDoc.id

            console.log(`Processing student by section name: ${student.name} (ID: ${student.id})`)

            // Query the subjects subcollection for this student
            const subjectsRef = collection(db, "students", student.id, "subjects")
            const subjectsQuery = query(subjectsRef, where("examTerm", "==", selectedExamTerm))
            const subjectsSnapshot = await getDocs(subjectsQuery)

            console.log(`Found ${subjectsSnapshot.size} subjects for ${student.name} in ${selectedExamTerm}`)

            // Load all subjects for this student
            const subjects: Subject[] = []

            subjectsSnapshot.forEach((subjectDoc) => {
              const subjectData = subjectDoc.data() as Subject
              subjectData.id = subjectDoc.id

              // Calculate obtainedMarks from theoryMarks and practicalMarks
              const theoryMarks = subjectData.theoryMarks || 0
              const practicalMarks = subjectData.practicalMarks || 0
              subjectData.obtainedMarks = theoryMarks + practicalMarks

              // Set fullMarks based on maxTheoryMarks and maxPracticalMarks
              subjectData.fullMarks = (subjectData.maxTheoryMarks || 0) + (subjectData.maxPracticalMarks || 0)

              subjects.push(subjectData)

              console.log(
                `Subject: ${subjectData.name}, Theory: ${theoryMarks}, Practical: ${practicalMarks}, Total: ${subjectData.obtainedMarks}`,
              )
            })

            // Assign subjects to student
            student.subjects = subjects

            // Calculate total marks and percentage
            const totalObtained = subjects.reduce((sum, subj) => sum + (subj.obtainedMarks || 0), 0)
            const totalFull = subjects.reduce((sum, subj) => sum + (subj.fullMarks || 0), 0)

            student.totalMarks = totalObtained
            student.percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0

            console.log(
              `${student.name}: Total Marks = ${totalObtained}, Percentage = ${student.percentage?.toFixed(2)}%, Subjects: ${subjects.length}`,
            )

            studentsList.push(student)
          }
        }

        // If still no students found, try a fallback query
        if (studentsList.length === 0) {
          console.log("No students found with primary queries, trying fallback query")

          // Try a more general query
          const fallbackQuery = query(collection(db, "students"), where("grade", "==", className))
          const fallbackSnapshot = await getDocs(fallbackQuery)

          console.log(`Fallback query returned ${fallbackSnapshot.size} students`)

          // Process each student from the fallback query
          for (const studentDoc of fallbackSnapshot.docs) {
            const student = studentDoc.data() as Student
            student.id = studentDoc.id

            // Only include students in the selected section if a section is selected
            if (
              selectedSectionId !== "all" &&
              student.sectionId !== selectedSectionId &&
              student.section !== sectionName
            ) {
              continue
            }

            console.log(`Processing student from fallback: ${student.name} (ID: ${student.id})`)

            // Query the subjects subcollection
            const subjectsRef = collection(db, "students", student.id, "subjects")
            const subjectsQuery = query(subjectsRef, where("examTerm", "==", selectedExamTerm))
            const subjectsSnapshot = await getDocs(subjectsQuery)

            console.log(`Found ${subjectsSnapshot.size} subjects for ${student.name} in ${selectedExamTerm}`)

            // Load subjects
            const subjects: Subject[] = []

            subjectsSnapshot.forEach((subjectDoc) => {
              const subjectData = subjectDoc.data() as Subject
              subjectData.id = subjectDoc.id

              // Calculate obtainedMarks from theoryMarks and practicalMarks
              const theoryMarks = subjectData.theoryMarks || 0
              const practicalMarks = subjectData.practicalMarks || 0
              subjectData.obtainedMarks = theoryMarks + practicalMarks

              // Set fullMarks based on maxTheoryMarks and maxPracticalMarks
              subjectData.fullMarks = (subjectData.maxTheoryMarks || 0) + (subjectData.maxPracticalMarks || 0)

              subjects.push(subjectData)

              console.log(
                `Subject: ${subjectData.name}, Theory: ${theoryMarks}, Practical: ${practicalMarks}, Total: ${subjectData.obtainedMarks}`,
              )
            })

            student.subjects = subjects

            // Calculate total marks
            const totalObtained = subjects.reduce((sum, subj) => sum + (subj.obtainedMarks || 0), 0)
            const totalFull = subjects.reduce((sum, subj) => sum + (subj.fullMarks || 0), 0)

            student.totalMarks = totalObtained
            student.percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0

            console.log(
              `${student.name}: Total Marks = ${totalObtained}, Percentage = ${student.percentage?.toFixed(2)}%, Subjects: ${subjects.length}`,
            )

            studentsList.push(student)
          }
        }

        // Calculate ranks based on total marks
        studentsList.sort((a, b) => (b.totalMarks || 0) - (a.totalMarks || 0))
        studentsList.forEach((student, index) => {
          student.rank = index + 1
        })

        // Sort by roll number for display
        studentsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setStudents(studentsList)

        // After loading students, fetch their attendance
        await fetchAttendanceData(studentsList)
      }
    } catch (error: any) {
      console.error("Error fetching students:", error)
      setError(`Error fetching students: ${error.message}`)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchAttendanceData = async (studentsList: Student[]) => {
    setLoadingAttendance(true)
    setDebug(null)

    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (!isDemoMode && studentsList.length > 0) {
        console.log("Fetching attendance data for students")

        // Create a copy of the students list to update with attendance data
        const updatedStudents = [...studentsList]

        // For each student, fetch their attendance records
        for (let i = 0; i < updatedStudents.length; i++) {
          const student = updatedStudents[i]

          // Query the attendance collection for this student
          const attendanceQuery = query(
            collection(db, "attendance"),
            where("studentId", "==", student.id),
            where("grade", "==", student.grade),
          )

          try {
            const attendanceSnapshot = await getDocs(attendanceQuery)
            console.log(`Found ${attendanceSnapshot.size} attendance records for student ${student.name}`)

            // Process attendance records
            const attendanceRecords: AttendanceRecord[] = []
            let presentCount = 0
            let totalCount = 0

            attendanceSnapshot.forEach((doc) => {
              const data = doc.data() as AttendanceRecord
              data.id = doc.id

              attendanceRecords.push(data)
              totalCount++

              if (data.status.toLowerCase() === "present") {
                presentCount++
              }
            })

            // Update student with attendance data
            student.attendanceRecords = attendanceRecords
            student.attendance = presentCount
            student.totalClasses = totalCount
            student.attendancePercentage = totalCount > 0 ? (presentCount / totalCount) * 100 : 0

            console.log(
              `Student ${student.name}: Present ${presentCount}/${totalCount} days (${student.attendancePercentage?.toFixed(2)}%)`,
            )
          } catch (error) {
            console.error(`Error fetching attendance for student ${student.id}:`, error)
          }
        }

        // Update the students state with the attendance data
        setStudents(updatedStudents)
        setDebug(`Successfully loaded attendance data for ${updatedStudents.length} students`)
      }
    } catch (error: any) {
      console.error("Error fetching attendance data:", error)
      setDebug(`Error fetching attendance: ${error.message}`)
    } finally {
      setLoadingAttendance(false)
    }
  }

  const getSubjectNames = () => {
    const subjectSet = new Set<string>()
    students.forEach((student) => {
      student.subjects?.forEach((subject) => {
        subjectSet.add(subject.name)
      })
    })
    return Array.from(subjectSet).sort()
  }

  const getClassDisplayName = (classId: string) => {
    const classObj = classes.find((c) => c.id === classId)
    if (!classObj) return `Class ${classId}`

    if (classObj.displayName) return classObj.displayName

    const name = classObj.name
    if (["pg", "nursery", "lkg", "ukg"].includes(name.toLowerCase())) {
      return name.toUpperCase()
    }

    return `Class ${name}`
  }

  const exportMarksToCSV = () => {
    setExportLoading("csv")
    try {
      const subjectNames = getSubjectNames()

      // Prepare data for export
      const data = students.map((student) => {
        const row: Record<string, any> = {
          "Roll No": student.rollNumber,
          Name: student.name,
          Class: student.grade,
          Section: student.section || "-",
        }

        // Add subject marks
        subjectNames.forEach((subjectName) => {
          const subject = student.subjects?.find((s) => s.name === subjectName)
          if (subject) {
            row[`${subjectName} (Theory)`] = subject.theoryMarks
            if (subject.hasPractical) {
              row[`${subjectName} (Practical)`] = subject.practicalMarks
            }
            row[`${subjectName} (Total)`] = subject.obtainedMarks
            row[`${subjectName} (Grade)`] = subject.grade
          } else {
            row[`${subjectName} (Theory)`] = "N/A"
            row[`${subjectName} (Practical)`] = "N/A"
            row[`${subjectName} (Total)`] = "N/A"
            row[`${subjectName} (Grade)`] = "N/A"
          }
        })

        // Add total and rank
        row["Total Marks"] = student.totalMarks
        row["Percentage"] = student.percentage?.toFixed(2) + "%"
        row["Rank"] = student.rank

        return row
      })

      const csv = convertToCSV(data)
      const fileName = `class-${selectedClassName}-${selectedSectionId !== "all" ? `section-${selectedSectionName}-` : ""}${selectedExamTerm.replace(/\s+/g, "-")}.csv`
      downloadFile(csv, fileName, "text/csv")
    } catch (error) {
      console.error("Error exporting to CSV:", error)
    } finally {
      setExportLoading(null)
    }
  }

  const exportMarksToExcel = () => {
    setExportLoading("excel")
    try {
      const subjectNames = getSubjectNames()

      // Prepare data for export
      const data = students.map((student) => {
        const row: Record<string, any> = {
          "Roll No": student.rollNumber,
          Name: student.name,
          Class: student.grade,
          Section: student.section || "-",
        }

        // Add subject marks
        subjectNames.forEach((subjectName) => {
          const subject = student.subjects?.find((s) => s.name === subjectName)
          if (subject) {
            row[`${subjectName} (Theory)`] = subject.theoryMarks
            if (subject.hasPractical) {
              row[`${subjectName} (Practical)`] = subject.practicalMarks
            }
            row[`${subjectName} (Total)`] = subject.obtainedMarks
            row[`${subjectName} (Grade)`] = subject.grade
          } else {
            row[`${subjectName} (Theory)`] = "N/A"
            row[`${subjectName} (Practical)`] = "N/A"
            row[`${subjectName} (Total)`] = "N/A"
            row[`${subjectName} (Grade)`] = "N/A"
          }
        })

        // Add total and rank
        row["Total Marks"] = student.totalMarks
        row["Percentage"] = student.percentage?.toFixed(2) + "%"
        row["Rank"] = student.rank

        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, `Class ${selectedClassName}`)

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const fileName = `class-${selectedClassName}-${selectedSectionId !== "all" ? `section-${selectedSectionName}-` : ""}${selectedExamTerm.replace(/\s+/g, "-")}.xlsx`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting to Excel:", error)
    } finally {
      setExportLoading(null)
    }
  }

  const exportMarksToPDF = () => {
    setExportLoading("pdf")
    try {
      // Make sure the marks tab is active before generating PDF
      setActiveTab("marks")

      // Use setTimeout to ensure the tab content is fully rendered
      setTimeout(() => {
        marksTableToPDF()
        setExportLoading(null)
      }, 100)
    } catch (error) {
      console.error("Error exporting to PDF:", error)
      setExportLoading(null)
    }
  }

  const exportAttendanceToCSV = () => {
    setExportLoading("csv")
    try {
      // Prepare data for export
      const data = students.map((student) => {
        return {
          "Roll No": student.rollNumber,
          Name: student.name,
          Class: student.grade,
          Section: student.section || "-",
          "Present Days": student.attendance || 0,
          "Total Days": student.totalClasses || 0,
          "Attendance %": student.totalClasses
            ? ((student.attendance / student.totalClasses) * 100).toFixed(2) + "%"
            : "N/A",
        }
      })

      const csv = convertToCSV(data)
      const fileName = `attendance-class-${selectedClassName}-${selectedSectionId !== "all" ? `section-${selectedSectionName}` : "all-sections"}.csv`
      downloadFile(csv, fileName, "text/csv")
    } catch (error) {
      console.error("Error exporting to CSV:", error)
    } finally {
      setExportLoading(null)
    }
  }

  const exportAttendanceToExcel = () => {
    setExportLoading("excel")
    try {
      // Prepare data for export
      const data = students.map((student) => {
        return {
          "Roll No": student.rollNumber,
          Name: student.name,
          Class: student.grade,
          Section: student.section || "-",
          "Present Days": student.attendance || 0,
          "Total Days": student.totalClasses || 0,
          "Attendance %": student.totalClasses
            ? ((student.attendance / student.totalClasses) * 100).toFixed(2) + "%"
            : "N/A",
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, `Class ${selectedClassName}`)

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const fileName = `attendance-class-${selectedClassName}-${selectedSectionId !== "all" ? `section-${selectedSectionName}` : "all-sections"}.xlsx`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting to Excel:", error)
    } finally {
      setExportLoading(null)
    }
  }

  const exportAttendanceToPDF = () => {
    setExportLoading("pdf")
    try {
      // Make sure the attendance tab is active before generating PDF
      setActiveTab("attendance")

      // Use setTimeout to ensure the tab content is fully rendered
      setTimeout(() => {
        attendanceTableToPDF()
        setExportLoading(null)
      }, 100)
    } catch (error) {
      console.error("Error exporting to PDF:", error)
      setExportLoading(null)
    }
  }

  const convertToCSV = (data: Record<string, any>[]) => {
    if (data.length === 0) return ""

    const header = Object.keys(data[0]).join(",")
    const rows = data.map((row) =>
      Object.values(row)
        .map((value) => (typeof value === "string" && value.includes(",") ? `"${value}"` : value))
        .join(","),
    )

    return [header, ...rows].join("\n")
  }

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClassChange = (value: string) => {
    const classObj = classes.find((c) => c.id === value)
    if (classObj) {
      setSelectedClassId(value)
      setSelectedClassName(classObj.name)

      // Reset section when class changes
      setSelectedSectionId("all")
      setSelectedSectionName("All Sections")
    }
  }

  const handleSectionChange = (value: string) => {
    setSelectedSectionId(value)

    if (value === "all") {
      setSelectedSectionName("All Sections")
    } else {
      const sectionObj = sections.find((s) => s.id === value)
      setSelectedSectionName(sectionObj ? sectionObj.name : value)
    }
  }

  const handleExamTermChange = (value: string) => {
    setSelectedExamTerm(value)
  }

  if (loading && (!selectedClassId || !selectedExamTerm)) {
    return (
      <div className="container py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Class Marks Export</h1>
            <p className="text-muted-foreground">Export marks and attendance data by class and section</p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/teacher/dashboard?id=${teacherId}`)}>
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="class-select" className="mb-2 block">
                  Select Class
                </Label>
                <Select value={selectedClassId} onValueChange={handleClassChange}>
                  <SelectTrigger id="class-select">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {getClassDisplayName(cls.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="section-select" className="mb-2 block">
                  Select Section
                </Label>
                <Select
                  value={selectedSectionId}
                  onValueChange={handleSectionChange}
                  disabled={!selectedClassId || loadingSections || sections.length === 0}
                >
                  <SelectTrigger id="section-select">
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        Section {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="exam-select" className="mb-2 block">
                  Select Exam Term
                </Label>
                <Select value={selectedExamTerm} onValueChange={handleExamTermChange}>
                  <SelectTrigger id="exam-select">
                    <SelectValue placeholder="Select Exam Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTerms.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <p className="text-muted-foreground">Please select a class and exam term to continue</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loadingStudents || loadingAttendance) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">
            {loadingStudents ? "Loading student data..." : "Loading attendance data..."}
          </p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Class Data Export</h1>
          <p className="text-muted-foreground">Export marks and attendance data by class and section</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/teacher/dashboard?id=${teacherId}`)}>
          Back to Dashboard
        </Button>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
              <p className="text-red-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {debug && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <p className="text-blue-600">{debug}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="class-select" className="mb-2 block">
                Select Class
              </Label>
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {getClassDisplayName(cls.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="section-select" className="mb-2 block">
                Select Section
              </Label>
              <Select
                value={selectedSectionId}
                onValueChange={handleSectionChange}
                disabled={!selectedClassId || loadingSections || sections.length === 0}
              >
                <SelectTrigger id="section-select">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      Section {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="exam-select" className="mb-2 block">
                Select Exam Term
              </Label>
              <Select value={selectedExamTerm} onValueChange={handleExamTermChange}>
                <SelectTrigger id="exam-select">
                  <SelectValue placeholder="Select Exam Term" />
                </SelectTrigger>
                <SelectContent>
                  {examTerms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClassId && selectedExamTerm && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getClassDisplayName(selectedClassId)}
              {selectedSectionId !== "all" && ` - Section ${selectedSectionName}`}
              {` - ${selectedExamTerm}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="marks">Marks Data</TabsTrigger>
                <TabsTrigger value="attendance">Attendance Data</TabsTrigger>
              </TabsList>

              <TabsContent value="marks" className="p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Export Marks</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export marks data for {getClassDisplayName(selectedClassId)}
                    {selectedSectionId !== "all" && ` - Section ${selectedSectionName}`}
                    {` - ${selectedExamTerm}`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={exportMarksToCSV} variant="outline" disabled={exportLoading !== null}>
                      {exportLoading === "csv" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Export to CSV
                    </Button>
                    <Button onClick={exportMarksToExcel} variant="outline" disabled={exportLoading !== null}>
                      {exportLoading === "excel" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                      )}
                      Export to Excel
                    </Button>
                    <Button onClick={exportMarksToPDF} variant="outline" disabled={exportLoading !== null}>
                      {exportLoading === "pdf" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export to PDF
                    </Button>
                  </div>
                </div>

                <div ref={marksTargetRef} className="overflow-x-auto">
                  <div className="text-center mb-4 print:block">
                    <h2 className="text-xl font-bold">Sajha Boarding School</h2>
                    <p className="text-lg">
                      {getClassDisplayName(selectedClassId)}
                      {selectedSectionId !== "all" && ` - Section ${selectedSectionName}`}
                      {` - ${selectedExamTerm} Results`}
                    </p>
                    <p className="text-sm text-muted-foreground">Generated on: {new Date().toLocaleDateString()}</p>
                  </div>

                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="p-2 text-left border border-gray-300">Roll No</th>
                        <th className="p-2 text-left border border-gray-300">Name</th>
                        <th className="p-2 text-left border border-gray-300">Section</th>
                        <th className="p-2 text-right border border-gray-300">Total Marks</th>
                        <th className="p-2 text-right border border-gray-300">Percentage</th>
                        <th className="p-2 text-center border border-gray-300">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                        .map((student) => (
                          <tr key={student.id} className="border-b border-gray-300">
                            <td className="p-2 border border-gray-300">{student.rollNumber}</td>
                            <td className="p-2 border border-gray-300">{student.name}</td>
                            <td className="p-2 border border-gray-300">{student.section || "-"}</td>
                            <td className="p-2 text-right border border-gray-300">{student.totalMarks || 0}</td>
                            <td className="p-2 text-right border border-gray-300">
                              {student.percentage?.toFixed(2) || 0}%
                            </td>
                            <td className="p-2 text-center border border-gray-300">
                              <span
                                className={`font-medium px-2 py-1 rounded-full ${
                                  student.rank === 1
                                    ? "bg-yellow-100 text-yellow-800"
                                    : student.rank === 2
                                      ? "bg-gray-100 text-gray-800"
                                      : student.rank === 3
                                        ? "bg-amber-100 text-amber-800"
                                        : ""
                                }`}
                              >
                                {student.rank || "-"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Export Attendance</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export attendance data for {getClassDisplayName(selectedClassId)}
                    {selectedSectionId !== "all" && ` - Section ${selectedSectionName}`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={exportAttendanceToCSV} variant="outline" disabled={exportLoading !== null}>
                      {exportLoading === "csv" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Export to CSV
                    </Button>
                    <Button onClick={exportAttendanceToExcel} variant="outline" disabled={exportLoading !== null}>
                      {exportLoading === "excel" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                      )}
                      Export to Excel
                    </Button>
                    <Button onClick={exportAttendanceToPDF} variant="outline" disabled={exportLoading !== null}>
                      {exportLoading === "pdf" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export to PDF
                    </Button>
                  </div>
                </div>

                <div ref={attendanceTargetRef} className="overflow-x-auto">
                  <div className="text-center mb-4 print:block">
                    <h2 className="text-xl font-bold">Sajha Boarding School</h2>
                    <p className="text-lg">
                      {getClassDisplayName(selectedClassId)}
                      {selectedSectionId !== "all" && ` - Section ${selectedSectionName}`}
                      {` - Attendance Report`}
                    </p>
                    <p className="text-sm text-muted-foreground">Generated on: {new Date().toLocaleDateString()}</p>
                  </div>

                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="p-2 text-left border border-gray-300">Roll No</th>
                        <th className="p-2 text-left border border-gray-300">Name</th>
                        <th className="p-2 text-left border border-gray-300">Section</th>
                        <th className="p-2 text-right border border-gray-300">Present Days</th>
                        <th className="p-2 text-right border border-gray-300">Total Days</th>
                        <th className="p-2 text-right border border-gray-300">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .sort((a, b) => {
                          const rollA = Number.parseInt(a.rollNumber) || 0
                          const rollB = Number.parseInt(b.rollNumber) || 0
                          return rollA - rollB
                        })
                        .map((student) => (
                          <tr key={student.id} className="border-b border-gray-300">
                            <td className="p-2 border border-gray-300">{student.rollNumber}</td>
                            <td className="p-2 border border-gray-300">{student.name}</td>
                            <td className="p-2 border border-gray-300">{student.section || "-"}</td>
                            <td className="p-2 text-right border border-gray-300">{student.attendance || 0}</td>
                            <td className="p-2 text-right border border-gray-300">{student.totalClasses || 0}</td>
                            <td className="p-2 text-right border border-gray-300">
                              {student.totalClasses
                                ? ((student.attendance / student.totalClasses) * 100).toFixed(1) + "%"
                                : "N/A"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {selectedClassId && selectedExamTerm && students.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No data found for the selected class, section, and exam term.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
