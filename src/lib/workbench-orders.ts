import { DEMO_PRESET_PROMPTS } from "@/data/demo-scenarios";
import { FABRIC_KB } from "@/data/kb-fabrics";
import { ASSET_BY_ID } from "@/lib/asset-catalog";
import { isSleeveQuestion, pendingAsks, planParagraphs, reqStatus } from "@/lib/workbench-asks";
import { applyPlanSnapshot, comparePlans, planVersions, recordPlanVersion } from "@/lib/workbench-versions";
export { formatFollowUpAnswer, pendingAsks, pendingQuestions, questionSource, reqStatus } from "@/lib/workbench-asks";
import { runLocalRuleEngine } from "@/lib/agent-engine";
import { validateDesignAgainstKG } from "@/lib/craft-kg-validator";
import { buildPatternRoomTechPack } from "@/lib/tech-pack-builder";
import { verifyRequirementCoverage } from "@/lib/verifier";
import type {
  AuditLogEntry, BusinessLedger, BusinessMode, CommandChange, CommandSnapshot, CommandTurn,
  DesignDirectionOption, DirectionEdits, FollowUpQuestion, LiangYiPlanPackage, RequirementItem, SleeveLength,
} from "@/lib/types";

export type WorkbenchView = "home" | "order" | "assets" | "ledger" | "clients" | "new" | "new-run" | "settings";
export type FlowStep = 1 | 2 | 3;
export const STEPS = [
  { step: 1, number: "一", label: "面谈记录" },
  { step: 2, number: "二", label: "选方向" },
  { step: 3, number: "三", label: "设计单" },
] as const;
export const modeLabel = (mode: BusinessMode) => mode === "uniform" ? "团体职业服" : "海派私定";

export function currentDirection(pkg: LiangYiPlanPackage) {
  return pkg.proposal.directions.find(d => d.id === pkg.proposal.selectedDirectionId);
}

export function orderShortCode(pkg: LiangYiPlanPackage) {
  const parts = pkg.ledger.ledgerNo.split("-");
  return parts.length >= 3 ? "#" + parts[parts.length - 1] : pkg.ledger.ledgerNo;
}

export function orderTitle(pkg: LiangYiPlanPackage) {
  const preset = DEMO_PRESET_PROMPTS.find(p => p.promptText === pkg.customerParagraphs[0]);
  if (preset && preset !== DEMO_PRESET_PROMPTS[0]) return preset.title;
  return pkg.proposal.clientShortLabel || pkg.ledger.projectName;
}

export function ledgerStatus(pkg: LiangYiPlanPackage) {
  if (pkg.ledger.reportStatus === "已上报") return "已上报";
  return pkg.ledger.directionConfirmed ? "待上报" : "进行中";
}

export function isOngoing(pkg: LiangYiPlanPackage) {
  return pkg.ledger.currentStage < 6 && pkg.ledger.reviewStatus !== "意向已确认";
}

export function pendingTodoCount(orders: LiangYiPlanPackage[]) {
  return orders.filter(isOngoing).reduce((total, pkg) => {
    let n = pendingAsks(pkg).count;
    if (ledgerStatus(pkg) !== "已上报") {
      if (!pkg.ledger.directionConfirmed) n += 1;
      else if (pkg.ledger.reviewStatus === "待审核") n += 1;
    }
    return total + n;
  }, 0);
}

export function orderStep(pkg: LiangYiPlanPackage): FlowStep {
  if (!pkg.ledger.directionConfirmed && pkg.proposal.directions.length) return 2;
  if (pkg.ledger.reviewStatus !== "待审核" || pkg.ledger.reportStatus || pkg.ledger.auditLogs.some(l => l.action === "生成设计单")) return 3;
  if (pendingAsks(pkg).count) return 1;
  return pkg.ledger.directionConfirmed ? 3 : 2;
}

export function stepStatus(pkg: LiangYiPlanPackage, step: FlowStep) {
  if (step === 1) {
    const n = pendingAsks(pkg).count;
    return n ? `${n} 待追问` : "已记录";
  }
  if (step === 2) {
    const dir = currentDirection(pkg);
    return pkg.ledger.directionConfirmed && dir ? `已选 ${dir.tag.split(" ")[0]}` : "待选择";
  }
  return pkg.ledger.reportStatus || (pkg.ledger.directionConfirmed ? pkg.ledger.reviewStatus : "待选方向");
}

// 台账选材与设计单共用同一个方向，工具检索出的备选资产不计作使用量。
function selectedAssets(dir: DesignDirectionOption, pkg: LiangYiPlanPackage) {
  const tiers = pkg.proposal.uniformTiers || [];
  return {
    selectedPatternIds: [...new Set([dir.patternId, ...tiers.map(t => t.patternId)])],
    selectedFabricIds: [...new Set([dir.fabricId, ...tiers.map(t => t.fabricId)])],
    selectedCraftIds: dir.craftId ? [dir.craftId] : [],
  };
}

export function materialIds(pkg: LiangYiPlanPackage) {
  const dir = currentDirection(pkg);
  const l = dir ? selectedAssets(dir, pkg) : pkg.ledger;
  const recorded = pkg.ledger.directionConfirmed ? [
    ...pkg.ledger.selectedPatternIds, ...pkg.ledger.selectedFabricIds, ...pkg.ledger.selectedCraftIds,
  ] : [];
  return [...new Set([...l.selectedPatternIds, ...l.selectedFabricIds, ...l.selectedCraftIds, ...recorded])];
}

export function referenceCounts(orders: LiangYiPlanPackage[]) {
  const counts = new Map<string, number>();
  for (const pkg of orders) {
    if (!pkg.ledger.directionConfirmed) continue;
    const ids = new Set([...materialIds(pkg), ...pkg.ledger.referenceCaseIds,
      ...pkg.requirements.flatMap(r => r.ruleOrAssetId?.startsWith("RULE-") ? [r.ruleOrAssetId] : [])]);
    for (const id of ids) {
      if (ASSET_BY_ID.has(id)) counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return counts;
}

export function createDemoOrders() {
  return DEMO_PRESET_PROMPTS.map((preset, index) => {
    const { plan } = runLocalRuleEngine({
      mode: preset.mode, conversation: [{ role: "advisor", content: preset.promptText }], isInitialSeed: true,
    });
    // 延续旧版的两份已归档样单。论坛场景有自己的草稿台账。
    const archived = index === 0 || preset.mode === "uniform";
    const ledgerNo = preset.mode === "uniform" ? "LY-20261120-002" : index === 0 ? plan.ledger.ledgerNo : "LY-20261120-001";
    return {
      ...plan, scenarioId: preset.id,
      ledger: {
        ...plan.ledger, ledgerNo, directionConfirmed: archived,
        ...selectedAssets(plan.proposal.directions[0], plan),
        ...(archived ? { archivedAt: plan.ledger.createdAt } : {}),
        ...(preset.mode === "uniform" ? {
          clientOrOrgName: "瑞澜私人银行（陆家嘴旗舰中心）", reviewStatus: "已复核·待打样" as const,
        } : {}),
      },
    };
  });
}

export function importArchivedOrders(seeds: LiangYiPlanPackage[], archives: LiangYiPlanPackage[]) {
  const rows = new Map(seeds.map(pkg => [pkg.ledger.ledgerNo, pkg]));
  for (const pkg of archives) {
    if (!pkg?.ledger?.ledgerNo || !pkg.proposal?.directions?.length || !Array.isArray(pkg.requirements)) continue;
    rows.set(pkg.ledger.ledgerNo, {
      ...pkg, ledger: {
        ...pkg.ledger, directionConfirmed: pkg.ledger.directionConfirmed ?? true,
        archivedAt: pkg.ledger.archivedAt || pkg.ledger.updatedAt,
      },
    });
  }
  return [...rows.values()];
}

// 本机已有旧版演示存档时，将仍指向旧案例占位图的预设方向图与视觉企划板平滑升级为最新生成图，保留人工与实时出图结果。
export function syncDemoVisuals(orders: LiangYiPlanPackage[]) {
  const seeds = createDemoOrders();
  const byScenario = new Map(seeds.map(s => [s.scenarioId, s]));
  const byLedger = new Map(seeds.map(s => [s.ledger.ledgerNo, s]));
  return orders.map(pkg => {
    const seed = (pkg.scenarioId && byScenario.get(pkg.scenarioId)) || byLedger.get(pkg.ledger.ledgerNo);
    if (!seed) return pkg;
    const directions = pkg.proposal.directions.map(d => {
      const fresh = seed.proposal.directions.find(sd => sd.id === d.id);
      if (!fresh || !d.referenceImageUrl.startsWith("/cases/shangfu/")) return d;
      return { ...d, referenceImageUrl: fresh.referenceImageUrl, referenceImageCaption: fresh.referenceImageCaption };
    });
    const visualSlots = pkg.visualSlots.map(slot => {
      const fresh = seed.visualSlots.find(ss => ss.slotId === slot.slotId);
      if (!fresh || slot.imageSource === "live_ai" || !slot.imageUrl.startsWith("/cases/shangfu/")) return slot;
      return { ...slot, imageUrl: fresh.imageUrl, visualCheckNote: fresh.visualCheckNote ?? slot.visualCheckNote };
    });
    return { ...pkg, proposal: { ...pkg.proposal, directions }, visualSlots };
  });
}

export function withVerification(pkg: LiangYiPlanPackage): LiangYiPlanPackage {
  const paragraphs = planParagraphs(pkg);
  const active = pkg.planParagraphIndices ? { ...pkg, customerParagraphs: paragraphs, customerInput: paragraphs.join("\n") } : pkg;
  return { ...pkg, verification: verifyRequirementCoverage(active) };
}

function audit(action: string, detail = ""): AuditLogEntry {
  const now = new Date();
  const timestamp = now.toLocaleString("sv-SE", { hour12: false }).slice(0, 16);
  const id = globalThis.crypto?.randomUUID?.() || `L-${now.getTime()}-${Math.random().toString(36).slice(2)}`;
  return { id, timestamp, actor: "定制业务专员 (人工)", action, detail };
}

export function changeLedger(pkg: LiangYiPlanPackage, patch: Partial<BusinessLedger>, action: string, detail = "") {
  const log = audit(action, detail);
  return { ...pkg, ledger: { ...pkg.ledger, ...patch, updatedAt: log.timestamp, auditLogs: [...pkg.ledger.auditLogs, log] } };
}

export function editLedgerFields(pkg: LiangYiPlanPackage, patch: Partial<BusinessLedger>) {
  // 台账表单即时保存项目名称。保留后续人工命名，避免旧方向的撤销覆盖它。
  const renamed = patch.projectName !== undefined && patch.projectName !== pkg.ledger.projectName;
  return { ...pkg, ledger: { ...pkg.ledger, ...patch }, commandHistory: renamed
    ? pkg.commandHistory?.map(t => t.undo ? { ...t, undo: undefined } : t) : pkg.commandHistory };
}

export function reportOrder(pkg: LiangYiPlanPackage) {
  if (ledgerStatus(pkg) !== "待上报") return pkg;
  return changeLedger(pkg, { reportStatus: "已上报" }, "上报审核", "已上报，记录于本地台账");
}

function applyDirection(pkg: LiangYiPlanPackage, dir: DesignDirectionOption): LiangYiPlanPackage {
  const previous = currentDirection(pkg);
  const fabric = FABRIC_KB.find(f => f.id === dir.fabricId);
  const alerts = pkg.proposal.feasibilityAlerts;
  const collar = dir.id === "modern" && pkg.eightFields.category.includes("旗袍")
    ? "无扣交领，完全避开旗袍立领"
    : previous?.id !== dir.id && /领/.test(dir.collarAndCraftDiff) ? dir.collarAndCraftDiff : pkg.eightFields.collar;
  return withVerification({
    ...pkg,
    eightFields: { ...pkg.eightFields, collar, fabric: dir.fabricSuggestion, patternCraft: dir.collarAndCraftDiff,
      ...(dir.sheetLengthRatio && { lengthRatio: dir.sheetLengthRatio }),
      ...(dir.commandEdits?.patternId && { structure: dir.garmentSummary }) },
    proposal: { ...pkg.proposal, selectedDirectionId: dir.id, proposalTitle: dir.title,
      feasibilityAlerts: { ...alerts, riskAndCareNotes: alerts.riskAndCareNotes.map(note =>
        fabric && note.startsWith("洗护说明：") ? "洗护说明：" + fabric.careInstruction : note) } },
    ledger: { ...pkg.ledger, projectName: dir.title, ...selectedAssets(dir, pkg) },
  });
}

export function chooseDirection(pkg: LiangYiPlanPackage, dir: DesignDirectionOption) {
  if (pkg.ledger.directionConfirmed && pkg.proposal.selectedDirectionId === dir.id) return pkg;
  return recordPlanVersion(pkg, changeLedger(applyDirection(pkg, dir), { directionConfirmed: true }, `选定方向 ${dir.tag}`, dir.title));
}

export function recordSheet(pkg: LiangYiPlanPackage) {
  return recordPlanVersion(pkg, changeLedger(pkg, {}, "生成设计单", pkg.proposal.proposalTitle));
}

export function restorePlanVersion(pkg: LiangYiPlanPackage, number: number) {
  const versions = planVersions(pkg);
  const target = versions.find(v => v.number === number);
  if (!target || !comparePlans(target.snapshot, versions[versions.length - 1].snapshot).some(r => r.changed)) return pkg;
  const restored = withVerification(applyPlanSnapshot(pkg, target.snapshot));
  return recordPlanVersion(pkg, changeLedger(restored, {}, "恢复到 v" + number));
}

export function editDesignFields(pkg: LiangYiPlanPackage, fields: LiangYiPlanPackage["eightFields"]) {
  const active = currentDirection(pkg);
  let proposal = pkg.proposal;
  if (active?.sheetLengthRatio !== undefined && fields.lengthRatio !== pkg.eightFields.lengthRatio) {
    const sleeve = fields.lengthRatio.match(/长袖|九分袖|七分袖/)?.[0] as SleeveLength | undefined;
    proposal = { ...proposal, directions: proposal.directions.map(d => d.id !== active.id ? d : { ...d,
      sheetLengthRatio: fields.lengthRatio, commandEdits: d.commandEdits && { ...d.commandEdits, sleeveLength: sleeve } }) };
  }
  return recordPlanVersion(pkg, withVerification(changeLedger({ ...pkg, proposal, eightFields: fields }, {}, "微调八项设计语言", fields.collar)));
}

export function editRequirement(pkg: LiangYiPlanPackage, reqId: string, patch: Partial<RequirementItem>) {
  const requirements = pkg.requirements.map(r => r.id !== reqId ? r : {
    ...r, ...patch, advisorEdits: { ...r.advisorEdits,
      ...(patch.solutionAction !== undefined && { solutionAction: patch.solutionAction }),
      ...(patch.status !== undefined && { status: patch.status }) },
  });
  return recordPlanVersion(pkg, withVerification(changeLedger({ ...pkg, requirements }, {}, `人工调整需求 ${reqId}`, patch.solutionAction || patch.status)));
}

export function addRequirement(pkg: LiangYiPlanPackage, rawPhrase: string, solutionAction: string) {
  const index = Math.max(0, ...pkg.requirements.map(r => r.index)) + 1;
  const added: RequirementItem = {
    id: `REQ-${String(index).padStart(2, "0")}`, index, rawPhrase, sourceSpan: rawPhrase,
    category: "场合礼仪", isHardRequirement: true, priority: 2, solutionAction,
    rationale: "顾问面谈手工补记", status: "已落实", ownerRole: "顾问",
  };
  return recordPlanVersion(pkg, withVerification(changeLedger({ ...pkg, requirements: [...pkg.requirements, added] }, {}, `手工补记：${rawPhrase}`, solutionAction)));
}

function setSleeve(text: string, sleeve: SleeveLength) {
  const old = /长\/九分袖|遮臂袖|(?:长袖|九分袖|七分袖)袖?/g;
  return old.test(text) ? text.replace(old, sleeve) : [text, "袖长" + sleeve].filter(Boolean).join("，");
}

function amendDirection(dir: DesignDirectionOption, edits: DirectionEdits, baseLength: string) {
  const next = { ...dir, commandEdits: { ...dir.commandEdits, ...edits } };
  if (edits.sleeveLength) next.sheetLengthRatio = setSleeve(dir.sheetLengthRatio ?? baseLength, edits.sleeveLength);
  if (edits.fabricId) { next.fabricId = edits.fabricId; next.fabricSuggestion = ASSET_BY_ID.get(edits.fabricId)!.name; }
  if (edits.patternId) { next.patternId = edits.patternId; next.garmentSummary = ASSET_BY_ID.get(edits.patternId)!.name; }
  if (edits.craftId) { next.craftId = edits.craftId; next.collarAndCraftDiff = ASSET_BY_ID.get(edits.craftId)!.name; }
  return next;
}

function commandSnapshot(pkg: LiangYiPlanPackage): CommandSnapshot {
  const { selectedDirectionId, proposalTitle, feasibilityAlerts } = pkg.proposal;
  const { projectName, directionConfirmed, selectedPatternIds, selectedFabricIds, selectedCraftIds } = pkg.ledger;
  return { proposal: { selectedDirectionId, proposalTitle, feasibilityAlerts },
    directions: pkg.proposal.directions.map(({ id, patternId, fabricId, craftId, garmentSummary, collarAndCraftDiff,
      fabricSuggestion, sheetLengthRatio, commandEdits }) => ({ id, patternId, fabricId, craftId, garmentSummary,
      collarAndCraftDiff, fabricSuggestion, sheetLengthRatio, commandEdits })),
    requirements: pkg.requirements, eightFields: pkg.eightFields, verification: pkg.verification,
    ledger: { projectName, directionConfirmed, selectedPatternIds, selectedFabricIds, selectedCraftIds } };
}

export function appendCommandTurn(pkg: LiangYiPlanPackage, turn: CommandTurn): LiangYiPlanPackage {
  return { ...pkg, commandHistory: [...(pkg.commandHistory ?? []), turn] };
}

export function applyOrderCommand(pkg: LiangYiPlanPackage, command: CommandChange, id: string, text: string) {
  const dir = pkg.proposal.directions.find(d => d.id === command.directionId)!;
  const letter = dir.tag.split(" · ")[0];
  const diffs: NonNullable<CommandTurn["diffs"]> = [];
  const edits: DirectionEdits = {};
  const active = dir.id === pkg.proposal.selectedDirectionId;
  const baseLength = pkg.eightFields.lengthRatio;
  const sleeve = command.sleeveLength;
  const ratio = dir.sheetLengthRatio || baseLength;
  const priorLength = dir.commandEdits?.sleeveLength || (!/长\/九分袖/.test(ratio) && ratio.match(/长袖|九分袖|七分袖/)?.[0]);
  if (sleeve && sleeve !== dir.commandEdits?.sleeveLength) {
    edits.sleeveLength = sleeve;
    diffs.push({ label: "袖长", from: priorLength || "待确认", to: sleeve });
  }
  for (const [key, label] of [["patternId", "版型"], ["fabricId", "面料"], ["craftId", "工艺"]] as const) {
    const value = command[key];
    if (value && value !== dir[key]) { edits[key] = value; diffs.push({ label, from: dir[key] || "未指定", to: value }); }
  }
  const selectionChanged = command.select && (!active || !pkg.ledger.directionConfirmed);
  if (selectionChanged) {
    diffs.push({ label: "选定方向", from: pkg.ledger.directionConfirmed ? currentDirection(pkg)?.tag : "待选择", to: dir.tag });
  }
  const asks = pendingAsks(pkg);
  const sleeveSource = sleeve && (asks.questions.find(x => isSleeveQuestion(x.question))?.req
    || pkg.requirements.find(r => r.ruleOrAssetId === "RULE-GEN-02" || /袖长|手臂|胳膊/.test(r.rawPhrase)));
  const requirements = pkg.requirements.map(r => {
    const answersSleeve = !!sleeve && r === sleeveSource;
    const status = answersSleeve ? "已落实" : command.statuses?.find(s => s.id === r.id)?.status;
    if (!status) return r;
    const was = reqStatus(r, asks.asked);
    const action = answersSleeve ? setSleeve(r.solutionAction.replace(/[（(]袖长待确认[）)]/g, ""), sleeve) : r.solutionAction;
    const label = "需求 Nº" + String(r.index).padStart(2, "0");
    if (was !== status) diffs.push({ label, from: was, to: status });
    else if (action === r.solutionAction) return r;
    else if (!edits.sleeveLength) diffs.push({ label: label + "做法", from: r.solutionAction, to: action });
    return { ...r, status, solutionAction: action, advisorEdits: { ...r.advisorEdits, status, ...(answersSleeve && { solutionAction: action }) } };
  });
  if (!diffs.length && requirements.every((r, i) => r === pkg.requirements[i])) {
    return appendCommandTurn(pkg, { id, text, kind: "unchanged", reply: "当前方案已是这个设置。", directionId: dir.id });
  }
  const hasEdits = Object.keys(edits).length > 0;
  const updated = hasEdits ? amendDirection(dir, edits, baseLength) : dir;

  // 海派工艺图谱校验 Agent：修改面料/版型/工艺时执行硬约束拦截，过滤做不出来的设计
  if (edits.fabricId || edits.patternId || edits.craftId) {
    const kgCheck = validateDesignAgainstKG({
      customerText: pkg.customerInput,
      collarText: updated.collarAndCraftDiff || pkg.eightFields.collar,
      patternId: updated.patternId,
      fabricId: updated.fabricId,
      craftId: updated.craftId,
      mode: pkg.mode,
      requirements: pkg.requirements,
    });
    if (!kgCheck.passed && kgCheck.blockedConflicts.length > 0) {
      const first = kgCheck.blockedConflicts[0];
      return appendCommandTurn(pkg, {
        id,
        text,
        kind: "unchanged",
        directionId: dir.id,
        reply: `【海派工艺图谱已拦截】该组合属于不可制造冲突（${first.pathText}）：${first.reason} ${first.alternativeHint}`,
        conflicts: kgCheck.blockedConflicts.map((c) => `${c.pathText}：${c.alternativeHint}`),
        assetIds: [updated.patternId, updated.fabricId, ...(updated.craftId ? [updated.craftId] : [])],
      });
    }
  }

  const nextDirs = pkg.proposal.directions.map(d => d.id === dir.id ? updated
    : sleeve && !d.sheetLengthRatio ? { ...d, sheetLengthRatio: baseLength } : d);
  let next = { ...pkg, requirements, proposal: { ...pkg.proposal, directions: nextDirs } };
  if (selectionChanged) next = applyDirection(next, updated);
  else if (active && hasEdits) {
    const materials = edits.fabricId || edits.patternId || edits.craftId;
    const fabric = edits.fabricId && FABRIC_KB.find(f => f.id === edits.fabricId);
    const alerts = next.proposal.feasibilityAlerts;
    next = { ...next, eightFields: { ...pkg.eightFields,
      ...(edits.sleeveLength && { lengthRatio: updated.sheetLengthRatio! }),
      ...(edits.fabricId && { fabric: updated.fabricSuggestion }), ...(edits.patternId && { structure: updated.garmentSummary }),
      ...(edits.craftId && { patternCraft: updated.collarAndCraftDiff }) },
      ledger: materials ? { ...pkg.ledger, ...selectedAssets(updated, pkg) } : pkg.ledger,
      proposal: fabric ? { ...next.proposal, feasibilityAlerts: { ...alerts, riskAndCareNotes: alerts.riskAndCareNotes.map(note =>
        note.startsWith("洗护说明：") ? "洗护说明：" + fabric.careInstruction : note) } } : next.proposal };
  }
  const summary = diffs.map(d => d.label + "：" + (d.from ? d.from + " → " : "") + d.to).join("；");
  if (hasEdits) diffs.push({ label: "设计单 " + letter, to: "已同步" });
  next = withVerification(changeLedger(next, command.select ? { directionConfirmed: true } : {}, "Agent 指令：" + text, summary));
  const curDir = currentDirection(next) || updated;
  const refreshedKg = validateDesignAgainstKG(
    {
      customerText: next.customerInput,
      collarText: next.eightFields.collar,
      patternId: curDir.patternId,
      fabricId: curDir.fabricId,
      craftId: curDir.craftId,
      mode: next.mode,
      requirements: next.requirements,
    },
    next.proposal.directions
  );
  next = { ...next, kgValidation: refreshedKg, techPack: buildPatternRoomTechPack(next, curDir) };
  return appendCommandTurn(recordPlanVersion(pkg, next), { id, text, kind: "modify", directionId: hasEdits || selectionChanged ? dir.id : undefined,
    requirementId: requirements.find((r, i) => r !== pkg.requirements[i])?.id, diffs, reply: command.reply ||
    (sleeve ? "已将 " + letter + " 方向的袖长定为" + sleeve + "。" : selectionChanged ? "已选定 " + dir.tag + " 方向。" : "已通过工艺图谱校验并更新" + summary + "。"),
    badge: sleeve || (hasEdits ? diffs[0].label : selectionChanged ? "已选方向" : undefined),
    auditId: next.ledger.auditLogs.at(-1)?.id, undo: commandSnapshot(pkg) });
}

// 可依次撤销最近的指令。后续的人工复核、上报或补录不能被旧快照覆盖。
export function undoableCommandId(pkg: LiangYiPlanPackage) {
  const history = pkg.commandHistory ?? [];
  const undone = new Set(history.filter(t => t.undone).map(t => t.auditId));
  const last = pkg.ledger.auditLogs.findLast(log => !["撤销 Agent 指令", "生成设计单", "导出设计单与提示词发给设计师"].includes(log.action) && !undone.has(log.id));
  return last && history.find(t => t.undo && t.auditId === last.id)?.id;
}

export function undoOrderCommand(pkg: LiangYiPlanPackage, id: string) {
  const turn = pkg.commandHistory?.find(t => t.id === id);
  const before = turn?.undo;
  if (!before || undoableCommandId(pkg) !== id) return pkg;
  const restored = { ...pkg, requirements: before.requirements, eightFields: before.eightFields,
    proposal: { ...pkg.proposal, ...before.proposal, directions: pkg.proposal.directions.map(d => ({
      ...d, commandEdits: undefined, sheetLengthRatio: undefined, craftId: undefined, ...before.directions.find(item => item.id === d.id) })) },
    commandHistory: pkg.commandHistory?.map(t => t.id === id ? { ...t, undo: undefined, undone: true } : t) };
  return recordPlanVersion(pkg, changeLedger({ ...restored, verification: before.verification ?? withVerification(restored).verification },
    { ...before.ledger, directionConfirmed: before.ledger.directionConfirmed }, "撤销 Agent 指令", turn.text));
}

// 分析接口每次返回完整的新草稿。补录只更新本单分析结果，保留身份、人工操作与上报留痕。
export function mergeAnalysis(previous: LiangYiPlanPackage, result: LiangYiPlanPackage, action: string, detail: string) {
  const old = previous.ledger;
  const perDirectionLength = previous.proposal.directions.some(d => d.commandEdits?.sleeveLength);
  let next: LiangYiPlanPackage = { ...result, scenarioId: previous.scenarioId, commandHistory: previous.commandHistory,
    interviewTurns: previous.interviewTurns, photos: previous.photos, clientGroupKey: previous.clientGroupKey,
    proposal: { ...result.proposal, directions: result.proposal.directions.map(dir => {
      const edits = previous.proposal.directions.find(d => d.id === dir.id)?.commandEdits;
      return edits ? amendDirection(dir, edits, result.eightFields.lengthRatio)
        : perDirectionLength ? { ...dir, sheetLengthRatio: result.eightFields.lengthRatio } : dir;
    }) },
    ledger: { ...result.ledger, ledgerNo: old.ledgerNo, createdAt: old.createdAt,
      clientOrOrgName: old.clientOrOrgName, specialistName: old.specialistName,
      reviewStatus: old.reviewStatus, directionConfirmed: old.directionConfirmed,
      reportStatus: old.reportStatus, archivedAt: old.archivedAt, currentStage: old.currentStage,
      auditLogs: old.auditLogs },
  };
  const chosen = next.proposal.directions.find(d => d.id === previous.proposal.selectedDirectionId);
  if (chosen && (old.directionConfirmed || chosen.commandEdits)) {
    // 初始方向已是引擎的主方案。回答追问时保留该方案的八项原文，避免无关的选材文案跟着改变。
    if (chosen.id === result.proposal.selectedDirectionId && !chosen.commandEdits) {
      const prior = currentDirection(previous);
      next = { ...next, ledger: { ...next.ledger, ...selectedAssets(chosen, next) },
        eightFields: { ...next.eightFields,
          ...(prior?.fabricSuggestion === previous.eightFields.fabric && { fabric: chosen.fabricSuggestion }),
          ...(prior?.collarAndCraftDiff === previous.eightFields.patternCraft && { patternCraft: chosen.collarAndCraftDiff }) } };
    } else next = applyDirection(next, chosen);
  }
  if (old.projectName !== previous.proposal.proposalTitle) next.ledger = { ...next.ledger, projectName: old.projectName };
  const requirements = next.requirements.map(r => {
    const edits = previous.requirements.find(o => o.sourceSpan === r.sourceSpan && o.rawPhrase === r.rawPhrase)?.advisorEdits;
    return edits ? { ...r, ...edits, advisorEdits: edits } : r;
  });
  for (const r of previous.requirements.filter(r => r.rationale === "顾问面谈手工补记")) {
    if (requirements.some(n => n.rawPhrase === r.rawPhrase)) continue;
    const index = Math.max(0, ...requirements.map(n => n.index)) + 1;
    requirements.push({ ...r, index, id: `REQ-${String(index).padStart(2, "0")}` });
  }
  return recordPlanVersion(previous, withVerification(changeLedger({ ...next, requirements }, {}, action, detail)));
}

export type AnswerQuestion = (pkg: LiangYiPlanPackage, question: FollowUpQuestion, answer: string) => void;
