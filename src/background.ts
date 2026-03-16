import type { Contact, RunResult, StartBatchRequest } from "./shared/models";
import { interpolateTemplate } from "./shared/template";
import { storage } from "./shared/storage";

type StartBatchMessage = {
  type: "START_BATCH";
  payload: StartBatchRequest;
};

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureFocusedWhatsAppTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.active || !tab.url?.startsWith("https://web.whatsapp.com/")) {
    throw new Error("Open and focus a WhatsApp Web tab before starting.");
  }
}

function buildPhoneSearchQuery(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-8);
}

async function sendContact(tabId: number, contact: Contact, template: string): Promise<RunResult> {
  const message = interpolateTemplate(template, contact);
  const phoneQuery = buildPhoneSearchQuery(contact.phone);

  if (!phoneQuery) {
    return {
      contactId: contact.id,
      contactName: contact.name,
      phone: contact.phone,
      success: false,
      error: "Invalid contact phone: no digits available for search.",
    };
  }

  const response = await chrome.tabs.sendMessage(tabId, {
    type: "EXT_SEND_CONTACT",
    payload: {
      query: phoneQuery,
      message,
    },
  });

  if (!response?.ok) {
    return {
      contactId: contact.id,
      contactName: contact.name,
      phone: contact.phone,
      success: false,
      error: response?.error ?? "Unknown send error",
    };
  }

  return {
    contactId: contact.id,
    contactName: contact.name,
    phone: contact.phone,
    success: true,
  };
}

chrome.runtime.onMessage.addListener((message: StartBatchMessage, _sender, sendResponse) => {
  if (message?.type !== "START_BATCH") return;

  (async () => {
    const { tabId, contacts, template } = message.payload;
    const settings = await storage.getSettings();

    const results: RunResult[] = [];

    for (const [index, contact] of contacts.entries()) {
      try {
        await ensureFocusedWhatsAppTab(tabId);
        const result = await sendContact(tabId, contact, template);
        results.push(result);
      } catch (error) {
        results.push({
          contactId: contact.id,
          contactName: contact.name,
          phone: contact.phone,
          success: false,
          error: error instanceof Error ? error.message : "Unexpected background error",
        });
      }

      chrome.runtime.sendMessage({
        type: "BATCH_PROGRESS",
        payload: {
          current: index + 1,
          total: contacts.length,
          last: results[results.length - 1],
        },
      });

      await delay(Math.max(200, settings.delayMs));
    }

    chrome.runtime.sendMessage({
      type: "BATCH_DONE",
      payload: {
        results,
      },
    });

    sendResponse({ ok: true });
  })().catch((err) => {
    sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unexpected error" });
  });

  return true;
});
