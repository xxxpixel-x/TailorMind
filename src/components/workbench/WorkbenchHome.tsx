import { useEffect, useState } from "react";
import { ArrowRight, ArrowUp, ChevronRight, Mic, Plus } from "lucide-react";
import type { FollowUpQuestion, LiangYiPlanPackage } from "@/lib/types";
import { currentDirection, isOngoing, ledgerStatus, modeLabel, orderShortCode, orderStep, orderTitle, pendingAsks, questionSource,
  referenceCounts, STEPS, stepStatus, type AnswerQuestion, type FlowStep } from "@/lib/workbench-orders";

interface Props {
  orders: LiangYiPlanPackage[];
  busy: boolean;
  onNew: () => void;
  onQuickStart: (text: string) => void;
  onLedger: () => void;
  onAssets: () => void;
  onOrder: (pkg: LiangYiPlanPackage, step: FlowStep) => void;
  onAnswer: AnswerQuestion;
}

interface Todo {
  pkg: LiangYiPlanPackage;
  label: string;
  title: string;
  question?: FollowUpQuestion;
  reqIndex?: number;
  step: FlowStep;
}

function inbox(orders: LiangYiPlanPackage[]) {
  const questions: Todo[] = orders.flatMap(pkg => {
    const asks = pendingAsks(pkg);
    return [
      ...asks.questions.map(({ question }) => ({ pkg, label: "待追问", title: question.question, question, step: 1 as const })),
      ...asks.reqs.map(r => ({ pkg, label: "待追问", title: r.rawPhrase, reqIndex: r.index, step: 1 as const })),
    ];
  });
  const decisions: Todo[] = orders.flatMap((pkg): Todo[] => {
    if (ledgerStatus(pkg) === "已上报") return [];
    if (!pkg.ledger.directionConfirmed) return [{ pkg, label: "待选方向", title: "尚未选定设计方向", step: 2 }];
    if (pkg.ledger.reviewStatus === "待审核") return [{ pkg, label: "待审核", title: "待审核设计单", step: 3 }];
    return [];
  });
  return [...questions.slice(0, 2), ...decisions, ...questions.slice(2)];
}

export default function WorkbenchHome({ orders, busy, onNew, onQuickStart, onLedger, onAssets, onOrder, onAnswer }: Props) {
  const [now, setNow] = useState<Date>();
  const [showAll, setShowAll] = useState(false);
  const [quickInput, setQuickInput] = useState("");
  useEffect(() => { setNow(new Date()); }, []);
  const open = orders.filter(isOngoing);
  const todos = inbox(open);
  const archiveCount = orders.filter(p => p.ledger.archivedAt).length;
  const references = Array.from(referenceCounts(orders).values()).reduce((sum, n) => sum + n, 0);
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 11 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const submitQuick = () => {
    const clean = quickInput.trim();
    if (!clean || busy) return;
    setQuickInput("");
    onQuickStart(clean);
  };
  return <div className="wrap">
    <div className="hello"><div className="date">{now && `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 周${"日一二三四五六"[now.getDay()]}`}</div>
      <h1>{greeting}，严顾问</h1><p>{open.length} 笔进行中 · {todos.length} 项待确认</p>
    </div>
    <form className="quick quick-form" onSubmit={e => { e.preventDefault(); submitQuick(); }}>
      <input
        aria-label="快速输入客户原话开始面谈"
        placeholder="直接输入客户原话（如：婚礼母亲酒红外套、遮手臂、不老气），回车即可开始…"
        value={quickInput}
        disabled={busy}
        maxLength={500}
        onChange={e => setQuickInput(e.target.value)}
      />
      <button type="button" className="quick-full-btn" title="进入完整新建面谈（含录音、照片与案例模板）" onClick={onNew}>
        <Mic size={14} /><span>完整录入</span>
      </button>
      <button type="submit" className={`send ${!quickInput.trim() || busy ? "off" : ""}`} disabled={!quickInput.trim() || busy} aria-label="开始新面谈">
        <ArrowUp />
      </button>
    </form>
    <div className="figs" role="navigation" aria-label="快捷总览">
      <button type="button" className="fig fig-btn" onClick={() => scrollTo("home-orders")}><b>{open.length}</b>进行中</button>
      <button type="button" className="fig fig-btn w" onClick={() => scrollTo("home-todos")}><b>{todos.length}</b>待确认</button>
      <button type="button" className="fig fig-btn" onClick={onLedger}><b>{archiveCount}</b>已归档</button>
      <button type="button" className="fig fig-btn" onClick={onAssets}><b>{references}</b>资产引用</button>
    </div>
    <div className="sec-h" id="home-todos"><h2 className="h2">待确认</h2>
      <div className="meta">
        {busy && <span className="chip j">正在同步需求…</span>}
        {todos.length > 4 && <button className="more" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "收起" : `展开全部 ${todos.length} 项`}</button>}
      </div>
    </div>
    <div className="todos">{(showAll ? todos : todos.slice(0, 4)).map(item => {
      const { pkg, question } = item;
      const reqIndex = question ? questionSource(question, pkg.requirements)?.index : item.reqIndex;
      return <article className="todo" key={pkg.ledger.ledgerNo + (question?.id || item.reqIndex || item.label)}>
        <div className="top">
          <span className="todo-source">{orderTitle(pkg).split(" · ")[0]} · {reqIndex ? `需求 Nº ${String(reqIndex).padStart(2, "0")}` : pkg.ledger.ledgerNo}</span>
          <span className="todo-top-right">
            {question?.quickAnswers?.length ? <button className="todo-link" onClick={() => onOrder(pkg, item.step)}>查看订单<ChevronRight size={13} /></button> : null}
            <span className={`chip ${item.step === 2 ? "" : "w"}`}>{item.label}</span>
          </span>
        </div>
        <div className="qq">{item.title}</div>
        <div className="opts">{question?.quickAnswers?.length
          ? question.quickAnswers.map(a => <button className="opt" key={a} disabled={busy} onClick={() => onAnswer(pkg, question, a)}>{a}</button>)
          : <button className="opt opt-primary" onClick={() => onOrder(pkg, item.step)}>{item.step === 2 ? "去选方向" : item.step === 3 ? "查看设计单" : "查看面谈"}</button>}</div>
      </article>;
    })}</div>
    {!todos.length && <p className="empty panel">当前所有进行中订单均已确认，无待处理事项。</p>}
    <div className="sec-h" id="home-orders"><h2 className="h2">进行中的订单</h2>
      <div className="meta">
        <button className="ghost" onClick={onNew}><Plus size={14} />新建面谈</button>
        <button className="ghost" onClick={onLedger}>全部台账<ArrowRight size={14} /></button>
      </div>
    </div>
    <div className="orders">{open.map(pkg => {
      const step = orderStep(pkg);
      const dir = currentDirection(pkg);
      const warning = pendingAsks(pkg).count > 0;
      const baseTitle = orderTitle(pkg);
      const duplicated = open.filter(o => orderTitle(o) === baseTitle).length > 1;
      const statuses = [stepStatus(pkg, step)];
      if (warning && step !== 1) statuses.unshift(stepStatus(pkg, 1));
      if (step === 1 && pkg.ledger.directionConfirmed) statuses.push(stepStatus(pkg, 3));
      return <button className="oc" key={pkg.ledger.ledgerNo} onClick={() => onOrder(pkg, step)}>
        {dir?.referenceImageUrl && <img src={dir.referenceImageUrl} alt="" />}
        <span className="b"><span className="t">{baseTitle}{duplicated && <em className="order-code">{orderShortCode(pkg)}</em>}</span><span className="k">{modeLabel(pkg.mode)} · {STEPS[step - 1].label}</span>
          <span className="p" aria-label={`当前为第 ${step} 步`}>{STEPS.map(s => <i key={s.step} className={s.step <= step ? "on" : ""} />)}</span>
          <span className={`s ${warning ? "w" : ""}`}>{statuses.join(" · ")}</span></span>
      </button>;
    })}</div>
  </div>;
}
