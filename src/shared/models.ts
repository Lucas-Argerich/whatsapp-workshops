export interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  email?: string;
  createdAt: string;
}

export interface RunResult {
  contactId: string;
  contactName: string;
  phone: string;
  success: boolean;
  error?: string;
}

export interface ExtensionSettings {
  delayMs: number;
}

export interface StartBatchRequest {
  tabId: number;
  contacts: Contact[];
  template: string;
}
