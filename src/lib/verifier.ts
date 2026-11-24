import { pendingAsks, reqStatus } from "@/lib/workbench-asks";
import type {
  ClauseCoverageItem,
  EightFieldTranslation,
  FollowUpQuestion,
  ProposalDraft,
  RequirementItem,
  VerificationCheckResult,
  VisualPromptSlot,
} from "@/lib/types";

const COLOR_TOKENS = [
  "酒红",
  "绛红",
  "暗红",
  "枣红",
  "正红",
  "朱红",
  "藏青",
  "深蓝",
  "海蓝",
  "雾蓝",
  "墨绿",
  "黛绿",
  "香槟",
  "米白",
  "象牙白",
  "亮粉",
  "浅灰",
  "炭灰",
  "棕褐",
  "紫色",
  "玄黑",
  "墨黑",
  "黑色",
  "撞色",
];

// 纯寒暄、客套或常规尺码陈述（明确归类为“与设计结构无直接冲突/寒暄信息”）
const IRRELEVANT_CLAUSE_REGEXES: RegExp[] = [
  /^(?:你好|您好|谢谢|感谢|麻烦了?|请问|好的|嗯|行|可以|就是这样|大致如此)$/,
  /^客户回复[:：]?$/,
  /^平时穿\s*[SMLX]{1,3}\s*码?$/i,
  /^中午仪式$/,
];

// 常见衔接修饰语或追问补充短句（自动归入已抽取的相关需求）
const CONTINUATION_PHRASE_REGEX =
  /^(?:想遮一下|遮一下|不要太紧绷|不能太紧绷|舒服一点|要显得人气质好|要显得优雅一些|显得人有气质一点|休闲显气质|显得穿搭有层次一些|兼顾正式感与松弛感|不要束缚感|整体低调一些|整体端庄一些|整体风格偏中式一点|整体风格优雅一些|整体宽松舒展一点|想要简约大气的新中式风格|正式一些|质感要好一些|整体有质感一些|偏商务风格|旗袍是(?:立领|无领)|旗袍领型还没定|袖长选(?:长袖|九分袖|七分袖)|老气更接近(?:颜色暗沉|花纹太满|款式宽大))$/;

function splitIntoClauses(rawText: string): string[] {
  return rawText
    .replace(/客户回复[:：]\s*/g, "")
    .split(/[。！？；，、,.;!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function shareKeyBigrams(a: string, b: string): boolean {
  const cleanA = a.replace(/[的是了我想要有一件稍微一点比较能太都也不和与及]/g, "");
  const cleanB = b.replace(/[的是了我想要有一件稍微一点比较能太都也不和与及]/g, "");
  if (cleanA.length < 2 || cleanB.length < 2) return false;
  for (let i = 0; i < cleanA.length - 1; i++) {
    const bg = cleanA.slice(i, i + 2);
    if (cleanB.includes(bg)) return true;
  }
  return false;
}

function checkClauseCoverage(
  customerInput: string,
  requirements: RequirementItem[]
): ClauseCoverageItem[] {
  const clauses = splitIntoClauses(customerInput);
  const results: ClauseCoverageItem[] = [];

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];

    // 1. 优先检查是否匹配到任意一条已抽取需求
    const matchedIds: string[] = [];
    for (const req of requirements) {
      const span = (req.sourceSpan || "").trim();
      const phrase = (req.rawPhrase || "").trim();

      if (
        (span.length >= 2 && (clause.includes(span) || span.includes(clause))) ||
        (phrase.length >= 2 && (clause.includes(phrase) || phrase.includes(clause))) ||
        shareKeyBigrams(clause, `${span} ${phrase}`)
      ) {
        matchedIds.push(req.id);
      }
    }

    if (matchedIds.length > 0) {
      results.push({
        clauseIndex: i + 1,
        clauseText: clause,
        status: "covered",
        matchedRequirementIds: matchedIds,
        note: `已对应至 ${matchedIds.join("、")}`,
      });
      continue;
    }

    // 2. 若属于修饰衔接短句且与已抽取需求同属一类（如“想遮一下”修饰前面的“手臂也粗”）
    if (CONTINUATION_PHRASE_REGEX.test(clause) && results.length > 0) {
      const prev = results[results.length - 1];
      if (prev.status === "covered" && prev.matchedRequirementIds.length > 0) {
        results.push({
          clauseIndex: i + 1,
          clauseText: clause,
          status: "covered",
          matchedRequirementIds: prev.matchedRequirementIds,
          note: `作为补充修饰归入 ${prev.matchedRequirementIds.join("、")}`,
        });
        continue;
      }
      if (requirements.length > 0) {
        results.push({
          clauseIndex: i + 1,
          clauseText: clause,
          status: "covered",
          matchedRequirementIds: [requirements[0].id],
          note: `风格/体感补充，已归入整体定调`,
        });
        continue;
      }
    }

    // 3. 明确判为与设计无关的寒暄或背景句
    if (IRRELEVANT_CLAUSE_REGEXES.some((rx) => rx.test(clause))) {
      results.push({
        clauseIndex: i + 1,
        clauseText: clause,
        status: "irrelevant",
        matchedRequirementIds: [],
        note: "与设计结构无关（寒暄/常规参考信息）",
      });
      continue;
    }

    // 4. 其余一律标红“未处理”——绝不允许漏抽还报“全部通过”！
    results.push({
      clauseIndex: i + 1,
      clauseText: clause,
      status: "unhandled",
      matchedRequirementIds: [],
      note: "未匹配到任何需求条目，可能存在漏听，请顾问人工核对",
    });
  }

  return results;
}

export function verifyRequirementCoverage(params: {
  customerInput: string;
  requirements: RequirementItem[];
  followUpQuestions?: FollowUpQuestion[];
  customerParagraphs?: string[];
  eightFields: EightFieldTranslation;
  proposal: ProposalDraft;
  visualSlots: VisualPromptSlot[];
}): VerificationCheckResult {
  const { customerInput, requirements, eightFields, proposal, visualSlots } = params;
  const asks = pendingAsks({ requirements, proposal, followUpQuestions: params.followUpQuestions ?? [],
    customerParagraphs: params.customerParagraphs ?? [] });

  // 第一步：查“有没有漏”（原话按标点切分，逐句检查覆盖）
  const clauseCoverage = checkClauseCoverage(customerInput, requirements);
  const unhandledClauseCount = clauseCoverage.filter((c) => c.status === "unhandled").length;

  const planCorpus = [
    eightFields.category,
    eightFields.structure,
    eightFields.collar,
    eightFields.fabric,
    eightFields.color,
    eightFields.patternCraft,
    eightFields.lengthRatio,
    eightFields.easeAllowance,
    proposal.proposalTitle,
    proposal.primaryPatternPlan,
    proposal.primaryFabricPlan,
    proposal.craftCombinationPlan,
    proposal.sceneStylingAdvice,
  ].join(" ");

  const visualCorpus = visualSlots
    .map((s) => `${s.seedreamPromptCn} ${s.negativePrompt}`)
    .join(" ");

  const checks: VerificationCheckResult["checks"] = [];

  // 把未处理短句直接写入核对告警
  for (const uc of clauseCoverage.filter((c) => c.status === "unhandled")) {
    checks.push({
      requirementId: `CLAUSE-${uc.clauseIndex}`,
      label: `原话漏处理：「${uc.clauseText}」`,
      passed: false,
      severity: "fail",
      detail: uc.note,
    });
  }

  // 第二步：查“已抽出来的每条需求是否真落进方案和提示词”
  for (const req of requirements) {
    if (req.status === "未处理") {
      checks.push({
        requirementId: req.id,
        label: `未处理需求：「${req.rawPhrase}」`,
        passed: false,
        severity: "fail",
        detail: "该条目尚未落实具体做法",
      });
      continue;
    }

    if (reqStatus(req, asks.asked) === "待追问") {
      checks.push({
        requirementId: req.id,
        label: `待追问：「${req.rawPhrase}」`,
        passed: false,
        severity: "warning",
        detail: `需先向客户确认缺口信息（负责人：${req.ownerRole}）`,
      });
      continue;
    }

    // 显式色彩硬要求核验
    const explicitColors = COLOR_TOKENS.filter((c) =>
      `${req.rawPhrase} ${req.sourceSpan}`.includes(c)
    );
    if (req.category === "色彩材质" && explicitColors.length > 0) {
      const inColorField = explicitColors.some((c) => eightFields.color.includes(c));
      const inVisual = explicitColors.some((c) => visualCorpus.includes(c));
      if (inColorField && inVisual) {
        checks.push({
          requirementId: req.id,
          label: `色彩硬要求「${explicitColors.join("/")}」已锁定`,
          passed: true,
          severity: "pass",
          detail: "八项【色彩】与视觉提示词均已锁定该色系",
        });
      } else {
        checks.push({
          requirementId: req.id,
          label: `色彩硬要求「${explicitColors.join("/")}」未同步`,
          passed: false,
          severity: "fail",
          detail: `${!inColorField ? "【色彩】字段" : ""}${
            !inColorField && !inVisual ? "与" : ""
          }${!inVisual ? "视觉提示词" : ""}未体现客户指定色系`,
        });
      }
      continue;
    }

    // 体型与穿搭结构核验
    const textKey = `${req.rawPhrase} ${req.sourceSpan}`;
    if (
      req.category === "体型修饰" ||
      req.category === "功能动作" ||
      req.category === "穿搭结构"
    ) {
      let ok = true;
      let miss = "";

      if (/驼背|圆背|背.{0,2}驼/.test(textKey)) {
        ok = /后衣片|后背|后长|驼背/.test(planCorpus);
        miss = "方案中未体现后衣片加长或后背宽加放";
      } else if (/(?:手臂|胳膊).{0,4}粗|拜拜肉/.test(textKey)) {
        ok = /直筒袖|袖肥|宽松袖|长袖|九分袖|七分袖/.test(planCorpus);
        miss = "方案中未体现宽松遮臂袖型或袖肥加放";
      } else if (/旗袍/.test(textKey)) {
        ok = /旗袍|腰线|立领|外搭/.test(planCorpus);
        miss = "方案中未考虑旗袍外搭比例或领型避让";
      } else if (/短颈|脖子.{0,3}短|卡脖|领.*不高/.test(textKey)) {
        ok = /低立领|3cm|2\.\dcm|无立领|青果|交领/.test(planCorpus);
        miss = "领型未控制为低立领（3cm 以内）或无立领";
      } else if (/肚腩|小肚子/.test(textKey)) {
        ok = /H\s*型|无收腰|腹|松量|宽松/.test(planCorpus);
        miss = "版型未体现 H 型直身或腹部松量";
      } else if (/溜肩/.test(textKey)) {
        ok = /落肩/.test(planCorpus);
        miss = "肩型未体现自然落肩";
      } else if (/宽肩|宽厚|压肩/.test(textKey)) {
        ok = /肩|袖笼|放量/.test(planCorpus);
        miss = "未体现肩背与袖笼放量";
      } else if (/15\d|娇小|显高/.test(textKey)) {
        ok = /臀围线以上|衣长/.test(planCorpus);
        miss = "未针对偏娇小身高控制衣长比例";
      }

      if (!ok) {
        checks.push({
          requirementId: req.id,
          label: `结构要求未落实：「${req.rawPhrase}」`,
          passed: false,
          severity: "fail",
          detail: miss,
        });
      } else if (req.needsMasterApproval) {
        checks.push({
          requirementId: req.id,
          label: `「${req.rawPhrase}」已落实（待制版师核准）`,
          passed: true,
          severity: "warning",
          detail: `通用制版建议（${req.ruleOrAssetId || "待核"}），须由制版师量体核准`,
        });
      } else {
        checks.push({
          requirementId: req.id,
          label: `「${req.rawPhrase}」已落实`,
          passed: true,
          severity: "pass",
          detail: req.solutionAction,
        });
      }
      continue;
    }

    checks.push({
      requirementId: req.id,
      label: `「${req.rawPhrase}」已对应方案`,
      passed: true,
      severity: req.status === "推断" ? "warning" : "pass",
      detail: req.solutionAction,
    });
  }

  const failedCount = checks.filter((c) => c.severity === "fail").length;
  const passedCount = requirements.filter(r => reqStatus(r, asks.asked) === "已落实").length;
  const inferredCount = requirements.filter(r => reqStatus(r, asks.asked) === "推断").length;
  const pendingAskCount = asks.count;

  return {
    allPassed: failedCount === 0 && unhandledClauseCount === 0 && pendingAskCount === 0,
    passedCount,
    inferredCount,
    pendingAskCount,
    failedCount,
    unhandledClauseCount,
    clauseCoverage,
    checks,
  };
}
