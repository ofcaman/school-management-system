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
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
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

// Interface for Class Teacher Assignment
interface ClassTeacherAssignment {
  teacherId: string
  classId: string
  sectionId: string
  academicYear: string
  className?: string
  sectionName?: string
}

export default function TeacherExportPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Add state for classes and sections
  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<ClassTeacherAssignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    name: true,
    email: true,
    phone: true,
    qualification: true,
    roles: true,
    assignedClass: true,
    assignedSection: true, // Add section field
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

    fetchTeachers()
    loadClasses()
  }, [teacherId, router])

  useEffect(() => {
    if (selectedClass !== "all") {
      loadSectionsForClass(selectedClass)
    } else {
      setSections([])
      setSelectedSection("all")
    }
  }, [selectedClass])

  useEffect(() => {
    filterTeachers()
  }, [searchQuery, selectedClass, selectedSection, teachers, classTeacherAssignments])

  const loadClasses = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Set demo classes
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
    }
  }

  const loadSectionsForClass = async (classId: string) => {
    try {
      // Reset sections array
      setSections([])

      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Set demo sections
        const demoSections: Section[] = [
          { id: "section1", name: "A", classId: classId },
          { id: "section2", name: "B", classId: classId },
          { id: "section3", name: "C", classId: classId },
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
    }
  }

  const fetchTeachers = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo teachers
        const demoTeachers: Teacher[] = [
          {
            id: "demo123",
            name: "DEMO TEACHER",
            email: "demo@sajhaschool.edu",
            phone: "9876543210",
            qualification: "M.Ed",
            profileImageUrl: "",
            roles: ["principal", "computer_teacher"],
            assignedClass: "10",
            active: true,
          },
          {
            id: "teacher1",
            name: "JOHN DOE",
            email: "john@sajhaschool.edu",
            phone: "9876543211",
            qualification: "B.Ed",
            profileImageUrl: "",
            roles: ["class_teacher"],
            assignedClass: "9",
            active: true,
          },
          {
            id: "teacher2",
            name: "JANE SMITH",
            email: "jane@sajhaschool.edu",
            phone: "9876543212",
            qualification: "M.Sc",
            profileImageUrl: "",
            roles: ["subject_teacher"],
            assignedClass: "",
            active: true,
          },
          {
            id: "teacher3",
            name: "ROBERT JOHNSON",
            email: "robert@sajhaschool.edu",
            phone: "9876543213",
            qualification: "B.Sc",
            profileImageUrl: "",
            roles: ["class_teacher"],
            assignedClass: "8",
            active: true,
          },
          {
            id: "teacher4",
            name: "SARAH WILLIAMS",
            email: "sarah@sajhaschool.edu",
            phone: "9876543214",
            qualification: "M.A",
            profileImageUrl: "",
            roles: ["subject_teacher"],
            assignedClass: "",
            active: true,
          },
          {
            id: "teacher5",
            name: "MICHAEL BROWN",
            email: "michael@sajhaschool.edu",
            phone: "9876543215",
            qualification: "Ph.D",
            profileImageUrl: "",
            roles: ["class_teacher"],
            assignedClass: "7",
            active: true,
          },
          {
            id: "teacher6",
            name: "EMILY DAVIS",
            email: "emily@sajhaschool.edu",
            phone: "9876543216",
            qualification: "B.Ed",
            profileImageUrl: "",
            roles: ["subject_teacher"],
            assignedClass: "",
            active: true,
          },
          {
            id: "teacher7",
            name: "DAVID MILLER",
            email: "david@sajhaschool.edu",
            phone: "9876543217",
            qualification: "M.Ed",
            profileImageUrl: "",
            roles: ["class_teacher"],
            assignedClass: "6",
            active: true,
          },
          {
            id: "teacher8",
            name: "LISA WILSON",
            email: "lisa@sajhaschool.edu",
            phone: "9876543218",
            qualification: "B.A",
            profileImageUrl: "",
            roles: ["subject_teacher"],
            assignedClass: "",
            active: true,
          },
          {
            id: "teacher9",
            name: "JAMES TAYLOR",
            email: "james@sajhaschool.edu",
            phone: "9876543219",
            qualification: "M.Sc",
            profileImageUrl: "",
            roles: ["class_teacher"],
            assignedClass: "5",
            active: true,
          },
          {
            id: "teacher10",
            name: "JENNIFER ANDERSON",
            email: "jennifer@sajhaschool.edu",
            phone: "9876543220",
            qualification: "B.Sc",
            profileImageUrl: "",
            roles: ["subject_teacher"],
            assignedClass: "",
            active: true,
          },
        ]

        setTeachers(demoTeachers)

        // Load demo class teacher assignments
        const demoAssignments: ClassTeacherAssignment[] = [
          {
            teacherId: "demo123",
            classId: "class14",
            sectionId: "section1",
            academicYear: "2082",
            className: "10",
            sectionName: "A",
          },
          {
            teacherId: "teacher1",
            classId: "class13",
            sectionId: "section1",
            academicYear: "2082",
            className: "9",
            sectionName: "A",
          },
          {
            teacherId: "teacher3",
            classId: "class12",
            sectionId: "section2",
            academicYear: "2082",
            className: "8",
            sectionName: "B",
          },
          {
            teacherId: "teacher5",
            classId: "class11",
            sectionId: "section3",
            academicYear: "2082",
            className: "7",
            sectionName: "C",
          },
          {
            teacherId: "teacher7",
            classId: "class10",
            sectionId: "section1",
            academicYear: "2082",
            className: "6",
            sectionName: "A",
          },
          {
            teacherId: "teacher9",
            classId: "class9",
            sectionId: "section2",
            academicYear: "2082",
            className: "5",
            sectionName: "B",
          },
        ]

        setClassTeacherAssignments(demoAssignments)
      } else {
        // Load real data from Firebase
        const teachersQuery = collection(db, "teachers")
        const querySnapshot = await getDocs(teachersQuery)
        const teachersList: Teacher[] = []

        querySnapshot.forEach((doc) => {
          const teacher = doc.data() as Teacher
          teacher.id = doc.id
          teachersList.push(teacher)
        })

        // Sort teachers by name
        teachersList.sort((a, b) => a.name.localeCompare(b.name))

        setTeachers(teachersList)

        // Load class teacher assignments
        await loadClassTeacherAssignments()
      }
    } catch (error) {
      console.error("Error fetching teachers:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassTeacherAssignments = async () => {
    setLoadingAssignments(true)
    try {
      const assignmentsQuery = query(collection(db, "class_teachers"))
      const assignmentsSnapshot = await getDocs(assignmentsQuery)

      if (!assignmentsSnapshot.empty) {
        const assignments: ClassTeacherAssignment[] = []

        for (const docSnapshot of assignmentsSnapshot.docs) {
          const data = docSnapshot.data() as ClassTeacherAssignment

          // Get class name
          let className = ""
          if (data.classId) {
            try {
              const classDocRef = doc(db, "classes", data.classId)
              const classDoc = await getDoc(classDocRef)
              if (classDoc.exists()) {
                className = classDoc.data().name || ""
              }
            } catch (error) {
              console.error("Error getting class name:", error)
            }
          }

          // Get section name
          let sectionName = ""
          if (data.sectionId) {
            try {
              const sectionDocRef = doc(db, "sections", data.sectionId)
              const sectionDoc = await getDoc(sectionDocRef)
              if (sectionDoc.exists()) {
                sectionName = sectionDoc.data().name || ""
              }
            } catch (error) {
              console.error("Error getting section name:", error)
            }
          }

          assignments.push({
            ...data,
            className,
            sectionName,
          })
        }

        setClassTeacherAssignments(assignments)
      }
    } catch (error) {
      console.error("Error loading class teacher assignments:", error)
    } finally {
      setLoadingAssignments(false)
    }
  }

  const filterTeachers = () => {
    let filtered = [...teachers]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(query) ||
          teacher.email.toLowerCase().includes(query) ||
          teacher.phone.includes(query) ||
          teacher.qualification.toLowerCase().includes(query),
      )
    }

    // Filter by class
    if (selectedClass !== "all") {
      const classObj = classes.find((c) => c.id === selectedClass)
      const className = classObj ? classObj.name : ""

      filtered = filtered.filter((teacher) => {
        // Check if teacher is assigned to this class in class_teachers collection
        const hasClassAssignment = classTeacherAssignments.some(
          (assignment) => assignment.teacherId === teacher.id && assignment.classId === selectedClass,
        )

        // Check if teacher's assignedClass matches
        const matchesAssignedClass = teacher.assignedClass === className || teacher.assignedClass === selectedClass

        return hasClassAssignment || matchesAssignedClass
      })
    }

    // Filter by section
    if (selectedSection !== "all" && selectedClass !== "all") {
      const sectionObj = sections.find((s) => s.id === selectedSection)
      const sectionName = sectionObj ? sectionObj.name : ""

      filtered = filtered.filter((teacher) => {
        // Check if teacher is assigned to this section in class_teachers collection
        const hasSectionAssignment = classTeacherAssignments.some(
          (assignment) =>
            assignment.teacherId === teacher.id &&
            assignment.classId === selectedClass &&
            assignment.sectionId === selectedSection,
        )

        return hasSectionAssignment
      })
    }

    setFilteredTeachers(filtered)
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

  const getRolesList = (roles: string[] = []) => {
    return roles
      .map((role) => {
        switch (role) {
          case "principal":
            return "Principal"
          case "computer_teacher":
            return "Computer Teacher"
          case "class_teacher":
            return "Class Teacher"
          case "subject_teacher":
            return "Subject Teacher"
          default:
            return role
        }
      })
      .join(", ")
  }

  const getTeacherAssignedSection = (teacherId: string) => {
    const assignment = classTeacherAssignments.find(
      (a) => a.teacherId === teacherId && (selectedClass === "all" || a.classId === selectedClass),
    )

    return assignment ? assignment.sectionName : "-"
  }

  const getSelectedTeacherData = () => {
    return filteredTeachers.map((teacher) => {
      const data: Record<string, any> = {}

      if (selectedFields.name) data["Name"] = teacher.name
      if (selectedFields.email) data["Email"] = teacher.email
      if (selectedFields.phone) data["Phone"] = teacher.phone
      if (selectedFields.qualification) data["Qualification"] = teacher.qualification
      if (selectedFields.roles) data["Roles"] = getRolesList(teacher.roles)
      if (selectedFields.assignedClass) data["Assigned Class"] = teacher.assignedClass || "N/A"
      if (selectedFields.assignedSection) data["Assigned Section"] = getTeacherAssignedSection(teacher.id)

      return data
    })
  }

  const exportToCSV = () => {
    setExportLoading("csv")
    try {
      const data = getSelectedTeacherData()
      const csv = convertToCSV(data)
      downloadFile(csv, "teachers.csv", "text/csv")
    } catch (error) {
      console.error("Error exporting to CSV:", error)
    } finally {
      setExportLoading(null)
    }
  }

  const exportToExcel = () => {
    setExportLoading("excel")
    try {
      const data = getSelectedTeacherData()
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers")

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "teachers.xlsx"
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
      const data = getSelectedTeacherData()

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
      doc.text("Teacher List", doc.internal.pageSize.width / 2, 25, { align: "center" })

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
      doc.save("teachers.pdf")
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

  const getClassDisplayName = (classId: string) => {
    const classObj = classes.find((c) => c.id === classId)
    if (!classObj) return classId

    const className = classObj.name
    if (
      className.includes("P.G") ||
      className.includes("LKG") ||
      className.includes("UKG") ||
      className.includes("Nursery")
    ) {
      return className
    }
    return `Class ${className}`
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
          <h1 className="text-3xl font-bold">Teacher Export</h1>
          <p className="text-muted-foreground">View and export teacher data</p>
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
                Search Teachers
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, phone, etc."
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
              disabled={exportLoading !== null || filteredTeachers.length === 0}
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
              disabled={exportLoading !== null || filteredTeachers.length === 0}
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
              disabled={exportLoading !== null || filteredTeachers.length === 0}
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

          <div>
            <Label className="mb-2 block">Select Fields to Export</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="name" checked={selectedFields.name} onCheckedChange={() => toggleField("name")} />
                <Label htmlFor="name" className="cursor-pointer">
                  Name
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="email" checked={selectedFields.email} onCheckedChange={() => toggleField("email")} />
                <Label htmlFor="email" className="cursor-pointer">
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="phone" checked={selectedFields.phone} onCheckedChange={() => toggleField("phone")} />
                <Label htmlFor="phone" className="cursor-pointer">
                  Phone
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="qualification"
                  checked={selectedFields.qualification}
                  onCheckedChange={() => toggleField("qualification")}
                />
                <Label htmlFor="qualification" className="cursor-pointer">
                  Qualification
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="roles" checked={selectedFields.roles} onCheckedChange={() => toggleField("roles")} />
                <Label htmlFor="roles" className="cursor-pointer">
                  Roles
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignedClass"
                  checked={selectedFields.assignedClass}
                  onCheckedChange={() => toggleField("assignedClass")}
                />
                <Label htmlFor="assignedClass" className="cursor-pointer">
                  Assigned Class
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignedSection"
                  checked={selectedFields.assignedSection}
                  onCheckedChange={() => toggleField("assignedSection")}
                />
                <Label htmlFor="assignedSection" className="cursor-pointer">
                  Assigned Section
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
            Teacher List
            {selectedClass !== "all" && (
              <span>
                {" - "}
                {getClassDisplayName(selectedClass)}
              </span>
            )}
            {selectedSection !== "all" && (
              <span>
                {" - Section "}
                {sections.find((s) => s.id === selectedSection)?.name || selectedSection}
              </span>
            )}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredTeachers.length} teachers)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTeachers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Phone</th>
                    <th className="text-left p-4">Qualification</th>
                    <th className="text-left p-4">Roles</th>
                    <th className="text-left p-4">Assigned Class</th>
                    <th className="text-left p-4">Assigned Section</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{teacher.name}</td>
                      <td className="p-4">{teacher.email}</td>
                      <td className="p-4">{teacher.phone}</td>
                      <td className="p-4">{teacher.qualification}</td>
                      <td className="p-4">{getRolesList(teacher.roles)}</td>
                      <td className="p-4">{teacher.assignedClass || "-"}</td>
                      <td className="p-4">{getTeacherAssignedSection(teacher.id)}</td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/teacher/view-teacher?id=${teacher.id}`)}
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
              <p className="text-muted-foreground">No teachers found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
