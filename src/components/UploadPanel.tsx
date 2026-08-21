import { useState, type ChangeEvent, type DragEvent } from "react";

interface UploadPanelProps {
  busy: boolean;
  onFile: (file: File) => void;
}

export function UploadPanel({ busy, onFile }: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) onFile(file);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <section className="panel upload-panel">
      <div
        className={`dropzone ${dragActive ? "drag-active" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className="upload-icon" aria-hidden="true">↑</div>
        <h2>{busy ? "Reading your file…" : "Drop your lead file here"}</h2>
        <p>CSV, XLSX or XLS · your lead file stays on this device and is never uploaded or stored by DemandLint</p>
        <label className="button primary" htmlFor="lead-file-input">
          {busy ? "Processing…" : "Choose file"}
        </label>
        <input
          id="lead-file-input"
          className="visually-hidden"
          type="file"
          accept=".csv,.tsv,.xlsx,.xls,text/csv,text/tab-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileInput}
          disabled={busy}
        />
      </div>
    </section>
  );
}
