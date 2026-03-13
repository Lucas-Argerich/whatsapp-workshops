export interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  email?: string;
  createdAt: Date;
}
