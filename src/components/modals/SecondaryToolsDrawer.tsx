"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Tab2AssetKb from "@/components/studio/Tab2AssetKb";
import Tab4VisualStudio from "@/components/studio/Tab4VisualStudio";
import Tab5Ledger from "@/components/studio/Tab5Ledger";
import {
  BusinessLedger,
  LiangYiPlanPackage,
  VisualPromptSlot,
  VisualSlotId,
} from "@/lib/types";
import type { ClientModelSettings } from "@/lib/model-settings";

import { exportFullWorkbookXlsx } from "@/lib/export-ledger";

export type SecondaryTabId = "kb" | "visual" | "ledger" | "boundary" | "model";

interface Props {
  open: boolean;
  initialTab: SecondaryTabId;
  onClose: () => void;
  pkg: LiangYiPlanPackage;
  archivedOrders: LiangYiPlanPackage[];
  matchedAssetIds: string[];
  modelSettings: ClientModelSettings;
  onSaveModelSettings: (next: ClientModelSettings) => void;
  onApplyCaseToInterview: (caseId: string) => void;
  onLoadArchivedOrder: (archived: LiangYiPlanPackage) => void;
  onUpdateSlot: (slotId: VisualSlotId, patch: Partial<VisualPromptSlot>) => void;
  onUpdateLedger: (patch: Partial<BusinessLedger>, auditNote?: string) => void;
}

export default function SecondaryToolsDrawer({
  open,
  initialTab,
  onClose,
  pkg,
  archivedOrders,
  matchedAssetIds,
  modelSettings,
  onApplyCaseToInterview,
  onLoadArchivedOrder,
  onUpdateSlot,
  onUpdateLedger,
}: Props) {
  const [tab, setTab] = useState<SecondaryTabId>(initialTab);
  useEffect(() => {
    if (open && (initialTab === "model" || initialTab === "boundary")) {
      onClose();
      window.location.hash = "settings";
    } else setTab(initialTab);
  }, [initialTab, open, onClose]);

  function selectTab(id: SecondaryTabId) {
    if (id === "model" || id === "boundary") {
      onClose();
      window.location.hash = "settings";
    } else setTab(id);
  }

  if (!open) return null;

  const tabs: { id: SecondaryTabId; label: string }[] = [
    { id: "kb", label: "资产与规则库" },
    { id: "visual", label: "AI 视觉提示词" },
    { id: "ledger", label: "专题台账" },
    { id: "boundary", label: "能力边界" },
    { id: "model", label: "模型设置" },
  ];

  return (
    <div
      onClick={onClose}
      className="no-print fixed inset-0 z-50 flex justify-end bg-scrim/35"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-5xl flex-col border-l border-paper-border bg-paper"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-border bg-paper-card px-6 py-4">
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`min-h-[40px] border-b-2 px-3.5 text-[14px] transition-colors ${
                  tab === t.id
                    ? "border-accent font-medium text-ink"
                    : "border-transparent text-ink-light hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-paper-border bg-paper-card text-ink-muted hover:border-accent hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "kb" && (
            <Tab2AssetKb
              matchedIds={matchedAssetIds}
              onApplyCaseToCopilot={(id) => {
                onApplyCaseToInterview(id);
                onClose();
              }}
            />
          )}

          {tab === "visual" && (
            <Tab4VisualStudio
              pkg={pkg}
              modelSettings={modelSettings}
              onUpdateSlot={onUpdateSlot}
              onOpenModelConfig={() => selectTab("model")}
            />
          )}

          {tab === "ledger" && (
            <div className="space-y-6">
              {/* 已归档多客户工单档案表 */}
              <section className="rounded-[4px] border border-paper-border bg-paper-card p-5">
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-serif m-0 text-[18px] font-bold text-ink">
                    已归档定制台账（{archivedOrders.length} 份）
                  </h3>
                  <span className="text-[12px] text-ink-light">
                    可随时回溯复盘并导出 5 表 Excel
                  </span>
                </div>
                <div className="divide-y divide-paper-border border-y border-paper-border">
                  {archivedOrders.map((ord) => (
                    <div
                      key={ord.ledger.ledgerNo}
                      className="grid grid-cols-1 items-center gap-2 py-3 text-[13px] sm:grid-cols-[135px_minmax(0,1fr)_90px_140px]"
                    >
                      <span className="font-mono text-[12px] text-ink-light tabular-nums">
                        {ord.ledger.ledgerNo}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">
                          {ord.ledger.projectName}
                        </div>
                        <div className="truncate text-[12px] text-ink-light">
                          {ord.ledger.clientOrOrgName} · {ord.ledger.headcountOrQty}
                        </div>
                      </div>
                      <span className="text-[12px] text-ink-muted">
                        {ord.mode === "uniform" ? "团体职业服" : "海派私定"}
                      </span>
                      <div className="flex items-center gap-3 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadArchivedOrder(ord);
                            onClose();
                          }}
                          className="text-ink underline decoration-paper-control underline-offset-4 hover:text-cinnabar"
                        >
                          载入查看
                        </button>
                        <button
                          type="button"
                          onClick={() => exportFullWorkbookXlsx(ord)}
                          className="text-ink-light hover:text-ink"
                        >
                          导出 Excel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <Tab5Ledger pkg={pkg} onUpdateLedger={onUpdateLedger} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
