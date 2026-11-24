import { ASSET_BY_ID } from "@/lib/asset-catalog";
import { pendingAsks, questionSource, reqStatus } from "@/lib/workbench-asks";
import { auditTime } from "@/lib/workbench-time";
import type { AuditLogEntry, EightFieldTranslation, LiangYiPlanPackage, PlanSnapshot, PlanVersion } from "@/lib/types";

const fields: [keyof EightFieldTranslation, string][] = [
  ["collar", "领型"], ["lengthRatio", "长度比例 / 袖长"], ["structure", "版型结构"], ["fabric", "面料"],
  ["patternCraft", "装饰纹样"], ["category", "品类"], ["color", "色彩"], ["easeAllowance", "松弛余量"],
];

function capture(pkg: LiangYiPlanPackage): PlanSnapshot {
  const { selectedDirectionId, proposalTitle, feasibilityAlerts, handoffItems, uniformTiers } = pkg.proposal;
  const { directionConfirmed, selectedPatternIds, selectedFabricIds, selectedCraftIds } = pkg.ledger;
  const pending = pendingAsks(pkg);
  return {
    proposal: { selectedDirectionId, proposalTitle, feasibilityAlerts, handoffItems, uniformTiers },
    directions: pkg.proposal.directions.map(({ id, tag, title, patternId, fabricId, craftId, fabricSuggestion,
      garmentSummary, collarAndCraftDiff, sheetLengthRatio, commandEdits }) => ({
      id, tag, title, patternId, fabricId, craftId, fabricSuggestion, garmentSummary, collarAndCraftDiff, sheetLengthRatio, commandEdits,
    })),
    assets: { directionConfirmed, selectedPatternIds, selectedFabricIds, selectedCraftIds },
    eightFields: pkg.eightFields, requirements: pkg.requirements, followUpQuestions: pkg.followUpQuestions,
    pendingCount: pending.count, pendingQuestionIds: pending.questions.map(q => q.question.id),
    paragraphIndices: pkg.planParagraphIndices ?? pkg.customerParagraphs.map((_, i) => i),
  };
}

function assetNames(ids: string[]) {
  return ids.map(id => [id, ASSET_BY_ID.get(id)?.name].filter(Boolean).join(" ")).join("、");
}

// 比较和留痕共用相同的业务字段，过滤时间戳、图片、工具轨迹等无关变动。
function rows(s: PlanSnapshot) {
  const selected = s.directions.find(d => d.id === s.proposal.selectedDirectionId);
  const questions = s.followUpQuestions.filter(q => s.pendingQuestionIds.includes(q.id));
  const asked = new Set(questions.map(q => questionSource(q, s.requirements)?.id).filter((id): id is string => !!id));
  const open = [...questions.map(q => q.question), ...s.requirements.filter(r => r.status === "待追问" && !asked.has(r.id)).map(r => r.rawPhrase)];
  const entries: [string, string, string][] = [
    ["direction", "方向", [s.assets.directionConfirmed ? "已选" : "待选择", selected?.tag, s.proposal.proposalTitle].filter(Boolean).join(" · ")],
    ...fields.map(([key, label]): [string, string, string] => [key, label, s.eightFields[key]]),
    ["asks", "待追问", [s.pendingCount + " 项", open.join("、")].filter(Boolean).join(" · ")],
    ["patterns", "选用版型", assetNames(s.assets.selectedPatternIds)], ["fabrics", "选用面料", assetNames(s.assets.selectedFabricIds)],
    ["crafts", "选用工艺", assetNames(s.assets.selectedCraftIds)],
  ];
  for (const r of s.requirements) entries.push(["req-" + r.id, "需求 Nº" + String(r.index).padStart(2, "0"),
    [r.rawPhrase, reqStatus(r, asked), r.solutionAction].join(" · ")]);
  for (const d of s.directions) entries.push(["dir-" + d.id, d.tag + " 方向", [d.title,
    assetNames([d.patternId, d.fabricId, ...(d.craftId ? [d.craftId] : [])]), d.garmentSummary, d.fabricSuggestion,
    d.collarAndCraftDiff, d.commandEdits?.sleeveLength].filter(Boolean).join(" · ")]);
  const alerts = s.proposal.feasibilityAlerts;
  entries.push(["risks", "可行性提示", [alerts.leadTimeEstimate, ...alerts.fittingCheckpoints, ...alerts.riskAndCareNotes].join(" · ")],
    ["handoff", "交给人来定", s.proposal.handoffItems.map(h => h.owner + " · " + h.task).join("；")]);
  if (s.proposal.uniformTiers?.length) entries.push(["tiers", "团装岗位分级", s.proposal.uniformTiers.map(t =>
    [t.tierName, t.headcountNote, t.garmentCombo, t.patternId, t.fabricId, t.viDesignTouch, t.sizingStrategy].join(" · ")).join("；")]);
  return new Map(entries.map(([key, label, value]) => [key, { label, value }]));
}

export function comparePlans(before: PlanSnapshot, after: PlanSnapshot) {
  const a = rows(before), b = rows(after);
  return Array.from(new Set([...b.keys(), ...a.keys()]), key => {
    const old = a.get(key), next = b.get(key);
    return { key, label: (next ?? old)!.label, old: old?.value || "—", value: next?.value || "—", changed: old?.value !== next?.value };
  });
}

function actionText(log: AuditLogEntry) {
  return (log.action === "回答追问" || log.action === "撤销 Agent 指令") && log.detail
    ? log.action + " · " + log.detail : log.action;
}

export function planVersions(pkg: LiangYiPlanPackage): PlanVersion[] {
  if (pkg.versions?.length) return pkg.versions;
  const log = pkg.ledger.auditLogs.findLast(l => /生成设计单|生成方向|回答追问|补录|选定方向|指令|调整需求|手工补记|微调/.test(l.action));
  return [{ number: 1, at: auditTime(log?.timestamp, log ? pkg.ledger.createdAt : pkg.ledger.updatedAt),
    action: log ? actionText(log) : "当前方案", snapshot: capture(pkg), origins: {} }];
}

export function recordPlanVersion(before: LiangYiPlanPackage, next: LiangYiPlanPackage): LiangYiPlanPackage {
  const versions = planVersions(before);
  const last = versions[versions.length - 1];
  const snapshot = capture(next);
  const changed = comparePlans(last.snapshot, snapshot).filter(r => r.changed);
  if (!changed.length) return { ...next, versions };
  const log = next.ledger.auditLogs.at(-1)!;
  const action = actionText(log), number = last.number + 1;
  const origins = { ...last.origins };
  for (const row of changed) origins[row.key] = { number, action };
  const version = { number, at: auditTime(log.timestamp, next.ledger.createdAt), action, origins, snapshot };
  // 固定保留 v1；字段来源跟随快照，较早的中间版本淘汰后仍可追溯。
  return { ...next, versions: [versions[0], ...versions.slice(1).slice(-18), version] };
}

export function applyPlanSnapshot(pkg: LiangYiPlanPackage, s: PlanSnapshot): LiangYiPlanPackage {
  return { ...pkg, eightFields: s.eightFields, requirements: s.requirements, followUpQuestions: s.followUpQuestions,
    planParagraphIndices: s.paragraphIndices,
    proposal: { ...pkg.proposal, ...s.proposal, directions: s.directions.map(d => ({
      ...pkg.proposal.directions.find(current => current.id === d.id)!, commandEdits: undefined, sheetLengthRatio: undefined, craftId: undefined, ...d,
    })) },
    ledger: { ...pkg.ledger, ...s.assets, directionConfirmed: s.assets.directionConfirmed,
      projectName: pkg.ledger.projectName === pkg.proposal.proposalTitle ? s.proposal.proposalTitle : pkg.ledger.projectName },
  };
}
