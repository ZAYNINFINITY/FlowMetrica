import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

import ConceptHint from '../components/common/ConceptHint.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import SourceBadge from '../components/common/SourceBadge.jsx';
import { pressable, rise, stagger } from '../lib/motion.js';

const FLOW = [
  {
    number: '01',
    label: 'Scenario',
    value: 'A network story',
    detail: 'Known demand or a fault is written as fixed JSON.',
  },
  {
    number: '02',
    label: 'Model',
    value: 'A · x = b',
    detail: 'Rows are conservation rules; x holds unknown link flows.',
  },
  {
    number: '03',
    label: 'Reduce',
    value: 'RREF',
    detail: 'Elimination exposes rank, pivots and consistency.',
  },
  {
    number: '04',
    label: 'Serve',
    value: 'Answer + source',
    detail: 'The server returns the result with an honest provenance label.',
  },
];

const MODULES = [
  {
    id: 'module1',
    name: 'Traffic Analysis',
    question: 'How should a known demand split across parallel links?',
    algebra: 'Square system → RREF → unique flow vector.',
  },
  {
    id: 'module2',
    name: 'Anomaly Detection',
    question: 'Do the sensor readings satisfy conservation at all?',
    algebra: 'Inconsistent row → no exact solution → simulated correction.',
  },
  {
    id: 'module3',
    name: 'Incident Investigation',
    question: 'What does an incident’s measurement system actually prove?',
    algebra: 'Rank and pivots classify the case → template report.',
  },
];

function FlowStep({ step, last }) {
  return (
    <motion.li variants={rise} className="relative min-w-0 border-l border-line pl-4">
      <span className="font-mono text-xs text-accent">{step.number}</span>
      <p className="mt-1 font-display text-lg font-semibold tracking-tight text-ink">{step.value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{step.detail}</p>
      {!last && (
        <ArrowRight
          aria-hidden="true"
          className="absolute -bottom-3 left-0 h-3 w-3 rotate-90 text-line lg:-right-2 lg:bottom-auto lg:left-auto lg:top-6 lg:rotate-0"
        />
      )}
    </motion.li>
  );
}

export default function HowItWorks() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Start here"
        title="How FlowMetrica works"
        description="One page for the problem, the algebra, the MATLAB handoff and the reason this project exists."
        meta={
          <>
            <span className="chip">Canonical overview</span>
            <span className="chip">No account required</span>
          </>
        }
      />

      <motion.section
        className="surface relative overflow-hidden p-6 sm:p-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.p variants={rise} className="meta-label">The whole idea</motion.p>
        <motion.h2
          variants={rise}
          className="mt-3 max-w-3xl font-display text-display font-semibold text-balance text-ink"
        >
          Network questions become <span className="text-accent">linear systems</span>. FlowMetrica shows the algebra, the answer and where it came from.
        </motion.h2>
        <motion.p variants={rise} className="mt-4 max-w-3xl text-lede text-pretty text-muted">
          No browser-side math, no invented live data. One shared execution interface returns every matrix, step, solution and provenance label.
        </motion.p>

        <motion.ol
          variants={stagger}
          className="mt-8 grid gap-6 border-t border-line pt-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {FLOW.map((step, index) => (
            <FlowStep key={step.number} step={step} last={index === FLOW.length - 1} />
          ))}
        </motion.ol>
      </motion.section>

      <section className="grid gap-5 lg:grid-cols-split">
        <div className="surface p-6">
          <p className="meta-label">01 · Problem statement</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            Find the flows, then prove what kind of answer exists.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Given a small network, its total demand and a set of sensor readings, determine the traffic on each link. The answer may be unique, impossible or underdetermined — the app must say which, and show the row operations that justify it.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            The three modules are the same question at different depths: plan a healthy network, detect a broken one, then investigate a real incident and keep a report.
          </p>
        </div>

        <aside className="surface-sunken p-6">
          <p className="meta-label">In one line</p>
          <p className="mt-3 font-display text-xl leading-snug text-balance text-ink">
            “How much traffic is on each link — and can we trust the answer?”
          </p>
          <div className="mt-6 border-t border-line pt-4">
            <p className="meta-label">This app is not</p>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>— a live network monitor</li>
              <li>— a MATLAB cloud runner</li>
              <li>— an AI chat interface</li>
            </ul>
          </div>
        </aside>
      </section>

      <section aria-labelledby="module-chain-heading" className="surface p-6">
        <p className="meta-label">The three modules, in order</p>
        <h2 id="module-chain-heading" className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
          Represent → Check → Report
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ['01', 'Represent', 'Traffic Analysis turns the network and its demand into variables and equations.'],
            ['02', 'Check', 'Anomaly Detection changes the model to see whether those equations still hold.'],
            ['03', 'Report', 'Investigation classifies the case and saves a template report in this browser.'],
          ].map(([number, title, text]) => (
            <li key={number} className="rounded-lg border border-line bg-sunken/50 p-4">
              <span className="font-mono text-[10px] text-accent">{number}</span>
              <p className="mt-1 font-display text-[14px] font-semibold text-ink">{title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          Each step uses the same execution interface. The browser never solves a system.
        </p>
      </section>

      <section className="surface p-6">
        <p className="meta-label">02 · Linear algebra</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
          The model is one system of linear equations.
        </h2>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="surface-sunken p-5">
            <p className="font-mono text-sm text-accent">A · x = b</p>
            <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-ink">
              {`[  1   1   1 ] [x₁]   [110]
 [  1  -1   0 ] [x₂] = [ 60]
 [  0   1  -1 ] [x₃]   [ 10]`}
            </pre>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SourceBadge source="matlab_fixture" />
              <span className="font-mono text-xs text-muted">INC-318</span>
            </div>
            <p className="mt-3 font-mono text-xs leading-relaxed text-muted">
              RREF → x = [80, 20, 10] Mbps · rank 3/3 · unique
            </p>
          </div>

          <dl className="space-y-4">
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-accent">A</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">
                Coefficient matrix. Each row is one{' '}
                <ConceptHint term="conservation">
                  A rule that what enters a junction must also leave it.
                </ConceptHint>{' '}
                rule.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-accent">x</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">
                Unknown link flows. Solving the system assigns a Mbps value to every link in the teaching model.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-accent">b</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">
                Known totals from the scenario. They are fixed inputs, never measured live by this app.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-accent">
                <ConceptHint term="RREF">
                  Reduced Row Echelon Form: the simplest equivalent form of the equations, found by elimination.
                </ConceptHint>
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">
                Gaussian elimination gives the step list.{' '}
                <ConceptHint term="Rank">
                  The number of independent equations in the system.
                </ConceptHint>{' '}
                counts independent equations;{' '}
                <ConceptHint term="Pivot columns">
                  Columns that are fixed by those independent equations.
                </ConceptHint>{' '}
                show which variables are determined.
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 overflow-x-auto border-t border-line pt-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-mono text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="pb-2 pr-4">Module</th>
                <th scope="col" className="pb-2 pr-4">Network question</th>
                <th scope="col" className="pb-2">What the algebra answers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {MODULES.map((module) => (
                <tr key={module.id} className="align-top">
                  <th scope="row" className="py-3 pr-4 font-display font-semibold text-ink">
                    {module.name}
                  </th>
                  <td className="py-3 pr-4 text-muted">{module.question}</td>
                  <td className="py-3 text-muted">{module.algebra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface p-6">
          <p className="meta-label">03 · Why MATLAB</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            An independent authority for the algebra.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            MATLAB Online R2026b computes RREF, rank and the solution from each scenario’s exact coefficients. That export is stored as a fixture and labelled <span className="font-medium text-ink">Saved MATLAB Result</span>. It is never presented as a live call.
          </p>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            <li className="flex gap-2.5">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
              Saved fixtures work with no internet and no login.
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
              No token, certificate or browser automation is part of the app.
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
              The free 20-hour monthly allowance is spent only on manual export.
            </li>
          </ul>
        </div>

        <div className="surface p-6">
          <p className="meta-label">04 · The AI handoff</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            ChatGPT drafts. MATLAB verifies. The app serves.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The AI-assisted step is deliberately outside the app. A prompt produces a staged scenario JSON, MATLAB exports the matching fixture, and only then is the scenario promoted into the catalogue. Nothing is sent anywhere while the app runs.
          </p>
          <ol className="mt-5 space-y-2 font-mono text-xs text-muted">
            <li>01 &nbsp; docs/SCENARIO_PROMPT.md</li>
            <li>02 &nbsp; {'matlab/incoming/<id>.json'}</li>
            <li>03 &nbsp; {'export_scenario("<id>")'}</li>
            <li>04 &nbsp; {'server/data/fixtures/<id>.<operation>.json'}</li>
          </ol>
        </div>
      </section>

      <section className="surface-sunken p-6">
        <p className="meta-label">05 · Why I picked it</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-balance text-ink">
            A portfolio project that proves judgement, not just syntax.
          </h2>
          <div>
            <p className="text-sm leading-relaxed text-muted">
              I’m a CS student aiming for a junior React/Node role. I picked this problem because it proves three things a tutorial cannot: I can model a domain with linear algebra, keep all computation behind one JSON contract on the server, and state exactly where every number came from.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              I picked MATLAB as the verifier because it is independent of my own solver — not because the app needs a live bridge. The offline-first constraint is the point: every screen has to earn its place, and every result has to be honest.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/25 bg-accent/10 p-5">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            See the model do its job.
          </h2>
          <p className="mt-1 text-sm text-muted">Pick a module. Every result comes from the same execution interface.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.a href="#/module1" className="btn-secondary" {...pressable}>
            Traffic analysis
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </motion.a>
          <motion.a href="#/module2" className="btn-secondary" {...pressable}>
            Anomaly detection
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </motion.a>
          <motion.a href="#/module3" className="btn-primary" {...pressable}>
            Investigation
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </motion.a>
        </div>
      </section>
    </div>
  );
}
