import { Fragment, useState } from "react";
import { ChevronDown, Download, Search } from "lucide-react";
import type { BusinessLedger, BusinessMode, LiangYiPlanPackage } from "@/lib/types";
import { exportLedgerRegisterXlsx } from "@/lib/export-ledger";
import { currentDirection, ledgerStatus, modeLabel, orderStep, orderTitle, type FlowStep } from "@/lib/workbench-orders";
import Tab5Ledger from "@/components/studio/Tab5Ledger";

const filters = ["全部", "待上报", "进行中", "已上报"] as const;
interface Props {
  orders: LiangYiPlanPackage[];
  onReport: (pkg: LiangYiPlanPackage) => void;
  onOrder: (pkg: LiangYiPlanPackage, step: FlowStep) => void;
  onEdit: (pkg: LiangYiPlanPackage, patch: Partial<BusinessLedger>, action?: string) => void;
}

export default function LedgerPage({ orders, onReport, onOrder, onEdit }: Props) {
  const [filter, setFilter] = useState<typeof filters[number]>("全部");
  const [modeFilter, setModeFilter] = useState<BusinessMode | "all">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(orders[0]?.ledger.ledgerNo || null);
  const [editing, setEditing] = useState<string | null>(null);
  const count = (f: typeof filter) => f === "全部" ? orders.length : orders.filter(p => ledgerStatus(p) === f).length;
  const term = query.trim().toLowerCase();
  const visible = orders.filter(p =>
    (filter === "全部" || ledgerStatus(p) === filter) &&
    (modeFilter === "all" || p.mode === modeFilter) &&
    (!term || [p.ledger.ledgerNo, p.ledger.projectName, p.ledger.clientOrOrgName, orderTitle(p)].join(" ").toLowerCase().includes(term))
  );
  const stats = [
    { label: "全部台账", n: orders.length, active: filter === "全部" && modeFilter === "all", onClick: () => { setFilter("全部"); setModeFilter("all"); } },
    { label: "海派私定", n: orders.filter(p => p.mode === "bespoke").length, active: modeFilter === "bespoke", onClick: () => setModeFilter(m => m === "bespoke" ? "all" : "bespoke") },
    { label: "团体职业服", n: orders.filter(p => p.mode === "uniform").length, active: modeFilter === "uniform", onClick: () => setModeFilter(m => m === "uniform" ? "all" : "uniform") },
    { label: "待上报审核", n: count("待上报"), active: filter === "待上报", warn: true, onClick: () => { setFilter(f => f === "待上报" ? "全部" : "待上报"); setModeFilter("all"); } },
  ];
  return <>
    <header className="mhead"><div><span className="crumb">业务台账</span><h1>台账</h1></div>
      <div className="r"><nav className="seg" aria-label="台账筛选">{filters.map(f => <button key={f} className={filter === f ? "on" : ""}
        aria-pressed={filter === f} onClick={() => setFilter(f)}>{f} <span className="num">{count(f)}</span></button>)}</nav>
        <button className="btn-soft" disabled={!visible.length} onClick={() => exportLedgerRegisterXlsx(visible)}><Download />导出 Excel</button></div>
    </header>
    <div className="wrap"><div className="lfigs">{stats.map(s => <button type="button" className={`lf lf-btn ${s.active ? "on" : ""}`}
      aria-pressed={s.active} key={s.label} onClick={s.onClick}><b className={s.warn ? "w" : ""}>{s.n}</b><span>{s.label}</span></button>)}</div>
      <div className="sec-h ledger-heading">
        <div className="ledger-title-group">
          <h2 className="h2">{filter}{modeFilter === "all" ? "" : " · " + modeLabel(modeFilter)}台账</h2>
          {(filter !== "全部" || modeFilter !== "all" || query) && (
            <button type="button" className="more" onClick={() => { setFilter("全部"); setModeFilter("all"); setQuery(""); }}>清除筛选</button>
          )}
        </div>
        <label className="search ledger-search"><Search /><input type="search" aria-label="搜索台账" placeholder="搜索单号、项目或客户"
          value={query} onChange={e => setQuery(e.target.value)} /></label>
      </div>
      <div className="panel ltable" role="table" aria-label="业务台账">
        <div className="lrow h" role="row">{["", "项目", "台账号", "类型", "方向", "状态", "操作"].map((h, i) => <span role="columnheader" key={i}>{h}</span>)}</div>
        {visible.map(pkg => {
          const l = pkg.ledger, id = l.ledgerNo;
          const status = ledgerStatus(pkg);
          const open = expanded === id;
          const dir = currentDirection(pkg);
          const display = status !== "待上报" ? status : l.reviewStatus === "已复核·待打样" ? "已复核 · 待上报" : l.reviewStatus;
          return <div className={`lrow ${open ? "open" : ""}`} key={id} role="row">
            <span role="cell">{dir && <img src={dir.referenceImageUrl} alt="" />}</span>
            <span role="cell"><button className="t trail-toggle" aria-expanded={open} title="展开或收起操作留痕" onClick={() => setExpanded(open ? null : id)}>{l.projectName === pkg.proposal.proposalTitle ? orderTitle(pkg) : l.projectName}<ChevronDown size={12} /></button></span>
            <span className="no" role="cell">{id}</span><span role="cell">{modeLabel(pkg.mode)}</span>
            <span role="cell">{l.directionConfirmed ? dir?.tag : "待选择"}</span>
            <span role="cell"><span className={`chip ${status === "已上报" ? "j" : status === "待上报" ? "w" : ""}`}>{display}</span></span>
            <span className="act" role="cell">
              <button className="lk" onClick={() => onOrder(pkg, status === "已上报" ? 3 : orderStep(pkg))}>{status === "已上报" ? "查看" : "打开"}</button>
              {status === "待上报" && <button className="go" onClick={() => { onReport(pkg); setExpanded(id); }}>上报审核</button>}
            </span>
            {open && <div className="trail" role="cell" aria-label="操作留痕">{l.auditLogs.map((log, index) => <Fragment key={log.id}>
              {index > 0 && <span className="ar" aria-hidden="true">›</span>}
              <span className={`chip ${log.action === "上报审核" ? "j" : "o"}`} title={log.detail}>
                {log.timestamp} · {log.actor} · {log.action}</span>
            </Fragment>)}<div className="trail-actions"><button onClick={() => onOrder(pkg, 3)}>打开设计单</button>
              <button aria-expanded={editing === id} onClick={() => setEditing(editing === id ? null : id)}>{editing === id ? "收起资料" : "编辑资料与导出"}</button></div>
              {editing === id && <div className="ledger-detail"><Tab5Ledger pkg={pkg} onUpdateLedger={(patch, action) => onEdit(pkg, patch, action)} /></div>}
            </div>}
          </div>;
        })}
        {!visible.length && <p className="empty">当前没有符合条件的台账。{(filter !== "全部" || modeFilter !== "all" || query) &&
          <button className="ghost" onClick={() => { setFilter("全部"); setModeFilter("all"); setQuery(""); }}>重置筛选</button>}</p>}
      </div>
    </div>
  </>;
}
