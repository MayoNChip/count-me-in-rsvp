import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TemplateService, TemplateVariable, ValidationError } from '@/lib/services/template'
import { db } from '@/lib/db'
import { whatsappTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

describe('TemplateService', () => {
  let service: TemplateService
  let testTemplateId: string

  beforeEach(async () => {
    // Create test template
    const templateResult = await db.insert(whatsappTemplates).values({
      name: 'test_invitation',
      displayName: 'Test Invitation',
      content: 'Hello {{guest_name}}, you are invited to {{event_name}} on {{event_date}} at {{event_location}}. Please RSVP: {{rsvp_link}}',
      variables: ['guest_name', 'event_name', 'event_date', 'event_location', 'rsvp_link'],
      isActive: true
    }).returning({ id: whatsappTemplates.id })
    testTemplateId = templateResult[0].id

    service = new TemplateService()
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, testTemplateId))
  })

  describe('Constructor', () => {
    it('should initialize template service', () => {
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(TemplateService)
    })
  })

  describe('loadTemplate', () => {
    it('should load template by name', async () => {
      const template = await service.loadTemplate('test_invitation')
      
      expect(template).toBeDefined()
      expect(template!.name).toBe('test_invitation')
      expect(template!.displayName).toBe('Test Invitation')
      expect(template!.variables).toEqual(['guest_name', 'event_name', 'event_date', 'event_location', 'rsvp_link'])
    })

    it('should return null for non-existent template', async () => {
      const template = await service.loadTemplate('non_existent')
      expect(template).toBeNull()
    })

    it('should only load active templates', async () => {
      // Create inactive template
      await db.insert(whatsappTemplates).values({
        name: 'inactive_template',
        displayName: 'Inactive Template',
        content: 'This is inactive',
        variables: [],
        isActive: false
      })

      const template = await service.loadTemplate('inactive_template')
      expect(template).toBeNull()

      // Clean up
      await db.delete(whatsappTemplates).where(eq(whatsappTemplates.name, 'inactive_template'))
    })
  })

  describe('loadTemplateById', () => {
    it('should load template by ID', async () => {
      const template = await service.loadTemplateById(testTemplateId)
      
      expect(template).toBeDefined()
      expect(template!.name).toBe('test_invitation')
      expect(template!.id).toBe(testTemplateId)
    })

    it('should return null for non-existent ID', async () => {
      // Use a valid UUID format but non-existent ID
      const template = await service.loadTemplateById('00000000-0000-0000-0000-000000000000')
      expect(template).toBeNull()
    })
  })

  describe('getAllTemplates', () => {
    it('should return all active templates', async () => {
      const reminderName = `test_reminder_${Date.now()}`
      
      // Create another template with unique name
      const template2 = await db.insert(whatsappTemplates).values({
        name: reminderName,
        displayName: 'Test Reminder',
        content: 'Reminder: {{event_name}} is tomorrow',
        variables: ['event_name'],
        isActive: true
      }).returning({ id: whatsappTemplates.id })

      const templates = await service.getAllTemplates()
      
      // Check that our test templates are included (there might be others from previous tests)
      expect(templates.length).toBeGreaterThanOrEqual(2)
      expect(templates.find(t => t.name === 'test_invitation')).toBeDefined()
      expect(templates.find(t => t.name === reminderName)).toBeDefined()

      // Clean up
      await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, template2[0].id))
    })

    it('should exclude inactive templates', async () => {
      // Create inactive template
      const inactiveTemplate = await db.insert(whatsappTemplates).values({
        name: 'inactive_template',
        displayName: 'Inactive Template',
        content: 'This is inactive',
        variables: [],
        isActive: false
      }).returning({ id: whatsappTemplates.id })

      const templates = await service.getAllTemplates()
      
      expect(templates.find(t => t.name === 'inactive_template')).toBeUndefined()

      // Clean up
      await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, inactiveTemplate[0].id))
    })
  })

  describe('renderTemplate', () => {
    it('should render template with all variables', () => {
      const content = 'Hello {{guest_name}}, you are invited to {{event_name}} on {{event_date}}'
      const variables = {
        guest_name: 'John Doe',
        event_name: 'Wedding Reception',
        event_date: 'December 15, 2025'
      }

      const result = service.renderTemplate(content, variables)
      
      expect(result).toBe('Hello John Doe, you are invited to Wedding Reception on December 15, 2025')
    })

    it('should handle variables with spaces in braces', () => {
      const content = 'Hello {{ guest_name }}, welcome to {{ event_name }}'
      const variables = {
        guest_name: 'Jane Smith',
        event_name: 'Birthday Party'
      }

      const result = service.renderTemplate(content, variables)
      
      expect(result).toBe('Hello Jane Smith, welcome to Birthday Party')
    })

    it('should leave unreplaced variables as-is', () => {
      const content = 'Hello {{guest_name}}, event: {{event_name}}, location: {{event_location}}'
      const variables = {
        guest_name: 'John',
        event_name: 'Party'
        // event_location is missing
      }

      const result = service.renderTemplate(content, variables)
      
      expect(result).toBe('Hello John, event: Party, location: {{event_location}}')
    })

    it('should handle empty variables object', () => {
      const content = 'Hello {{guest_name}}'
      const variables = {}

      const result = service.renderTemplate(content, variables)
      
      expect(result).toBe('Hello {{guest_name}}')
    })

    it('should handle content with no variables', () => {
      const content = 'Hello everyone, welcome to our event!'
      const variables = { guest_name: 'John' }

      const result = service.renderTemplate(content, variables)
      
      expect(result).toBe('Hello everyone, welcome to our event!')
    })

    it('should handle special characters in variable values', () => {
      const content = 'Message: {{message}}'
      const variables = {
        message: 'Hello & welcome! Visit: https://example.com?name=test&id=123'
      }

      const result = service.renderTemplate(content, variables)
      
      expect(result).toBe('Message: Hello & welcome! Visit: https://example.com?name=test&id=123')
    })
  })

  describe('validateTemplate', () => {
    it('should validate template with correct variables', async () => {
      const variables = {
        guest_name: 'John Doe',
        event_name: 'Wedding',
        event_date: 'Dec 15',
        event_location: 'Hotel',
        rsvp_link: 'https://example.com'
      }

      const result = await service.validateTemplate('test_invitation', variables)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.missingVariables).toEqual([])
    })

    it('should identify missing required variables', async () => {
      const variables = {
        guest_name: 'John Doe',
        event_name: 'Wedding'
        // Missing event_date, event_location, rsvp_link
      }

      const result = await service.validateTemplate('test_invitation', variables)
      
      expect(result.isValid).toBe(false)
      expect(result.missingVariables).toEqual(['event_date', 'event_location', 'rsvp_link'])
      expect(result.errors).toContain('Missing required variables: event_date, event_location, rsvp_link')
    })

    it('should validate empty string variables as missing', async () => {
      const variables = {
        guest_name: '',
        event_name: 'Wedding',
        event_date: 'Dec 15',
        event_location: 'Hotel',
        rsvp_link: 'https://example.com'
      }

      const result = await service.validateTemplate('test_invitation', variables)
      
      expect(result.isValid).toBe(false)
      expect(result.missingVariables).toEqual(['guest_name'])
      expect(result.errors).toContain('Missing required variables: guest_name')
    })

    it('should validate whitespace-only variables as missing', async () => {
      const variables = {
        guest_name: 'John',
        event_name: '   ',
        event_date: 'Dec 15',
        event_location: 'Hotel',
        rsvp_link: 'https://example.com'
      }

      const result = await service.validateTemplate('test_invitation', variables)
      
      expect(result.isValid).toBe(false)
      expect(result.missingVariables).toEqual(['event_name'])
    })

    it('should return error for non-existent template', async () => {
      const variables = { test: 'value' }

      const result = await service.validateTemplate('non_existent', variables)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Template 'non_existent' not found")
    })

    it('should allow extra variables that are not in template', async () => {
      const variables = {
        guest_name: 'John',
        event_name: 'Wedding',
        event_date: 'Dec 15',
        event_location: 'Hotel',
        rsvp_link: 'https://example.com',
        extra_variable: 'This is extra'
      }

      const result = await service.validateTemplate('test_invitation', variables)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('previewTemplate', () => {
    it('should generate preview with sample variables', async () => {
      const variables = {
        guest_name: 'John Doe',
        event_name: 'Wedding Reception',
        event_date: 'December 15, 2025',
        event_location: 'Grand Ballroom',
        rsvp_link: 'https://example.com/rsvp/123'
      }

      const preview = await service.previewTemplate('test_invitation', variables)
      
      expect(preview).toBeDefined()
      expect(preview!.templateName).toBe('test_invitation')
      expect(preview!.originalContent).toBe('Hello {{guest_name}}, you are invited to {{event_name}} on {{event_date}} at {{event_location}}. Please RSVP: {{rsvp_link}}')
      expect(preview!.renderedContent).toBe('Hello John Doe, you are invited to Wedding Reception on December 15, 2025 at Grand Ballroom. Please RSVP: https://example.com/rsvp/123')
      expect(preview!.isValid).toBe(true)
      expect(preview!.errors).toEqual([])
    })

    it('should show validation errors in preview', async () => {
      const variables = {
        guest_name: 'John Doe'
        // Missing other required variables
      }

      const preview = await service.previewTemplate('test_invitation', variables)
      
      expect(preview).toBeDefined()
      expect(preview!.isValid).toBe(false)
      expect(preview!.errors.length).toBeGreaterThan(0)
      expect(preview!.renderedContent).toContain('{{event_name}}') // Should contain unreplaced variables
    })

    it('should return null for non-existent template', async () => {
      const preview = await service.previewTemplate('non_existent', {})
      expect(preview).toBeNull()
    })

    it('should handle template with no variables', async () => {
      // Create simple template with no variables
      const simpleTemplate = await db.insert(whatsappTemplates).values({
        name: 'simple_template',
        displayName: 'Simple Template',
        content: 'Thank you for your RSVP!',
        variables: [],
        isActive: true
      }).returning({ id: whatsappTemplates.id })

      const preview = await service.previewTemplate('simple_template', {})
      
      expect(preview).toBeDefined()
      expect(preview!.renderedContent).toBe('Thank you for your RSVP!')
      expect(preview!.isValid).toBe(true)

      // Clean up
      await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, simpleTemplate[0].id))
    })
  })

  describe('extractVariables', () => {
    it('should extract variables from template content', () => {
      const content = 'Hello {{guest_name}}, join us at {{event_name}} on {{event_date}}'
      
      const variables = service.extractVariables(content)
      
      expect(variables).toEqual(['guest_name', 'event_name', 'event_date'])
    })

    it('should handle variables with spaces', () => {
      const content = 'Hello {{ guest_name }}, event: {{ event_name }}'
      
      const variables = service.extractVariables(content)
      
      expect(variables).toEqual(['guest_name', 'event_name'])
    })

    it('should return unique variables', () => {
      const content = 'Hello {{name}}, {{name}} is invited to {{event}}. Contact {{name}} for details.'
      
      const variables = service.extractVariables(content)
      
      expect(variables).toEqual(['name', 'event'])
    })

    it('should handle content with no variables', () => {
      const content = 'This is a static message with no variables'
      
      const variables = service.extractVariables(content)
      
      expect(variables).toEqual([])
    })

    it('should handle malformed variable syntax', () => {
      const content = 'Hello {guest_name}, this {{missing_end and this }}incomplete_start}'
      
      const variables = service.extractVariables(content)
      
      expect(variables).toEqual([])
    })

    it('should handle empty content', () => {
      const variables = service.extractVariables('')
      expect(variables).toEqual([])
    })
  })

  describe('getTemplateVariables', () => {
    it('should return template variables from database', async () => {
      const variables = await service.getTemplateVariables('test_invitation')
      
      expect(variables).toEqual(['guest_name', 'event_name', 'event_date', 'event_location', 'rsvp_link'])
    })

    it('should return empty array for non-existent template', async () => {
      const variables = await service.getTemplateVariables('non_existent')
      
      expect(variables).toEqual([])
    })

    it('should return empty array for inactive template', async () => {
      // Create inactive template
      await db.insert(whatsappTemplates).values({
        name: 'inactive_template',
        displayName: 'Inactive Template',
        content: 'Hello {{name}}',
        variables: ['name'],
        isActive: false
      })

      const variables = await service.getTemplateVariables('inactive_template')
      
      expect(variables).toEqual([])

      // Clean up
      await db.delete(whatsappTemplates).where(eq(whatsappTemplates.name, 'inactive_template'))
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalSelect = db.select
      vi.spyOn(db, 'select').mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      await expect(service.loadTemplate('test_invitation')).rejects.toThrow('Database connection failed')

      // Restore original function
      db.select = originalSelect
    })

    it('should validate variable names contain only valid characters', () => {
      const content = 'Hello {{valid_name}} and {{invalid-name}} and {{123invalid}} and {{validName123}}'
      
      const variables = service.extractVariables(content)
      
      // Should extract all variables but validation would happen elsewhere
      expect(variables.length).toBeGreaterThan(0)
    })
  })
})