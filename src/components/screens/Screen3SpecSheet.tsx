"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUp, BookOpen, Flame, History, Printer, Scissors, Send, ShieldAlert } from "lucide-react";
import type { BusinessLedger, DesignDirectionOption, EightFieldTranslation, LiangYiPlanPackage } from "@/lib/types";
import { exportProposalAndVisualPackMarkdown } from "@/lib/export-ledger";
import { buildPatternRoomTechPack } from "@/lib/tech-pack-builder";
import { currentDirection, ledgerStatus, pendingAsks, reqStatus } from "@/lib/workbench-orders";
import { resourceEvidence } from "@/lib/workbench-evidence";
import { planVersions } from "@/lib/workbench-versions";
import { PhotoGallery } from "@/components/workbench/InterviewPhotos";
import type { GarmentZoneId } from "@/components/modals/GarmentDetailInspectorModal";

interface Props {
  pkg: LiangYiPlanPackage;
  initialView?: "spec" | "techpack";
  onUpdateEightFields: (next: EightFieldTranslation) => void;
  onUpdateLedger: (patch: Partial<BusinessLedger>, action: string) => void;
  onConfirmDirection: () => void;
  onBackToDirections: () => void;
  onArchiveOrder: () => void;
  onReport: () => void;
  onInspectAsset: (id: string) => void;
  onInspectDetail: (dir: DesignDirectionOption, zone?: GarmentZoneId) => void;
  onOpenVisualPrompts: () => void;
  onCompare: () => void;
}

const reviewCycle: BusinessLedger["reviewStatus"][] = ["待审核", "已复核·待打样", "意向已确认"];
const sealText = { "待审核": "待审核", "已复核·待打样": "已复核", "意向已确认": "已确认" };

export default function Screen3SpecSheet({ pkg, initialView = "spec", onUpdateEightFields, onUpdateLedger, onConfirmDirection, onBackToDirections, onArchiveOrder, onReport,
  onInspectAsset, onInspectDetail, onOpenVisualPrompts, onCompare }: Props) {
  const { proposal, ledger, eightFields, requirements } = pkg;
  const { asked } = pendingAsks(pkg);
  const dir = currentDirection(pkg);
  const [draft, setDraft] = useState<EightFieldTranslation | null>(null);
  const [sheetView, setSheetView] = useState<"spec" | "techpack">(initialView);
  useEffect(() => { setSheetView(initialView); }, [initialView]);
  const [moreFields, setMoreFields] = useState(false);
  const [showReqs, setShowReqs] = useState(false);
  const [notice, setNotice] = useState("");
  const links = resourceEvidence(pkg);
  const versions = planVersions(pkg);
  const techPack = useMemo(() => buildPatternRoomTechPack(pkg, dir), [pkg, dir]);
  const groups = [...new Set(proposal.handoffItems.map(item => item.owner))];
  const alerts = proposal.feasibilityAlerts;
  const setReviewStatus = (next: BusinessLedger["reviewStatus"]) => {
    if (next === ledger.reviewStatus) return;
    onUpdateLedger({ reviewStatus: next }, `状态更新为${next}`);
  };
  const cycle = () => {
    const next = reviewCycle[(reviewCycle.indexOf(ledger.reviewStatus) + 1) % reviewCycle.length];
    setReviewStatus(next);
  };
  const fields: { key: keyof EightFieldTranslation; label: string; assetId?: string; zone?: GarmentZoneId; note?: string }[] = [
    { key: "structure", label: "版型结构", assetId: dir?.patternId, zone: "shoulder" },
    { key: "collar", label: "领型", zone: "collar", note: requirements.some(r => reqStatus(r, asked) === "待追问" && /旗袍|领/.test(r.rawPhrase)) ? "待追问" : undefined },
    { key: "fabric", label: "面料", assetId: dir?.fabricId, zone: "fabric" },
    { key: "patternCraft", label: "装饰纹样", assetId: dir?.craftId, zone: "craft" },
    { key: "category", label: "品类" }, { key: "color", label: "色彩" }, { key: "lengthRatio", label: "长度比例" },
    { key: "easeAllowance", label: "松弛余量", note: requirements.some(r => r.needsMasterApproval) ? "待制版师核准" : undefined },
  ];
  return <div className="wrap print-frame">
    {!ledger.directionConfirmed && <div className="guard-banner no-print" role="status">
      <div className="guard-copy"><b>尚未确认设计方向</b><span>当前按「{dir?.tag || "A"} · {dir?.title || proposal.proposalTitle}」预览，确认后可归档与上报</span></div>
      <div className="guard-actions">
        <button className="btn-soft" onClick={onConfirmDirection}>确认采用</button>
        <button className="ghost" onClick={onBackToDirections}>去选方向</button>
      </div>
    </div>}
    <div className="s3bar no-print">
      <div className="seg tp-seg" role="tablist" aria-label="单据视图切换">
        <button role="tab" aria-selected={sheetView === "spec"} className={sheetView === "spec" ? "on" : ""} onClick={() => setSheetView("spec")}>企划设计单</button>
        <button role="tab" aria-selected={sheetView === "techpack"} className={sheetView === "techpack" ? "on" : ""} onClick={() => setSheetView("techpack")}><Scissors size={13} />版房工艺单</button>
      </div>
      <button className="btn" onClick={() => { exportProposalAndVisualPackMarkdown(pkg); onUpdateLedger({}, "导出设计单与提示词发给设计师"); setNotice("设计单与提示词已导出为 Markdown。"); }}><Send />发给设计师</button>
      <button className="ghost" onClick={() => window.print()}><Printer />导出 PDF</button>
      <button className="ghost" disabled={!ledger.directionConfirmed} title={!ledger.directionConfirmed ? "请先确认设计方向" : "归档并导出单笔台账 Excel（含版房工艺单）"} onClick={() => { onArchiveOrder(); setNotice("已归档并导出单笔台账 Excel（含第 6 表版房工艺单）。"); }}><BookOpen />归档台账</button>
      <button className="ghost" disabled={ledgerStatus(pkg) !== "待上报"} title={!ledger.directionConfirmed ? "请先确认设计方向" : ledger.reportStatus === "已上报" ? "该单已完成上报审核" : "将设计单上报至本地台账"} onClick={() => { onReport(); setNotice("上报审核已记入本地台账。"); }}><ArrowUp />{ledger.reportStatus || "上报审核"}</button>
      <span className="version-action" title={versions.length < 2 ? "产生方案改动后可对比版本" : "查看方案版本"}>
        <button className="ghost" disabled={versions.length < 2} onClick={onCompare}><History />v{versions.at(-1)!.number} · 版本对比</button></span>
    </div>
    {notice && <p className="input-notice no-print" role="status">{notice}</p>}
    {sheetView === "techpack" ? (
      <article className="sheet print-sheet tp-sheet" aria-label="直达版房工艺单">
        <div className="sheet-top">
          <div className="sheet-title">
            <span className="eb">衣语 TailorMind · 版房工艺单（Tech Pack）</span>
            <h2>{techPack.garmentTitle}</h2>
            <div className="sheet-number">{techPack.techPackNo} · {techPack.cadStandard}</div>
          </div>
          <button className="seal" key={ledger.reviewStatus} onClick={cycle} title="点击切换审核状态" aria-label={`审核状态：${ledger.reviewStatus}，点击切换`}>
            {sealText[ledger.reviewStatus].split("").map((ch, i) => <span key={i}>{ch}</span>)}
          </button>
          {dir && <button className="ref-button" title="细节放大" onClick={() => onInspectDetail(dir)}><img className="ref-img" src={dir.referenceImageUrl} alt={dir.referenceImageCaption} /></button>}
        </div>

        <h3 className="sec"><span className="num">i.</span>母版裁片与缝份规范</h3>
        <div className="tp-meta-grid">
          <div className="f">
            <dt>基准母版</dt>
            <dd>{techPack.patternName} <button className="id" onClick={() => onInspectAsset(techPack.patternId)}>{techPack.patternId}</button></dd>
          </div>
          <div className="f">
            <dt>缝份标准</dt>
            <dd>{techPack.seamAllowanceSpec}</dd>
          </div>
          <div className="f">
            <dt>领型与肩型基准</dt>
            <dd>{techPack.collarSpec}；{techPack.shoulderSpec}</dd>
          </div>
          <div className="f">
            <dt>衣长与袖长止口</dt>
            <dd>{techPack.lengthSpec}</dd>
          </div>
        </div>
        <div className="tp-pieces">
          <span className="tp-sub">CAD 裁片清单（共 {techPack.cadPieces.length} 组）</span>
          <div className="tp-piece-chips">
            {techPack.cadPieces.map((piece) => <span className="chip o" key={piece}>{piece}</span>)}
          </div>
        </div>

        <h3 className="sec"><span className="num">ii.</span>关键部位量体与放量基准表</h3>
        <div className="tp-table-wrap">
          <table className="tp-table tp-measure-table">
            <colgroup>
              <col style={{ width: "86px" }} />
              <col />
              <col style={{ width: "112px" }} />
              <col style={{ width: "148px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>部位</th>
                <th>放量与裁剪指令</th>
                <th>依据</th>
                <th>实测净体 / 成品登记</th>
              </tr>
            </thead>
            <tbody>
              {techPack.measurementSpecs.map((row) => (
                <tr key={row.part}>
                  <td className="tp-part"><b>{row.part}</b></td>
                  <td>
                    <div>{row.easeRule}</div>
                    <small>{row.masterNote}</small>
                  </td>
                  <td className="tp-rule-col"><button className="id" onClick={() => onInspectAsset(row.sourceRuleId)}>{row.sourceRuleId}</button></td>
                  <td className="tp-fill">{row.actualValuePlaceholder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="sec"><span className="num">iii.</span>海派归拔与整烫工艺指令</h3>
        <div className="tp-shaping-list">
          {techPack.shapingInstructions.map((sh) => (
            <div className="tp-shaping-card" key={sh.id}>
              <div className="tp-sh-head">
                <b><Flame size={14} />{sh.id} · {sh.label}</b>
                <span className="chip o">触发：{sh.triggeredBy}</span>
              </div>
              <p>{sh.summary}</p>
              <div className="tp-piece-chips">
                {sh.params.map((p) => <span className="chip j" key={p}>{p}</span>)}
              </div>
            </div>
          ))}
        </div>

        <h3 className="sec"><span className="num">iv.</span>面辅料 BOM 清单与精做要点</h3>
        <div className="tp-table-wrap">
          <table className="tp-table">
            <thead>
              <tr>
                <th>类别</th>
                <th>物料名称</th>
                <th>规格 / 配色</th>
                <th>版房处理与洗护要求</th>
              </tr>
            </thead>
            <tbody>
              {techPack.bomItems.map((item) => (
                <tr key={item.role + item.name}>
                  <td><span className="chip">{item.role}</span></td>
                  <td>
                    <b>{item.name}</b>
                    {item.assetId && <> <button className="id" onClick={() => onInspectAsset(item.assetId!)}>{item.assetId}</button></>}
                  </td>
                  <td>{item.spec}</td>
                  <td>{item.careOrProcessNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="risk"><i>i</i><span><b>工艺精做要点：</b>{techPack.craftTechPoints}</span></div>

        <h3 className="sec"><span className="num">v.</span>版房质检红线（海派工艺图谱校验）</h3>
        {techPack.qcRedlines.map((line, i) => (
          <div className={`risk ${line.startsWith("【") ? "w" : ""}`} key={i}>
            <i>{line.startsWith("【") ? <ShieldAlert size={13} /> : "!"}</i>
            <span>{line}</span>
          </div>
        ))}
        <div className="tp-signoff">{techPack.masterSignOffNote}</div>
        <div className="signatures print-only">{["制版师净体复核", "顾问色卡签样", "工艺主管"].map(role => <span key={role}>{role}</span>)}</div>
      </article>
    ) : (
    <article className="sheet print-sheet">
      <div className="sheet-top"><div className="sheet-title"><span className="eb">衣语 TailorMind · 设计单</span>
        <h2>{dir?.title || proposal.proposalTitle}</h2>
        <div className="sheet-number-row">
          <span className="sheet-number">{ledger.ledgerNo}</span>
          <div className="review-switcher no-print" role="group" aria-label="审核状态切换">
            {reviewCycle.map(st => (
              <button
                key={st}
                type="button"
                className={`review-pill ${ledger.reviewStatus === st ? "on" : ""}`}
                aria-pressed={ledger.reviewStatus === st}
                onClick={() => setReviewStatus(st)}
              >
                {sealText[st]}
              </button>
            ))}
          </div>
        </div>
      </div>
        <button className="seal" key={ledger.reviewStatus} onClick={cycle} title="点击切换审核状态" aria-label={`审核状态：${ledger.reviewStatus}，点击切换`}>
          {sealText[ledger.reviewStatus].split("").map((ch, i) => <span key={i}>{ch}</span>)}</button>
        {dir && <button className="ref-button" title="细节放大" onClick={() => onInspectDetail(dir)}><img className="ref-img" src={dir.referenceImageUrl} alt={dir.referenceImageCaption} /></button>}
      </div>
      <div className="sheet-section-head"><h3 className="sec"><span className="num">i.</span>设计语言</h3>
        <div className="no-print sheet-controls">{draft ? <>
          <button type="button" className="opt" onClick={() => setDraft(null)}>取消</button>
          <button type="button" className="opt opt-primary" onClick={() => { onUpdateEightFields(draft); setDraft(null); setNotice("设计语言已更新并重新核对。"); }}>保存修改</button>
        </> : <><button type="button" className="sheet-ctrl-btn" aria-expanded={moreFields} onClick={() => setMoreFields(!moreFields)}>{moreFields ? "收起字段" : "全部八项"}</button>
          <button type="button" className="sheet-ctrl-btn" onClick={() => setDraft({ ...eightFields })}>微调</button></>}</div>
      </div>
      <dl className="fl">{fields.map((row, index) => <div className={`f ${index >= 4 && !moreFields && !draft ? "extra-field" : ""}`} key={row.key}>
        <dt>{row.label}{row.note && <span className="chip w">{row.note}</span>}</dt>
        <dd>{draft ? <textarea aria-label={row.label} value={draft[row.key]} onChange={e => setDraft({ ...draft, [row.key]: e.target.value })} /> : <>
          {eightFields[row.key]} {row.assetId && <button className="id" onClick={() => onInspectAsset(row.assetId!)}>{row.assetId}</button>}
          {row.zone && dir && <button className="zone-link no-print" onClick={() => onInspectDetail(dir, row.zone)}>看{row.zone === "shoulder" ? "肩袖" : row.zone === "collar" ? "领口" : row.zone === "fabric" ? "肌理" : "工艺"}</button>}
        </>}</dd>
      </div>)}</dl>
      <h3 className="sec"><span className="num">ii.</span>选材与依据</h3>
      {links.map(link => <div className="mt" key={link.id}>
        <button className="a" onClick={() => onInspectAsset(link.id)}>{link.name}<span>{link.id}</span></button>
        <div className="why">{link.sources.map(({ req, label }) => <span className="chip" key={req.id} title={req.rawPhrase + " · " + req.solutionAction}>{label}<span className="n">Nº{String(req.index).padStart(2, "0")}</span></span>)}
          {!link.sources.length && <small>按当前方向默认推荐</small>}</div></div>)}
      <h3 className="sec"><span className="num">iii.</span>工艺与风险提示</h3>
      {links.flatMap(l => l.conflicts.map(c => <div className="risk w" key={l.id + c.property}><i>!</i><span>{c.message}</span></div>))}
      {[alerts.leadTimeEstimate, ...alerts.fittingCheckpoints, ...alerts.riskAndCareNotes].filter(Boolean).map((a, i) =>
        <div className="risk" key={i}><i>i</i><span>{a}</span></div>)}
      <h3 className="sec"><span className="num">iv.</span>人工核准与交接</h3>
      <dl className="who3">{groups.map(owner => <div className="f" key={owner}><dt>{owner}</dt><dd>{proposal.handoffItems.filter(item => item.owner === owner).map(item => item.task).join("；")}</dd></div>)}</dl>
      {ledger.uniformSizeTable?.length && <><h3 className="sec">团装号型与特体</h3>{ledger.uniformSizeTable.map((r, i) => <div className="risk" key={i}>
        <span><b>{r.roleGroup} · {r.gender}</b>　{r.standardSizes}，特体 {r.specialFitCount} 人。{r.specialFitNotes}</span></div>)}</>}
      <div className="sheet-extra no-print"><button className="ghost" onClick={() => setShowReqs(!showReqs)} aria-expanded={showReqs}>{showReqs ? "收起需求对照" : "需求对照"}</button>
        <button className="ghost" onClick={onOpenVisualPrompts}>视觉企划板</button></div>
      <section className={showReqs ? "sheet-reqs" : "sheet-reqs print-only"}><h3 className="sec">需求对照</h3>
        {requirements.map(r => <div className="risk" key={r.id}><b>Nº{String(r.index).padStart(2, "0")}</b><span>{r.rawPhrase} · {r.solutionAction}（{reqStatus(r, asked)}）</span></div>)}</section>
      <PhotoGallery photos={pkg.photos} print />
      <div className="signatures print-only">{["顾问", "设计师", "制版师"].map(role => <span key={role}>{role}</span>)}</div>
    </article>
    )}
  </div>;
}
