import type { CardElement, CardSettings } from "./types"

export const defaultCardElements: CardElement[] = [
  // School Logo
  {
    id: "school-logo",
    type: "image",
    content: "/school-logo.png",
    position: { x: 30, y: 30 },
    size: { width: 70, height: 70 },
    style: { borderRadius: 35 },
  },
  // School Name - Line 1
  {
    id: "school-name-1",
    type: "text",
    content: "Sajha Boarding",
    position: { x: 120, y: 40 },
    size: { width: 200, height: 40 },
    style: { fontSize: 24, fontWeight: "bold", color: "#cc2222" },
  },
  // School Name - Line 2
  {
    id: "school-name-2",
    type: "text",
    content: "School",
    position: { x: 120, y: 80 },
    size: { width: 200, height: 40 },
    style: { fontSize: 24, fontWeight: "bold", color: "#cc2222" },
  },
  // Student Profile Banner
  {
    id: "profile-banner",
    type: "text",
    content: "Student Profile",
    position: { x: 0, y: 140 },
    size: { width: 324, height: 40 },
    style: { fontSize: 22, fontWeight: "bold", color: "#ffffff" },
  },
  // Student Photo
  {
    id: "student-photo",
    type: "field",
    content: "profilePictureUrl",
    position: { x: 20, y: 200 },
    size: { width: 120, height: 150 },
    style: { borderRadius: 4 },
  },
  // Name Label
  {
    id: "name-label",
    type: "text",
    content: "Name",
    position: { x: 150, y: 200 },
    size: { width: 100, height: 30 },
    style: { fontSize: 20, fontWeight: "bold", color: "#000000" },
  },
  // Name Value
  {
    id: "name-value",
    type: "field",
    content: "name",
    position: { x: 150, y: 230 },
    size: { width: 150, height: 30 },
    style: { fontSize: 18, fontWeight: "normal", color: "#000000" },
  },
  // Class Label
  {
    id: "class-label",
    type: "text",
    content: "Class:",
    position: { x: 150, y: 270 },
    size: { width: 70, height: 30 },
    style: { fontSize: 20, fontWeight: "bold", color: "#000000" },
  },
  // Class Value
  {
    id: "class-value",
    type: "field",
    content: "grade",
    position: { x: 220, y: 270 },
    size: { width: 50, height: 30 },
    style: { fontSize: 20, fontWeight: "normal", color: "#000000" },
  },
  // Address Label
  {
    id: "address-label",
    type: "text",
    content: "Address:",
    position: { x: 150, y: 310 },
    size: { width: 90, height: 30 },
    style: { fontSize: 20, fontWeight: "bold", color: "#000000" },
  },
  // Address Value
  {
    id: "address-value",
    type: "field",
    content: "address",
    position: { x: 150, y: 340 },
    size: { width: 150, height: 30 },
    style: { fontSize: 18, fontWeight: "normal", color: "#000000" },
  },
  // QR Code
  {
    id: "qrcode",
    type: "qrcode",
    content: "name,grade,rollNumber",
    position: { x: 230, y: 200 },
    size: { width: 80, height: 80 },
    style: {},
  },
  // Signature
  {
    id: "signature",
    type: "text",
    content: "Signature",
    position: { x: 230, y: 350 },
    size: { width: 80, height: 20 },
    style: { fontSize: 16, fontWeight: "normal", color: "#cc2222", fontStyle: "italic" },
  },
  // Valid Until Banner
  {
    id: "valid-until-banner",
    type: "text",
    content: "Valid Upto: 2082/12/30",
    position: { x: 0, y: 400 },
    size: { width: 324, height: 40 },
    style: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  },
  // Contact Info
  {
    id: "contact-info",
    type: "text",
    content: "If found contact: 9815277607",
    position: { x: 20, y: 450 },
    size: { width: 280, height: 30 },
    style: { fontSize: 18, fontWeight: "normal", color: "#cc2222" },
  },
]

export const defaultCardSettings: CardSettings = {
  headerColor: "#ffffff",
  footerColor: "#ffffff",
  schoolName: "Sajha Boarding School",
  schoolAddress: "Chandrapur-7, Rautahat",
  schoolContact: "9815277607",
  academicYear: "2082",
  expiryDate: "2082/12/30",
}
