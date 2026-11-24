import { Fragment, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { LiangYiPlanPackage } from "@/lib/types";
import { comparePlans, planVersions } from "@/lib/workbench-versions";
import { shortTime } from "@/lib/workbench-time";

export default function VersionComparison({ pkg, busy, onBack, onRestore }: {
  pkg: LiangYiPlanPackage; busy: boolean; onBack: () => void; onRestore: (number: number) => void;
}) {
  const versions = planVersions(pkg);
  const current = versions[versions.length - 1];
  const [pair, setPair] = useState<[number, number?]>([versions[0].number]);
  const [anchor, setAnchor] = useState<number>();
  const [all, setAll] = useState(false);
  const [notice, setNotice] = useState("");
  const old = versions.find(v => v.number === pair[0]) ?? versions[0];
  const next = versions.find(v => v.number === pair[1]) ?? current;
  const rows = comparePlans(old.snapshot, next.snapshot).filter(row => all || row.changed);
  const canRestore = !busy && old.number !== current.number && comparePlans(old.snapshot, current.snapshot).some(row => row.changed);

  function select(number: number) {
    setNotice("");
    if (anchor !== undefined && anchor !== number && versions.some(v => v.number === anchor)) {
      setPair([Math.min(anchor, number), Math.max(anchor, number)]);
      setAnchor(undefined);
    } else {
      setPair([number === current.number ? old.number : number]);
      setAnchor(number);
    }
  }
  function restore() {
    if (!canRestore || !window.confirm("确定将当前方案恢复到 v" + old.number + "？此次恢复会记入台账并生成新版本。")) return;
    onRestore(old.number);
    setPair([current.number]); setAnchor(undefined); setNotice("已恢复到 v" + old.number + "，已记入台账。");
  }
  return <div className="wrap">
    <div className="s3bar">
      <button className="ghost" onClick={onBack}><ArrowLeft />返回设计单</button>
      <span className="vcompare-hint">点击下方任意两个版本切换对比区间（当前对比：v{old.number} → v{next.number}）</span>
    </div>
    <div className="vline" role="group" aria-label="依次选择两个版本进行对比">{versions.map((v, i) => <Fragment key={v.number}>
      {i > 0 && <span className="ar" aria-hidden="true">›</span>}
      <button className={"vchip" + (v === next ? " b" : v === old ? " a" : "")} onClick={() => select(v.number)}
        aria-pressed={v === old || v === next} title={"选择 v" + v.number + " 参与对比"}>
        <b>v{v.number}</b>
        {v === old && <span className="vtag">基准</span>}
        {v === next && <span className="vtag">对比</span>}
        <span>{shortTime(v.at)} · {v.action}{v === current && " · 最新"}</span>
      </button>
    </Fragment>)}</div>
    <div className="panel vtable" role="table" aria-label="方案字段对比">
      <div className="vrow h" role="row">
        <span role="columnheader">字段</span>
        <span role="columnheader"><b>v{old.number}</b>基准 · {shortTime(old.at)}</span>
        <span role="columnheader"><b>v{next.number}</b>{next === current ? "对比 · 最新" : `对比 · ${shortTime(next.at)}`}</span>
      </div>
      {rows.map(row => {
        const origin = next.origins[row.key] ?? next;
        const askChanges = row.key === "asks" ? versions.filter(v =>
          v.number > old.number && v.number <= next.number && v.origins.asks?.number === v.number) : [];
        const sources = askChanges.length ? askChanges : [origin];
        return <div className={"vrow " + (row.changed ? "chg" : "same")} role="row" key={row.key}>
          <span role="rowheader" className="k">{row.label}</span><span role="cell" className="old">{row.old}</span>
          <span role="cell" className="new">{row.changed ? <>{row.value}<small className="why">{sources.map(v =>
            "v" + v.number + " · " + v.action).join("；")}</small></> : "—"}</span></div>;
      })}
      {!rows.length && <p className="empty">{versions.length === 1 ? "暂无历史版本" : "所选版本间无字段变更"}</p>}
    </div><div className="vfoot"><span className="tg">{["只看改动", "全部字段"].map((label, i) =>
      <button key={label} aria-pressed={all === !!i} className={all === !!i ? "on" : ""} onClick={() => setAll(!!i)}>{label}</button>)}</span>
      <button className="ghost danger" onClick={restore} disabled={!canRestore}><RotateCcw />恢复到 v{old.number}</button></div>
    {notice && <p role="status" className="input-notice">{notice}</p>}
  </div>;
}
