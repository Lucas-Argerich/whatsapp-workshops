import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  WhatsAppPayload,
  WhatsAppApiSuccess,
  WhatsAppApiError,
  SendResult
} from '../models/whatsapp-message.model';
import { Contact } from '../models/contact.model';

// ---------------------------------------------------------------------------
// WhatsApp Cloud API configuration
// Replace PHONE_NUMBER_ID and ACCESS_TOKEN via environment variables or via
// the in-app settings stored in localStorage ('wa_phone_number_id' /
// 'wa_access_token').
// ---------------------------------------------------------------------------
const API_VERSION = 'v23.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export interface WaConfig {
  phoneNumberId: string;
  accessToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  private http = inject(HttpClient);

  // -------------------------------------------------------------------------
  // Config helpers (stored in localStorage so users can set them at runtime)
  // -------------------------------------------------------------------------
  getConfig(): WaConfig {
    return {
      phoneNumberId: localStorage.getItem('wa_phone_number_id') ?? '',
      accessToken: localStorage.getItem('wa_access_token') ?? ''
    };
  }

  saveConfig(config: WaConfig): void {
    localStorage.setItem('wa_phone_number_id', config.phoneNumberId);
    localStorage.setItem('wa_access_token', config.accessToken);
  }

  isConfigured(): boolean {
    const { phoneNumberId, accessToken } = this.getConfig();
    return phoneNumberId.length > 0 && accessToken.length > 0;
  }

  // -------------------------------------------------------------------------
  // Send a plain-text message to a single contact
  // -------------------------------------------------------------------------
  sendTextMessage(contact: Contact, text: string): Observable<SendResult> {
    const { phoneNumberId, accessToken } = this.getConfig();
    const url = `${BASE_URL}/${phoneNumberId}/messages`;

    const payload: WhatsAppPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(contact.phone),
      type: 'text',
      text: { body: text }
    };

    return this.http
      .post<WhatsAppApiSuccess>(url, payload, { headers: this.buildHeaders(accessToken) })
      .pipe(
        map((res): SendResult => ({
          contactId: contact.id,
          contactName: contact.name,
          phone: contact.phone,
          success: true,
          messageId: res.messages?.[0]?.id
        })),
        catchError((err: HttpErrorResponse) => {
          const apiErr = err.error as WhatsAppApiError;
          return throwError((): SendResult => ({
            contactId: contact.id,
            contactName: contact.name,
            phone: contact.phone,
            success: false,
            error: apiErr?.error?.message ?? err.message
          }));
        })
      );
  }

  // -------------------------------------------------------------------------
  // Send a Meta-approved template message (e.g. hello_world)
  // -------------------------------------------------------------------------
  sendTemplateMessage(
    contact: Contact,
    templateName: string,
    languageCode: string,
    componentParams: string[] = []
  ): Observable<SendResult> {
    const { phoneNumberId, accessToken } = this.getConfig();
    const url = `${BASE_URL}/${phoneNumberId}/messages`;

    const payload: WhatsAppPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(contact.phone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(componentParams.length > 0 && {
          components: [
            {
              type: 'body',
              parameters: componentParams.map(p => ({ type: 'text', text: p }))
            }
          ]
        })
      }
    };

    return this.http
      .post<WhatsAppApiSuccess>(url, payload, { headers: this.buildHeaders(accessToken) })
      .pipe(
        map((res): SendResult => ({
          contactId: contact.id,
          contactName: contact.name,
          phone: contact.phone,
          success: true,
          messageId: res.messages?.[0]?.id
        })),
        catchError((err: HttpErrorResponse) => {
          const apiErr = err.error as WhatsAppApiError;
          return throwError((): SendResult => ({
            contactId: contact.id,
            contactName: contact.name,
            phone: contact.phone,
            success: false,
            error: apiErr?.error?.message ?? err.message
          }));
        })
      );
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------
  private buildHeaders(accessToken: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    });
  }

  /** Ensures the phone number is in E.164 format (keeps existing + prefix) */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+${digits}`;
  }
}
