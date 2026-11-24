import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { BusinessMode, LiangYiPlanPackage } from "@/lib/types";
import { clientSummary, matchesClient, profileDetails, type ClientProfile, type ProfileItem } from "@/lib/workbench-clients";
import { currentDirection, ledgerStatus, modeLabel, orderStep, type FlowStep } from "@/lib/workbench-orders";
import { shortTime } from "@/lib/workbench-time";
import { PhotoGallery } from "./InterviewPhotos";

function ProfileCard({ title, items }: { title: string; items: ProfileItem[] }) {
  const entry = (i: ProfileItem) => <li key={i.text}>{i.text}<em>{i.note}</em></li>;
  return <section className="ccard"><h4>{title}</h4>{items.length ? <ul>{items.slice(0, 3).map(entry)}</ul> : <p>暂无记录</p>}
    {items.length > 3 && <details><summary>展开其余 {items.length - 3} 项</summary>
      <ul>{items.slice(3).map(entry)}</ul></details>}</section>;
}

interface Props {
  clients: ClientProfile[];
  onOrder: (order: LiangYiPlanPackage, step: FlowStep) => void;
  onInterview: (client: ClientProfile, mode: BusinessMode) => void;
}

export default function ClientsPage({ clients, onOrder, onInterview }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const visible = clients.filter(c => matchesClient(c, query));
  const client = visible.find(c => c.key === selected) ?? visible[0];
  const detail = client && profileDetails(client);
  return <>
    <header className="mhead"><div><span className="crumb">客户资料与偏好</span><h1>客户档案</h1></div>
      <label className="search client-search"><Search /><input type="search" aria-label="搜索客户或原话" placeholder="搜索客户或原话"
        value={query} onChange={e => setQuery(e.target.value)} /></label></header>
    <div className="wrap">{client && detail ? <div className="cgrid"><div className="panel clist" aria-label="客户列表">
      {visible.map(c => <button key={c.key} className={"crow" + (c === client ? " on" : "")} aria-pressed={c === client}
        title={c.name} onClick={() => setSelected(c.key)}><i className="av">{Array.from(c.name)[0]}</i>
        <span><b>{c.name}</b><span>{clientSummary(c)}</span></span></button>)}</div>
      <div className="client-detail" key={client.key}><header className="panel chead"><span className="cav">{Array.from(client.name)[0]}</span>
        <div><h2>{client.name}</h2><div className="tags">{[...new Set(client.orders.map(p => modeLabel(p.mode))), ...detail.tags].map(t =>
          <span className="chip" key={t}>{t}</span>)}<span className="chip o">最近面谈 {shortTime(client.latestAt)}</span></div></div>
        <button className="btn-soft" onClick={() => onInterview(client, client.orders[0].mode)}><Plus />新建面谈</button></header>
        <div className="cards2"><ProfileCard title="体型与量体" items={detail.body} />
          <ProfileCard title="审美偏好" items={detail.preferences} /><ProfileCard title="明确禁忌" items={detail.avoid} /></div>
        <PhotoGallery photos={detail.photos} />
        <section className="panel corders" aria-label="历次订单">{client.orders.map(pkg => {
          const dir = currentDirection(pkg), status = ledgerStatus(pkg);
          return <div className="corow" key={pkg.ledger.ledgerNo}><span>{dir && <img src={dir.referenceImageUrl} alt="" />}</span>
            <span className="t">{dir?.title || pkg.proposal.proposalTitle}</span><span className="num">{pkg.ledger.ledgerNo}</span>
            <span><span className={"chip " + (status === "已上报" ? "j" : status === "待上报" ? "w" : "")}>
              {status === "待上报" ? pkg.ledger.reviewStatus : status}</span></span>
            <button className="ghost" onClick={() => onOrder(pkg, status === "已上报" ? 3 : orderStep(pkg))}>打开</button></div>;
        })}</section><p className="cnote">汇总自历次面谈，量体数据以制版师实测为准</p>
      </div></div> : <p className="empty panel">{query ? "未找到匹配的客户" : "完成面谈后将自动归档客户资料"}</p>}</div>
  </>;
}
