"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { initializeApp } from "firebase/app"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import { Loader2 } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  // Use a client component wrapper for useSearchParams
  const SearchParamsWrapper = () => {
    const searchParams = useSearchParams()
    const teacherId = searchParams.get("id")

    // Skip sidebar on login page
    const isLoginPage = pathname === "/teacher/login"
    const isStudentPage = pathname.startsWith("/student")

    useEffect(() => {
      const checkAdminStatus = async () => {
        if (!teacherId || isLoginPage || isStudentPage) {
          setLoading(false)
          return
        }

        try {
          // Check if we're in demo mode
          const isDemoMode = localStorage.getItem("isDemoMode") === "true"

          if (isDemoMode) {
            setIsAdmin(true)
          } else {
            // Load real data from Firebase
            const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

            if (teacherDoc.exists()) {
              const teacherData = teacherDoc.data() as Teacher
              // Check if teacher is admin (principal or computer_teacher)
              const isAdminUser =
                teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")
              setIsAdmin(isAdminUser)
            }
          }
        } catch (error) {
          console.error("Error checking admin status:", error)
        } finally {
          setLoading(false)
        }
      }

      checkAdminStatus()
    }, [teacherId, isLoginPage, isStudentPage])

    // Don't show sidebar on login page or student pages
    if (isLoginPage || isStudentPage || !teacherId) {
      return <>{children}</>
    }

    return (
      <div className="flex h-screen overflow-hidden">
        {!loading && <Sidebar teacherId={teacherId} isAdmin={isAdmin} />}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SearchParamsWrapper />
    </Suspense>
  )
}
