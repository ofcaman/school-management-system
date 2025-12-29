"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, FileText, Calendar, Clock, AlertCircle, User } from "lucide-react"
import type { LeaveRequest } from "@/types/leave-request"
import { fetchLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from "@/services/leave-request-service"

export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const requests = await fetchLeaveRequests()

        // Log the requests to see what's coming from Firestore
        console.log("Fetched leave requests:", requests)

        setLeaveRequests(requests)
      } catch (error) {
        console.error("Error fetching leave requests:", error)
        setError("Failed to load leave requests. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleApproveRequest = async (request: LeaveRequest) => {
    try {
      // Get current admin ID - you might want to get this from your auth context
      const adminId = "admin1" // Replace with actual admin ID or get from auth context

      await approveLeaveRequest(request.id, adminId)

      // Update local state
      setLeaveRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.id === request.id
            ? {
                ...req,
                status: "approved",
                approvedBy: adminId,
                updatedAt: new Date(),
              }
            : req,
        ),
      )
    } catch (error) {
      console.error("Error approving request:", error)
    }
  }

  const openRejectionDialog = (request: LeaveRequest) => {
    setSelectedRequest(request)
    setRejectionReason("")
    setRejectionDialogOpen(true)
  }

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return

    try {
      await rejectLeaveRequest(selectedRequest.id, rejectionReason)

      // Update local state
      setLeaveRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.id === selectedRequest.id
            ? {
                ...req,
                status: "rejected",
                rejectionReason: rejectionReason,
                updatedAt: new Date(),
              }
            : req,
        ),
      )

      // Close dialog
      setRejectionDialogOpen(false)
      setSelectedRequest(null)
      setRejectionReason("")
    } catch (error) {
      console.error("Error rejecting request:", error)
    }
  }

  const openViewDetailsDialog = (request: LeaveRequest) => {
    setSelectedRequest(request)
    setViewDetailsDialogOpen(true)
  }

  // Normalize status for comparison (case-insensitive)
  const normalizeStatus = (status: string): string => {
    return status.toLowerCase().trim()
  }

  const filteredRequests = leaveRequests.filter((request) => {
    if (activeTab === "all") return true

    // Normalize the status for comparison
    const normalizedStatus = normalizeStatus(request.status)
    const normalizedTab = normalizeStatus(activeTab)

    return normalizedStatus === normalizedTab
  })

  const getStatusBadge = (status: string) => {
    const normalizedStatus = normalizeStatus(status)

    switch (normalizedStatus) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "pending":
      default:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Pending
          </Badge>
        )
    }
  }

  // Check if a request is pending (case-insensitive)
  const isPending = (request: LeaveRequest): boolean => {
    return normalizeStatus(request.status) === "pending"
  }

  // Safe date formatting function to handle potential invalid dates
  const formatDate = (date: Date) => {
    try {
      return format(date, "MMM d, yyyy")
    } catch (error) {
      return "Unknown date"
    }
  }

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-red-50 rounded-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Leave Requests Management</h1>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No leave requests found in the database.</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <p className="text-muted-foreground">No {activeTab !== "all" ? activeTab : ""} leave requests found.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {request.userName ? getInitials(request.userName) : <User className="h-4 w-4" />}
                        </div>
                        <div>
                          <CardTitle className="text-base">{request.userName}</CardTitle>
                          <CardDescription>{request.leaveType}</CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {request.startDate} to {request.endDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{request.totalDays} day(s)</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Reason:</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">{request.reason}</p>
                      </div>

                      {normalizeStatus(request.status) === "rejected" && request.rejectionReason && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <X className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium">Rejection Reason:</span>
                          </div>
                          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20 pl-6">
                            {request.rejectionReason}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">Requested on: {formatDate(request.createdAt)}</div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openViewDetailsDialog(request)}
                    >
                      View Details
                    </Button>

                    {isPending(request) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                          onClick={() => handleApproveRequest(request)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                          onClick={() => openRejectionDialog(request)}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>{selectedRequest?.userName}'s leave request</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Teacher</h3>
                  <p className="font-medium">{selectedRequest.userName}</p>
                  {selectedRequest.userEmail && (
                    <p className="text-xs text-muted-foreground">{selectedRequest.userEmail}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Leave Type</h3>
                <p>{selectedRequest.leaveType}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Leave Period</h3>
                <p>
                  {selectedRequest.startDate} to {selectedRequest.endDate}
                </p>
                <p className="text-xs text-muted-foreground">Total: {selectedRequest.totalDays} day(s)</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Reason</h3>
                <p className="p-3 bg-muted rounded-md">{selectedRequest.reason}</p>
              </div>

              {normalizeStatus(selectedRequest.status) === "rejected" && selectedRequest.rejectionReason && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Rejection Reason</h3>
                  <p className="p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">Requested on: {formatDate(selectedRequest.createdAt)}</div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsDialogOpen(false)}>
              Close
            </Button>

            {selectedRequest && isPending(selectedRequest) && (
              <>
                <Button
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                  onClick={() => {
                    handleApproveRequest(selectedRequest)
                    setViewDetailsDialogOpen(false)
                  }}
                >
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    openRejectionDialog(selectedRequest)
                    setViewDetailsDialogOpen(false)
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this leave request.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest} disabled={!rejectionReason.trim()}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
