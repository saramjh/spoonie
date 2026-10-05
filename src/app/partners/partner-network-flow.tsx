type Segment = "creator" | "brand"

const flows = {
  creator: {
    title: "레시피가 다른 사람의 시작점이 됩니다",
    description: "만들어 본 기록과 이어진 Recipe가 바탕이 된 Recipe에 붙고, 그 연결을 따라 작성자와 다른 Recipe가 함께 발견됩니다.",
    origin: "내 Recipe",
    branches: [
      { relation: "만들었어요", label: "다른 사람의 Recipeed" },
      { relation: "참고", label: "다른 Creator의 이어진 Recipe" },
    ],
    anchor: "바탕이 된 Recipe · 작성자 연결 유지",
    result: "연결을 따라 서로의 Recipe와 프로필로 이동",
  },
  brand: {
    title: "제품 활용이 한 번의 포스트로 끝나지 않게",
    description: "브랜드 Recipe를 따라 만든 기록과 응용 Recipe가 다시 출처로 이어져, 팬이 여러 실제 사용법을 연속해서 발견할 수 있습니다.",
    origin: "브랜드의 제품 활용 Recipe",
    branches: [
      { relation: "만들었어요", label: "팬의 조리 기록" },
      { relation: "참고", label: "사용자의 응용 Recipe" },
    ],
    anchor: "출처 Recipe · 브랜드 작성자 연결 유지",
    result: "프로필과 이어진 Recipe에서 다른 활용법 발견",
  },
} as const

export default function PartnerNetworkFlow({ segment }: { segment: Segment }) {
  const flow = flows[segment]

  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby={segment + "-network-title"}>
      <h2 id={segment + "-network-title"} className="text-heading text-ink">{flow.title}</h2>
      <p className="mt-2 text-meta text-ink-soft">{flow.description}</p>

      <div
        className="mt-5 border-y border-border py-4"
        role="img"
        aria-label={flow.origin + "에서 두 관계로 이어져 " + flow.anchor + "를 거쳐 " + flow.result + "로 연결되는 흐름"}
      >
        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-micro uppercase tracking-[0.08em] text-ink-soft">시작</span>
          <strong className="text-label font-semibold text-ink">{flow.origin}</strong>
        </div>

        <div className="ml-[5.25rem] h-5 border-l border-border" aria-hidden />

        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3">
          <span className="pt-2 text-micro uppercase tracking-[0.08em] text-ink-soft">이어짐</span>
          <div className="divide-y divide-border border-y border-border">
            {flow.branches.map((branch) => (
              <div key={branch.relation} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 py-2.5">
                <span className="text-meta text-ink-soft">{branch.relation}</span>
                <span className="text-label text-ink">{branch.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ml-[5.25rem] h-5 border-l border-border" aria-hidden />

        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-micro uppercase tracking-[0.08em] text-ink-soft">출처</span>
          <strong className="text-label font-semibold text-ink">{flow.anchor}</strong>
        </div>

        <div className="ml-[5.25rem] h-5 border-l border-border" aria-hidden />

        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3">
          <span className="text-micro uppercase tracking-[0.08em] text-ink-soft">발견</span>
          <span className="text-label text-ink">{flow.result}</span>
        </div>
      </div>
    </section>
  )
}
