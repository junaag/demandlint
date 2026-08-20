import type { ParsedTable } from "../application/public";

interface FileSummaryProps {
  table: ParsedTable;
  busy: boolean;
  onReset: () => void;
  onSheetChange: (sheetName: string) => void;
}

export function FileSummary({ table, busy, onReset, onSheetChange }: FileSummaryProps) {
  const workbookSheets = table.metadata.workbookSheets ?? [];
  const hasMultipleSheets = workbookSheets.length > 1;

  return (
    <section className="panel file-summary">
      <div className="file-identity">
        <p className="section-label">SOURCE FILE</p>
        <h2>{table.metadata.fileName}</h2>
        {hasMultipleSheets && (
          <label className="sheet-selector">
            <span>Worksheet</span>
            <select
              value={table.metadata.sheetName}
              disabled={busy}
              onChange={(event) => onSheetChange(event.currentTarget.value)}
            >
              {workbookSheets.map((sheet) => (
                <option key={`${sheet.index}:${sheet.name}`} value={sheet.name} disabled={!sheet.usable}>
                  {sheet.name} · {sheet.rowCount} rows{sheet.usable ? "" : " · empty"}
                </option>
              ))}
            </select>
            <small>
              {table.metadata.sheetSelection === "manual"
                ? "Worksheet selected manually."
                : "Best worksheet selected automatically."}
            </small>
          </label>
        )}
      </div>
      <div className="metadata-grid">
        <div><strong>{table.metadata.rowCount}</strong><span>Rows</span></div>
        <div><strong>{table.metadata.columnCount}</strong><span>Columns</span></div>
        <div><strong>{table.metadata.sourceType.toUpperCase()}</strong><span>Format</span></div>
        <div>
          <strong>{table.metadata.sheetName ?? table.metadata.delimiter ?? "—"}</strong>
          <span>{table.metadata.sheetName ? "Sheet" : "Delimiter"}</span>
        </div>
      </div>
      <button className="button ghost" type="button" onClick={onReset}>Use another file</button>
    </section>
  );
}
