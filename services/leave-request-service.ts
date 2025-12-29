import { collection, query, getDocs, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import type { LeaveRequest } from "@/types/leave-request"

export const fetchLeaveRequests = async (): Promise<LeaveRequest[]> => {
  try {
    const leaveRequestsRef = collection(db, "leave_requests")
    const q = query(leaveRequestsRef)
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      console.log(`Document ${doc.id} data:`, data)

      // Safely convert Firestore timestamps to Date objects with fallbacks
      const createdAt =
        data.createdAt && typeof data.createdAt.toDate === "function" ? data.createdAt.toDate() : new Date()

      const updatedAt =
        data.updatedAt && typeof data.updatedAt.toDate === "function" ? data.updatedAt.toDate() : new Date()

      // Get teacher name directly from the document
      // Use teacherName field first, then fall back to other options if not available
      const teacherName = data.teacherName || data.userName || "Unknown Teacher"

      return {
        id: doc.id,
        userId: data.teacherId || data.userId || "",
        userName: teacherName,
        userEmail: data.teacherEmail || data.email || "",
        userType: data.userType || "teacher",
        leaveType: data.leaveType || "",
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        totalDays: data.totalDays || 0,
        reason: data.reason || "",
        status: data.status || "pending",
        approvedBy: data.approvedBy,
        rejectionReason: data.rejectionReason,
        createdAt: createdAt,
        updatedAt: updatedAt,
        attachmentUrl: data.attachmentUrl,
      } as LeaveRequest
    })
  } catch (error) {
    console.error("Error fetching leave requests:", error)
    return []
  }
}

export const approveLeaveRequest = async (requestId: string, adminId: string): Promise<void> => {
  try {
    const requestRef = doc(db, "leave_requests", requestId)
    await updateDoc(requestRef, {
      status: "approved",
      approvedBy: adminId,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error("Error approving leave request:", error)
    throw error
  }
}

export const rejectLeaveRequest = async (requestId: string, rejectionReason: string): Promise<void> => {
  try {
    const requestRef = doc(db, "leave_requests", requestId)
    await updateDoc(requestRef, {
      status: "rejected",
      rejectionReason: rejectionReason,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error("Error rejecting leave request:", error)
    throw error
  }
}

export const getLeaveRequestById = async (requestId: string): Promise<LeaveRequest | null> => {
  try {
    const requestRef = doc(db, "leave_requests", requestId)
    const docSnap = await getDoc(requestRef)

    if (docSnap.exists()) {
      const data = docSnap.data()

      // Safely convert Firestore timestamps to Date objects with fallbacks
      const createdAt =
        data.createdAt && typeof data.createdAt.toDate === "function" ? data.createdAt.toDate() : new Date()

      const updatedAt =
        data.updatedAt && typeof data.updatedAt.toDate === "function" ? data.updatedAt.toDate() : new Date()

      // Get teacher name directly from the document
      const teacherName = data.teacherName || data.userName || "Unknown Teacher"

      return {
        id: docSnap.id,
        userId: data.teacherId || data.userId || "",
        userName: teacherName,
        userEmail: data.teacherEmail || data.email || "",
        userType: data.userType || "teacher",
        leaveType: data.leaveType || "",
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        totalDays: data.totalDays || 0,
        reason: data.reason || "",
        status: data.status || "pending",
        approvedBy: data.approvedBy,
        rejectionReason: data.rejectionReason,
        createdAt: createdAt,
        updatedAt: updatedAt,
        attachmentUrl: data.attachmentUrl,
      } as LeaveRequest
    }

    return null
  } catch (error) {
    console.error("Error getting leave request:", error)
    throw error
  }
}
