"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Loader2, Printer, Eye } from "lucide-react"
import { format } from "date-fns"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { getStorage } from "firebase/storage"
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
  percentage?: number
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

export default function ViewMarksPage() {
  const [loading, setLoading] = useState(true)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [reportData, setReportData] = useState<StudentWithMarks[]>([])
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null)
  const [viewingReport, setViewingReport] = useState<string | null>(null)
  const [printingReport, setPrintingReport] = useState<string | null>(null)
  const [batchPrinting, setBatchPrinting] = useState(false)
  const [studentGradeSheets, setStudentGradeSheets] = useState<{ id: string; name: string; url: string }[]>([])
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("teacherId")
  const reportId = searchParams.get("reportId")

  useEffect(() => {
    if (!teacherId || !reportId) {
      router.push("/teacher/login")
      return
    }
    checkPermission()
  }, [teacherId, reportId, router])

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
        setPermissionMessage("You don't have permission to view reports")
        setPermissionChecking(false)
        return
      }

      setHasPermission(true)
      loadReportAndData()
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
      setLoading(false)
    }
  }

  const loadReportAndData = async () => {
    try {
      // Load the report document
      const reportDoc = await getDoc(doc(db, "generated_reports", reportId as string))
      if (!reportDoc.exists()) {
        toast({
          title: "Error",
          description: "Report not found",
          variant: "destructive",
        })
        router.push("/teacher/generate-reports")
        return
      }

      const reportData = reportDoc.data()
      const report: GeneratedReport = {
        id: reportDoc.id,
        grade: reportData.grade,
        section: reportData.section,
        sectionId: reportData.sectionId,
        examTerm: reportData.examTerm,
        generatedBy: reportData.generatedBy,
        generatedAt:
          reportData.generatedAt && typeof reportData.generatedAt.toDate === "function"
            ? reportData.generatedAt.toDate()
            : new Date(),
        batchId: reportData.batchId,
        totalStudents: reportData.totalStudents || 0,
        successfulReports: reportData.successfulReports || 0,
        failedReports: reportData.failedReports || 0,
        reportPath: reportData.reportPath,
        summaryUrl: reportData.summaryUrl,
      }

      setSelectedReport(report)
      await loadReportData(report)
    } catch (error: any) {
      console.error("Error loading report:", error)
      toast({
        title: "Error",
        description: `Failed to load report: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const loadReportData = async (report: GeneratedReport): Promise<void> => {
    setViewingReport(report.id)
    console.log("Loading report data for:", report)

    try {
      // Load sections first
      const sectionsQuery = query(collection(db, "sections"))
      const sectionsSnapshot = await getDocs(sectionsQuery)
      const sectionsList: Section[] = []
      sectionsSnapshot.forEach((doc) => {
        const data = doc.data()
        sectionsList.push({
          id: doc.id,
          name: data.name || "",
          grade: data.grade || "",
          classId: data.classId || "",
        })
      })
      setSections(sectionsList)

      // Use the report.grade directly since it matches your database values
      const gradeToQuery = report.grade

      // Try multiple approaches to find students
      const students: Student[] = []

      // APPROACH 1: Direct query by grade field
      console.log("Approach 1: Querying students by exact grade field:", gradeToQuery)
      let studentsQuery = query(collection(db, "students"), where("grade", "==", gradeToQuery))

      // Add section filter if available
      if (report.sectionId) {
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
      if (students.length === 0 && report.sectionId) {
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
                data.sectionId === report.sectionId ||
                data.section === sectionsList.find((s) => s.id === report.sectionId)?.name
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

      if (students.length === 0) {
        toast({
          title: "No students found",
          description: `No students found for grade ${report.grade}${report.section ? `, section ${report.section}` : ""}`,
          variant: "destructive",
        })
        setViewingReport(null)
        return
      }

      // Sort students by roll number
      students.sort((a, b) => {
        const rollA = Number.parseInt(a.rollNumber) || 0
        const rollB = Number.parseInt(b.rollNumber) || 0
        return rollA - rollB
      })

      // Process each student to get their marks
      const studentsWithMarks: StudentWithMarks[] = []
      const allSubjectNames = new Set<string>()

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

          // If still no subjects found, create dummy subjects for the report
          if (subjects.length === 0) {
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

          // Calculate GPA and percentage
          let totalGradePoints = 0
          let subjectCount = 0
          let totalMaxMarks = 0

          subjects.forEach((subject) => {
            totalGradePoints += subject.gradePoint
            subjectCount++
            // Calculate total max marks based on subject configuration
            const maxMarks = subject.maxTheoryMarks + (subject.hasPractical ? subject.maxPracticalMarks : 0)
            totalMaxMarks += maxMarks > 0 ? maxMarks : 100 // Default to 100 if not specified
          })

          const gpa = subjectCount > 0 ? totalGradePoints / subjectCount : 0
          const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0

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

      // Get grade sheets URLs if available
      const gradeSheets: { id: string; name: string; url: string }[] = []
      for (const studentWithMarks of studentsWithMarks) {
        if (studentWithMarks.student.resultPdfUrl) {
          gradeSheets.push({
            id: studentWithMarks.student.id,
            name: studentWithMarks.student.name,
            url: studentWithMarks.student.resultPdfUrl,
          })
        }
      }

      setStudentGradeSheets(gradeSheets)
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

  // Helper function to get default subjects based on grade
  const getDefaultSubjectsForGrade = (grade: string): string[] => {
    // Convert grade to lowercase for case-insensitive comparison
    const gradeLower = grade.toLowerCase()

    // Primary grades (Nursery, LKG, UKG)
    if (
      gradeLower === "nursery" ||
      gradeLower === "lkg" ||
      gradeLower === "ukg" ||
      gradeLower === "p.g" ||
      gradeLower === "pg"
    ) {
      return [
        "English",
        "Nepali",
        "Mathematics",
        "Social Studies",
        "Science",
        "Drawing",
        "Handwriting",
        "Moral Science",
      ]
    }

    // Grades 1-3
    if (gradeLower === "1" || gradeLower === "2" || gradeLower === "3") {
      return [
        "English",
        "Nepali",
        "Mathematics",
        "Social Studies",
        "Science",
        "Computer",
        "Moral Science",
        "Health & Physical Education",
      ]
    }

    // Grades 4-8
    if (gradeLower === "4" || gradeLower === "5" || gradeLower === "6" || gradeLower === "7" || gradeLower === "8") {
      return [
        "English",
        "Nepali",
        "Mathematics",
        "Social Studies",
        "Science",
        "Computer",
        "Optional Mathematics",
        "Health & Physical Education",
      ]
    }

    // Grades 9-10
    if (gradeLower === "9" || gradeLower === "10") {
      return [
        "English",
        "Nepali",
        "Mathematics",
        "Social Studies",
        "Science",
        "Computer",
        "Optional Mathematics",
        "Health & Physical Education",
        "Occupation",
      ]
    }

    // Default subjects for any other grade
    return ["English", "Nepali", "Mathematics", "Science", "Social Studies"]
  }

  const getGradeFromGPA = (gpa: number): string => {
    if (gpa >= 4.0) return "A+"
    if (gpa >= 3.6) return "A"
    if (gpa >= 3.2) return "B+"
    if (gpa >= 2.8) return "B"
    if (gpa >= 2.4) return "C+"
    if (gpa >= 2.0) return "C"
    if (gpa >= 1.6) return "D"
    return "NG"
  }

  const printReport = async () => {
    if (!selectedReport) return

    setPrintingReport(selectedReport.id)
    try {
      // Create print content
      const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Class Report - Grade ${selectedReport.grade}${selectedReport.section ? ` - Section ${selectedReport.section}` : ""} - ${selectedReport.examTerm}</title>
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
        
        <div class="report-title">CLASS RESULT SHEET - ${selectedReport.examTerm.toUpperCase()}</div>
        
        <div class="report-info">
          <div class="info-item">
            <span class="info-label">Grade:</span> ${selectedReport.grade}
          </div>
          ${
            selectedReport.section
              ? `
          <div class="info-item">
            <span class="info-label">Section:</span> ${selectedReport.section}
          </div>`
              : ""
          }
          <div class="info-item">
            <span class="info-label">Exam Term:</span> ${selectedReport.examTerm}
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
              ${reportData[0]?.subjects.map((subject) => `<th>${subject.name}</th>`).join("") || ""}
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
                return `
                <tr>
                  <td>${student.rank}</td>
                  <td>${student.student.rollNumber}</td>
                  <td>${student.student.name}</td>
                  ${student.subjects.map((subject) => `<td>${subject.theoryMarks + subject.practicalMarks}</td>`).join("")}
                  <td>${student.totalMarks}</td>
                  <td>${student.percentage?.toFixed(2) || 0}%</td>
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
    </html>
  `

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

  const downloadReport = async () => {
    if (!selectedReport) return

    // If the report has a summary URL, open it in a new tab
    if (selectedReport.summaryUrl) {
      window.open(selectedReport.summaryUrl, "_blank")
      return
    }

    // Otherwise, generate a summary
    try {
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
      const titleText = selectedReport.section
        ? `SUMMARY REPORT - ${selectedReport.grade} - Section ${selectedReport.section} - ${selectedReport.examTerm}`
        : `SUMMARY REPORT - ${selectedReport.grade} - ${selectedReport.examTerm}`
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(titleText, 105, 42, { align: "center" })

      // Create table headers
      const headers = ["Rank", "Roll", "Name", "Total", "%", "GPA", "Grade", "Result"]

      // Create table data
      const tableData = reportData.map((student) => {
        const isPass = student.gpa && student.gpa >= 1.6
        return [
          student.rank.toString(),
          student.student.rollNumber,
          student.student.name,
          student.totalMarks.toString(),
          (student.percentage?.toFixed(2) || "0") + "%",
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
      const fileName = selectedReport.section
        ? `Report_Grade${selectedReport.grade}_Section${selectedReport.section}_${selectedReport.examTerm.replace(/\s+/g, "_")}.pdf`
        : `Report_Grade${selectedReport.grade}_${selectedReport.examTerm.replace(/\s+/g, "_")}.pdf`
      doc.save(fileName)

      toast({
        title: "Download Started",
        description: `Downloading report for Grade ${selectedReport.grade}${selectedReport.section ? `, Section ${selectedReport.section}` : ""}, ${selectedReport.examTerm}`,
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

  // If permission is being checked, show loading state
  if (permissionChecking) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>View Marks</CardTitle>
            <CardDescription>Checking permissions...</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Checking your permissions...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user doesn't have permission, show error message
  if (!hasPermission) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Permission Error</AlertTitle>
              <AlertDescription>{permissionMessage}</AlertDescription>
            </Alert>
            <Button className="mt-4" onClick={() => router.push("/teacher/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">View Marks</h1>
          <p className="text-muted-foreground">
            {selectedReport
              ? `Grade ${selectedReport.grade}${selectedReport.section ? `, Section ${selectedReport.section}` : ""} - ${selectedReport.examTerm}`
              : "Loading report..."}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/teacher/generate-reports")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Button>
      </div>

      {viewingReport ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading report data...</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {reportData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Report: Grade {selectedReport?.grade}
                  {selectedReport?.section ? `, Section ${selectedReport?.section}` : ""} - {selectedReport?.examTerm}
                </CardTitle>
                <CardDescription>
                  Generated on {selectedReport ? format(selectedReport.generatedAt, "dd MMM yyyy, HH:mm") : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Roll No.</TableHead>
                        <TableHead>Student Name</TableHead>
                        {reportData[0].subjects.map((subject) => (
                          <TableHead key={subject.id}>{subject.name}</TableHead>
                        ))}
                        <TableHead>Total</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead>GPA</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((student) => {
                        const isPass = student.gpa && student.gpa >= 1.6
                        return (
                          <TableRow key={student.student.id}>
                            <TableCell>{student.rank}</TableCell>
                            <TableCell>{student.student.rollNumber}</TableCell>
                            <TableCell>{student.student.name}</TableCell>
                            {student.subjects.map((subject) => (
                              <TableCell key={subject.id}>{subject.theoryMarks + subject.practicalMarks}</TableCell>
                            ))}
                            <TableCell>{student.totalMarks}</TableCell>
                            <TableCell>{student.percentage?.toFixed(2) || 0}%</TableCell>
                            <TableCell>{student.gpa?.toFixed(2) || 0}</TableCell>
                            <TableCell>{getGradeFromGPA(student.gpa || 0)}</TableCell>
                            <TableCell className={isPass ? "text-green-600" : "text-red-600"}>
                              {isPass ? "Pass" : "Fail"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Total Students</p>
                      <p className="text-2xl font-bold">{reportData.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Pass</p>
                      <p className="text-2xl font-bold text-green-600">
                        {reportData.filter((s) => (s.gpa || 0) >= 1.6).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Fail</p>
                      <p className="text-2xl font-bold text-red-600">
                        {reportData.filter((s) => (s.gpa || 0) < 1.6).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Pass Percentage</p>
                      <p className="text-2xl font-bold">
                        {((reportData.filter((s) => (s.gpa || 0) >= 1.6).length / reportData.length) * 100).toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {studentGradeSheets.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Individual Grade Sheets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {studentGradeSheets.slice(0, 6).map((sheet) => (
                        <Button
                          key={sheet.id}
                          variant="outline"
                          className="justify-start bg-transparent"
                          onClick={() => window.open(sheet.url, "_blank")}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {sheet.name}'s Grade Sheet
                        </Button>
                      ))}
                      {studentGradeSheets.length > 6 && (
                        <Button variant="outline" className="justify-start bg-transparent" disabled>
                          +{studentGradeSheets.length - 6} more grade sheets
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-4">
                  <Button variant="outline" onClick={printReport} disabled={printingReport === selectedReport?.id}>
                    {printingReport === selectedReport?.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="mr-2 h-4 w-4" />
                    )}
                    Print Report
                  </Button>
                  <Button variant="outline" onClick={downloadReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No data available for this report</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Hidden iframe for printing */}
      <iframe ref={printFrameRef} style={{ display: "none" }} title="Print Frame" />
    </div>
  )
}
