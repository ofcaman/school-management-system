"use client"

import { Button } from "@/components/ui/button"
import type { CardElement, CardSettings } from "./types"

// This is a helper component to manually set up the ID card design
export function ManualSetup({
  setCardElements,
  setCardSettings,
  addToHistory,
}: {
  setCardElements: (elements: CardElement[]) => void
  setCardSettings: (settings: CardSettings) => void
  addToHistory: (elements: CardElement[]) => void
}) {
  const applyExactIDCardTemplate = () => {
    // Define the elements for the exact ID card template matching the reference image
    const exactIDCardElements: CardElement[] = [
      // School Logo
      {
        id: "school-logo",
        type: "text",
        content: "School\nLogo",
        position: { x: 30, y: 30 },
        size: { width: 80, height: 80 },
        style: {
          fontSize: 20,
          fontWeight: "bold",
          color: "#cc2222",
          textAlign: "center",
          borderRadius: 40,
          border: "2px solid #cc2222",
        },
      },
      // School Name - Combined into one element
      {
        id: "school-name",
        type: "text",
        content: "Sajha Boarding\nSchool",
        position: { x: 130, y: 40 },
        size: { width: 250, height: 80 },
        style: {
          fontSize: 32,
          fontWeight: "bold",
          color: "#cc2222",
          textAlign: "left",
        },
      },
      // Student Profile Banner
      {
        id: "profile-banner",
        type: "text",
        content: "Student Profile",
        position: { x: 0, y: 140 },
        size: { width: 324, height: 50 },
        style: {
          fontSize: 28,
          fontWeight: "bold",
          color: "#ffffff",
          backgroundColor: "#cc2222",
          textAlign: "center",
        },
      },
      // Student Photo
      {
        id: "student-photo",
        type: "field",
        content: "profilePictureUrl",
        position: { x: 20, y: 210 },
        size: { width: 140, height: 180 },
        style: { borderRadius: 4 },
      },
      // Name Label
      {
        id: "name-label",
        type: "text",
        content: "Name",
        position: { x: 180, y: 210 },
        size: { width: 100, height: 40 },
        style: {
          fontSize: 28,
          fontWeight: "bold",
          color: "#000000",
          textAlign: "left",
        },
      },
      // Name Value
      {
        id: "name-value",
        type: "field",
        content: "name",
        position: { x: 180, y: 250 },
        size: { width: 150, height: 40 },
        style: {
          fontSize: 24,
          fontWeight: "normal",
          color: "#000000",
          textAlign: "left",
        },
      },
      // Class Label and Value (combined)
      {
        id: "class-combined",
        type: "text",
        content: "Class: 10",
        position: { x: 180, y: 300 },
        size: { width: 150, height: 40 },
        style: {
          fontSize: 28,
          fontWeight: "bold",
          color: "#000000",
          textAlign: "left",
        },
      },
      // Address Label
      {
        id: "address-label",
        type: "text",
        content: "Address:",
        position: { x: 180, y: 350 },
        size: { width: 120, height: 40 },
        style: {
          fontSize: 28,
          fontWeight: "bold",
          color: "#000000",
          textAlign: "left",
        },
      },
      // Address Value
      {
        id: "address-value",
        type: "field",
        content: "address",
        position: { x: 180, y: 390 },
        size: { width: 150, height: 40 },
        style: {
          fontSize: 24,
          fontWeight: "normal",
          color: "#000000",
          textAlign: "left",
        },
      },
      // QR Code
      {
        id: "qrcode",
        type: "qrcode",
        content: "name,grade,rollNumber",
        position: { x: 220, y: 210 },
        size: { width: 90, height: 90 },
        style: {},
      },
      // Signature
      {
        id: "signature",
        type: "text",
        content: "Signature",
        position: { x: 220, y: 400 },
        size: { width: 100, height: 30 },
        style: {
          fontSize: 24,
          fontWeight: "normal",
          color: "#cc2222",
          fontStyle: "italic",
          textAlign: "left",
        },
      },
      // Valid Until Banner
      {
        id: "valid-until-banner",
        type: "text",
        content: "Valid Upto: 2082/12/30",
        position: { x: 0, y: 440 },
        size: { width: 324, height: 50 },
        style: {
          fontSize: 28,
          fontWeight: "bold",
          color: "#ffffff",
          backgroundColor: "#cc2222",
          textAlign: "center",
        },
      },
      // Contact Info
      {
        id: "contact-info",
        type: "text",
        content: "If found contact: 9815277607",
        position: { x: 20, y: 500 },
        size: { width: 280, height: 40 },
        style: {
          fontSize: 24,
          fontWeight: "normal",
          color: "#cc2222",
          textAlign: "left",
        },
      },
    ]

    // Define the settings for the ID card template
    const exactIDCardSettings: CardSettings = {
      headerColor: "#ffffff",
      footerColor: "#ffffff",
      schoolName: "Sajha Boarding School",
      schoolAddress: "Chandrapur-7, Rautahat",
      schoolContact: "9815277607",
      academicYear: "2082",
      expiryDate: "2082/12/30",
    }

    // Apply the template
    setCardElements(exactIDCardElements)
    setCardSettings(exactIDCardSettings)
    addToHistory(exactIDCardElements)
  }

  return (
    <div className="mb-4">
      <Button onClick={applyExactIDCardTemplate} className="w-full bg-red-600 hover:bg-red-700">
        Apply Exact ID Card Template (Match Reference Image)
      </Button>
    </div>
  )
}
