import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Contact } from '../models/contact.model';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private contactsSubject = new BehaviorSubject<Contact[]>([]);
  public contacts$ = this.contactsSubject.asObservable();

  private tagsSubject = new BehaviorSubject<string[]>([]);
  public tags$ = this.tagsSubject.asObservable();

  constructor() {
    this.loadContactsFromStorage();
    this.updateTags();
  }

  private loadContactsFromStorage(): void {
    const stored = localStorage.getItem('whatsapp_contacts');
    if (stored) {
      try {
        const contacts = JSON.parse(stored).map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        }));
        this.contactsSubject.next(contacts);
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    }
  }

  private saveContactsToStorage(contacts: Contact[]): void {
    localStorage.setItem('whatsapp_contacts', JSON.stringify(contacts));
  }

  private updateTags(): void {
    const contacts = this.contactsSubject.value;
    const allTags = new Set<string>();
    contacts.forEach(contact => {
      contact.tags.forEach(tag => allTags.add(tag));
    });
    this.tagsSubject.next(Array.from(allTags).sort());
  }

  addContact(contact: Omit<Contact, 'id' | 'createdAt'>): Contact {
    const newContact: Contact = {
      ...contact,
      id: this.generateId(),
      createdAt: new Date()
    };
    const contacts = [...this.contactsSubject.value, newContact];
    this.contactsSubject.next(contacts);
    this.saveContactsToStorage(contacts);
    this.updateTags();
    return newContact;
  }

  updateContact(id: string, updates: Partial<Contact>): void {
    const contacts = this.contactsSubject.value.map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
    this.contactsSubject.next(contacts);
    this.saveContactsToStorage(contacts);
    this.updateTags();
  }

  deleteContact(id: string): void {
    const contacts = this.contactsSubject.value.filter(c => c.id !== id);
    this.contactsSubject.next(contacts);
    this.saveContactsToStorage(contacts);
    this.updateTags();
  }

  getContactsByTags(tags: string[]): Contact[] {
    if (tags.length === 0) {
      return this.contactsSubject.value;
    }
    return this.contactsSubject.value.filter(contact =>
      tags.some(tag => contact.tags.includes(tag))
    );
  }

  getContactById(id: string): Contact | undefined {
    return this.contactsSubject.value.find(c => c.id === id);
  }

  private generateId(): string {
    return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
