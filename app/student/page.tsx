"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { ArrowLeft, Loader2, Calendar, Award, BookOpen } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function StudentPortalPage() {
  const [rollNumber, setRollNumber] = useState("")
  const [grade, setGrade] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const [examTerm, setExamTerm] = useState<string | null>(null)

  const grades = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6"]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!rollNumber) {
      setError("Please enter your roll number")
      return
    }

    if (!grade) {
      setError("Please select your grade")
      return
    }

    setLoading(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // For demo, show results for roll numbers 1-5, otherwise show "no result"
        const rollNum = Number.parseInt(rollNumber)
        if (rollNum >= 1 && rollNum <= 5) {
          // Generate random total marks for ranking demonstration
          const totalMarks = Math.floor(Math.random() * 300) + 400

          // Generate mock ranks based on roll number
          let rank = 0
          if (rollNum === 1) rank = 2
          else if (rollNum === 2) rank = 1
          else if (rollNum === 3) rank = 5
          else if (rollNum === 4) rank = 3
          else if (rollNum === 5) rank = 4

          const demoResult = {
            studentName: `Student ${rollNumber}`,
            rollNumber,
            grade,
            examTerm: "First Term",
            totalMarks: totalMarks,
            percentage: Math.floor(totalMarks / 6),
            grade: ["A+", "A", "B+", "B", "C+"][Math.floor(Math.random() * 5)],
            result: "Pass",
            rank: rank,
            attendance: {
              present: Math.floor(Math.random() * 20) + 70,
              total: 100,
              percentage: Math.floor(Math.random() * 20) + 70,
            },
            subjects: [
              { name: "English", marks: Math.floor(Math.random() * 20) + 80, fullMarks: 100, grade: "A" },
              { name: "Mathematics", marks: Math.floor(Math.random() * 20) + 80, fullMarks: 100, grade: "A" },
              { name: "Science", marks: Math.floor(Math.random() * 20) + 80, fullMarks: 100, grade: "B+" },
              { name: "Social Studies", marks: Math.floor(Math.random() * 20) + 80, fullMarks: 100, grade: "A-" },
              { name: "Nepali", marks: Math.floor(Math.random() * 20) + 80, fullMarks: 100, grade: "B" },
              { name: "Computer", marks: Math.floor(Math.random() * 20) + 80, fullMarks: 100, grade: "A+" },
            ],
          }
          setResult(demoResult)
          setExamTerm("First Term")
        } else {
          setError("No result found for the provided roll number and grade")
        }
      } else {
        // Query Firestore for student
        const studentsRef = collection(db, "students")
        const q = query(studentsRef, where("rollNumber", "==", rollNumber), where("grade", "==", grade))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          setError("No student found with the provided roll number and grade")
          setLoading(false)
          return
        }

        const studentId = querySnapshot.docs[0].id
        const studentData = querySnapshot.docs[0].data()

        // Query for exam results
        const resultsRef = collection(db, "exam_results")
        const resultsQuery = query(resultsRef, where("studentId", "==", studentId))
        const resultsSnapshot = await getDocs(resultsQuery)

        if (resultsSnapshot.empty) {
          setError("No result found for this student")
          setLoading(false)
          return
        }

        // Get the most recent result
        const resultDoc = resultsSnapshot.docs[0]
        const resultData = resultDoc.data()

        // Query for attendance
        const attendanceRef = collection(db, "attendance")
        const attendanceQuery = query(attendanceRef, where("studentId", "==", studentId))
        const attendanceSnapshot = await getDocs(attendanceQuery)

        // Calculate attendance
        let presentDays = 0
        let totalDays = 0

        if (!attendanceSnapshot.empty) {
          attendanceSnapshot.forEach((doc) => {
            const data = doc.data()
            totalDays++
            if (data.status === "present") {
              presentDays++
            }
          })
        }

        // Calculate rank
        let rank = 1
        // Get all students in the same grade and exam term
        const allResultsQuery = query(resultsRef, where("examId", "==", resultData.examId))
        const allResultsSnapshot = await getDocs(allResultsQuery)

        // Sort by total marks to determine rank
        const allResults = allResultsSnapshot.docs.map((doc) => doc.data())
        allResults.sort((a, b) => b.totalMarks - a.totalMarks)

        // Find the student's rank
        const studentIndex = allResults.findIndex((r) => r.studentId === studentId)
        if (studentIndex !== -1) {
          rank = studentIndex + 1
        }

        setResult({
          studentName: studentData.name,
          rollNumber,
          grade,
          examTerm: resultData.examName,
          totalMarks: resultData.totalMarks,
          percentage: resultData.percentage,
          grade: resultData.grade,
          result: resultData.result,
          rank: rank,
          attendance: {
            present: presentDays,
            total: totalDays,
            percentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
          },
          subjects: resultData.subjects,
        })

        setExamTerm(resultData.examName)
      }
    } catch (error: any) {
      console.error("Error fetching result:", error)
      setError(`Error fetching result: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const currentDate = new Date()
    const formattedDate = format(currentDate, "dd/MM/yyyy")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Grade Sheet - ${result.studentName}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .report-card {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ddd;
            padding: 20px;
          }
          .school-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 10px;
          }
          .school-name {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin: 0;
          }
          .school-address {
            font-size: 14px;
            margin: 5px 0;
          }
          .report-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 15px 0;
            text-transform: uppercase;
          }
          .student-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border: 1px solid #eee;
            padding: 10px;
            background-color: #f9f9f9;
          }
          .student-info-left, .student-info-right {
            flex: 1;
          }
          .info-row {
            margin-bottom: 5px;
          }
          .info-label {
            font-weight: bold;
            display: inline-block;
            width: 120px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .summary-section {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
          }
          .summary-box {
            border: 1px solid #ddd;
            padding: 10px;
            flex: 1;
            margin: 0 5px;
            background-color: #f9f9f9;
          }
          .summary-title {
            font-weight: bold;
            margin-bottom: 5px;
            text-align: center;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .summary-content {
            text-align: center;
            font-size: 18px;
            padding: 10px 0;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
          }
          .signature-box {
            text-align: center;
            flex: 1;
            margin: 0 20px;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
          .grade-a-plus {
            background-color: #d4edda;
          }
          .grade-a {
            background-color: #d1ecf1;
          }
          .grade-b-plus {
            background-color: #fff3cd;
          }
          .grade-b {
            background-color: #f8d7da;
          }
          .rank-badge {
            display: inline-block;
            padding: 3px 10px;
            background-color: #1e40af;
            color: white;
            border-radius: 15px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="report-card">
          <div class="school-header">
            <h1 class="school-name">SAJHA BOARDING SCHOOL</h1>
            <p class="school-address">Kathmandu, Nepal</p>
            <p class="school-address">Phone: 01-1234567, Email: info@sajhaboarding.edu.np</p>
          </div>
          
          <div class="report-title">STUDENT GRADE SHEET - ${examTerm}</div>
          
          <div class="student-info">
            <div class="student-info-left">
              <div class="info-row"><span class="info-label">Student Name:</span> ${result.studentName}</div>
              <div class="info-row"><span class="info-label">Roll Number:</span> ${result.rollNumber}</div>
              <div class="info-row"><span class="info-label">Grade:</span> ${result.grade}</div>
            </div>
            <div class="student-info-right">
              <div class="info-row"><span class="info-label">Academic Year:</span> 2025-2026</div>
              <div class="info-row"><span class="info-label">Exam Term:</span> ${examTerm}</div>
              <div class="info-row"><span class="info-label">Date:</span> ${formattedDate}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>S.N.</th>
                <th>Subject</th>
                <th>Full Marks</th>
                <th>Obtained Marks</th>
                <th>Grade</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${result.subjects
                .map(
                  (subject, index) => `
                <tr class="${subject.grade === "A+" ? "grade-a-plus" : subject.grade === "A" ? "grade-a" : subject.grade === "B+" ? "grade-b-plus" : ""}">
                  <td>${index + 1}</td>
                  <td>${subject.name}</td>
                  <td>${subject.fullMarks}</td>
                  <td>${subject.marks}</td>
                  <td>${subject.grade}</td>
                  <td>${subject.remarks || ""}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="summary-section">
            <div class="summary-box">
              <div class="summary-title">Total Marks</div>
              <div class="summary-content">${result.totalMarks}/${result.subjects.reduce((sum, subject) => sum + subject.fullMarks, 0)}</div>
            </div>
            <div class="summary-box">
              <div class="summary-title">Percentage</div>
              <div class="summary-content">${result.percentage.toFixed(2)}%</div>
            </div>
            <div class="summary-box">
              <div class="summary-title">Grade</div>
              <div class="summary-content">${result.grade}</div>
            </div>
            <div class="summary-box">
              <div class="summary-title">Rank</div>
              <div class="summary-content"><span class="rank-badge">${result.rank}</span></div>
            </div>
          </div>
          
          <div class="summary-section">
            <div class="summary-box">
              <div class="summary-title">Attendance</div>
              <div class="summary-content">${result.attendance.present}/${result.attendance.total} (${result.attendance.percentage.toFixed(2)}%)</div>
            </div>
            <div class="summary-box">
              <div class="summary-title">Result</div>
              <div class="summary-content">${result.result}</div>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Class Teacher</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Principal</div>
            </div>
          </div>
          
          <div class="footer">
            <p>This is a computer-generated grade sheet and does not require a signature.</p>
            <p>© ${new Date().getFullYear()} Sajha Boarding School. All rights reserved.</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `)

    printWindow.document.close()
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center mb-4 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sajha Boarding School</CardTitle>
            <CardDescription>Student Result Portal</CardDescription>
          </CardHeader>

          {!result ? (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    placeholder="Enter your roll number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger id="grade">
                      <SelectValue placeholder="Select your grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
              </CardContent>

              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "View Result"
                  )}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">{result.studentName}</h3>
                <p className="text-sm text-muted-foreground">
                  Roll No: {result.rollNumber} | Grade: {result.grade}
                </p>
                <p className="text-sm font-medium mt-1">{examTerm}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg flex flex-col items-center">
                  <Award className="h-5 w-5 text-blue-500 mb-1" />
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <p className="text-xl font-bold">{result.rank}</p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg flex flex-col items-center">
                  <BookOpen className="h-5 w-5 text-green-500 mb-1" />
                  <p className="text-sm text-muted-foreground">Grade</p>
                  <p className="text-xl font-bold">{result.grade}</p>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg flex flex-col items-center">
                  <Calendar className="h-5 w-5 text-amber-500 mb-1" />
                  <p className="text-sm text-muted-foreground">Attendance</p>
                  <p className="text-xl font-bold">{result.attendance.percentage.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">
                    ({result.attendance.present}/{result.attendance.total})
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Subject</th>
                      <th className="border p-2 text-left">Marks</th>
                      <th className="border p-2 text-left">Full Marks</th>
                      <th className="border p-2 text-left">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subjects.map((subject: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="border p-2">{subject.name}</td>
                        <td className="border p-2">{subject.marks}</td>
                        <td className="border p-2">{subject.fullMarks}</td>
                        <td className="border p-2">{subject.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Marks</p>
                    <p className="font-medium">{result.totalMarks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p className="font-medium">{result.percentage.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Grade</p>
                    <p className="font-medium">{result.grade}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Result</p>
                    <p className="font-medium">{result.result}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null)
                    setError(null)
                  }}
                >
                  Back
                </Button>
                <Button onClick={handlePrint}>Print Grade Sheet</Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
