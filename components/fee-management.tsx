"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { Loader2, Plus, Edit, Trash2, Settings, Bus, GraduationCap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

export interface MonthlyFee {
  id: string
  grade: string
  gradeId?: string
  gradeDisplayName: string
  section?: string
  sectionId?: string
  sectionDisplayName?: string
  monthlyAmount: number
  createdAt: Date
  updatedAt: Date
}

export interface TransportationFee {
  id: string
  route: string
  routeDisplayName: string
  monthlyAmount: number
  createdAt: Date
  updatedAt: Date
}

interface FeeManagementProps {
  onFeesUpdated?: () => void
}

export default function FeeManagement({ onFeesUpdated }: FeeManagementProps) {
  const [fees, setFees] = useState<MonthlyFee[]>([])
  const [transportationFees, setTransportationFees] = useState<TransportationFee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTransportDialogOpen, setIsTransportDialogOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<MonthlyFee | null>(null)
  const [editingTransportFee, setEditingTransportFee] = useState<TransportationFee | null>(null)

  // Form state for monthly fees
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedGradeId, setSelectedGradeId] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [monthlyAmount, setMonthlyAmount] = useState("")
  const [error, setError] = useState("")

  // Form state for transportation fees
  const [selectedRoute, setSelectedRoute] = useState("")
  const [transportAmount, setTransportAmount] = useState("")
  const [transportError, setTransportError] = useState("")

  // Classes and sections state
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; name: string; displayName: string }>>([])
  const [availableSections, setAvailableSections] = useState<Array<{ id: string; name: string }>>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [useSectionFiltering, setUseSectionFiltering] = useState(false)

  // Available bus routes
  const busRoutes = ["Route 1", "Route 2", "Route 3", "Route 4", "Route 5", "Route A", "Route B", "Route C"]

  // Hardcoded classes as fallback
  const hardcodedClasses = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

  useEffect(() => {
    loadFees()
    loadTransportationFees()
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedGradeId) {
      fetchSections()
    }
  }, [selectedGradeId])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        const demoClasses = hardcodedClasses.map((cls) => ({
          id: cls.toLowerCase().replace(/\./g, ""),
          name: cls,
          displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
        }))
        setAvailableClasses(demoClasses)
        setUseSectionFiltering(false)
      } else {
        const classesRef = collection(db, "classes")
        const querySnapshot = await getDocs(classesRef)

        const classesData: { id: string; name: string; displayName: string }[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          classesData.push({
            id: doc.id,
            name: data.name || doc.id,
            displayName: data.displayName || `Class ${data.name || doc.id}`,
          })
        })

        if (classesData.length > 0) {
          classesData.sort((a, b) => {
            const order = ["pg", "nursery", "lkg", "ukg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
            const aIndex = order.indexOf(a.name.toLowerCase().replace(/\./g, ""))
            const bIndex = order.indexOf(b.name.toLowerCase().replace(/\./g, ""))
            return aIndex - bIndex
          })

          setAvailableClasses(classesData)
          setUseSectionFiltering(true)
        } else {
          const defaultClasses = hardcodedClasses.map((cls) => ({
            id: cls.toLowerCase().replace(/\./g, ""),
            name: cls,
            displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
          }))
          setAvailableClasses(defaultClasses)
          setUseSectionFiltering(false)
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
      const defaultClasses = hardcodedClasses.map((cls) => ({
        id: cls.toLowerCase().replace(/\./g, ""),
        name: cls,
        displayName: cls.includes("P.G") || cls.includes("LKG") || cls.includes("UKG") ? cls : `Class ${cls}`,
      }))
      setAvailableClasses(defaultClasses)
      setUseSectionFiltering(false)
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSections = async () => {
    if (!selectedGradeId) return

    setLoadingSections(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        const demoSections = [
          { id: "A", name: "A" },
          { id: "B", name: "B" },
          { id: "C", name: "C" },
          { id: "D", name: "D" },
        ]
        setAvailableSections(demoSections)
      } else {
        const classDoc = await getDoc(doc(db, "classes", selectedGradeId))

        if (!classDoc.exists()) {
          setAvailableSections([])
          return
        }

        const classData = classDoc.data()
        const sectionIds = classData.sections || []

        if (!sectionIds.length) {
          const defaultSections = [
            { id: "A", name: "A" },
            { id: "B", name: "B" },
            { id: "C", name: "C" },
            { id: "D", name: "D" },
          ]
          setAvailableSections(defaultSections)
          return
        }

        const sectionsData: Array<{ id: string; name: string }> = []

        for (const sectionId of sectionIds) {
          try {
            if (typeof sectionId === "string") {
              if (sectionId.length > 10) {
                const sectionDoc = await getDoc(doc(db, "sections", sectionId))
                if (sectionDoc.exists()) {
                  const sectionData = sectionDoc.data()
                  sectionsData.push({
                    id: sectionId,
                    name: sectionData.name || "Unknown Section",
                  })
                } else {
                  sectionsData.push({
                    id: sectionId,
                    name: String.fromCharCode(65 + sectionsData.length),
                  })
                }
              } else {
                sectionsData.push({
                  id: sectionId,
                  name: sectionId,
                })
              }
            } else if (sectionId && typeof sectionId === "object" && sectionId.name) {
              sectionsData.push({
                id: sectionId.id || `section-${sectionsData.length}`,
                name: sectionId.name,
              })
            } else {
              sectionsData.push({
                id: `section-${sectionsData.length}`,
                name: String.fromCharCode(65 + sectionsData.length),
              })
            }
          } catch (error) {
            console.error(`Error processing section ${sectionId}:`, error)
          }
        }

        sectionsData.sort((a, b) => a.name.localeCompare(b.name))
        setAvailableSections(sectionsData)
      }
    } catch (error) {
      console.error("Error fetching sections:", error)
      const defaultSections = [
        { id: "A", name: "A" },
        { id: "B", name: "B" },
        { id: "C", name: "C" },
        { id: "D", name: "D" },
      ]
      setAvailableSections(defaultSections)
    } finally {
      setLoadingSections(false)
    }
  }

  const loadFees = async () => {
    setLoading(true)
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        const demoFees = localStorage.getItem("demoMonthlyFees")
        if (demoFees) {
          const parsedFees = JSON.parse(demoFees).map((fee: any) => ({
            ...fee,
            createdAt: new Date(fee.createdAt),
            updatedAt: new Date(fee.updatedAt),
          }))
          setFees(parsedFees)
        } else {
          const defaultFees: MonthlyFee[] = [
            {
              id: "pg-a",
              grade: "P.G",
              gradeId: "pg",
              gradeDisplayName: "P.G",
              section: "A",
              sectionId: "A",
              sectionDisplayName: "Section A",
              monthlyAmount: 1200,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "nursery-a",
              grade: "Nursery",
              gradeId: "nursery",
              gradeDisplayName: "Nursery",
              section: "A",
              sectionId: "A",
              sectionDisplayName: "Section A",
              monthlyAmount: 1300,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "lkg-a",
              grade: "LKG",
              gradeId: "lkg",
              gradeDisplayName: "LKG",
              section: "A",
              sectionId: "A",
              sectionDisplayName: "Section A",
              monthlyAmount: 1400,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]
          setFees(defaultFees)
          localStorage.setItem("demoMonthlyFees", JSON.stringify(defaultFees))
        }
      } else {
        const feesRef = collection(db, "monthly_fees")
        const querySnapshot = await getDocs(feesRef)

        const feesData: MonthlyFee[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          feesData.push({
            id: doc.id,
            grade: data.grade,
            gradeId: data.gradeId,
            gradeDisplayName: data.gradeDisplayName,
            section: data.section,
            sectionId: data.sectionId,
            sectionDisplayName: data.sectionDisplayName,
            monthlyAmount: data.monthlyAmount,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          })
        })

        setFees(feesData)
      }
    } catch (error) {
      console.error("Error loading fees:", error)
      setError("Failed to load fees")
    } finally {
      setLoading(false)
    }
  }

  const loadTransportationFees = async () => {
    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        const demoTransportFees = localStorage.getItem("demoTransportationFees")
        if (demoTransportFees) {
          const parsedFees = JSON.parse(demoTransportFees).map((fee: any) => ({
            ...fee,
            createdAt: new Date(fee.createdAt),
            updatedAt: new Date(fee.updatedAt),
          }))
          setTransportationFees(parsedFees)
        } else {
          const defaultTransportFees: TransportationFee[] = [
            {
              id: "route-1",
              route: "Route 1",
              routeDisplayName: "Route 1",
              monthlyAmount: 500,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "route-2",
              route: "Route 2",
              routeDisplayName: "Route 2",
              monthlyAmount: 600,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: "route-3",
              route: "Route 3",
              routeDisplayName: "Route 3",
              monthlyAmount: 700,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]
          setTransportationFees(defaultTransportFees)
          localStorage.setItem("demoTransportationFees", JSON.stringify(defaultTransportFees))
        }
      } else {
        const transportFeesRef = collection(db, "transportation_fees")
        const querySnapshot = await getDocs(transportFeesRef)

        const transportFeesData: TransportationFee[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          transportFeesData.push({
            id: doc.id,
            route: data.route,
            routeDisplayName: data.routeDisplayName,
            monthlyAmount: data.monthlyAmount,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          })
        })

        setTransportationFees(transportFeesData)
      }
    } catch (error) {
      console.error("Error loading transportation fees:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!selectedGrade || !monthlyAmount) {
      setError("Please fill in all required fields")
      return
    }

    if (useSectionFiltering && !selectedSection) {
      setError("Please select a section")
      return
    }

    const amount = Number.parseInt(monthlyAmount)
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (!editingFee) {
      const existingFee = fees.find((fee) => {
        if (useSectionFiltering) {
          return fee.grade === selectedGrade && fee.section === selectedSection
        } else {
          return fee.grade === selectedGrade
        }
      })

      if (existingFee) {
        const identifier = useSectionFiltering ? `${selectedGrade} Section ${selectedSection}` : selectedGrade
        setError(`Monthly fee already exists for ${identifier}`)
        return
      }
    }

    setSaving(true)
    try {
      const gradeInfo = availableClasses.find((c) =>
        useSectionFiltering ? c.id === selectedGradeId : c.name === selectedGrade,
      )

      const sectionInfo = availableSections.find((s) => s.id === selectedSectionId)

      const feeData: Omit<MonthlyFee, "id"> = {
        grade: selectedGrade,
        gradeId: useSectionFiltering ? selectedGradeId : undefined,
        gradeDisplayName: gradeInfo?.displayName || selectedGrade,
        section: useSectionFiltering ? selectedSection : undefined,
        sectionId: useSectionFiltering ? selectedSectionId : undefined,
        sectionDisplayName: useSectionFiltering ? `Section ${sectionInfo?.name || selectedSection}` : undefined,
        monthlyAmount: amount,
        createdAt: editingFee?.createdAt || new Date(),
        updatedAt: new Date(),
      }

      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        let updatedFees: MonthlyFee[]

        if (editingFee) {
          updatedFees = fees.map((fee) => (fee.id === editingFee.id ? { ...feeData, id: editingFee.id } : fee))
        } else {
          const feeId = useSectionFiltering
            ? `${selectedGrade.toLowerCase().replace(/\./g, "")}-${selectedSection.toLowerCase()}`
            : selectedGrade.toLowerCase().replace(/\./g, "")

          const newFee: MonthlyFee = {
            ...feeData,
            id: feeId,
          }
          updatedFees = [...fees, newFee]
        }

        setFees(updatedFees)
        localStorage.setItem("demoMonthlyFees", JSON.stringify(updatedFees))
      } else {
        const feeId =
          editingFee?.id ||
          (useSectionFiltering
            ? `${selectedGrade.toLowerCase().replace(/\./g, "")}-${selectedSection.toLowerCase()}`
            : selectedGrade.toLowerCase().replace(/\./g, ""))

        const feeRef = doc(db, "monthly_fees", feeId)

        if (editingFee) {
          await updateDoc(feeRef, feeData)
        } else {
          await setDoc(feeRef, feeData)
        }

        await loadFees()
      }

      setSelectedGrade("")
      setSelectedGradeId("")
      setSelectedSection("")
      setSelectedSectionId("")
      setMonthlyAmount("")
      setEditingFee(null)
      setIsDialogOpen(false)

      onFeesUpdated?.()
    } catch (error) {
      console.error("Error saving fee:", error)
      setError("Failed to save fee")
    } finally {
      setSaving(false)
    }
  }

  const handleTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransportError("")

    if (!selectedRoute || !transportAmount) {
      setTransportError("Please fill in all required fields")
      return
    }

    const amount = Number.parseInt(transportAmount)
    if (isNaN(amount) || amount <= 0) {
      setTransportError("Please enter a valid amount")
      return
    }

    if (!editingTransportFee) {
      const existingFee = transportationFees.find((fee) => fee.route === selectedRoute)
      if (existingFee) {
        setTransportError(`Transportation fee already exists for ${selectedRoute}`)
        return
      }
    }

    setSaving(true)
    try {
      const feeData: Omit<TransportationFee, "id"> = {
        route: selectedRoute,
        routeDisplayName: selectedRoute,
        monthlyAmount: amount,
        createdAt: editingTransportFee?.createdAt || new Date(),
        updatedAt: new Date(),
      }

      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        let updatedFees: TransportationFee[]

        if (editingTransportFee) {
          updatedFees = transportationFees.map((fee) =>
            fee.id === editingTransportFee.id ? { ...feeData, id: editingTransportFee.id } : fee,
          )
        } else {
          const feeId = selectedRoute.toLowerCase().replace(/\s+/g, "-")
          const newFee: TransportationFee = {
            ...feeData,
            id: feeId,
          }
          updatedFees = [...transportationFees, newFee]
        }

        setTransportationFees(updatedFees)
        localStorage.setItem("demoTransportationFees", JSON.stringify(updatedFees))
      } else {
        const feeId = editingTransportFee?.id || selectedRoute.toLowerCase().replace(/\s+/g, "-")
        const feeRef = doc(db, "transportation_fees", feeId)

        if (editingTransportFee) {
          await updateDoc(feeRef, feeData)
        } else {
          await setDoc(feeRef, feeData)
        }

        await loadTransportationFees()
      }

      setSelectedRoute("")
      setTransportAmount("")
      setEditingTransportFee(null)
      setIsTransportDialogOpen(false)

      onFeesUpdated?.()
    } catch (error) {
      console.error("Error saving transportation fee:", error)
      setTransportError("Failed to save transportation fee")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (fee: MonthlyFee) => {
    setEditingFee(fee)
    setSelectedGrade(fee.grade)
    setSelectedGradeId(fee.gradeId || "")
    setSelectedSection(fee.section || "")
    setSelectedSectionId(fee.sectionId || "")
    setMonthlyAmount(fee.monthlyAmount.toString())
    setError("")
    setIsDialogOpen(true)
  }

  const handleEditTransport = (fee: TransportationFee) => {
    setEditingTransportFee(fee)
    setSelectedRoute(fee.route)
    setTransportAmount(fee.monthlyAmount.toString())
    setTransportError("")
    setIsTransportDialogOpen(true)
  }

  const handleDelete = async (fee: MonthlyFee) => {
    const identifier = fee.sectionDisplayName
      ? `${fee.gradeDisplayName} ${fee.sectionDisplayName}`
      : fee.gradeDisplayName

    if (!confirm(`Are you sure you want to delete the monthly fee for ${identifier}?`)) {
      return
    }

    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        const updatedFees = fees.filter((f) => f.id !== fee.id)
        setFees(updatedFees)
        localStorage.setItem("demoMonthlyFees", JSON.stringify(updatedFees))
      } else {
        await deleteDoc(doc(db, "monthly_fees", fee.id))
        await loadFees()
      }

      onFeesUpdated?.()
    } catch (error) {
      console.error("Error deleting fee:", error)
      setError("Failed to delete fee")
    }
  }

  const handleDeleteTransport = async (fee: TransportationFee) => {
    if (!confirm(`Are you sure you want to delete the transportation fee for ${fee.routeDisplayName}?`)) {
      return
    }

    try {
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        const updatedFees = transportationFees.filter((f) => f.id !== fee.id)
        setTransportationFees(updatedFees)
        localStorage.setItem("demoTransportationFees", JSON.stringify(updatedFees))
      } else {
        await deleteDoc(doc(db, "transportation_fees", fee.id))
        await loadTransportationFees()
      }

      onFeesUpdated?.()
    } catch (error) {
      console.error("Error deleting transportation fee:", error)
    }
  }

  const handleAddNew = () => {
    setEditingFee(null)
    setSelectedGrade("")
    setSelectedGradeId("")
    setSelectedSection("")
    setSelectedSectionId("")
    setMonthlyAmount("")
    setError("")
    setIsDialogOpen(true)
  }

  const handleAddNewTransport = () => {
    setEditingTransportFee(null)
    setSelectedRoute("")
    setTransportAmount("")
    setTransportError("")
    setIsTransportDialogOpen(true)
  }

  if (loading || loadingClasses) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Fee Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly" className="flex items-center">
              <GraduationCap className="h-4 w-4 mr-2" />
              Monthly Fees
            </TabsTrigger>
            <TabsTrigger value="transportation" className="flex items-center">
              <Bus className="h-4 w-4 mr-2" />
              Transportation Fees
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Monthly Academic Fees</h3>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Monthly Fee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingFee ? "Edit Monthly Fee" : "Add Monthly Fee"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade/Class</Label>
                      {loadingClasses ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Select
                          value={useSectionFiltering ? selectedGradeId : selectedGrade}
                          onValueChange={(value) => {
                            if (useSectionFiltering) {
                              setSelectedGradeId(value)
                              const classObj = availableClasses.find((c) => c.id === value)
                              setSelectedGrade(classObj?.name || "")
                              setSelectedSection("")
                              setSelectedSectionId("")
                            } else {
                              setSelectedGrade(value)
                              setSelectedGradeId("")
                            }
                          }}
                          disabled={!!editingFee}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Grade/Class" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableClasses.map((grade) => (
                              <SelectItem key={grade.id} value={useSectionFiltering ? grade.id : grade.name}>
                                {grade.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {useSectionFiltering && (
                      <div className="space-y-2">
                        <Label htmlFor="section">Section</Label>
                        {loadingSections ? (
                          <Skeleton className="h-10 w-full" />
                        ) : (
                          <Select
                            value={selectedSectionId}
                            onValueChange={(value) => {
                              setSelectedSectionId(value)
                              const sectionObj = availableSections.find((s) => s.id === value)
                              setSelectedSection(sectionObj?.name || "")
                            }}
                            disabled={!selectedGradeId || availableSections.length === 0 || !!editingFee}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  availableSections.length === 0 ? "No sections available" : "Select Section"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSections.map((section) => (
                                <SelectItem key={section.id} value={section.id}>
                                  Section {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="amount">Monthly Amount (Rs.)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter monthly fee amount"
                        value={monthlyAmount}
                        onChange={(e) => setMonthlyAmount(e.target.value)}
                        min="0"
                        step="1"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : editingFee ? (
                          "Update Fee"
                        ) : (
                          "Add Fee"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {fees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No monthly fees configured yet.</p>
                <p className="text-sm">Add fees for different grades and sections to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade/Class</TableHead>
                    {useSectionFiltering && <TableHead>Section</TableHead>}
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Term Fee (3 months)</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees
                    .sort((a, b) => {
                      const order = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
                      const gradeComparison = order.indexOf(a.grade) - order.indexOf(b.grade)
                      if (gradeComparison !== 0) return gradeComparison
                      return (a.section || "").localeCompare(b.section || "")
                    })
                    .map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.gradeDisplayName}</TableCell>
                        {useSectionFiltering && <TableCell>{fee.sectionDisplayName || fee.section || "-"}</TableCell>}
                        <TableCell>Rs. {fee.monthlyAmount.toLocaleString()}</TableCell>
                        <TableCell>Rs. {(fee.monthlyAmount * 3).toLocaleString()}</TableCell>
                        <TableCell>{fee.updatedAt.toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(fee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(fee)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="transportation" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Transportation Fees</h3>
              <Dialog open={isTransportDialogOpen} onOpenChange={setIsTransportDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNewTransport}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transportation Fee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTransportFee ? "Edit Transportation Fee" : "Add Transportation Fee"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTransportSubmit} className="space-y-4">
                    {transportError && (
                      <Alert variant="destructive">
                        <AlertDescription>{transportError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="route">Bus Route</Label>
                      <Select value={selectedRoute} onValueChange={setSelectedRoute} disabled={!!editingTransportFee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Bus Route" />
                        </SelectTrigger>
                        <SelectContent>
                          {busRoutes.map((route) => (
                            <SelectItem key={route} value={route}>
                              {route}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transportAmount">Monthly Amount (Rs.)</Label>
                      <Input
                        id="transportAmount"
                        type="number"
                        placeholder="Enter monthly transportation fee"
                        value={transportAmount}
                        onChange={(e) => setTransportAmount(e.target.value)}
                        min="0"
                        step="1"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsTransportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : editingTransportFee ? (
                          "Update Fee"
                        ) : (
                          "Add Fee"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {transportationFees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transportation fees configured yet.</p>
                <p className="text-sm">Add fees for different bus routes to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bus Route</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Term Fee (3 months)</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transportationFees
                    .sort((a, b) => a.route.localeCompare(b.route))
                    .map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.routeDisplayName}</TableCell>
                        <TableCell>Rs. {fee.monthlyAmount.toLocaleString()}</TableCell>
                        <TableCell>Rs. {(fee.monthlyAmount * 3).toLocaleString()}</TableCell>
                        <TableCell>{fee.updatedAt.toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditTransport(fee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteTransport(fee)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Export function to get transportation fee for a route
export const getTransportationFee = async (route: string): Promise<number> => {
  const isDemoMode = localStorage.getItem("isDemoMode") === "true"

  if (isDemoMode) {
    const demoTransportFees = localStorage.getItem("demoTransportationFees")
    if (demoTransportFees) {
      const fees = JSON.parse(demoTransportFees)
      const fee = fees.find((f: TransportationFee) => f.route === route)
      return fee ? fee.monthlyAmount : 500 // Default fallback
    }
    return 500 // Default fallback
  } else {
    try {
      const feeDoc = await getDoc(doc(db, "transportation_fees", route.toLowerCase().replace(/\s+/g, "-")))
      if (feeDoc.exists()) {
        return feeDoc.data().monthlyAmount
      }
    } catch (error) {
      console.error("Error fetching transportation fee:", error)
    }
    return 500 // Default fallback
  }
}
