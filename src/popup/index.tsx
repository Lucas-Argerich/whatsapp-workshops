import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import type { Contact, RunResult } from "../shared/models";
import { storage } from "../shared/storage";
import { parseContactsFromXlsx } from "../shared/xlsx";

const CHUNK_SIZE = 100;

function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [template, setTemplate] = useState("Hola {{name}} 👋");
  const [chunkIndex, setChunkIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("Idle");
  const [results, setResults] = useState<RunResult[]>([]);
  const [resultFilter, setResultFilter] = useState<"all" | "ok" | "err">("all");
  const [importStatus, setImportStatus] = useState("No file imported yet.");

  const tags = useMemo(
    () => Array.from(new Set(contacts.flatMap((c) => c.tags))).sort(),
    [contacts],
  );

  const filtered = useMemo(() => {
    if (!selectedTag) return contacts;
    return contacts.filter((c) => c.tags.includes(selectedTag));
  }, [contacts, selectedTag]);

  const chunks = useMemo(() => {
    const out: Array<{ index: number; start: number; end: number }> = [];
    for (let i = 0; i < Math.ceil(filtered.length / CHUNK_SIZE); i += 1) {
      const start = i * CHUNK_SIZE + 1;
      const end = Math.min((i + 1) * CHUNK_SIZE, filtered.length);
      out.push({ index: i, start, end });
    }
    return out;
  }, [filtered]);

  const selectedChunk = chunks.find((c) => c.index === chunkIndex) ?? chunks[0];
  const successCount = useMemo(() => results.filter((r) => r.success).length, [results]);
  const errorCount = useMemo(() => results.filter((r) => !r.success).length, [results]);
  const visibleResults = useMemo(() => {
    if (resultFilter === "ok") return results.filter((r) => r.success);
    if (resultFilter === "err") return results.filter((r) => !r.success);
    return results;
  }, [results, resultFilter]);
  const canStart = !running && Boolean(selectedTag) && Boolean(filtered.length) && Boolean(template.trim());

  useEffect(() => {
    storage.getContacts().then(setContacts);

    const handler = (msg: any) => {
      if (msg?.type === "BATCH_PROGRESS") {
        const { current, total, last } = msg.payload;
        setProgress(`Sending ${current}/${total} - ${last.contactName}`);
        setResults((prev) => [...prev, last]);
      }
      if (msg?.type === "BATCH_DONE") {
        setProgress("Completed");
        setRunning(false);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  async function importXlsx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await parseContactsFromXlsx(file);
      if (!imported.length) {
        setImportStatus(
          "0 contacts imported. Check headers like fullname/full_name and mobile_phone/phone.",
        );
        e.target.value = "";
        return;
      }

      await storage.saveContacts(imported);
      setContacts(imported);
      setImportStatus(`Imported ${imported.length} contacts from ${file.name}.`);
    } catch (error) {
      setImportStatus(
        `Import failed: ${error instanceof Error ? error.message : "Unknown XLSX parse error"}`,
      );
    } finally {
      e.target.value = "";
    }
  }

  function toggleTag(tag: string) {
    setSelectedTag((prev) => (prev === tag ? "" : tag));
  }

  async function startBatch() {
    if (!selectedTag) {
      setProgress("Select one tag before starting.");
      return;
    }
    if (!template.trim()) return;
    if (!chunks.length) return;

    const chunk = selectedChunk ?? chunks[0];
    const batchContacts = filtered.slice(chunk.start - 1, chunk.end);

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id || !activeTab.url?.startsWith("https://web.whatsapp.com/")) {
      setProgress("Open WhatsApp Web tab and keep it focused.");
      return;
    }

    setRunning(true);
    setResults([]);
    setResultFilter("all");
    setProgress("Starting...");

    await chrome.runtime.sendMessage({
      type: "START_BATCH",
      payload: {
        tabId: activeTab.id,
        contacts: batchContacts,
        template,
      },
    });
  }

  return (
    <div className="app">
      <header className="hero card">
        <div>
          <div className="eyebrow">WhatsApp Workshop Runner</div>
          <h1>Batch Sender</h1>
          <p className="muted">Import contacts, select one tag, and run in chunks of 100.</p>
        </div>
        <div className={`status-pill ${running ? "running" : "idle"}`}>{running ? "Running" : "Ready"}</div>
      </header>

      <section className="card section">
        <div className="section-title-row">
          <h2>1. Import Contacts</h2>
          <button className="secondary" onClick={() => chrome.runtime.openOptionsPage()}>
            Settings
          </button>
        </div>

        <label className="file-input-wrap">
          <input type="file" accept=".xlsx,.xls" onChange={importXlsx} />
          <span>Choose XLSX/XLS File</span>
        </label>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Contacts</div>
            <div className="stat-value">{contacts.length}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Active Tag</div>
            <div className="stat-value small">{selectedTag || "None"}</div>
          </div>
        </div>

        <div className="muted import-status">{importStatus}</div>
      </section>

      <section className="card section">
        <div className="section-title-row">
          <h2>2. Choose Tag</h2>
          {selectedTag ? (
            <button className="secondary" onClick={() => setSelectedTag("")}>Clear</button>
          ) : null}
        </div>

        {tags.length ? (
          <div className="tags">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`tag ${selectedTag === tag ? "active" : ""}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : (
          <div className="muted">No tags found yet. Import a file that includes tags.</div>
        )}
      </section>

      <section className="card section">
        <h2>3. Compose Campaign</h2>

        <div className="field">
          <label>Chunk offset (100 contacts per run)</label>
          <select value={chunkIndex} onChange={(e) => setChunkIndex(Number(e.target.value))}>
            {chunks.map((c) => (
              <option key={c.index} value={c.index}>
                {c.start}...{c.end}
              </option>
            ))}
          </select>
        </div>

        <div className="muted">
          Filtered contacts: {filtered.length}
          {selectedChunk ? ` | Current chunk: ${selectedChunk.start}...${selectedChunk.end}` : ""}
        </div>

        <div className="field">
          <label>Message template</label>
          <textarea rows={6} value={template} onChange={(e) => setTemplate(e.target.value)} />
        </div>

        <div className="muted">Variables: {'{{name}}'}, {'{{phone}}'}, {'{{email}}'}</div>
      </section>

      <section className="card section">
        <h2>4. Run Batch</h2>
        <button className="primary" disabled={!canStart} onClick={startBatch}>
          {running ? "Running..." : "Start run"}
        </button>
        {!selectedTag ? <div className="muted">Select a tag to enable sending.</div> : null}
        <div className="muted">{progress}</div>
      </section>

      <section className="card section results-section">
        <div className="section-title-row">
          <h2>Results</h2>
          <div className="row compact">
            <button
              className={`counter ok-counter ${resultFilter === "ok" ? "active" : ""}`}
              onClick={() => setResultFilter((prev) => (prev === "ok" ? "all" : "ok"))}
              title="Filter OK"
            >
              OK {successCount}
            </button>
            <button
              className={`counter err-counter ${resultFilter === "err" ? "active" : ""}`}
              onClick={() => setResultFilter((prev) => (prev === "err" ? "all" : "err"))}
              title="Filter ERR"
            >
              ERR {errorCount}
            </button>
          </div>
        </div>

        <div className="muted">Showing: {resultFilter.toUpperCase()}</div>

        <div className="results">
          {visibleResults.map((r) => (
            <div key={`${r.contactId}-${r.success}-${r.error ?? ""}`} className={`result-row ${r.success ? "ok" : "err"}`}>
              <span className="badge">{r.success ? "OK" : "ERR"}</span>
              <span className="result-name">{r.contactName}</span>
              {r.error ? <span className="result-error">{r.error}</span> : null}
            </div>
          ))}
          {!visibleResults.length ? <div className="muted">No results for current filter.</div> : null}
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
