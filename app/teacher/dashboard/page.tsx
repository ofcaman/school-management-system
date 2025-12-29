"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { initializeApp } from "firebase/app"
import { getAuth, signOut } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import {
  Loader2,
  LogOut,
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  Bell,
  BookOpen,
  FileText,
  Settings,
  Plus,
  Eye,
  Phone,
  Mail,
  AlertCircle,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Star,
  Bus,
  CreditCard,
  UserCheck,
  RefreshCw,
  Clock,
} from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  attendanceRate: number
  feeCollection: number
  pendingFees: number
  busUsers: number
  activeNotices: number
  presentToday: number
  activeTeachers: number
}

interface RecentActivity {
  id: string
  type: "student" | "teacher" | "fee" | "notice" | "attendance"
  title: string
  description: string
  timestamp: Date
  status: "success" | "warning" | "info"
}

interface ClassDistribution {
  grade: string
  count: number
  sections: string[]
}

interface Notice {
  id?: string
  title: string
  description: string
  timestamp: Date
  teacherId: string
  teacherName: string
  imageUrl?: string
  nepaliDate?: string
  bsYear?: number
  bsMonth?: number
  bsDay?: number
}

export default function TeacherDashboardPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    attendanceRate: 0,
    feeCollection: 0,
    pendingFees: 0,
    busUsers: 0,
    activeNotices: 0,
    presentToday: 0,
    activeTeachers: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [classDistribution, setClassDistribution] = useState<ClassDistribution[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!teacherId) {
        router.push("/teacher/login")
        return
      }

      try {
        const isDemoMode = localStorage.getItem("isDemoMode") === "true"

        if (isDemoMode) {
          setTeacher({
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
          setIsAdmin(true)
          loadDemoData()
        } else {
          const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

          if (teacherDoc.exists()) {
            const teacherData = teacherDoc.data() as Teacher
            teacherData.id = teacherDoc.id
            setTeacher(teacherData)

            const isAdminUser =
              teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")
            setIsAdmin(isAdminUser)

            // Load real data from database
            await loadRealData(teacherData, isAdminUser)
          } else {
            setError("Teacher not found")
            setTimeout(() => router.push("/teacher/login"), 2000)
          }
        }
      } catch (error: any) {
        setError(`Error fetching teacher data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchTeacherData()
  }, [teacherId, router])

  const loadRealData = async (teacherData: Teacher, isAdminUser: boolean) => {
    setDataLoading(true)
    try {
      // Load students data
      const studentsData = await loadStudentsFromDB()
      setStudents(studentsData)

      // Load teachers data if admin
      let teachersData: Teacher[] = []
      if (isAdminUser) {
        teachersData = await loadTeachersFromDB()
        setTeachers(teachersData)
      }

      // Load notices data
      const noticesData = await loadNoticesFromDB()
      setNotices(noticesData)

      // Calculate and set statistics
      const calculatedStats = await calculateDashboardStats(studentsData, teachersData, noticesData)
      setStats(calculatedStats)

      // Load class distribution
      const distribution = calculateClassDistribution(studentsData)
      setClassDistribution(distribution)

      // Load recent activities
      const activities = await loadRecentActivities(noticesData)
      setRecentActivities(activities)
    } catch (error: any) {
      console.error("Error loading real data:", error)
      setError(`Error loading data: ${error.message}`)
    } finally {
      setDataLoading(false)
    }
  }

  const loadStudentsFromDB = async (): Promise<Student[]> => {
    try {
      const studentsSnapshot = await getDocs(collection(db, "students"))
      const studentsData: Student[] = []

      studentsSnapshot.forEach((doc) => {
        const studentData = doc.data() as Student
        studentData.id = doc.id
        studentsData.push(studentData)
      })

      console.log(`Loaded ${studentsData.length} students from database`)
      return studentsData
    } catch (error) {
      console.error("Error loading students:", error)
      return []
    }
  }

  const loadTeachersFromDB = async (): Promise<Teacher[]> => {
    try {
      const teachersSnapshot = await getDocs(collection(db, "teachers"))
      const teachersData: Teacher[] = []

      teachersSnapshot.forEach((doc) => {
        const teacherData = doc.data() as Teacher
        teacherData.id = doc.id
        teachersData.push(teacherData)
      })

      console.log(`Loaded ${teachersData.length} teachers from database`)
      return teachersData
    } catch (error) {
      console.error("Error loading teachers:", error)
      return []
    }
  }

  const loadNoticesFromDB = async (): Promise<Notice[]> => {
    try {
      const noticesQuery = query(collection(db, "notices"), orderBy("timestamp", "desc"), limit(10))
      const noticesSnapshot = await getDocs(noticesQuery)
      const noticesData: Notice[] = []

      noticesSnapshot.forEach((doc) => {
        const notice = doc.data() as Notice
        notice.id = doc.id

        // Convert Firestore timestamp to Date
        if (notice.timestamp) {
          notice.timestamp = doc.data().timestamp.toDate()
        }

        noticesData.push(notice)
      })

      console.log(`Loaded ${noticesData.length} notices from database`)
      return noticesData
    } catch (error) {
      console.error("Error loading notices:", error)
      return []
    }
  }

  const loadAttendanceData = async (): Promise<{
    attendanceRate: number
    presentToday: number
    totalAttendanceRecords: number
  }> => {
    try {
      // Get today's date in both formats
      const today = new Date()
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

      // Load all attendance records
      const attendanceSnapshot = await getDocs(collection(db, "attendance"))
      const attendanceRecords: any[] = []

      attendanceSnapshot.forEach((doc) => {
        const data = doc.data()
        attendanceRecords.push({
          id: doc.id,
          ...data,
        })
      })

      console.log(`Loaded ${attendanceRecords.length} attendance records from database`)

      // Calculate today's attendance
      const todayAttendance = attendanceRecords.filter(
        (record) => record.date === todayString || record.bsDate === todayString,
      )

      const presentToday = todayAttendance.filter(
        (record) => record.status === "present" || record.status === "late",
      ).length

      // Calculate overall attendance rate
      let attendanceRate = 85 // Default fallback

      if (attendanceRecords.length > 0) {
        const presentRecords = attendanceRecords.filter(
          (record) => record.status === "present" || record.status === "late",
        ).length

        attendanceRate = Math.round((presentRecords / attendanceRecords.length) * 100)
      }

      return {
        attendanceRate,
        presentToday,
        totalAttendanceRecords: attendanceRecords.length,
      }
    } catch (error) {
      console.error("Error loading attendance data:", error)
      return {
        attendanceRate: 0,
        presentToday: 0,
        totalAttendanceRecords: 0,
      }
    }
  }

  const loadClassesData = async (): Promise<number> => {
    try {
      const classesSnapshot = await getDocs(collection(db, "classes"))
      const classesFromStudents = new Set<string>()

      // Also get unique classes from students
      const studentsSnapshot = await getDocs(collection(db, "students"))
      studentsSnapshot.forEach((doc) => {
        const student = doc.data()
        if (student.grade) {
          classesFromStudents.add(student.grade)
        }
      })

      // Use the larger count between classes collection and unique grades from students
      const classesCount = Math.max(classesSnapshot.size, classesFromStudents.size)

      console.log(`Found ${classesCount} classes`)
      return classesCount
    } catch (error) {
      console.error("Error loading classes data:", error)
      return 0
    }
  }

  const calculateDashboardStats = async (
    studentsData: Student[],
    teachersData: Teacher[],
    noticesData: Notice[],
  ): Promise<DashboardStats> => {
    try {
      // Calculate basic counts
      const totalStudents = studentsData.length
      const totalTeachers = teachersData.length
      const activeTeachers = teachersData.filter((t) => t.active !== false).length

      // Calculate bus users
      const busUsers = studentsData.filter((student) => student.usesBus).length

      // Calculate pending fees
      const pendingFees = studentsData.reduce((sum, student) => sum + (student.dues || 0), 0)

      // Calculate total fee collection (monthly fees * students - pending fees)
      const totalMonthlyFees = studentsData.reduce((sum, student) => sum + (student.monthlyFee || 0), 0)
      const feeCollection = totalMonthlyFees - pendingFees

      // Load real attendance data
      const attendanceData = await loadAttendanceData()

      // Load real classes count
      const totalClasses = await loadClassesData()

      // Active notices count
      const activeNotices = noticesData.length

      console.log("Dashboard stats calculated:", {
        totalStudents,
        totalTeachers,
        activeTeachers,
        attendanceRate: attendanceData.attendanceRate,
        presentToday: attendanceData.presentToday,
        totalClasses,
        activeNotices,
        busUsers,
        feeCollection,
        pendingFees,
      })

      return {
        totalStudents,
        totalTeachers,
        totalClasses,
        attendanceRate: attendanceData.attendanceRate,
        feeCollection,
        pendingFees,
        busUsers,
        activeNotices,
        presentToday: attendanceData.presentToday,
        activeTeachers,
      }
    } catch (error) {
      console.error("Error calculating stats:", error)
      // Return default stats if calculation fails
      return {
        totalStudents: studentsData.length,
        totalTeachers: teachersData.length,
        totalClasses: 0,
        attendanceRate: 0,
        feeCollection: 0,
        pendingFees: 0,
        busUsers: 0,
        activeNotices: noticesData.length,
        presentToday: 0,
        activeTeachers: 0,
      }
    }
  }

  const calculateClassDistribution = (studentsData: Student[]): ClassDistribution[] => {
    const distribution: { [key: string]: { count: number; sections: Set<string> } } = {}

    studentsData.forEach((student) => {
      if (student.grade) {
        if (!distribution[student.grade]) {
          distribution[student.grade] = { count: 0, sections: new Set() }
        }
        distribution[student.grade].count++
        if (student.section) {
          distribution[student.grade].sections.add(student.section)
        }
      }
    })

    return Object.entries(distribution)
      .map(([grade, data]) => ({
        grade,
        count: data.count,
        sections: Array.from(data.sections).sort(),
      }))
      .sort((a, b) => {
        // Custom sorting for grades
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
        return gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade)
      })
  }

  const loadRecentActivities = async (noticesData: Notice[]): Promise<RecentActivity[]> => {
    try {
      const activities: RecentActivity[] = []

      // Add recent notices as activities
      noticesData.slice(0, 2).forEach((notice) => {
        activities.push({
          id: `notice-${notice.id}`,
          type: "notice",
          title: "New Notice Published",
          description: notice.title,
          timestamp: notice.timestamp,
          status: "info",
        })
      })

      // Load recent attendance records (last 24 hours)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`

      const today = new Date()
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

      try {
        const attendanceSnapshot = await getDocs(collection(db, "attendance"))
        const recentAttendance = []

        attendanceSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.date === todayString || data.date === yesterdayString) {
            recentAttendance.push(data)
          }
        })

        if (recentAttendance.length > 0) {
          const presentCount = recentAttendance.filter((a) => a.status === "present").length
          const absentCount = recentAttendance.filter((a) => a.status === "absent").length

          activities.push({
            id: "attendance-today",
            type: "attendance",
            title: "Today's Attendance",
            description: `${presentCount} present, ${absentCount} absent`,
            timestamp: new Date(),
            status: "success",
          })
        }
      } catch (error) {
        console.error("Error loading recent attendance:", error)
      }

      // Add system status activity
      activities.push({
        id: "system-status",
        type: "student",
        title: "Students Data Loaded",
        description: `${stats.totalStudents} students loaded from database`,
        timestamp: new Date(),
        status: "success",
      })

      // Add fee alert if there are pending fees
      if (stats.pendingFees > 0) {
        activities.push({
          id: "fee-alert",
          type: "fee",
          title: "Pending Fees Alert",
          description: `₹${stats.pendingFees.toLocaleString()} in pending fees`,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: "warning",
        })
      }

      return activities.slice(0, 5) // Return only the 5 most recent activities
    } catch (error) {
      console.error("Error loading activities:", error)
      return []
    }
  }

  const formatNoticeDate = (notice: Notice) => {
    // If we have Nepali date information
    if (notice.nepaliDate) {
      return notice.nepaliDate
    }

    // Fallback to AD date
    const date = notice.timestamp instanceof Date ? notice.timestamp : new Date(notice.timestamp)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return formatNoticeDate({ timestamp: date } as Notice)
  }

  const loadDemoData = () => {
    // Keep existing demo data logic for demo mode
    const demoStudents: Student[] = Array.from({ length: 245 }, (_, i) => ({
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
      grade: ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"][i % 14],
      section: ["A", "B", "C", "D"][i % 4],
      symbolNumber: `${1000 + i}`,
      address: "Kathmandu",
      usesBus: i % 3 === 0,
      busRoute: i % 3 === 0 ? `Route ${(i % 5) + 1}` : "",
      resultPdfUrl: "",
      subjects: [],
      totalMarks: 0,
      percentage: Math.floor(Math.random() * 40) + 60,
      rank: 0,
      attendance: Math.floor(Math.random() * 30) + 70,
      totalClasses: 200,
      monthlyFee: 1500,
      dues: i % 8 === 0 ? Math.floor(Math.random() * 3000) + 500 : 0,
      currentSubject: null,
      attendanceStatus: "",
      attendanceId: "",
      isSelected: false,
      qrCode: null,
      profilePictureUrl: "",
      transportationFee: i % 3 === 0 ? 500 : 0,
      janmaDartaUrl: "",
      janmaDartaNumber: "",
      janmaDartaSection: "",
    }))

    setStudents(demoStudents)

    const demoTeachers: Teacher[] = Array.from({ length: 25 }, (_, i) => ({
      id: `teacher${i + 1}`,
      name: `Teacher ${i + 1}`,
      email: `teacher${i + 1}@sajhaschool.edu`,
      phone: `987654321${i}`,
      qualification: ["B.Ed", "M.Ed", "M.Sc", "B.Sc", "MA"][i % 5],
      profileImageUrl: "",
      roles: i === 0 ? ["principal"] : i < 3 ? ["computer_teacher"] : i < 15 ? ["class_teacher"] : ["subject_teacher"],
      assignedClass: i < 15 ? `${(i % 10) + 1}` : "",
      active: true,
    }))

    setTeachers(demoTeachers)

    // Demo notices
    const demoNotices: Notice[] = [
      {
        id: "notice1",
        title: "School Closed for Dashain Festival",
        description: "School will remain closed from Ashwin 25 to Kartik 8 for Dashain festival.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
        nepaliDate: "2081 आश्विन 15",
      },
      {
        id: "notice2",
        title: "Annual Sports Meet",
        description: "The annual sports meet will be held on Kartik 15.",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
        nepaliDate: "2081 कार्तिक 30",
      },
      {
        id: "notice3",
        title: "Parent-Teacher Meeting",
        description: "A parent-teacher meeting will be held on Mangsir 10.",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        teacherId: "teacher1",
        teacherName: "JOHN DOE",
        nepaliDate: "2081 मंसिर 15",
      },
    ]

    setNotices(demoNotices)

    const totalDues = demoStudents.reduce((sum, student) => sum + (student.dues || 0), 0)
    const busUsers = demoStudents.filter((student) => student.usesBus).length
    const avgAttendance =
      demoStudents.reduce((sum, student) => sum + (student.attendance || 0), 0) / demoStudents.length

    setStats({
      totalStudents: demoStudents.length,
      totalTeachers: demoTeachers.length,
      totalClasses: 14,
      attendanceRate: Math.round(avgAttendance),
      feeCollection: 2450000,
      pendingFees: totalDues,
      busUsers: busUsers,
      activeNotices: demoNotices.length,
      presentToday: Math.round(demoStudents.length * 0.87),
      activeTeachers: demoTeachers.length,
    })

    setRecentActivities([
      {
        id: "1",
        type: "notice",
        title: "New Notice Published",
        description: "School Closed for Dashain Festival",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: "info",
      },
      {
        id: "2",
        type: "fee",
        title: "Fee Payment Received",
        description: "₹15,000 collected from Class 3B",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: "success",
      },
      {
        id: "3",
        type: "attendance",
        title: "Attendance Updated",
        description: "Daily attendance marked for all classes",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        status: "success",
      },
    ])
  }

  const refreshData = async () => {
    if (teacher && !localStorage.getItem("isDemoMode")) {
      const isAdminUser = teacher.roles?.includes("principal") || teacher.roles?.includes("computer_teacher")
      await loadRealData(teacher, isAdminUser)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      localStorage.removeItem("teacherId")
      localStorage.removeItem("isDemoMode")
      localStorage.removeItem("demoTeacherId")
      router.push("/teacher/login")
    } catch (error: any) {
      setError(`Logout error: ${error.message}`)
    }
  }

  const getRoleText = (roles: string[] = []) => {
    if (roles.includes("principal")) return "Principal"
    if (roles.includes("computer_teacher")) return "Computer Teacher"
    if (roles.includes("class_teacher")) return `Class Teacher`
    if (roles.includes("subject_teacher")) return "Subject Teacher"
    return "Teacher"
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "student":
        return <Users className="h-4 w-4" />
      case "teacher":
        return <GraduationCap className="h-4 w-4" />
      case "fee":
        return <DollarSign className="h-4 w-4" />
      case "notice":
        return <Bell className="h-4 w-4" />
      case "attendance":
        return <UserCheck className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-50"
      case "warning":
        return "text-yellow-600 bg-yellow-50"
      case "info":
        return "text-blue-600 bg-blue-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
            <Button className="mt-4" onClick={() => router.push("/teacher/login")}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container py-4 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/school_logo-CMGB0z4UaUmQ2amweOElwZq72VzLCw.png"
                alt="School Logo"
                className="h-12 w-auto mr-4"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sajha Boarding School</h1>
                <p className="text-gray-600">School Management System</p>
                {localStorage.getItem("isDemoMode") === "true" && (
                  <Badge variant="outline" className="mt-1">
                    Demo Mode
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {!localStorage.getItem("isDemoMode") && (
                <Button variant="outline" size="sm" onClick={refreshData} disabled={dataLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? "animate-spin" : ""}`} />
                  Refresh Data
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/notices?id=${teacherId}`)}>
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                <Badge variant="destructive" className="ml-2">
                  {stats.activeNotices}
                </Badge>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={teacher?.profileImageUrl || "/placeholder.svg"} />
              <AvatarFallback className="text-lg font-semibold">{teacher?.name?.charAt(0) || "T"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {teacher?.name?.split(" ")[0] || "Teacher"}!
              </h2>
              <p className="text-gray-600">{getRoleText(teacher?.roles)}</p>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {teacher?.email}
                </span>
                <span className="flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  {teacher?.phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {dataLoading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Loading real data from database...</span>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            {isAdmin && <TabsTrigger value="teachers">Teachers</TabsTrigger>}
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stats.presentToday} present today
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Teachers</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalTeachers}</p>
                      <p className="text-sm text-blue-600 flex items-center mt-1">
                        <Star className="h-3 w-3 mr-1" />
                        {stats.activeTeachers} active
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                      <GraduationCap className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.attendanceRate}%</p>
                      <div className="mt-2">
                        <Progress value={stats.attendanceRate} className="h-2" />
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full">
                      <UserCheck className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Fee Collection</p>
                      <p className="text-3xl font-bold text-gray-900">₹{(stats.feeCollection / 100000).toFixed(1)}L</p>
                      <p className="text-sm text-orange-600 flex items-center mt-1">
                        <DollarSign className="h-3 w-3 mr-1" />₹{(stats.pendingFees / 1000).toFixed(0)}K pending
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-full">
                      <CreditCard className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push(`/teacher/add-student?id=${teacherId}`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Student
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push(`/teacher/generate-bill?id=${teacherId}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Bills
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push(`/teacher/attendance?id=${teacherId}`)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push(`/teacher/fee-management?id=${teacherId}`)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Fees
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push(`/teacher/notices?id=${teacherId}`)}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    View Notices
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      Recent Activity
                    </span>
                    <Button variant="outline" size="sm" onClick={refreshData} disabled={dataLoading}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${dataLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{activity.title}</p>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No recent activities</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transportation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Bus className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium">Bus Users</span>
                    </div>
                    <span className="text-2xl font-bold">{stats.busUsers}</span>
                  </div>
                  <Progress
                    value={stats.totalStudents > 0 ? (stats.busUsers / stats.totalStudents) * 100 : 0}
                    className="h-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    {stats.totalStudents > 0 ? Math.round((stats.busUsers / stats.totalStudents) * 100) : 0}% of
                    students use school bus
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium">Active Classes</span>
                    </div>
                    <span className="text-2xl font-bold">{stats.totalClasses}</span>
                  </div>
                  <div className="space-y-2">
                    {classDistribution.slice(0, 3).map((cls) => (
                      <div key={cls.grade} className="flex justify-between text-sm">
                        <span>{cls.grade === "P.G" ? "P.G" : `Class ${cls.grade}`}</span>
                        <span>{cls.count} students</span>
                      </div>
                    ))}
                    {classDistribution.length > 3 && (
                      <div className="text-xs text-gray-500">+{classDistribution.length - 3} more classes</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">Announcements</span>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/teacher/notices?id=${teacherId}`)}>
                      <Eye className="h-3 w-3 mr-1" />
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notices.length > 0 ? (
                      notices.slice(0, 3).map((notice) => (
                        <div key={notice.id} className="flex items-start space-x-3">
                          <div className="p-1 bg-blue-50 rounded">
                            <Bell className="h-3 w-3 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{notice.title}</p>
                            <p className="text-xs text-gray-600 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {getTimeAgo(notice.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">No announcements</p>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => router.push(`/teacher/add-notice?id=${teacherId}`)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Notice
                          </Button>
                        )}
                      </div>
                    )}
                    {stats.pendingFees > 0 && (
                      <div className="flex items-start space-x-3">
                        <div className="p-1 bg-orange-50 rounded">
                          <AlertCircle className="h-3 w-3 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Fee Reminder</p>
                          <p className="text-xs text-gray-600">₹{stats.pendingFees.toLocaleString()} pending</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Students Management
                    </CardTitle>
                    <CardDescription>
                      Manage student records, attendance, and academic information
                      {!localStorage.getItem("isDemoMode") && (
                        <span className="block mt-1 text-green-600">✓ Real data loaded from database</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => router.push(`/teacher/students?id=${teacherId}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View All Students
                    </Button>
                    {isAdmin && (
                      <Button onClick={() => router.push(`/teacher/add-student?id=${teacherId}`)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Student
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Students</p>
                          <p className="text-2xl font-bold">{stats.totalStudents}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Present Today</p>
                          <p className="text-2xl font-bold">{stats.presentToday}</p>
                        </div>
                        <UserCheck className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Pending Fees</p>
                          <p className="text-2xl font-bold">₹{(stats.pendingFees / 1000).toFixed(0)}K</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Student Management</h3>
                  <p className="text-gray-600 mb-4">
                    Access comprehensive student management tools including profiles, attendance, and academic records.
                  </p>
                  <Button onClick={() => router.push(`/teacher/students?id=${teacherId}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View All Students
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="teachers">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div>
                      <CardTitle className="flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2" />
                        Teachers Management
                      </CardTitle>
                      <CardDescription>
                        Manage teacher profiles, assignments, and administrative tasks
                        {!localStorage.getItem("isDemoMode") && (
                          <span className="block mt-1 text-green-600">✓ Real data loaded from database</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={() => router.push(`/teacher/tmanage?id=${teacherId}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View All Teachers
                      </Button>
                      <Button onClick={() => router.push(`/teacher/add-teacher?id=${teacherId}`)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Teacher
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {teachers.filter((t) => t.roles?.includes("principal")).length}
                          </p>
                          <p className="text-sm text-gray-600">Principal</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {teachers.filter((t) => t.roles?.includes("computer_teacher")).length}
                          </p>
                          <p className="text-sm text-gray-600">Computer Teachers</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {teachers.filter((t) => t.roles?.includes("class_teacher")).length}
                          </p>
                          <p className="text-sm text-gray-600">Class Teachers</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {teachers.filter((t) => t.roles?.includes("subject_teacher")).length}
                          </p>
                          <p className="text-sm text-gray-600">Subject Teachers</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-center py-8">
                    <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Teacher Management</h3>
                    <p className="text-gray-600 mb-4">
                      Manage teacher profiles, class assignments, and administrative responsibilities.
                    </p>
                    <Button>
                      <Eye className="h-4 w-4 mr-2" />
                      View All Teachers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Student Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classDistribution.map((cls) => {
                      const percentage = stats.totalStudents > 0 ? (cls.count / stats.totalStudents) * 100 : 0
                      return (
                        <div key={cls.grade} className="flex items-center justify-between">
                          <span className="text-sm font-medium w-16">
                            {cls.grade === "P.G" ? "P.G" : `Class ${cls.grade}`}
                          </span>
                          <div className="flex-1 mx-4">
                            <Progress value={percentage} className="h-2" />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{cls.count}</span>
                        </div>
                      )
                    })}
                    {classDistribution.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No class distribution data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Attendance Rate</span>
                        <span className="text-sm text-gray-600">{stats.attendanceRate}%</span>
                      </div>
                      <Progress value={stats.attendanceRate} className="h-3" />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Fee Collection</span>
                        <span className="text-sm text-gray-600">
                          {stats.feeCollection > 0 && stats.pendingFees >= 0
                            ? Math.round((stats.feeCollection / (stats.feeCollection + stats.pendingFees)) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          stats.feeCollection > 0 && stats.pendingFees >= 0
                            ? (stats.feeCollection / (stats.feeCollection + stats.pendingFees)) * 100
                            : 0
                        }
                        className="h-3"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Bus Usage</span>
                        <span className="text-sm text-gray-600">
                          {stats.totalStudents > 0 ? Math.round((stats.busUsers / stats.totalStudents) * 100) : 0}%
                        </span>
                      </div>
                      <Progress
                        value={stats.totalStudents > 0 ? (stats.busUsers / stats.totalStudents) * 100 : 0}
                        className="h-3"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Teacher Activity</span>
                        <span className="text-sm text-gray-600">
                          {stats.totalTeachers > 0 ? Math.round((stats.activeTeachers / stats.totalTeachers) * 100) : 0}
                          %
                        </span>
                      </div>
                      <Progress
                        value={stats.totalTeachers > 0 ? (stats.activeTeachers / stats.totalTeachers) * 100 : 0}
                        className="h-3"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Key Performance Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {stats.totalStudents > 0 ? Math.round((stats.presentToday / stats.totalStudents) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-600">Daily Attendance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalClasses}</div>
                      <div className="text-sm text-gray-600">Active Classes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {stats.totalStudents > 0
                          ? Math.round(stats.totalStudents / Math.max(stats.totalClasses, 1))
                          : 0}
                      </div>
                      <div className="text-sm text-gray-600">Avg Class Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        ₹{(stats.feeCollection / 100000).toFixed(1)}L
                      </div>
                      <div className="text-sm text-gray-600">Fee Collection</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
