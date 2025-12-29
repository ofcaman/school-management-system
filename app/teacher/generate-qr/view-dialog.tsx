"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from "qrcode.react"
import { Printer } from "lucide-react"
import type { Student } from "@/lib/models"

interface ViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  qrData: string
  onPrint: () => void
}

export default function ViewDialog({ open, onOpenChange, student, qrData, onPrint }: ViewDialogProps) {
  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for {student.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <div className="bg-white p-4 rounded-lg mb-4">
            <QRCodeSVG value={qrData} size={250} level="H" includeMargin={true} />
          </div>
          <div className="text-center mb-4">
            <p className="font-semibold">{student.name}</p>
            <p className="text-sm text-muted-foreground">
              Roll Number: {student.rollNumber}, Grade: {student.grade}
            </p>
          </div>
          <Button onClick={onPrint} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Print QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
