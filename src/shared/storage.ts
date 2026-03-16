import type { Contact, ExtensionSettings } from "./models";

const CONTACTS_KEY = "ext_contacts";
const SETTINGS_KEY = "ext_settings";

const defaultSettings: ExtensionSettings = {
  delayMs: 600,
};

export const storage = {
  async getContacts(): Promise<Contact[]> {
    const data = await chrome.storage.local.get(CONTACTS_KEY);
    return (data[CONTACTS_KEY] as Contact[] | undefined) ?? [];
  },

  async saveContacts(contacts: Contact[]): Promise<void> {
    await chrome.storage.local.set({ [CONTACTS_KEY]: contacts });
  },

  async getSettings(): Promise<ExtensionSettings> {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...defaultSettings, ...(data[SETTINGS_KEY] ?? {}) };
  },

  async saveSettings(settings: ExtensionSettings): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  },
};
