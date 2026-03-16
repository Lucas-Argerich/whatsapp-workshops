type SendContactRequest = {
  type: "EXT_SEND_CONTACT";
  payload: {
    query: string;
    message: string;
  };
};

const SEND_LOCK_ATTR = "data-ww-send-lock";
const SEND_LOCK_TTL_MS = 15000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForElement<T extends Element>(selectors: string[], timeoutMs: number): Promise<T | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    for (const selector of selectors) {
      const el = document.querySelector(selector) as T | null;
      if (el) return el;
    }
    await delay(100);
  }
  return null;
}

function setSearchValue(input: Element, value: string): void {
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    input.focus();
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (input instanceof HTMLElement && input.isContentEditable) {
    input.focus();
    input.textContent = "";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "" }));
    document.execCommand("insertText", false, value);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
  }
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function robustClick(target: HTMLElement): void {
  target.scrollIntoView({ block: "nearest", inline: "nearest" });
  target.focus();

  const rect = target.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;

    const topNode = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const effectiveTarget =
      topNode?.closest<HTMLElement>("[role='button'],button,[tabindex],div[role='gridcell']") ?? target;

    const pointerInit: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX,
    clientY,
  };

  const mouseInit: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
    clientX,
    clientY,
    view: window,
  };

  if (typeof PointerEvent !== "undefined") {
      effectiveTarget.dispatchEvent(new PointerEvent("pointerover", pointerInit));
      effectiveTarget.dispatchEvent(new PointerEvent("pointerenter", pointerInit));
      effectiveTarget.dispatchEvent(new PointerEvent("pointerdown", pointerInit));
  }

    effectiveTarget.dispatchEvent(new MouseEvent("mouseover", mouseInit));
    effectiveTarget.dispatchEvent(new MouseEvent("mouseenter", mouseInit));
    effectiveTarget.dispatchEvent(new MouseEvent("mousedown", mouseInit));

  if (typeof PointerEvent !== "undefined") {
      effectiveTarget.dispatchEvent(new PointerEvent("pointerup", { ...pointerInit, buttons: 0 }));
  }

    effectiveTarget.dispatchEvent(new MouseEvent("mouseup", { ...mouseInit, buttons: 0 }));
    effectiveTarget.dispatchEvent(new MouseEvent("click", { ...mouseInit, buttons: 0 }));

  // Native click is often what WhatsApp handlers expect after synthetic event chains.
  effectiveTarget.click();
}

function acquireSendLock(key: string): boolean {
  const root = document.documentElement;
  const now = Date.now();
  const currentRaw = root.getAttribute(SEND_LOCK_ATTR);

  if (currentRaw) {
    try {
      const current = JSON.parse(currentRaw) as { key?: string; ts?: number };
      const ts = typeof current.ts === "number" ? current.ts : 0;
      if (now - ts < SEND_LOCK_TTL_MS) {
        return false;
      }
    } catch {
      // Ignore malformed lock and overwrite it.
    }
  }

  root.setAttribute(SEND_LOCK_ATTR, JSON.stringify({ key, ts: now }));
  return true;
}

function releaseSendLock(key: string): void {
  const root = document.documentElement;
  const currentRaw = root.getAttribute(SEND_LOCK_ATTR);
  if (!currentRaw) return;

  try {
    const current = JSON.parse(currentRaw) as { key?: string };
    if (current.key === key) {
      root.removeAttribute(SEND_LOCK_ATTR);
    }
  } catch {
    root.removeAttribute(SEND_LOCK_ATTR);
  }
}

async function waitForComposer(timeoutMs: number): Promise<boolean> {
  const composer = await waitForElement<HTMLElement>(
    [
      "div[role='textbox'][contenteditable='true'][aria-placeholder='Escribe un mensaje'][data-tab='10']",
      "div[role='textbox'][contenteditable='true'][aria-label^='Escribir un mensaje']",
      "div[role='textbox'][contenteditable='true'][aria-label^='Type a message']",
      "div[contenteditable='true'][data-tab='10']",
    ],
    timeoutMs,
  );

  return Boolean(composer);
}

async function searchAndOpenContact(query: string): Promise<boolean> {
  const searchInput = await waitForElement<Element>(
    [
      "input[role='textbox'][aria-label='Buscar un chat o iniciar uno nuevo']",
      "input[role='textbox'][aria-label='Search or start new chat']",
      "[data-testid='chat-list-search'] input",
      "[data-testid='search-input']",
      "div[contenteditable='true'][data-tab='3']",
    ],
    5000,
  );

  if (!searchInput) return false;

  setSearchValue(searchInput, query);
  await delay(700);

  const startedAt = Date.now();
  const resultSelectors = [
    "[role='row'] [role='gridcell'] div[role='button']",
    "div[aria-label='Lista de chats'][role='grid'] div[role='row'] div[role='gridcell']",
    "div[aria-label='Chat list'][role='grid'] div[role='row'] div[role='gridcell']",
    "#pane-side [role='grid'] [role='row'] [role='gridcell']",
    "#pane-side [role='listitem']",
    "#pane-side [data-testid='cell-frame-container']",
  ];

  while (Date.now() - startedAt < 3000) {
    for (const selector of resultSelectors) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(isVisible);
      const first = candidates[0];
      if (!first) continue;

      const clickable = (first.matches("[role='button']") ? first : first.querySelector<HTMLElement>("[role='button']")) ?? first;

      robustClick(clickable);
      await delay(450);

      if (await waitForComposer(1800)) return true;
    }

    await delay(120);
  }

  // Fallback: Enter usually opens the first highlighted search result.
  if (searchInput instanceof HTMLElement) {
    searchInput.focus();
    searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    if (await waitForComposer(2200)) return true;
  }

  return false;
}

async function sendMessage(text: string): Promise<boolean> {
  const composer = await waitForElement<HTMLElement>(
    [
      "div[role='textbox'][contenteditable='true'][aria-placeholder='Escribe un mensaje'][data-tab='10']",
      "div[role='textbox'][contenteditable='true'][aria-label^='Escribir un mensaje']",
      "div[role='textbox'][contenteditable='true'][aria-label^='Type a message']",
      "div[contenteditable='true'][data-tab='10']",
      "footer div[role='textbox'][contenteditable='true']",
      "footer div[contenteditable='true']",
    ],
    5000,
  );
  if (!composer) return false;

  composer.focus();
  // Use a single insertion path to avoid duplicated text in Lexical editors.
  document.execCommand("selectAll", false);
  document.execCommand("delete", false);

  const inserted = document.execCommand("insertText", false, text);
  if (!inserted) {
    composer.textContent = text;
    composer.dispatchEvent(new Event("input", { bubbles: true }));
  }
  await delay(250);

  const footer = composer.closest("footer") as HTMLElement | null;
  const sendSelector =
    "button[data-tab='11'][aria-label='Enviar'][aria-disabled='false'], " +
    "button[data-tab='11'][aria-label='Send'][aria-disabled='false'], " +
    "button[data-testid='compose-btn-send'], " +
    "button[aria-label='Enviar'], " +
    "button[aria-label='Send'], " +
    "button:has(span[data-icon='wds-ic-send-filled']), " +
    "button:has(span[data-icon='send'])";

  const sendBtn = (footer?.querySelector<HTMLElement>(sendSelector) ?? document.querySelector<HTMLElement>(sendSelector)) as HTMLElement | null;
  if (sendBtn) {
    sendBtn.click();
    return true;
  }

  composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  composer.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  return true;
}

chrome.runtime.onMessage.addListener((message: SendContactRequest, _sender, sendResponse) => {
  if (message?.type !== "EXT_SEND_CONTACT") return;

  const lockKey = `${message.payload.query}|${message.payload.message}`;
  if (!acquireSendLock(lockKey)) {
    sendResponse({ ok: true, deduped: true });
    return;
  }

  (async () => {
    try {
      const opened = await searchAndOpenContact(message.payload.query);
      if (!opened) {
        sendResponse({ ok: false, error: `Contact not found: ${message.payload.query}` });
        return;
      }

      const sent = await sendMessage(message.payload.message);
      if (!sent) {
        sendResponse({ ok: false, error: "Could not locate message box or send button." });
        return;
      }

      sendResponse({ ok: true });
    } finally {
      releaseSendLock(lockKey);
    }
  })().catch((err) => {
    sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unexpected error" });
    releaseSendLock(lockKey);
  });

  return true;
});
