"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react"
import type { CardElement } from "./types"

interface ElementPropertiesPanelProps {
  element: CardElement | null
  onUpdate: (id: string, updates: Partial<CardElement>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onMoveLayer: (id: string, direction: "up" | "down") => void
}

export const ElementPropertiesPanel: React.FC<ElementPropertiesPanelProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveLayer,
}) => {
  const [activeTab, setActiveTab] = useState("position")

  if (!element) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Select an element to edit its properties</p>
      </div>
    )
  }

  const handlePositionChange = (axis: "x" | "y", value: number) => {
    onUpdate(element.id, {
      position: {
        ...element.position,
        [axis]: value,
      },
    })
  }

  const handleSizeChange = (dimension: "width" | "height", value: number) => {
    onUpdate(element.id, {
      size: {
        ...element.size,
        [dimension]: value,
      },
    })
  }

  const handleStyleChange = (property: string, value: any) => {
    onUpdate(element.id, {
      style: {
        ...element.style,
        [property]: value,
      },
    })
  }

  const handleContentChange = (value: string) => {
    onUpdate(element.id, { content: value })
  }

  return (
    <div className="border rounded-md p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Element Properties</h3>
        <div className="flex space-x-1">
          <Button variant="outline" size="sm" onClick={() => onMoveLayer(element.id, "up")} title="Bring Forward">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMoveLayer(element.id, "down")} title="Send Backward">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDuplicate(element.id)} title="Duplicate">
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(element.id)}
            className="text-red-500 hover:text-red-700"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="position" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="position" className="flex-1">
            Position
          </TabsTrigger>
          <TabsTrigger value="style" className="flex-1">
            Style
          </TabsTrigger>
          <TabsTrigger value="content" className="flex-1">
            Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="position" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position-x">X Position</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="position-x"
                  type="number"
                  value={Math.round(element.position.x)}
                  onChange={(e) => handlePositionChange("x", Number(e.target.value))}
                  className="w-full"
                />
                <span className="ml-2 text-xs text-gray-500">px</span>
              </div>
            </div>
            <div>
              <Label htmlFor="position-y">Y Position</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="position-y"
                  type="number"
                  value={Math.round(element.position.y)}
                  onChange={(e) => handlePositionChange("y", Number(e.target.value))}
                  className="w-full"
                />
                <span className="ml-2 text-xs text-gray-500">px</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="size-width">Width</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="size-width"
                  type="number"
                  value={Math.round(element.size.width)}
                  onChange={(e) => handleSizeChange("width", Number(e.target.value))}
                  className="w-full"
                />
                <span className="ml-2 text-xs text-gray-500">px</span>
              </div>
            </div>
            <div>
              <Label htmlFor="size-height">Height</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="size-height"
                  type="number"
                  value={Math.round(element.size.height)}
                  onChange={(e) => handleSizeChange("height", Number(e.target.value))}
                  className="w-full"
                />
                <span className="ml-2 text-xs text-gray-500">px</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="style" className="space-y-4">
          {(element.type === "text" || element.type === "field") && (
            <>
              <div>
                <Label htmlFor="font-size">Font Size</Label>
                <div className="flex items-center mt-1">
                  <Slider
                    id="font-size"
                    min={8}
                    max={24}
                    step={1}
                    value={[(element.style as any).fontSize]}
                    onValueChange={(value) => handleStyleChange("fontSize", value[0])}
                    className="flex-1 mr-4"
                  />
                  <Input
                    type="number"
                    value={(element.style as any).fontSize}
                    onChange={(e) => handleStyleChange("fontSize", Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="ml-2 text-xs text-gray-500">px</span>
                </div>
              </div>

              <div>
                <Label htmlFor="font-weight">Font Weight</Label>
                <Select
                  value={(element.style as any).fontWeight}
                  onValueChange={(value) => handleStyleChange("fontWeight", value)}
                >
                  <SelectTrigger id="font-weight" className="mt-1">
                    <SelectValue placeholder="Select weight" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="font-style">Font Style</Label>
                <Select
                  value={(element.style as any).fontStyle || "normal"}
                  onValueChange={(value) => handleStyleChange("fontStyle", value)}
                >
                  <SelectTrigger id="font-style" className="mt-1">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="italic">Italic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="text-align">Text Alignment</Label>
                <Select
                  value={(element.style as any).textAlign || "left"}
                  onValueChange={(value) => handleStyleChange("textAlign", value)}
                >
                  <SelectTrigger id="text-align" className="mt-1">
                    <SelectValue placeholder="Select alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="text-color">Text Color</Label>
                <div className="flex mt-1">
                  <Input
                    id="text-color"
                    type="color"
                    value={(element.style as any).color}
                    onChange={(e) => handleStyleChange("color", e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </>
          )}

          {element.type === "image" && (
            <div>
              <Label htmlFor="border-radius">Border Radius</Label>
              <div className="flex items-center mt-1">
                <Slider
                  id="border-radius"
                  min={0}
                  max={50}
                  step={1}
                  value={[(element.style as any).borderRadius]}
                  onValueChange={(value) => handleStyleChange("borderRadius", value[0])}
                  className="flex-1 mr-4"
                />
                <Input
                  type="number"
                  value={(element.style as any).borderRadius}
                  onChange={(e) => handleStyleChange("borderRadius", Number(e.target.value))}
                  className="w-16"
                />
                <span className="ml-2 text-xs text-gray-500">px</span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          {element.type === "text" && (
            <div>
              <Label htmlFor="text-content">Text Content</Label>
              <Input
                id="text-content"
                value={element.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {element.type === "field" && (
            <div>
              <Label htmlFor="field-content">Student Field</Label>
              <Select value={element.content} onValueChange={handleContentChange}>
                <SelectTrigger id="field-content" className="mt-1">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="grade">Grade</SelectItem>
                  <SelectItem value="rollNumber">Roll Number</SelectItem>
                  <SelectItem value="contactNumber">Contact Number</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                  <SelectItem value="fatherName">Father's Name</SelectItem>
                  <SelectItem value="profilePictureUrl">Profile Picture</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {element.type === "image" && (
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={element.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {element.type === "qrcode" && (
            <div>
              <Label htmlFor="qr-fields">QR Code Fields</Label>
              <Input
                id="qr-fields"
                value={element.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated field names (e.g., "name,grade,rollNumber")</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
