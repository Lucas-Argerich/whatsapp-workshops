import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { TemplateService } from '../../services/template.service';
import { WhatsAppService } from '../../services/whatsapp.service';
import { Contact } from '../../models/contact.model';
import { SendResult } from '../../models/whatsapp-message.model';

@Component({
  selector: 'app-composer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './composer.component.html',
  styleUrl: './composer.component.css'
})
export class ComposerComponent {
  private contactService = inject(ContactService);
  private templateService = inject(TemplateService);
  private whatsAppService = inject(WhatsAppService);

  tags$ = this.contactService.tags$;
  selectedTags = signal<string[]>([]);
  templateText = signal<string>('');
  results = signal<SendResult[]>([]);
  sending = signal<boolean>(false);

  isConfigured = computed(() => this.whatsAppService.isConfigured());

  filteredContacts = computed(() => {
    return this.contactService.getContactsByTags(this.selectedTags());
  });

  previewText = computed(() => this.templateService.preview(this.templateText()));

  canSend(): boolean {
    return (
      this.isConfigured() &&
      this.selectedTags().length > 0 &&
      this.templateText().trim().length > 0 &&
      this.filteredContacts().length > 0 &&
      !this.sending()
    );
  }

  toggleTag(tag: string): void {
    const selected = this.selectedTags();
    if (selected.includes(tag)) {
      this.selectedTags.set(selected.filter((t) => t !== tag));
      return;
    }
    this.selectedTags.set([...selected, tag]);
  }

  clearTags(): void {
    this.selectedTags.set([]);
  }

  sendMessages(): void {
    const contacts = this.filteredContacts();
    this.sending.set(true);
    this.results.set([]);
    const collected: SendResult[] = [];
    let pending = contacts.length;
    if (pending === 0) { this.sending.set(false); return; }

    contacts.forEach((contact: Contact) => {
      const text = this.templateService.interpolate(
        { id: '', name: '', content: this.templateText(), variables: [], createdAt: new Date() },
        contact
      );
      this.whatsAppService.sendTextMessage(contact, text).subscribe({
        next: (res) => {
          collected.push(res);
          this.results.set([...collected]);
          if (--pending === 0) this.sending.set(false);
        },
        error: (res: SendResult) => {
          collected.push(res);
          this.results.set([...collected]);
          if (--pending === 0) this.sending.set(false);
        }
      });
    });
  }
}

