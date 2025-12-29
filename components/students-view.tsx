"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import {
  Loader2,
  Search,
  Grid3X3,
  List,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Download,
  Phone,
  MapPin,
  Bus,
  DollarSign,
  FileText,
  Users,
  GraduationCap,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Student } from "@/lib/models"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

interface StudentsViewProps {
  teacherId: string
}

export default function StudentsView({ teacherId }: StudentsViewProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [selectedSection, setSelectedSection] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showStudentDetails, setShowStudentDetails] = useState(false)

  const router = useRouter()

  // Classes and sections
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; name: string; displayName: string }>>([])
  const [availableSections, setAvailableSections] = useState<Array<{ id: string; name: string }>>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [useSectionFiltering, setUseSectionFiltering] = useState(false)

  // Hardcoded classes as fallback
  const hardcodedClasses = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

  useEffect(() => {
    fetchClasses()
    loadStudents()
  }, [])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, selectedGrade, selectedSection])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        const demoClasses = hardcodedClasses.map((cls) => ({
          id: cls.toLowerCase().replace(/\./g, ""),
          name: cls,
          displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
        }))
        setAvailableClasses(demoClasses)
        setUseSectionFiltering(false)

        // Set demo sections
        setAvailableSections([
          { id: "A", name: "A" },
          { id: "B", name: "B" },
          { id: "C", name: "C" },
          { id: "D", name: "D" },
        ])
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

        if (classesData.length > 0) {
          classesData.sort((a, b) => {
            const order = ["pg", "nursery", "lkg", "ukg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
            const aIndex = order.indexOf(a.name.toLowerCase().replace(/\./g, ""))
            const bIndex = order.indexOf(b.name.toLowerCase().replace(/\./g, ""))
            return aIndex - bIndex
          })

          setAvailableClasses(classesData)
          setUseSectionFiltering(true)

          // Fetch sections
          const sectionsRef = collection(db, "sections")
          const sectionsSnapshot = await getDocs(sectionsRef)
          const sectionsData: Array<{ id: string; name: string }> = []
          sectionsSnapshot.forEach((doc) => {
            const data = doc.data()
            sectionsData.push({
              id: doc.id,
              name: data.name || doc.id,
            })
          })

          setAvailableSections(
            sectionsData.length > 0
              ? sectionsData
              : [
                  { id: "A", name: "A" },
                  { id: "B", name: "B" },
                  { id: "C", name: "C" },
                  { id: "D", name: "D" },
                ],
          )
        } else {
          const defaultClasses = hardcodedClasses.map((cls) => ({
            id: cls.toLowerCase().replace(/\./g, ""),
            name: cls,
            displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
          }))
          setAvailableClasses(defaultClasses)
          setUseSectionFiltering(false)
          setAvailableSections([
            { id: "A", name: "A" },
            { id: "B", name: "B" },
            { id: "C", name: "C" },
            { id: "D", name: "D" },
          ])
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      const defaultClasses = hardcodedClasses.map((cls) => ({
        id: cls.toLowerCase().replace(/\./g, ""),
        name: cls,
        displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
      }))
      setAvailableClasses(defaultClasses)
      setUseSectionFiltering(false)
      setAvailableSections([
        { id: "A", name: "A" },
        { id: "B", name: "B" },
        { id: "C", name: "C" },
        { id: "D", name: "D" },
      ])
    } finally {
      setLoadingClasses(false)
    }
  }

  const loadStudents = async () => {
    setLoading(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Generate demo students with proper IDs
        const demoStudents: Student[] = []
        const grades = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5"]
        const sections = ["A", "B", "C"]
        const firstNames = [
          "Aarav",
          "Arjun",
          "Divya",
          "Kavya",
          "Rahul",
          "Priya",
          "Neha",
          "Vikram",
          "Sanjay",
          "Ananya",
          "Rohan",
          "Shreya",
          "Aditya",
          "Pooja",
          "Kiran",
        ]
        const lastNames = [
          "Sharma",
          "Patel",
          "Singh",
          "Kumar",
          "Gupta",
          "Joshi",
          "Yadav",
          "Verma",
          "Mishra",
          "Reddy",
          "Thapa",
          "Shrestha",
          "Maharjan",
          "Tamang",
          "Gurung",
        ]

        let studentId = 1
        grades.forEach((grade, gradeIndex) => {
          sections.forEach((section, sectionIndex) => {
            const studentsInSection = Math.floor(Math.random() * 8) + 8 // 8-15 students per section
            for (let i = 0; i < studentsInSection; i++) {
              const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
              const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
              const rollNumber = (i + 1).toString().padStart(2, "0")

              demoStudents.push({
                // Use a consistent ID format that matches your working dashboard
                id: `student${studentId}`,
                name: `${firstName} ${lastName}`,
                firstName,
                lastName,
                middleName: "",
                grade,
                section,
                rollNumber,
                fatherName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastName}`,
                motherName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastName}`,
                contactNumber: `98${Math.floor(Math.random() * 100000000)
                  .toString()
                  .padStart(8, "0")}`,
                address: ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Chitwan"][Math.floor(Math.random() * 5)],
                dob: `208${Math.floor(Math.random() * 3)}-${(Math.floor(Math.random() * 12) + 1).toString().padStart(2, "0")}-${(Math.floor(Math.random() * 28) + 1).toString().padStart(2, "0")}`,
                symbolNumber: (1000 + studentId).toString(),
                usesBus: Math.random() > 0.6,
                busRoute: Math.random() > 0.6 ? `Route ${Math.floor(Math.random() * 5) + 1}` : "",
                transportationFee: Math.random() > 0.6 ? 500 : 0,
                dues: Math.random() > 0.8 ? Math.floor(Math.random() * 3000) + 500 : 0,
                monthlyFee: 1200 + gradeIndex * 100,
                profilePictureUrl: "",
                janmaDartaUrl: "",
                janmaDartaNumber: `JD${studentId.toString().padStart(6, "0")}`,
                // Default fields
                attendance: Math.floor(Math.random() * 100),
                attendanceId: "",
                attendanceStatus: "",
                currentSubject: null,
                percentage: Math.floor(Math.random() * 40) + 60,
                qrCode: null,
                rank: 0,
                resultPdfUrl: "",
                selected: false,
                subjects: [],
                totalClasses: Math.floor(Math.random() * 200) + 150,
                totalMarks: Math.floor(Math.random() * 500) + 300,
                janmaDartaSection: section,
              })
              studentId++
            }
          })
        })

        setStudents(demoStudents)
      } else {
        // Load from Firestore - following the exact pattern from your working dashboard
        const studentsRef = collection(db, "students")
        const querySnapshot = await getDocs(studentsRef)

        const studentsData: Student[] = []
        querySnapshot.forEach((doc) => {
          const student = doc.data() as Student
          // This is the key line - assign the Firestore document ID to student.id
          student.id = doc.id
          studentsData.push(student)
        })

        // Sort by grade and roll number
        studentsData.sort((a, b) => {
          const gradeOrder = [
            "P.G",
            "Nursery",
            "LKG",
            "UKG",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
          ]
          const gradeComparison = gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade)
          if (gradeComparison !== 0) return gradeComparison

          const sectionComparison = (a.section || "").localeCompare(b.section || "")
          if (sectionComparison !== 0) return sectionComparison

          return Number.parseInt(a.rollNumber || "0") - Number.parseInt(b.rollNumber || "0")
        })

        setStudents(studentsData)
      }
    } catch (error) {
      console.error("Error loading students:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterStudents = () => {
    let filtered = students

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.fatherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.contactNumber?.includes(searchTerm),
      )
    }

    // Filter by grade
    if (selectedGrade !== "all") {
      filtered = filtered.filter((student) => student.grade === selectedGrade)
    }

    // Filter by section
    if (selectedSection !== "all") {
      filtered = filtered.filter((student) => student.section === selectedSection)
    }

    setFilteredStudents(filtered)
  }

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student)
    setShowStudentDetails(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getGradeStats = () => {
    const stats: Record<string, number> = {}
    students.forEach((student) => {
      stats[student.grade] = (stats[student.grade] || 0) + 1
    })
    return stats
  }

  const getTotalDues = () => {
    return students.reduce((total, student) => total + (student.dues || 0), 0)
  }

  const getBusUsers = () => {
    return students.filter((student) => student.usesBus).length
  }

  // Export student details to PDF
  const exportStudentDetailsToPDF = (student: Student) => {
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(20)
    doc.text("Student Details Report", 20, 20)

    // Add student basic info
    doc.setFontSize(12)
    doc.text(`Name: ${student.name}`, 20, 40)
    doc.text(`Grade: ${student.grade} - Section: ${student.section}`, 20, 50)
    doc.text(`Roll Number: ${student.rollNumber}`, 20, 60)
    doc.text(`Symbol Number: ${student.symbolNumber}`, 20, 70)

    // Add family info
    doc.text("Family Information:", 20, 90)
    doc.text(`Father's Name: ${student.fatherName}`, 20, 100)
    doc.text(`Mother's Name: ${student.motherName || "Not provided"}`, 20, 110)
    doc.text(`Contact: ${student.contactNumber}`, 20, 120)
    doc.text(`Address: ${student.address}`, 20, 130)
    doc.text(`Date of Birth: ${student.dob || "Not provided"}`, 20, 140)

    // Add academic info
    doc.text("Academic Information:", 20, 160)
    doc.text(`Monthly Fee: ₹${student.monthlyFee?.toLocaleString() || "Not set"}`, 20, 170)
    doc.text(`Outstanding Dues: ₹${student.dues?.toLocaleString() || 0}`, 20, 180)

    // Add transportation info
    doc.text("Transportation:", 20, 200)
    doc.text(`Uses Bus: ${student.usesBus ? "Yes" : "No"}`, 20, 210)
    if (student.usesBus) {
      doc.text(`Bus Route: ${student.busRoute || "Not specified"}`, 20, 220)
      doc.text(`Transportation Fee: ₹${student.transportationFee?.toLocaleString() || 0}`, 20, 230)
    }

    // Add documents info
    doc.text("Documents:", 20, 250)
    doc.text(`Janma Darta Number: ${student.janmaDartaNumber || "Not provided"}`, 20, 260)
    doc.text(`Document Status: ${student.janmaDartaUrl ? "Uploaded" : "Not uploaded"}`, 20, 270)

    // Save the PDF
    doc.save(`${student.name}_details.pdf`)
  }

  // Export all students to Excel
  const exportAllStudentsToExcel = () => {
    const exportData = filteredStudents.map((student) => ({
      Name: student.name,
      Grade: student.grade,
      Section: student.section,
      "Roll Number": student.rollNumber,
      "Symbol Number": student.symbolNumber,
      "Father's Name": student.fatherName,
      "Mother's Name": student.motherName || "",
      Contact: student.contactNumber,
      Address: student.address,
      "Date of Birth": student.dob || "",
      "Monthly Fee": student.monthlyFee || 0,
      "Uses Bus": student.usesBus ? "Yes" : "No",
      "Bus Route": student.busRoute || "",
      "Transportation Fee": student.transportationFee || 0,
      "Outstanding Dues": student.dues || 0,
      "Janma Darta Number": student.janmaDartaNumber || "",
      "Document Status": student.janmaDartaUrl ? "Uploaded" : "Not uploaded",
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Students")

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }))
    ws["!cols"] = colWidths

    XLSX.writeFile(wb, `students_list_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  // Generate comprehensive student report
  const generateStudentReport = (student: Student) => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(16)
    doc.text("STUDENT COMPREHENSIVE REPORT", 105, 20, { align: "center" })

    // Add a line
    doc.line(20, 25, 190, 25)

    // Student Photo placeholder (if available)
    if (student.profilePictureUrl) {
      doc.text("Photo", 160, 40)
      doc.rect(155, 45, 30, 30) // Placeholder rectangle for photo
    }

    // Basic Information Table
    const basicInfo = [
      ["Full Name", student.name],
      ["Grade & Section", `${student.grade} - Section ${student.section}`],
      ["Roll Number", student.rollNumber],
      ["Symbol Number", student.symbolNumber || "Not assigned"],
      ["Date of Birth", student.dob || "Not provided"],
    ]

    autoTable(doc, {
      head: [["Field", "Information"]],
      body: basicInfo,
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      margin: { right: 50 },
    })

    // Family Information
    const familyInfo = [
      ["Father's Name", student.fatherName],
      ["Mother's Name", student.motherName || "Not provided"],
      ["Contact Number", student.contactNumber],
      ["Address", student.address],
    ]

    autoTable(doc, {
      head: [["Family Information", "Details"]],
      body: familyInfo,
      startY: (doc as any).lastAutoTable.finalY + 10,
      theme: "grid",
      headStyles: { fillColor: [39, 174, 96] },
    })

    // Academic & Financial Information
    const academicInfo = [
      ["Monthly Fee", `₹${student.monthlyFee?.toLocaleString() || "Not set"}`],
      ["Outstanding Dues", `₹${student.dues?.toLocaleString() || 0}`],
      ["Transportation Fee", `₹${student.transportationFee?.toLocaleString() || 0}`],
      ["Total Monthly Cost", `₹${((student.monthlyFee || 0) + (student.transportationFee || 0)).toLocaleString()}`],
    ]

    autoTable(doc, {
      head: [["Financial Information", "Amount"]],
      body: academicInfo,
      startY: (doc as any).lastAutoTable.finalY + 10,
      theme: "grid",
      headStyles: { fillColor: [230, 126, 34] },
    })

    // Transportation Information
    const transportInfo = [
      ["Uses School Bus", student.usesBus ? "Yes" : "No"],
      ["Bus Route", student.usesBus ? student.busRoute || "Not specified" : "N/A"],
      ["Transportation Fee", student.usesBus ? `₹${student.transportationFee?.toLocaleString() || 0}` : "N/A"],
    ]

    autoTable(doc, {
      head: [["Transportation", "Details"]],
      body: transportInfo,
      startY: (doc as any).lastAutoTable.finalY + 10,
      theme: "grid",
      headStyles: { fillColor: [155, 89, 182] },
    })

    // Documents Information
    const documentsInfo = [
      ["Janma Darta Number", student.janmaDartaNumber || "Not provided"],
      ["Document Status", student.janmaDartaUrl ? "✓ Uploaded" : "✗ Not uploaded"],
      ["Profile Picture", student.profilePictureUrl ? "✓ Available" : "✗ Not available"],
    ]

    autoTable(doc, {
      head: [["Documents", "Status"]],
      body: documentsInfo,
      startY: (doc as any).lastAutoTable.finalY + 10,
      theme: "grid",
      headStyles: { fillColor: [52, 152, 219] },
    })

    // Footer
    doc.setFontSize(10)
    doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20)
    doc.text(`Generated by: School Management System`, 20, doc.internal.pageSize.height - 10)

    // Save the PDF
    doc.save(`${student.name}_comprehensive_report.pdf`)
  }

  // Generate class-wise report
  const generateClassReport = () => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(16)
    doc.text("CLASS-WISE STUDENT REPORT", 105, 20, { align: "center" })
    doc.line(20, 25, 190, 25)

    // Summary statistics
    const gradeStats = getGradeStats()
    const totalStudents = students.length
    const totalDues = getTotalDues()
    const busUsers = getBusUsers()

    // Summary table
    const summaryData = [
      ["Total Students", totalStudents.toString()],
      ["Total Classes", Object.keys(gradeStats).length.toString()],
      ["Bus Users", busUsers.toString()],
      ["Total Outstanding Dues", `₹${totalDues.toLocaleString()}`],
      ["Students with Dues", students.filter((s) => (s.dues || 0) > 0).length.toString()],
    ]

    autoTable(doc, {
      head: [["Summary", "Count/Amount"]],
      body: summaryData,
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    })

    // Grade-wise breakdown
    const gradeBreakdown = Object.entries(gradeStats).map(([grade, count]) => {
      const gradeStudents = students.filter((s) => s.grade === grade)
      const gradeDues = gradeStudents.reduce((sum, s) => sum + (s.dues || 0), 0)
      const gradeBusUsers = gradeStudents.filter((s) => s.usesBus).length

      return [grade, count.toString(), gradeBusUsers.toString(), `₹${gradeDues.toLocaleString()}`]
    })

    autoTable(doc, {
      head: [["Grade", "Students", "Bus Users", "Total Dues"]],
      body: gradeBreakdown,
      startY: (doc as any).lastAutoTable.finalY + 15,
      theme: "grid",
      headStyles: { fillColor: [39, 174, 96] },
    })

    // Detailed student list (if filtered)
    if (filteredStudents.length <= 50) {
      // Only show detailed list if not too many students
      const studentDetails = filteredStudents.map((student) => [
        student.name,
        `${student.grade}-${student.section}`,
        student.rollNumber,
        student.contactNumber,
        student.usesBus ? "Yes" : "No",
        `₹${(student.dues || 0).toLocaleString()}`,
      ])

      autoTable(doc, {
        head: [["Name", "Class", "Roll", "Contact", "Bus", "Dues"]],
        body: studentDetails,
        startY: (doc as any).lastAutoTable.finalY + 15,
        theme: "striped",
        headStyles: { fillColor: [230, 126, 34] },
        styles: { fontSize: 8 },
      })
    }

    // Footer
    doc.setFontSize(10)
    doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20)
    doc.text(
      `Filtered Results: ${filteredStudents.length} of ${totalStudents} students`,
      20,
      doc.internal.pageSize.height - 10,
    )

    doc.save(`class_report_${new Date().toISOString().split("T")[0]}.pdf`)
  }

  // Generate unique key for each student
  const generateStudentKey = (student: Student, index: number, prefix = "") => {
    return `${prefix}${student.id || student.symbolNumber || student.rollNumber || `student-${index}`}`
  }

  // Follow the exact same pattern as your working dashboard
  const handleEditStudent = (student: Student) => {
    router.push(`/teacher/edit-student?id=${student.id}`)
  }

  if (loading || loadingClasses) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={`loading-card-${i}`}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-8 rounded-full mb-4" />
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Loading students...
          </CardContent>
        </Card>
      </div>
    )
  }

  const gradeStats = getGradeStats()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card key="stats-total-students">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card key="stats-classes">
          <CardContent className="p-6">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Classes</p>
                <p className="text-2xl font-bold">{Object.keys(gradeStats).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card key="stats-bus-users">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bus Users</p>
                <p className="text-2xl font-bold">{getBusUsers()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card key="stats-total-dues">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Dues</p>
                <p className="text-2xl font-bold">₹{getTotalDues().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Students ({filteredStudents.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportAllStudentsToExcel}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={generateClassReport}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Class Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, roll number, father's name, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {availableClasses.map((cls) => (
                    <SelectItem key={`grade-filter-${cls.id}`} value={cls.name}>
                      {cls.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map((section) => (
                    <SelectItem key={`section-filter-${section.id}`} value={section.name}>
                      Section {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedGrade !== "all" || selectedSection !== "all"
                  ? "Try adjusting your search criteria"
                  : "No students have been added yet"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStudents.map((student, index) => (
                <Card key={generateStudentKey(student, index, "grid-")} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={student.profilePictureUrl || "/placeholder.svg"} />
                        <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{student.name}</h3>
                        <p className="text-xs text-gray-500">
                          {student.grade} - {student.section} | Roll: {student.rollNumber}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-3 w-3 mr-1" />
                        {student.contactNumber}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {student.address}
                      </div>
                      {student.usesBus && (
                        <div className="flex items-center text-blue-600">
                          <Bus className="h-3 w-3 mr-1" />
                          {student.busRoute || "Bus User"}
                        </div>
                      )}
                      {student.dues && student.dues > 0 && (
                        <div className="flex items-center text-red-600">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Dues: ₹{student.dues}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t">
                      <div className="flex space-x-1">
                        {student.usesBus && (
                          <Badge variant="secondary" className="text-xs">
                            Bus
                          </Badge>
                        )}
                        {student.dues && student.dues > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            Dues
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleViewStudent(student)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportStudentDetailsToPDF(student)}>
                              Export Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateStudentReport(student)}>
                              Generate Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade/Section</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, index) => (
                    <TableRow key={generateStudentKey(student, index, "table-")}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.profilePictureUrl || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">{getInitials(student.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-500">ID: {student.symbolNumber}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{student.grade}</div>
                        <div className="text-sm text-gray-500">Section {student.section}</div>
                      </TableCell>
                      <TableCell>{student.rollNumber}</TableCell>
                      <TableCell>{student.contactNumber}</TableCell>
                      <TableCell>{student.fatherName}</TableCell>
                      <TableCell>{student.address}</TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {student.usesBus && (
                            <Badge variant="secondary" className="text-xs w-fit">
                              Bus
                            </Badge>
                          )}
                          {student.dues && student.dues > 0 && (
                            <Badge variant="destructive" className="text-xs w-fit">
                              Dues: ₹{student.dues}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="outline" size="sm" onClick={() => handleViewStudent(student)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Download className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => exportStudentDetailsToPDF(student)}>
                                Export Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateStudentReport(student)}>
                                Generate Report
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={showStudentDetails} onOpenChange={setShowStudentDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Header with photo and basic info */}
              <div className="flex items-start space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={selectedStudent.profilePictureUrl || "/placeholder.svg"} />
                  <AvatarFallback className="text-lg">{getInitials(selectedStudent.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                  <p className="text-gray-600">
                    {selectedStudent.grade} - Section {selectedStudent.section} | Roll No: {selectedStudent.rollNumber}
                  </p>
                  <p className="text-sm text-gray-500">Student ID: {selectedStudent.symbolNumber}</p>
                  <div className="flex space-x-2 mt-2">
                    {selectedStudent.usesBus && <Badge variant="secondary">Bus User</Badge>}
                    {selectedStudent.dues && selectedStudent.dues > 0 && (
                      <Badge variant="destructive">Dues: ₹{selectedStudent.dues}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                      <p>{selectedStudent.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Date of Birth</Label>
                      <p>{selectedStudent.dob || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Father's Name</Label>
                      <p>{selectedStudent.fatherName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Mother's Name</Label>
                      <p>{selectedStudent.motherName || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Address</Label>
                      <p>{selectedStudent.address}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact & Academic */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact & Academic</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Contact Number</Label>
                      <p>{selectedStudent.contactNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Grade & Section</Label>
                      <p>
                        {selectedStudent.grade} - Section {selectedStudent.section}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Roll Number</Label>
                      <p>{selectedStudent.rollNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Symbol Number</Label>
                      <p>{selectedStudent.symbolNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Monthly Fee</Label>
                      <p>₹{selectedStudent.monthlyFee?.toLocaleString() || "Not set"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Transportation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Transportation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Uses School Bus</Label>
                      <p>{selectedStudent.usesBus ? "Yes" : "No"}</p>
                    </div>
                    {selectedStudent.usesBus && (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Bus Route</Label>
                          <p>{selectedStudent.busRoute || "Not specified"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Transportation Fee</Label>
                          <p>₹{selectedStudent.transportationFee?.toLocaleString() || 0}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Financial */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Financial Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Outstanding Dues</Label>
                      <p className={selectedStudent.dues && selectedStudent.dues > 0 ? "text-red-600 font-medium" : ""}>
                        ₹{selectedStudent.dues?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Monthly Fee</Label>
                      <p>₹{selectedStudent.monthlyFee?.toLocaleString() || "Not set"}</p>
                    </div>
                    {selectedStudent.usesBus && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Transportation Fee</Label>
                        <p>₹{selectedStudent.transportationFee?.toLocaleString() || 0}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Janma Darta Number</Label>
                        <p>{selectedStudent.janmaDartaNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Janma Darta Document</Label>
                        <p>
                          {selectedStudent.janmaDartaUrl ? (
                            <Button variant="outline" size="sm">
                              <FileText className="h-3 w-3 mr-1" />
                              View Document
                            </Button>
                          ) : (
                            "Not uploaded"
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleEditStudent(selectedStudent)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Student
                </Button>
                <Button variant="outline" onClick={() => exportStudentDetailsToPDF(selectedStudent)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Details
                </Button>
                <Button variant="outline" onClick={() => generateStudentReport(selectedStudent)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
