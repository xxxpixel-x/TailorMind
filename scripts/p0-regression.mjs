import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(rootDir, "src", specifier.slice(2) + ".ts");
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { runLiangYiAgent } = await import(
  pathToFileURL(path.join(rootDir, "src/lib/agent-engine.ts")).href
);
const { CASE_KB } = await import(
  pathToFileURL(path.join(rootDir, "src/data/kb-cases.ts")).href
);

let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log("  [PASS]", msg);
  } else {
    console.error("  [FAIL]", msg);
    failed++;
  }
}

console.log("========================================");
console.log("P0 验收 1：婚礼旗袍外搭原话实测");
console.log("========================================");
const s1 =
  "我女儿下个月结婚，我想做一件穿在旗袍外面的外套，酒红色。我有点驼背，手臂也粗，想遮一下，但别太老气。";
const r1 = (await runLiangYiAgent({ mode: "bespoke", conversation: [{ role: "advisor", content: s1 }] })).plan;
console.log("  输入:", s1);
console.log("  引擎:", r1.modelUsed);
console.log(
  "  抽出的需求:",
  r1.requirements.map((x) => `${x.index}.${x.rawPhrase}[${x.status}|归属:${x.ownerRole}${x.needsMasterApproval ? "|待制版师核准" : ""}]`).join(" ; ")
);
console.log("  八项色彩:", r1.eightFields.color, "| 品类:", r1.eightFields.category, "| 领型:", r1.eightFields.collar);
console.log("  追问:", r1.followUpQuestions.map((q) => q.question).join(" / "));
console.log("  三个方向:", r1.proposal.directions.map((d) => `${d.tag} ${d.title} (${d.bullets.join("，")})`).join(" | "));
console.log("  核对器:", `allPassed=${r1.verification.allPassed}, 已落实=${r1.verification.passedCount}, 推断=${r1.verification.inferredCount}, 待追问=${r1.verification.pendingAskCount}, 未处理短句=${r1.verification.unhandledClauseCount}`);

const reqBlob1 = r1.requirements.map((x) => `${x.rawPhrase} ${x.sourceSpan}`).join(" ");
assert(/婚礼|结婚/.test(reqBlob1), "需求覆盖「婚礼」");
assert(/旗袍/.test(reqBlob1), "需求覆盖「旗袍外搭」");
assert(/酒红/.test(reqBlob1), "需求覆盖「酒红」");
assert(/驼背/.test(reqBlob1), "需求覆盖「驼背」");
assert(/手臂.{0,3}粗/.test(reqBlob1), "需求覆盖「手臂粗」");
assert(/老气/.test(reqBlob1), "需求覆盖「别老气」");
assert(r1.eightFields.color.includes("酒红"), "八项【色彩】锁定酒红");
assert(r1.eightFields.category.includes("旗袍"), "八项【品类】识别为旗袍外搭短外套");
assert(r1.followUpQuestions.some((q) => q.question.includes("旗袍") && q.question.includes("领")), "追问包含「旗袍是什么领」");
assert(r1.followUpQuestions.length <= 3, "追问数量不超过 3 个");
assert(r1.verification.allPassed === false, "存在待追问项时核对器不误报全部通过");
assert(r1.verification.unhandledClauseCount === 0, "原话所有短句均已被需求覆盖（无漏抽）");
const dirBlob1 = r1.proposal.directions.map((d) => `${d.title} ${d.bullets.join(" ")}`).join(" ");
assert(!/正式会议|日常商务|羊绒衫/.test(dirBlob1), "三个方向无无关商务套话");
const nonBodyMasterWrong = r1.requirements.filter(
  (r) => (r.category === "场合礼仪" || r.category === "审美风格") && (r.ownerRole === "制版师" || r.needsMasterApproval)
);
assert(nonBodyMasterWrong.length === 0, "场合与审美条目未错误归属制版师");
const bodyMasterRight = r1.requirements.filter((r) => /驼背|手臂/.test(r.rawPhrase));
assert(bodyMasterRight.every((r) => r.ownerRole === "制版师" && r.needsMasterApproval === true), "驼背与手臂粗正确归属制版师且标待制版师核准");

// P0-2 漏抽告警反向测试
const s1Leak = s1 + "另外我预算不能超过两千块。";
const r1Leak = (await runLiangYiAgent({ mode: "bespoke", conversation: [{ role: "advisor", content: s1Leak }] })).plan;
assert(r1Leak.verification.unhandledClauseCount >= 1 && r1Leak.verification.allPassed === false, "P0-2 反向测试：附加未覆盖短句「另外我预算不能超过两千块」触发未处理标红告警");

console.log("\n========================================");
console.log("P0 验收 2：换说法测试");
console.log("========================================");
const s2 = "我想要红一点的，酒红那种，胳膊有点粗，背有点驼。";
const r2 = (await runLiangYiAgent({ mode: "bespoke", conversation: [{ role: "advisor", content: s2 }] })).plan;
console.log("  输入:", s2);
console.log("  八项色彩:", r2.eightFields.color);
console.log("  命中规则:", r2.requirements.map((x) => `${x.rawPhrase}(${x.ruleOrAssetId || "-"})`).join(" ; "));
assert(r2.eightFields.color.includes("酒红"), "识别「我想要红一点的，酒红那种」→ 酒红");
assert(r2.requirements.some((x) => x.ruleOrAssetId === "RULE-GEN-02"), "识别「胳膊有点粗」→ RULE-GEN-02");
assert(r2.requirements.some((x) => x.ruleOrAssetId === "RULE-GEN-01"), "识别「背有点驼」→ RULE-GEN-01");

console.log("\n========================================");
console.log("P0 验收 3：没提颜色测试");
console.log("========================================");
const s3 = "想做一件中式外套，脖子短不能太高，有点肚腩喜欢宽松。";
const r3 = (await runLiangYiAgent({ mode: "bespoke", conversation: [{ role: "advisor", content: s3 }] })).plan;
console.log("  输入:", s3);
console.log("  八项色彩:", r3.eightFields.color);
console.log("  追问:", r3.followUpQuestions.map((q) => q.question).join(" / "));
assert(r3.eightFields.color === "无特殊需求", "没提颜色时八项【色彩】为「无特殊需求」");
assert(r3.followUpQuestions.some((q) => q.question.includes("颜色")), "没提颜色时生成颜色追问");

console.log("\n========================================");
console.log("P0 验收 4：上服 6 个官方真实案例回归测试");
console.log("========================================");
const official6 = CASE_KB.slice(0, 6);
const caseChecks = [
  (ef) =>
    ef.category.includes("外套") &&
    /H\s*型/.test(ef.structure) &&
    /无收腰/.test(ef.structure) &&
    /低立领/.test(ef.collar) &&
    /3cm/.test(ef.collar) &&
    ef.color === "无特殊需求" &&
    /臀中/.test(ef.lengthRatio) &&
    /腹/.test(ef.easeAllowance),
  (ef) =>
    ef.category.includes("外套") &&
    /微.*收腰/.test(ef.structure) &&
    /青果/.test(ef.collar) &&
    /宋锦/.test(ef.fabric) &&
    ef.color === "无特殊需求" &&
    /梅花|植物/.test(ef.patternCraft) &&
    /臀中/.test(ef.lengthRatio),
  (ef) =>
    /两件式|套装/.test(ef.category) &&
    /A\s*摆/.test(ef.structure) &&
    /斜襟/.test(ef.collar) &&
    /缎面/.test(ef.fabric) &&
    /亮粉|米白/.test(ef.color) &&
    /脚踝/.test(ef.lengthRatio) &&
    /抬臂|坐奏/.test(ef.easeAllowance),
  (ef) =>
    ef.category.includes("外套") &&
    /自然落肩/.test(ef.structure) &&
    /低立领/.test(ef.collar) &&
    /3cm/.test(ef.collar) &&
    /香云纱/.test(ef.fabric) &&
    ef.color === "无特殊需求" &&
    /腹/.test(ef.easeAllowance),
  (ef) =>
    ef.category.includes("外套") &&
    /微落平肩/.test(ef.structure) &&
    /低立领/.test(ef.collar) &&
    /针织/.test(ef.fabric) &&
    ef.color.includes("撞色") &&
    /徽派/.test(ef.patternCraft) &&
    /臀中/.test(ef.lengthRatio),
  (ef) =>
    ef.category.includes("外套") &&
    /微落平肩/.test(ef.structure) &&
    /交领/.test(ef.collar) &&
    /无立领/.test(ef.collar) &&
    /真丝/.test(ef.fabric) &&
    ef.color === "无特殊需求" &&
    /肩背|袖管/.test(ef.easeAllowance),
];

for (let i = 0; i < 6; i++) {
  const c = official6[i];
  const res = (
    await runLiangYiAgent({
      mode: "bespoke",
      conversation: [{ role: "advisor", content: c.customerRawQuote }],
    })
  ).plan;
  const ok = caseChecks[i](res.eightFields);
  console.log(`  [${c.id}] 领型:${res.eightFields.collar} | 面料:${res.eightFields.fabric.slice(0, 18)} | 色彩:${res.eightFields.color}`);
  assert(ok, `${c.id}（案例${i + 1}）八项关键点与上服官方转化一致`);
}

console.log("\n========================================");
console.log("P0 验收 5：团体职业服示例（陆家嘴私行 35 人）");
console.log("========================================");
const s5 =
  "上海陆家嘴私人银行 35 名员工（5位高管、22位男女理财顾问、8位贵宾迎宾），想要海派职业装。品牌色深海藏青配香槟金，不要胸前大Logo像工服；员工久坐必须抗皱耐打理、后续补单无色差，有5位宽肩或偏胖同事需要照顾。";
const r5 = (await runLiangYiAgent({ mode: "uniform", conversation: [{ role: "advisor", content: s5 }] })).plan;
console.log("  输入:", s5);
console.log("  品类:", r5.eightFields.category, "| 色彩:", r5.eightFields.color);
console.log("  三级岗位:", r5.proposal.uniformTiers?.map((t) => t.tierName).join(" / "));
assert(r5.mode === "uniform", "团体职业服模式正常识别");
assert(r5.eightFields.color.includes("深海藏青") && r5.eightFields.color.includes("香槟金"), "锁定深海藏青与香槟金");
assert((r5.proposal.uniformTiers?.length || 0) === 3, "生成三级岗位同源矩阵");
assert((r5.ledger.uniformSizeTable?.length || 0) >= 2, "生成团装号型与特体归档表");

console.log("\n========================================");
console.log(failed === 0 ? "ALL P0 ACCEPTANCE CHECKS PASSED!" : `FAILED COUNT: ${failed}`);
console.log("========================================");
process.exit(failed === 0 ? 0 : 1);
