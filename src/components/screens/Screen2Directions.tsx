"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Copy, X, ZoomIn } from "lucide-react";
import { DesignDirectionOption, LiangYiPlanPackage } from "@/lib/types";
import type { ClientModelSettings } from "@/lib/model-settings";
import { GarmentZoneId } from "@/components/modals/GarmentDetailInspectorModal";
import { pendingAsks, reqStatus } from "@/lib/workbench-orders";

interface Props {
  pkg: LiangYiPlanPackage;
  modelSettings: ClientModelSettings;
  onPickDirection: (dirId: DesignDirectionOption["id"]) => void;
  onUpdateDirectionImage: (
    dirId: DesignDirectionOption["id"],
    imageUrl: string,
    caption: string
  ) => void;
  onInspectDetail: (dir: DesignDirectionOption, zone?: GarmentZoneId | null) => void;
  onInspectAsset: (assetId: string) => void;
  onRegenerateDirections: () => void;
  onGenerateSheet: () => void;
  onOpenTechPack: () => void;
  onOpenModelConfig: () => void;
  onOpenFullVisualBoard: () => void;
  isLoading: boolean;
  changed?: { directionId?: DesignDirectionOption["id"]; badge?: string };
}

function compileDirectionPrompt(dir: DesignDirectionOption, pkg: LiangYiPlanPackage) {
  const colorLabel = pkg.eightFields.color.includes("无特殊需求")
    ? dir.swatches[0]?.label || "东方素雅深色"
    : pkg.eightFields.color;
  const cn = `${dir.title}设计效果图，挂拍或半身商业棚拍，暖米色宣纸背景。色彩严格为${colorLabel}，面料为${dir.fabricSuggestion}，结构卖点：${dir.bullets.join("，")}；${dir.commandEdits?.sleeveLength || ""}${pkg.eightFields.easeAllowance}。遵循海派克制审美，无大面积繁复刺绣与亮片，细节工整清晰。`;
  const en = `Haipai Neo-Chinese bespoke garment "${dir.title}", studio fashion presentation on warm rice paper background, fabric: ${dir.fabricSuggestion}, restrained tailoring with clean lines, natural soft studio lighting, ultra detailed --ar 4:5 --v 6.1`;
  const neg = "颜色跑偏, 大面积金花满绣, 廉价亮片, 紧身短袖, 泡泡袖, 卡通插画感";
  return { cn, en, neg };
}

export default function Screen2Directions({
  pkg,
  modelSettings,
  onPickDirection,
  onUpdateDirectionImage,
  onInspectDetail,
  onInspectAsset,
  onRegenerateDirections,
  onGenerateSheet,
  onOpenTechPack,
  onOpenModelConfig,
  onOpenFullVisualBoard,
  isLoading,
  changed,
}: Props) {
  const { proposal } = pkg;
  const [promptDir, setPromptDir] = useState<DesignDirectionOption | null>(null);
  const [promptLang, setPromptLang] = useState<"cn" | "en">("cn");
  const [copied, setCopied] = useState(false);
  const [renderingId, setRenderingId] = useState<DesignDirectionOption["id"] | null>(null);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);

  const handleRenderDirection = async (dir: DesignDirectionOption) => {
    setRenderingId(dir.id);
    setRenderNotice(null);
    const compiled = compileDirectionPrompt(dir, pkg);
    try {
      const res = await fetch("/api/agent/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: compiled.cn,
          negativePrompt: compiled.neg,
          baseImagePath: dir.baseImageUrl ?? dir.referenceImageUrl,
          customImageConfig: {
            baseUrl: modelSettings.imgBaseUrl,
            apiKey: modelSettings.imgApiKey,
            model: modelSettings.imgModel,
          },
        }),
      });
      const json = await res.json();
      if (json.ok && json.imageUrl) {
        onUpdateDirectionImage(dir.id, json.imageUrl, json.constrained ? "AI 效果图 · 母版结构约束" : "AI 概念效果图");
        setRenderNotice(`已为「${dir.title}」生成${json.constrained ? "效果图，版型沿用母版实物图" : "概念效果图"}。`);
      } else {
        setRenderNotice(
          json.message ||
            "尚未配置生图 Key，当前展示上服实物参考图；配置硅基流动或豆包生图 Key 后可实时出图。"
        );
      }
    } catch {
      setRenderNotice("生图请求超时，已保留当前参考实物图。");
    } finally {
      setRenderingId(null);
    }
  };


  const hard = pkg.requirements.filter(r => r.isHardRequirement);
  const { asked } = pendingAsks(pkg);
  const passed = hard.filter(r => pkg.verification.checks.some(c => c.requirementId === r.id && c.passed)).length;
  const selectedDir = pkg.ledger.directionConfirmed
    ? proposal.directions.find(d => d.id === proposal.selectedDirectionId)
    : undefined;
  return (
    <div className="wrap">
      {renderNotice && <div className="notice" role="status">{renderNotice}<button className="ghost" onClick={onOpenModelConfig}>模型设置</button></div>}
      <div className="s2-head">
        <h2>设计方向比选</h2>
        <div className="s2-head-actions no-print">
          <button className="ghost" onClick={onOpenFullVisualBoard}>视觉企划板</button>
          <button className="ghost" onClick={onOpenTechPack}>版房工艺单</button>
        </div>
      </div>
      <section className="looks" aria-label="三个设计方向">
        {proposal.directions.map(dir => {
          const selected = pkg.ledger.directionConfirmed && dir.id === proposal.selectedDirectionId;
          return <article className={`look ${selected ? "sel" : ""}`} id={"direction-" + dir.id} tabIndex={-1} key={dir.id}>
            <div className="frame">
              <button className="zoom-image" title="细节放大" onClick={() => onInspectDetail(dir)}><img src={dir.referenceImageUrl} alt={dir.title + " · " + dir.referenceImageCaption} /></button>
              <span className="badge">{dir.tag}</span>
              {selected && <span className="badge badge-adopted"><Check size={12} />已采用</span>}
              {changed?.directionId === dir.id && <span className="changed">刚改 · {changed.badge}</span>}
              <div className="image-tools image-tools-visible"><button onClick={() => { setPromptDir(dir); setCopied(false); }}>提示词</button>
                <button onClick={() => onInspectDetail(dir)}><ZoomIn size={13} />细节放大</button></div>
            </div>
            <div className="lm">
              <h3>{dir.title}</h3>
            </div>
            {dir.swatches.length > 0 && (
              <div className="swatches-row" aria-label="主辅色卡">
                <div className="swatch-dots">
                  {dir.swatches.slice(0, 3).map((sw, idx) => (
                    <span key={idx} className="swatch-dot" style={{ backgroundColor: sw.hex }} title={sw.label} />
                  ))}
                </div>
                <span className="swatch-label" title={dir.swatches.map(s => s.label).join(" · ")}>{dir.swatches.map(s => s.label).join(" · ")}</span>
              </div>
            )}
            <div className="lchips">
              {hard.length > 0 && <span className={`chip ${passed === hard.length ? "j" : ""}`} title={hard.map(r => r.rawPhrase + " · " + reqStatus(r, asked)).join("\n")}>
                硬性 <span className="n">{passed}/{hard.length}</span></span>}
              {dir.commandEdits?.sleeveLength && <span className="chip j">{dir.commandEdits.sleeveLength}</span>}
              {[dir.patternId, dir.fabricId, dir.craftId].filter(Boolean).map(id => (
                <button type="button" key={id} className="chip chip-btn chip-asset" title="点击查看资产详情" onClick={() => onInspectAsset(id!)}>{id}</button>
              ))}
            </div>
            <button className="pick" aria-pressed={Boolean(selected)} onClick={() => onPickDirection(dir.id)}>
              {selected ? <><Check size={14} />已采用此方向</> : "采用此方向"}
            </button>
          </article>;
        })}
      </section>
      {proposal.uniformTiers?.length && <section><div className="sec-h"><h2 className="h2">三级岗位同源配置</h2></div>
        <div className="who3">{proposal.uniformTiers.map(t => <div className="f" key={t.tierName}><dt>{t.tierName} · {t.headcountNote}</dt>
          <dd>{t.garmentCombo}</dd><small>{t.patternId} · {t.fabricId}</small><p>{t.viDesignTouch}</p></div>)}</div></section>}
      <details className="direction-info"><summary>查看方向对比与约束</summary>
        <div className="lchips">{proposal.lockedHardBadges.map(b => <span className="chip" key={b.label}>{b.label}</span>)}</div>
        {proposal.directions.map(d => <p key={d.id}><b>{d.tag}</b> · {d.bullets.join("，")}。</p>)}
        <button className="ghost" disabled={isLoading || Boolean(renderingId)} onClick={onRegenerateDirections}>{isLoading ? "生成中…" : "重新生成方向"}</button>
      </details>
      <div className="direction-dock no-print" role="region" aria-label="方向确认与下一步">
        <div className="dock-status">
          {selectedDir
            ? <><span className="chip j"><Check size={12} />已采用 {selectedDir.tag}</span><span className="dock-title">{selectedDir.title}</span></>
            : <span className="dock-hint">请选择一个设计方向</span>}
        </div>
        <div className="dock-btns">
          <button className="ghost" onClick={onOpenFullVisualBoard}>视觉企划板</button>
          <button className="btn" onClick={onGenerateSheet} disabled={!pkg.ledger.directionConfirmed}
            title={!pkg.ledger.directionConfirmed ? "请先选择一个设计方向" : "进入设计单"}>生成设计单<ArrowRight /></button>
        </div>
      </div>

      {/* 单方向绘图提示词弹层 */}
      {promptDir && (
        <div
          onClick={() => setPromptDir(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/30 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-paper-border bg-paper-card p-7 shadow-[0_24px_54px_-24px_rgb(18_20_23/0.32)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-paper-border pb-5">
              <div>
                <div className="text-[12px] tracking-[2px] text-ink-light">{promptDir.tag}</div>
                <h3 className="m-0 mt-1.5 font-serif text-[22px] font-semibold tracking-[1px] text-ink">
                  {promptDir.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setPromptDir(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-light transition-colors hover:bg-paper-warm hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const c = compileDirectionPrompt(promptDir, pkg);
              const activeText = promptLang === "cn" ? c.cn : c.en;
              return (
                <div className="mt-5 space-y-5 text-[13px]">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6">
                      {(
                        [
                          { id: "cn", label: "豆包 / 即梦中文" },
                          { id: "en", label: "Midjourney v6" },
                        ] as { id: "cn" | "en"; label: string }[]
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPromptLang(t.id)}
                          className={`border-b pb-1 transition-colors ${
                            promptLang === t.id
                              ? "border-ink text-ink"
                              : "border-transparent text-ink-light hover:text-ink"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="inline-flex items-center gap-1.5 text-ink-muted transition-colors hover:text-ink"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-cinnabar" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          复制
                        </>
                      )}
                    </button>
                  </div>

                  <div className="border-l-2 border-paper-control bg-paper/60 px-4 py-3.5 leading-[1.8] text-ink">
                    {activeText}
                  </div>

                  <div className="text-[12px] leading-relaxed text-ink-light">
                    负面排除：{c.neg}
                  </div>

                  <div className="flex items-center justify-between border-t border-paper-border pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setPromptDir(null);
                        onOpenFullVisualBoard();
                      }}
                      className="link-draw text-[13px] text-ink"
                    >
                      打开视觉企划板 →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = promptDir;
                        setPromptDir(null);
                        handleRenderDirection(target);
                      }}
                      className="btn-ink h-10 px-5 text-[13px]"
                    >
                      生成效果图
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
