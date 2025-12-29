"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  BookOpen,
  Users,
  UserCheck,
  UserX,
  Loader2,
  ArrowLeft,
} from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function TeacherManagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUserId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")

  useEffect(() => {
    if (!currentUserId) {
      router.push("/teacher/dashboard")
      return
    }
    checkPermissionAndLoadData()
  }, [currentUserId, router])

  useEffect(() => {
    // Filter teachers based on search term
    if (searchTerm.trim() === "") {
      setFilteredTeachers(teachers)
    } else {
      const filtered = teachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.phone.includes(searchTerm) ||
          teacher.qualification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.assignedClass?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredTeachers(filtered)
    }
  }, [searchTerm, teachers])

  const checkPermissionAndLoadData = async () => {
    setPermissionChecking(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
        // Set up demo data
        const demoCurrentTeacher: Teacher = {
          id: currentUserId,
          name: "DEMO ADMIN",
          email: "admin@sajhaschool.edu",
          phone: "9876543210",
          qualification: "M.Ed",
          profileImageUrl: "",
          roles: ["principal", "computer_teacher"],
          assignedClass: "",
          active: true,
        }
        setCurrentTeacher(demoCurrentTeacher)
        setIsAdmin(true)
        setHasPermission(true)
        loadDemoTeachers()
      } else {
        // Load real data from Firebase
        const currentTeacherDoc = await getDoc(doc(db, "teachers", currentUserId))
        if (!currentTeacherDoc.exists()) {
          setHasPermission(false)
          setPermissionMessage("Current teacher not found")
          setPermissionChecking(false)
          return
        }

        const currentTeacherData = currentTeacherDoc.data() as Teacher
        currentTeacherData.id = currentTeacherDoc.id
        setCurrentTeacher(currentTeacherData)

        // Check if current teacher is admin
        const isAdminUser =
          currentTeacherData.roles?.includes("principal") || currentTeacherData.roles?.includes("computer_teacher")
        setIsAdmin(isAdminUser)
        setHasPermission(true)

        await loadTeachers()
      }
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
      setLoading(false)
    }
  }

  const loadDemoTeachers = () => {
    const demoTeachers: Teacher[] = [
      {
        id: "demo1",
        name: "JOHN SMITH",
        email: "john.smith@sajhaschool.edu",
        phone: "9876543211",
        qualification: "M.Ed",
        profileImageUrl: "",
        roles: ["principal"],
        assignedClass: "",
        active: true,
      },
      {
        id: "demo2",
        name: "JANE DOE",
        email: "jane.doe@sajhaschool.edu",
        phone: "9876543212",
        qualification: "B.Ed",
        profileImageUrl: "",
        roles: ["class_teacher", "subject_teacher"],
        assignedClass: "5",
        assignedSection: "A",
        active: true,
      },
      {
        id: "demo3",
        name: "MIKE JOHNSON",
        email: "mike.johnson@sajhaschool.edu",
        phone: "9876543213",
        qualification: "M.Sc",
        profileImageUrl: "",
        roles: ["computer_teacher", "subject_teacher"],
        assignedClass: "",
        active: true,
      },
      {
        id: "demo4",
        name: "SARAH WILSON",
        email: "sarah.wilson@sajhaschool.edu",
        phone: "9876543214",
        qualification: "B.Ed",
        profileImageUrl: "",
        roles: ["subject_teacher"],
        assignedClass: "",
        active: false,
      },
      {
        id: "demo5",
        name: "DAVID BROWN",
        email: "david.brown@sajhaschool.edu",
        phone: "9876543215",
        qualification: "M.A",
        profileImageUrl: "",
        roles: ["class_teacher", "subject_teacher"],
        assignedClass: "8",
        assignedSection: "B",
        active: true,
      },
    ]
    setTeachers(demoTeachers)
    setFilteredTeachers(demoTeachers)
  }

  const loadTeachers = async () => {
    try {
      const teachersSnapshot = await getDocs(collection(db, "teachers"))
      const teachersList: Teacher[] = []

      teachersSnapshot.forEach((doc) => {
        const teacherData = doc.data() as Teacher
        teacherData.id = doc.id
        teachersList.push(teacherData)
      })

      // Sort teachers by name
      teachersList.sort((a, b) => a.name.localeCompare(b.name))

      setTeachers(teachersList)
      setFilteredTeachers(teachersList)
    } catch (error: any) {
      console.error("Error loading teachers:", error)
    }
  }

  const getRoleBadgeColor = (roles: string[] = []) => {
    if (roles.includes("principal")) return "bg-purple-100 text-purple-800"
    if (roles.includes("computer_teacher")) return "bg-blue-100 text-blue-800"
    if (roles.includes("class_teacher")) return "bg-green-100 text-green-800"
    return "bg-gray-100 text-gray-800"
  }

  const getStats = () => {
    const total = teachers.length
    const active = teachers.filter((t) => t.active !== false).length
    const inactive = total - active
    const principals = teachers.filter((t) => t.roles?.includes("principal")).length
    const classTeachers = teachers.filter((t) => t.roles?.includes("class_teacher")).length

    return { total, active, inactive, principals, classTeachers }
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
          <CardHeader>
            <CardTitle>Permission Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{permissionMessage}</p>
            <Button className="mt-4 w-full" onClick={() => router.push(`/teacher/dashboard?id=${currentUserId}`)}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = getStats()

  return (
    <div className="container py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Teacher Management</h1>
          <p className="text-muted-foreground">Manage all teachers in the system</p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push(`/teacher/add-teacher?id=${currentUserId}`)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Teachers</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">P</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Principals</p>
                <p className="text-2xl font-bold">{stats.principals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">C</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Class Teachers</p>
                <p className="text-2xl font-bold">{stats.classTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search teachers by name, email, phone, qualification, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teachers List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredTeachers.length > 0 ? (
        <div className="grid gap-4">
          {filteredTeachers.map((teacher) => (
            <Card key={teacher.id} className={`${!teacher.active ? "opacity-60" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={teacher.profileImageUrl || "/placeholder.svg"} alt={teacher.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {teacher.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{teacher.name}</h3>
                        {!teacher.active && (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            Inactive
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Email:</span> {teacher.email}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span> {teacher.phone}
                        </div>
                        <div>
                          <span className="font-medium">Qualification:</span> {teacher.qualification}
                        </div>
                        {teacher.assignedClass && (
                          <div>
                            <span className="font-medium">Class:</span> {teacher.assignedClass}
                            {teacher.assignedSection && ` - ${teacher.assignedSection}`}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {teacher.roles?.map((role) => (
                          <Badge key={role} variant="secondary" className={getRoleBadgeColor(teacher.roles)}>
                            {role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Quick Actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/teacher/view-teacher?id=${teacher.id}&currentId=${currentUserId}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>

                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/teacher/edit-teacher?id=${teacher.id}&currentId=${currentUserId}`)
                          }
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/teacher/teacher-assignment?teacherId=${teacher.id}&id=${currentUserId}`)
                          }
                        >
                          <BookOpen className="h-4 w-4 mr-1" />
                          Assignments
                        </Button>
                      </>
                    )}

                    {/* More Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/teacher/view-teacher?id=${teacher.id}&currentId=${currentUserId}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/teacher/edit-teacher?id=${teacher.id}&currentId=${currentUserId}`)
                              }
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Teacher
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/teacher/teacher-assignment?teacherId=${teacher.id}&id=${currentUserId}`)
                              }
                            >
                              <BookOpen className="h-4 w-4 mr-2" />
                              Manage Assignments
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Teachers Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "No teachers match your search criteria." : "No teachers have been added yet."}
            </p>
            {isAdmin && !searchTerm && (
              <Button onClick={() => router.push(`/teacher/add-teacher?id=${currentUserId}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Teacher
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
