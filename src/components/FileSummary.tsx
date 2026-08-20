import type { ParsedTable } from "../application/public";

interface FileSummaryProps {
  table: ParsedTable;
  onReset: () => void;
}

export function FileSummary({ table, onReset }: FileSummaryProps) {
  return (
    <section className="panel file-summary">
      <div>
        <p className="section-label">SOURCE FILE</p>
        <h2>{table.metadata.fileName}</h2>
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
