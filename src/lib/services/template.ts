import { db } from '@/lib/db'
import { whatsappTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface TemplateVariable {
  name: string
  value: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  missingVariables: string[]
}

export interface TemplatePreview {
  templateName: string
  originalContent: string
  renderedContent: string
  isValid: boolean
  errors: string[]
  missingVariables: string[]
}

export interface Template {
  id: string
  name: string
  displayName: string
  content: string
  variables: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class TemplateService {
  /**
   * Load template by name from database
   */
  async loadTemplate(templateName: string): Promise<Template | null> {
    try {
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.name, templateName))
        .limit(1)

      if (!template || !template.isActive) {
        return null
      }

      return {
        id: template.id,
        name: template.name,
        displayName: template.displayName,
        content: template.content,
        variables: template.variables as string[],
        isActive: template.isActive || false,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Load template by ID from database
   */
  async loadTemplateById(templateId: string): Promise<Template | null> {
    try {
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.id, templateId))
        .limit(1)

      if (!template || !template.isActive) {
        return null
      }

      return {
        id: template.id,
        name: template.name,
        displayName: template.displayName,
        content: template.content,
        variables: template.variables as string[],
        isActive: template.isActive || false,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get all active templates
   */
  async getAllTemplates(): Promise<Template[]> {
    try {
      const templates = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.isActive, true))

      return templates.map(template => ({
        id: template.id,
        name: template.name,
        displayName: template.displayName,
        content: template.content,
        variables: template.variables as string[],
        isActive: template.isActive || false,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }))
    } catch (error) {
      throw error
    }
  }

  /**
   * Render template content with provided variables
   */
  renderTemplate(content: string, variables: Record<string, string>): string {
    if (!content) {
      return ''
    }

    let rendered = content

    // Replace {{variable}} placeholders with actual values
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Handle variables with optional spaces: {{key}} or {{ key }}
        const regex = new RegExp(`\\{\\{\\s*${this.escapeRegExp(key)}\\s*\\}\\}`, 'g')
        rendered = rendered.replace(regex, value)
      }
    })

    return rendered
  }

  /**
   * Validate template variables against requirements
   */
  async validateTemplate(templateName: string, variables: Record<string, string>): Promise<ValidationResult> {
    try {
      // Load template from database
      const template = await this.loadTemplate(templateName)
      
      if (!template) {
        return {
          isValid: false,
          errors: [`Template '${templateName}' not found`],
          missingVariables: []
        }
      }

      // Check for missing variables
      const missingVariables: string[] = []
      const errors: string[] = []

      template.variables.forEach(requiredVar => {
        const value = variables[requiredVar]
        if (!value || typeof value !== 'string' || value.trim() === '') {
          missingVariables.push(requiredVar)
        }
      })

      if (missingVariables.length > 0) {
        errors.push(`Missing required variables: ${missingVariables.join(', ')}`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        missingVariables
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        missingVariables: []
      }
    }
  }

  /**
   * Generate template preview with variables
   */
  async previewTemplate(templateName: string, variables: Record<string, string>): Promise<TemplatePreview | null> {
    try {
      // Load template
      const template = await this.loadTemplate(templateName)
      
      if (!template) {
        return null
      }

      // Validate variables
      const validation = await this.validateTemplate(templateName, variables)

      // Render content
      const renderedContent = this.renderTemplate(template.content, variables)

      return {
        templateName: template.name,
        originalContent: template.content,
        renderedContent,
        isValid: validation.isValid,
        errors: validation.errors,
        missingVariables: validation.missingVariables
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Extract variable names from template content
   */
  extractVariables(content: string): string[] {
    if (!content) {
      return []
    }

    // Match {{variable_name}} patterns, allowing for spaces
    const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
    const variables: string[] = []
    let match

    while ((match = regex.exec(content)) !== null) {
      const variableName = match[1].trim()
      if (!variables.includes(variableName)) {
        variables.push(variableName)
      }
    }

    return variables
  }

  /**
   * Get template variables from database
   */
  async getTemplateVariables(templateName: string): Promise<string[]> {
    try {
      const template = await this.loadTemplate(templateName)
      return template ? template.variables : []
    } catch (error) {
      return []
    }
  }

  /**
   * Escape special regex characters in variable names
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Create a new template (for admin functionality)
   */
  async createTemplate(templateData: {
    name: string
    displayName: string
    content: string
    variables?: string[]
  }): Promise<Template> {
    try {
      // Extract variables from content if not provided
      const variables = templateData.variables || this.extractVariables(templateData.content)

      const [template] = await db.insert(whatsappTemplates).values({
        name: templateData.name,
        displayName: templateData.displayName,
        content: templateData.content,
        variables,
        isActive: true
      }).returning()

      return {
        id: template.id,
        name: template.name,
        displayName: template.displayName,
        content: template.content,
        variables: template.variables as string[],
        isActive: template.isActive || false,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, updates: {
    displayName?: string
    content?: string
    variables?: string[]
    isActive?: boolean
  }): Promise<Template | null> {
    try {
      // If content is being updated, extract variables if not provided
      if (updates.content && !updates.variables) {
        updates.variables = this.extractVariables(updates.content)
      }

      const [template] = await db.update(whatsappTemplates)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(whatsappTemplates.id, templateId))
        .returning()

      if (!template) {
        return null
      }

      return {
        id: template.id,
        name: template.name,
        displayName: template.displayName,
        content: template.content,
        variables: template.variables as string[],
        isActive: template.isActive || false,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Delete a template (soft delete by setting isActive to false)
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const result = await db.update(whatsappTemplates)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(whatsappTemplates.id, templateId))

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Sanitize template content for security
   */
  sanitizeTemplateContent(content: string): string {
    if (!content) {
      return ''
    }

    // Basic HTML sanitization - remove script tags and dangerous attributes
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
  }

  /**
   * Validate template name format
   */
  validateTemplateName(name: string): ValidationResult {
    const errors: string[] = []

    if (!name || typeof name !== 'string') {
      errors.push('Template name is required')
    } else {
      // Template name should be snake_case with only letters, numbers, and underscores
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        errors.push('Template name must be lowercase, start with a letter, and contain only letters, numbers, and underscores')
      }

      if (name.length > 50) {
        errors.push('Template name must be 50 characters or less')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingVariables: []
    }
  }

  /**
   * Validate variable names in template content
   */
  validateVariableNames(content: string): ValidationResult {
    const variables = this.extractVariables(content)
    const errors: string[] = []

    variables.forEach(variable => {
      // Variable names should be snake_case with only letters, numbers, and underscores
      if (!/^[a-z][a-z0-9_]*$/.test(variable)) {
        errors.push(`Invalid variable name '${variable}': must be lowercase, start with a letter, and contain only letters, numbers, and underscores`)
      }

      if (variable.length > 30) {
        errors.push(`Variable name '${variable}' is too long (max 30 characters)`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      missingVariables: []
    }
  }
}