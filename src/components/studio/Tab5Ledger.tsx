"use client";

import React from "react";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  ClipboardList,
  History,
  Users,
  Download,
} from "lucide-react";
import { BusinessLedger, LiangYiPlanPackage, WorkflowStage } from "@/lib/types";
import {
  exportFullWorkbookXlsx,
  exportLedgerCsv,
  exportProposalAndVisualPackMarkdown,
} from "@/lib/export-ledger";

interface Props {
  pkg: LiangYiPlanPackage;
  onUpdateLedger: (patch: Partial<BusinessLedger>, auditNote?: string) => void;
}

const WORKFLOW_STAGES: { stage: WorkflowStage; name: string; role: string }[] = [
  { stage: 1, name: "1. 设计语言转化", role: "Agent辅助 + 顾问" },
  { stage: 2, name: "2. 设计图企划", role: "Agent提示词 + 设计师" },
  { stage: 3, name: "3. 选面料签样", role: "Agent匹配 + 实物确认" },
  { stage: 4, name: "4. CAD版型设计", role: "富怡/ET制版师" },
  { stage: 5, name: "5. 样衣打样试穿", role: "样衣师 + 门店试衣" },
  { stage: 6, name: "6. 成衣品控交付", role: "生产部 + 商务交付" },
];

export default function Tab5Ledger({ pkg, onUpdateLedger }: Props) {
  const ledger = pkg.ledger;

  return (
    <div className="space-y-6">
      {/* 1. 顶部多格式上报导出栏 */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-border bg-paper p-4 no-print">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-ink-muted" />
          <h3 className="font-serif text-base font-semibold text-ink">
            单笔台账 · {ledger.ledgerNo}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportFullWorkbookXlsx(pkg)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-xs font-medium text-paper hover:bg-cinnabar"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            导出台账 (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => exportLedgerCsv(pkg)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-paper-border bg-paper-card px-3 py-2 text-xs font-medium text-ink hover:border-ink/40"
          >
            <Download className="h-3.5 w-3.5 text-ink-muted" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportProposalAndVisualPackMarkdown(pkg)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-paper-border bg-paper-card px-3 py-2 text-xs font-medium text-ink hover:border-ink/40"
          >
            <FileText className="h-3.5 w-3.5 text-ink-muted" />
            方案书 (.md)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-paper-border bg-paper-card px-3 py-2 text-xs font-medium text-ink hover:border-ink/40"
          >
            <Printer className="h-3.5 w-3.5 text-ink-muted" />
            打印 PDF
          </button>
        </div>
      </section>

      {/* 2. 上服六步标准工作流状态流转器 */}
      <section className="rounded-xl border border-paper-border bg-paper p-4">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="font-serif font-semibold text-ink">
            定制进度（点击切换阶段）
          </span>
          <span className="text-ink-muted">当前：{WORKFLOW_STAGES[ledger.currentStage - 1]?.name}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          {WORKFLOW_STAGES.map((item) => {
            const done = item.stage <= ledger.currentStage;
            const current = item.stage === ledger.currentStage;
            return (
              <button
                key={item.stage}
                type="button"
                onClick={() =>
                  onUpdateLedger(
                    { currentStage: item.stage },
                    `人工将六步工作流节点流转至「${item.name}」`
                  )
                }
                className={`rounded-lg border p-2.5 text-left transition ${
                  current
                    ? "border-brocade bg-ink text-paper shadow-sm"
                    : done
                    ? "border-jade/40 bg-jade-light/60 text-ink"
                    : "border-paper-border bg-paper-card text-ink-muted hover:border-brocade/50"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>{item.name}</span>
                  {done && <CheckCircle2 className="h-3 w-3 shrink-0 text-brocade" />}
                </div>
                <div
                  className={`mt-1 text-[10px] ${
                    current ? "text-stone-300" : "text-ink-light"
                  }`}
                >
                  责任：{item.role}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. 可在线编辑的定制业务专题台账主表 */}
      <section className="rounded-xl border border-paper-border bg-paper-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-paper-border pb-3">
          <h4 className="font-serif text-base font-semibold text-ink">
            基础信息
          </h4>
          <select
            value={ledger.reviewStatus}
            onChange={(e) =>
              onUpdateLedger(
                { reviewStatus: e.target.value as BusinessLedger["reviewStatus"] },
                `人工更新台账审批状态为「${e.target.value}」`
              )
            }
            className="rounded-lg border border-paper-border bg-paper px-3 py-1 text-xs font-medium text-ink focus:outline-none"
          >
            <option value="待审核">待审核</option>
            <option value="已复核·待打样">已复核 · 待打样</option>
            <option value="意向已确认">意向已确认</option>
          </select>
        </div>

        <div className="grid gap-4 text-xs sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-ink-muted">项目名称</label>
            <input
              type="text"
              value={ledger.projectName}
              onChange={(e) => onUpdateLedger({ projectName: e.target.value })}
              className="w-full rounded-lg border border-paper-border bg-paper px-3 py-2 text-ink focus:border-ink/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-ink-muted">
              客户 / 单位
            </label>
            <input
              type="text"
              value={ledger.clientOrOrgName}
              onChange={(e) => onUpdateLedger({ clientOrOrgName: e.target.value })}
              className="w-full rounded-lg border border-paper-border bg-paper px-3 py-2 text-ink focus:border-ink/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-ink-muted">
              定制数量
            </label>
            <input
              type="text"
              value={ledger.headcountOrQty}
              onChange={(e) => onUpdateLedger({ headcountOrQty: e.target.value })}
              className="w-full rounded-lg border border-paper-border bg-paper px-3 py-2 text-ink focus:border-ink/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-ink-muted">
              负责顾问
            </label>
            <input
              type="text"
              value={ledger.specialistName}
              onChange={(e) => onUpdateLedger({ specialistName: e.target.value })}
              className="w-full rounded-lg border border-paper-border bg-paper px-3 py-2 text-ink focus:border-ink/40 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block font-medium text-ink-muted">
              量体与试穿备注
            </label>
            <textarea
              rows={2}
              value={ledger.fittingMemo}
              onChange={(e) => onUpdateLedger({ fittingMemo: e.target.value })}
              className="w-full resize-none rounded-lg border border-paper-border bg-paper px-3 py-2 text-ink focus:border-ink/40 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block font-medium text-ink-muted">
              已选资产编码
            </label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-paper-border bg-paper p-2.5">
              {[
                ...ledger.selectedPatternIds,
                ...ledger.selectedFabricIds,
                ...ledger.selectedCraftIds,
                ...ledger.referenceCaseIds,
              ].map((code) => (
                <span
                  key={code}
                  className="rounded border border-brocade/40 bg-brocade-light px-2 py-0.5 font-mono text-[11px] font-bold text-brocade-dark"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. 团体职业服专属：岗位标准号型分布与特体员工放量归档表 */}
      {ledger.uniformSizeTable && ledger.uniformSizeTable.length > 0 && (
        <section className="rounded-xl border border-paper-border bg-paper p-5">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-brocade-dark" />
            <h4 className="font-serif text-base font-semibold text-ink">
              团装号型与特体
            </h4>
          </div>

          <div className="overflow-x-auto rounded-xl border border-paper-border bg-paper-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-paper-border bg-paper-warm text-ink">
                <tr>
                  <th className="px-3 py-2.5">岗位层级组</th>
                  <th className="px-3 py-2.5 w-20">款式</th>
                  <th className="px-3 py-2.5">国标标准号型套码分布</th>
                  <th className="px-3 py-2.5 w-24">特体人数</th>
                  <th className="px-3 py-2.5">特体部位放量与改版说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-border">
                {ledger.uniformSizeTable.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2.5 font-semibold text-ink">{row.roleGroup}</td>
                    <td className="px-3 py-2.5 text-ink-muted">{row.gender}</td>
                    <td className="px-3 py-2.5 font-mono text-ink">{row.standardSizes}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          row.specialFitCount > 0
                            ? "bg-cinnabar-light text-cinnabar"
                            : "bg-jade-light text-jade"
                        }`}
                      >
                        {row.specialFitCount} 人
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-muted">{row.specialFitNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. 全流程业务与 Agent 操作留痕时间轴 */}
      <section className="rounded-xl border border-paper-border bg-paper p-5">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-brocade-dark" />
          <h4 className="font-serif text-base font-semibold text-ink">
            操作记录
          </h4>
        </div>

        <div className="space-y-2.5">
          {ledger.auditLogs.map((log) => {
            const isHuman = log.actor.includes("人工");
            return (
              <div
                key={log.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-paper-border bg-paper-card px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
                      isHuman
                        ? "bg-jade text-on-accent"
                        : "bg-brocade-light text-brocade-dark"
                    }`}
                  >
                    {log.actor}
                  </span>
                  <div>
                    <div className="font-semibold text-ink">{log.action}</div>
                    <div className="mt-0.5 text-ink-muted">{log.detail}</div>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-ink-light">{log.timestamp}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
