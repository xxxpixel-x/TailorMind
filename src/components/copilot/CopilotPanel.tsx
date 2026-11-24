"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  UserCheck,
  Building2,
  Cpu,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Clock,
  FolderKanban,
  RotateCcw,
  AlertCircle,
  MessageSquarePlus,
} from "lucide-react";
import { DEMO_PRESET_PROMPTS } from "@/data/demo-scenarios";
import { CASE_KB } from "@/data/kb-cases";
import {
  BusinessMode,
  ChatTurnMessage,
  ToolCallTraceStep,
} from "@/lib/types";

interface Props {
  mode: BusinessMode;
  onModeChange: (m: BusinessMode) => void;
  chatMessages: ChatTurnMessage[];
  draftInput: string;
  onDraftInputChange: (val: string) => void;
  onSendMessage: (text: string) => void;
  onResetSession: () => void;
  onLoadPreset: (presetId: string) => void;
  onLoadOfficialCase: (caseId: string) => void;
  isLoading: boolean;
  engineSource: string;
  modelUsed: string;
  traces: ToolCallTraceStep[];
}

export default function CopilotPanel({
  mode,
  onModeChange,
  chatMessages,
  draftInput,
  onDraftInputChange,
  onSendMessage,
  onResetSession,
  onLoadPreset,
  onLoadOfficialCase,
  isLoading,
  engineSource,
  modelUsed,
  traces,
}: Props) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatMessages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftInput.trim() || isLoading) return;
    onSendMessage(draftInput.trim());
  };

  return (
    <aside className="flex flex-col gap-3.5 rounded-2xl border border-paper-border bg-paper-card p-4 shadow-atelier no-print">
      {/* 1. 业务模式切换 */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-ink-muted">
          <span>定制业务模式</span>
          <button
            type="button"
            onClick={onResetSession}
            className="inline-flex items-center gap-1 text-ink-light hover:text-cinnabar"
          >
            <RotateCcw className="h-3 w-3" />
            新开面谈
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-paper-warm p-1">
          <button
            type="button"
            onClick={() => onModeChange("bespoke")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "bespoke"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            海派高级私定
          </button>
          <button
            type="button"
            onClick={() => onModeChange("uniform")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "uniform"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            团体职业服企划
          </button>
        </div>
      </div>

      {/* 2. 场景样例快载（含全新非案例测试 + 官方6案例） */}
      <div className="rounded-xl border border-paper-border bg-paper p-2.5">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-ink">
          <FolderKanban className="h-3.5 w-3.5 text-brocade-dark" />
          <span>快捷测试场景（可一键发起新面谈）</span>
        </div>
        <div className="space-y-1.5">
          {DEMO_PRESET_PROMPTS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={isLoading}
              onClick={() => onLoadPreset(p.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-paper-border bg-paper-card px-2.5 py-1.5 text-left text-xs transition hover:border-brocade hover:bg-brocade-light/40 disabled:opacity-60"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{p.title}</div>
                <div className="truncate text-[10px] text-ink-muted">{p.subtitle}</div>
              </div>
              <span className="shrink-0 whitespace-nowrap rounded bg-paper-warm px-1.5 py-0.5 text-[10px] font-medium text-brocade-dark">
                {p.badge}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-2">
          <select
            defaultValue=""
            disabled={isLoading}
            onChange={(e) => {
              if (e.target.value) {
                onLoadOfficialCase(e.target.value);
                e.target.value = "";
              }
            }}
            className="w-full rounded-lg border border-paper-border bg-paper-card px-2.5 py-1.5 text-[11px] text-ink-muted focus:border-brocade focus:outline-none"
          >
            <option value="" disabled>
              或载入上服官方 6 个真实案例 / 模拟团装归档...
            </option>
            {CASE_KB.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.id}] {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. 边聊边问 · 顾问面谈多轮对话流 */}
      <div className="flex flex-col rounded-xl border border-paper-border bg-paper overflow-hidden">
        <div className="flex items-center justify-between border-b border-paper-border bg-paper-warm px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <MessageSquarePlus className="h-3.5 w-3.5 text-brocade-dark" />
            <span>顾问面谈记录（边聊边问）</span>
          </div>
          <span className="text-[10px] text-ink-muted">
            共 {chatMessages.filter((m) => m.role === "advisor").length} 轮沟通
          </span>
        </div>

        <div className="max-h-[380px] space-y-3 overflow-y-auto p-3 text-xs">
          {chatMessages.map((msg) => {
            const isAdvisor = msg.role === "advisor";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAdvisor ? "items-end" : "items-start"}`}
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10px] text-ink-light">
                  <span>{isAdvisor ? "定制顾问录入" : "衣语 TailorMind 企划助手"}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`max-w-[95%] whitespace-pre-wrap rounded-xl px-3 py-2.5 leading-relaxed ${
                    isAdvisor
                      ? "bg-ink text-paper"
                      : "border border-paper-border bg-paper-card text-ink"
                  }`}
                >
                  {msg.content}
                </div>

                {/* 内嵌在 Agent 回复下的可点选追问卡片 */}
                {!isAdvisor && msg.followUps && msg.followUps.length > 0 && (
                  <div className="mt-2 w-full space-y-2">
                    {msg.followUps.map((fq) => (
                      <div
                        key={fq.id}
                        className={`rounded-lg border p-2.5 text-[11px] ${
                          fq.isConflict
                            ? "border-cinnabar/35 bg-cinnabar-light/50"
                            : "border-brocade/35 bg-brocade-light/40"
                        }`}
                      >
                        <div className="flex items-start gap-1.5 font-semibold text-ink">
                          {fq.isConflict && (
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cinnabar" />
                          )}
                          <span>{fq.question}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-ink-muted">
                          原因：{fq.whyItMatters}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {fq.quickAnswers.map((ans) => (
                            <button
                              key={ans}
                              type="button"
                              disabled={isLoading}
                              onClick={() => onSendMessage(`客户回复：${ans}`)}
                              className="rounded-md border border-paper-border bg-paper-card px-2 py-1 text-left text-[10px] text-ink transition hover:border-brocade hover:bg-brocade hover:text-on-accent disabled:opacity-50"
                            >
                              {ans}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center gap-2 rounded-lg border border-paper-border bg-paper-card px-3 py-2 text-xs text-ink-muted">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-brocade-dark" />
              正在拆解需求、检索体型规则与集团资产并执行核验...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 底部对话输入框 */}
        <form onSubmit={handleSubmit} className="border-t border-paper-border bg-paper-card p-2.5">
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={draftInput}
              onChange={(e) => onDraftInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (draftInput.trim() && !isLoading) {
                    onSendMessage(draftInput.trim());
                  }
                }
              }}
              placeholder="输入客户新诉求或追问后的补充回答（Enter 发送，Shift+Enter 换行）..."
              className="flex-1 resize-none rounded-lg border border-paper-border bg-paper px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-light focus:border-brocade focus:bg-paper-card focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !draftInput.trim()}
              className="inline-flex shrink-0 flex-col items-center justify-center rounded-lg bg-ink px-3 text-xs font-semibold text-paper transition hover:bg-ink/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5 text-brocade" />
              <span className="mt-0.5 text-[10px]">发送</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. 工具调用与核验轨迹（可展开检查） */}
      <div className="rounded-xl border border-paper-border bg-paper p-3">
        <button
          type="button"
          onClick={() => setTraceOpen(!traceOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Cpu className="h-3.5 w-3.5 text-brocade-dark" />
            <span>工具检索与核验轨迹 ({traces.length} 步)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-medium ${
                engineSource === "live_llm_tool_call"
                  ? "bg-jade-light text-jade"
                  : "bg-paper-warm text-brocade-dark"
              }`}
            >
              {engineSource === "live_llm_tool_call"
                ? "实时大模型调用"
                : "本地规则检索"}
            </span>
            {traceOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-ink-light" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-ink-light" />
            )}
          </div>
        </button>

        <div className="mt-1 truncate text-[10px] text-ink-muted" title={modelUsed}>
          当前引擎：{modelUsed}
        </div>

        {traceOpen && (
          <div className="mt-2.5 space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {traces.map((step) => {
              const isOpen = expandedStep === step.stepIndex;
              return (
                <div
                  key={step.stepIndex}
                  className="rounded-lg border border-paper-border bg-paper-card p-2 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedStep(isOpen ? null : step.stepIndex)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-ink">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brocade/20 text-[10px] font-bold text-brocade-dark">
                        {step.stepIndex}
                      </span>
                      <span className="truncate text-[11px]">{step.toolLabel}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-ink-light shrink-0">
                      {step.durationMs !== null && (
                        <>
                          <Clock className="h-2.5 w-2.5" />
                          <span>{step.durationMs}ms</span>
                        </>
                      )}
                    </div>
                  </button>

                  <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                    {step.resultSummary}
                  </p>

                  {step.matchedAssetIds.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {step.matchedAssetIds.map((id) => (
                        <span
                          key={id}
                          className="rounded border border-brocade/40 bg-brocade-light px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brocade-dark"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}

                  {isOpen && (
                    <div className="mt-1.5 rounded bg-ink p-2 font-mono text-[10px] text-stone-200 overflow-x-auto">
                      <div className="text-brocade">tool: {step.toolName}()</div>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(step.inputArgs, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
