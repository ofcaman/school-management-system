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

interface Section {
  id: string
  name: string
  description: string
}

interface Class {
  id: string
  name: string
  displayName: string
  sections: string[]
  description: string
}

export default function ClassesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [newClassName, setNewClassName] = useState("")
  const [newClassDisplayName, setNewClassDisplayName] = useState("")
  const [newClassDescription, setNewClassDescription] = useState("")
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSections, setEditSections] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<Class | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [classToEdit, setClassToEdit] = useState<Class | null>(null)

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    fetchData()
  }, [teacherId, router])

  const fetchData = async () => {
    setLoading(true)
    try {
      await fetchSections()
      await fetchClasses()
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSections = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo sections
        const demoSections: Section[] = [
          { id: "section1", name: "A", description: "Section A for all classes" },
          { id: "section2", name: "B", description: "Section B for all classes" },
          { id: "section3", name: "C", description: "Section C for higher classes only" },
        ]
        setSections(demoSections)
      } else {
        // Fetch real sections from Firestore
        const sectionsSnapshot = await getDocs(collection(db, "sections"))
        const sectionsList: Section[] = []
        sectionsSnapshot.forEach((doc) => {
          sectionsList.push({
            id: doc.id,
            ...(doc.data() as Omit<Section, "id">),
          })
        })
        setSections(sectionsList)
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      throw error
    }
  }

  const fetchClasses = async () => {
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Load demo classes
        const demoClasses: Class[] = [
          {
            id: "class1",
            name: "1",
            displayName: "Class 1",
            sections: ["section1", "section2"],
            description: "First grade",
          },
          {
            id: "class2",
            name: "2",
            displayName: "Class 2",
            sections: ["section1", "section2", "section3"],
            description: "Second grade",
          },
          {
            id: "class3",
            name: "LKG",
            displayName: "LKG",
            sections: ["section1", "section2"],
            description: "Lower Kindergarten",
          },
        ]
        setClasses(demoClasses)
      } else {
        // Fetch real classes from Firestore
        const classesSnapshot = await getDocs(collection(db, "classes"))
        const classesList: Class[] = []
        classesSnapshot.forEach((doc) => {
          classesList.push({
            id: doc.id,
            ...(doc.data() as Omit<Class, "id">),
          })
        })
        setClasses(classesList)
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      throw error
    }
  }

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newClassName.trim()) {
      toast({
        title: "Error",
        description: "Class name is required",
        variant: "destructive",
      })
      return
    }

    if (!newClassDisplayName.trim()) {
      toast({
        title: "Error",
        description: "Display name is required",
        variant: "destructive",
      })
      return
    }

    if (selectedSections.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one section",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Add to demo classes
        const newClass: Class = {
          id: `class${Date.now()}`,
          name: newClassName,
          displayName: newClassDisplayName,
          sections: selectedSections,
          description: newClassDescription,
        }
        setClasses([...classes, newClass])
        toast({
          title: "Success",
          description: "Class added successfully (Demo Mode)",
        })
      } else {
        // Add to Firestore
        const docRef = await addDoc(collection(db, "classes"), {
          name: newClassName,
          displayName: newClassDisplayName,
          sections: selectedSections,
          description: newClassDescription,
        })

        const newClass: Class = {
          id: docRef.id,
          name: newClassName,
          displayName: newClassDisplayName,
          sections: selectedSections,
          description: newClassDescription,
        }

        setClasses([...classes, newClass])
        toast({
          title: "Success",
          description: "Class added successfully",
        })
      }

      // Reset form
      setNewClassName("")
      setNewClassDisplayName("")
      setNewClassDescription("")
      setSelectedSections([])
    } catch (error) {
      console.error("Error adding class:", error)
      toast({
        title: "Error",
        description: "Failed to add class. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (classItem: Class) => {
    setClassToEdit(classItem)
    setEditName(classItem.name)
    setEditDisplayName(classItem.displayName)
    setEditDescription(classItem.description)
    setEditSections(classItem.sections)
    setEditDialogOpen(true)
  }

  const handleEditClass = async () => {
    if (!classToEdit) return

    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Class name is required",
        variant: "destructive",
      })
      return
    }

    if (!editDisplayName.trim()) {
      toast({
        title: "Error",
        description: "Display name is required",
        variant: "destructive",
      })
      return
    }

    if (editSections.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one section",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Update in demo classes
        const updatedClasses = classes.map((cls) =>
          cls.id === classToEdit.id
            ? {
                ...cls,
                name: editName,
                displayName: editDisplayName,
                description: editDescription,
                sections: editSections,
              }
            : cls,
        )
        setClasses(updatedClasses)
        toast({
          title: "Success",
          description: "Class updated successfully (Demo Mode)",
        })
      } else {
        // Update in Firestore
        const classRef = doc(db, "classes", classToEdit.id)
        await updateDoc(classRef, {
          name: editName,
          displayName: editDisplayName,
          description: editDescription,
          sections: editSections,
        })

        // Update local state
        const updatedClasses = classes.map((cls) =>
          cls.id === classToEdit.id
            ? {
                ...cls,
                name: editName,
                displayName: editDisplayName,
                description: editDescription,
                sections: editSections,
              }
            : cls,
        )
        setClasses(updatedClasses)
        toast({
          title: "Success",
          description: "Class updated successfully",
        })
      }

      // Close dialog
      setEditDialogOpen(false)
      setClassToEdit(null)
    } catch (error) {
      console.error("Error updating class:", error)
      toast({
        title: "Error",
        description: "Failed to update class. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = (classItem: Class) => {
    setClassToDelete(classItem)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!classToDelete) return

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Remove from demo classes
        const filteredClasses = classes.filter((cls) => cls.id !== classToDelete.id)
        setClasses(filteredClasses)
        toast({
          title: "Success",
          description: "Class deleted successfully (Demo Mode)",
        })
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "classes", classToDelete.id))

        // Update local state
        const filteredClasses = classes.filter((cls) => cls.id !== classToDelete.id)
        setClasses(filteredClasses)
        toast({
          title: "Success",
          description: "Class deleted successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting class:", error)
      toast({
        title: "Error",
        description: "Failed to delete class. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setClassToDelete(null)
    }
  }

  const toggleSectionSelection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    )
  }

  const toggleEditSectionSelection = (sectionId: string) => {
    setEditSections((prev) => (prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]))
  }

  const getSectionNameById = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    return section ? section.name : "Unknown"
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
        <h1 className="text-2xl font-bold">Manage Classes</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Add New Class</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddClass} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    placeholder="e.g., 1, 2, LKG, UKG"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classDisplayName">Display Name</Label>
                  <Input
                    id="classDisplayName"
                    placeholder="e.g., Class 1, LKG"
                    value={newClassDisplayName}
                    onChange={(e) => setNewClassDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classDescription">Description (Optional)</Label>
                  <Input
                    id="classDescription"
                    placeholder="Description of this class"
                    value={newClassDescription}
                    onChange={(e) => setNewClassDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assign Sections</Label>
                  {sections.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {sections.map((section) => (
                        <div key={section.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`section-${section.id}`}
                            checked={selectedSections.includes(section.id)}
                            onCheckedChange={() => toggleSectionSelection(section.id)}
                          />
                          <Label htmlFor={`section-${section.id}`} className="cursor-pointer">
                            Section {section.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No sections available. Please add sections first.
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || sections.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Class
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
              <CardTitle>All Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {classes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((classItem) => (
                      <TableRow key={classItem.id}>
                        <TableCell>{classItem.name}</TableCell>
                        <TableCell>{classItem.displayName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {classItem.sections.map((sectionId) => (
                              <Badge key={sectionId} variant="outline">
                                {getSectionNameById(sectionId)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{classItem.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(classItem)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => confirmDelete(classItem)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No classes found. Add your first class.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Class Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editClassName">Class Name</Label>
              <Input id="editClassName" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editClassDisplayName">Display Name</Label>
              <Input
                id="editClassDisplayName"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editClassDescription">Description (Optional)</Label>
              <Input
                id="editClassDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign Sections</Label>
              {sections.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {sections.map((section) => (
                    <div key={section.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-section-${section.id}`}
                        checked={editSections.includes(section.id)}
                        onCheckedChange={() => toggleEditSectionSelection(section.id)}
                      />
                      <Label htmlFor={`edit-section-${section.id}`} className="cursor-pointer">
                        Section {section.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No sections available.</div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditClass}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the class "{classToDelete?.displayName}". This action cannot be undone.
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
