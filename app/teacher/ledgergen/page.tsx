"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, collection, query, where, getDocs, getDoc, doc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Student, ExamTerm, Teacher } from "@/lib/models"
import { calculateGrade } from "@/lib/models/subject-models"
import { ArrowLeft, Loader2, Download } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

interface StudentLedgerEntry {
  studentId: string
  studentName: string
  rollNumber: string
  totalMarks: number
  totalPossibleMarks: number
  percentage: number
  gpa: number
  overallGrade: string
  passStatus: boolean
  rank: number
}

interface SubjectResult {
  id: string
  name: string
  theoryMarks: number
  practicalMarks: number
  totalMarks: number
  maxTheoryMarks: number
  maxPracticalMarks: number
  maxTotalMarks: number
  percentage: number
  grade: string
  gradePoint: number
  creditHours: number
}

export default function StudentLedgerPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [classes, setClasses] = useState<{ id: string; name: string; displayName: string }[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<StudentLedgerEntry[]>([])
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedGradeId, setSelectedGradeId] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [selectedExamTermId, setSelectedExamTermId] = useState<string>("")
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)

  // Fetch classes
  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
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
        classesData.sort((a, b) => {
          const order = ["pg", "nursery", "lkg", "ukg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
          return order.indexOf(a.name.toLowerCase()) - order.indexOf(b.name.toLowerCase())
        })
        setClasses(classesData)
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      toast({ title: "Error", description: "Failed to load classes.", variant: "destructive" })
    } finally {
      setLoadingClasses(false)
    }
  }

  // Fetch sections
  const fetchSections = async () => {
    if (!selectedGrade) return
    setLoadingSections(true)
    try {
      if (isDemoMode) {
        setSections(["A", "B", "C", "D"])
      } else {
        const classQuery = query(collection(db, "classes"), where("name", "==", selectedGrade))
        const classSnapshot = await getDocs(classQuery)
        if (!classSnapshot.empty) {
          const classData = classSnapshot.docs[0].data()
          let processedSections: string[] = []

          if (classData.sections && Array.isArray(classData.sections)) {
            processedSections = await Promise.all(
              classData.sections.map(async (section: any, index: number) => {
                if (typeof section === "string") {
                  if (section.length > 10 || /^[a-f0-9]{20,}$/i.test(section)) {
                    try {
                      const sectionDoc = await getDoc(doc(db, "sections", section))
                      if (sectionDoc.exists()) {
                        const sectionData = sectionDoc.data()
                        return sectionData.name || String.fromCharCode(65 + index)
                      }
                    } catch (error) {
                      console.warn(`Failed to fetch section document for ID ${section}:`, error)
                    }
                    return String.fromCharCode(65 + index)
                  }
                  return section
                } else if (section && typeof section === "object" && section.name) {
                  return section.name
                }
                return String.fromCharCode(65 + index)
              })
            )
          }

          processedSections = [...new Set(processedSections.filter((s) => s && typeof s === "string"))]
          if (processedSections.length === 0) {
            processedSections = ["A", "B", "C", "D"]
          }

          setSections(processedSections)
          console.log("Processed sections:", processedSections)
        } else {
          setSections(["A", "B", "C", "D"])
          console.log("Class not found, using default sections:", ["A", "B", "C", "D"])
        }
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      setSections(["A", "B", "C", "D"])
      console.log("Error fallback to default sections:", ["A", "B", "C", "D"])
    } finally {
      setLoadingSections(false)
    }
  }

  // Fetch exam terms
  const fetchExamTerms = async () => {
    try {
      if (isDemoMode) {
        const demoExamTerms: ExamTerm[] = [
          {
            id: "term1",
            name: "First Term (Active)",
            startDate: new Date(2025, 3, 9),
            endDate: new Date(2025, 3, 23),
            isActive: true,
            academicYear: "2025-2026",
            createdBy: "demo123",
            createdAt: new Date(2025, 3, 9),
            updatedAt: new Date(2025, 3, 9),
          },
          {
            id: "term2",
            name: "Second Term",
            startDate: new Date(2025, 6, 15),
            endDate: new Date(2025, 6, 30),
            isActive: false,
            academicYear: "2025-2026",
            createdBy: "demo123",
            createdAt: new Date(2025, 3, 9),
            updatedAt: new Date(2025, 3, 9),
          },
        ]
        setExamTerms(demoExamTerms)
        setSelectedExamTermId(demoExamTerms[0].id)
      } else {
        const now = new Date()
        const year = now.getFullYear()
        const academicYear = now.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`
        const examTermsRef = collection(db, "exam_terms")
        const q = query(examTermsRef, where("academicYear", "==", academicYear))
        const querySnapshot = await getDocs(q)
        const examTermsList: ExamTerm[] = []
        querySnapshot.forEach((doc) => {
          const examTerm = doc.data() as ExamTerm
          examTerm.id = doc.id
          if (doc.data().startDate) examTerm.startDate = doc.data().startDate.toDate()
          if (doc.data().endDate) examTerm.endDate = doc.data().endDate.toDate()
          if (doc.data().createdAt) examTerm.createdAt = doc.data().createdAt.toDate()
          if (doc.data().updatedAt) examTerm.updatedAt = doc.data().updatedAt.toDate()
          examTermsList.push(examTerm)
        })
        setExamTerms(examTermsList)
        const activeTerm = examTermsList.find((term) => term.isActive)
        if (activeTerm) setSelectedExamTermId(activeTerm.id)
        else if (examTermsList.length > 0) setSelectedExamTermId(examTermsList[0].id)
      }
    } catch (error) {
      console.error("Error fetching exam terms:", error)
      toast({ title: "Error", description: "Failed to load exam terms.", variant: "destructive" })
    }
  }

  // Fetch students
  const fetchStudents = async () => {
    if (!selectedGrade || !selectedSection) return
    try {
      if (isDemoMode) {
        const demoStudents: Student[] = Array.from({ length: 15 }, (_, i) => ({
          id: `student${i + 1}`,
          firstName: ["Aarav", "Arjun", "Divya", "Kavya", "Rahul"][i % 5],
          middleName: "",
          lastName: ["Sharma", "Patel", "Singh", "Kumar", "Gupta"][i % 5],
          name: `${["Aarav", "Arjun", "Divya", "Kavya", "Rahul"][i % 5]} ${["Sharma", "Patel", "Singh", "Kumar", "Gupta"][i % 5]}`,
          fatherName: `Raj ${["Sharma", "Patel", "Singh", "Kumar", "Gupta"][i % 5]}`,
          motherName: `Sunita ${["Sharma", "Patel", "Singh", "Kumar", "Gupta"][i % 5]}`,
          contactNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
          dob: "2010-01-01",
          rollNumber: `${i + 1}`.padStart(2, "0"),
          grade: selectedGrade,
          section: selectedSection,
          symbolNumber: `SYM${i + 100}`,
          address: "Kathmandu, Nepal",
          usesBus: i % 3 === 0,
          busRoute: i % 3 === 0 ? "Route A" : "",
          resultPdfUrl: "",
          subjects: [],
          totalMarks: 0,
          percentage: 0.0,
          rank: 0,
          attendance: 0,
          totalClasses: 0,
          monthlyFee: 1500,
          dues: i % 5 === 0 ? 1500 : 0,
          currentSubject: null,
          attendanceStatus: "",
          attendanceId: "",
          isSelected: false,
          qrCode: null,
          profilePictureUrl: "",
          transportationFee: i % 3 === 0 ? 500 : 0,
        }))
        setStudents(demoStudents)
      } else {
        const studentsRef = collection(db, "students")
        const possibleGradeValues = [
          selectedGrade,
          selectedGrade.trim(),
          selectedGrade.toLowerCase(),
          selectedGrade.toUpperCase(),
          selectedGradeId,
          selectedGradeId?.trim(),
          Number.parseInt(selectedGrade) || selectedGrade,
        ].filter((val) => val)
        const studentsList: Student[] = []
        for (const gradeValue of possibleGradeValues) {
          try {
            const q = query(studentsRef, where("grade", "==", gradeValue), where("section", "==", selectedSection))
            const querySnapshot = await getDocs(q)
            if (!querySnapshot.empty) {
              querySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data() as Student
                studentsList.push({ ...data, id: docSnapshot.id })
              })
              break
            }
          } catch (error) {
            console.error(`Error querying with grade value ${gradeValue}:`, error)
          }
        }
        if (studentsList.length === 0) {
          for (const gradeValue of possibleGradeValues) {
            try {
              const q = query(studentsRef, where("grade", "==", gradeValue))
              const querySnapshot = await getDocs(q)
              querySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data() as Student
                if (!data.section || data.section === selectedSection || data.section.trim() === selectedSection.trim()) {
                  studentsList.push({ ...data, id: docSnapshot.id })
                }
              })
              if (studentsList.length > 0) break
            } catch (error) {
              console.error(`Error in broader query with grade value ${gradeValue}:`, error)
            }
          }
        }
        studentsList.sort((a, b) => (Number.parseInt(a.rollNumber) || 0) - (Number.parseInt(b.rollNumber) || 0))
        setStudents(studentsList)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({ title: "Error", description: "Failed to load students.", variant: "destructive" })
    }
  }

  // Fetch ledger data for all students
  const fetchLedgerData = async () => {
    if (!selectedGrade || !selectedSection || !selectedExamTermId || students.length === 0) return
    setLoading(true)
    try {
      const examTerm = examTerms.find((term) => term.id === selectedExamTermId)
      const examTermName = examTerm ? examTerm.name : "Unknown Term"
      const ledgerData: StudentLedgerEntry[] = []

      for (const student of students) {
        const subjectsRef = collection(db, "students", student.id, "subjects")
        const q = query(subjectsRef, where("examTerm", "==", examTermName))
        const querySnapshot = await getDocs(q)
        const results: SubjectResult[] = []

        if (isDemoMode) {
          const demoSubjects = [
            { id: "subject1", name: "Mathematics", maxTheoryMarks: 100, maxPracticalMarks: 0, creditHours: 4 },
            { id: "subject2", name: "English", maxTheoryMarks: 100, maxPracticalMarks: 0, creditHours: 4 },
            { id: "subject3", name: "Science", maxTheoryMarks: 75, maxPracticalMarks: 25, creditHours: 4 },
          ]
          demoSubjects.forEach((subject) => {
            const theoryMarks = Math.floor(Math.random() * subject.maxTheoryMarks * 0.8) + subject.maxTheoryMarks * 0.2
            const practicalMarks = subject.maxPracticalMarks ? Math.floor(Math.random() * subject.maxPracticalMarks * 0.8) + subject.maxPracticalMarks * 0.2 : 0
            const totalMarks = theoryMarks + practicalMarks
            const percentage = (totalMarks / (subject.maxTheoryMarks + subject.maxPracticalMarks)) * 100
            const { grade, gradePoint } = calculateGrade(percentage)
            results.push({
              id: subject.id,
              name: subject.name,
              theoryMarks,
              practicalMarks,
              totalMarks,
              maxTheoryMarks: subject.maxTheoryMarks,
              maxPracticalMarks: subject.maxPracticalMarks,
              maxTotalMarks: subject.maxTheoryMarks + subject.maxPracticalMarks,
              percentage,
              grade,
              gradePoint,
              creditHours: subject.creditHours,
            })
          })
        } else {
          for (const docSnapshot of querySnapshot.docs) {
            const data = docSnapshot.data()
            let subjectData = {}
            if (data.subjectId) {
              try {
                const subjectRef = doc(db, "subjects", data.subjectId)
                const subjectDoc = await getDoc(subjectRef)
                subjectData = subjectDoc.exists() ? subjectDoc.data() : {}
              } catch (error) {
                console.warn(`Failed to fetch subject document for ID ${data.subjectId}:`, error)
              }
            }
            const totalMarks = (data.theoryMarks || 0) + (data.practicalMarks || 0)
            const maxTotalMarks = (data.maxTheoryMarks || 100) + (data.maxPracticalMarks || 0)
            const percentage = maxTotalMarks ? (totalMarks / maxTotalMarks) * 100 : 0
            const { grade, gradePoint } = calculateGrade(percentage)
            results.push({
              id: docSnapshot.id,
              name: data.name || "Unknown Subject",
              theoryMarks: data.theoryMarks || 0,
              practicalMarks: data.practicalMarks || 0,
              totalMarks,
              maxTheoryMarks: data.maxTheoryMarks || 100,
              maxPracticalMarks: data.maxPracticalMarks || 0,
              maxTotalMarks,
              percentage,
              grade,
              gradePoint,
              creditHours: subjectData.creditHours || 4,
            })
          }
        }

        const totalMarks = results.reduce((sum, res) => sum + res.totalMarks, 0)
        const totalPossibleMarks = results.reduce((sum, res) => sum + res.maxTotalMarks, 0)
        const percentage = totalPossibleMarks ? (totalMarks / totalPossibleMarks) * 100 : 0
        const totalCreditHours = results.reduce((sum, res) => sum + res.creditHours, 0)
        const gpa = totalCreditHours ? results.reduce((sum, res) => sum + res.gradePoint * res.creditHours, 0) / totalCreditHours : 0
        const { grade: overallGrade } = calculateGrade(percentage)
        const passStatus = results.every((res) => res.grade !== "F")

        ledgerData.push({
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          totalMarks,
          totalPossibleMarks,
          percentage,
          gpa: Number(gpa.toFixed(2)),
          overallGrade,
          passStatus,
          rank: 0, // Will be updated after sorting
        })
      }

      // Calculate ranks based on totalMarks
      ledgerData.sort((a, b) => b.totalMarks - a.totalMarks)
      let currentRank = 1
      for (let i = 0; i < ledgerData.length; i++) {
        if (i > 0 && ledgerData[i].totalMarks === ledgerData[i - 1].totalMarks) {
          ledgerData[i].rank = ledgerData[i - 1].rank
        } else {
          ledgerData[i].rank = currentRank
        }
        currentRank = i + 2 // Skip ranks for ties
      }

      // Re-sort by roll number for display
      ledgerData.sort((a, b) => (Number.parseInt(a.rollNumber) || 0) - (Number.parseInt(b.rollNumber) || 0))
      setLedgerEntries(ledgerData)
    } catch (error) {
      console.error("Error fetching ledger data:", error)
      toast({ title: "Error", description: "Failed to load student ledger data.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Generate PDF
  const generatePDF = () => {
    if (!ledgerEntries.length) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    doc.setFontSize(14)
    doc.text(`Student Ledger - Class ${selectedGrade} Section ${selectedSection}`, pageWidth / 2, 15, { align: "center" })
    doc.setFontSize(10)
    doc.text(`Exam Term: ${examTerms.find((t) => t.id === selectedExamTermId)?.name || "Unknown"}`, pageWidth / 2, 22, { align: "center" })

    autoTable(doc, {
      startY: 30,
      head: [["Rank", "Roll", "Student Name", "Total Marks", "Percentage", "GPA", "Grade", "Status"]],
      body: ledgerEntries.map((entry) => [
        entry.rank,
        entry.rollNumber,
        entry.studentName,
        `${entry.totalMarks}/${entry.totalPossibleMarks}`,
        `${entry.percentage.toFixed(2)}%`,
        entry.gpa.toFixed(2),
        entry.overallGrade,
        entry.passStatus ? "Pass" : "Fail",
      ]),
      theme: "striped",
      headStyles: { fillColor: [22, 160, 133], fontSize: 8 },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 12 }, // Rank
        1: { cellWidth: 12 }, // Roll
        2: { cellWidth: 45 }, // Student Name
        3: { cellWidth: 28 }, // Total Marks
        4: { cellWidth: 25 }, // Percentage
        5: { cellWidth: 20 }, // GPA
        6: { cellWidth: 20 }, // Grade
        7: { cellWidth: 20 }, // Status
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        doc.setFontSize(8)
        doc.text(`Page 1 of 1`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: "right" })
      },
    })

    doc.save(`Class_${selectedGrade}_${selectedSection}_Ledger.pdf`)
  }

  // Check teacher authentication
  const checkTeacherAndLoadData = async () => {
    setLoading(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

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
        await Promise.all([fetchClasses(), fetchExamTerms()])
      } else {
        const teacherId = localStorage.getItem("teacherId")
        if (!teacherId) {
          router.push("/teacher/login")
          return
        }
        const teacherDoc = await getDoc(doc(db, "teachers", teacherId))
        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data() as Teacher
          teacherData.id = teacherDoc.id
          setCurrentTeacher(teacherData)
          await Promise.all([fetchClasses(), fetchExamTerms()])
        } else {
          router.push("/teacher/login")
        }
      }
    } catch (error) {
      console.error("Error checking teacher:", error)
      toast({ title: "Error", description: "Failed to authenticate teacher.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    checkTeacherAndLoadData()
  }, [])

  // Fetch sections when grade changes
  useEffect(() => {
    if (selectedGrade && selectedGradeId) {
      fetchSections()
      setSelectedSection("")
      setStudents([])
      setLedgerEntries([])
    }
  }, [selectedGrade, selectedGradeId])

  // Fetch students when grade and section are selected
  useEffect(() => {
    if (selectedGrade && selectedSection) {
      fetchStudents()
      setLedgerEntries([])
    }
  }, [selectedGrade, selectedSection])

  // Fetch ledger data when students and exam term are selected
  useEffect(() => {
    if (students.length > 0 && selectedExamTermId) {
      fetchLedgerData()
    }
  }, [students, selectedExamTermId])

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Class Ledger</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Class and Exam Term</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="grade">Select Grade</Label>
              {loadingClasses ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedGrade}
                  onValueChange={(value) => {
                    const classObj = classes.find((c) => c.name === value)
                    if (classObj) {
                      setSelectedGrade(value)
                      setSelectedGradeId(classObj.id)
                    }
                  }}
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="Select grade" />
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

            <div>
              <Label htmlFor="section">Select Section</Label>
              {loadingSections ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedSection}
                  onValueChange={setSelectedSection}
                  disabled={!selectedGrade || sections.length === 0}
                >
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        Section {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="examTerm">Select Exam Term</Label>
              <Select value={selectedExamTermId} onValueChange={setSelectedExamTermId}>
                <SelectTrigger id="examTerm">
                  <SelectValue placeholder="Select exam term" />
                </SelectTrigger>
                <SelectContent>
                  {examTerms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} {term.isActive && "(Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {ledgerEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ledger for Class {selectedGrade} Section {selectedSection}</CardTitle>
            <Button onClick={generatePDF} className="ml-auto">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Roll</th>
                    <th className="text-left p-2">Student Name</th>
                    <th className="text-left p-2">Total Marks</th>
                    <th className="text-left p-2">Percentage</th>
                    <th className="text-left p-2">GPA</th>
                    <th className="text-left p-2">Grade</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.studentId} className="border-b hover:bg-gray-50">
                      <td className="p-2">{entry.rank}</td>
                      <td className="p-2">{entry.rollNumber}</td>
                      <td className="p-2">{entry.studentName}</td>
                      <td className="p-2">{entry.totalMarks}/{entry.totalPossibleMarks}</td>
                      <td className="p-2">{entry.percentage.toFixed(2)}%</td>
                      <td className="p-2">{entry.gpa.toFixed(2)}</td>
                      <td className="p-2">{entry.overallGrade}</td>
                      <td className="p-2">{entry.passStatus ? "Pass" : "Fail"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedGrade && selectedSection && selectedExamTermId && ledgerEntries.length === 0 && !loading && (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No results found for the selected class, section, and exam term.</p>
        </div>
      )}
    </div>
  )
}