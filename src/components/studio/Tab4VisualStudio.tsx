"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Image as ImageIcon,
  Download,
  RefreshCw,
  ZoomIn,
  X,
  Camera,
  Info,
} from "lucide-react";
import { LiangYiPlanPackage, VisualPromptSlot, VisualSlotId } from "@/lib/types";
import type { ClientModelSettings } from "@/lib/model-settings";
import { exportProposalAndVisualPackMarkdown } from "@/lib/export-ledger";

interface Props {
  pkg: LiangYiPlanPackage;
  modelSettings: ClientModelSettings;
  onUpdateSlot: (slotId: VisualSlotId, patch: Partial<VisualPromptSlot>) => void;
  onOpenModelConfig: () => void;
}

export default function Tab4VisualStudio({
  pkg,
  modelSettings,
  onUpdateSlot,
  onOpenModelConfig,
}: Props) {
  const [promptLang, setPromptLang] = useState<"cn" | "en">("cn");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renderingSlot, setRenderingSlot] = useState<VisualSlotId | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<VisualPromptSlot | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleRenderLiveImage = async (slot: VisualPromptSlot) => {
    setRenderingSlot(slot.slotId);
    setStatusBanner(null);
    try {
      const res = await fetch("/api/agent/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: slot.seedreamPromptCn,
          customImageConfig: {
            baseUrl: modelSettings.imgBaseUrl,
            apiKey: modelSettings.imgApiKey,
            model: modelSettings.imgModel,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.imageUrl) {
        onUpdateSlot(slot.slotId, {
          imageUrl: data.imageUrl,
          imageSource: "live_ai",
        });
        setStatusBanner(`视窗「${slot.titleCn}」已通过 ${data.modelUsed} 实时生成。`);
      } else {
        setStatusBanner(
          data.message || "未配置生图 API Key，当前展示上服历史廓形参考图；填入生图 Key 后可按下方提示词实时出图。"
        );
      }
    } catch {
      setStatusBanner("生图请求超时，已保留当前参考图。");
    } finally {
      setRenderingSlot(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* 顶部工具条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-border bg-paper p-4">
        <div>
          <h3 className="font-serif text-base font-semibold text-ink">
            视觉企划板
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            含正背廓形、局部细节、面料色卡与上身效果四分镜，仅作风格参考，实际质感以实物为准
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {!modelSettings.imgApiKey.trim() && <button type="button" className="text-xs text-brocade-dark underline" onClick={onOpenModelConfig}>配置图像模型</button>}
          <div className="inline-flex rounded-lg border border-paper-border bg-paper-card p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPromptLang("cn")}
              className={`rounded-md px-2.5 py-1 font-medium ${
                promptLang === "cn" ? "bg-ink text-paper" : "text-ink-muted"
              }`}
            >
              豆包 / 即梦
            </button>
            <button
              type="button"
              onClick={() => setPromptLang("en")}
              className={`rounded-md px-2.5 py-1 font-medium ${
                promptLang === "en" ? "bg-ink text-paper" : "text-ink-muted"
              }`}
            >
              Midjourney v6
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportProposalAndVisualPackMarkdown(pkg)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:bg-cinnabar"
          >
            <Download className="h-3.5 w-3.5" />
            导出 Markdown
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-brocade/40 bg-brocade-light/70 px-4 py-2.5 text-xs text-ink no-print">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={onOpenModelConfig}
            className="shrink-0 font-semibold text-brocade-dark underline"
          >
            配置生图 Key
          </button>
        </div>
      )}

      {/* 2x2 四宫格企划展板 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {pkg.visualSlots.map((slot) => {
          const activePrompt =
            promptLang === "cn" ? slot.seedreamPromptCn : slot.midjourneyPromptEn;
          const isRendering = renderingSlot === slot.slotId;

          return (
            <div
              key={slot.slotId}
              className="flex flex-col overflow-hidden rounded-xl border border-paper-border bg-paper-card shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 border-b border-paper-border bg-paper-warm px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold tracking-wider text-brocade-dark">
                    {slot.titleEn}
                  </div>
                  <div className="truncate font-serif text-sm font-bold text-ink">
                    {slot.titleCn}
                  </div>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold ${
                    slot.imageSource === "live_ai"
                      ? "bg-jade text-on-accent"
                      : "bg-paper text-ink-muted border border-paper-border"
                  }`}
                >
                  {slot.imageSource === "live_ai"
                    ? "AI 实时生成图"
                    : "历史廓形参考图"}
                </span>
              </div>

              <div className="group relative h-60 w-full bg-stone-100 overflow-hidden">
                <img
                  src={slot.imageUrl}
                  alt={slot.titleCn}
                  className="h-full w-full object-contain bg-paper-warm transition duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 no-print">
                  <span className="truncate rounded bg-scrim/75 px-2 py-1 text-[10px] text-stone-100 backdrop-blur-sm">
                    {slot.subLabel}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLightbox(slot)}
                      className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-md bg-paper-card/90 px-2 py-1 text-[11px] font-medium text-ink shadow-sm hover:bg-paper-card"
                    >
                      <ZoomIn className="h-3 w-3" />
                      放大
                    </button>
                    <button
                      type="button"
                      disabled={isRendering}
                      onClick={() => handleRenderLiveImage(slot)}
                      className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-md bg-ink px-2.5 py-1 text-[11px] font-medium text-paper shadow-sm hover:bg-cinnabar disabled:opacity-60"
                    >
                      {isRendering ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          生成中…
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-3 w-3" />
                          实时出图
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4 space-y-2.5">
                {slot.visualCheckNote && (
                  <div className="flex items-start gap-1.5 rounded bg-paper px-2.5 py-1.5 text-[10px] text-ink-muted">
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-brocade-dark" />
                    <span>{slot.visualCheckNote}</span>
                  </div>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-ink">
                      {promptLang === "cn"
                        ? "中文提示词"
                        : "Midjourney v6 Prompt"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(slot.slotId, activePrompt)}
                      className="inline-flex items-center gap-1 text-brocade-dark hover:underline no-print"
                    >
                      {copiedId === slot.slotId ? (
                        <>
                          <Check className="h-3 w-3 text-jade" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          复制
                        </>
                      )}
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={activePrompt}
                    onChange={(e) =>
                      onUpdateSlot(
                        slot.slotId,
                        promptLang === "cn"
                          ? { seedreamPromptCn: e.target.value }
                          : { midjourneyPromptEn: e.target.value }
                      )
                    }
                    className="w-full resize-none rounded-lg border border-paper-border bg-paper p-2.5 text-[11px] leading-relaxed text-ink focus:border-brocade focus:outline-none"
                  />
                </div>

                <div className="space-y-1 border-t border-paper-border pt-2 text-[11px] text-ink-muted">
                  <div className="flex items-center gap-1">
                    <Camera className="h-3 w-3 text-brocade-dark shrink-0" />
                    <span className="truncate" title={slot.cameraLightingSpec}>
                      <strong>镜头布光：</strong>
                      {slot.cameraLightingSpec}
                    </span>
                  </div>
                  <div className="truncate" title={slot.negativePrompt}>
                    <strong className="text-cinnabar">负面排除词：</strong>
                    {slot.negativePrompt}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/80 p-4 backdrop-blur-sm no-print"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-4xl rounded-xl bg-paper-card p-4 shadow-2xl"
          >
            <button
              type="button"
              aria-label="关闭大图"
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 rounded-full bg-paper-card/90 p-1.5 text-ink shadow hover:bg-paper-card"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={lightbox.imageUrl}
              alt={lightbox.titleCn}
              className="max-h-[75vh] w-auto mx-auto rounded-lg object-contain"
            />
            <div className="mt-2 text-center">
              <div className="font-serif text-sm font-bold text-ink">
                {lightbox.titleCn}（{lightbox.titleEn}）
              </div>
              <div className="text-xs text-ink-muted">{lightbox.subLabel}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
