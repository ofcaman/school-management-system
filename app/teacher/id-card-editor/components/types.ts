export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface TextStyle {
  fontSize: number
  fontWeight: "normal" | "bold" | "light"
  color: string
  fontStyle?: "normal" | "italic"
  textAlign?: "left" | "center" | "right"
  backgroundColor?: string
  borderRadius?: number
  border?: string
}

export interface ImageStyle {
  borderRadius: number
}

export type ElementStyle = TextStyle | ImageStyle | Record<string, never>

export interface CardElement {
  id: string
  type: "text" | "image" | "field" | "qrcode"
  content: string
  position: Position
  size: Size
  style: ElementStyle
}

export interface CardSettings {
  headerColor: string
  footerColor: string
  schoolName: string
  schoolAddress: string
  schoolContact: string
  academicYear: string
  expiryDate: string
}

export interface Student {
  id: string
  name: string
  grade: string
  rollNumber: string
  contactNumber: string
  address: string
  fatherName: string
  profilePictureUrl?: string
}
