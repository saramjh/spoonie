import type { LucideIcon } from "lucide-react"

type FlowStep = {
  label: string
  description: string
  icon: LucideIcon
}

type Signal = {
  label: string
  icon: LucideIcon
}

type PartnerFlowProps = {
  title: string
  summary: string
  steps: FlowStep[]
  signals: Signal[]
}

export default function PartnerFlow({ title, summary, steps, signals }: PartnerFlowProps) {
  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby="partner-flow-title">
      <h2 id="partner-flow-title" className="text-heading text-ink">{title}</h2>
      <p className="mt-2 text-body text-ink-soft">{summary}</p>

      <ol className="mt-5">
        {steps.map(({ label, description, icon: Icon }, index) => (
          <li key={label} className="flex min-w-0 items-stretch gap-3">
            <div className="flex w-11 shrink-0 flex-col items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-border bg-paper text-orange-ink">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              {index < steps.length - 1 && (
                <span className="my-2 w-px flex-1 bg-border" aria-hidden />
              )}
            </div>
            <div className={index < steps.length - 1 ? "min-w-0 pb-5" : "min-w-0"}>
              <p className="text-label text-ink">{label}</p>
              <p className="mt-1 text-meta text-ink-soft">{description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid grid-cols-2 border-l border-t border-border">
        {signals.map(({ label, icon: Icon }) => (
          <div key={label} className="min-w-0 border-b border-r border-border px-3 py-4">
            <Icon className="h-5 w-5 text-ink" strokeWidth={1.75} aria-hidden />
            <p className="mt-2 text-meta text-ink">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
