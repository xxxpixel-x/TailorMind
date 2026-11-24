import { BODY_TAILORING_RULES } from "@/data/kb-body-rules";
import { CRAFT_KB } from "@/data/kb-crafts";
import { FABRIC_KB } from "@/data/kb-fabrics";
import { PATTERN_KB } from "@/data/kb-patterns";
import { validateDesignAgainstKG } from "@/lib/craft-kg-validator";
import type {
  DesignDirectionOption,
  LiangYiPlanPackage,
  PatternRoomTechPack,
  TechPackBomItem,
  TechPackMeasurementRow,
} from "@/lib/types";

export function buildPatternRoomTechPack(
  pkg: Pick<
    LiangYiPlanPackage,
    "mode" | "customerInput" | "requirements" | "eightFields" | "proposal" | "ledger" | "kgValidation"
  >,
  overrideDirection?: DesignDirectionOption
): PatternRoomTechPack {
  const dir =
    overrideDirection ||
    pkg.proposal.directions.find((d) => d.id === pkg.proposal.selectedDirectionId) ||
    pkg.proposal.directions[0];

  const pattern =
    PATTERN_KB.find((p) => p.id === dir?.patternId) ||
    PATTERN_KB.find((p) => p.id === pkg.ledger.selectedPatternIds[0]) ||
    PATTERN_KB[0];

  const fabric =
    FABRIC_KB.find((f) => f.id === dir?.fabricId) ||
    FABRIC_KB.find((f) => f.id === pkg.ledger.selectedFabricIds[0]) ||
    FABRIC_KB[0];

  const craft =
    CRAFT_KB.find((c) => c.id === dir?.craftId) ||
    CRAFT_KB.find((c) => c.id === pkg.ledger.selectedCraftIds[0]);

  // 针对当前选定方向实时执行一次海派工艺图谱校验，获取精准的归拔工艺与禁忌
  const kgReport = validateDesignAgainstKG(
    {
      customerText: pkg.customerInput,
      collarText: pkg.eightFields.collar,
      patternId: pattern.id,
      fabricId: fabric.id,
      craftId: craft?.id,
      mode: pkg.mode,
      requirements: pkg.requirements,
    },
    pkg.proposal.directions
  );

  // 1. 构造关键部位量体与放量基准表
  const measurementSpecs: TechPackMeasurementRow[] = [];
  const addedParts = new Set<string>();

  const pushMeasure = (row: TechPackMeasurementRow) => {
    if (addedParts.has(row.part)) return;
    addedParts.add(row.part);
    measurementSpecs.push(row);
  };

  for (const req of pkg.requirements) {
    const rule = req.ruleOrAssetId
      ? BODY_TAILORING_RULES.find((r) => r.id === req.ruleOrAssetId)
      : undefined;
    if (!rule) continue;

    if (rule.id === "RULE-GEN-01") {
      pushMeasure({
        part: "后腰节长 / 后背宽",
        easeRule: "后衣片加长、后背宽加放（防前长后吊），后领贴合不空鼓",
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "净体差值 ____ cm / 放量 ____ cm",
      });
    } else if (rule.id === "RULE-GEN-02") {
      pushMeasure({
        part: "上臂围 / 大袖肥 / 袖长",
        easeRule: `${dir?.commandEdits?.sleeveLength || "直筒长/九分袖"}，袖肥与袖笼加放`,
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "臂围 ____ cm / 袖肥 ____ cm / 袖长 ____ cm",
      });
    } else if (rule.id === "RULE-SF-01") {
      pushMeasure({
        part: "净颈围 / 领高 / 前领深",
        easeRule: "低立领高 ≤ 3.0cm，前领窝微降 0.6–0.8cm 防卡喉",
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "颈围 ____ cm / 成品领高 ____ cm",
      });
    } else if (rule.id === "RULE-SF-03") {
      pushMeasure({
        part: "站姿与坐姿腹围 / 前衣长",
        easeRule: "H 型无收腰，前腹动态松量 +4~6cm，前衣长微补偿 +0.8cm",
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "坐姿腹围 ____ cm / 成品胸腹围 ____ cm",
      });
    } else if (rule.id === "RULE-SF-04") {
      pushMeasure({
        part: "肩斜度 / 落肩量",
        easeRule: "自然落肩（落肩量 2.5–3.0cm），不加厚硬垫肩",
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "肩斜 ____ ° / 成品总肩宽 ____ cm",
      });
    } else if (rule.id === "RULE-SF-05") {
      pushMeasure({
        part: "后背宽 / 袖笼深 / 抱臂量",
        easeRule: "后背宽加放 1.5cm、袖笼下挖 1.2cm、袖肥加放 2.0cm",
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "背宽 ____ cm / 袖笼深 ____ cm",
      });
    } else if (rule.id === "RULE-SF-06") {
      pushMeasure({
        part: "抬臂袖笼余量 / 袖山高",
        easeRule: "袖山略降 1.2cm、袖笼与袖管放量，抬手敬酒/演奏衣身不吊",
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "袖山高 ____ cm / 抬臂测试 □通过",
      });
    } else if (rule.id === "RULE-GEN-04") {
      pushMeasure({
        part: "净身高 / 成品后中衣长",
        easeRule: "衣长严格控制在臀围线以上，提高视觉腰线",
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "净身高 ____ cm / 成品衣长 ____ cm",
      });
    } else if (rule.id === "RULE-GEN-08") {
      pushMeasure({
        part: "内搭旗袍腰线位 / 领口避让距",
        easeRule: "衣长盖过旗袍腰线、露出下摆；外套领口避开内搭立领",
        sourceRuleId: rule.id,
        masterNote: rule.masterConfirmNote,
        actualValuePlaceholder: "旗袍腰节 ____ cm / 外套衣长 ____ cm",
      });
    }
  }

  // 基础通用量体项保底
  pushMeasure({
    part: "净胸围 / 成品胸围",
    easeRule: pkg.eightFields.easeAllowance,
    sourceRuleId: pattern.id,
    masterNote: "按海派松弛余量基准核定胸围加放，白坯初样试穿确认",
    actualValuePlaceholder: "净胸 ____ cm / 成品胸 ____ cm",
  });
  pushMeasure({
    part: "成品衣长 / 袖长",
    easeRule: dir?.sheetLengthRatio || pkg.eightFields.lengthRatio,
    sourceRuleId: pattern.id,
    masterNote: "结合客户常穿鞋跟高度与内搭层次确定最终止口",
    actualValuePlaceholder: "衣长 ____ cm / 袖长 ____ cm",
  });

  // 2. 构造面辅料 BOM 清单
  const bomItems: TechPackBomItem[] = [
    {
      role: "主料",
      name: fabric.name,
      spec: `${fabric.composition} ｜ 克重 ${fabric.weightRange} ｜ 色彩：${pkg.eightFields.color}`,
      careOrProcessNote: `${fabric.careInstruction}（${fabric.crispnessLevel}）`,
      assetId: fabric.id,
    },
    {
      role: "里布",
      name: pkg.mode === "uniform" ? "防静电高密斜纹宾霸里布" : "16 姆米真丝双绉 / 素缎全里布",
      spec: pkg.mode === "uniform" ? "耐磨透气、永久抗静电，同主料顺色" : "顺滑防钩挂，与主料同色系（外搭旗袍防摩擦）",
      careOrProcessNote: "裁剪前须与主料同条件预缩测试，防止里外缩率差起吊",
    },
    {
      role: "衬布",
      name:
        /香云纱|桑蚕丝|宋锦/.test(fabric.name)
          ? "超轻薄真丝专用无纺微点粘合衬（软回弹）"
          : "中薄有纺黑炭衬 / 领座软回弹衬",
      spec: "用于领面、门襟贴边、袖口折边与阶梯转角加固",
      careOrProcessNote: "严禁使用过硬树脂衬导致海派领座生硬卡脖或渗胶",
    },
  ];

  if (craft) {
    bomItems.push({
      role: "工艺辅料",
      name: craft.name,
      spec: craft.visualEffect,
      careOrProcessNote: craft.cadTechPoints,
      assetId: craft.id,
    });
  }

  // 3. 版房质检红线（融合体型禁忌与图谱过滤结论）
  const qcRedlines = Array.from(
    new Set([
      ...pkg.requirements
        .map((r) => BODY_TAILORING_RULES.find((b) => b.id === r.ruleOrAssetId)?.taboo)
        .filter((t): t is string => Boolean(t)),
      ...kgReport.blockedConflicts.map((c) => `【图谱拦截】${c.pathText}：${c.alternativeHint}`),
      ...kgReport.filteredInfeasibleRequests.map((c) => `【已过滤禁忌】${c.pathText}：${c.alternativeHint}`),
      ...kgReport.cautions.map((c) => `【工艺警示】${c.pathText}：${c.alternativeHint}`),
      pattern.usageNotes,
    ])
  );

  return {
    techPackNo: `${pkg.ledger.ledgerNo}-TP`,
    garmentTitle: dir?.title || pkg.proposal.proposalTitle,
    patternId: pattern.id,
    patternName: pattern.name,
    cadStandard: "上服富怡 / ET 工业 CAD 标准（1:5 制版基准）",
    cadPieces: pattern.cadPieces,
    seamAllowanceSpec: pattern.seamAllowanceSpec,
    collarSpec: pkg.eightFields.collar,
    shoulderSpec: pattern.shoulderSpec,
    lengthSpec: dir?.sheetLengthRatio || pkg.eightFields.lengthRatio,
    measurementSpecs,
    shapingInstructions:
      kgReport.requiredShaping.length > 0
        ? kgReport.requiredShaping
        : [
            {
              id: "SHP-STD",
              label: "海派常规分缝归拔整烫",
              summary: "领口、肩缝与袖山按面料耐温分缝烫平，保持海派挺而不硬的自然廓形。",
              params: ["按面料纤维控温", "垫水布防极光"],
              triggeredBy: pattern.name,
            },
          ],
    bomItems,
    craftTechPoints: craft?.cadTechPoints || "按海派常规精做工艺执行，门襟与底摆暗缲针无明线。",
    qcRedlines,
    masterSignOffNote:
      "本工艺单已由「版房工艺单 Agent」基于海派母版与工艺知识图谱自动生成，净体实测尺寸、最终放码数值及实物色卡由制版师与顾问复核签字后直接投产打样。",
  };
}
