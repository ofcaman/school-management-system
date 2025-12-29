import { modernTemplate } from "./modern-template"
import { professionalTemplate } from "./professional-template"
import { colorfulTemplate } from "./colorful-template"

export const templates = {
  modern: modernTemplate,
  professional: professionalTemplate,
  colorful: colorfulTemplate,
}

export type TemplateType = "modern" | "professional" | "colorful"
