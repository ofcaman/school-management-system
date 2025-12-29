"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Save, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
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

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface Section {
  id: string
  name: string
  description: string
}

export default function SectionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<Section[]>([])
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionDescription, setNewSectionDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null)

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/login")
      return
    }

    fetchSections()
  }, [teacherId, router])

  const fetchSections = async () => {
    setLoading(true)
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
      toast({
        title: "Error",
        description: "Failed to load sections. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newSectionName.trim()) {
      toast({
        title: "Error",
        description: "Section name is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Add to demo sections
        const newSection: Section = {
          id: `section${Date.now()}`,
          name: newSectionName,
          description: newSectionDescription,
        }
        setSections([...sections, newSection])
        toast({
          title: "Success",
          description: "Section added successfully (Demo Mode)",
        })
      } else {
        // Add to Firestore
        const docRef = await addDoc(collection(db, "sections"), {
          name: newSectionName,
          description: newSectionDescription,
        })

        const newSection: Section = {
          id: docRef.id,
          name: newSectionName,
          description: newSectionDescription,
        }

        setSections([...sections, newSection])
        toast({
          title: "Success",
          description: "Section added successfully",
        })
      }

      // Reset form
      setNewSectionName("")
      setNewSectionDescription("")
    } catch (error) {
      console.error("Error adding section:", error)
      toast({
        title: "Error",
        description: "Failed to add section. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditing = (section: Section) => {
    setEditingSectionId(section.id)
    setEditName(section.name)
    setEditDescription(section.description)
  }

  const cancelEditing = () => {
    setEditingSectionId(null)
    setEditName("")
    setEditDescription("")
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Section name is required",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Update in demo sections
        const updatedSections = sections.map((section) =>
          section.id === id ? { ...section, name: editName, description: editDescription } : section,
        )
        setSections(updatedSections)
        toast({
          title: "Success",
          description: "Section updated successfully (Demo Mode)",
        })
      } else {
        // Update in Firestore
        const sectionRef = doc(db, "sections", id)
        await updateDoc(sectionRef, {
          name: editName,
          description: editDescription,
        })

        // Update local state
        const updatedSections = sections.map((section) =>
          section.id === id ? { ...section, name: editName, description: editDescription } : section,
        )
        setSections(updatedSections)
        toast({
          title: "Success",
          description: "Section updated successfully",
        })
      }

      // Reset editing state
      setEditingSectionId(null)
      setEditName("")
      setEditDescription("")
    } catch (error) {
      console.error("Error updating section:", error)
      toast({
        title: "Error",
        description: "Failed to update section. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = (section: Section) => {
    setSectionToDelete(section)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!sectionToDelete) return

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // Remove from demo sections
        const filteredSections = sections.filter((section) => section.id !== sectionToDelete.id)
        setSections(filteredSections)
        toast({
          title: "Success",
          description: "Section deleted successfully (Demo Mode)",
        })
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "sections", sectionToDelete.id))

        // Update local state
        const filteredSections = sections.filter((section) => section.id !== sectionToDelete.id)
        setSections(filteredSections)
        toast({
          title: "Success",
          description: "Section deleted successfully",
        })
      }
    } catch (error) {
      console.error("Error deleting section:", error)
      toast({
        title: "Error",
        description: "Failed to delete section. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setSectionToDelete(null)
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
        <h1 className="text-2xl font-bold">Manage Sections</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Add New Section</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSection} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sectionName">Section Name</Label>
                  <Input
                    id="sectionName"
                    placeholder="e.g., A, B, C"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sectionDescription">Description (Optional)</Label>
                  <Input
                    id="sectionDescription"
                    placeholder="Description of this section"
                    value={newSectionDescription}
                    onChange={(e) => setNewSectionDescription(e.target.value)}
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
                      Add Section
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
              <CardTitle>All Sections</CardTitle>
            </CardHeader>
            <CardContent>
              {sections.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.map((section) => (
                      <TableRow key={section.id}>
                        <TableCell>
                          {editingSectionId === section.id ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="max-w-[150px]"
                            />
                          ) : (
                            section.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSectionId === section.id ? (
                            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                          ) : (
                            section.description || "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingSectionId === section.id ? (
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => saveEdit(section.id)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={cancelEditing}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => startEditing(section)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => confirmDelete(section)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No sections found. Add your first section.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the section "{sectionToDelete?.name}". This action cannot be undone.
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
