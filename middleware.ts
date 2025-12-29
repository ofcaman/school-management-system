import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/firebase-config"

// This middleware protects all routes that should require a license
export async function middleware(request: NextRequest) {
  // Public routes that don't need license check
  const publicRoutes = ["/login", "/register", "/activate-license", "/access-denied"]
  if (publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if user is authenticated via cookie
  const authCookie = request.cookies.get("auth")
  if (!authCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    // Parse auth cookie to get user info
    const userData = JSON.parse(authCookie.value)
    const userId = userData.uid
    const schoolId = userData.schoolId
    const role = userData.role || "teacher"

    // If no school ID, redirect to login
    if (!schoolId) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Check if school has valid license
    const schoolRef = doc(db, "schools", schoolId)
    const schoolDoc = await getDoc(schoolRef)

    if (!schoolDoc.exists() || !schoolDoc.data().licenseKey || schoolDoc.data().licenseStatus !== "active") {
      return NextResponse.redirect(new URL("/activate-license", request.url))
    }

    // Role-based route protection
    if (request.nextUrl.pathname.startsWith("/teacher") && role === "student") {
      return NextResponse.redirect(new URL("/student", request.url))
    }

    if (request.nextUrl.pathname.startsWith("/student") && role !== "student") {
      return NextResponse.redirect(new URL("/teacher", request.url))
    }

    // Admin route protection (principal and computer_teacher only)
    if (request.nextUrl.pathname.includes("/admin") && role !== "principal" && role !== "computer_teacher") {
      return NextResponse.redirect(new URL("/access-denied", request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
