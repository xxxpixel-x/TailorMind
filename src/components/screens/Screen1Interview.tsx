"use client";

import { Fragment, useState } from "react";
import { ArrowRight, MessageSquareText, Pencil } from "lucide-react";
import type { InterviewPhoto, LiangYiPlanPackage, RequirementItem, RequirementStatus } from "@/lib/types";
import InterviewComposer from "@/components/workbench/InterviewComposer";
import { PhotoGallery } from "@/components/workbench/InterviewPhotos";
import { dimensionEvidence, emotionEvidence } from "@/lib/workbench-evidence";
import { pendingAsks, reqStatus } from "@/lib/workbench-orders";

interface Props {
  pkg: LiangYiPlanPackage;
  draftInput: string;
  onDraftInputChange: (v: string) => void;
  onSubmitAppend: (text: string, photos: InterviewPhoto[]) => void;
  onEditRequirement: (id: string, patch: Partial<RequirementItem>) => void;
  onAddManualRequirement: (rawPhrase: string, solutionAction: string) => void;
  onInspectAsset: (id: string) => void;
  onGoToDirections: () => void;
  onOpenThread?: () => void;
  isLoading: boolean;
}
interface HighlightSegment {
  text: string;
  reqIndex?: number;
}

function highlightParagraph(
  paragraph: string,
  requirements: RequirementItem[]
): HighlightSegment[] {
  const matches: { start: number; end: number; reqIndex: number }[] = [];

  for (const req of requirements) {
    const span = (req.sourceSpan || "").trim();
    if (span.length < 2) continue;
    const pos = paragraph.indexOf(span);
    if (pos === -1) continue;
    const end = pos + span.length;
    const overlaps = matches.some((m) => !(end <= m.start || pos >= m.end));
    if (!overlaps) {
      matches.push({ start: pos, end, reqIndex: req.index });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ text: paragraph.slice(cursor, m.start) });
    }
    segments.push({ text: paragraph.slice(m.start, m.end), reqIndex: m.reqIndex });
    cursor = m.end;
  }
  if (cursor < paragraph.length) {
    segments.push({ text: paragraph.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ text: paragraph }];
}


const statusOrder: RequirementStatus[] = ["已落实", "推断", "待追问"];
const tone = (s: RequirementStatus) => s === "已落实" ? "j" : s === "推断" ? "" : "w";
const number = (i: number) => String(i).padStart(2, "0");

export default function Screen1Interview({ pkg, draftInput, onDraftInputChange, onSubmitAppend, onEditRequirement,
  onAddManualRequirement, onInspectAsset, onGoToDirections, onOpenThread, isLoading }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ id: string; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [said, setSaid] = useState("");
  const [how, setHow] = useState("");
  const { requirements, customerParagraphs, verification } = pkg;
  const unhandled = verification.clauseCoverage.filter(c => c.status === "unhandled");
  const emotions = emotionEvidence(pkg);
  const asks = pendingAsks(pkg);
  const st = (r: RequirementItem) => reqStatus(r, asks.asked);
  const looseQuestions = asks.questions.filter(({ req }) => !req);
  return <div className="wrap">
    <section className="quote" aria-label="客户原话">
      {onOpenThread && (pkg.interviewTurns?.length ?? 0) > 0 && <div className="quote-top">
        <span className="crumb">客户原话</span>
        <button type="button" className="ghost thread-return" onClick={onOpenThread}><MessageSquareText size={14} />解析对话</button>
      </div>}
      {customerParagraphs.map((p, i) => <p key={i}>“{highlightParagraph(p, requirements).map((seg, j) => {
        const req = requirements.find(r => r.index === seg.reqIndex);
        if (!req) return <Fragment key={j}>{seg.text}</Fragment>;
        return <span className={`q ${st(req) === "待追问" ? "w" : ""} ${hovered === req.index ? "linked" : ""}`} key={j}
          onMouseEnter={() => setHovered(req.index)} onMouseLeave={() => setHovered(null)}>{seg.text}<sup>{req.index}</sup></span>;
      })}”</p>)}
      <InterviewComposer kind="record" draftKey={"order:" + pkg.ledger.ledgerNo} savedPhotos={pkg.photos} text={draftInput}
        onText={onDraftInputChange} onSubmit={onSubmitAppend} busy={isLoading} />
    </section>
    <div className="s1-quickbar no-print">
      <div className="s1-quickbar-stats">
        <span>已拆解 <b>{requirements.length}</b> 条需求</span>
        <span className="chip j">已落实 {requirements.filter(r => st(r) === "已落实").length}</span>
        {asks.count > 0 && (
          <button
            type="button"
            className="chip w chip-btn"
            title="定位到需求清单"
            onClick={() => document.getElementById("s1-reqs-heading")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            待追问 {asks.count}
          </button>
        )}
      </div>
      <div className="s1-quickbar-actions">
        <button type="button" className="ghost" onClick={onGoToDirections}>跳过追问，先看方向<ArrowRight size={14} /></button>
      </div>
    </div>
    <PhotoGallery photos={pkg.photos} />
    <div className="sec-h"><h2 className="h2">六维解构</h2><span className="meta">点击编号可定位对应需求</span></div>
    <div className="dims">{dimensionEvidence(pkg).map(d => {
      const pending = d.sources.some(r => st(r) === "待追问");
      return <article className={`dim ${pending ? "w" : ""}`} key={d.key}>
        <div className="k"><span className="dim-label">{d.label}</span><em>{pending && <b className="chip w dim-pending">待追问</b>}{d.sources.map(r => <a key={r.id} href={`#req-${r.id}`} title={r.rawPhrase}
          onClick={e => { e.preventDefault(); document.getElementById(`req-${r.id}`)?.scrollIntoView({ block: "center" }); }}><span>{number(r.index)}</span></a>)}</em></div>
        <div className="v">{d.analysis}</div>
      </article>;
    })}</div>
    <div className="sec-h"><h2 className="h2">审美与顾虑</h2><span className="meta">核心关注点</span></div>
    <div className="emo">{emotions.map(e => <article className="em" key={e.quote}><div className="n">{e.title}</div><div className="from">“{e.quote}”</div></article>)}</div>
    {!emotions.length && <p className="empty panel">暂未提取到明确审美偏好</p>}
    <div className="sec-h" id="s1-reqs-heading"><h2 className="h2">需求清单</h2><div className="meta">
      {statusOrder.map(s => <span key={s} className={`chip ${tone(s)}`}>{s} {s === "待追问" ? asks.count : requirements.filter(r => st(r) === s).length}</span>)}
      {unhandled.length > 0 && <span className="chip w">漏句 {unhandled.length}</span>}
    </div></div>
    <div className="panel reqs" aria-busy={isLoading}>{requirements.map(r => <div key={r.id} id={`req-${r.id}`}
      className={`req ${hovered === r.index ? "linked" : ""}`} onMouseEnter={() => setHovered(r.index)} onMouseLeave={() => setHovered(null)}>
      <span className="no">Nº {number(r.index)}</span><span className="said">{r.rawPhrase}</span>
      <div className="how">{edit?.id === r.id
        ? <form onSubmit={e => { e.preventDefault(); if (edit.text.trim()) onEditRequirement(r.id, { solutionAction: edit.text.trim() }); setEdit(null); }}>
            <input autoFocus aria-label="落实做法" value={edit.text} onChange={e => setEdit({ id: r.id, text: e.target.value })} />
            <div className="opts"><button className="opt opt-primary">保存</button><button className="opt" type="button" onClick={() => setEdit(null)}>取消</button></div></form>
        : <button className="how-edit-btn" title="点击修改落实做法" onClick={() => setEdit({ id: r.id, text: r.solutionAction })}>
            <span>{r.solutionAction}</span>
            <Pencil size={12} className="how-edit-ico" aria-hidden="true" />
          </button>}
        <span className="ref">{r.ruleOrAssetId && <button onClick={() => onInspectAsset(r.ruleOrAssetId!)}>{r.ruleOrAssetId}</button>}
          {r.needsMasterApproval && " · 待制版师核准"}</span></div>
      <button className={`chip ${tone(st(r))}`} title="切换需求状态" onClick={() => onEditRequirement(r.id, { status: statusOrder[(statusOrder.indexOf(st(r)) + 1) % statusOrder.length] })}>{st(r)}</button>
    </div>)}
    {looseQuestions.map(({ question: q }) => <div className="req" key={q.id}><span className="no">—</span><span className="said">{q.question}</span>
      <span className="how">{q.whyItMatters}</span><span className="chip w">待追问</span></div>)}
    {unhandled.map(c => <div className="req" key={c.clauseIndex}><span className="no">—</span><span className="said">{c.clauseText}</span>
      <span className="how">请继续记录或手工补记做法</span><span className="chip w">未处理</span></div>)}</div>
    {adding ? <form className="manual" onSubmit={e => {
      e.preventDefault(); if (!said.trim() || !how.trim()) return;
      onAddManualRequirement(said.trim(), how.trim()); setSaid(""); setHow(""); setAdding(false);
    }}>
      <input aria-label="补记原话" placeholder="客户原话" value={said} onChange={e => setSaid(e.target.value)} required />
      <input aria-label="补记做法" placeholder="落实做法" value={how} onChange={e => setHow(e.target.value)} required />
      <button className="opt">添加</button><button className="ghost" type="button" onClick={() => setAdding(false)}>取消</button>
    </form> : <button className="ghost add-req" onClick={() => setAdding(true)}>＋ 补记需求</button>}
    <div className="next">
      {asks.count > 0 && <span className="next-hint">还有 {asks.count} 项待追问（可先看方向）</span>}
      <button className="btn" onClick={onGoToDirections}>查看设计方向<ArrowRight /></button>
    </div>
  </div>;
}
