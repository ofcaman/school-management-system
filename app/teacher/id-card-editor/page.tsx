"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Undo, Redo, Eye, Download, Plus } from "lucide-react"
import { IdCardEditor } from "./components/id-card-editor"
import { IdCardPreview } from "./components/id-card-preview"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defaultCardElements, defaultCardSettings } from "./components/default-elements"
import { ElementPropertiesPanel } from "./components/element-properties-panel"
import { ManualSetup } from "./components/manual-setup"
import { TemplateSelector } from "./components/template-selector"
import type { CardElement, CardSettings } from "./components/types"

export default function IdCardEditorPage() {
  const router = useRouter()
  const [cardElements, setCardElements] = useState<CardElement[]>(defaultCardElements)
  const [cardSettings, setCardSettings] = useState<CardSettings>(defaultCardSettings)
  const [history, setHistory] = useState<CardElement[][]>([defaultCardElements])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState("portrait") // Set portrait as default
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<{ name: string; elements: CardElement[]; settings: CardSettings }[]>([])
  const [templateName, setTemplateName] = useState("Default Template")

  // Sample student data for preview
  const sampleStudent = {
    id: "sample1",
    name: "Sita Sharma",
    grade: "10",
    rollNumber: "1001",
    contactNumber: "9876543210",
    address: "Bhaktapur",
    fatherName: "Richard Doe",
    profilePictureUrl: "/female-student-portrait.png",
  }

  // Load saved templates on mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem("idCardTemplates")
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates))
      } catch (e) {
        console.error("Error loading templates:", e)
      }
    }

    // Load last used template
    const lastTemplate = localStorage.getItem("lastIdCardTemplate")
    if (lastTemplate) {
      try {
        const template = JSON.parse(lastTemplate)
        setCardElements(template.elements)
        setCardSettings(template.settings)
        setHistory([template.elements])
        setHistoryIndex(0)
        setTemplateName(template.name || "Default Template")
      } catch (e) {
        console.error("Error loading last template:", e)
      }
    }
  }, [])

  // Auto-apply the template on first load
  useEffect(() => {
    const applyTemplate = async () => {
      // Wait for components to initialize
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Find the ManualSetup component's button and click it
      const button = document.querySelector("button.bg-red-600")
      if (button) {
        ;(button as HTMLButtonElement).click()
      }
    }

    applyTemplate()
  }, [])

  const addToHistory = (elements: CardElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...elements])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setCardElements([...history[historyIndex - 1]])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setCardElements([...history[historyIndex + 1]])
    }
  }

  const handleElementChange = (updatedElements: CardElement[]) => {
    setCardElements(updatedElements)
    addToHistory(updatedElements)
  }

  const handleSettingsChange = (settings: CardSettings) => {
    setCardSettings(settings)
  }

  const handleSaveTemplate = () => {
    const template = {
      name: templateName,
      elements: cardElements,
      settings: cardSettings,
    }

    // Save as last used template
    localStorage.setItem("lastIdCardTemplate", JSON.stringify(template))

    // Add to templates list if it doesn't exist
    const existingTemplateIndex = templates.findIndex((t) => t.name === templateName)
    if (existingTemplateIndex >= 0) {
      const updatedTemplates = [...templates]
      updatedTemplates[existingTemplateIndex] = template
      setTemplates(updatedTemplates)
      localStorage.setItem("idCardTemplates", JSON.stringify(updatedTemplates))
    } else {
      const updatedTemplates = [...templates, template]
      setTemplates(updatedTemplates)
      localStorage.setItem("idCardTemplates", JSON.stringify(updatedTemplates))
    }

    alert("Template saved successfully!")
  }

  const handleElementUpdate = (id: string, updates: Partial<CardElement>) => {
    const updatedElements = cardElements.map((el) => (el.id === id ? { ...el, ...updates } : el))
    setCardElements(updatedElements)
    addToHistory(updatedElements)
  }

  const handleDeleteElement = (id: string) => {
    const updatedElements = cardElements.filter((el) => el.id !== id)
    setCardElements(updatedElements)
    addToHistory(updatedElements)
    setSelectedElementId(null)
  }

  const handleDuplicateElement = (id: string) => {
    const elementToDuplicate = cardElements.find((el) => el.id === id)
    if (elementToDuplicate) {
      const newElement = {
        ...elementToDuplicate,
        id: `${elementToDuplicate.type}-${Date.now()}`,
        position: {
          x: elementToDuplicate.position.x + 10,
          y: elementToDuplicate.position.y + 10,
        },
      }
      const updatedElements = [...cardElements, newElement]
      setCardElements(updatedElements)
      addToHistory(updatedElements)
      setSelectedElementId(newElement.id)
    }
  }

  const handleMoveLayer = (id: string, direction: "up" | "down") => {
    const index = cardElements.findIndex((el) => el.id === id)
    if (index === -1) return

    const newElements = [...cardElements]

    if (direction === "up" && index < cardElements.length - 1) {
      // Move element up in z-index (swap with the element above it)
      ;[newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]]
    } else if (direction === "down" && index > 0) {
      // Move element down in z-index (swap with the element below it)
      ;[newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]]
    }

    setCardElements(newElements)
    addToHistory(newElements)
  }

  const handleSelectTemplate = (elements: CardElement[], settings: CardSettings) => {
    setCardElements(elements)
    setCardSettings(settings)
  }

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">ID Card Editor</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleUndo} disabled={historyIndex === 0}>
            <Undo className="h-4 w-4 mr-2" />
            Undo
          </Button>
          <Button variant="outline" onClick={handleRedo} disabled={historyIndex === history.length - 1}>
            <Redo className="h-4 w-4 mr-2" />
            Redo
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSaveTemplate}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      {/* Template Selector */}
      <TemplateSelector onSelectTemplate={handleSelectTemplate} student={sampleStudent} addToHistory={addToHistory} />

      {/* Original Template Button */}
      <ManualSetup setCardElements={setCardElements} setCardSettings={setCardSettings} addToHistory={addToHistory} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Card Layout</CardTitle>
              <CardDescription>Drag and drop elements to customize your ID card</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="portrait" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="landscape">Landscape</TabsTrigger>
                  <TabsTrigger value="portrait">Portrait</TabsTrigger>
                </TabsList>
                <TabsContent value="landscape" className="mt-0">
                  <DndProvider backend={HTML5Backend}>
                    <IdCardEditor
                      orientation="landscape"
                      elements={cardElements}
                      settings={cardSettings}
                      onElementsChange={handleElementChange}
                      onElementSelect={setSelectedElementId}
                      selectedElementId={selectedElementId}
                      student={sampleStudent}
                      onElementUpdate={handleElementUpdate}
                    />
                  </DndProvider>
                </TabsContent>
                <TabsContent value="portrait" className="mt-0">
                  <DndProvider backend={HTML5Backend}>
                    <IdCardEditor
                      orientation="portrait"
                      elements={cardElements}
                      settings={cardSettings}
                      onElementsChange={handleElementChange}
                      onElementSelect={setSelectedElementId}
                      selectedElementId={selectedElementId}
                      student={sampleStudent}
                      onElementUpdate={handleElementUpdate}
                    />
                  </DndProvider>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Element Properties</CardTitle>
                <CardDescription>
                  {selectedElementId ? "Edit the selected element" : "Select an element to edit its properties"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ElementPropertiesPanel
                  element={cardElements.find((el) => el.id === selectedElementId) || null}
                  onUpdate={handleElementUpdate}
                  onDelete={handleDeleteElement}
                  onDuplicate={handleDuplicateElement}
                  onMoveLayer={handleMoveLayer}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Elements</CardTitle>
                <CardDescription>Add new elements to your ID card</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const newElement: CardElement = {
                        id: `text-${Date.now()}`,
                        type: "text",
                        content: "New Text",
                        position: { x: 50, y: 50 },
                        size: { width: 100, height: 20 },
                        style: { fontSize: 12, fontWeight: "normal", color: "#000000" },
                      }
                      const newElements = [...cardElements, newElement]
                      setCardElements(newElements)
                      addToHistory(newElements)
                      setSelectedElementId(newElement.id)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Text
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const newElement: CardElement = {
                        id: `image-${Date.now()}`,
                        type: "image",
                        content: "/placeholder.svg?height=100&width=100",
                        position: { x: 50, y: 50 },
                        size: { width: 80, height: 80 },
                        style: { borderRadius: 4 },
                      }
                      const newElements = [...cardElements, newElement]
                      setCardElements(newElements)
                      addToHistory(newElements)
                      setSelectedElementId(newElement.id)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Image
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const newElement: CardElement = {
                        id: `field-${Date.now()}`,
                        type: "field",
                        content: "name",
                        position: { x: 50, y: 50 },
                        size: { width: 120, height: 20 },
                        style: { fontSize: 12, fontWeight: "bold", color: "#000000" },
                      }
                      const newElements = [...cardElements, newElement]
                      setCardElements(newElements)
                      addToHistory(newElements)
                      setSelectedElementId(newElement.id)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Student Field
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const newElement: CardElement = {
                        id: `qr-${Date.now()}`,
                        type: "qrcode",
                        content: "id,name,grade",
                        position: { x: 50, y: 50 },
                        size: { width: 60, height: 60 },
                        style: {},
                      }
                      const newElements = [...cardElements, newElement]
                      setCardElements(newElements)
                      addToHistory(newElements)
                      setSelectedElementId(newElement.id)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card Settings</CardTitle>
                <CardDescription>Customize the card appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Header Color</label>
                      <div className="flex mt-1">
                        <input
                          type="color"
                          value={cardSettings.headerColor}
                          onChange={(e) => handleSettingsChange({ ...cardSettings, headerColor: e.target.value })}
                          className="w-full h-8"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Footer Color</label>
                      <div className="flex mt-1">
                        <input
                          type="color"
                          value={cardSettings.footerColor}
                          onChange={(e) => handleSettingsChange({ ...cardSettings, footerColor: e.target.value })}
                          className="w-full h-8"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Template Name</label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full mt-1 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">School Name</label>
                    <input
                      type="text"
                      value={cardSettings.schoolName}
                      onChange={(e) => handleSettingsChange({ ...cardSettings, schoolName: e.target.value })}
                      className="w-full mt-1 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">School Address</label>
                    <input
                      type="text"
                      value={cardSettings.schoolAddress}
                      onChange={(e) => handleSettingsChange({ ...cardSettings, schoolAddress: e.target.value })}
                      className="w-full mt-1 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">School Contact</label>
                    <input
                      type="text"
                      value={cardSettings.schoolContact}
                      onChange={(e) => handleSettingsChange({ ...cardSettings, schoolContact: e.target.value })}
                      className="w-full mt-1 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Academic Year</label>
                    <input
                      type="text"
                      value={cardSettings.academicYear}
                      onChange={(e) => handleSettingsChange({ ...cardSettings, academicYear: e.target.value })}
                      className="w-full mt-1 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Expiry Date</label>
                    <input
                      type="text"
                      value={cardSettings.expiryDate}
                      onChange={(e) => handleSettingsChange({ ...cardSettings, expiryDate: e.target.value })}
                      className="w-full mt-1 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="portrait">
            <TabsList className="mb-4">
              <TabsTrigger value="landscape">Landscape</TabsTrigger>
              <TabsTrigger value="portrait">Portrait</TabsTrigger>
            </TabsList>
            <TabsContent value="landscape" className="mt-0">
              <IdCardPreview
                orientation="landscape"
                elements={cardElements}
                settings={cardSettings}
                student={sampleStudent}
              />
            </TabsContent>
            <TabsContent value="portrait" className="mt-0">
              <IdCardPreview
                orientation="portrait"
                elements={cardElements}
                settings={cardSettings}
                student={sampleStudent}
              />
            </TabsContent>
          </Tabs>
          <div className="flex justify-end mt-4">
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
