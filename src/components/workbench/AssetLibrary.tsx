import { useMemo, useState } from "react";
import { ArrowUpRight, Download, Search } from "lucide-react";
import type { LiangYiPlanPackage } from "@/lib/types";
import { ASSET_CATALOG, ASSET_CATEGORIES, filterAssets, SCENE_FILTERS, STYLE_FILTERS, type AssetCategory } from "@/lib/asset-catalog";
import { CRAFT_KG_NODES } from "@/data/craft-knowledge-graph";
import { assetConflicts } from "@/lib/workbench-evidence";
import { orderShortCode, orderStep, orderTitle, referenceCounts, type FlowStep } from "@/lib/workbench-orders";
import { downloadCsv } from "@/lib/export-ledger";
import CraftKnowledgeGraphView from "./CraftKnowledgeGraphView";

type AssetLibraryTab = AssetCategory | "工艺知识图谱";

export default function AssetLibrary({ orders, pkg, onSelectOrder, onOpenOrder, onInspectAsset }: {
  orders: LiangYiPlanPackage[];
  pkg: LiangYiPlanPackage;
  onSelectOrder: (orderNo: string) => void;
  onOpenOrder: (order: LiangYiPlanPackage, step: FlowStep) => void;
  onInspectAsset: (id: string) => void;
}) {
  const [tab, setTab] = useState<AssetLibraryTab>(ASSET_CATEGORIES[0]);
  const [query, setQuery] = useState("");
  const [scene, setScene] = useState("全部");
  const [style, setStyle] = useState("全部");
  const counts = useMemo(() => referenceCounts(orders), [orders]);
  const isGraph = tab === "工艺知识图谱";
  const items = isGraph ? [] : filterAssets(tab, query, scene, style);
  function exportList() {
    if (isGraph) return;
    downloadCsv(`衣语_${tab}.csv`, [
      ["编号", "类别", "名称", "描述", "标签", "引用设计单数", "与当前订单的冲突"],
      ...items.map(a => [a.id, a.category, a.name, a.description, a.tags.join("、"), counts.get(a.id) || 0,
        assetConflicts(a, pkg).map(c => c.message).join(" ")]),
    ]);
  }
  return <>
    <header className="mhead assets-mhead"><div><span className="crumb">集团定制资产</span><h1>资产库</h1></div>
      <nav className="seg assets-seg" aria-label="资产分类">
        <button className={isGraph ? "on" : ""} aria-pressed={isGraph} onClick={() => setTab("工艺知识图谱")}>
          工艺图谱 <span className="num">{CRAFT_KG_NODES.length}</span>
        </button>
        {ASSET_CATEGORIES.map(c => <button className={tab === c ? "on" : ""} key={c}
          aria-pressed={tab === c} onClick={() => setTab(c)}>{c} <span className="num">{ASSET_CATALOG.filter(a => a.category === c).length}</span></button>)}
      </nav>
    </header>
    <div className={`wrap ${isGraph ? "wrap-wide" : ""}`}>
      <div className="asset-ctx">
        <span className="ctx-label">对照订单</span>
        <select className="ctx-select" aria-label="选择对照订单" value={pkg.ledger.ledgerNo} onChange={e => onSelectOrder(e.target.value)}>
          {orders.map(o => <option key={o.ledger.ledgerNo} value={o.ledger.ledgerNo}>
            {orderTitle(o)} ({orderShortCode(o)})
          </option>)}
        </select>
        <button type="button" className="ghost ctx-open" onClick={() => onOpenOrder(pkg, orderStep(pkg))}>返回订单<ArrowUpRight size={14} /></button>
      </div>
      {isGraph ? (
        <CraftKnowledgeGraphView pkg={pkg} onInspectAsset={onInspectAsset} />
      ) : (
        <>
          <div className="toolbar"><label className="search"><Search />
            <input type="search" aria-label="搜索资产" placeholder="搜索名称、编号或特征" value={query} onChange={e => setQuery(e.target.value)} /></label>
            <button className="btn-soft" onClick={exportList} disabled={!items.length}><Download />导出清单</button></div>
          <div className="filters">{[{ label: "场景", options: SCENE_FILTERS, value: scene, set: setScene }, { label: "风格", options: STYLE_FILTERS, value: style, set: setStyle }].map(group =>
            <div className="filter-group" role="group" aria-label={group.label} key={group.label}><span className="lb">{group.label}</span>
              {["全部", ...Object.keys(group.options)].map(v => <button className={`fchip ${v === group.value ? "on" : ""}`}
                aria-pressed={v === group.value} key={v} onClick={() => group.set(v)}>{v}</button>)}</div>)}</div>
          <div className="agrid">{items.map(a => {
            const conflicts = assetConflicts(a, pkg);
            return <button className="asset" key={a.id} onClick={() => onInspectAsset(a.id)}>
              <span className={`sw ${a.imageFit === "cover" ? "sw-cover" : a.imageFit === "diagram" ? "sw-diagram" : ""}`}
                style={a.image ? { backgroundImage: `url("${a.image}")` } : undefined}><span className="id">{a.id}</span></span>
              <span className="nm">{a.name}</span><span className="desc">{a.description}</span>
              <span className="tags">{a.tags.slice(0, 3).map(t => <span className="chip" key={t}>{t}</span>)}</span>
              <span className="use"><span><b>{counts.get(a.id) || 0}</b>单引用</span>
                {conflicts.length > 0 && <span className="warn" title={`${orderTitle(pkg)} · ${conflicts.map(c => c.message).join(" ")}`}>需核对 · {conflicts[0].property}</span>}</span>
            </button>;
          })}</div>
          {!items.length && <div className="empty panel">未找到符合条件的资产<button className="ghost" onClick={() => { setQuery(""); setScene("全部"); setStyle("全部"); }}>清除筛选</button></div>}
        </>
      )}
    </div>
  </>;
}
