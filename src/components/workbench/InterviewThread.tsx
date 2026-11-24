import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, Copy, RotateCcw } from "lucide-react";
import { modeLabel, pendingAsks, type FlowStep } from "@/lib/workbench-orders";
import type { BusinessMode, FollowUpQuestion, InterviewPhoto, InterviewTurn, LiangYiPlanPackage, ToolCallTraceStep } from "@/lib/types";
import InterviewComposer from "./InterviewComposer";

export type InterviewInput = Pick<InterviewTurn, "text" | "at">;
export interface InterviewSession {
  mode: BusinessMode;
  startedAt: string;
  orderNo?: string;
  pending?: InterviewInput;
  playback?: string;
  failed?: boolean;
}

export function interviewTime(at: string) {
  return new Date(at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// 当前按节奏揭示接口的一次性结果。步骤卡只消费步骤和进度，也可以直接接收流式数据。
export function useStepProgress(steps: ToolCallTraceStep[] | undefined, playback?: string) {
  const total = steps?.length ?? 0;
  const [progress, setProgress] = useState({ key: "", count: 0 });
  useEffect(() => {
    if (!playback || !total) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number;
    let count = 0;
    function advance() {
      if (motion.matches) count = total;
      setProgress({ key: playback!, count });
      if (count < total) timer = window.setTimeout(() => { count++; advance(); }, 520);
    }
    function motionChanged() { window.clearTimeout(timer); advance(); }
    advance();
    motion.addEventListener("change", motionChanged);
    return () => { window.clearTimeout(timer); motion.removeEventListener("change", motionChanged); };
  }, [playback, total]);
  return !playback ? total : progress.key === playback ? Math.min(total, progress.count) : 0;
}

export function TraceSteps({ steps, shown = steps.length, pending = false }: { steps: ToolCallTraceStep[]; shown?: number; pending?: boolean }) {
  const [open, setOpen] = useState(true);
  const active = steps[shown];
  const timed = steps.slice(0, shown);
  const duration = timed.length && timed.every(s => s.durationMs != null) ? timed.reduce((n, s) => n + s.durationMs!, 0) : null;
  return <div className="think"><button className="tt" aria-expanded={open} onClick={() => setOpen(v => !v)}>
    <i className={pending || active ? "run" : "done"} />
    {pending ? "正在解析客户原话…" : active ? "正在" + active.toolLabel + "…" : "解析完成 · " + steps.length + " 步"}
    {duration != null && <span className="tm">已用 {duration} ms</span>}<ChevronRight className={open ? "turn" : ""} />
  </button>
    {open && steps.length > 0 && <ol>{steps.slice(0, shown + 1).map((step, i) =>
      <li key={step.stepIndex} className={i === shown ? "on" : ""}><span className="ok">{i < shown && <Check />}</span>
        <span>
          {step.agentName && <b className="agent-badge" data-role={step.agentRole || "dialogue"}>{step.agentName}</b>}
          {step.toolLabel}{i < shown && <em>{step.resultSummary}</em>}
        </span>
        {i < shown && step.durationMs != null && <span className="tm">{step.durationMs} ms</span>}</li>)}</ol>}
  </div>;
}

interface Props {
  session: InterviewSession;
  order?: LiangYiPlanPackage;
  shown: number;
  running: boolean;
  busy: boolean;
  onAppend: (text: string, question?: FollowUpQuestion, photos?: InterviewPhoto[]) => void;
  onRetry: () => void;
  onRegenerate: () => void;
  onOpen: (step: FlowStep) => void;
}

export default function InterviewThread({ session, order, shown, running, busy, onAppend, onRetry, onRegenerate, onOpen }: Props) {
  const [draft, setDraft] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const turns = order?.interviewTurns ?? [];
  const asks = order ? pendingAsks(order) : undefined;
  const keywords = order ? [...new Set([...Object.values(order.sixDimensions).flatMap(d => d.keywords),
    ...order.proposal.lockedHardBadges.map(b => b.label), ...order.requirements.map(r => r.rawPhrase)].filter(Boolean))].slice(0, 6) : [];
  const lastMessage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (turns.length && session.pending) lastMessage.current?.scrollIntoView({ block: "center" });
  }, [session.pending, turns.length]);
  function submit(text: string, photos: InterviewPhoto[]) {
    if (!text || busy || running || !order) return;
    const match = asks?.questions.find(({ question }) => question.quickAnswers?.includes(text));
    onAppend(text, match?.question, photos); setDraft("");
  }
  function bubble(turn: InterviewInput) {
    return <div className="you"><p className="bubble">{turn.text}</p><span className="m">顾问录入 · {interviewTime(turn.at)}</span></div>;
  }
  return <section className="interview-thread-page">
    <header className="mhead"><div><span className="crumb">{modeLabel(session.mode)} · {order ? order.ledger.ledgerNo : "新建"}</span><h1>面谈解析 · {interviewTime(session.startedAt)}</h1></div>
      <div className="r">
        <span role="status" className={"status" + (running ? " live" : "") + (running || session.failed ? "" : " settled")}><i />{session.failed ? "解析中断" : running ? "解析中" : "已完成"}</span>
        {order && !running && !session.failed && <button className="btn-soft thread-open-btn" onClick={() => onOpen(1)}>查看面谈记录<ArrowRight size={14} /></button>}
      </div></header>
    <div className="thread">
      {turns.map((turn, i) => {
        const latest = i === turns.length - 1 && !session.pending;
        const count = latest && session.playback === turn.at ? shown : turn.steps.length;
        const complete = count >= turn.steps.length;
        return <div className="exchange" key={turn.at}>{bubble(turn)}
          <div className="bot"><TraceSteps steps={turn.steps} shown={count} />
            {complete && <div className="answer"><p>{turn.reply}</p></div>}
            {latest && complete && order && <>
              <div className="qcards">{asks?.questions.map(({ question: q, req }) =>
                <article className="qcard" key={q.id}><div className="k">{req ? "追问 · 需求 Nº" + String(req.index).padStart(2, "0") : "面谈追问"}</div>
                  <div className="qt" title={q.whyItMatters}>{q.question}</div><div className="opts">{q.quickAnswers?.map(a =>
                    <button key={a} className="opt" disabled={busy} onClick={() => onAppend(a, q)}>{a}</button>)}</div></article>)}</div>
              <div className="mini">{keywords.map(k => <span className="chip" key={k}>{k}</span>)}
                {!!asks?.count && <span className="chip w">{asks.count} 处待追问</span>}</div>
              <div className="actions"><button className="btn" onClick={() => onOpen(1)}>查看面谈记录<ArrowRight /></button>
                <button className="ghost" onClick={() => onOpen(2)}>{asks?.count ? "先看设计方向" : "查看设计方向"}</button></div>
              <div className="acts"><button className="ico" aria-label="复制解析结论" onClick={async () => {
                try { await navigator.clipboard.writeText(turn.reply); setCopyNotice("已复制"); } catch { setCopyNotice("请选中结论文字复制"); }
              }}><Copy /></button><button className="ico" aria-label="重新解析" disabled={busy} onClick={onRegenerate}><RotateCcw /></button>
                <small role="status">{copyNotice}</small></div>
            </>}
          </div>
        </div>;
      })}
      {session.pending && <div className="exchange" ref={lastMessage}>{bubble(session.pending)}<div className="bot">
        {session.failed ? <button className="btn-soft" onClick={onRetry}><RotateCcw />重试解析</button>
          : <TraceSteps steps={[]} shown={0} pending />}</div></div>}
    </div>
    <div className="dock"><InterviewComposer kind="thread" draftKey={"order:" + (order?.ledger.ledgerNo ?? session.startedAt)}
      savedPhotos={order?.photos} text={draft} onText={setDraft} busy={busy || running || !order} onSubmit={submit} /></div>
  </section>;
}
