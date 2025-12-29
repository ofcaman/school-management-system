"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import { ArrowLeft, BookOpen, Loader2, UserCog } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function ViewTeacherPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")
  const currentUserId = searchParams.get("currentId")

  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/tmanage")
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        // Check if we're in demo mode
        const isDemoMode = localStorage.getItem("isDemoMode") === "true"

        if (isDemoMode) {
          // Load demo data
          const demoTeacher: Teacher = {
            id: teacherId,
            name: "DEMO TEACHER",
            email: "demo@sajhaschool.edu",
            phone: "9876543210",
            qualification: "M.Ed",
            profileImageUrl: "",
            roles: ["principal", "computer_teacher"],
            assignedClass: "10",
            active: true,
          }

          setTeacher(demoTeacher)
          setCurrentTeacher(demoTeacher)
          setIsAdmin(true)
        } else {
          // Load real data from Firebase
          const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

          if (teacherDoc.exists()) {
            const teacherData = teacherDoc.data() as Teacher
            teacherData.id = teacherDoc.id
            setTeacher(teacherData)
          } else {
            alert("Teacher not found")
            router.push("/teacher/tmanage")
          }

          // Check if current user is admin
          if (currentUserId) {
            const currentTeacherDoc = await getDoc(doc(db, "teachers", currentUserId))
            if (currentTeacherDoc.exists()) {
              const currentTeacherData = currentTeacherDoc.data() as Teacher
              currentTeacherData.id = currentTeacherDoc.id
              setCurrentTeacher(currentTeacherData)

              // Check if current teacher is admin (principal or computer_teacher)
              const isAdminUser =
                currentTeacherData.roles?.includes("principal") ||
                currentTeacherData.roles?.includes("computer_teacher")
              setIsAdmin(isAdminUser)
            }
          }
        }
      } catch (error: any) {
        console.error("Error fetching teacher data:", error)
        alert(`Error: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [teacherId, router, currentUserId])

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

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Teacher not found</p>
            <Button className="mt-4" onClick={() => router.push("/teacher/tmanage")}>
              Back to Teacher Management
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.push(`/teacher/tmanage?id=${currentUserId}`)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teacher Management
        </Button>
        <h1 className="text-2xl font-bold">Teacher Profile</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{teacher.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-600">
                {teacher.name.charAt(0)}
              </div>
            </div>

            <div className="flex-grow space-y-2">
              <p>
                <strong>Email:</strong> {teacher.email}
              </p>
              <p>
                <strong>Phone:</strong> {teacher.phone}
              </p>
              <p>
                <strong>Qualification:</strong> {teacher.qualification}
              </p>
              <p>
                <strong>Roles:</strong> {getRolesList(teacher.roles)}
              </p>
              {teacher.assignedClass && (
                <p>
                  <strong>Assigned Class:</strong> {teacher.assignedClass}
                  {teacher.assignedSection && ` - Section ${teacher.assignedSection}`}
                </p>
              )}
              <p>
                <strong>Status:</strong> {teacher.active ? "Active" : "Inactive"}
              </p>

              <div className="flex flex-wrap gap-2 pt-4">
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/teacher/tmanage/edit?id=${teacher.id}&currentId=${currentUserId}`)}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/teacher/tmanage/assignments?teacherId=${teacher.id}&id=${currentUserId}`)
                      }
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Manage Assignments
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
