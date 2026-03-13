import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MessageTemplate } from '../models/message-template.model';
import { Contact } from '../models/contact.model';

// ---------------------------------------------------------------------------
// Supported template variables
//   ${contactName}   – contact's full name
//   ${contactPhone}  – contact's phone number
//   ${contactEmail}  – contact's email (if set)
//   ${date}          – today's date  (es-AR locale)
//   Any custom field from contact can also be interpolated via the same syntax
// ---------------------------------------------------------------------------
const VARIABLE_REGEX = /\$\{(\w+)\}/g;

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private templatesSubject = new BehaviorSubject<MessageTemplate[]>([]);
  public templates$ = this.templatesSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------
  addTemplate(data: Omit<MessageTemplate, 'id' | 'createdAt' | 'variables'>): MessageTemplate {
    const template: MessageTemplate = {
      ...data,
      id: `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date(),
      variables: this.extractVariables(data.content)
    };
    const updated = [...this.templatesSubject.value, template];
    this.templatesSubject.next(updated);
    this.saveToStorage(updated);
    return template;
  }

  updateTemplate(id: string, data: Partial<Pick<MessageTemplate, 'name' | 'content'>>): void {
    const updated = this.templatesSubject.value.map(t => {
      if (t.id !== id) return t;
      const newContent = data.content ?? t.content;
      return {
        ...t,
        ...data,
        content: newContent,
        variables: this.extractVariables(newContent)
      };
    });
    this.templatesSubject.next(updated);
    this.saveToStorage(updated);
  }

  deleteTemplate(id: string): void {
    const updated = this.templatesSubject.value.filter(t => t.id !== id);
    this.templatesSubject.next(updated);
    this.saveToStorage(updated);
  }

  getById(id: string): MessageTemplate | undefined {
    return this.templatesSubject.value.find(t => t.id === id);
  }

  // -------------------------------------------------------------------------
  // Interpolation
  // -------------------------------------------------------------------------

  /** Replace all ${variable} tokens in a template for a given contact. */
  interpolate(template: MessageTemplate, contact: Contact): string {
    const vars = this.buildVarMap(contact);
    return template.content.replace(VARIABLE_REGEX, (_, key: string) => vars[key] ?? `\${${key}}`);
  }

  /** Preview interpolation with placeholder values (for the UI preview). */
  preview(content: string): string {
    return content.replace(VARIABLE_REGEX, (_, key: string) => `[${key}]`);
  }

  /** List all ${...} variable names found in a template string. */
  extractVariables(content: string): string[] {
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    const re = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = re.exec(content)) !== null) {
      found.add(match[1]);
    }
    return Array.from(found);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------
  private buildVarMap(contact: Contact): Record<string, string> {
    return {
      contactName: contact.name,
      contactPhone: contact.phone,
      contactEmail: contact.email ?? '',
      date: new Date().toLocaleDateString('es-AR')
    };
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('wa_templates');
    if (!stored) return;
    try {
      const templates: MessageTemplate[] = JSON.parse(stored).map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt)
      }));
      this.templatesSubject.next(templates);
    } catch {
      console.error('Error loading templates from storage');
    }
  }

  private saveToStorage(templates: MessageTemplate[]): void {
    localStorage.setItem('wa_templates', JSON.stringify(templates));
  }
}
