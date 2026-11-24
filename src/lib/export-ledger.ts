import * as XLSX from "xlsx";
import { LiangYiPlanPackage, WorkflowStage } from "@/lib/types";
import { buildPatternRoomTechPack } from "@/lib/tech-pack-builder";
import { currentDirection, ledgerStatus, modeLabel, pendingAsks, reqStatus } from "@/lib/workbench-orders";

const STAGE_LABELS: Record<WorkflowStage, string> = {
  1: "1. 设计语言转化",
  2: "2. 设计图企划",
  3: "3. 选面料确认",
  4: "4. CAD版型设计",
  5: "5. 样衣打样试穿",
  6: "6. 成衣品控交付",
};

export function exportFullWorkbookXlsx(pkg: LiangYiPlanPackage) {
  const wb = XLSX.utils.book_new();
  const ledger = pkg.ledger;

  // Sheet 1: 业务台账主表
  const sheet1Rows = [
    ["上服集团 ·「衣语 TailorMind」海派定制业务专题台账", ""],
    ["边界声明", pkg.proposal.humanBoundaryNotice],
    ["", ""],
    ["台账单号", ledger.ledgerNo],
    ["项目名称", ledger.projectName],
    ["业务模式", ledger.mode === "uniform" ? "团体职业服定制" : "海派高级私定"],
    ["客户 / 企业名称", ledger.clientOrOrgName],
    ["对接部门 / 顾问", ledger.contactDeptOrPerson],
    ["定制规模 / 数量", ledger.headcountOrQty],
    ["当前工作流节点", STAGE_LABELS[ledger.currentStage]],
    ["人工审核状态", ledger.reviewStatus],
    ["上报状态", ledgerStatus(pkg)],
    ["负责业务专员", ledger.specialistName],
    ["创建时间", ledger.createdAt],
    ["最后更新时间", ledger.updatedAt],
    ["", ""],
    ["累计客户诉求", pkg.customerInput],
    ["锁定版型母版编号", ledger.selectedPatternIds.join(", ")],
    ["锁定面料资产编号", ledger.selectedFabricIds.join(", ")],
    ["锁定海派工艺编号", ledger.selectedCraftIds.join(", ")],
    ["参考历史案例编号", ledger.referenceCaseIds.join(", ")],
    ["预算档位参考(人工核价)", ledger.estimatedTierNote],
    ["量体与试穿核对备忘", ledger.fittingMemo],
    ["预计参考周期", pkg.proposal.feasibilityAlerts.leadTimeEstimate],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
  ws1["!cols"] = [{ wch: 24 }, { wch: 88 }];
  XLSX.utils.book_append_sheet(wb, ws1, "01_业务专题台账主表");

  // Sheet 2: 需求落实对照表 + 六维信息完整度 + 八项设计语言转化
  const dims = Object.values(pkg.sixDimensions);
  const sheet2Rows: (string | number)[][] = [
    ["一、客户需求逐条落实对照表（你说了什么 → 怎么做 → 为什么 → 核验状态）", "", "", "", "", ""],
    ["编号", "客户原话", "类别", "硬/软要求", "对应做法", "核验状态与依据"],
    ...pkg.requirements.map((r) => [
      r.id,
      r.rawPhrase,
      r.category,
      r.isHardRequirement ? `硬要求(P${r.priority})` : `软建议(P${r.priority})`,
      r.solutionAction,
      `[${reqStatus(r, pendingAsks(pkg).asked)}] ${r.rationale}`,
    ]),
    ["", "", "", "", "", ""],
    ["二、上服标准八项设计语言转化表", "", "", "", "", ""],
    ["标准字段", "转化内容", "", "", "", ""],
    ["【品类】", pkg.eightFields.category, "", "", "", ""],
    ["【版型结构】", pkg.eightFields.structure, "", "", "", ""],
    ["【领型】", pkg.eightFields.collar, "", "", "", ""],
    ["【面料】", pkg.eightFields.fabric, "", "", "", ""],
    ["【色彩】", pkg.eightFields.color, "", "", "", ""],
    ["【装饰纹样】", pkg.eightFields.patternCraft, "", "", "", ""],
    ["【长度比例】", pkg.eightFields.lengthRatio, "", "", "", ""],
    ["【松弛余量】", pkg.eightFields.easeAllowance, "", "", "", ""],
    ["", "", "", "", "", ""],
    ["三、六大维度信息明确度评估", "", "", "", "", ""],
    ["维度名称", "信息明确度", "关键词", "解构分析", "", ""],
    ...dims.map((d) => [d.dimensionName, `${d.completeness}%`, d.keywords.join(" / "), d.analysis, "", ""]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
  ws2["!cols"] = [{ wch: 16 }, { wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 46 }, { wch: 44 }];
  XLSX.utils.book_append_sheet(wb, ws2, "02_需求对照与八项转化");

  // Sheet 3: 资产与规则匹配 + 三方向审美方案
  const sheet3Rows: (string | number)[][] = [
    ["一、集团资产与体型规则匹配明细", "", "", "", "", ""],
    ["编号", "名称", "类别", "风格适配", "体感适配", "体型/岗位适配"],
    ...pkg.assetMatches.map((m) => [
      m.assetId,
      m.assetName,
      m.assetType,
      m.styleFit,
      m.tactileFit,
      m.bodyOrRoleFit,
    ]),
    ["", "", "", "", "", ""],
    ["二、供客户挑选的多方向审美方案（均满足全部硬要求）", "", "", "", "", ""],
    ["方向", "风格定位", "款式做法", "领型与亮点差异", "克制美学依据", "硬需求保障"],
    ...pkg.proposal.directions.map((d) => [
      `${d.tag} · ${d.title}`,
      d.positioning,
      d.garmentSummary,
      d.collarAndCraftDiff,
      d.restraintNote,
      d.hardReqGuarantee,
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
  ws3["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 32 }, { wch: 32 }, { wch: 32 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, ws3, "03_资产匹配与多方向方案");

  // Sheet 4: AI 视觉企划四分镜提示词包
  const sheet4Rows: string[][] = [
    ["视窗编号", "中文标题", "英文标识", "豆包/即梦中文提示词", "Midjourney v6 英文提示词", "负面排除词", "镜头与布光"],
    ...pkg.visualSlots.map((s) => [
      s.slotId,
      s.titleCn,
      s.titleEn,
      s.seedreamPromptCn,
      s.midjourneyPromptEn,
      s.negativePrompt,
      s.cameraLightingSpec,
    ]),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows);
  ws4["!cols"] = [
    { wch: 16 },
    { wch: 26 },
    { wch: 26 },
    { wch: 58 },
    { wch: 58 },
    { wch: 30 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws4, "04_AI视觉提示词包");

  // Sheet 5: 全流程留痕与团装号型归档
  const sheet5Rows: (string | number)[][] = [
    ["一、全流程业务与Agent操作审计留痕", "", "", ""],
    ["时间戳", "执行主体", "动作类型", "详细记录"],
    ...ledger.auditLogs.map((l) => [l.timestamp, l.actor, l.action, l.detail]),
  ];

  if (ledger.uniformSizeTable && ledger.uniformSizeTable.length > 0) {
    sheet5Rows.push(
      ["", "", "", ""],
      ["二、团体职业服多岗位号型分布与特体员工放量归档表", "", "", ""],
      ["岗位层级组", "性别款式", "国标号型分布", "特体微调人数及放量备注"],
      ...ledger.uniformSizeTable.map((r) => [
        r.roleGroup,
        r.gender,
        r.standardSizes,
        `特体 ${r.specialFitCount} 人：${r.specialFitNotes}`,
      ])
    );
  }

  const ws5 = XLSX.utils.aoa_to_sheet(sheet5Rows);
  ws5["!cols"] = [{ wch: 24 }, { wch: 22 }, { wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws5, "05_流程留痕与号型归档");

  // Sheet 6: 直达版房工艺单（Tech Pack）
  const tp = buildPatternRoomTechPack(pkg);
  const sheet6Rows: (string | number)[][] = [
    ["衣语 TailorMind · 直达版房工艺单（Tech Pack）", "", "", ""],
    ["工艺单号", tp.techPackNo, "制版标准", tp.cadStandard],
    ["成衣名称", tp.garmentTitle, "基准母版", `${tp.patternId} · ${tp.patternName}`],
    ["缝份规范", tp.seamAllowanceSpec, "领型/肩型", `${tp.collarSpec}；${tp.shoulderSpec}`],
    ["衣长与袖长止口", tp.lengthSpec, "工艺精做要点", tp.craftTechPoints],
    ["CAD 裁片清单", tp.cadPieces.join(" ｜ "), "", ""],
    ["", "", "", ""],
    ["一、关键部位量体与放量基准表", "", "", ""],
    ["部位", "放量与裁剪指令", "依据编号", "实测登记 / 制版师核验"],
    ...tp.measurementSpecs.map((m) => [m.part, m.easeRule, m.sourceRuleId, `${m.actualValuePlaceholder}（${m.masterNote}）`]),
    ["", "", "", ""],
    ["二、海派归拔与整烫工艺指令", "", "", ""],
    ["工艺编号", "工艺名称", "触发源", "工艺参数与执行要求"],
    ...tp.shapingInstructions.map((s) => [s.id, s.label, s.triggeredBy, `${s.summary} [${s.params.join(" / ")}]`]),
    ["", "", "", ""],
    ["三、面辅料 BOM 清单", "", "", ""],
    ["类别", "物料名称", "规格与配色", "版房处理与洗护说明"],
    ...tp.bomItems.map((b) => [b.role, b.assetId ? `${b.name} (${b.assetId})` : b.name, b.spec, b.careOrProcessNote]),
    ["", "", "", ""],
    ["四、版房质检红线与人工签核", "", "", ""],
    ...tp.qcRedlines.map((line, i) => [`红线 ${i + 1}`, line, "", ""]),
    ["签核声明", tp.masterSignOffNote, "", ""],
  ];
  const ws6 = XLSX.utils.aoa_to_sheet(sheet6Rows);
  ws6["!cols"] = [{ wch: 22 }, { wch: 36 }, { wch: 28 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, ws6, "06_版房工艺单");

  XLSX.writeFile(wb, `${ledger.ledgerNo}_${ledger.projectName}_专题业务台账.xlsx`);
}

export function exportLedgerRegisterXlsx(orders: LiangYiPlanPackage[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["台账号", "项目", "客户", "业务类型", "选定方向", "审核状态", "上报状态", "更新时间"],
    ...orders.map(p => [p.ledger.ledgerNo, p.ledger.projectName, p.ledger.clientOrOrgName, modeLabel(p.mode),
      p.ledger.directionConfirmed ? currentDirection(p)?.tag || "" : "待选择",
      p.ledger.reviewStatus, ledgerStatus(p), p.ledger.updatedAt]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [22, 36, 24, 16, 24, 16, 16, 24].map(wch => ({ wch }));
  XLSX.utils.book_append_sheet(wb, sheet, "业务台账");
  const logs = orders.flatMap(p => p.ledger.auditLogs.map(l => [p.ledger.ledgerNo, l.timestamp, l.actor, l.action, l.detail]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["台账号", "时间", "操作人", "动作", "详情"], ...logs]), "操作留痕");
  XLSX.writeFile(wb, "衣语_业务台账.xlsx");
}

export function exportLedgerCsv(pkg: LiangYiPlanPackage) {
  const l = pkg.ledger;
  const rows = [
    ["字段", "内容"],
    ["台账单号", l.ledgerNo],
    ["项目名称", l.projectName],
    ["业务模式", l.mode === "uniform" ? "团体职业服" : "海派高级私定"],
    ["客户/企业", l.clientOrOrgName],
    ["定制数量", l.headcountOrQty],
    ["当前阶段", STAGE_LABELS[l.currentStage]],
    ["审核状态", l.reviewStatus],
    ["上报状态", ledgerStatus(pkg)],
    ["负责顾问", l.specialistName],
    ["品类", pkg.eightFields.category],
    ["版型结构", pkg.eightFields.structure],
    ["领型", pkg.eightFields.collar],
    ["面料", pkg.eightFields.fabric],
    ["色彩", pkg.eightFields.color],
    ["装饰纹样", pkg.eightFields.patternCraft],
    ["长度比例", pkg.eightFields.lengthRatio],
    ["松弛余量", pkg.eightFields.easeAllowance],
    ["需求落实核验", (() => { const asks = pendingAsks(pkg); const n = (s: string) => pkg.requirements.filter(r => reqStatus(r, asks.asked) === s).length;
      return `已落实${n("已落实")} / 推断${n("推断")} / 待追问${asks.count} / 未处理短句${pkg.verification.unhandledClauseCount}`; })()],
    ["能力边界声明", pkg.proposal.humanBoundaryNotice],
  ];

  downloadCsv(l.ledgerNo + "_定制台账摘要.csv", rows);
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csvContent =
    "\uFEFF" +
    rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProposalAndVisualPackMarkdown(pkg: LiangYiPlanPackage) {
  const l = pkg.ledger;
  const md = `# ${pkg.proposal.proposalTitle}
> **台账单号**：\`${l.ledgerNo}\` ｜ **业务模式**：${
    l.mode === "uniform" ? "团体职业服企划" : "海派高级私定"
  } ｜ **当前阶段**：${STAGE_LABELS[l.currentStage]} ｜ **审核状态**：${l.reviewStatus}

---

## 一、客户需求逐条落实对照表
| 编号 | 客户原话 | 类别 | 硬/软要求 | 对应做法 | 状态与依据 |
| :--- | :--- | :--- | :--- | :--- | :--- |
${pkg.requirements
  .map(
    (r) =>
      `| ${r.id} | ${r.rawPhrase} | ${r.category} | ${
        r.isHardRequirement ? "硬要求" : "软建议"
      } | ${r.solutionAction} | ${reqStatus(r, pendingAsks(pkg).asked)}（${r.rationale}） |`
  )
  .join("\n")}

---

## 二、上服标准八项设计语言转化表
- **【品类】**：${pkg.eightFields.category}
- **【版型结构】**：${pkg.eightFields.structure}
- **【领型】**：${pkg.eightFields.collar}
- **【面料】**：${pkg.eightFields.fabric}
- **【色彩】**：${pkg.eightFields.color}
- **【装饰纹样】**：${pkg.eightFields.patternCraft}
- **【长度比例】**：${pkg.eightFields.lengthRatio}
- **【松弛余量】**：${pkg.eightFields.easeAllowance}

---

## 三、供客户挑选的三个审美方向（均锁定全部硬要求）
${pkg.proposal.directions
  .map(
    (d) => `### ${d.tag} · ${d.title}
- **卖点**：${d.bullets.join("；")}
- **克制原则**：${d.restraintNote}
- **硬要求保障**：${d.hardReqGuarantee}
`
  )
  .join("\n")}

---

## 四、定制视觉效果需求包（四分镜标准化 AI 提示词）
${pkg.visualSlots
  .map(
    (s, i) => `### ${i + 1}. ${s.titleCn} (${s.titleEn})
- **镜头与布光**：${s.cameraLightingSpec}
- **豆包/即梦中文提示词**：
  > ${s.seedreamPromptCn}
- **Midjourney v6 英文提示词**：
  > \`${s.midjourneyPromptEn}\`
- **负面排除词**：\`${s.negativePrompt}\`
`
  )
  .join("\n")}

---

## 五、人工终审与能力边界声明
> ${pkg.proposal.humanBoundaryNotice}
`;

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${l.ledgerNo}_海派定制企划方案与提示词包.md`;
  a.click();
  URL.revokeObjectURL(url);
}
