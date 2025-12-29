"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, GraduationCap, BookOpen, Calendar, FileText, Bell, DollarSign, Home, Menu, X, UserPlus, Download, FileSpreadsheet, ClipboardList, Clock, QrCode, CreditCard, Receipt } from 'lucide-react'
import { cn } from "@/lib/utils"

interface SidebarProps {
  teacherId: string
  isAdmin: boolean
}

export function Sidebar({ teacherId, isAdmin }: SidebarProps) {
  const [expanded, setExpanded] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const [expandedCategories, setExpandedCategories] = useState<number[]>([])

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setExpanded(false)
      }
    }

    checkSize()
    window.addEventListener("resize", checkSize)
    return () => window.removeEventListener("resize", checkSize)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      setExpanded(!expanded)
    }
  }

  const closeMobileSidebar = () => {
    setMobileOpen(false)
  }

  const navigate = (path: string) => {
    router.push(path)
    if (isMobile) {
      closeMobileSidebar()
    }
  }

  const toggleCategory = (index: number, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedCategories((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  // Define menu categories and items
  const menuCategories = [
    {
      name: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      onClick: () => navigate(`/teacher/dashboard?id=${teacherId}`),
      adminOnly: false,
    },
    {
      name: "Academic",
      icon: <GraduationCap className="h-5 w-5" />,
      items: [
        {
          name: "Add Student",
          icon: <UserPlus className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/add-student?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Add Teacher",
          icon: <UserPlus className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/add-teacher?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Add Bulk Students",
          icon: <UserPlus className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/bulk-import-students?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Add Bulk Teachers",
          icon: <UserPlus className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/bulk-import-teachers?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Class Routine",
          icon: <Calendar className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/class-routine?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Promote Students",
          icon: <GraduationCap className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/promote-students?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Class Teachers",
          icon: <UserPlus className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/class-teachers?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Classes",
          icon: <BookOpen className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/classes?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Sections",
          icon: <FileSpreadsheet className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/sections?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Subjects",
          icon: <BookOpen className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/subjects?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Subject Groups",
          icon: <FileSpreadsheet className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/subject-groups?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "View Students",
          icon: <FileSpreadsheet className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/students?id=${teacherId}`),
          adminOnly: true,
        },
      ],
      adminOnly: false,
    },
    {
      name: "Examinations",
      icon: <BookOpen className="h-5 w-5" />,
      items: [
        {
          name: "Exam Terms",
          icon: <Calendar className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/exam-term?id=${teacherId}`),
          adminOnly: false,
        },
        {
          name: "Mark Entry",
          icon: <ClipboardList className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/subject-panel?id=${teacherId}`),
          adminOnly: false,
        },
      ],
      adminOnly: false,
    },
    {
      name: "Fee Management",
      icon: <DollarSign className="h-5 w-5" />,
      items: [
        {
          name: "Monthly Fee Setup",
          icon: <DollarSign className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/fee-management?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Generate Term Bill",
          icon: <CreditCard className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/generate-bill?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Update Bill Status",
          icon: <Receipt className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/update-bill?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Update Dues Amount",
          icon: <DollarSign className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/manage-dues?id=${teacherId}`),
          adminOnly: true,
        },
      ],
      adminOnly: false,
    },
    {
      name: "Attendance",
      icon: <Clock className="h-5 w-5" />,
      items: [
        {
          name: "Mark Attendance",
          icon: <ClipboardList className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/attendance?id=${teacherId}`),
          adminOnly: false,
        },
      ],
      adminOnly: false,
    },
    {
      name: "Communication",
      icon: <Bell className="h-5 w-5" />,
      items: [
        {
          name: "Notices",
          icon: <Bell className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/notices?id=${teacherId}`),
          adminOnly: false,
        },
        {
          name: "Add Notice",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/add-notice?id=${teacherId}`),
          adminOnly: true,
        },
      ],
      adminOnly: false,
    },
    {
      name: "Homework Management",
      icon: <BookOpen className="h-5 w-5" />,
      items: [
        {
          name: "Homeworks",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/homework?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Add Homework",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/add-homework?id=${teacherId}`),
          adminOnly: true,
        },
      ],
      adminOnly: false,
    },
    {
      name: "Reports",
      icon: <FileSpreadsheet className="h-5 w-5" />,
      items: [
        {
          name: "Export Students",
          icon: <Download className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/student-export?id=${teacherId}`),
          adminOnly: false,
        },
        {
          name: "Export Teachers",
          icon: <Download className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/teacher-export?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Export Marks",
          icon: <FileSpreadsheet className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/class-marks-export?id=${teacherId}`),
          adminOnly: false,
        },
        {
          name: "Generate Marksheet",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/generate-reports?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Generate Ledger",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/ledgergen?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Attendance Entry",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/manuallyatt?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Print Bills",
          icon: <FileSpreadsheet className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/print-bills?id=${teacherId}`),
          adminOnly: false,
        },
        {
          name: "Generate QR",
          icon: <QrCode className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/generate-qr?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "ID Cards",
          icon: <CreditCard className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/id-card?id=${teacherId}`),
          adminOnly: true,
        },
        {
          name: "Leave Requests",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => navigate(`/teacher/leave-requests?id=${teacherId}`),
          adminOnly: true,
        },
      ],
      adminOnly: false,
    },
  ]

  // Filter out admin-only items if not admin
  const filteredCategories = menuCategories.filter((category) => !category.adminOnly || (category.adminOnly && isAdmin))

  // Mobile toggle button
  const MobileToggle = (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-sm"
      onClick={toggleSidebar}
      aria-label="Toggle Menu"
    >
      {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
    </Button>
  )

  return (
    <>
      {MobileToggle}

      <div
        className={cn("fixed inset-0 z-40 bg-black/50 lg:hidden", mobileOpen ? "block" : "hidden")}
        onClick={closeMobileSidebar}
      />

      <aside
        className={cn(
          "h-screen bg-white border-r transition-all duration-300 overflow-hidden z-40",
          expanded ? "w-64" : "w-20",
          isMobile ? "fixed left-0 top-0 bottom-0" : "sticky top-0",
          isMobile && !mobileOpen && "translate-x-[-100%]",
          isMobile && mobileOpen && "translate-x-0 w-64", // Force full width on mobile when open
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            {(expanded || (isMobile && mobileOpen)) && <div className="font-bold text-lg">Sajha Boarding School</div>}
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn("ml-auto", isMobile && "hidden")}>
              {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {filteredCategories.map((category, index) => (
              <div key={index} className="mb-2">
                {category.items ? (
                  <div className="mb-1">
                    <div
                      className={cn(
                        "flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer",
                        !expanded && !mobileOpen && "justify-center",
                      )}
                      onClick={(e) => category.items && toggleCategory(index, e)}
                    >
                      {category.icon}
                      {(expanded || (isMobile && mobileOpen)) && (
                        <>
                          <span className="ml-3 font-medium">{category.name}</span>
                          {category.items && (
                            <ChevronRight
                              className={cn(
                                "ml-auto h-4 w-4 transition-transform",
                                expandedCategories.includes(index) && "transform rotate-90",
                              )}
                            />
                          )}
                        </>
                      )}
                    </div>
                    {(expanded || (isMobile && mobileOpen)) &&
                      expandedCategories.includes(index) &&
                      category.items
                        .filter((item) => !item.adminOnly || (item.adminOnly && isAdmin))
                        .map((item, itemIndex) => (
                          <div
                            key={itemIndex}
                            className="flex items-center px-4 py-2 pl-10 text-gray-600 hover:bg-gray-100 cursor-pointer"
                            onClick={item.onClick}
                          >
                            {item.icon}
                            <span className="ml-3">{item.name}</span>
                          </div>
                        ))}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer",
                      !expanded && !mobileOpen && "justify-center",
                    )}
                    onClick={category.onClick}
                  >
                    {category.icon}
                    {(expanded || (isMobile && mobileOpen)) && (
                      <span className="ml-3 font-medium">{category.name}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}