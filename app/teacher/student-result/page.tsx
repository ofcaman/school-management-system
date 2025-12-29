"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { initializeApp } from "firebase/app"
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Student, Teacher } from "@/lib/models"
import { ArrowLeft, Loader2, Receipt, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
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
  subject: string
  status: string
  teacherId: string
  teacherName: string
  grade: string
}

// Interface for Student Bill
interface StudentBill {
  id?: string
  studentId: string
  studentName: string
  rollNumber: string
  grade: string
  term: string
  year: string
  totalFee: number
  installments: number
  remainingBalance: number
  status: "Paid" | "Unpaid" | "Partially Paid"
  particulars: Record<string, number>
  paidAmount?: number
  paidDate?: string
}

export default function StudentResultPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get("id")
  const [isAdmin, setIsAdmin] = useState(false)

  // Add this state variable at the top of the component with the other state variables
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalUnpaid, setTotalUnpaid] = useState(0)

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [months, setMonths] = useState<{ value: string; label: string }[]>([])
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
  })

  // Fee state
  const [bills, setBills] = useState<StudentBill[]>([])
  const [billsLoading, setBillsLoading] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [years, setYears] = useState<string[]>([])

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) {
        router.push("/teacher/dashboard")
        return
      }

      try {
        // Check if we're in demo mode
        const isDemoMode = localStorage.getItem("isDemoMode") === "true"

        if (isDemoMode) {
          // Create demo student data
          const demoStudent: Student = {
            id: studentId,
            firstName: "Student",
            middleName: "",
            lastName: "Demo",
            name: "Student Demo",
            fatherName: "Father Demo",
            motherName: "Mother Demo",
            contactNumber: "9876543210",
            dob: "2065-01-15",
            rollNumber: "1",
            grade: "10",
            symbolNumber: "S12345",
            address: "Kathmandu",
            usesBus: true,
            busRoute: "Route A",
            resultPdfUrl: "",
            subjects: [
              {
                id: "sub1",
                name: "English",
                fullMarks: 100,
                passMarks: 40,
                obtainedMarks: 75,
                grade: "B+",
                theoryMarks: 55,
                practicalMarks: 20,
                finalGrade: "B+",
                gradePoint: 3.2,
                remarks: "Very Good",
                examTerm: "First Term",
                maxTheoryMarks: 75,
                maxPracticalMarks: 25,
                hasPractical: true,
              },
              {
                id: "sub2",
                name: "Mathematics",
                fullMarks: 100,
                passMarks: 40,
                obtainedMarks: 82,
                grade: "A",
                theoryMarks: 82,
                practicalMarks: 0,
                finalGrade: "A",
                gradePoint: 3.6,
                remarks: "Excellent",
                examTerm: "First Term",
                maxTheoryMarks: 100,
                maxPracticalMarks: 0,
                hasPractical: false,
              },
              {
                id: "sub3",
                name: "Science",
                fullMarks: 100,
                passMarks: 40,
                obtainedMarks: 68,
                grade: "B",
                theoryMarks: 48,
                practicalMarks: 20,
                finalGrade: "B",
                gradePoint: 2.8,
                remarks: "Good",
                examTerm: "First Term",
                maxTheoryMarks: 75,
                maxPracticalMarks: 25,
                hasPractical: true,
              },
            ],
            totalMarks: 225,
            percentage: 75.0,
            rank: 3,
            attendance: 85,
            totalClasses: 100,
            monthlyFee: 1500,
            dues: 14100, // Demo dues amount
            currentSubject: null,
            attendanceStatus: "",
            attendanceId: "",
            isSelected: false,
            qrCode: null,
            profilePictureUrl: null,
            transportationFee: 500,
          }

          setStudent(demoStudent)
        } else {
          // Fetch real student data from Firestore
          const studentDoc = await getDoc(doc(db, "students", studentId))

          if (studentDoc.exists()) {
            const studentData = studentDoc.data() as Student
            studentData.id = studentDoc.id
            setStudent(studentData)
          } else {
            setError("Student not found")
          }
        }

        // Check if current teacher is admin
        const isDemoModeAdmin = localStorage.getItem("isDemoMode") === "true"

        if (isDemoModeAdmin) {
          setIsAdmin(true)
        } else {
          // Check if current teacher is admin
          const teacherId = localStorage.getItem("teacherId")
          if (teacherId) {
            try {
              const teacherDoc = await getDoc(doc(db, "teachers", teacherId))
              if (teacherDoc.exists()) {
                const teacherData = teacherDoc.data() as Teacher
                const isAdminUser =
                  teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")
                setIsAdmin(isAdminUser)
              }
            } catch (error) {
              console.error("Error checking admin status:", error)
            }
          }
        }
      } catch (error: any) {
        setError(`Error fetching student data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [studentId, router])

  // Fetch attendance records when student data is loaded
  useEffect(() => {
    if (student) {
      fetchAttendanceRecords(student.id)
      fetchBills(student.id)
    }
  }, [student])

  const fetchAttendanceRecords = async (studentId: string) => {
    if (!studentId) return

    setAttendanceLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Create demo attendance records
        const demoAttendance: Attendance[] = []
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth()

        // Generate attendance for the last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date(currentYear, currentMonth, currentDate.getDate() - i)
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const day = String(date.getDate()).padStart(2, "0")
          const dateString = `${year}-${month}-${day}`

          // Skip weekends
          if (date.getDay() === 0 || date.getDay() === 6) continue

          // Random status
          const statusOptions = ["present", "absent", "late"]
          const randomStatus = statusOptions[Math.floor(Math.random() * (i > 20 ? 3 : 2))] // More absences in older records

          demoAttendance.push({
            id: `attendance-${i}`,
            studentId,
            date: dateString,
            bsDate: `2080-${month}-${day}`, // Simplified BS date
            bsYear: 2080,
            bsMonth: Number.parseInt(month),
            bsDay: Number.parseInt(day),
            subject:
              i % 5 === 0
                ? "English"
                : i % 5 === 1
                  ? "Mathematics"
                  : i % 5 === 2
                    ? "Science"
                    : i % 5 === 3
                      ? "Social Studies"
                      : "Computer",
            status: randomStatus,
            teacherId: "demo-teacher",
            teacherName: "Demo Teacher",
            grade: "10",
          })
        }

        setAttendanceRecords(demoAttendance)

        // Get unique months - filter out any undefined values
        const monthsData = demoAttendance
          .map((record) => record.bsMonth)
          .filter((month): month is number => month !== undefined && month !== null)

        const uniqueMonths = Array.from(new Set(monthsData))
          .sort((a, b) => b - a) // Sort in descending order
          .map((month) => ({
            value: month.toString(), // Convert to string to avoid toString() on undefined
            label: getMonthName(month),
          }))

        setMonths(uniqueMonths)
        if (uniqueMonths.length > 0) {
          setSelectedMonth(uniqueMonths[0].value)
        }

        // Calculate stats
        calculateAttendanceStats(demoAttendance)
      } else {
        // Fetch real attendance records from Firestore
        const attendanceQuery = query(collection(db, "attendance"), where("studentId", "==", studentId))

        const querySnapshot = await getDocs(attendanceQuery)
        const records: Attendance[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Attendance
          records.push({
            id: doc.id,
            ...data,
          })
        })

        setAttendanceRecords(records)

        // Get unique months - filter out any undefined values
        const monthsData = records
          .map((record) => record.bsMonth)
          .filter((month): month is number => month !== undefined && month !== null)

        const uniqueMonths = Array.from(new Set(monthsData))
          .sort((a, b) => b - a) // Sort in descending order
          .map((month) => ({
            value: month.toString(), // Convert to string to avoid toString() on undefined
            label: getMonthName(month),
          }))

        setMonths(uniqueMonths)
        if (uniqueMonths.length > 0) {
          setSelectedMonth(uniqueMonths[0].value)
        }

        // Calculate stats
        calculateAttendanceStats(records)
      }
    } catch (error: any) {
      console.error("Error fetching attendance records:", error)
    } finally {
      setAttendanceLoading(false)
    }
  }

  // Replace the fetchBills function with this updated version that correctly calculates the total remaining balance
  const fetchBills = async (studentId: string) => {
    if (!studentId) return

    setBillsLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Create demo bills
        const demoBills: StudentBill[] = []
        const currentYear = new Date().getFullYear()

        // Generate bills for the current year (2082 BS)
        const terms = ["First Term", "Second Term", "Third Term", "Fourth Term"]
        const bsYear = "2082"

        // First term bill
        demoBills.push({
          id: `bill-0`,
          studentId,
          studentName: "Student Demo",
          rollNumber: "1",
          grade: "10",
          term: "First Term",
          year: bsYear,
          totalFee: 8550,
          installments: 3,
          remainingBalance: 0, // Paid
          status: "Paid",
          particulars: {
            "Monthly Fee": 4800,
            "Exam Fee": 200,
            "Computer Fee": 300,
            "Library Fee": 100,
            "Sports Fee": 150,
            "Previous Dues": 3000,
          },
          paidAmount: 8550,
          paidDate: new Date().toISOString(),
        })

        // Second term bill
        demoBills.push({
          id: `bill-1`,
          studentId,
          studentName: "Student Demo",
          rollNumber: "1",
          grade: "10",
          term: "Second Term",
          year: bsYear,
          totalFee: 14100,
          installments: 3,
          remainingBalance: 14100,
          status: "Unpaid",
          particulars: {
            "Monthly Fee": 4800,
            "Exam Fee": 200,
            "Library Fee": 100,
            "Sports Fee": 150,
            "Previous Dues": 8850, // This includes the First Term bill
          },
        })

        setBills(demoBills)

        // Set available years
        setYears(["2082"])
        setSelectedYear("2082")

        // Calculate total unpaid amount - sum of all remaining balances
        const totalUnpaid = demoBills.reduce((sum, bill) => sum + bill.remainingBalance, 0)
        setTotalUnpaid(totalUnpaid)

        // Calculate total paid amount
        const totalPaid = demoBills.reduce((sum, bill) => {
          if (bill.status === "Paid") {
            return sum + bill.totalFee
          } else if (bill.status === "Partially Paid" && bill.paidAmount) {
            return sum + bill.paidAmount
          }
          return sum
        }, 0)

        setTotalPaid(totalPaid)

        // Load student results if available
        if (student && student.subjects && student.subjects.length > 0) {
          // Results are already loaded from student data
        } else if (isDemoMode) {
          // Create demo results
          const demoSubjects = [
            {
              id: "sub1",
              name: "English",
              fullMarks: 100,
              passMarks: 40,
              obtainedMarks: 75,
              grade: "B+",
              theoryMarks: 55,
              practicalMarks: 20,
              finalGrade: "B+",
              gradePoint: 3.2,
              remarks: "Very Good",
              examTerm: "First Term",
              maxTheoryMarks: 75,
              maxPracticalMarks: 25,
              hasPractical: true,
            },
            {
              id: "sub2",
              name: "Mathematics",
              fullMarks: 100,
              passMarks: 40,
              obtainedMarks: 82,
              grade: "A",
              theoryMarks: 82,
              practicalMarks: 0,
              finalGrade: "A",
              gradePoint: 3.6,
              remarks: "Excellent",
              examTerm: "First Term",
              maxTheoryMarks: 100,
              maxPracticalMarks: 0,
              hasPractical: false,
            },
            {
              id: "sub3",
              name: "Science",
              fullMarks: 100,
              passMarks: 40,
              obtainedMarks: 68,
              grade: "B",
              theoryMarks: 48,
              practicalMarks: 20,
              finalGrade: "B",
              gradePoint: 2.8,
              remarks: "Good",
              examTerm: "First Term",
              maxTheoryMarks: 75,
              maxPracticalMarks: 25,
              hasPractical: true,
            },
            {
              id: "sub4",
              name: "Social Studies",
              fullMarks: 100,
              passMarks: 40,
              obtainedMarks: 72,
              grade: "B+",
              theoryMarks: 72,
              practicalMarks: 0,
              finalGrade: "B+",
              gradePoint: 3.2,
              remarks: "Very Good",
              examTerm: "First Term",
              maxTheoryMarks: 100,
              maxPracticalMarks: 0,
              hasPractical: false,
            },
            {
              id: "sub5",
              name: "Nepali",
              fullMarks: 100,
              passMarks: 40,
              obtainedMarks: 65,
              grade: "B",
              theoryMarks: 65,
              practicalMarks: 0,
              finalGrade: "B",
              gradePoint: 2.8,
              remarks: "Good",
              examTerm: "First Term",
              maxTheoryMarks: 100,
              maxPracticalMarks: 0,
              hasPractical: false,
            },
            {
              id: "sub6",
              name: "Computer",
              fullMarks: 100,
              passMarks: 40,
              obtainedMarks: 88,
              grade: "A",
              theoryMarks: 68,
              practicalMarks: 20,
              finalGrade: "A",
              gradePoint: 3.6,
              remarks: "Excellent",
              examTerm: "First Term",
              maxTheoryMarks: 75,
              maxPracticalMarks: 25,
              hasPractical: true,
            },
          ]

          const totalMarks = demoSubjects.reduce((sum, subject) => sum + subject.obtainedMarks, 0)
          const totalFullMarks = demoSubjects.reduce((sum, subject) => sum + subject.fullMarks, 0)
          const percentage = (totalMarks / totalFullMarks) * 100

          if (student) {
            student.subjects = demoSubjects
            student.totalMarks = totalMarks
            student.percentage = percentage
            student.rank = 3
          }
        }
      } else {
        // Fetch real bills from Firestore
        const billsQuery = query(collection(db, "student_bills"), where("studentId", "==", studentId))

        const querySnapshot = await getDocs(billsQuery)
        const billsList: StudentBill[] = []
        const yearsSet = new Set<string>()

        querySnapshot.forEach((doc) => {
          const data = doc.data() as StudentBill
          billsList.push({
            id: doc.id,
            ...data,
          })

          // Add year to set
          if (data.year) {
            yearsSet.add(data.year)
          }
        })

        // Sort bills by year and term
        billsList.sort((a, b) => {
          if (a.year !== b.year) {
            return Number(b.year) - Number(a.year) // Descending by year
          }

          const termOrder = {
            "First Term": 1,
            "Second Term": 2,
            "Third Term": 3,
            "Fourth Term": 4,
          }

          return termOrder[a.term as keyof typeof termOrder] - termOrder[b.term as keyof typeof termOrder]
        })

        setBills(billsList)

        // Set available years
        const yearsList = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a)) // Descending
        setYears(yearsList)
        if (yearsList.length > 0) {
          setSelectedYear(yearsList[0])
        }

        // Calculate total unpaid amount - sum of all remaining balances
        const totalUnpaid = billsList.reduce((sum, bill) => sum + bill.remainingBalance, 0)
        setTotalUnpaid(totalUnpaid)

        // Calculate total paid amount
        const totalPaid = billsList.reduce((sum, bill) => {
          if (bill.status === "Paid") {
            return sum + bill.totalFee
          } else if (bill.status === "Partially Paid" && bill.paidAmount) {
            return sum + bill.paidAmount
          }
          return sum
        }, 0)

        setTotalPaid(totalPaid)

        // Load student results if available
        if (student && student.subjects && student.subjects.length > 0) {
          // Results are already loaded from student data
        } else {
          // Try to fetch real results from Firestore
          try {
            const resultsQuery = query(
              collection(db, "student_results"),
              where("studentId", "==", studentId),
              where("isActive", "==", true),
            )

            const resultsSnapshot = await getDocs(resultsQuery)

            if (!resultsSnapshot.empty) {
              const resultDoc = resultsSnapshot.docs[0]
              const resultData = resultDoc.data()

              if (resultData.subjects && resultData.subjects.length > 0 && student) {
                student.subjects = resultData.subjects
                student.totalMarks = resultData.totalMarks || 0
                student.percentage = resultData.percentage || 0
                student.rank = resultData.rank || 0
              }
            }
          } catch (error) {
            console.error("Error fetching student results:", error)
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching bills:", error)
    } finally {
      setBillsLoading(false)
    }
  }

  const getMonthName = (month: number): string => {
    const nepaliMonths = [
      "Baishakh",
      "Jestha",
      "Ashadh",
      "Shrawan",
      "Bhadra",
      "Ashwin",
      "Kartik",
      "Mangsir",
      "Poush",
      "Magh",
      "Falgun",
      "Chaitra",
    ]
    return nepaliMonths[month - 1] || `Month ${month}`
  }

  const calculateAttendanceStats = (records: Attendance[]) => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
    }

    records.forEach((record) => {
      if (record.status === "present") stats.present++
      else if (record.status === "absent") stats.absent++
      else if (record.status === "late") stats.late++
    })

    setAttendanceStats(stats)
  }

  const getFilteredAttendanceRecords = () => {
    if (!selectedMonth) return attendanceRecords
    const monthNumber = Number.parseInt(selectedMonth, 10)
    return attendanceRecords.filter((record) => record.bsMonth === monthNumber)
  }

  const getFilteredBills = () => {
    if (!selectedYear) return bills
    return bills.filter((bill) => bill.year === selectedYear)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-500">Present</Badge>
      case "absent":
        return <Badge className="bg-red-500">Absent</Badge>
      case "late":
        return <Badge className="bg-yellow-500">Late</Badge>
      default:
        return <Badge className="bg-gray-500">{status}</Badge>
    }
  }

  const getBillStatusBadge = (status: "Paid" | "Unpaid" | "Partially Paid") => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-green-500">Paid</Badge>
      case "Unpaid":
        return <Badge className="bg-red-500">Unpaid</Badge>
      case "Partially Paid":
        return <Badge className="bg-yellow-500">Partially Paid</Badge>
    }
  }

  // Add this function after the getCircleColor function
  const getMonthlyFeeForGrade = (grade: string): number => {
    switch (grade) {
      case "P.G":
      case "Nursery":
        return 1200
      case "LKG":
        return 1300
      case "UKG":
        return 1400
      default:
        const classNumber = Number.parseInt(grade)
        if (!isNaN(classNumber) && classNumber >= 1 && classNumber <= 6) {
          return 1500 + (classNumber - 1) * 100
        }
        return 0
    }
  }

  // 2. Add a constant for transportation fee
  const TRANSPORTATION_FEE = 500

  // Format date string
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (error) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error || "Student data not available"}</p>
            <Button className="mt-4" onClick={() => router.push("/teacher/dashboard")}>
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
        <h1 className="text-2xl font-bold">Student Result</h1>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Information</CardTitle>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/edit-student?id=${student.id}`)}>
              Edit Student
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-shrink-0">
                {student.profilePictureUrl ? (
                  <img
                    src={student.profilePictureUrl || "/placeholder.svg"}
                    alt={student.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                    {student.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{student.name}</h2>
                <p className="text-muted-foreground">
                  Grade: {student.grade} | Roll No: {student.rollNumber}
                </p>
                {student.symbolNumber && <p className="text-muted-foreground">Symbol No: {student.symbolNumber}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <p>
                <span className="font-medium">Father's Name:</span> {student.fatherName}
              </p>
              <p>
                <span className="font-medium">Mother's Name:</span> {student.motherName}
              </p>
              <p>
                <span className="font-medium">Contact:</span> {student.contactNumber}
              </p>
              <p>
                <span className="font-medium">Address:</span> {student.address}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="results">
        <TabsList className="mb-4">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Academic Results</CardTitle>
            </CardHeader>
            <CardContent>
              {student.subjects && student.subjects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Subject</th>
                        <th className="text-left p-2">Full Marks</th>
                        <th className="text-left p-2">Pass Marks</th>
                        <th className="text-left p-2">Obtained Marks</th>
                        <th className="text-left p-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.subjects.map((subject, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{subject.name}</td>
                          <td className="p-2">{subject.fullMarks}</td>
                          <td className="p-2">{subject.passMarks}</td>
                          <td className="p-2">{subject.obtainedMarks}</td>
                          <td className="p-2">{subject.grade || "-"}</td>
                        </tr>
                      ))}
                      <tr className="font-medium">
                        <td className="p-2">Total</td>
                        <td className="p-2">
                          {student.subjects.reduce((sum, subject) => sum + (subject.fullMarks || 0), 0)}
                        </td>
                        <td className="p-2"></td>
                        <td className="p-2">{student.totalMarks}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-4">
                    <p>
                      <span className="font-medium">Percentage:</span> {student.percentage.toFixed(2)}%
                    </p>
                    <p>
                      <span className="font-medium">Rank:</span> {student.rank || "N/A"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center py-4">No results available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6 items-center mb-6">
                <div className="relative w-32 h-32">
                  <div className="w-full h-full rounded-full border-8 border-gray-200 flex items-center justify-center">
                    <div className="absolute inset-0">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />

                        {/* Calculate total and percentages */}
                        {(() => {
                          const total = attendanceStats.present + attendanceStats.absent + attendanceStats.late || 1
                          const presentPercent = attendanceStats.present / total
                          const absentPercent = attendanceStats.absent / total
                          const latePercent = attendanceStats.late / total

                          // Calculate stroke dasharray and dashoffset
                          const circumference = 2 * Math.PI * 40 // 2π

                          return (
                            <>
                              {/* Present days (green) */}
                              {attendanceStats.present > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke="#22c55e" // green-500
                                  strokeWidth="12"
                                  strokeDasharray={`${circumference * presentPercent} ${circumference * (1 - presentPercent)}`}
                                  strokeDashoffset="0"
                                  transform="rotate(-90 50 50)"
                                />
                              )}

                              {/* Absent days (red) */}
                              {attendanceStats.absent > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke="#ef4444" // red-500
                                  strokeWidth="12"
                                  strokeDasharray={`${circumference * absentPercent} ${circumference * (1 - absentPercent)}`}
                                  strokeDashoffset={`${-1 * circumference * presentPercent}`}
                                  transform="rotate(-90 50 50)"
                                />
                              )}

                              {/* Late days (yellow) */}
                              {attendanceStats.late > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke="#eab308" // yellow-500
                                  strokeWidth="12"
                                  strokeDasharray={`${circumference * latePercent} ${circumference * (1 - latePercent)}`}
                                  strokeDashoffset={`${-1 * circumference * (presentPercent + absentPercent)}`}
                                  transform="rotate(-90 50 50)"
                                />
                              )}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                    <div className="text-center z-10">
                      <p className="text-3xl font-bold">
                        {attendanceStats.present + attendanceStats.absent + attendanceStats.late > 0
                          ? Math.round(
                              (attendanceStats.present /
                                (attendanceStats.present + attendanceStats.absent + attendanceStats.late)) *
                                100,
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {attendanceStats.present > 0 && (
                    <p className="flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      <span className="font-medium">Present Days:</span> {attendanceStats.present}
                    </p>
                  )}
                  {attendanceStats.absent > 0 && (
                    <p className="flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                      <span className="font-medium">Absent Days:</span> {attendanceStats.absent}
                    </p>
                  )}
                  {attendanceStats.late > 0 && (
                    <p className="flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                      <span className="font-medium">Late Days:</span> {attendanceStats.late}
                    </p>
                  )}
                  <p className="flex items-center">
                    <span className="font-medium">Total Classes:</span>{" "}
                    {attendanceStats.present + attendanceStats.absent + attendanceStats.late}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">Attendance Details</h3>
                  {months.length > 0 && (
                    <div className="w-48">
                      <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {attendanceLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : getFilteredAttendanceRecords().length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Subject</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Teacher</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredAttendanceRecords().map((record, index) => (
                          <tr key={record.id || index} className="border-b">
                            <td className="p-2">{record.bsDate}</td>
                            <td className="p-2">{record.subject}</td>
                            <td className="p-2">{getStatusBadge(record.status)}</td>
                            <td className="p-2">{record.teacherName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">No attendance records found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle>Fee Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Fee Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-md border border-green-200">
                    <p className="font-medium text-green-700">Monthly Fee</p>
                    <p className="text-2xl text-green-700">Rs. {getMonthlyFeeForGrade(student.grade)}</p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <p className="font-medium text-blue-700">Total Paid</p>
                    <p className="text-2xl text-blue-700">Rs. {totalPaid}</p>
                  </div>

                  <div
                    className={`p-4 rounded-md border ${totalUnpaid > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}
                  >
                    <p className={`font-medium ${totalUnpaid > 0 ? "text-red-700" : "text-gray-700"}`}>
                      {totalUnpaid > 0 ? "Outstanding Dues" : "No Outstanding Dues"}
                    </p>
                    {totalUnpaid > 0 && <p className="text-2xl text-red-700">Rs. {totalUnpaid}</p>}
                  </div>
                </div>

                {/* Bill Details */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Bill Details</h3>
                    {years.length > 0 && (
                      <div className="w-48">
                        <Select value={selectedYear} onValueChange={(value) => setSelectedYear(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year} BS
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {billsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : getFilteredBills().length > 0 ? (
                    <div className="space-y-4">
                      {getFilteredBills().map((bill) => (
                        <Card key={bill.id} className="overflow-hidden">
                          <div
                            className={`px-4 py-2 ${
                              bill.status === "Paid"
                                ? "bg-green-100"
                                : bill.status === "Partially Paid"
                                  ? "bg-yellow-100"
                                  : "bg-red-100"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Receipt className="h-4 w-4 mr-2" />
                                <h4 className="font-medium">
                                  {bill.term} ({bill.year} BS)
                                </h4>
                              </div>
                              <div>{getBillStatusBadge(bill.status)}</div>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Total Fee:</span>
                                <span>Rs. {bill.totalFee}</span>
                              </div>

                              {bill.status !== "Unpaid" && (
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Paid Amount:</span>
                                  <span>Rs. {bill.paidAmount}</span>
                                </div>
                              )}

                              {bill.status !== "Paid" && (
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Remaining Balance:</span>
                                  <span className="text-red-600 font-medium">Rs. {bill.remainingBalance}</span>
                                </div>
                              )}

                              {bill.paidDate && (
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Payment Date:</span>
                                  <span>{formatDate(bill.paidDate)}</span>
                                </div>
                              )}

                              <div className="pt-2">
                                <p className="font-medium mb-2">Fee Breakdown:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {Object.entries(bill.particulars).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between">
                                      <span>{name}:</span>
                                      <span>Rs. {amount}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {bill.status === "Partially Paid" && (
                                <div className="pt-2">
                                  <p className="text-sm mb-1">Payment Progress</p>
                                  <div className="flex items-center gap-2">
                                    <Progress value={((bill.paidAmount || 0) / bill.totalFee) * 100} className="h-2" />
                                    <span className="text-sm">
                                      {Math.round(((bill.paidAmount || 0) / bill.totalFee) * 100)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                      <p className="text-yellow-800">No bills found for the selected year.</p>
                    </div>
                  )}
                </div>

                {student.usesBus && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                      <p className="font-medium text-purple-700">Transportation Fee</p>
                      <p className="text-2xl text-purple-700">Rs. {TRANSPORTATION_FEE}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
