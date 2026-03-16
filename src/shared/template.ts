import type { Contact } from "./models";

function getFirstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.split(/\s+/)[0] ?? "";
}

export function interpolateTemplate(template: string, contact: Contact): string {
  const firstName = getFirstName(contact.name);

  const vars: Record<string, string> = {
    name: firstName,
    contactName: firstName,
    phone: contact.phone,
    contactPhone: contact.phone,
    email: contact.email ?? "",
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? `{{${key}}}`;
  });
}
