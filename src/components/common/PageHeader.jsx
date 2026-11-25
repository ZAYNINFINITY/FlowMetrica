export default function PageHeader({ eyebrow, title, description, actions, meta }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="reveal reveal-1 mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            <span aria-hidden="true" className="h-px w-4 bg-accent/60" />
            {eyebrow}
          </p>
        )}
        <h1 className="reveal reveal-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="reveal reveal-3 mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-muted">{description}</p>
        )}
        {meta && <div className="reveal reveal-4 mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="reveal reveal-4 flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
