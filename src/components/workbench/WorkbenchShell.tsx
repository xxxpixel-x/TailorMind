import { ArrowLeft, BookOpen, Check, House, Layers, MessageSquareText, PanelLeft, PanelRightClose, PanelRightOpen, Plus, Settings, UsersRound, X } from "lucide-react";
import type { LiangYiPlanPackage } from "@/lib/types";
import { ASSET_CATALOG } from "@/lib/asset-catalog";
import { isOngoing, modeLabel, orderShortCode, orderStep, orderTitle, pendingAsks, pendingTodoCount, STEPS, stepStatus,
  type FlowStep, type WorkbenchView } from "@/lib/workbench-orders";

interface SidebarProps {
  view: WorkbenchView;
  step: FlowStep;
  compare?: boolean;
  orders: LiangYiPlanPackage[];
  clientCount: number;
  current: LiangYiPlanPackage;
  collapsed: boolean;
  onCollapse: () => void;
  onDismiss: () => void;
  onView: (v: WorkbenchView) => void;
  onOrder: (pkg: LiangYiPlanPackage, step: FlowStep) => void;
  onSettings: () => void;
  interview?: { time: string; orderNo?: string; running: boolean; failed?: boolean };
}

function compactOrderStatus(raw: string) {
  return raw.replace("已复核·待打样", "待打样").replace("意向已确认", "已确认");
}

export function Sidebar({ view, step, compare, orders, clientCount, current, collapsed, onCollapse, onDismiss, onView, onOrder, onSettings, interview }: SidebarProps) {
  const todos = pendingTodoCount(orders);
  const links = [
    { id: "home", label: "工作台", icon: House, count: todos || undefined, alert: todos > 0 },
    { id: "clients", label: "客户档案", icon: UsersRound, count: clientCount },
    { id: "ledger", label: "台账", icon: BookOpen, count: orders.length },
    { id: "assets", label: "资产库", icon: Layers, count: ASSET_CATALOG.length, tip: `资产库（${ASSET_CATALOG.length} 项静态资产 · 含工艺知识图谱）` },
  ] as const;
  const visibleOrders = orders.filter(p => (isOngoing(p) || (view === "order" && p === current)) &&
    !((interview?.running || interview?.failed) && p.ledger.ledgerNo === interview.orderNo));
  const titleCounts = new Map<string, number>();
  for (const p of visibleOrders) {
    const t = orderTitle(p);
    titleCounts.set(t, (titleCounts.get(t) || 0) + 1);
  }
  return <aside className="side no-print" aria-label="侧栏">
    <div className="brand">
      <button className="brand-name" onClick={() => onView("home")} aria-label="衣语 TailorMind 工作台"><b>衣语</b><i>TailorMind</i></button>
      <button className="ico collapse-toggle" onClick={onCollapse} title={collapsed ? "展开侧栏 ([)" : "收起侧栏 ([)"} aria-label={collapsed ? "展开侧栏" : "收起侧栏"}><PanelLeft /></button>
      <button className="ico mobile-close" aria-label="关闭导航" onClick={onDismiss}><X /></button>
    </div>
    <button className={`newbtn ${view === "new" ? "on" : ""}`} title="新建面谈 (快捷键 N)" aria-label="新建面谈" onClick={() => onView("new")}><Plus /><span>新建面谈</span><kbd>N</kbd></button>
    <nav className="nav" aria-label="工作台导航">
      <div className="nav-group">
        {links.map(link => <button key={link.id} className={`ni ${view === link.id ? "on" : ""}`}
          onClick={() => onView(link.id)} title={"tip" in link ? link.tip : link.count !== undefined ? `${link.label} (${link.count})` : link.label}
          aria-label={link.label} aria-current={view === link.id ? "page" : undefined}>
          <link.icon /><span>{link.label}</span>
          {link.count !== undefined && <span className={`c ${"alert" in link && link.alert ? "w" : ""}`}>{link.count}</span>}
        </button>)}
      </div>
      <div className="gh">进行中的订单<span>{visibleOrders.length}</span></div>
      {interview && (interview.running || interview.failed) && <div className={"ow" + (view === "new-run" ? " active" : "")}>
        <button className="order" onClick={() => onView("new-run")} title={"新面谈 · " + interview.time}>
          <span className="compact-order">新<i className="compact-dot" /></span><span className="t">新面谈 · {interview.time}</span>
          <span className="s w"><i className="d" />{interview.failed ? "解析未完成" : "衣语解析中…"}</span></button></div>}
      {visibleOrders.map(pkg => {
        const active = view === "order" && pkg === current;
        const threadActive = view === "new-run" && interview?.orderNo === pkg.ledger.ledgerNo;
        const next = orderStep(pkg);
        const warning = pendingAsks(pkg).count > 0;
        const baseTitle = orderTitle(pkg);
        const duplicated = (titleCounts.get(baseTitle) || 0) > 1;
        const shortCode = orderShortCode(pkg);
        const statuses = [stepStatus(pkg, next)];
        if (warning && next !== 1) statuses.unshift(stepStatus(pkg, 1));
        if (next === 1 && pkg.ledger.directionConfirmed) statuses.push(stepStatus(pkg, 3));
        const compactStatuses = statuses.map(compactOrderStatus);
        const tooltip = `${baseTitle} (${pkg.ledger.ledgerNo}) · ${statuses.join(" · ")}`;
        return <div className={`ow ${active || threadActive ? "active" : ""}`} key={pkg.ledger.ledgerNo}>
          <button className="order" onClick={() => onOrder(pkg, active ? step : next)} title={tooltip}>
            <span className="compact-order">
              {duplicated ? shortCode.slice(-2) : baseTitle.slice(0, 1)}
              {warning && <i className="compact-dot" />}
            </span>
            <span className="t-row"><span className="t">{baseTitle}</span>{duplicated && <em className="order-code">{shortCode}</em>}</span>
            <span className={`s ${warning ? "w" : ""}`}>{warning && <i className="d" />}
              <span className="s-text">{compactStatuses.join(" · ")}</span>
            </span>
          </button>
          {active && <div className="steps">{STEPS.map(s => <button key={s.step} aria-current={s.step === step && !compare ? "step" : undefined}
            onClick={() => onOrder(pkg, s.step)} className={`step ${s.step < next ? "done" : ""} ${s.step === step ? "on" : ""}`}>
            <span className="step-label">{s.label}</span>
            <span className={`st ${(s.step === 1 && warning) || (s.step === 3 && stepStatus(pkg, 3) === "待审核") ? "w" : ""}`}>
              {s.step === 3 && compare ? "版本对比" : compactOrderStatus(stepStatus(pkg, s.step))}</span>
          </button>)}</div>}
        </div>;
      })}
    </nav>
    <div className="foot">
      <button className={"ni set-nav" + (view === "settings" ? " on" : "")} title="系统设置与能力边界" aria-label="设置"
        aria-current={view === "settings" ? "page" : undefined} onClick={onSettings}>
        <Settings /><span>设置</span>
      </button>
      <div className="who" title="严顾问 · 海派定制中心"><i className="av">严</i><span>严顾问<em>海派定制中心</em></span></div>
    </div>
  </aside>;
}

export function OrderHeader({ pkg, step, compare, backLabel, onBack, onStep, agentOpen, onToggleAgent }: {
  pkg: LiangYiPlanPackage;
  step: FlowStep;
  compare?: boolean;
  backLabel?: string;
  onBack?: () => void;
  onStep: (s: FlowStep) => void;
  agentOpen?: boolean;
  onToggleAgent?: () => void;
}) {
  const askCount = pendingAsks(pkg).count;
  return (
    <header className="mhead order-mhead no-print">
      <div className="order-head-left">
        <div className="order-crumb-bar">
          {backLabel && onBack && (
            <button className="crumb-back" onClick={onBack} title={`返回${backLabel}`}>
              <ArrowLeft size={13} />{backLabel}
            </button>
          )}
          <strong className="order-head-title" title={orderTitle(pkg)}>{orderTitle(pkg)}</strong>
          <span className="order-head-meta">
            <span>{orderShortCode(pkg)}</span>
            <span aria-hidden="true">·</span>
            <span>{modeLabel(pkg.mode)}</span>
          </span>
          {compare && <span className="chip k">版本对比</span>}
        </div>
      </div>

      <nav className="flow-track flow-track-inline" aria-label="订单三步流程">
        {STEPS.map((s, idx) => {
          const isCurrent = step === s.step;
          const isDone = (s.step === 1 && askCount === 0 && step > 1) || (s.step === 2 && pkg.ledger.directionConfirmed && !isCurrent) || (s.step < step && s.step !== 1);
          return <div key={s.step} style={{ display: "contents" }}>
            <button
              type="button"
              className={`flow-step ${isCurrent ? "on" : ""} ${isDone && !isCurrent ? "done" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
              title={`切换到 0${s.step} ${s.label} (快捷键 ${s.step})`}
              onClick={() => onStep(s.step)}
            >
              <em>{isDone && !isCurrent ? <Check size={12} /> : `0${s.step}`}</em>
              <span>{s.label}</span>
              {s.step === 1 && askCount > 0 && <i className="w" title={`${askCount} 项待追问`} />}
            </button>
            {idx < STEPS.length - 1 && <span className={`flow-line ${s.step < step ? "done" : ""}`} aria-hidden="true" />}
          </div>;
        })}
      </nav>

      <div className="order-meta-right">
        {onToggleAgent && (
          <button
            type="button"
            className={`agent-toggle-btn ${agentOpen ? "on" : ""}`}
            aria-pressed={agentOpen}
            title={agentOpen ? "收起衣语助手面板 (快捷键 \\)" : "展开衣语助手面板 (快捷键 \\)"}
            onClick={onToggleAgent}
          >
            {agentOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            <MessageSquareText size={14} className="agent-toggle-mobile-ico" />
            <span>衣语助手</span>
            {askCount > 0 && <em className="agent-toggle-badge">{askCount}</em>}
          </button>
        )}
      </div>
    </header>
  );
}
