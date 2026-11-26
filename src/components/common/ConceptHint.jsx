/**
 * Native disclosure for one term. It works on touch devices, needs no state and
 * keeps the plain-English definition next to the word it explains.
 */
export default function ConceptHint({ term, children }) {
  return (
    <details className="group relative inline-block align-baseline">
      <summary className="cursor-help list-none font-medium text-accent underline decoration-dotted underline-offset-2 [&::-webkit-details-marker]:hidden">
        {term}
      </summary>
      <span
        role="note"
        className="absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[260px] whitespace-normal rounded-lg border border-line bg-raised p-2 text-left text-[11px] font-normal normal-case leading-snug text-muted shadow-panel group-open:block"
      >
        {children}
      </span>
    </details>
  );
}
