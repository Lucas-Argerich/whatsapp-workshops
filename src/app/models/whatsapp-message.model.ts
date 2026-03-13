// ────────────────────────────────────────────────────────────
// Official Meta WhatsApp Cloud API payload types (v23.0)
// POST https://graph.facebook.com/v23.0/{PHONE_NUMBER_ID}/messages
// ────────────────────────────────────────────────────────────

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string; // E.164 format, e.g. +5491112345678
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface WhatsAppTemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

export interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: WhatsAppTemplateComponent[];
  };
}

export type WhatsAppPayload = WhatsAppTextMessage | WhatsAppTemplateMessage;

// Cloud API success response
export interface WhatsAppApiSuccess {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

// Cloud API error response
export interface WhatsAppApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

// Internal result used across the app
export interface SendResult {
  contactId: string;
  contactName: string;
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

