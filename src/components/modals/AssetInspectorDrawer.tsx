"use client";

import React from "react";
import { X } from "lucide-react";
import { PATTERN_KB } from "@/data/kb-patterns";
import { FABRIC_KB } from "@/data/kb-fabrics";
import { CRAFT_KB } from "@/data/kb-crafts";
import { BODY_TAILORING_RULES } from "@/data/kb-body-rules";
import { CASE_KB } from "@/data/kb-cases";
import { ASSET_BY_ID } from "@/lib/asset-catalog";
import type { HistoricalCaseAsset } from "@/lib/types";

interface Props {
  assetId: string | null;
  inAssetLibrary?: boolean;
  orderLabel?: string;
  conflicts?: { property: string; message: string }[];
  onClose: () => void;
  onOpenFullKb: () => void;
  onApplyCase?: (item: HistoricalCaseAsset) => void;
}

export default function AssetInspectorDrawer({
  assetId,
  inAssetLibrary,
  orderLabel,
  conflicts,
  onClose,
  onOpenFullKb,
  onApplyCase,
}: Props) {
  if (!assetId) return null;

  const pattern = PATTERN_KB.find((p) => p.id === assetId);
  const fabric = FABRIC_KB.find((f) => f.id === assetId);
  const craft = CRAFT_KB.find((c) => c.id === assetId);
  const rule = BODY_TAILORING_RULES.find((r) => r.id === assetId);
  const historicalCase = CASE_KB.find((c) => c.id === assetId);
  const catalogItem = ASSET_BY_ID.get(assetId);
  const relatedCases = CASE_KB.filter(
    (c) =>
      c.id === assetId || c.matchedPatternId === assetId ||
      c.matchedFabricId === assetId ||
      c.matchedCraftIds.includes(assetId)
  );

  return (
    <div
      onClick={onClose}
      className="no-print fixed inset-0 z-50 flex justify-end bg-scrim/30"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="资产详情"
        className="flex h-full w-full max-w-lg flex-col border-l border-paper-border bg-paper-card"
      >
        <div className="flex items-center justify-between border-b border-paper-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[13px] text-cinnabar">{assetId}</span>
            <span className="text-[13px] text-ink-light">
              {pattern
                ? "集团版型母版"
                : fabric
                ? "集团特色面料"
                : craft
                ? "海派工艺纹样"
                : rule
                ? "体型裁剪规则"
                : historicalCase
                ? "历史案例"
                : "资产档案"}
            </span>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-paper-border text-ink-muted transition-colors hover:border-accent hover:bg-paper hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-[14px] leading-[1.7] text-ink-body">
          {!!conflicts?.length && (
            <div className="rounded-[12px] border border-cinnabar/25 bg-cinnabar/5 px-4 py-3 text-[13px] leading-[1.6] text-cinnabar">
              <div className="font-medium">与当前订单存在需核对项{orderLabel ? `（${orderLabel}）` : ""}</div>
              <ul className="m-0 mt-1.5 list-disc space-y-1 pl-4">
                {conflicts.map((c, i) => <li key={i}>{c.message}</li>)}
              </ul>
            </div>
          )}
          {/* 专属资产视觉参考（色卡 / 工艺微距 / 裁剪示意图） */}
          {catalogItem?.image && catalogItem.imageFit !== "zoom" && (
            <figure className="m-0 overflow-hidden rounded-[8px] border border-paper-border bg-paper-warm">
              <img
                src={catalogItem.image}
                alt={catalogItem.name}
                className={`w-full ${catalogItem.imageFit === "diagram" ? "aspect-[4/3] object-contain bg-[#F4EFE6]" : "max-h-64 object-cover object-top"}`}
              />
            </figure>
          )}
          {historicalCase && (
            <>
              <h2 className="font-serif text-[22px] font-bold text-ink">{historicalCase.title}</h2>
              <p className="text-xs text-ink-light">{historicalCase.sourceType}</p>
              <blockquote className="rounded-2xl bg-paper p-4 font-serif">“{historicalCase.customerRawQuote}”</blockquote>
              <p>{historicalCase.expertTakeaway}</p>
              <p>{[historicalCase.matchedPatternId, historicalCase.matchedFabricId, ...historicalCase.matchedCraftIds].join(" · ")}</p>
              {onApplyCase && <button className="rounded-full bg-ink px-4 py-2 text-paper-card" onClick={() => onApplyCase(historicalCase)}>将原话载入新面谈</button>}
            </>
          )}
          {pattern && (
            <>
              <h2 className="font-serif m-0 text-[22px] font-bold text-ink">
                {pattern.name}
              </h2>
              <dl className="m-0 border-b border-paper-border">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">适用品类</dt>
                  <dd className="m-0 text-ink">{pattern.category}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">廓形与肩型</dt>
                  <dd className="m-0 text-ink">
                    {pattern.silhouetteType}；{pattern.shoulderSpec}
                  </dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">领型与衣长</dt>
                  <dd className="m-0 text-ink">
                    {pattern.collarSpec}；{pattern.lengthSpec}
                  </dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">CAD 裁片</dt>
                  <dd className="m-0 text-ink">{pattern.cadPieces.join("、")}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">缝份标准</dt>
                  <dd className="m-0 text-ink">{pattern.seamAllowanceSpec}</dd>
                </div>
              </dl>

              <div>
                <div className="mb-2 text-[13px] font-medium text-ink">
                  体型放量规则
                </div>
                <ul className="m-0 list-disc space-y-1.5 pl-4 text-[13px]">
                  {pattern.bodyAdaptationRules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {fabric && (
            <>
              <h2 className="font-serif m-0 text-[22px] font-bold text-ink">
                {fabric.name}
              </h2>
              <dl className="m-0 border-b border-paper-border">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">成分克重</dt>
                  <dd className="m-0 text-ink">
                    {fabric.composition}（{fabric.weightRange}）
                  </dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">垂感与骨感</dt>
                  <dd className="m-0 text-ink">
                    {fabric.drapeLevel}；{fabric.crispnessLevel}
                  </dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">抗皱等级</dt>
                  <dd className="m-0 text-ink">{fabric.wrinkleResistance}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">风格适配</dt>
                  <dd className="m-0">{fabric.styleFitDesc}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">体感适配</dt>
                  <dd className="m-0">{fabric.tactileFitDesc}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">体型/岗位</dt>
                  <dd className="m-0">{fabric.bodyFitDesc}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">补单稳定性</dt>
                  <dd className="m-0">{fabric.reorderStability}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">洗护规范</dt>
                  <dd className="m-0">{fabric.careInstruction}</dd>
                </div>
              </dl>
            </>
          )}

          {craft && (
            <>
              <h2 className="font-serif m-0 text-[22px] font-bold text-ink">
                {craft.name}
              </h2>
              <dl className="m-0 border-b border-paper-border">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">工艺类别</dt>
                  <dd className="m-0 text-ink">
                    {craft.craftCategory}（{craft.leadTimeImpact}）
                  </dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">文化源流</dt>
                  <dd className="m-0">{craft.culturalOrigin}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">视觉呈现</dt>
                  <dd className="m-0">{craft.visualEffect}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">制版要点</dt>
                  <dd className="m-0">{craft.cadTechPoints}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">融合方式</dt>
                  <dd className="m-0">{craft.viIntegrationNote}</dd>
                </div>
              </dl>
            </>
          )}

          {rule && (
            <>
              <h2 className="font-serif m-0 text-[22px] font-bold text-ink">
                {rule.bodyFeature}
              </h2>
              <div className="text-[13px] text-cinnabar">
                {rule.sourceLevel === "verified_shangfu_case"
                  ? `来源：${rule.sourceRef}`
                  : `来源：${rule.sourceRef}`}
              </div>
              <dl className="m-0 border-b border-paper-border">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">裁剪做法</dt>
                  <dd className="m-0 text-ink">{rule.patternAction}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">领袖控制</dt>
                  <dd className="m-0 text-ink">{rule.collarOrSleeveAction}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">面料要求</dt>
                  <dd className="m-0">{rule.fabricConstraint}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-cinnabar">明确禁忌</dt>
                  <dd className="m-0 text-cinnabar">{rule.taboo}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-paper-border py-2.5">
                  <dt className="text-ink-light">交接核对</dt>
                  <dd className="m-0">{rule.masterConfirmNote}</dd>
                </div>
              </dl>
            </>
          )}

          {/* 关联的上服实物/CAD原图 */}
          {relatedCases.length > 0 && (
            <div className="border-t border-paper-border pt-5">
              <div className="mb-3 text-[13px] font-medium text-ink">
                关联上服案例实物与制版图
              </div>
              <div className="grid grid-cols-2 gap-3">
                {relatedCases
                  .flatMap((c) => c.images)
                  .slice(0, 4)
                  .map((img, i) => (
                    <figure key={i} className="m-0">
                      <div className="aspect-[4/5] overflow-hidden rounded-[4px] bg-paper-warm">
                        <img
                          src={img.url}
                          alt={img.caption}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <figcaption className="mt-1.5 text-[12px] text-ink-light">
                        {img.stage}
                      </figcaption>
                    </figure>
                  ))}
              </div>
            </div>
          )}
        </div>

        {!inAssetLibrary && (
          <div className="border-t border-paper-border px-6 py-3.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullKb();
              }}
              className="text-[13px] text-ink-muted hover:text-ink"
            >
              浏览完整集团资产与规则库 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
