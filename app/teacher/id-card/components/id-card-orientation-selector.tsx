"use client"
import { Button } from "@/components/ui/button"
import { CreditCard, CreditCardIcon as CreditCardVertical } from "lucide-react"
import type { Student } from "@/lib/models"
import StudentIdCard from "./student-id-card"

interface IdCardOrientationSelectorProps {
  student: Student
  orientation: "landscape" | "portrait"
  onOrientationChange: (orientation: "landscape" | "portrait") => void
}

export default function IdCardOrientationSelector({
  student,
  orientation,
  onOrientationChange,
}: IdCardOrientationSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-4">
        <Button
          variant={orientation === "landscape" ? "default" : "outline"}
          className="flex gap-2"
          onClick={() => onOrientationChange("landscape")}
        >
          <CreditCard className="h-4 w-4" />
          <span>Landscape</span>
        </Button>
        <Button
          variant={orientation === "portrait" ? "default" : "outline"}
          className="flex gap-2"
          onClick={() => onOrientationChange("portrait")}
        >
          <CreditCardVertical className="h-4 w-4" />
          <span>Portrait</span>
        </Button>
      </div>

      <div className="flex justify-center">
        <div className={orientation === "landscape" ? "block" : "hidden"}>
          <StudentIdCard student={student} orientation="landscape" />
        </div>
        <div className={orientation === "portrait" ? "block" : "hidden"}>
          <StudentIdCard student={student} orientation="portrait" />
        </div>
      </div>
    </div>
  )
}
