"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { templates, type TemplateType } from "./templates"
import type { CardElement, CardSettings } from "./types"
import { IdCardPreview } from "./id-card-preview"

interface TemplateSelectorProps {
  onSelectTemplate: (elements: CardElement[], settings: CardSettings) => void
  student: any
  addToHistory: (elements: CardElement[]) => void
}

export function TemplateSelector({ onSelectTemplate, student, addToHistory }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("modern")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")

  const handleApplyTemplate = () => {
    const template = templates[selectedTemplate][orientation]
    onSelectTemplate(template.elements, template.settings)
    addToHistory(template.elements)
  }

  return (
    <div className="mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Template</h3>
              <div className="flex flex-col space-y-2">
                <Button
                  variant={selectedTemplate === "modern" ? "default" : "outline"}
                  onClick={() => setSelectedTemplate("modern")}
                  className="justify-start"
                >
                  Modern Template
                </Button>
                <Button
                  variant={selectedTemplate === "professional" ? "default" : "outline"}
                  onClick={() => setSelectedTemplate("professional")}
                  className="justify-start"
                >
                  Professional Template
                </Button>
                <Button
                  variant={selectedTemplate === "colorful" ? "default" : "outline"}
                  onClick={() => setSelectedTemplate("colorful")}
                  className="justify-start"
                >
                  Colorful Template
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Orientation</h3>
              <Tabs value={orientation} onValueChange={(value) => setOrientation(value as "portrait" | "landscape")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="portrait">Portrait</TabsTrigger>
                  <TabsTrigger value="landscape">Landscape</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button onClick={handleApplyTemplate} className="w-full">
                Apply Template
              </Button>
            </div>

            <div className="flex justify-center items-center">
              <div className="w-full max-w-[200px] h-[300px] flex items-center justify-center">
                <IdCardPreview
                  orientation={orientation}
                  elements={templates[selectedTemplate][orientation].elements}
                  settings={templates[selectedTemplate][orientation].settings}
                  student={student}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
