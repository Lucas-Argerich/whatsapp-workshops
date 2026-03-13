export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[]; // e.g., ['contactName', 'customField1']
  createdAt: Date;
}

export interface ProcessedMessage {
  contact: string; // contact id
  message: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
}
