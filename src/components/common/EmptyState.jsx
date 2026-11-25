export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-sunken/60 text-center ${
        compact ? 'px-4 py-8' : 'px-6 py-12'
      }`}
    >
      {Icon && (
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg border border-line bg-raised text-muted">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      )}
      <p className="card-title">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
