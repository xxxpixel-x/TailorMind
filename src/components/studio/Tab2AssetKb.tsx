"use client";

import React, { useState } from "react";
import {
  Search,
  Star,
  Scissors,
  Layers,
  Sparkles,
  BookOpen,
  Ruler,
  ZoomIn,
  X,
} from "lucide-react";
import { BODY_TAILORING_RULES } from "@/data/kb-body-rules";
import { PATTERN_KB } from "@/data/kb-patterns";
import { FABRIC_KB } from "@/data/kb-fabrics";
import { CRAFT_KB } from "@/data/kb-crafts";
import { CASE_KB } from "@/data/kb-cases";

interface Props {
  matchedIds: string[];
  onApplyCaseToCopilot: (caseId: string) => void;
}

type SubTab = "body_rules" | "patterns" | "fabrics" | "crafts" | "cases";

export default function Tab2AssetKb({ matchedIds, onApplyCaseToCopilot }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("body_rules");
  const [query, setQuery] = useState("");
  const [onlyMatched, setOnlyMatched] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<{ url: string; caption: string } | null>(null);

  const q = query.trim().toLowerCase();
  const isHit = (id: string) => matchedIds.includes(id);

  const filteredBodyRules = BODY_TAILORING_RULES.filter((r) => {
    if (onlyMatched && !isHit(r.id)) return false;
    if (!q) return true;
    return [r.id, r.bodyFeature, r.patternAction, r.taboo, ...r.triggerKeywords]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const filteredPatterns = PATTERN_KB.filter((p) => {
    if (onlyMatched && !isHit(p.id)) return false;
    if (!q) return true;
    return [p.id, p.name, p.category, p.collarSpec, ...p.styleTags, ...p.sceneTags]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const filteredFabrics = FABRIC_KB.filter((f) => {
    if (onlyMatched && !isHit(f.id)) return false;
    if (!q) return true;
    return [f.id, f.name, f.category, f.composition, ...f.tags]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const filteredCrafts = CRAFT_KB.filter((c) => {
    if (onlyMatched && !isHit(c.id)) return false;
    if (!q) return true;
    return [c.id, c.name, c.craftCategory, c.culturalOrigin, ...c.tags]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const filteredCases = CASE_KB.filter((c) => {
    if (onlyMatched && !isHit(c.id)) return false;
    if (!q) return true;
    return [c.id, c.title, c.customerRawQuote, ...c.tags]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-4">
      {/* 顶部分类切换与检索过滤 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-border bg-paper p-3.5">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "body_rules" as SubTab, label: `体型→裁剪规则 (${BODY_TAILORING_RULES.length})`, icon: Ruler },
            { id: "patterns" as SubTab, label: `版型母版 (${PATTERN_KB.length})`, icon: Scissors },
            { id: "fabrics" as SubTab, label: `特色面料 (${FABRIC_KB.length})`, icon: Layers },
            { id: "crafts" as SubTab, label: `海派工艺 (${CRAFT_KB.length})`, icon: Sparkles },
            { id: "cases" as SubTab, label: `历史案例 (${CASE_KB.length})`, icon: BookOpen },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-ink text-paper"
                    : "bg-paper-card text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-ink">
            <input
              type="checkbox"
              checked={onlyMatched}
              onChange={(e) => setOnlyMatched(e.target.checked)}
              className="rounded border-paper-border accent-brocade-dark"
            />
            仅看当前命中 ({matchedIds.length})
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-ink-light" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索规则、驼背、手臂粗、宋锦..."
              className="w-48 rounded-lg border border-paper-border bg-paper-card py-1.5 pl-8 pr-2.5 text-xs text-ink focus:border-brocade focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 0. 体型/场合 → 裁剪规则库 */}
      {subTab === "body_rules" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-paper-border bg-paper-warm px-3.5 py-2 text-xs text-ink-muted">
            说明：绿色标签规则提炼自上服集团 2026 年 11 月提供的 6 个真实定制案例；琥珀色标签为通用制版经验补充规则，实际量体与制版阶段须经上服制版师人工核准。
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredBodyRules.map((r) => {
              const hit = isHit(r.id);
              const isVerified = r.sourceLevel === "verified_shangfu_case";
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-4 ${
                    hit
                      ? "border-brocade bg-brocade-light/40 shadow-sm"
                      : "border-paper-border bg-paper-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-brocade-dark">
                          {r.id}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            isVerified
                              ? "bg-jade-light text-jade"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isVerified ? "上服 6 案例已验证" : "通用经验 · 待制版师核准"}
                        </span>
                      </div>
                      <h4 className="mt-1 font-serif text-sm font-bold text-ink">
                        {r.bodyFeature}
                      </h4>
                    </div>
                    {hit && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brocade px-2 py-0.5 text-[10px] font-bold text-on-accent">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        本次命中
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-xs text-ink-muted">
                    <div>
                      <strong className="text-ink">裁剪做法：</strong>
                      {r.patternAction}
                    </div>
                    <div>
                      <strong className="text-ink">领型/袖型控制：</strong>
                      {r.collarOrSleeveAction}
                    </div>
                    <div>
                      <strong className="text-ink">面料约束：</strong>
                      {r.fabricConstraint}
                    </div>
                    <div className="text-cinnabar">
                      <strong>明确禁忌：</strong>
                      {r.taboo}
                    </div>
                    <div className="rounded bg-paper p-2 text-[11px] text-ink">
                      <strong>交付制版师核对：</strong>
                      {r.masterConfirmNote}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. 版型母版卡片列表 */}
      {subTab === "patterns" && (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredPatterns.map((p) => {
            const hit = isHit(p.id);
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 transition ${
                  hit
                    ? "border-brocade bg-brocade-light/40 shadow-sm"
                    : "border-paper-border bg-paper-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brocade-dark">
                        {p.id}
                      </span>
                      <span className="rounded bg-paper-warm px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {p.modeScope === "bespoke"
                          ? "私定母版"
                          : p.modeScope === "uniform"
                          ? "团装母版"
                          : "通用母版"}
                      </span>
                    </div>
                    <h4 className="mt-1 font-serif text-sm font-bold text-ink">{p.name}</h4>
                  </div>
                  {hit && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brocade px-2 py-0.5 text-[10px] font-bold text-on-accent">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      本次命中
                    </span>
                  )}
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-ink-muted">
                  <div>
                    <strong className="text-ink">廓形与肩型：</strong>
                    {p.silhouetteType} ｜ {p.shoulderSpec}
                  </div>
                  <div>
                    <strong className="text-ink">领型与衣长：</strong>
                    {p.collarSpec} ｜ {p.lengthSpec}
                  </div>
                  <div>
                    <strong className="text-ink">富怡/ET 裁片：</strong>
                    {p.cadPieces.join("、")}
                  </div>
                  <div>
                    <strong className="text-ink">缝份标准：</strong>
                    {p.seamAllowanceSpec}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. 面料库卡片列表 */}
      {subTab === "fabrics" && (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredFabrics.map((f) => {
            const hit = isHit(f.id);
            return (
              <div
                key={f.id}
                className={`rounded-xl border p-4 ${
                  hit
                    ? "border-brocade bg-brocade-light/40 shadow-sm"
                    : "border-paper-border bg-paper-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brocade-dark">
                        {f.id}
                      </span>
                      <span className="rounded bg-paper-warm px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {f.category}
                      </span>
                      <span className="rounded bg-jade-light px-1.5 py-0.5 text-[10px] font-medium text-jade">
                        抗皱：{f.wrinkleResistance}
                      </span>
                    </div>
                    <h4 className="mt-1 font-serif text-sm font-bold text-ink">{f.name}</h4>
                  </div>
                  {hit && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brocade px-2 py-0.5 text-[10px] font-bold text-on-accent">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      本次命中
                    </span>
                  )}
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-ink-muted">
                  <div>
                    <strong className="text-ink">成分与克重：</strong>
                    {f.composition}（{f.weightRange}）
                  </div>
                  <div>
                    <strong className="text-ink">垂感与骨感：</strong>
                    {f.drapeLevel} ｜ {f.crispnessLevel}
                  </div>
                  <div>
                    <strong className="text-ink">补单说明：</strong>
                    {f.reorderStability}
                  </div>
                  <div>
                    <strong className="text-ink">洗护要求：</strong>
                    {f.careInstruction}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 工艺纹样库列表 */}
      {subTab === "crafts" && (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredCrafts.map((c) => {
            const hit = isHit(c.id);
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 ${
                  hit
                    ? "border-brocade bg-brocade-light/40 shadow-sm"
                    : "border-paper-border bg-paper-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brocade-dark">
                        {c.id}
                      </span>
                      <span className="rounded bg-paper-warm px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {c.craftCategory}
                      </span>
                    </div>
                    <h4 className="mt-1 font-serif text-sm font-bold text-ink">{c.name}</h4>
                  </div>
                  {hit && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brocade px-2 py-0.5 text-[10px] font-bold text-on-accent">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      本次命中
                    </span>
                  )}
                </div>

                <div className="mt-2.5 space-y-1.5 text-xs text-ink-muted">
                  <div>
                    <strong className="text-ink">视觉效果：</strong>
                    {c.visualEffect}
                  </div>
                  <div>
                    <strong className="text-ink">制版工艺要点：</strong>
                    {c.cadTechPoints}
                  </div>
                  <div>
                    <strong className="text-ink">VI / 气质融合：</strong>
                    {c.viIntegrationNote}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. 历史案例库 */}
      {subTab === "cases" && (
        <div className="space-y-4">
          {filteredCases.map((c) => {
            const hit = isHit(c.id);
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 ${
                  hit
                    ? "border-brocade bg-brocade-light/35 shadow-sm"
                    : "border-paper-border bg-paper-card"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brocade-dark">
                        {c.id}
                      </span>
                      <span className="rounded bg-paper-warm px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        {c.sourceType}
                      </span>
                    </div>
                    <h4 className="mt-1 font-serif text-sm font-bold text-ink">{c.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApplyCaseToCopilot(c.id)}
                    className="rounded-lg border border-brocade bg-paper px-3 py-1 text-xs font-medium text-brocade-dark hover:bg-brocade hover:text-on-accent"
                  >
                    载入此案例至左栏验证
                  </button>
                </div>

                <div className="mt-2.5 rounded-lg bg-paper p-3 text-xs">
                  <div className="font-semibold text-ink">客户原始诉求：</div>
                  <p className="mt-0.5 text-ink-muted">“{c.customerRawQuote}”</p>
                </div>

                <div className="mt-2 text-xs text-jade">
                  <strong>规则提炼：</strong>
                  {c.expertTakeaway}
                </div>

                <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
                  {c.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxImg(img)}
                      className="group relative h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-paper-border bg-paper"
                    >
                      <img
                        src={img.url}
                        alt={img.caption}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-scrim/75 px-1 py-0.5 text-[9px] text-ink truncate">
                        {img.stage}
                      </span>
                      <span className="absolute right-1 top-1 rounded bg-scrim/60 p-0.5 text-ink opacity-0 group-hover:opacity-100">
                        <ZoomIn className="h-3 w-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-3xl rounded-xl bg-paper-card p-3 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute right-4 top-4 rounded-full bg-scrim/80 p-1.5 text-ink hover:bg-scrim"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightboxImg.url}
              alt={lightboxImg.caption}
              className="max-h-[78vh] w-auto mx-auto rounded-lg object-contain"
            />
            <div className="mt-2 text-center text-xs font-medium text-ink">
              {lightboxImg.caption}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
