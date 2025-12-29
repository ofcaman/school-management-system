export interface LeaveRequest {
    id: string
    userId: string
    userName: string
    userEmail?: string // Added to store the email separately
    userType: string // "teacher" or "student"
    leaveType: string
    startDate: string // Format: YYYY-MM-DD in BS (Nepali date)
    endDate: string // Format: YYYY-MM-DD in BS (Nepali date)
    totalDays: number
    reason: string
    status: "pending" | "approved" | "rejected"
    approvedBy?: string
    rejectionReason?: string
    createdAt: Date
    updatedAt: Date
    attachmentUrl?: string
  }
  