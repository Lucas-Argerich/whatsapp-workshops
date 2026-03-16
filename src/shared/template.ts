import type { Contact } from "./models";

export function interpolateTemplate(template: string, contact: Contact): string {
  const vars: Record<string, string> = {
    name: contact.name,
    contactName: contact.name,
    phone: contact.phone,
    contactPhone: contact.phone,
    email: contact.email ?? "",
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? `{{${key}}}`;
  });
}
