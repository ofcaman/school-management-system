import { QRCodeSVG } from "qrcode.react"
import type { Student } from "@/lib/models"

interface StudentIdCardProps {
  student: Student
  orientation?: "landscape" | "portrait"
}

export default function StudentIdCard({ student, orientation = "landscape" }: StudentIdCardProps) {
  const schoolName = "Sajha Boarding School"
  const schoolLogo = "/school-logo.png"
  const schoolAddress = "Chandrapur-7, Rautahat"
  const schoolContact = "01-1234567"
  const academicYear = "2082"
  const expiryDate = "2082-12-30"

  // Generate a unique ID for QR code - only include name, roll and grade as requested
  const studentQrData = JSON.stringify({
    name: student.name,
    grade: student.grade,
    roll: student.rollNumber,
  })

  if (orientation === "landscape") {
    return (
      <div className="w-[3.375in] h-[2.125in] overflow-hidden bg-white shadow-md rounded-md border border-gray-300 flex flex-col relative">
        {/* Top Header with School Info */}
        <div className="bg-blue-600 text-white py-1.5 px-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center overflow-hidden mr-2">
              <img src={schoolLogo || "/placeholder.svg"} alt="School Logo" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">{schoolName}</h3>
              <p className="text-[9px] text-blue-100 font-light">{schoolAddress}</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="text-[9px] font-semibold bg-yellow-500 text-blue-900 px-2 py-0.5 rounded-sm mb-0.5">
              ID Card
            </div>
            <div className="text-[9px]">{academicYear}</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex p-2 bg-white">
          {/* Left Column - Photo and Student Info */}
          <div className="flex">
            {/* Student Photo */}
            <div className="mr-3">
              <div className="w-[70px] h-[85px] bg-white border border-gray-200 rounded overflow-hidden">
                {student.profilePictureUrl ? (
                  <img
                    src={student.profilePictureUrl || "/placeholder.svg"}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                    <div className="text-gray-400 text-4xl">👤</div>
                  </div>
                )}
              </div>
            </div>

            {/* Student Details */}
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 text-sm mb-0.5">{student.name}</h3>

              <div className="text-xs">
                {/* Class only - Roll removed */}
                <div className="flex mb-0.5">
                  <div className="flex items-center">
                    <span className="text-blue-600 pr-2 w-14">Class:</span>
                    <span>{student.grade}</span>
                  </div>
                </div>

                {/* Other details */}
                <div className="flex items-center py-0.5">
                  <span className="text-blue-600 pr-2 w-14">Contact:</span>
                  <span>{student.contactNumber}</span>
                </div>
                <div className="flex items-center py-0.5">
                  <span className="text-blue-600 pr-2 w-14">Address:</span>
                  <span className="truncate">{student.address || "N/A"}</span>
                </div>
                <div className="flex items-center py-0.5">
                  <span className="text-blue-600 pr-2 w-14">Parent:</span>
                  <span className="truncate">{student.fatherName || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* QR Code - positioned to the right of student details */}
            <div className="ml-auto">
              <QRCodeSVG value={studentQrData} size={65} />
            </div>
          </div>
        </div>

        {/* Principal's Signature at bottom right */}
        <div className="absolute bottom-6 right-3">
          <div className="w-20 h-5 border-b border-gray-400 mb-0.5"></div>
          <div className="text-[6px] text-center text-gray-500">Principal's Signature</div>
        </div>

        {/* Red line and Valid upto text */}
        <div className="absolute bottom-[18px] left-0 w-full">
          <div className="h-[1px] bg-red-600 w-full"></div>
          <div className="text-[8px] text-center mt-0.5">
            <span className="font-medium">Valid upto:- {expiryDate}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-blue-600 text-white py-0.5 px-2 text-center text-[9px]">
          <p>If found, please return to: {schoolContact}</p>
        </div>
      </div>
    )
  } else {
    // Portrait orientation
    return (
      <div className="w-[2.125in] h-[3.375in] overflow-hidden bg-white shadow-md rounded-md border border-gray-300 flex flex-col relative">
        {/* Top Header with School Info */}
        <div className="bg-blue-600 text-white py-1.5 px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center overflow-hidden mr-1">
                <img src={schoolLogo || "/placeholder.svg"} alt="School Logo" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-[11px] tracking-tight">{schoolName}</h3>
                <p className="text-[8px] text-blue-100 font-light">{schoolAddress}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-semibold bg-yellow-500 text-blue-900 px-1.5 py-0.5 rounded-sm">
                ID Card
              </div>
              <div className="text-[8px]">{academicYear}</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-2 bg-white">
          {/* QR Code in top right - better positioned */}
          <div className="absolute top-11 right-3">
            <QRCodeSVG value={studentQrData} size={45} />
          </div>

          {/* Student Photo - centered and smaller */}
          <div className="flex justify-center mb-2 mt-1">
            <div className="w-[60px] h-[72px] bg-white border border-gray-200 rounded overflow-hidden">
              {student.profilePictureUrl ? (
                <img
                  src={student.profilePictureUrl || "/placeholder.svg"}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                  <div className="text-gray-400 text-2xl">👤</div>
                </div>
              )}
            </div>
          </div>

          {/* Student Name */}
          <h3 className="font-bold text-blue-900 text-xs text-center mb-2">{student.name}</h3>

          {/* Student Details */}
          <div className="text-[9px] px-1">
            {/* Class only - Roll removed */}
            <div className="flex mb-1 justify-center">
              <div className="flex items-center">
                <span className="text-blue-600 pr-1">Class:</span>
                <span>{student.grade}</span>
              </div>
            </div>

            {/* Other details */}
            <div className="flex items-center py-0.5">
              <span className="text-blue-600 pr-1 w-12">Contact:</span>
              <span>{student.contactNumber}</span>
            </div>
            <div className="flex items-center py-0.5">
              <span className="text-blue-600 pr-1 w-12">Address:</span>
              <span className="truncate">{student.address || "N/A"}</span>
            </div>
            <div className="flex items-center py-0.5">
              <span className="text-blue-600 pr-1 w-12">Parent:</span>
              <span className="truncate">{student.fatherName || "N/A"}</span>
            </div>
          </div>

          {/* Principal's Signature */}
          <div className="mt-auto self-end mr-2 mb-1">
            <div className="w-20 h-5 border-b border-gray-400 mb-0.5"></div>
            <div className="text-[6px] text-center text-gray-500">Principal's Signature</div>
          </div>
        </div>

        {/* Red line and Valid upto text */}
        <div className="w-full mb-[18px]">
          <div className="h-[1px] bg-red-600 w-full"></div>
          <div className="text-[7px] text-center mt-0.5">
            <span className="font-medium">Valid upto:- {expiryDate}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-blue-600 text-white py-1 px-2 text-center text-[9px] font-medium">
          <p>If found, please return to: {schoolContact}</p>
        </div>
      </div>
    )
  }
}
