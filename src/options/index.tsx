import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { storage } from "../shared/storage";

function App() {
  const [delayMs, setDelayMs] = useState(600);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    storage.getSettings().then((settings) => setDelayMs(settings.delayMs));
  }, []);

  async function save() {
    await storage.saveSettings({ delayMs: Math.max(200, delayMs) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="page">
      <h2>WhatsApp Workshop Sender - Settings</h2>
      <p className="muted">This extension automates WhatsApp Web UI. Keep the WhatsApp Web tab focused while runs are active.</p>

      <label>
        Delay between messages (ms)
        <input type="number" min={200} value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} />
      </label>

      <button onClick={save}>Save</button>
      {saved && <span className="muted"> Saved</span>}
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
