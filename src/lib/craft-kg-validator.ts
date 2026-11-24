import {
  CRAFT_KG_EDGES,
  KG_NODE_BY_ID,
  type KGEdge,
  type KGNode,
} from "@/data/craft-knowledge-graph";
import type {
  CraftKgConflict,
  CraftKgValidationReport,
  DesignDirectionOption,
  RequirementItem,
} from "@/lib/types";

export interface CraftValidationInput {
  customerText: string;
  collarText?: string;
  patternId?: string;
  fabricId?: string;
  craftId?: string;
  mode?: "bespoke" | "uniform";
  requirements?: RequirementItem[];
}

function inferCollarNodeId(patternId?: string, collarText = "", customerText = ""): string {
  const combined = `${collarText} ${customerText}`;
  // 若方案或用户明确指定传统高立领（≥3.5cm）
  if (
    /(?:传统|经典|硬)?高立领|立领\s*(?:3\.[5-9]|[4-9])\s*cm|4\s*cm\s*立领/.test(collarText) ||
    (!collarText && /(?:要|做|加|配)(?:一个|一件)?(?:传统)?高立领|领子要高/.test(customerText))
  ) {
    return "COL-HIGH-STAND";
  }
  if (patternId === "PAT-SF-02" || /青果/.test(collarText)) return "COL-SHAWL";
  if (patternId === "PAT-SF-06" || /交领|无立领/.test(collarText)) return "COL-WRAP";
  if (
    patternId === "PAT-SF-01" ||
    patternId === "PAT-SF-04" ||
    patternId === "PAT-SF-05" ||
    patternId === "PAT-UNI-01" ||
    /低立领|微立领/.test(collarText)
  ) {
    return "COL-LOW-STAND";
  }
  if (/高立领/.test(combined) && !/(?:不要|不能|别|不做|避开|避让).{0,6}高立领/.test(combined)) {
    return "COL-HIGH-STAND";
  }
  return "COL-LOW-STAND";
}

function detectContextNodeIds(input: CraftValidationInput): string[] {
  const text = `${input.customerText} ${(input.requirements ?? []).map((r) => r.rawPhrase).join(" ")}`;
  const ids = new Set<string>();

  if (
    /(?:旗袍.*立领|立领.*旗袍|旗袍外搭|穿在旗袍外)/.test(text) &&
    !/旗袍.{0,4}无领/.test(text)
  ) {
    ids.add("CTX-QIPAO-STAND");
  }
  if (/(?:脖子|颈).{0,4}短|短颈|卡脖|领子?.{0,5}(?:不能|不要|别).{0,3}高/.test(text)) {
    ids.add("CTX-SHORT-NECK");
  }
  if (/驼背|圆背|背.{0,3}(?:驼|弯)/.test(text)) {
    ids.add("CTX-HUNCHBACK");
  }
  if (/肚腩|小肚子|腹部微隆|肚子.{0,3}(?:大|凸|胖)/.test(text)) {
    ids.add("CTX-BELLY");
  }
  if (
    /(?:必须|要求|需要|希望)?(?:能|可|可以)?(?:机洗|水洗)|(?:不能|不要|不接受)干洗/.test(text) ||
    (input.mode === "uniform" && /机洗|水洗|免烫/.test(text))
  ) {
    ids.add("CTX-WASHABLE");
  }
  if (/敬酒|举杯|抬手|演奏|坐奏|舞台/.test(text)) {
    ids.add("CTX-STAGE-ARM");
  }

  return Array.from(ids);
}

function edgeToConflict(edge: KGEdge): CraftKgConflict {
  const fromNode = KG_NODE_BY_ID.get(edge.from);
  const toNode = KG_NODE_BY_ID.get(edge.to);
  const altNode = edge.alternativeNodeId ? KG_NODE_BY_ID.get(edge.alternativeNodeId) : undefined;
  return {
    edgeId: edge.id,
    severity: edge.severity ?? "caution",
    fromId: edge.from,
    fromLabel: fromNode?.label ?? edge.from,
    toId: edge.to,
    toLabel: toNode?.label ?? edge.to,
    pathText: `${fromNode?.label ?? edge.from} ✕ ${toNode?.label ?? edge.to}`,
    reason: edge.reason,
    alternativeId: altNode?.assetId ?? edge.alternativeNodeId,
    alternativeLabel: altNode?.label,
    alternativeHint: edge.alternativeHint ?? "建议更换为图谱适配组合。",
  };
}

export function testCraftCombination(params: {
  contextIds: string[];
  patternId?: string;
  collarId?: string;
  fabricId?: string;
  craftId?: string;
}): {
  passed: boolean;
  activeNodeIds: string[];
  blocked: CraftKgConflict[];
  cautions: CraftKgConflict[];
  shapingNodes: { id: string; label: string; summary: string; params: string[]; triggeredBy: string }[];
  compatibleLinks: { fromLabel: string; toLabel: string; reason: string }[];
} {
  const activeSet = new Set<string>(params.contextIds);
  if (params.patternId && KG_NODE_BY_ID.has(params.patternId)) activeSet.add(params.patternId);
  if (params.collarId && KG_NODE_BY_ID.has(params.collarId)) activeSet.add(params.collarId);
  if (params.fabricId && KG_NODE_BY_ID.has(params.fabricId)) activeSet.add(params.fabricId);
  if (params.craftId && KG_NODE_BY_ID.has(params.craftId)) activeSet.add(params.craftId);

  const blocked: CraftKgConflict[] = [];
  const cautions: CraftKgConflict[] = [];
  const shapingMap = new Map<
    string,
    { id: string; label: string; summary: string; params: string[]; triggeredBy: string[] }
  >();
  const compatibleLinks: { fromLabel: string; toLabel: string; reason: string }[] = [];

  for (const edge of CRAFT_KG_EDGES) {
    const bothActive = activeSet.has(edge.from) && activeSet.has(edge.to);
    if (edge.relation === "CONFLICTS_WITH" && bothActive) {
      const conflict = edgeToConflict(edge);
      if (conflict.severity === "blocked") blocked.push(conflict);
      else cautions.push(conflict);
    } else if (edge.relation === "REQUIRES_SHAPING" && activeSet.has(edge.from)) {
      const target = KG_NODE_BY_ID.get(edge.to);
      const source = KG_NODE_BY_ID.get(edge.from);
      if (target) {
        activeSet.add(target.id);
        const existing = shapingMap.get(target.id);
        const trig = source?.label ?? edge.from;
        if (existing) {
          if (!existing.triggeredBy.includes(trig)) existing.triggeredBy.push(trig);
        } else {
          shapingMap.set(target.id, {
            id: target.id,
            label: target.label,
            summary: target.summary,
            params: target.params ?? [],
            triggeredBy: [trig],
          });
        }
      }
    } else if (edge.relation === "COMPATIBLE_WITH" && bothActive) {
      compatibleLinks.push({
        fromLabel: KG_NODE_BY_ID.get(edge.from)?.label ?? edge.from,
        toLabel: KG_NODE_BY_ID.get(edge.to)?.label ?? edge.to,
        reason: edge.reason,
      });
    }
  }

  return {
    passed: blocked.length === 0,
    activeNodeIds: Array.from(activeSet),
    blocked,
    cautions,
    shapingNodes: Array.from(shapingMap.values()).map((s) => ({
      id: s.id,
      label: s.label,
      summary: s.summary,
      params: s.params,
      triggeredBy: s.triggeredBy.join("、"),
    })),
    compatibleLinks,
  };
}

/**
 * 检测客户原话中提出但“工艺上做不出来/结构冲突”的设计诉求，
 * 由工艺图谱校验 Agent 自动过滤并记录拦截依据。
 */
function detectFilteredInfeasibleRequests(
  customerText: string,
  contextIds: string[],
  selectedPatternId?: string,
  selectedFabricId?: string
): CraftKgConflict[] {
  const filtered: CraftKgConflict[] = [];
  const wantsHighCollar =
    /(?:高立领|高领|4\s*cm.{0,3}立领|领子做高)/.test(customerText) &&
    !/(?:不要|不能|别|不做|怕|避开).{0,6}(?:高立领|高领)/.test(customerText);

  if (wantsHighCollar && contextIds.includes("CTX-QIPAO-STAND")) {
    const edge = CRAFT_KG_EDGES.find((e) => e.id === "EDGE-C01");
    if (edge) filtered.push(edgeToConflict(edge));
  } else if (wantsHighCollar && contextIds.includes("CTX-SHORT-NECK")) {
    const edge = CRAFT_KG_EDGES.find((e) => e.id === "EDGE-C02");
    if (edge) filtered.push(edgeToConflict(edge));
  }

  if (
    /香云纱/.test(customerText) &&
    contextIds.includes("CTX-WASHABLE") &&
    selectedFabricId !== "FAB-SF-02"
  ) {
    const edge = CRAFT_KG_EDGES.find((e) => e.id === "EDGE-C05");
    if (edge) filtered.push(edgeToConflict(edge));
  }

  if (
    /宋锦/.test(customerText) &&
    contextIds.includes("CTX-WASHABLE") &&
    selectedFabricId !== "FAB-SF-01"
  ) {
    const edge = CRAFT_KG_EDGES.find((e) => e.id === "EDGE-C06");
    if (edge) filtered.push(edgeToConflict(edge));
  }

  if (
    /针织/.test(customerText) &&
    /(?:铜丝|刮浆|流苏).{0,4}盘扣|盘扣.{0,4}流苏/.test(customerText)
  ) {
    const edge = CRAFT_KG_EDGES.find((e) => e.id === "EDGE-C03");
    if (edge) filtered.push(edgeToConflict(edge));
  }

  if (
    /亮面?缎|真丝缎/.test(customerText) &&
    /马头墙|阶梯.{0,4}拼接|直角拼接/.test(customerText) &&
    selectedPatternId !== "PAT-SF-05"
  ) {
    const edge = CRAFT_KG_EDGES.find((e) => e.id === "EDGE-C04");
    if (edge) filtered.push(edgeToConflict(edge));
  }

  return filtered;
}

export function validateDesignAgainstKG(
  input: CraftValidationInput,
  directions?: DesignDirectionOption[]
): CraftKgValidationReport {
  const contextIds = detectContextNodeIds(input);
  const collarId = inferCollarNodeId(input.patternId, input.collarText, input.customerText);
  const primaryRes = testCraftCombination({
    contextIds,
    patternId: input.patternId,
    collarId,
    fabricId: input.fabricId,
    craftId: input.craftId,
  });

  const filteredRequests = detectFilteredInfeasibleRequests(
    input.customerText,
    contextIds,
    input.patternId,
    input.fabricId
  );

  // 对三个方向也分别做一次图谱体检，统计已过滤/通过情况
  const directionStatuses = (directions ?? []).map((d) => {
    const dirCollar = inferCollarNodeId(d.patternId, d.collarAndCraftDiff, input.customerText);
    const res = testCraftCombination({
      contextIds,
      patternId: d.patternId,
      collarId: dirCollar,
      fabricId: d.fabricId,
      craftId: d.craftId,
    });
    return {
      directionId: d.id,
      passed: res.passed,
      blockedCount: res.blocked.length,
      cautionCount: res.cautions.length,
    };
  });

  const allBlocked = [...primaryRes.blocked];
  for (const fr of filteredRequests) {
    if (!allBlocked.some((b) => b.edgeId === fr.edgeId)) {
      allBlocked.push(fr);
    }
  }

  return {
    passed: primaryRes.blocked.length === 0,
    checkedNodesCount: primaryRes.activeNodeIds.length,
    activeNodeIds: primaryRes.activeNodeIds,
    blockedConflicts: primaryRes.blocked,
    filteredInfeasibleRequests: filteredRequests,
    cautions: primaryRes.cautions,
    requiredShaping: primaryRes.shapingNodes,
    directionStatuses,
    summary:
      primaryRes.blocked.length > 0
        ? `图谱拦截 ${primaryRes.blocked.length} 处不可制造冲突，请按替代工艺调整`
        : filteredRequests.length > 0
        ? `已自动过滤 ${filteredRequests.length} 项不可制造诉求，并绑定 ${primaryRes.shapingNodes.length} 项归拔工艺`
        : `通过海派工艺图谱校验（激活 ${primaryRes.activeNodeIds.length} 节点，绑定 ${primaryRes.shapingNodes.length} 项归拔工艺）`,
  };
}

export function getConnectedEdges(nodeId: string): {
  outgoing: { edge: KGEdge; target: KGNode }[];
  incoming: { edge: KGEdge; source: KGNode }[];
} {
  const outgoing: { edge: KGEdge; target: KGNode }[] = [];
  const incoming: { edge: KGEdge; source: KGNode }[] = [];
  for (const edge of CRAFT_KG_EDGES) {
    if (edge.from === nodeId) {
      const target = KG_NODE_BY_ID.get(edge.to);
      if (target) outgoing.push({ edge, target });
    }
    if (edge.to === nodeId) {
      const source = KG_NODE_BY_ID.get(edge.from);
      if (source) incoming.push({ edge, source });
    }
  }
  return { outgoing, incoming };
}
