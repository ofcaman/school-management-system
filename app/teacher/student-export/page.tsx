"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, getDocs, doc, getDoc, where } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Student } from "@/lib/models"
import { Download, FileSpreadsheet, FileText, Filter, Loader2, Search, Users } from "lucide-react"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

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

export default function StudentExportPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    name: true,
    rollNumber: true,
    grade: true,
    section: true,
    fatherName: true,
    motherName: true,
    contactNumber: true,
    address: true,
    dob: true,
  })
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    loadClasses()
    fetchStudents()
  }, [teacherId, router])

  useEffect(() => {
    filterStudents()
  }, [selectedClass, selectedSection, searchQuery, allStudents])

  useEffect(() => {
    // When class changes, load sections for that class
    if (selectedClass !== "all") {
      loadSectionsForClass(selectedClass)
    } else {
      setSections([])
      setSelectedSection("all")
    }
  }, [selectedClass])

  const loadClasses = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Set demo classes
        const demoClasses: Class[] = [
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
      }
    } catch (error) {
      console.error("Error loading classes:", error)

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
      setSelectedSection("all")

      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Set demo sections
        const demoSections: Section[] = [
          { id: "A", name: "A", classId: classId },
          { id: "B", name: "B", classId: classId },
          { id: "C", name: "C", classId: classId },
        ]
        setSections(demoSections)
        return
      }

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
    } catch (error) {
      console.error("Error loading sections:", error)

      // Set default sections on error
      const defaultSections: Section[] = [
        { id: "A", name: "A", classId: classId },
        { id: "B", name: "B", classId: classId },
        { id: "C", name: "C", classId: classId },
      ]

      setSections(defaultSections)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo students
        const demoStudents: Student[] = Array.from({ length: 50 }, (_, i) => {
          const grade = Math.floor(i / 5) + 1
          const sectionIndex = i % 3
          const sectionName = ["A", "B", "C"][sectionIndex]

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
            rollNumber: `${(i % 5) + 1}`,
            grade: grade <= 10 ? grade.toString() : "10",
            section: sectionName,
            sectionId: sectionName,
            symbolNumber: null,
            address: "Kathmandu",
            usesBus: i % 3 === 0,
            busRoute: i % 3 === 0 ? "Route A" : "",
            resultPdfUrl: "",
            subjects: [],
            totalMarks: Math.floor(Math.random() * 300) + 300,
            percentage: Math.floor(Math.random() * 30) + 70,
            rank: 0,
            attendance: Math.floor(Math.random() * 50) + 150,
            totalClasses: 200,
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

        // Calculate ranks for each grade and section
        const gradeSectionGroups: Record<string, Student[]> = {}
        demoStudents.forEach((student) => {
          const key = `${student.grade}-${student.section}`
          if (!gradeSectionGroups[key]) {
            gradeSectionGroups[key] = []
          }
          gradeSectionGroups[key].push(student)
        })

        // Sort each grade-section group by total marks and assign ranks
        Object.keys(gradeSectionGroups).forEach((key) => {
          gradeSectionGroups[key].sort((a, b) => b.totalMarks - a.totalMarks)
          gradeSectionGroups[key].forEach((student, index) => {
            student.rank = index + 1
          })
        })

        setAllStudents(demoStudents)
        setStudents(demoStudents)
      } else {
        // Load real data from Firebase
        const studentsQuery = query(collection(db, "students"))
        const querySnapshot = await getDocs(studentsQuery)
        const studentsList: Student[] = []

        querySnapshot.forEach((doc) => {
          const student = doc.data() as Student
          student.id = doc.id
          studentsList.push(student)
        })

        // Calculate ranks for each grade and section
        const gradeSectionGroups: Record<string, Student[]> = {}
        studentsList.forEach((student) => {
          const key = `${student.grade}-${student.section || "none"}`
          if (!gradeSectionGroups[key]) {
            gradeSectionGroups[key] = []
          }
          gradeSectionGroups[key].push(student)
        })

        // Sort each grade-section group by total marks and assign ranks
        Object.keys(gradeSectionGroups).forEach((key) => {
          gradeSectionGroups[key].sort((a, b) => b.totalMarks - a.totalMarks)
          gradeSectionGroups[key].forEach((student, index) => {
            student.rank = index + 1
          })
        })

        setAllStudents(studentsList)
        setStudents(studentsList)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterStudents = () => {
    let filtered = [...allStudents]

    // Filter by class
    if (selectedClass !== "all") {
      // Find the class object to get the name
      const classObj = classes.find((c) => c.id === selectedClass)
      const className = classObj ? classObj.name : selectedClass

      // Create possible grade values to match against
      const possibleGradeValues = [
        className,
        className.toLowerCase(),
        className.toUpperCase(),
        `Class ${className}`,
        `class ${className}`,
        `CLASS ${className}`,
      ]

      filtered = filtered.filter(
        (student) => possibleGradeValues.includes(student.grade) || student.classId === selectedClass,
      )
    }

    // Filter by section
    if (selectedSection !== "all") {
      // Find the section object to get the name
      const sectionObj = sections.find((s) => s.id === selectedSection)
      const sectionName = sectionObj ? sectionObj.name : selectedSection

      // Create possible section values to match against
      const possibleSectionValues = [
        sectionName,
        sectionName.toLowerCase(),
        sectionName.toUpperCase(),
        `Section ${sectionName}`,
        `section ${sectionName}`,
        `SECTION ${sectionName}`,
      ]

      filtered = filtered.filter(
        (student) => possibleSectionValues.includes(student.section) || student.sectionId === selectedSection,
      )
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (student) =>
          student.name?.toLowerCase().includes(query) ||
          student.rollNumber?.toLowerCase().includes(query) ||
          student.fatherName?.toLowerCase().includes(query) ||
          student.contactNumber?.includes(query),
      )
    }

    // Sort by grade, section, and roll number
    filtered.sort((a, b) => {
      // First sort by grade
      const gradeA = Number.parseInt(a.grade) || 0
      const gradeB = Number.parseInt(b.grade) || 0
      if (gradeA !== gradeB) return gradeA - gradeB

      // Then sort by section
      if (a.section !== b.section) {
        return (a.section || "").localeCompare(b.section || "")
      }

      // Finally sort by roll number
      const rollA = Number.parseInt(a.rollNumber) || 0
      const rollB = Number.parseInt(b.rollNumber) || 0
      return rollA - rollB
    })

    setFilteredStudents(filtered)
  }

  const handleClassChange = (value: string) => {
    setSelectedClass(value)
    setSelectedSection("all") // Reset section when class changes
  }

  const handleSectionChange = (value: string) => {
    setSelectedSection(value)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const toggleField = (field: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const getSelectedStudentData = () => {
    return filteredStudents.map((student) => {
      const data: Record<string, any> = {}

      if (selectedFields.name) data["Name"] = student.name
      if (selectedFields.rollNumber) data["Roll Number"] = student.rollNumber
      if (selectedFields.grade) data["Grade"] = student.grade
      if (selectedFields.section) data["Section"] = student.section || "N/A"
      if (selectedFields.fatherName) data["Father's Name"] = student.fatherName
      if (selectedFields.motherName) data["Mother's Name"] = student.motherName
      if (selectedFields.contactNumber) data["Contact Number"] = student.contactNumber
      if (selectedFields.address) data["Address"] = student.address
      if (selectedFields.dob) data["Date of Birth"] = student.dob
      if (selectedFields.rank) data["Rank"] = student.rank
      if (selectedFields.attendance) {
        data["Attendance"] = student.attendance
        data["Total Classes"] = student.totalClasses
        data["Attendance %"] = student.totalClasses
          ? ((student.attendance / student.totalClasses) * 100).toFixed(2) + "%"
          : "N/A"
      }

      return data
    })
  }

  const exportToCSV = () => {
    setExportLoading("csv")
    try {
      const data = getSelectedStudentData()
      const csv = convertToCSV(data)
      downloadFile(csv, "students.csv", "text/csv")
    } catch (error) {
      console.error("Error exporting to CSV:", error)
    } finally {
      setExportLoading(null)
    }
  }

  const exportToExcel = () => {
    setExportLoading("excel")
    try {
      const data = getSelectedStudentData()
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students")

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "students.xlsx"
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

  const exportToPDF = () => {
    setExportLoading("pdf")
    try {
      const data = getSelectedStudentData()

      // Create a new jsPDF instance
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      })

      // Add title
      doc.setFontSize(18)
      doc.text("Sajha Boarding School", doc.internal.pageSize.width / 2, 15, { align: "center" })
      doc.setFontSize(14)
      doc.text("Student List", doc.internal.pageSize.width / 2, 25, { align: "center" })

      // Add class and section info if selected
      let yPos = 35
      if (selectedClass !== "all") {
        const classObj = classes.find((c) => c.id === selectedClass)
        const className = classObj ? classObj.name : selectedClass
        doc.text(`Class: ${className}`, doc.internal.pageSize.width / 2, yPos, { align: "center" })
        yPos += 10
      }

      if (selectedSection !== "all") {
        const sectionObj = sections.find((s) => s.id === selectedSection)
        const sectionName = sectionObj ? sectionObj.name : selectedSection
        doc.text(`Section: ${sectionName}`, doc.internal.pageSize.width / 2, yPos, { align: "center" })
        yPos += 10
      }

      // Add date
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 15, 10, {
        align: "right",
      })

      // Create table
      const tableColumn = Object.keys(data[0] || {})
      const tableRows = data.map((item) => Object.values(item))

      // Add table to document
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 15 },
      })

      // Save the PDF
      doc.save("students.pdf")
    } catch (error) {
      console.error("Error exporting to PDF:", error)
    } finally {
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

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Student Export</h1>
          <p className="text-muted-foreground">View and export student data</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/teacher/dashboard?id=${teacherId}`)}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters and Export Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="class-select" className="mb-2 block">
                Select Class
              </Label>
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
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
              <Label htmlFor="section-select" className="mb-2 block">
                Select Section
              </Label>
              <Select
                value={selectedSection}
                onValueChange={handleSectionChange}
                disabled={selectedClass === "all" || sections.length === 0}
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
              <Label htmlFor="search" className="mb-2 block">
                Search Students
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, roll no, etc."
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={exportToCSV}
              variant="outline"
              disabled={exportLoading !== null || filteredStudents.length === 0}
              className="flex items-center"
            >
              {exportLoading === "csv" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              disabled={exportLoading !== null || filteredStudents.length === 0}
              className="flex items-center"
            >
              {exportLoading === "excel" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Export Excel
            </Button>
            <Button
              onClick={exportToPDF}
              variant="outline"
              disabled={exportLoading !== null || filteredStudents.length === 0}
              className="flex items-center"
            >
              {exportLoading === "pdf" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export PDF
            </Button>
          </div>

          <div className="mt-6">
            <Label className="mb-2 block">Select Fields to Export</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="name" checked={selectedFields.name} onCheckedChange={() => toggleField("name")} />
                <Label htmlFor="name" className="cursor-pointer">
                  Name
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rollNumber"
                  checked={selectedFields.rollNumber}
                  onCheckedChange={() => toggleField("rollNumber")}
                />
                <Label htmlFor="rollNumber" className="cursor-pointer">
                  Roll Number
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="grade" checked={selectedFields.grade} onCheckedChange={() => toggleField("grade")} />
                <Label htmlFor="grade" className="cursor-pointer">
                  Grade
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section"
                  checked={selectedFields.section}
                  onCheckedChange={() => toggleField("section")}
                />
                <Label htmlFor="section" className="cursor-pointer">
                  Section
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fatherName"
                  checked={selectedFields.fatherName}
                  onCheckedChange={() => toggleField("fatherName")}
                />
                <Label htmlFor="fatherName" className="cursor-pointer">
                  Father's Name
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="motherName"
                  checked={selectedFields.motherName}
                  onCheckedChange={() => toggleField("motherName")}
                />
                <Label htmlFor="motherName" className="cursor-pointer">
                  Mother's Name
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contactNumber"
                  checked={selectedFields.contactNumber}
                  onCheckedChange={() => toggleField("contactNumber")}
                />
                <Label htmlFor="contactNumber" className="cursor-pointer">
                  Contact Number
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="address"
                  checked={selectedFields.address}
                  onCheckedChange={() => toggleField("address")}
                />
                <Label htmlFor="address" className="cursor-pointer">
                  Address
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="dob" checked={selectedFields.dob} onCheckedChange={() => toggleField("dob")} />
                <Label htmlFor="dob" className="cursor-pointer">
                  Date of Birth
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="rank" checked={selectedFields.rank} onCheckedChange={() => toggleField("rank")} />
                <Label htmlFor="rank" className="cursor-pointer">
                  Rank
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attendance"
                  checked={selectedFields.attendance}
                  onCheckedChange={() => toggleField("attendance")}
                />
                <Label htmlFor="attendance" className="cursor-pointer">
                  Attendance
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Student List
            {selectedClass !== "all" && (
              <span>
                {" - "}
                {(() => {
                  const classObj = classes.find((c) => c.id === selectedClass)
                  const className = classObj ? classObj.name : selectedClass
                  return className.includes("P.G") ||
                    className.includes("LKG") ||
                    className.includes("UKG") ||
                    className.includes("Nursery")
                    ? className
                    : `Class ${className}`
                })()}
              </span>
            )}
            {selectedSection !== "all" && (
              <span>
                {" - Section "}
                {(() => {
                  const sectionObj = sections.find((s) => s.id === selectedSection)
                  return sectionObj ? sectionObj.name : selectedSection
                })()}
              </span>
            )}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredStudents.length} students)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Roll No.</th>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Grade</th>
                    <th className="text-left p-4">Section</th>
                    <th className="text-left p-4">Father's Name</th>
                    <th className="text-left p-4">Contact</th>
                    <th className="text-left p-4">Rank</th>
                    <th className="text-left p-4">Attendance</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{student.rollNumber}</td>
                      <td className="p-4">{student.name}</td>
                      <td className="p-4">{student.grade}</td>
                      <td className="p-4">{student.section || "N/A"}</td>
                      <td className="p-4">{student.fatherName}</td>
                      <td className="p-4">{student.contactNumber}</td>
                      <td className="p-4">
                        <span
                          className={`font-medium ${
                            student.rank === 1
                              ? "text-yellow-600"
                              : student.rank === 2
                                ? "text-gray-500"
                                : student.rank === 3
                                  ? "text-amber-700"
                                  : ""
                          }`}
                        >
                          {student.rank}
                        </span>
                      </td>
                      <td className="p-4">
                        {student.attendance}/{student.totalClasses}(
                        {((student.attendance / student.totalClasses) * 100).toFixed(1)}%)
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/teacher/student-result?id=${student.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No students found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
