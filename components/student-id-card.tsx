"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Download, QrCode } from "lucide-react"
import QRCode from "qrcode.react"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

interface StudentIDCardProps {
  student: {
    firstName: string
    middleName?: string
    lastName: string
    grade: string
    rollNumber: string
    profilePictureUrl?: string
    contactNumber: string
    address?: string
    fatherName?: string
    janmaDartaNumber?: string
  }
  schoolName?: string
  schoolLogo?: string
  expiryDate?: string
}

export default function StudentIDCard({
  student,
  schoolName = "Sajha School",
  schoolLogo = "/school_logo.png",
  expiryDate = `${new Date().getFullYear() + 1}-04-14`,
}: StudentIDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [showQR, setShowQR] = useState(false)

  // Generate a unique student ID based on grade, roll number and a timestamp
  const generateStudentID = () => {
    const gradePrefix = student.grade.replace(/\D/g, "") || "00" // Extract numbers from grade or use "00"
    const paddedGrade = gradePrefix.padStart(2, "0").substring(0, 2) // Ensure 2 digits
    const paddedRoll = student.rollNumber.padStart(3, "0").substring(0, 3) // Ensure 3 digits
    const randomSuffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0") // Random 3-digit number

    return `SS${paddedGrade}${paddedRoll}${randomSuffix}`
  }

  const studentID = generateStudentID()

  // Generate QR code data
  const qrData = JSON.stringify({
    id: studentID,
    name: `${student.firstName} ${student.middleName || ""} ${student.lastName}`.trim(),
    grade: student.grade,
    roll: student.rollNumber,
    contact: student.contactNumber,
  })

  // Print the ID card
  const handlePrint = () => {
    if (cardRef.current) {
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Student ID Card - ${student.firstName} ${student.lastName}</title>
              <style>
                body { margin: 0; padding: 20px; display: flex; justify-content: center; }
                @media print {
                  body { margin: 0; padding: 0; }
                }
              </style>
            </head>
            <body>
              ${cardRef.current.outerHTML}
              <script>
                window.onload = function() { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    }
  }

  // Download as PDF
  const handleDownload = async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3, // Higher scale for better quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        })

        const imgData = canvas.toDataURL("image/jpeg", 1.0)
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [86, 54], // Standard ID card size
        })

        pdf.addImage(imgData, "JPEG", 0, 0, 86, 54)
        pdf.save(`${student.firstName}_${student.lastName}_ID_Card.pdf`)
      } catch (error) {
        console.error("Error generating PDF:", error)
        alert("Failed to generate PDF. Please try again.")
      }
    }
  }

  // Toggle QR code visibility
  const toggleQR = () => {
    setShowQR(!showQR)
  }

  // Format date to display in a readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* ID Card */}
      <div
        ref={cardRef}
        className="w-[340px] h-[210px] bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 relative"
      >
        {/* Card Header */}
        <div className="bg-blue-600 text-white p-2 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src={schoolLogo || "/placeholder.svg"}
              alt="School Logo"
              className="h-10 w-10 mr-2 rounded-full bg-white p-1"
            />
            <div>
              <h3 className="font-bold text-sm">{schoolName}</h3>
              <p className="text-xs text-blue-100">Student Identity Card</p>
            </div>
          </div>
          <div className="text-xs text-right">
            <div>
              ID: <span className="font-mono font-bold">{studentID}</span>
            </div>
            <div>Valid until: {formatDate(expiryDate)}</div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3 flex">
          {/* Photo */}
          <div className="mr-3">
            <div className="w-[80px] h-[100px] bg-gray-100 border border-gray-300 overflow-hidden flex items-center justify-center">
              {student.profilePictureUrl ? (
                <img
                  src={student.profilePictureUrl || "/placeholder.svg"}
                  alt={`${student.firstName}'s photo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl text-gray-400">👤</span>
              )}
            </div>

            {/* QR Code (conditionally shown) */}
            {showQR && (
              <div className="mt-2 flex justify-center">
                <QRCode value={qrData} size={80} level="M" renderAs="svg" />
              </div>
            )}
          </div>

          {/* Student Details */}
          <div className="flex-1">
            <h3 className="font-bold text-base text-gray-800 border-b border-gray-200 pb-1 mb-1">
              {student.firstName} {student.middleName} {student.lastName}
            </h3>

            <div className="text-xs space-y-1 text-gray-700">
              <div className="grid grid-cols-3">
                <span className="font-semibold">Class:</span>
                <span className="col-span-2">{student.grade}</span>
              </div>

              <div className="grid grid-cols-3">
                <span className="font-semibold">Roll No:</span>
                <span className="col-span-2">{student.rollNumber}</span>
              </div>

              {student.address && (
                <div className="grid grid-cols-3">
                  <span className="font-semibold">Address:</span>
                  <span className="col-span-2">{student.address}</span>
                </div>
              )}

              <div className="grid grid-cols-3">
                <span className="font-semibold">Contact:</span>
                <span className="col-span-2">{student.contactNumber}</span>
              </div>

              {student.fatherName && (
                <div className="grid grid-cols-3">
                  <span className="font-semibold">Guardian:</span>
                  <span className="col-span-2">{student.fatherName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-xs p-1 text-center">
          <p>If found, please return to: {schoolName} • Phone: 01-XXXXXXX</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Download PDF
        </Button>
        <Button onClick={toggleQR} variant="outline" size="sm">
          <QrCode className="h-4 w-4 mr-1" />
          {showQR ? "Hide QR" : "Show QR"}
        </Button>
      </div>
    </div>
  )
}
