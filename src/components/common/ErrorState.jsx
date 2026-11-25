import { CircleAlert, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  compact = false,
}) {
  return (
    <div
      role="alert"
      className={`rounded-lg border border-danger/35 bg-danger/5 ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-danger/30 bg-danger/10 text-danger">
          <CircleAlert aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {message && <p className="mt-1 text-[13px] leading-relaxed text-muted">{message}</p>}
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-secondary btn-xs mt-3">
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
