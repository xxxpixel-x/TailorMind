"use client";

import React from "react";
import {
  CheckCircle2,
  Building2,
  ShieldAlert,
  Clock,
  Scale,
  Palette,
} from "lucide-react";
import {
  BusinessMode,
  DesignDirectionOption,
  ProposalDraft,
  ThreeDimMatchScore,
} from "@/lib/types";

interface Props {
  mode: BusinessMode;
  proposal: ProposalDraft;
  assetMatches: ThreeDimMatchScore[];
  onSelectDirection: (dirId: DesignDirectionOption["id"]) => void;
}

export default function Tab3Proposal({
  mode,
  proposal,
  assetMatches,
  onSelectDirection,
}: Props) {
  const activeDir =
    proposal.directions.find((d) => d.id === proposal.selectedDirectionId) ||
    proposal.directions[0];

  return (
    <div className="space-y-6">
      {/* 1. 企划方案总览 */}
      <section className="rounded-xl border border-brocade/40 bg-gradient-to-r from-paper-warm via-brocade-light/50 to-paper-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-paper">
            {mode === "uniform"
              ? "团体职业服分级企划初稿"
              : "海派高级私定企划初稿"}
          </span>
          <span className="text-xs font-medium text-brocade-dark">
            {proposal.stylePositioning}
          </span>
        </div>

        <h3 className="mt-2.5 font-serif text-xl font-bold text-ink">
          {proposal.proposalTitle}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          {proposal.themeConcept}
        </p>
      </section>

      {/* 2. 多方向审美比选（核心升级：所有方向满足全部硬要求，区别仅在克制美学尺度） */}
      {proposal.directions && proposal.directions.length > 0 && (
        <section className="rounded-xl border border-paper-border bg-paper p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-brocade-dark" />
              <h4 className="font-serif text-base font-bold text-ink">
                一、供客户挑选的三个审美方向（均满足全部硬要求）
              </h4>
            </div>
            <span className="text-[11px] text-ink-muted">
              「好看」交由客户定夺：遵循暗纹胜明花、全身不超两色加一点缀的克制原则，点击卡片切换选定方向
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {proposal.directions.map((dir) => {
              const selected = dir.id === activeDir?.id;
              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => onSelectDirection(dir.id)}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-brocade bg-paper-card ring-2 ring-brocade/30 shadow-sm"
                      : "border-paper-border bg-paper-card/70 hover:border-brocade/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-sm font-bold text-ink">
                        {dir.tag} · {dir.title}
                      </span>
                      {selected && (
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-brocade px-2 py-0.5 text-[10px] font-bold text-on-accent">
                          当前选定
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-brocade-dark">
                      {dir.positioning}
                    </p>
                    <div className="mt-2.5 space-y-1.5 text-[11px] leading-relaxed text-ink-muted">
                      <div>
                        <strong className="text-ink">款式做法：</strong>
                        {dir.garmentSummary}
                      </div>
                      <div>
                        <strong className="text-ink">领襟与亮点：</strong>
                        {dir.collarAndCraftDiff}
                      </div>
                      <div>
                        <strong className="text-ink">克制原则：</strong>
                        {dir.restraintNote}
                      </div>
                      <div>
                        <strong className="text-ink">适合偏好：</strong>
                        {dir.suitableFor}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-jade-light/70 px-2.5 py-1.5 text-[10px] font-medium text-jade">
                    ✓ {dir.hardReqGuarantee}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. 团体职业服专属：多岗位三级同源配置矩阵 */}
      {proposal.uniformTiers && proposal.uniformTiers.length > 0 && (
        <section className="rounded-xl border border-brocade/50 bg-paper p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brocade-dark" />
              <h4 className="font-serif text-base font-bold text-ink">
                团体职业服：多岗位「同源不同款」三级配置矩阵
              </h4>
            </div>
            <span className="rounded bg-brocade-light px-2 py-0.5 text-[11px] font-semibold text-brocade-dark">
              统一视觉基因 × 岗位功能分级
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {proposal.uniformTiers.map((tier, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-xl border border-paper-border bg-paper-card p-4"
              >
                <div>
                  <span className="font-serif text-sm font-bold text-ink">
                    {tier.tierName}
                  </span>
                  <div className="mt-1 text-[11px] font-medium text-brocade-dark">
                    {tier.headcountNote}
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-xs text-ink-muted">
                    <div>
                      <strong className="text-ink">款式组合：</strong>
                      {tier.garmentCombo}
                    </div>
                    <div>
                      <strong className="text-ink">VI 呼应点：</strong>
                      {tier.viDesignTouch}
                    </div>
                    <div>
                      <strong className="text-ink">号型与特体策略：</strong>
                      {tier.sizingStrategy}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5 border-t border-paper-border pt-2.5">
                  <span className="rounded bg-paper-warm px-2 py-0.5 font-mono text-[10px] font-semibold text-ink">
                    母版 {tier.patternId}
                  </span>
                  <span className="rounded bg-paper-warm px-2 py-0.5 font-mono text-[10px] font-semibold text-ink">
                    面料 {tier.fabricId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. 版型、面料、工艺与穿搭具体做法 */}
      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-paper-border bg-paper-card p-4">
          <div className="font-serif text-sm font-bold text-ink">
            版型母版与 CAD 放量建议
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {proposal.primaryPatternPlan}
          </p>
        </div>
        <div className="rounded-xl border border-paper-border bg-paper-card p-4">
          <div className="font-serif text-sm font-bold text-ink">
            面料主推与色彩锁定方案
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {proposal.primaryFabricPlan}
          </p>
        </div>
        <div className="rounded-xl border border-paper-border bg-paper-card p-4">
          <div className="font-serif text-sm font-bold text-ink">
            海派工艺与克制亮点
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {proposal.craftCombinationPlan}
          </p>
        </div>
        <div className="rounded-xl border border-paper-border bg-paper-card p-4">
          <div className="font-serif text-sm font-bold text-ink">
            目标场合穿搭与穿脱建议
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {proposal.sceneStylingAdvice}
          </p>
        </div>
      </section>

      {/* 5. 集团资产与规则匹配依据表（去除伪造打分，改以事实依据呈现） */}
      <section className="rounded-xl border border-paper-border bg-paper p-5">
        <div className="mb-3 flex items-center gap-2">
          <Scale className="h-4 w-4 text-brocade-dark" />
          <h4 className="font-serif text-base font-bold text-ink">
            二、资源与规则三维适配说明（风格 × 体感 × 体型/岗位）
          </h4>
        </div>

        <div className="overflow-x-auto rounded-xl border border-paper-border bg-paper-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-paper-border bg-paper-warm text-ink">
              <tr>
                <th className="px-3 py-2.5 w-48">命中资产 / 规则</th>
                <th className="px-3 py-2.5">风格适配依据</th>
                <th className="px-3 py-2.5">体感适配依据</th>
                <th className="px-3 py-2.5">体型 / 岗位适配依据</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {assetMatches.map((m) => (
                <tr key={m.assetId} className="hover:bg-paper/60">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-brocade-dark">
                        {m.assetId}
                      </span>
                      <span className="rounded bg-paper-warm px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {m.assetType}
                      </span>
                    </div>
                    <div className="mt-0.5 font-medium text-ink">{m.assetName}</div>
                    <div className="mt-0.5 text-[10px] text-ink-light">{m.matchReason}</div>
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">{m.styleFit}</td>
                  <td className="px-3 py-2.5 text-ink-muted">{m.tactileFit}</td>
                  <td className="px-3 py-2.5 text-ink-muted">{m.bodyOrRoleFit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. 可行性提示 & 人工决策边界声明 */}
      <section className="grid gap-3 md:grid-cols-12">
        <div className="rounded-xl border border-paper-border bg-paper-card p-4 md:col-span-7 space-y-2.5">
          <div className="flex items-center gap-1.5 font-serif text-sm font-bold text-ink">
            <Clock className="h-4 w-4 text-brocade-dark" />
            <span>可行性提示与打样试穿核对项</span>
          </div>
          <div className="rounded bg-paper px-3 py-1.5 text-xs font-medium text-ink">
            {proposal.feasibilityAlerts.leadTimeEstimate}
          </div>
          <div className="text-xs space-y-1 text-ink-muted">
            <div className="font-semibold text-ink">交付给制版师与试衣间的重点核对：</div>
            {proposal.feasibilityAlerts.fittingCheckpoints.map((cp, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jade" />
                <span>{cp}</span>
              </div>
            ))}
          </div>
          <div className="text-xs space-y-1 text-ink-muted pt-1 border-t border-paper-border">
            <div className="font-semibold text-ink">护理与风险提示：</div>
            {proposal.feasibilityAlerts.riskAndCareNotes.map((rn, i) => (
              <div key={i}>• {rn}</div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border-2 border-cinnabar/40 bg-cinnabar-light/60 p-4 md:col-span-5">
          <div>
            <div className="flex items-center gap-1.5 font-serif text-sm font-bold text-cinnabar">
              <ShieldAlert className="h-4 w-4" />
              <span>人工终审与商业决策边界</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink">
              {proposal.humanBoundaryNotice}
            </p>
          </div>
          <div className="mt-3 rounded-lg border border-cinnabar/25 bg-paper-card/80 px-3 py-2 text-[11px] font-medium text-cinnabar">
            净体量体、纸样定稿、实物色卡签样、商务报价与排产均由人工完成
          </div>
        </div>
      </section>
    </div>
  );
}
