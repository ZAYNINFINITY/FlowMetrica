import { useState } from 'react';
import { FileText, FolderSearch, Printer, Trash2 } from 'lucide-react';

import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import SourceBadge from '../components/common/SourceBadge.jsx';
import { useToast } from '../components/common/Toast.jsx';
import ReportDocument from '../components/ReportDocument.jsx';
import { useReports } from '../hooks/useReports.js';
import { formatDateTime } from '../lib/format.js';

export default function SavedInvestigations() {
  const { reports, deleteReport } = useReports();
  const notify = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const selected = reports.find((report) => report.id === selectedId) ?? reports[0] ?? null;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    try {
      deleteReport(pendingDelete.id);
      if (selectedId === pendingDelete.id) setSelectedId(null);
      notify({
        title: 'Report deleted',
        description: `${pendingDelete.incidentId} · removed from this browser`,
        tone: 'success',
      });
    } catch (cause) {
      notify({ title: 'Report could not be deleted', description: cause.message, tone: 'error' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Saved Investigations"
        description="Template reports generated from predefined incidents. They are stored in this browser only and never uploaded."
        meta={
          <>
            <span className="chip">{reports.length} of 20 stored</span>
            <span className="chip">localStorage</span>
          </>
        }
        actions={
          <a href="#/module3" className="btn-secondary btn-xs">
            <FolderSearch aria-hidden="true" className="h-3.5 w-3.5" />
            New investigation
          </a>
        }
      />

      {reports.length === 0 ? (
        <div className="surface p-6">
          <EmptyState
            icon={FileText}
            title="No saved reports yet"
            description="Open Incident Investigation, choose a predefined incident and generate a template report. It will appear here immediately."
            action={
              <a href="#/module3" className="btn-primary btn-xs">
                Open Incident Investigation
              </a>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-list-detail">
          <section aria-labelledby="saved-list-heading" className="surface flex flex-col p-3">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <h2 id="saved-list-heading" className="meta-label">
                Reports
              </h2>
              <span className="font-mono text-[10px] text-muted">{reports.length}</span>
            </div>
            <ul className="space-y-1.5">
              {reports.map((report) => {
                const active = selected?.id === report.id;
                return (
                  <li
                    key={report.id}
                    className={`flex items-stretch gap-1 rounded-lg border transition-colors ${
                      active ? 'border-accent/50 bg-accent/10' : 'border-line bg-sunken/50 hover:border-line/90'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(report.id)}
                      aria-current={active ? 'true' : undefined}
                      className="min-w-0 flex-1 rounded-lg p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-analysis">{report.incidentId}</span>
                        <span className="font-mono text-[9.5px] text-muted">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-ink">{report.title}</span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-muted">
                        {formatDateTime(report.createdAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(report)}
                      aria-label={`Delete report ${report.incidentId} · ${report.title}`}
                      title="Delete report"
                      className="my-1 mr-1 grid w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-auto px-1 pt-3 text-[10.5px] leading-relaxed text-muted">
              Deleting a report removes it from this browser permanently.
            </p>
          </section>

          <section aria-label="Selected report" className="min-w-0 space-y-3">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SourceBadge source="template_generated" />
                    <span className="chip">{selected.incidentId}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => window.print()} className="btn-secondary btn-xs">
                      <Printer aria-hidden="true" className="h-3.5 w-3.5" />
                      Print report
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(selected)}
                      className="btn-danger btn-xs"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
                <ReportDocument report={selected} />
              </>
            ) : (
              <EmptyState
                icon={FileText}
                title="Select a report"
                description="Choose a report from the list to read it, print it, or delete it."
              />
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this report?"
        description={
          pendingDelete
            ? `${pendingDelete.incidentId} · ${pendingDelete.title} will be removed from this browser. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete report"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
