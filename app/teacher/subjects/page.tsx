"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { ArrowLeft, Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Update the Subject interface to include creditHours
interface Subject {
  id: string
  name: string
  code: string
  fullMarks: number
  passMarks: number
  hasPractical: boolean
  theoryMarks: number
  practicalMarks: number
  description: string
  creditHours: number
}

export default function SubjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newSubjectCode, setNewSubjectCode] = useState("")
  const [newFullMarks, setNewFullMarks] = useState("100")
  const [newPassMarks, setNewPassMarks] = useState("40")
  const [newHasPractical, setNewHasPractical] = useState(false)
  const [newTheoryMarks, setNewTheoryMarks] = useState("100")
  const [newPracticalMarks, setNewPracticalMarks] = useState("0")
  const [newSubjectDescription, setNewSubjectDescription] = useState("")
  // Add a new state for credit hours in the component
  const [newCreditHours, setNewCreditHours] = useState("3")
  const [editCreditHours, setEditCreditHours] = useState("3")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editCode, setEditCode] = useState("")
  const [editFullMarks, setEditFullMarks] = useState("")
  const [editPassMarks, setEditPassMarks] = useState("")
  const [editHasPractical, setEditHasPractical] = useState(false)
  const [editTheoryMarks, setEditTheoryMarks] = useState("")
  const [editPracticalMarks, setEditPracticalMarks] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null)

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    fetchSubjects()
  }, [teacherId, router])

  // Update theory and practical marks when hasPractical changes
  useEffect(() => {
    if (newHasPractical) {
      setNewTheoryMarks("75")
      setNewPracticalMarks("25")
    } else {
      setNewTheoryMarks("100")
      setNewPracticalMarks("0")
    }
  }, [newHasPractical])

  // Update edit theory and practical marks when editHasPractical changes
  useEffect(() => {
    if (editHasPractical) {
      setEditTheoryMarks("75")
      setEditPracticalMarks("25")
    } else {
      setEditTheoryMarks("100")
      setEditPracticalMarks("0")
    }
  }, [editHasPractical])

  const fetchSubjects = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo subjects
        // Update the fetchSubjects function to include creditHours in demo subjects
        const demoSubjects: Subject[] = [
          {
            id: "subject1",
            name: "English",
            code: "ENG",
            fullMarks: 100,
            passMarks: 40,
            hasPractical: false,
            theoryMarks: 100,
            practicalMarks: 0,
            description: "English language and literature",
            creditHours: 3,
          },
          {
            id: "subject2",
            name: "Mathematics",
            code: "MATH",
            fullMarks: 100,
            passMarks: 40,
            hasPractical: false,
            theoryMarks: 100,
            practicalMarks: 0,
            description: "Mathematics and arithmetic",
            creditHours: 4,
          },
          {
            id: "subject3",
            name: "Science",
            code: "SCI",
            fullMarks: 100,
            passMarks: 40,
            hasPractical: true,
            theoryMarks: 75,
            practicalMarks: 25,
            description: "General science with lab work",
            creditHours: 4,
          },
        ]
        setSubjects(demoSubjects)
      } else {
        // Fetch real subjects from Firestore
        const subjectsSnapshot = await getDocs(collection(db, "subjects"))
        const subjectsList: Subject[] = []
        subjectsSnapshot.forEach((doc) => {
          subjectsList.push({
            id: doc.id,
            ...(doc.data() as Omit<Subject, "id">),
          })
        })
        setSubjects(subjectsList)
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      toast({
        title: "Error",
        description: "Failed to load subjects. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fix the handleAddSubject function to properly handle validation and include creditHours
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newSubjectName.trim()) {
      toast({
        title: "Error",
        description: "Subject name is required",
        variant: "destructive",
      })
      return
    }

    if (!newSubjectCode.trim()) {
      toast({
        title: "Error",
        description: "Subject code is required",
        variant: "destructive",
      })
      return
    }

    const fullMarks = Number.parseInt(newFullMarks)
    const passMarks = Number.parseInt(newPassMarks)
    const theoryMarks = Number.parseInt(newTheoryMarks)
    const practicalMarks = Number.parseInt(newPracticalMarks)
    const creditHours = Number.parseInt(newCreditHours)

    if (isNaN(fullMarks) || fullMarks <= 0) {
      toast({
        title: "Error",
        description: "Full marks must be a positive number",
        variant: "destructive",
      })
      return
    }

    if (isNaN(passMarks) || passMarks <= 0 || passMarks >= fullMarks) {
      toast({
        title: "Error",
        description: "Pass marks must be a positive number less than full marks",
        variant: "destructive",
      })
      return
    }

    if (isNaN(theoryMarks) || theoryMarks < 0) {
      toast({
        title: "Error",
        description: "Theory marks must be a non-negative number",
        variant: "destructive",
      })
      return
    }

    if (isNaN(practicalMarks) || practicalMarks < 0) {
      toast({
        title: "Error",
        description: "Practical marks must be a non-negative number",
        variant: "destructive",
      })
      return
    }

    if (theoryMarks + practicalMarks !== fullMarks) {
      toast({
        title: "Error",
        description: "Theory marks + practical marks must equal full marks",
        variant: "destructive",
      })
      return
    }

    if (isNaN(creditHours) || creditHours <= 0) {
      toast({
        title: "Error",
        description: "Credit hours must be a positive number",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Add to demo subjects
        const newSubject: Subject = {
          id: `subject${Date.now()}`,
          name: newSubjectName,
          code: newSubjectCode,
          fullMarks,
          passMarks,
          hasPractical: newHasPractical,
          theoryMarks,
          practicalMarks,
          description: newSubjectDescription,
          creditHours,
        }
        setSubjects([...subjects, newSubject])
        toast({
          title: "Success",
          description: "Subject added successfully (Demo Mode)",
        })
      } else {
        // Add to Firestore
        const docRef = await addDoc(collection(db, "subjects"), {
          name: newSubjectName,
          code: newSubjectCode,
          fullMarks,
          passMarks,
          hasPractical: newHasPractical,
          theoryMarks,
          practicalMarks,
          description: newSubjectDescription,
          creditHours,
        })

        const newSubject: Subject = {
          id: docRef.id,
          name: newSubjectName,
          code: newSubjectCode,
          fullMarks,
          passMarks,
          hasPractical: newHasPractical,
          theoryMarks,
          practicalMarks,
          description: newSubjectDescription,
          creditHours,
        }

        setSubjects([...subjects, newSubject])
        toast({
          title: "Success",
          description: "Subject added successfully",
        })
      }

      // Reset form
      setNewSubjectName("")
      setNewSubjectCode("")
      setNewFullMarks("100")
      setNewPassMarks("40")
      setNewHasPractical(false)
      setNewTheoryMarks("100")
      setNewPracticalMarks("0")
      setNewSubjectDescription("")
      setNewCreditHours("3")
    } catch (error) {
      console.error("Error adding subject:", error)
      toast({
        title: "Error",
        description: "Failed to add subject. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update the openEditDialog function to include creditHours
  const openEditDialog = (subject: Subject) => {
    setSubjectToEdit(subject)
    setEditName(subject.name)
    setEditCode(subject.code)
    setEditFullMarks(subject.fullMarks.toString())
    setEditPassMarks(subject.passMarks.toString())
    setEditHasPractical(subject.hasPractical)
    setEditTheoryMarks(subject.theoryMarks.toString())
    setEditPracticalMarks(subject.practicalMarks.toString())
    setEditDescription(subject.description)
    setEditCreditHours(subject.creditHours?.toString() || "3")
    setEditDialogOpen(true)
  }

  // Update the handleEditSubject function to include creditHours
  const handleEditSubject = async () => {
    if (!subjectToEdit) return

    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Subject name is required",
        variant: "destructive",
      })
      return
    }

    if (!editCode.trim()) {
      toast({
        title: "Error",
        description: "Subject code is required",
        variant: "destructive",
      })
      return
    }

    const fullMarks = Number.parseInt(editFullMarks)
    const passMarks = Number.parseInt(editPassMarks)
    const theoryMarks = Number.parseInt(editTheoryMarks)
    const practicalMarks = Number.parseInt(editPracticalMarks)
    const creditHours = Number.parseInt(editCreditHours)

    if (isNaN(fullMarks) || fullMarks <= 0) {
      toast({
        title: "Error",
        description: "Full marks must be a positive number",
        variant: "destructive",
      })
      return
    }

    if (isNaN(passMarks) || passMarks <= 0 || passMarks >= fullMarks) {
      toast({
        title: "Error",
        description: "Pass marks must be a positive number less than full marks",
        variant: "destructive",
      })
      return
    }

    if (isNaN(theoryMarks) || theoryMarks < 0) {
      toast({
        title: "Error",
        description: "Theory marks must be a non-negative number",
        variant: "destructive",
      })
      return
    }

    if (isNaN(practicalMarks) || practicalMarks < 0) {
      toast({
        title: "Error",
        description: "Practical marks must be a non-negative number",
        variant: "destructive",
      })
      return
    }

    if (theoryMarks + practicalMarks !== fullMarks) {
      toast({
        title: "Error",
        description: "Theory marks + practical marks must equal full marks",
        variant: "destructive",
      })
      return
    }

    if (isNaN(creditHours) || creditHours <= 0) {
      toast({
        title: "Error",
        description: "Credit hours must be a positive number",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Update in demo subjects
        const updatedSubjects = subjects.map((subject) =>
          subject.id === subjectToEdit.id
            ? {
                ...subject,
                name: editName,
                code: editCode,
                fullMarks,
                passMarks,
                hasPractical: editHasPractical,
                theoryMarks,
                practicalMarks,
                description: editDescription,
                creditHours,
              }
            : subject,
        )
        setSubjects(updatedSubjects)
        toast({
          title: "Success",
          description: "Subject updated successfully (Demo Mode)",
        })
      } else {
        // Update in Firestore
        const subjectRef = doc(db, "subjects", subjectToEdit.id)
        await updateDoc(subjectRef, {
          name: editName,
          code: editCode,
          fullMarks,
          passMarks,
          hasPractical: editHasPractical,
          theoryMarks,
          practicalMarks,
          description: editDescription,
          creditHours,
        })

        // Update local state
        const updatedSubjects = subjects.map((subject) =>
          subject.id === subjectToEdit.id
            ? {
                ...subject,
                name: editName,
                code: editCode,
                fullMarks,
                passMarks,
                hasPractical: editHasPractical,
                theoryMarks,
                practicalMarks,
                description: editDescription,
                creditHours,
              }
            : subject,
        )
        setSubjects(updatedSubjects)
        toast({
          title: "Success",
          description: "Subject updated successfully",
        })
      }

      // Close dialog
      setEditDialogOpen(false)
      setSubjectToEdit(null)
    } catch (error) {
      console.error("Error updating subject:", error)
      toast({
        title: "Error",
        description: "Failed to update subject. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = (subject: Subject) => {
    setSubjectToDelete(subject)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!subjectToDelete) return

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Remove from demo subjects
        const filteredSubjects = subjects.filter((subject) => subject.id !== subjectToDelete.id)
        setSubjects(filteredSubjects)
        toast({
          title: "Success",
          description: "Subject deleted successfully (Demo Mode)",
        })
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "subjects", subjectToDelete.id))

        // Update local state
        const filteredSubjects = subjects.filter((subject) => subject.id !== subjectToDelete.id)
        setSubjects(filteredSubjects)
        toast({
          title: "Success",
          description: "Subject deleted successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting subject:", error)
      toast({
        title: "Error",
        description: "Failed to delete subject. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setSubjectToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-5xl">
      <Toaster />

      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Manage Subjects</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Add New Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subjectName">Subject Name</Label>
                  <Input
                    id="subjectName"
                    placeholder="e.g., English, Mathematics"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjectCode">Subject Code</Label>
                  <Input
                    id="subjectCode"
                    placeholder="e.g., ENG, MATH"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullMarks">Full Marks</Label>
                    <Input
                      id="fullMarks"
                      type="number"
                      value={newFullMarks}
                      onChange={(e) => setNewFullMarks(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passMarks">Pass Marks</Label>
                    <Input
                      id="passMarks"
                      type="number"
                      value={newPassMarks}
                      onChange={(e) => setNewPassMarks(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasPractical"
                    checked={newHasPractical}
                    onCheckedChange={(checked) => setNewHasPractical(checked === true)}
                  />
                  <Label htmlFor="hasPractical">Has Practical Component</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theoryMarks">Theory Marks</Label>
                    <Input
                      id="theoryMarks"
                      type="number"
                      value={newTheoryMarks}
                      onChange={(e) => setNewTheoryMarks(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="practicalMarks">Practical Marks</Label>
                    <Input
                      id="practicalMarks"
                      type="number"
                      value={newPracticalMarks}
                      onChange={(e) => setNewPracticalMarks(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjectDescription">Description (Optional)</Label>
                  <Input
                    id="subjectDescription"
                    placeholder="Description of this subject"
                    value={newSubjectDescription}
                    onChange={(e) => setNewSubjectDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditHours">Credit Hours</Label>
                  <Input
                    id="creditHours"
                    type="number"
                    value={newCreditHours}
                    onChange={(e) => setNewCreditHours(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Subject
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Practical</TableHead>
                        <TableHead>Credit Hours</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell>{subject.code}</TableCell>
                          <TableCell>
                            <div>FM: {subject.fullMarks}</div>
                            <div className="text-sm text-muted-foreground">PM: {subject.passMarks}</div>
                          </TableCell>
                          <TableCell>
                            {subject.hasPractical ? (
                              <div>
                                <Badge variant="outline" className="bg-green-50">
                                  Yes
                                </Badge>
                                <div className="text-xs mt-1">
                                  <span>T: {subject.theoryMarks}</span> | <span>P: {subject.practicalMarks}</span>
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50">
                                No
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{subject.creditHours || "-"}</TableCell>
                          <TableCell>{subject.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(subject)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => confirmDelete(subject)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No subjects found. Add your first subject.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Subject Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editSubjectName">Subject Name</Label>
                <Input id="editSubjectName" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editSubjectCode">Subject Code</Label>
                <Input id="editSubjectCode" value={editCode} onChange={(e) => setEditCode(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFullMarks">Full Marks</Label>
                <Input
                  id="editFullMarks"
                  type="number"
                  value={editFullMarks}
                  onChange={(e) => setEditFullMarks(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPassMarks">Pass Marks</Label>
                <Input
                  id="editPassMarks"
                  type="number"
                  value={editPassMarks}
                  onChange={(e) => setEditPassMarks(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="editHasPractical"
                checked={editHasPractical}
                onCheckedChange={(checked) => setEditHasPractical(checked === true)}
              />
              <Label htmlFor="editHasPractical">Has Practical Component</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTheoryMarks">Theory Marks</Label>
                <Input
                  id="editTheoryMarks"
                  type="number"
                  value={editTheoryMarks}
                  onChange={(e) => setEditTheoryMarks(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPracticalMarks">Practical Marks</Label>
                <Input
                  id="editPracticalMarks"
                  type="number"
                  value={editPracticalMarks}
                  onChange={(e) => setEditPracticalMarks(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSubjectDescription">Description (Optional)</Label>
              <Input
                id="editSubjectDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCreditHours">Credit Hours</Label>
              <Input
                id="editCreditHours"
                type="number"
                value={editCreditHours}
                onChange={(e) => setEditCreditHours(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubject}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the subject "{subjectToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
