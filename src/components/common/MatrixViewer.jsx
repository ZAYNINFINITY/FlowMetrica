function formatValue(value) {
  if (typeof value !== 'number') return String(value ?? '');
  return String(Number(value.toFixed(6)));
}

/**
 * Monospace matrix with an explicit bracket frame and a visual separator before
 * the augmented column. Rows can be highlighted to expose a contradiction.
 */
export default function MatrixViewer({
  matrix,
  caption,
  augmented = false,
  dense = false,
  highlightRow = null,
  highlightSolutionColumn = false,
  columnLabels,
}) {
  if (!Array.isArray(matrix) || matrix.length === 0) return null;

  const width = matrix[0].length;
  const cell = dense ? 'minmax(1.9rem, 1fr)' : 'minmax(2.6rem, 1fr)';
  const template = `repeat(${width}, ${cell})`;
  const label = caption ?? 'Matrix';

  return (
    <figure className="min-w-0 max-w-full">
      {caption && (
        <figcaption className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {caption}
        </figcaption>
      )}
      <div className="max-w-full overflow-x-auto pb-1">
        <div className="inline-flex min-w-full items-stretch font-mono text-[13px] leading-none text-ink">
          <span
            aria-hidden="true"
            className="w-1.5 shrink-0 rounded-l-sm border-y border-l border-muted/50"
          />
          <div
            role="table"
            aria-label={label}
            className={`grid gap-y-0.5 px-2.5 ${dense ? 'py-1' : 'py-2'}`}
          >
            {Array.isArray(columnLabels) && columnLabels.length === width && (
              <div role="row" className="grid gap-x-2" style={{ gridTemplateColumns: template }}>
                {columnLabels.map((columnLabel, index) => (
                  <span
                    key={`${columnLabel}-${index}`}
                    role="columnheader"
                    className="pb-1 text-right text-[10px] font-medium uppercase tracking-wide text-muted"
                  >
                    {columnLabel}
                  </span>
                ))}
              </div>
            )}
            {matrix.map((row, rowIndex) => {
              const highlighted = highlightRow === rowIndex;
              return (
                <div
                  key={rowIndex}
                  role="row"
                  className={`grid items-center gap-x-2 rounded-sm px-1 ${
                    highlighted ? 'bg-danger/10 ring-1 ring-inset ring-danger/30' : ''
                  }`}
                  style={{ gridTemplateColumns: template }}
                >
                  {row.map((value, columnIndex) => {
                    const isAugmented = augmented && columnIndex === width - 1;
                    const isSolution = isAugmented && highlightSolutionColumn;
                    return (
                      <span
                        key={columnIndex}
                        role="cell"
                        className={`relative py-1 text-right tabular-nums ${
                          isAugmented ? 'pl-2.5' : ''
                        } ${isSolution ? 'font-semibold text-accent' : ''}`}
                      >
                        {isAugmented && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-0 left-0 w-px bg-line"
                          />
                        )}
                        {formatValue(value)}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <span
            aria-hidden="true"
            className="w-1.5 shrink-0 rounded-r-sm border-y border-r border-muted/50"
          />
        </div>
      </div>
    </figure>
  );
}
