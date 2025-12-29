"use client"

import { QRCodeSVG } from "qrcode.react"
import type { Student } from "@/lib/models"

interface QRTemplateProps {
  student: Student
  qrData: string
}

export default function QRTemplate({ student, qrData }: QRTemplateProps) {
  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 print:p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <img src="/logo.png" alt="Sajha Boarding School Logo" className="w-24 h-24 object-contain mr-4" />
          <div>
            <h1 className="text-4xl font-bold">Sajha Boarding School</h1>
            <h2 className="text-2xl">Chandrapur-7,Rautahat</h2>
          </div>
        </div>
        <div className="qr-code">
          <QRCodeSVG value={qrData} size={150} level="H" includeMargin={true} />
        </div>
      </div>

      <div className="border-2 border-black p-2 mb-6">
        <h2 className="text-3xl font-bold text-center underline">विद्यार्थी लगइन जानकारी</h2>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold mb-2">निर्देशिका:</h3>
        <ul className="list-disc pl-8 space-y-2">
          <li className="text-lg">माथिको QR कोड स्क्यान गरी साझा बोर्डिङ स्कुल एपमा छिटो र सजिलै लगाइन गर्नुहोस्।</li>
          <li className="text-lg">
            यदि QR कोड स्क्यान गर्न सकिँदैन भने, आफ्नो कक्षा (Grade) र रोल नम्बर (Roll No.) प्रयोग गरी म्यानुअल रूपमा लगाइन गर्नुहोस्।
          </li>
        </ul>
      </div>

      <div className="student-info mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-2">
            <span className="font-bold">Student Name:</span> {student.name}
          </div>
          <div className="border p-2">
            <span className="font-bold">Roll Number:</span> {student.rollNumber}
          </div>
          <div className="border p-2">
            <span className="font-bold">Grade:</span> {student.grade}
          </div>
          <div className="border p-2">
            <span className="font-bold">Father's Name:</span> {student.fatherName}
          </div>
        </div>
      </div>

      <div className="text-center text-2xl font-bold mt-12">Download App( Sajha Boarding School)</div>
    </div>
  )
}
