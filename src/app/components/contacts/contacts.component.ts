import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { Contact } from '../../models/contact.model';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css'
})
export class ContactsComponent {
  private contactService = inject(ContactService);

  contacts$ = this.contactService.contacts$;
  tags$ = this.contactService.tags$;

  selectedTags = signal<string[]>([]);
  showForm = signal(false);
  editingContact = signal<Contact | null>(null);

  filteredContacts = computed(() => this.contactService.getContactsByTags(this.selectedTags()));

  form: Omit<Contact, 'id' | 'createdAt'> = {
    name: '',
    phone: '',
    email: '',
    tags: []
  };
  tagInput = '';

  openAdd(): void {
    this.editingContact.set(null);
    this.form = { name: '', phone: '', email: '', tags: [] };
    this.tagInput = '';
    this.showForm.set(true);
  }

  openEdit(contact: Contact): void {
    this.editingContact.set(contact);
    this.form = { name: contact.name, phone: contact.phone, email: contact.email ?? '', tags: [...contact.tags] };
    this.tagInput = '';
    this.showForm.set(true);
  }

  save(): void {
    const editing = this.editingContact();
    if (editing) {
      this.contactService.updateContact(editing.id, this.form);
    } else {
      this.contactService.addContact(this.form);
    }
    this.showForm.set(false);
  }

  delete(id: string): void {
    if (confirm('Delete this contact?')) {
      this.contactService.deleteContact(id);
    }
  }

  addTag(): void {
    const tag = this.tagInput.trim();
    if (tag && !this.form.tags.includes(tag)) {
      this.form.tags = [...this.form.tags, tag];
    }
    this.tagInput = '';
  }

  removeTag(tag: string): void {
    this.form.tags = this.form.tags.filter(t => t !== tag);
  }

  toggleFilterTag(tag: string): void {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
  }

  isFilterActive(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }
}
