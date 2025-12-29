"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Printer, Loader2, Eye, CreditCard, CreditCardIcon as CreditCardVertical } from "lucide-react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import type { Student } from "@/lib/models"
import StudentIdCard from "./student-id-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import IdCardOrientationSelector from "./id-card-orientation-selector"

interface BulkIdCardGeneratorProps {
  db: any // Firestore DB instance
}

export default function BulkIdCardGenerator({ db }: BulkIdCardGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [isPrinting, setIsPrinting] = useState(false)
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null)
  const [cardOrientation, setCardOrientation] = useState<"landscape" | "portrait">("landscape")
  const printContainerRef = useRef<HTMLDivElement>(null)

  const classes = ["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())]

  const fetchStudentsByGrade = async () => {
    if (!selectedGrade) {
      alert("Please select a grade")
      return
    }

    setLoading(true)
    try {
      const studentsRef = collection(db, "students")
      const q = query(studentsRef, where("grade", "==", selectedGrade), orderBy("rollNumber"))

      const querySnapshot = await getDocs(q)
      const results: Student[] = []

      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Student)
      })

      setStudents(results)
    } catch (error) {
      console.error("Error fetching students:", error)
      alert("Error fetching students. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (students.length === 0) {
      alert("No students to print")
      return
    }

    setIsPrinting(true)

    // Use browser's print functionality
    setTimeout(() => {
      if (printContainerRef.current) {
        const originalContents = document.body.innerHTML
        const printContents = printContainerRef.current.innerHTML

        document.body.innerHTML = `
          <div style="padding: 20px;">
            ${printContents}
          </div>
        `

        window.print()
        document.body.innerHTML = originalContents

        // Reload the page to restore React functionality
        window.location.reload()
      } else {
        alert("Error preparing print content. Please try again.")
        setIsPrinting(false)
      }
    }, 500)
  }

  const openPreview = (student: Student) => {
    setPreviewStudent(student)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk ID Card Generator</CardTitle>
        <CardDescription>Generate ID cards for an entire class at once</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulkGrade">Select Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger id="bulkGrade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardOrientation">Card Orientation</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={cardOrientation === "landscape" ? "default" : "outline"}
                  onClick={() => setCardOrientation("landscape")}
                  className="flex-1 flex gap-2 justify-center"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Landscape</span>
                </Button>
                <Button
                  type="button"
                  variant={cardOrientation === "portrait" ? "default" : "outline"}
                  onClick={() => setCardOrientation("portrait")}
                  className="flex-1 flex gap-2 justify-center"
                >
                  <CreditCardVertical className="h-4 w-4" />
                  <span>Portrait</span>
                </Button>
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchStudentsByGrade} disabled={loading || !selectedGrade} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Fetch Students"
                )}
              </Button>
            </div>
          </div>

          {students.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">
                  {students.length} student{students.length !== 1 ? "s" : ""} found in {selectedGrade}
                </h3>
                <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700" disabled={isPrinting}>
                  {isPrinting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4 mr-2" />
                      Print All Cards
                    </>
                  )}
                </Button>
              </div>

              <div className="border rounded-md p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">
                  Preview of first 3 cards (all {students.length} will be printed):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {students.slice(0, 3).map((student) => (
                    <div key={student.id} className="border bg-white rounded-md p-2 shadow-sm relative group">
                      <StudentIdCard student={student} orientation={cardOrientation} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-white/90"
                          onClick={() => openPreview(student)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Print content - hidden but accessible to the DOM */}
      <div className="sr-only">
        <div ref={printContainerRef}>
          <div className="print-container">
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @media print {
                body { margin: 0; padding: 0; }
                .print-card { 
                  page-break-inside: avoid;
                  margin-bottom: 0.5in;
                  display: inline-block;
                  ${
                    cardOrientation === "landscape"
                      ? "width: 3.375in; height: 2.125in;"
                      : "width: 2.125in; height: 3.375in;"
                  }
                  margin-right: 0.25in;
                }
                @page {
                  size: letter;
                  margin: 0.5in;
                }
              }
            `,
              }}
            />
            <div className="grid-print-container">
              {students.map((student) => (
                <div key={student.id} className="print-card">
                  <StudentIdCard student={student} orientation={cardOrientation} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewStudent !== null} onOpenChange={(open) => !open && setPreviewStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
          </DialogHeader>
          {previewStudent && (
            <IdCardOrientationSelector
              student={previewStudent}
              orientation={cardOrientation}
              onOrientationChange={setCardOrientation}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
