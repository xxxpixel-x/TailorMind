import type { BodyTailoringRule } from "@/data/kb-body-rules";
import { CASE_KB } from "@/data/kb-cases";
import { FABRIC_KB } from "@/data/kb-fabrics";
import { PATTERN_KB } from "@/data/kb-patterns";
import {
  AGENT_OPENAI_TOOLS,
  retrieveSimilarCasesTool,
  searchBodyRulesTool,
  searchCraftsTool,
  searchFabricsTool,
  searchPatternsTool,
} from "@/lib/kb-tools";
import { validateDesignAgainstKG } from "@/lib/craft-kg-validator";
import { buildPatternRoomTechPack } from "@/lib/tech-pack-builder";
import { verifyRequirementCoverage } from "@/lib/verifier";
import type {
  BusinessMode,
  CraftAsset,
  DesignDirectionOption,
  EightFieldTranslation,
  FabricAsset,
  FollowUpQuestion,
  HistoricalCaseAsset,
  HumanHandoffItem,
  LiangYiPlanPackage,
  PatternAsset,
  RequirementItem,
  ThreeDimMatchScore,
  ToolCallTraceStep,
  VisualPromptSlot,
} from "@/lib/types";

export interface CustomLlmConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  localOnly?: boolean;
}

export interface ConversationInputTurn {
  role: "advisor" | "agent";
  content: string;
}

export interface AgentRunResponse {
  plan: LiangYiPlanPackage;
  advisorReply: string;
}

function nowTimeStr(): string {
  return new Date().toTimeString().slice(0, 5);
}

function nowDateTimeStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

interface DetectedColor {
  nameCn: string;
  nameEn: string;
  hex: string;
  secondaryHex: string;
  matchedSpan: string;
}

const COLOR_DEFINITIONS: {
  regex: RegExp;
  nameCn: string;
  nameEn: string;
  hex: string;
  secondaryHex: string;
}[] = [
  {
    regex: /酒红(?:色|那种)?|绛红(?:色)?|勃艮第|红一点.{0,6}酒红/,
    nameCn: "酒红色",
    nameEn: "deep burgundy wine red",
    hex: "#6E1F2B",
    secondaryHex: "#57202A",
  },
  {
    regex: /枣红(?:色)?|暗红(?:色)?/,
    nameCn: "暗红色",
    nameEn: "muted dark crimson",
    hex: "#7A2426",
    secondaryHex: "#5E1C1E",
  },
  {
    regex: /正红(?:色)?|中国红|朱红(?:色)?/,
    nameCn: "朱砂正红",
    nameEn: "refined vermilion red",
    hex: "#A82D26",
    secondaryHex: "#87231D",
  },
  {
    regex: /深海藏青|深海蓝|藏青(?:色)?|海蓝(?:色)?|深蓝(?:色)?/,
    nameCn: "深海藏青",
    nameEn: "deep ocean navy blue",
    hex: "#1F304D",
    secondaryHex: "#2D4263",
  },
  {
    regex: /香槟金|香槟(?:色)?/,
    nameCn: "香槟金",
    nameEn: "muted champagne gold",
    hex: "#A98A4D",
    secondaryHex: "#C7AF7A",
  },
  {
    regex: /墨绿(?:色)?|黛绿(?:色)?|松绿(?:色)?/,
    nameCn: "黛墨绿",
    nameEn: "deep pine emerald green",
    hex: "#244339",
    secondaryHex: "#1B332B",
  },
  {
    regex: /米白(?:色)?|象牙白|月白(?:色)?/,
    nameCn: "米白色",
    nameEn: "warm ivory white",
    hex: "#EAE4D7",
    secondaryHex: "#D5CCBC",
  },
  {
    regex: /亮粉(?:色)?|玫粉(?:色)?|粉色/,
    nameCn: "亮粉色",
    nameEn: "vibrant rose pink",
    hex: "#D9578E",
    secondaryHex: "#F0A3C2",
  },
  {
    regex: /浅灰(?:色)?|水墨灰|银灰(?:色)?/,
    nameCn: "水墨浅灰",
    nameEn: "soft ink mist grey",
    hex: "#9B9891",
    secondaryHex: "#3C3A37",
  },
  {
    regex: /紫红(?:色)?|茄紫|紫色/,
    nameCn: "绛紫色",
    nameEn: "muted plum purple",
    hex: "#582C4D",
    secondaryHex: "#44213B",
  },
  {
    regex: /玄墨黑|墨黑(?:色)?|玄黑(?:色)?|黑色/,
    nameCn: "玄墨黑",
    nameEn: "midnight ink black",
    hex: "#1F1D1A",
    secondaryHex: "#383530",
  },
];

function detectColors(text: string): { colors: DetectedColor[]; hasContrast: boolean; brightColorReq: boolean } {
  const colors: DetectedColor[] = [];
  for (const def of COLOR_DEFINITIONS) {
    const m = text.match(def.regex);
    if (m) {
      colors.push({
        nameCn: def.nameCn,
        nameEn: def.nameEn,
        hex: def.hex,
        secondaryHex: def.secondaryHex,
        matchedSpan: m[0],
      });
    }
  }
  const hasContrast = /撞色/.test(text);
  const brightColorReq = /色彩.{0,4}明快|明快有活力/.test(text);
  return { colors, hasContrast, brightColorReq };
}

function findSpan(text: string, regex: RegExp, fallback: string): string {
  const m = text.match(regex);
  return m ? m[0].trim() : fallback;
}

interface ParsedIntentContext {
  isFemale: boolean;
  isWeddingMom: boolean;
  isQipaoOvercoat: boolean;
  isTwoPieceStage: boolean;
  isNotOld: boolean;
  isAnhuiHui: boolean;
  isPlumPattern: boolean;
  isMagnolia: boolean;
  isLowKeyXYS: boolean;
  isFormal: boolean;
  isBusinessCasual: boolean;
  hasSeasonOrVenue: boolean;
  seasonSpan: string;
  hasQipaoCollarAnswer: boolean;
  qipaoIsStandCollar: boolean;
  hasSleeveLengthAnswer: boolean;
  sleeveLengthPref: string;
  hasOldStyleAnswer: boolean;
  hasShortHeight: boolean;
  heightSpan: string;
  hasConflictLooseSlim: boolean;
  headcount: number;
  searchKeywords: string[];
}

function parseIntentContext(text: string, mode: BusinessMode): ParsedIntentContext {
  const isQipaoOvercoat =
    /(?:穿在|搭在|配在?).{0,4}旗袍.{0,4}外|旗袍.{0,4}外搭|旗袍外套/.test(text);
  const isWeddingMom =
    /(?:女儿|儿子|孩子).{0,5}结婚|婚礼|婚宴|主婚人|母亲外套/.test(text);
  const isTwoPieceStage =
    /演出服|演奏|坐奏|连衣裙.{0,4}外套|外套.{0,4}连衣裙/.test(text);
  const isFemale =
    isQipaoOvercoat ||
    isWeddingMom ||
    /妈妈|母亲|女式|女装|连衣裙|套裙|婆婆|丈母娘|梅花|青果|优雅/.test(text);
  const isNotOld = /(?:别|不要|不).{0,3}老气|显年轻/.test(text);
  const isAnhuiHui = /安徽|徽派|马头墙/.test(text);
  const isPlumPattern = /梅花/.test(text);
  const isMagnolia = /白玉兰|玉兰|外滩|石库门|江南/.test(text);
  const isLowKeyXYS = /内敛|低调|香云纱|溜肩/.test(text);
  const isFormal = /正式|端庄|论坛|演讲|礼服|大场合/.test(text);
  const isBusinessCasual = /商务|休闲|肌理/.test(text);

  const seasonMatch = text.match(
    /(?:1[012]|[1-9])\s*月(?:底|初|中)?(?:[，,、\s]*(?:酒店|室内|户外))?|(?:春|夏|秋|冬)(?:季|末|初)?(?:[，,、\s]*(?:酒店|室内|户外|草坪|宴会))?|酒店室内|户外舞台/
  );
  const hasSeasonOrVenue = Boolean(seasonMatch);
  const seasonSpan = seasonMatch ? seasonMatch[0] : "";

  // 面谈可补录或改口。「还没定」保留缺口，以最后一次明确记录更新领型。
  const collarAnswer = Array.from(text.matchAll(/(?:旗袍[^，。；\n]{0,4}?|客户回复[:：]\s*)(立领|无领|还没定)/g)).at(-1)?.[1];
  const hasQipaoCollarAnswer = collarAnswer === "立领" || collarAnswer === "无领";
  const qipaoIsStandCollar = collarAnswer === "立领";

  const sleeveMatch = Array.from(text.matchAll(/长袖|九分袖|七分袖/g)).at(-1);
  const hasSleeveLengthAnswer = Boolean(sleeveMatch);
  const sleeveLengthPref = sleeveMatch ? sleeveMatch[0] : "";

  const hasOldStyleAnswer = /颜色暗沉|花纹太满|款式宽大/.test(text);

  const heightMatch = text.match(/身高\s*1[45]\d|个子.{0,2}矮|娇小/);
  const hasShortHeight = Boolean(heightMatch);
  const heightSpan = heightMatch ? heightMatch[0] : "";

  const hasConflictLooseSlim = /宽松/.test(text) && /显瘦/.test(text);
  const headcountMatch = text.match(/(\d+)\s*(?:名|位|人|套)/);
  const headcount = headcountMatch ? Number(headcountMatch[1]) : mode === "uniform" ? 30 : 1;

  const kws: string[] = [];
  if (isQipaoOvercoat) kws.push("旗袍", "短外套", "青果西装领", "提花宋锦");
  if (isWeddingMom) kws.push("婚礼", "女式", "提花宋锦", "端庄");
  if (isTwoPieceStage) kws.push("两件式套装", "演出服", "亮面缎", "斜襟");
  if (isAnhuiHui) kws.push("徽派马头墙", "阶梯撞色", "肌理提花针织");
  if (isPlumPattern) kws.push("梅花暗纹", "提花宋锦", "青果西装领");
  if (isMagnolia) kws.push("上海白玉兰", "石库门窗棂");
  if (isLowKeyXYS) kws.push("香云纱", "自然落肩", "内敛低调");
  if (/(?:脖子|颈).{0,4}短|卡脖|领子?.{0,4}(?:不要|不能|别).{0,3}高/.test(text)) {
    kws.push("低立领", "短颈");
  }
  if (/肚腩|小肚子/.test(text)) kws.push("肚腩", "H型", "醋酸");
  if (/肩背.{0,4}宽|宽厚|身形偏高|压肩/.test(text)) kws.push("宽肩", "交领", "重磅真丝");
  if (mode === "uniform") kws.push("团装", "抗皱", "高管", "顾问", "迎宾");

  return {
    isFemale,
    isWeddingMom,
    isQipaoOvercoat,
    isTwoPieceStage,
    isNotOld,
    isAnhuiHui,
    isPlumPattern,
    isMagnolia,
    isLowKeyXYS,
    isFormal,
    isBusinessCasual,
    hasSeasonOrVenue,
    seasonSpan,
    hasQipaoCollarAnswer,
    qipaoIsStandCollar,
    hasSleeveLengthAnswer,
    sleeveLengthPref,
    hasOldStyleAnswer,
    hasShortHeight,
    heightSpan,
    hasConflictLooseSlim,
    headcount,
    searchKeywords: Array.from(new Set(kws)),
  };
}

function buildTargetedFollowUps(
  mode: BusinessMode,
  ctx: ParsedIntentContext,
  colors: ReturnType<typeof detectColors>,
  bodyRules: BodyTailoringRule[]
): FollowUpQuestion[] {
  const qs: FollowUpQuestion[] = [];

  // 1. 最高影响：旗袍外搭未说明旗袍领型
  if (ctx.isQipaoOvercoat && !ctx.hasQipaoCollarAnswer) {
    qs.push({
      id: "FQ-QIPAO-COLLAR",
      question: "旗袍是立领还是无领？（以及旗袍大概是什么颜色？）",
      whyItMatters: "旗袍若为立领，外套领型必须避让（用窄青果领或无扣交领），避免双层立领叠加显得局促。",
      impactRank: 1,
      quickAnswers: ["立领", "无领", "还没定"],
    });
  }

  // 2. 需求冲突取舍（宽松 vs 显瘦）
  if (ctx.hasConflictLooseSlim) {
    qs.push({
      id: "FQ-CONFLICT-LOOSE-SLIM",
      question: "「宽松」和「显瘦」存在取舍，客户更偏哪一头？",
      whyItMatters: "决定采用无收腰 H 型直身（藏肉舒适优先）还是微收腰剪裁（轮廓显瘦优先）。",
      isConflict: true,
      impactRank: 2,
      quickAnswers: ["宽松舒适优先（H型直身）", "轮廓显瘦优先（微收腰）"],
    });
  }

  // 3. 主观形容词界定（别太老气）
  if (ctx.isNotOld && !ctx.hasOldStyleAnswer) {
    qs.push({
      id: "FQ-OLD-STYLE",
      question: "“老气”更接近哪一种？",
      whyItMatters: "明确客户排斥的是色彩、满花还是廓形，直接决定三个方向的侧重。",
      impactRank: 3,
      quickAnswers: ["颜色暗沉", "花纹太满", "款式宽大"],
    });
  }

  // 4. 手臂粗想遮，未定袖长
  if (bodyRules.some((r) => r.id === "RULE-GEN-02") && !ctx.hasSleeveLengthAnswer) {
    qs.push({
      id: "FQ-SLEEVE-LEN",
      question: "手臂想遮到哪里？",
      whyItMatters: "决定直筒袖止口定在手腕（长袖）还是露出细腕骨（九分袖）。",
      impactRank: 4,
      quickAnswers: ["长袖", "九分袖"],
    });
  }

  // 5. 没提颜色（按规范绝不擅自定色）
  if (colors.colors.length === 0 && !colors.hasContrast && !colors.brightColorReq) {
    qs.push({
      id: "FQ-COLOR",
      question: "颜色有偏好或避讳吗？",
      whyItMatters: "未提及颜色时设计单暂记「无特殊需求」，确认后才能锁定面料现货色卡。",
      impactRank: 5,
      quickAnswers: ["玄黑 / 深藏青（稳重）", "米白 / 浅灰（温润）", "到店看实物色卡再定"],
    });
  }

  // 6. 季节与室内外未说明
  if (!ctx.hasSeasonOrVenue && mode === "bespoke") {
    qs.push({
      id: "FQ-SEASON",
      question: "主要在什么季节、室内还是户外穿？",
      whyItMatters: "决定面料克重以及加真丝里布还是薄夹棉。",
      impactRank: 6,
      quickAnswers: ["秋冬室内（中厚面料加里布）", "春秋为主", "夏季轻薄透气"],
    });
  }

  // 7. 团装缺口
  if (mode === "uniform" && qs.length < 2) {
    qs.push({
      id: "FQ-UNI-VI",
      question: "请确认企业 VI 标准色号及是否安排上门套号？",
      whyItMatters: "团装大货需要锁定潘通色号缸差，并统计特体员工人数。",
      impactRank: 5,
      quickAnswers: ["已备好潘通色卡，需要上门套号", "先看三档样衣方向再定色号"],
    });
  }

  qs.sort((a, b) => a.impactRank - b.impactRank);
  return qs.slice(0, 3);
}

function buildDirections(params: {
  mode: BusinessMode;
  ctx: ParsedIntentContext;
  colors: ReturnType<typeof detectColors>;
  primaryPattern: PatternAsset;
  primaryFabric: FabricAsset;
  altFabric: FabricAsset;
  bodyRules: BodyTailoringRule[];
}): DesignDirectionOption[] {
  const { mode, ctx, colors, primaryPattern, primaryFabric, altFabric } = params;
  const mainColor = colors.colors[0];
  const colorLabel = mainColor
    ? mainColor.nameCn.replace(/色$/, "")
    : colors.hasContrast
    ? "撞色"
    : "深色";
  const mainHex = mainColor?.hex || "#1F1D1A";
  const secHex = mainColor?.secondaryHex || "#4B4740";

  // 场景 1：团体职业服
  if (mode === "uniform") {
    return [
      {
        id: "classic",
        tag: "A · 稳妥",
        title: `${colorLabel}精纺呢三级同源套装`,
        swatches: [
          { hex: mainHex, label: mainColor?.nameCn || "深海藏青" },
          { hex: "#A98A4D", label: "内里香槟金包边" },
        ],
        bullets: [
          "高管微立领，顾问折角窄驳领",
          "110 支抗皱羊毛呢，3 年补单零色差",
          "左驳头如意扣眼，不扎伤面料",
        ],
        referenceImageUrl: "/generated/dir-bank-a.jpg",
        referenceImageCaption: "深海藏青缺角微立领精纺呢效果图",
        patternId: "PAT-UNI-01",
        fabricId: "FAB-UNI-01",
        craftId: "CRF-08",
        positioning: "金融政企稳重克制序列",
        restraintNote: "主色占 85% 以上，企业色藏于内门襟与袖叉暗眼",
        garmentSummary: "三档同源母版，大部队套码、特体胁片预留放量",
        collarAndCraftDiff: "缺角微立领 / 窄青果驳领 + 免伤衣如意扣眼",
        fabricSuggestion: "Super 110s 高支抗皱美丽奴羊毛混纺呢",
        suitableFor: "强调国际专业信任感的金融机构与集团总部",
        hardReqGuarantee: "已锁定品牌主色、高抗皱免打理、特体预留缝份",
      },
      {
        id: "accent",
        tag: "B · 一处亮点",
        title: `${colorLabel}海派细滚边职业套服`,
        swatches: [
          { hex: mainHex, label: mainColor?.nameCn || "深海藏青" },
          { hex: "#A98A4D", label: "1.5mm 香槟金细边" },
        ],
        bullets: [
          "迎宾与女装斜襟嵌一道 1.5mm 金边",
          "女装内搭玉兰暗纹抗静电三醋酸",
          "远看统一严谨，近看有海派辨识度",
        ],
        referenceImageUrl: "/generated/dir-bank-b.jpg",
        referenceImageCaption: "深海藏青斜襟香槟金细滚边效果图",
        patternId: "PAT-UNI-03",
        fabricId: "FAB-UNI-02",
        craftId: "CRF-03",
        positioning: "门厅一眼可辨的海派轻仪式感",
        restraintNote: "全衣仅领缘一道极细嵌条，杜绝外露大 Logo",
        garmentSummary: "高管/顾问/迎宾三档视觉梯度更分明",
        collarAndCraftDiff: "偏斜襟 1.5mm 细滚边 + 袖叉末粒金线锁眼",
        fabricSuggestion: "精纺羊毛混纺 + 抗静电可机洗三醋酸职业缎",
        suitableFor: "注重贵宾厅第一眼东方气韵的私行或高端场馆",
        hardReqGuarantee: "已锁定品牌色、抗静电不吸腿、可机洗内搭",
      },
      {
        id: "modern",
        tag: "C · 简洁现代",
        title: `${colorLabel}几何分割轻弹职业装`,
        swatches: [
          { hex: mainHex, label: mainColor?.nameCn || "水墨深灰" },
          { hex: "#D5D1C8", label: "浅灰阶梯拼色" },
        ],
        bullets: [
          "建筑线条分割替代传统盘扣",
          "索罗娜弹力呢，久坐肘膝不鼓包",
          "去工服化剪裁，下班社交无违和",
        ],
        referenceImageUrl: "/generated/dir-bank-c.jpg",
        referenceImageCaption: "建筑几何分割轻弹职业装效果图",
        patternId: "PAT-UNI-02",
        fabricId: "FAB-UNI-03",
        craftId: "CRF-04",
        positioning: "现代轻商务去工服化方向",
        restraintNote: "以建筑比例分割出层次，零繁琐装饰",
        garmentSummary: "全天候机洗免烫，5 件起快反补单",
        collarAndCraftDiff: "低立领暗门襟 + 几何拼色结构线",
        fabricSuggestion: "索罗娜生物基弹力微肌理斜纹呢",
        suitableFor: "年轻化或文创、科创类高审美团队",
        hardReqGuarantee: "已锁定高频耐穿、久坐微弹、免烫易打理",
      },
    ];
  }

  // 场景 2：婚礼母亲 / 旗袍外搭（完全贴合该客户，零商务套话！）
  if (ctx.isQipaoOvercoat || ctx.isWeddingMom) {
    return [
      {
        id: "classic",
        tag: "A · 稳妥",
        title: `${colorLabel}暗纹宋锦短外套`,
        swatches: [
          { hex: mainHex, label: colorLabel },
          { hex: secHex, label: "同色梅枝暗纹" },
        ],
        bullets: [
          "H 型微收腰，盖过旗袍腰线",
          "远看素净，近看有同色暗花",
          "三颗同色一字盘扣，端庄不老气",
        ],
        referenceImageUrl: "/generated/dir-wedding-a.jpg",
        referenceImageCaption: "酒红梅枝暗纹宋锦短外套效果图",
        patternId: "PAT-SF-02",
        fabricId: "FAB-SF-01",
        craftId: "CRF-05",
        positioning: "稳妥端庄的主婚人礼服短外套",
        restraintNote: "同色暗纹替代满绣大花，不抢新娘风头",
        garmentSummary: `${colorLabel}提花宋锦短外套，后片加长、直筒袖加放袖肥`,
        collarAndCraftDiff: "窄青果领避让旗袍立领，三颗同色盘扣",
        fabricSuggestion: "海派高密重磅提花宋锦 + 真丝里布",
        suitableFor: "希望喜庆得体、稳妥不出错的婚礼母亲",
        hardReqGuarantee: `已锁定${colorLabel}、后背与袖肥放量、拒绝大花满绣`,
      },
      {
        id: "accent",
        tag: "B · 一处亮点",
        title: `${colorLabel}香云纱外套 · 金边门襟`,
        swatches: [
          { hex: mainHex, label: colorLabel },
          { hex: "#A98A4D", label: "古金嵌条" },
        ],
        bullets: [
          "哑光温润，酒店灯光下不刺眼",
          "门襟一道 1.5mm 古金细边点睛",
          "自然落肩，柔和弱化肩背弧线",
        ],
        referenceImageUrl: "/generated/dir-wedding-b.jpg",
        referenceImageCaption: "酒红哑光香云纱古金细边效果图",
        patternId: "PAT-SF-04",
        fabricId: "FAB-SF-02",
        craftId: "CRF-03",
        positioning: "温润贵气、仅留一道金边焦点",
        restraintNote: "全身只留门襟 1.5mm 细滚边一处亮点",
        garmentSummary: `${colorLabel}自然落肩哑光外套，后背宽加放不贴背`,
        collarAndCraftDiff: "门襟极细古金滚边 + 柔和肩袖过渡",
        fabricSuggestion: "重磅哑光香云纱（或哑光三醋酸提花）",
        suitableFor: "喜欢低调贵气、怕亮面面料显胖的母亲",
        hardReqGuarantee: `已锁定${colorLabel}、遮手臂直筒袖、哑光不显老`,
      },
      {
        id: "modern",
        tag: "C · 简洁现代",
        title: `${colorLabel}织花绸交领外套`,
        swatches: [
          { hex: mainHex, label: colorLabel },
          { hex: secHex, label: "小团花暗纹" },
        ],
        bullets: [
          "无扣交领，绝不碰旗袍立领",
          "一体贴边，线条最干净利落",
          "肩背与袖管放量最足，敬酒轻松",
        ],
        referenceImageUrl: "/generated/dir-wedding-c.jpg",
        referenceImageCaption: "酒红织花绸无扣交领短外套效果图",
        patternId: "PAT-SF-06",
        fabricId: "FAB-SF-03",
        craftId: "CRF-01",
        positioning: "最现代利落、彻底摆脱传统妈妈装感",
        restraintNote: "零外露纽扣、零花哨刺绣，靠真丝垂感取胜",
        garmentSummary: `${colorLabel}无扣交领短外套，一体式门襟贴边`,
        collarAndCraftDiff: "无立领交领彻底规避与旗袍立领冲突",
        fabricSuggestion: "重磅桑蚕丝小团花暗纹织花绸（或三醋酸）",
        suitableFor: "审美现代、最在意不老气和抬手自在的母亲",
        hardReqGuarantee: `已锁定${colorLabel}、后片加长、宽直筒袖`,
      },
    ];
  }

  // 场景 3：舞台演出两件套
  if (ctx.isTwoPieceStage) {
    return [
      {
        id: "classic",
        tag: "A · 稳妥",
        title: "米白宋锦斜襟短外套 + 亮粉大摆裙",
        swatches: [
          { hex: "#EAE4D7", label: "米白宋锦" },
          { hex: "#D9578E", label: "亮粉亮面缎" },
        ],
        bullets: [
          "短款平肩外套配高垂感大 A 摆裙",
          "袖管放量足，抬手坐奏不紧绷",
          "滚边与撞色袖口呼应，户外极上镜",
        ],
        referenceImageUrl: "/cases/shangfu/image5.jpeg",
        referenceImageCaption: "案例三实物",
        patternId: "PAT-SF-03",
        fabricId: "FAB-SF-05",
        craftId: "CRF-02",
        positioning: "上服舞台演奏两件套实证方案",
        restraintNote: "素雅米白压住亮粉明度，舞台醒目不杂乱",
        garmentSummary: "斜襟短外套配脚踝长无袖大摆裙",
        collarAndCraftDiff: "斜襟一字盘扣配真丝流苏 + 翻折撞色袖口",
        fabricSuggestion: "暗纹宋锦 + 高垂感亮面缎面",
        suitableFor: "户外舞台独奏或室内音乐会演出的演奏者",
        hardReqGuarantee: "已锁定两件套、抬臂坐奏放量与明快上镜色",
      },
      {
        id: "accent",
        tag: "B · 一处亮点",
        title: "月白暗纹外套 · 撞色宽袖口套装",
        swatches: [
          { hex: "#E5E7EB", label: "月白提花" },
          { hex: "#C84B7A", label: "胭脂粉翻折袖" },
        ],
        bullets: [
          "抬手演奏时宽幅撞色袖口成焦点",
          "连衣裙腰腹留松量，坐奏不勒腰",
          "真丝里布顺滑，长时间演出透气",
        ],
        referenceImageUrl: "/cases/shangfu/image6.jpeg",
        referenceImageCaption: "案例三连衣裙实物",
        patternId: "PAT-SF-03",
        fabricId: "FAB-SF-01",
        craftId: "CRF-09",
        positioning: "强化手部演奏动态视觉记忆",
        restraintNote: "仅袖口与内搭裙用明色，其余保持月白素净",
        garmentSummary: "外柔内亮，演奏与谢幕动作舒展",
        collarAndCraftDiff: "6.5cm 宽幅翻折撞色袖口",
        fabricSuggestion: "提花宋锦 + 高垂亮缎",
        suitableFor: "古筝、琵琶、提琴等手部镜头多的舞台演奏",
        hardReqGuarantee: "已锁定抬手松量、坐奏大摆与上镜光泽",
      },
      {
        id: "modern",
        tag: "C · 简洁现代",
        title: "素雅青果领短外套 + 亮缎长裙",
        swatches: [
          { hex: "#EAE4D7", label: "玉兰米白" },
          { hex: "#D9578E", label: "玫瑰亮粉" },
        ],
        bullets: [
          "窄青果领替代盘扣，现代大气",
          "去掉流苏挂饰，演奏零缠绕隐患",
          "演出后外套可日常单穿复穿率高",
        ],
        referenceImageUrl: "/cases/shangfu/image3.jpeg",
        referenceImageCaption: "案例二实物",
        patternId: "PAT-SF-02",
        fabricId: "FAB-SF-05",
        craftId: "CRF-01",
        positioning: "现代极简礼服感，零饰品干扰演奏",
        restraintNote: "无盘扣流苏，纯靠缎面光泽与廓形出彩",
        garmentSummary: "利落短外套配工字褶长裙",
        collarAndCraftDiff: "无扣窄青果领，轻盈无束缚",
        fabricSuggestion: "三醋酸提花 + 高垂亮面缎",
        suitableFor: "偏爱现代音乐厅礼服风格、忌装饰钩挂琴弦的客户",
        hardReqGuarantee: "已锁定抬手坐奏松量与明快上镜效果",
      },
    ];
  }

  // 场景 4：通用个人高级私定外套（按客户特征精准定制）
  const colorTitle = mainColor ? mainColor.nameCn.replace(/色$/, "") : "素雅";
  const fabricShort =
    primaryFabric.name.match(/提花宋锦|宋锦|香云纱|织花绸|三醋酸提花|三醋酸|真丝暗纹|真丝|肌理针织|针织|羊毛呢|亮面缎|醋酸/)?.[0] ||
    primaryFabric.name.replace(/（.*?）/g, "").slice(0, 6);
  return [
    {
      id: "classic",
      tag: "A · 稳妥",
      title: `${colorTitle}低立领 H 型${fabricShort}外套`,
      swatches: [
        { hex: mainHex, label: mainColor?.nameCn || "待定主色" },
        { hex: secHex, label: "同色暗纹" },
      ],
      bullets: [
        `${primaryPattern.silhouetteType.slice(0, 12)}`,
        `${primaryPattern.collarSpec.slice(0, 14)}`,
        `面料挺而不硬，久穿不贴身`,
      ],
      referenceImageUrl:
        primaryPattern.id === "PAT-SF-02"
          ? "/cases/shangfu/image4.jpeg"
          : primaryPattern.id === "PAT-SF-04"
          ? "/generated/dir-forum-b.jpg"
          : primaryPattern.id === "PAT-SF-05"
          ? "/cases/shangfu/image10.jpeg"
          : primaryPattern.id === "PAT-SF-06"
          ? "/generated/dir-forum-c.jpg"
          : "/generated/dir-forum-a.jpg",
      referenceImageCaption:
        primaryPattern.id === "PAT-SF-02"
          ? "案例二实物"
          : primaryPattern.id === "PAT-SF-04"
          ? "哑光香云纱细嵌条效果图"
          : primaryPattern.id === "PAT-SF-05"
          ? "案例五实物"
          : primaryPattern.id === "PAT-SF-06"
          ? "重磅真丝无扣交领效果图"
          : "海派低立领玉兰暗纹外套效果图",
      patternId: primaryPattern.id,
      fabricId: primaryFabric.id,
      craftId: "CRF-06",
      positioning: "上服经典海派比例，出错率最低",
      restraintNote: "同色系暗纹为主，H 型衣长至臀中",
      garmentSummary: `${primaryPattern.silhouetteType}，${primaryPattern.shoulderSpec}`,
      collarAndCraftDiff: primaryPattern.collarSpec,
      fabricSuggestion: primaryFabric.name,
      suitableFor: "看重正式端庄与体态修饰稳妥度的客户",
      hardReqGuarantee: "已覆盖全部体征松量与领型约束",
    },
    {
      id: "accent",
      tag: "B · 一处亮点",
      title: ctx.isAnhuiHui
        ? "徽派马头墙撞色肌理针织外套"
        : `${colorTitle}哑光香云纱 · 细嵌条外套`,
      swatches: ctx.isAnhuiHui
        ? [
            { hex: "#9B9891", label: "粉墙浅灰" },
            { hex: "#353432", label: "黛瓦炭灰" },
          ]
        : [
            { hex: mainHex, label: mainColor?.nameCn || "深乌金褐" },
            { hex: "#A8432F", label: "1.5mm 细嵌条" },
          ],
      bullets: ctx.isAnhuiHui
        ? [
            "肩胸马头墙阶梯撞色，有地域特色",
            "肌理提花针织，柔软微弹不拘束",
            "3cm 以内圆角低立领不卡脖",
          ]
        : [
            "门襟一道 1.5mm 极细滚边提神",
            "自然落肩柔和舒展，哑光内敛",
            "远看素净，近距离显手工细节",
          ],
      referenceImageUrl: ctx.isAnhuiHui
        ? "/cases/shangfu/image10.jpeg"
        : "/generated/dir-forum-b.jpg",
      referenceImageCaption: ctx.isAnhuiHui ? "案例五实物" : "哑光香云纱细嵌条效果图",
      patternId: ctx.isAnhuiHui ? "PAT-SF-05" : "PAT-SF-04",
      fabricId: ctx.isAnhuiHui ? "FAB-SF-06" : "FAB-SF-02",
      craftId: ctx.isAnhuiHui ? "CRF-04" : "CRF-03",
      positioning: "留出一处克制文化或工艺记忆点",
      restraintNote: "全身只保留一处结构分割或极细滚边",
      garmentSummary: ctx.isAnhuiHui ? "马头墙阶梯分割低立领夹克" : "自然落肩哑光细嵌条外套",
      collarAndCraftDiff: ctx.isAnhuiHui ? "阶梯撞色分割 + 菱格肌理" : "1.5mm 极细门襟滚边",
      fabricSuggestion: ctx.isAnhuiHui ? "肌理提花针织" : "非遗香云纱",
      suitableFor: "希望衣服有含蓄文化质感与故事性的客户",
      hardReqGuarantee: "已覆盖全部领型、松量与色彩要求",
    },
    {
      id: "modern",
      tag: "C · 简洁现代",
      title: `${colorTitle}无扣交领织花绸外套`,
      swatches: [
        { hex: mainHex, label: mainColor?.nameCn || "待定主色" },
        { hex: secHex, label: "小巧团花暗纹" },
      ],
      bullets: [
        "无立领交领开襟，颈肩零压迫",
        "一体式门襟贴边，无外露纽扣",
        "肩背与袖管放量充足，活动自在",
      ],
      referenceImageUrl: "/generated/dir-forum-c.jpg",
      referenceImageCaption: "重磅真丝无扣交领效果图",
      patternId: "PAT-SF-06",
      fabricId: altFabric.id,
      craftId: "CRF-01",
      positioning: "极简无扣海派现代廓形",
      restraintNote: "零多余装饰，靠重磅面料垂感与剪裁线条立住气场",
      garmentSummary: "无扣交领开襟 + 下摆两侧挡布开衩",
      collarAndCraftDiff: "交领一体贴边，无立领无外露扣",
      fabricSuggestion: altFabric.name,
      suitableFor: "偏爱极简大气、排斥高立领和纽扣束缚的客户",
      hardReqGuarantee: "已覆盖全部体征松量与场合要求",
    },
  ];
}

function buildVisualSlots(params: {
  mode: BusinessMode;
  ctx: ParsedIntentContext;
  colors: ReturnType<typeof detectColors>;
  primaryPattern: PatternAsset;
  primaryFabric: FabricAsset;
  eightFields: EightFieldTranslation;
  bodyRules: BodyTailoringRule[];
  directions: DesignDirectionOption[];
}): VisualPromptSlot[] {
  const { mode, ctx, colors, primaryPattern, primaryFabric, eightFields, bodyRules, directions } =
    params;

  const lockedColorCn =
    colors.colors.length > 0
      ? colors.colors.map((c) => c.nameCn).join("、")
      : colors.hasContrast
      ? "撞色"
      : "素雅深色（待客户确认色卡）";
  const lockedColorEn =
    colors.colors.length > 0
      ? colors.colors.map((c) => c.nameEn).join(" and ")
      : "refined muted oriental tone";

  const taboos = bodyRules.map((r) => r.taboo).join(", ");
  const firstDir = directions[0];

  return [
    {
      slotId: "design_effect",
      titleCn: "成衣正背面设计图",
      titleEn: "DESIGN EFFECT",
      subLabel: `${eightFields.category} · ${lockedColorCn}`,
      seedreamPromptCn: `${eightFields.category}设计效果图，正背面平铺在暖米色纸面背景。主色为${lockedColorCn}，面料为${primaryFabric.name}，${eightFields.structure}，${eightFields.collar}，${eightFields.lengthRatio}，${eightFields.easeAllowance}。遵循克制海派风格，无多余装饰，商业柔光棚拍。`,
      midjourneyPromptEn: `${
        ctx.isQipaoOvercoat
          ? "Haipai Neo-Chinese cropped jacket designed to layer over a qipao"
          : mode === "uniform"
          ? "Haipai coordinated corporate uniform collection"
          : "Haipai Neo-Chinese tailored jacket"
      }, front and back flatlay on warm rice paper background, strictly in ${lockedColorEn}, structured soft drape fabric, clean silhouette, soft studio light --ar 4:3 --v 6.1`,
      negativePrompt: `满身大红大花, 亮片网纱, 老气刺绣, ${taboos}`,
      cameraLightingSpec: "85mm 平视商业棚拍 | 柔和双侧漫射光",
      imageUrl: firstDir?.referenceImageUrl || "/cases/shangfu/image4.jpeg",
      imageSource: "preset_reference",
      visualCheckNote: `参考图取自「${firstDir?.referenceImageCaption || "上服实物"}」，提示词已锁定「${lockedColorCn}」与本次版型松量`,
    },
    {
      slotId: "details",
      titleCn: "领口 · 袖型 · 工艺细节",
      titleEn: "CRAFT DETAILS",
      subLabel: `${eightFields.collar.slice(0, 22)}`,
      seedreamPromptCn: `${eightFields.category}局部工艺微距三联图（主色${lockedColorCn}）：1. ${eightFields.collar}；2. ${eightFields.easeAllowance}（直筒袖与肩袖顺滑走线）；3. ${eightFields.patternCraft}。细节工整清晰。`,
      midjourneyPromptEn: `Close-up tailoring craftsmanship triptych strictly in ${lockedColorEn}: refined collar edge, relaxed flattering sleeve armhole, subtle tone-on-tone jacquard detail --ar 4:3 --v 6.1`,
      negativePrompt: "线头毛糙, 泡泡袖, 紧身短袖, 廉价亮片",
      cameraLightingSpec: "100mm 微距 f/5.6 | 45° 侧逆光",
      imageUrl:
        mode === "uniform"
          ? "/generated/asset-crf-08.jpg"
          : ctx.isMagnolia
          ? "/generated/asset-crf-06.jpg"
          : directions[1]?.referenceImageUrl || "/generated/dir-wedding-b.jpg",
      imageSource: "preset_reference",
    },
    {
      slotId: "fabric_pattern",
      titleCn: "面料肌理与色卡",
      titleEn: "FABRIC SWATCH",
      subLabel: `${primaryFabric.name} · ${lockedColorCn}`,
      seedreamPromptCn: `高定面料色卡微距摄影：严格呈现${lockedColorCn}的${primaryFabric.name}，左侧展示挺而不硬的自然垂坠折痕，右侧放大呈现同色系克制暗纹经纬肌理，D65标准显色光。`,
      midjourneyPromptEn: `Macro textile swatch flatlay strictly in ${lockedColorEn}, ${primaryFabric.composition}, structured soft drape folds and subtle tone-on-tone jacquard weave close-up, D65 studio light --ar 4:3 --v 6.1`,
      negativePrompt: "刺眼反光, 大面积明花印花, 色偏",
      cameraLightingSpec: "垂直俯拍 | D65 标准显色光源",
      imageUrl:
        mode === "uniform"
          ? "/generated/swatch-navy-wool.jpg"
          : ctx.isQipaoOvercoat || ctx.isWeddingMom
          ? "/generated/swatch-burgundy-songjin.jpg"
          : primaryFabric.id === "FAB-UNI-02"
          ? "/generated/swatch-magnolia-triacetate.jpg"
          : primaryFabric.id === "FAB-UNI-03"
          ? "/generated/swatch-sorona-twill.jpg"
          : ctx.isMagnolia
          ? "/generated/asset-crf-06.jpg"
          : directions[2]?.referenceImageUrl || "/cases/shangfu/image12.jpeg",
      imageSource: "preset_reference",
    },
    {
      slotId: "lookbook",
      titleCn: "场合上身穿搭参考",
      titleEn: "SCENE LOOKBOOK",
      subLabel: "仅作风格与色彩方向参考，合身以打样为准",
      seedreamPromptCn: `${
        ctx.isQipaoOvercoat || ctx.isWeddingMom
          ? `50岁左右气质温婉的中国母亲在温馨酒店婚礼现场自然微笑，身穿${lockedColorCn}${primaryFabric.name}海派短外套搭在旗袍外面，宽松遮臂袖型，后背平整不贴身，端庄现代不老气`
          : mode === "uniform"
          ? `现代上海金融与商务空间内的团队群像，身穿统一${lockedColorCn}海派同源职业装，姿态专业得体`
          : `气质儒雅的客户在目标场合穿着${lockedColorCn}${primaryFabric.name}海派定制${primaryPattern.category}，穿着舒展松弛`
      }，自然柔和光影，真实商业人像。`,
      midjourneyPromptEn: `${
        ctx.isQipaoOvercoat || ctx.isWeddingMom
          ? `Graceful 52-year-old Chinese mother at an upscale hotel wedding wearing a ${lockedColorEn} tailored Haipai cropped jacket layered over a qipao, flattering relaxed sleeves, modern restrained elegance`
          : `Editorial portrait in modern Shanghai wearing a tailored ${lockedColorEn} Haipai bespoke garment, comfortable drape`
      }, natural soft lighting --ar 3:4 --v 6.1`,
      negativePrompt: `紧绷勒肉, 显胖短袖, 满身金花亮片, ${taboos}`,
      cameraLightingSpec: "50mm 人像定焦 f/2.8 | 自然环境漫射光",
      imageUrl:
        ctx.isQipaoOvercoat || ctx.isWeddingMom
          ? "/generated/lookbook-wedding.jpg"
          : mode === "uniform"
          ? "/generated/lookbook-bank.jpg"
          : !ctx.isFemale
          ? "/generated/lookbook-forum.jpg"
          : "/cases/shangfu/image3.jpeg",
      imageSource: "preset_reference",
    },
  ];
}

export function runLocalRuleEngine(params: {
  mode: BusinessMode;
  conversation: ConversationInputTurn[];
  modelLabel?: string;
  isInitialSeed?: boolean;
}): AgentRunResponse {
  const { mode, conversation, isInitialSeed = false } = params;
  const advisorParagraphs = conversation
    .filter((m) => m.role === "advisor")
    .map((m) => m.content.trim())
    .filter(Boolean);
  const fullText = advisorParagraphs.join("；");

  const ctx = parseIntentContext(fullText, mode);
  const colors = detectColors(fullText);

  const bodyRules = searchBodyRulesTool({
    rawText: fullText,
    bodyOrOccasionKeywords: [],
  });

  let patterns = searchPatternsTool({
    mode,
    keywords: ctx.searchKeywords,
    bodyOrRoleSignals: bodyRules.map((r) => r.bodyFeature),
  });
  // 精准约束母版选择（确保 6 个官方案例和旗袍外搭均命中正确母版）
  if (ctx.isQipaoOvercoat || ctx.isWeddingMom) {
    patterns = [
      PATTERN_KB.find((p) => p.id === "PAT-SF-02")!,
      PATTERN_KB.find((p) => p.id === "PAT-SF-06")!,
    ];
  } else if (ctx.isTwoPieceStage) {
    patterns = [PATTERN_KB.find((p) => p.id === "PAT-SF-03")!];
  } else if (ctx.isAnhuiHui) {
    patterns = [PATTERN_KB.find((p) => p.id === "PAT-SF-05")!];
  } else if (bodyRules.some((r) => r.id === "RULE-SF-05") && !ctx.isFemale) {
    patterns = [PATTERN_KB.find((p) => p.id === "PAT-SF-06")!];
  } else if (bodyRules.some((r) => r.id === "RULE-SF-04") && !ctx.isFemale) {
    patterns = [PATTERN_KB.find((p) => p.id === "PAT-SF-04")!];
  } else if (ctx.isPlumPattern || bodyRules.some((r) => r.id === "RULE-SF-02")) {
    patterns = [PATTERN_KB.find((p) => p.id === "PAT-SF-02")!];
  } else if (bodyRules.some((r) => r.id === "RULE-SF-01") && bodyRules.some((r) => r.id === "RULE-SF-03")) {
    patterns = [PATTERN_KB.find((p) => p.id === "PAT-SF-01")!];
  }

  let fabrics = searchFabricsTool({
    mode,
    keywords: ctx.searchKeywords,
    requireHighWrinkleResistance: mode === "uniform" || /抗皱|免烫/.test(fullText),
  });
  if (ctx.isAnhuiHui) {
    fabrics = [FABRIC_KB.find((f) => f.id === "FAB-SF-06")!, FABRIC_KB.find((f) => f.id === "FAB-SF-04")!];
  } else if (ctx.isLowKeyXYS && !ctx.isWeddingMom) {
    fabrics = [FABRIC_KB.find((f) => f.id === "FAB-SF-02")!, FABRIC_KB.find((f) => f.id === "FAB-SF-04")!];
  } else if (ctx.isQipaoOvercoat || ctx.isWeddingMom || ctx.isPlumPattern) {
    fabrics = [FABRIC_KB.find((f) => f.id === "FAB-SF-01")!, FABRIC_KB.find((f) => f.id === "FAB-SF-03")!];
  } else if (bodyRules.some((r) => r.id === "RULE-SF-05") && !ctx.isFemale) {
    fabrics = [FABRIC_KB.find((f) => f.id === "FAB-SF-03")!, FABRIC_KB.find((f) => f.id === "FAB-SF-04")!];
  } else if (bodyRules.some((r) => r.id === "RULE-SF-01") && bodyRules.some((r) => r.id === "RULE-SF-03") && !ctx.isMagnolia) {
    fabrics = [FABRIC_KB.find((f) => f.id === "FAB-SF-04")!, FABRIC_KB.find((f) => f.id === "FAB-SF-01")!];
  }

  const requireMachineWash = /(?:必须|要求|需要|希望)?(?:能|可|可以)?(?:机洗|水洗)|(?:不能|不要|不接受)干洗/.test(
    fullText
  );
  if (requireMachineWash && (fabrics[0]?.id === "FAB-SF-01" || fabrics[0]?.id === "FAB-SF-02")) {
    fabrics = [
      FABRIC_KB.find((f) => f.id === (mode === "uniform" ? "FAB-UNI-02" : "FAB-SF-04"))!,
      FABRIC_KB.find((f) => f.id === "FAB-UNI-02")!,
    ];
  }

  const crafts = searchCraftsTool({
    mode,
    keywords: ctx.searchKeywords,
    subtleViOrTrim: mode === "uniform" || ctx.isNotOld || ctx.isLowKeyXYS,
  });
  const similarCases = retrieveSimilarCasesTool({ mode, keywords: ctx.searchKeywords });

  const primaryPattern = patterns[0] || PATTERN_KB[0];
  const primaryFabric = fabrics[0] || FABRIC_KB[0];
  const altFabric = fabrics[1] || FABRIC_KB[3];
  const refCase = similarCases[0] || CASE_KB[0];

  // ==================== 构造逐条需求清单（严格归属 P0-5 + sourceSpan 供第一屏划线标注） ====================
  const requirements: RequirementItem[] = [];
  let idx = 1;
  const pushReq = (item: Omit<RequirementItem, "id" | "index">) => {
    requirements.push({
      ...item,
      id: `REQ-${String(idx).padStart(2, "0")}`,
      index: idx,
    });
    idx++;
  };

  // 按原话出现顺序或逻辑顺序抽取每条独立需求
  if (ctx.isWeddingMom) {
    pushReq({
      rawPhrase: "女儿婚礼，母亲身份",
      sourceSpan: findSpan(fullText, /(?:我)?(?:女儿|儿子|孩子).{0,5}结婚|婚礼|婚宴/, "婚礼"),
      category: "场合礼仪",
      isHardRequirement: true,
      priority: 2,
      solutionAction: "端庄有喜气，不抢新娘：不用白色、香槟色和亮片",
      rationale: "场合礼仪推断，由顾问与客户确认方向",
      ruleOrAssetId: "RULE-GEN-06",
      status: "推断",
      ownerRole: "顾问",
      needsMasterApproval: false,
    });
  } else if (ctx.isTwoPieceStage) {
    pushReq({
      rawPhrase: "户外舞台演出两件套",
      sourceSpan: findSpan(fullText, /演出服|连衣裙和一件外套|户外舞台/, "演出服"),
      category: "场合礼仪",
      isHardRequirement: true,
      priority: 2,
      solutionAction: "短款微 H 型斜襟外套 + 无袖收腰大 A 摆连衣裙两件式套装",
      rationale: "兼顾户外舞台氛围与正式松弛感",
      ruleOrAssetId: "PAT-SF-03",
      status: "已落实",
      ownerRole: "设计师",
    });
  } else if (mode === "uniform") {
    pushReq({
      rawPhrase: `团体职业服（约 ${ctx.headcount} 人）`,
      sourceSpan: findSpan(fullText, /\d+\s*(?:名|位|人|套).{0,8}|职业服|职业装|团装/, "团体职业服"),
      category: "团装管理",
      isHardRequirement: true,
      priority: 2,
      solutionAction: "采用多岗位同源三级母版，国标套码为主、侧胁缝预留 2.0cm 给特体员工微调",
      rationale: "平衡团队形象统一、成本与特体合身度",
      ruleOrAssetId: "RULE-GEN-07",
      status: "已落实",
      ownerRole: "顾问",
    });
  }

  if (ctx.isQipaoOvercoat) {
    pushReq({
      rawPhrase: "穿在旗袍外面的外套",
      sourceSpan: findSpan(fullText, /穿在旗袍外面的外套|旗袍外搭|旗袍外面/, "穿在旗袍外面的外套"),
      category: "穿搭结构",
      isHardRequirement: true,
      priority: 1,
      solutionAction: ctx.hasQipaoCollarAnswer
        ? ctx.qipaoIsStandCollar
          ? "旗袍为立领：外套用窄青果领或无扣交领避让，衣长盖过旗袍腰线、露出下摆"
          : "旗袍为无领：外套可用 2.5cm 低立领或青果领，衣长盖过旗袍腰线、露出下摆"
        : "衣长盖过旗袍腰线、露出下摆；领型避开旗袍立领（待确认旗袍领型）",
      rationale: "外搭结构需避开与旗袍立领冲突，由顾问向客户追问确认",
      ruleOrAssetId: "RULE-GEN-08",
      status: ctx.hasQipaoCollarAnswer ? "已落实" : "待追问",
      ownerRole: "顾问",
      needsMasterApproval: false,
    });
  }

  // 颜色要求
  if (colors.colors.length > 0) {
    const colorNames = colors.colors.map((c) => c.nameCn).join(" + ");
    pushReq({
      rawPhrase: colorNames,
      sourceSpan: colors.colors[0].matchedSpan,
      category: "色彩材质",
      isHardRequirement: true,
      priority: 2,
      solutionAction:
        colors.colors.length === 1
          ? `主色锁定${colorNames}，同色暗纹，不加第二主色`
          : `锁定${colorNames}配色（主色占 85%+，副色仅作 1%–3% 克制点缀）`,
      rationale: "客户明说颜色为硬要求，最终实物色卡由顾问现场确认",
      ruleOrAssetId: primaryFabric.id,
      status: "已落实",
      ownerRole: "顾问",
    });
  } else if (colors.hasContrast || colors.brightColorReq) {
    pushReq({
      rawPhrase: colors.hasContrast ? "撞色有层次" : "色彩明快有活力",
      sourceSpan: findSpan(fullText, /撞色|色彩.{0,4}明快/, "撞色"),
      category: "色彩材质",
      isHardRequirement: true,
      priority: 2,
      solutionAction: colors.brightColorReq
        ? "米白底色外套配亮粉色滚边与撞色袖口，连衣裙同亮粉色"
        : "采用粉墙浅灰与黛瓦炭黑克制撞色拼接",
      rationale: "颜色方向已明确，实物色卡由顾问确认",
      ruleOrAssetId: primaryFabric.id,
      status: "已落实",
      ownerRole: "顾问",
    });
  }

  // 逐条映射命中的体型与功能规则（跳过已单独生成的 RULE-GEN-06/07/08）
  for (const rule of bodyRules) {
    if (["RULE-GEN-06", "RULE-GEN-07", "RULE-GEN-08"].includes(rule.id)) continue;

    const isArmRule = rule.id === "RULE-GEN-02";
    const spanRegex = new RegExp(rule.triggerRegexes.join("|"), "i");
    const matchedSpan = findSpan(fullText, spanRegex, rule.bodyFeature);
    const isPendingMaster = rule.sourceLevel === "general_tailoring_pending_master";

    let actionText = `${rule.patternAction}；${rule.collarOrSleeveAction}`;
    let status: RequirementItem["status"] = "已落实";

    if (rule.id === "RULE-GEN-01") {
      actionText = "后衣片加长、后背宽加放；面料有骨感，不贴背";
      status = "已落实";
    } else if (isArmRule) {
      actionText = ctx.hasSleeveLengthAnswer
        ? `直筒${ctx.sleeveLengthPref}、袖肥加放；不做短袖和泡泡袖`
        : "直筒袖、袖肥加放；不做短袖和泡泡袖（袖长待确认）";
      status = ctx.hasSleeveLengthAnswer ? "已落实" : "待追问";
    } else if (rule.id === "RULE-GEN-04") {
      actionText = "衣长控制在臀围线以上";
      status = "已落实";
    } else if (rule.id === "RULE-SF-06" && /敬酒/.test(fullText)) {
      actionText = "袖笼放量，抬手举杯时衣身不往上吊";
      status = "已落实";
    }

    pushReq({
      rawPhrase:
        rule.id === "RULE-GEN-01"
          ? "有点驼背"
          : rule.id === "RULE-GEN-02"
          ? "手臂粗，想遮一下"
          : rule.id === "RULE-GEN-04"
          ? ctx.heightSpan || "身高偏娇小"
          : rule.id === "RULE-SF-06" && /敬酒/.test(fullText)
          ? "晚上挨桌敬酒"
          : rule.bodyFeature,
      sourceSpan:
        isArmRule && /手臂也粗，想遮一下/.test(fullText)
          ? "手臂也粗，想遮一下"
          : matchedSpan,
      category: rule.category === "功能动作" ? "功能动作" : "体型修饰",
      isHardRequirement: true,
      priority: 1,
      solutionAction: actionText,
      rationale: rule.sourceRef,
      ruleOrAssetId: rule.id,
      status,
      ownerRole: "制版师",
      needsMasterApproval: isPendingMaster,
    });
  }

  // 别太老气（归属设计师/顾问，绝不标“待制版师核准”！）
  if (ctx.isNotOld) {
    pushReq({
      rawPhrase: "别太老气",
      sourceSpan: findSpan(fullText, /(?:但)?(?:别|不要|不).{0,3}老气/, "别太老气"),
      category: "审美风格",
      isHardRequirement: true,
      priority: 2,
      solutionAction: "不用大团花和满绣；廓形利落，只留一处装饰",
      rationale: "主观审美推断，由顾问引导客户在三方向中确认",
      status: ctx.hasOldStyleAnswer ? "已落实" : "推断",
      ownerRole: "设计师",
      needsMasterApproval: false,
    });
  }

  // 季节与室内外
  if (ctx.hasSeasonOrVenue && !ctx.isTwoPieceStage) {
    pushReq({
      rawPhrase: ctx.seasonSpan,
      sourceSpan: ctx.seasonSpan,
      category: "场合礼仪",
      isHardRequirement: true,
      priority: 2,
      solutionAction: /1[12]月|冬|冷/.test(ctx.seasonSpan)
        ? "中厚面料加里布，不夹棉"
        : "选用透气垂顺克重面料，室内空调房穿脱舒适",
      rationale: "结合季节与室内外温差确定克重与里布",
      ruleOrAssetId: primaryFabric.id,
      status: "已落实",
      ownerRole: "顾问",
    });
  }

  // 地域/文化/纹样需求
  if (ctx.isAnhuiHui) {
    pushReq({
      rawPhrase: "安徽地域特色",
      sourceSpan: findSpan(fullText, /我是安徽人.{0,12}|徽派/, "安徽地域特色"),
      category: "审美风格",
      isHardRequirement: true,
      priority: 2,
      solutionAction: "暗纹 + 肌理，肩胸阶梯分割体现徽派马头墙建筑风格",
      rationale: "参考上服案例五地域文化结构转译手法",
      ruleOrAssetId: "CRF-04",
      status: "已落实",
      ownerRole: "设计师",
    });
  }
  if (ctx.isPlumPattern) {
    pushReq({
      rawPhrase: "面料带暗纹，最好是梅花",
      sourceSpan: findSpan(fullText, /面料要带一些暗纹.{0,8}|最好是梅花|梅花/, "梅花暗纹"),
      category: "色彩材质",
      isHardRequirement: true,
      priority: 2,
      solutionAction: "衣身植物梅花暗花纹样，点缀细碎星光装饰，含蓄有层次",
      rationale: "匹配提花宋锦暗花工艺",
      ruleOrAssetId: "CRF-05",
      status: "已落实",
      ownerRole: "设计师",
    });
  }
  if (ctx.isMagnolia) {
    pushReq({
      rawPhrase: "上海 / 江南含蓄文化细节",
      sourceSpan: findSpan(fullText, /(?:上海|白玉兰|江南|外滩).{0,10}/, "上海江南细节"),
      category: "审美风格",
      isHardRequirement: true,
      priority: 2,
      solutionAction: "采用白玉兰与石库门花窗同色系暗纹提花，远看素净、近看有纹",
      rationale: "契合海派克制审美",
      ruleOrAssetId: "CRF-06",
      status: "已落实",
      ownerRole: "设计师",
    });
  }
  if (mode === "uniform" && /Logo|logo|工服/.test(fullText)) {
    pushReq({
      rawPhrase: "不要胸前大 Logo 像工服",
      sourceSpan: findSpan(fullText, /不要.{0,8}Logo.{0,4}|不要.{0,6}工服/, "不要胸前大Logo"),
      category: "明确禁忌",
      isHardRequirement: true,
      priority: 2,
      solutionAction: "采用内门襟品牌色包边 + 左驳头如意免伤衣徽章扣眼，外观零大字 Logo",
      rationale: "团装克制 VI 植入规范",
      ruleOrAssetId: "CRF-08",
      status: "已落实",
      ownerRole: "设计师",
    });
  }
  if (mode === "uniform" && /抗皱|补单|色差/.test(fullText)) {
    pushReq({
      rawPhrase: "久坐抗皱、补单无色差",
      sourceSpan: findSpan(fullText, /久坐.{0,8}抗皱.{0,8}|补单.{0,4}色差/, "久坐抗皱补单无色差"),
      category: "团装管理",
      isHardRequirement: true,
      priority: 1,
      solutionAction: "主料锁死 Super 110s 抗皱美丽奴羊毛混纺呢（3年补单 ΔE<0.8），女装内搭用抗静电可水洗三醋酸",
      rationale: "保障高频办公耐穿与后续新员工补货一致",
      ruleOrAssetId: "FAB-UNI-01",
      status: "已落实",
      ownerRole: "顾问",
    });
  }

  // 兜底：若客户只说了风格与品类（如无特定体征词），至少覆盖核心外套诉求
  if (requirements.length === 0) {
    pushReq({
      rawPhrase: fullText.slice(0, 20),
      sourceSpan: fullText.slice(0, 20),
      category: "审美风格",
      isHardRequirement: true,
      priority: 2,
      solutionAction: `基于 ${primaryPattern.id} 与 ${primaryFabric.name} 起草方案`,
      rationale: "基础定制意向",
      ruleOrAssetId: primaryPattern.id,
      status: "推断",
      ownerRole: "顾问",
    });
  }

  // 按原话出现顺序重新编号 1, 2, 3...，确保左栏上标严格从左到右递增
  requirements.sort((a, b) => {
    const posA = a.sourceSpan ? fullText.indexOf(a.sourceSpan) : -1;
    const posB = b.sourceSpan ? fullText.indexOf(b.sourceSpan) : -1;
    const safeA = posA === -1 ? 99999 : posA;
    const safeB = posB === -1 ? 99999 : posB;
    return safeA - safeB;
  });
  requirements.forEach((r, i) => {
    r.index = i + 1;
    r.id = `REQ-${String(i + 1).padStart(2, "0")}`;
  });

  // ==================== 构造严格精确的八项设计语言 ====================
  const colorFieldVal =
    colors.colors.length > 0
      ? colors.colors.length === 1
        ? `${colors.colors[0].nameCn}主色，同色暗纹`
        : `${colors.colors.map((c) => c.nameCn).join("，搭配")}点缀`
      : colors.brightColorReq
      ? "米白底色外套，搭配亮粉色滚边与撞色袖口；连衣裙同亮粉色"
      : colors.hasContrast
      ? "撞色"
      : "无特殊需求";

  const hasHunchback = bodyRules.some((r) => r.id === "RULE-GEN-01");
  const hasThickArm = bodyRules.some((r) => r.id === "RULE-GEN-02");
  const hasBelly = bodyRules.some((r) => r.id === "RULE-SF-03");
  const hasSlopeShoulder = bodyRules.some((r) => r.id === "RULE-SF-04");
  const hasWideShoulder = bodyRules.some((r) => r.id === "RULE-SF-05");
  const hasShortNeck = bodyRules.some((r) => r.id === "RULE-SF-01");
  const hasThinNeck = bodyRules.some((r) => r.id === "RULE-SF-02");

  const eightFields: EightFieldTranslation = {
    category: ctx.isQipaoOvercoat
      ? "旗袍外搭短外套"
      : ctx.isTwoPieceStage
      ? "两件式套装（短外套 + 无袖连衣裙）"
      : mode === "uniform"
      ? `团体职业服三级同源套装（${ctx.headcount} 套）`
      : "外套",
    structure: ctx.isTwoPieceStage
      ? "外套：短款微 H 型，自然平肩不压肩；连衣裙：收腰大 A 摆结构，腰腹保留松量"
      : ctx.isQipaoOvercoat
      ? `H 型微收腰，自然平肩${hasHunchback ? "；后衣片加长、后背宽加放" : ""}`
      : hasSlopeShoulder
      ? "H 型直身结构，无收腰；肩型采用自然落肩，线条柔和松弛"
      : hasThinNeck || ctx.isPlumPattern
      ? "H 型直身结构，微微收腰；肩型采用微落平肩，线条简约利落"
      : `H 型直身结构，无收腰；肩型采用微落平肩，线条简约利落${
          hasHunchback ? "；后衣片加长、后背宽加放" : ""
        }`,
    collar: ctx.isQipaoOvercoat
      ? ctx.hasQipaoCollarAnswer
        ? ctx.qipaoIsStandCollar
          ? "窄青果领或无扣交领（避开旗袍立领）"
          : "圆润低立领（2.5cm 以内）或窄青果领"
        : "旗袍立领配窄青果领，无领配低立领（2.5cm 以内）"
      : ctx.isTwoPieceStage
      ? "外套：中式斜襟领，线条柔和；连衣裙：简约小圆领，贴合颈部不卡肩"
      : hasWideShoulder && !hasShortNeck
      ? "交领开襟款式，无立领，领型线条柔和舒展"
      : hasThinNeck || ctx.isPlumPattern
      ? "青果西装领，领型线条柔和舒展"
      : hasShortNeck || ctx.isAnhuiHui
      ? "低立领（领高控制在 3cm 以内），领线条圆润"
      : primaryPattern.collarSpec,
    fabric: ctx.isTwoPieceStage
      ? "外套：暗纹宋锦 + 真丝里布；连衣裙：高垂感亮面缎面，顺滑有光泽"
      : ctx.isAnhuiHui
      ? "肌理提花针织面料，质感柔软，触感柔和"
      : hasSlopeShoulder && ctx.isLowKeyXYS
      ? "香云纱面料，自带自然肌理，哑光温润，挺而不硬，垂感柔和"
      : hasWideShoulder && !ctx.isFemale
      ? "真丝暗纹织花面料，垂感适中，手感柔和，挺而不硬，穿着舒适不易贴身"
      : ctx.isPlumPattern || ctx.isQipaoOvercoat || ctx.isWeddingMom
      ? "海派高密重磅提花宋锦，配真丝里布，挺而不硬、不贴背"
      : hasBelly && hasShortNeck && !ctx.isMagnolia
      ? "垂感适中、手感柔和的醋酸或薄款提花锦，挺而不硬，穿着舒适不易贴身"
      : `${primaryFabric.name}（${primaryFabric.drapeLevel}，${primaryFabric.crispnessLevel}）`,
    color: colorFieldVal,
    patternCraft: ctx.isAnhuiHui
      ? "暗纹 + 肌理，体现徽派建筑风格"
      : ctx.isPlumPattern
      ? "衣身植物梅花暗花纹样，点缀细碎点状星光装饰，含蓄富有层次"
      : ctx.isQipaoOvercoat || ctx.isWeddingMom
      ? "同色暗纹提花，克制单点装饰（如三颗同色一字盘扣或门襟细滚边），不做大团花满绣"
      : hasWideShoulder && !ctx.isFemale && !ctx.isMagnolia
      ? "暗花小巧，低调含蓄，无外露纽扣装饰"
      : ctx.isMagnolia
      ? "海派白玉兰与花窗同色系暗纹，门襟极细嵌条"
      : mode === "uniform"
      ? "内门襟品牌色包边 + 左驳头如意免伤衣徽章扣眼，外观无外露大 Logo"
      : "无特殊需求",
    lengthRatio: ctx.hasShortHeight
      ? `衣长控制在臀围线以上${ctx.isQipaoOvercoat ? "，盖过旗袍腰线" : ""}${
          hasThickArm ? `；直筒${ctx.sleeveLengthPref || "长/九分袖"}` : ""
        }`
      : ctx.isQipaoOvercoat
      ? `衣长盖过旗袍腰线、露出旗袍下摆；直筒${ctx.sleeveLengthPref || "遮臂袖"}`
      : ctx.isTwoPieceStage
      ? "外套衣长至臀中位置；连衣裙裙长至脚踝"
      : "衣长至臀中位置",
    easeAllowance: (() => {
      const parts: string[] = [];
      if (hasHunchback) parts.push("后背加放、后衣片加长（放量值由制版师净体核准）");
      if (hasThickArm) parts.push("袖肥与袖笼加放，不做短袖和泡泡袖（待制版师核准）");
      if (hasBelly) parts.push("前片腹部区域预留充足松量，整体围度宽松");
      if (hasWideShoulder) parts.push("整体围度宽松，肩背、袖管放量充足，抬手、站立活动自在无紧绷");
      if (ctx.isTwoPieceStage)
        parts.push("外套袖管放量充足、抬臂演奏无束缚；连衣裙腰部适度收束、裙摆放量大，坐奏舒展");
      if (/敬酒/.test(fullText)) parts.push("袖笼放量，抬手敬酒衣身不往上吊");
      if (mode === "uniform")
        parts.push("国标号型套码为主，侧胁缝预留 2.0cm 给宽肩/偏胖特体员工单量微调");
      if (parts.length === 0) parts.push("整体围度宽松，活动自在，上身无束缚紧绷感");
      return parts.join("；");
    })(),
  };

  const followUpQuestions = buildTargetedFollowUps(mode, ctx, colors, bodyRules);

  const directions = buildDirections({
    mode,
    ctx,
    colors,
    primaryPattern,
    primaryFabric,
    altFabric,
    bodyRules,
  });

  // 硬要求标签行（对齐样稿 2-选方向）
  const lockedHardBadges: { label: string; colorHex?: string }[] = [];
  if (colors.colors.length > 0) {
    lockedHardBadges.push({
      label: `${colors.colors[0].nameCn.replace(/色$/, "")}主色`,
      colorHex: colors.colors[0].hex,
    });
  }
  if (hasHunchback) lockedHardBadges.push({ label: "后片加长" });
  if (hasThickArm) lockedHardBadges.push({ label: "袖肥加放" });
  if (hasShortNeck) lockedHardBadges.push({ label: "低立领 ≤3cm" });
  if (hasBelly) lockedHardBadges.push({ label: "前腹留松量" });
  if (hasSlopeShoulder) lockedHardBadges.push({ label: "自然落肩" });
  if (hasWideShoulder) lockedHardBadges.push({ label: "肩背袖笼放量" });
  if (/敬酒/.test(fullText)) lockedHardBadges.push({ label: "敬酒不吊" });
  if (ctx.isQipaoOvercoat) lockedHardBadges.push({ label: "避开旗袍立领" });
  if (ctx.hasShortHeight) lockedHardBadges.push({ label: "衣长在臀围线上" });
  if (ctx.isWeddingMom) lockedHardBadges.push({ label: "不用白色和亮片" });
  if (mode === "uniform") {
    lockedHardBadges.push({ label: "高抗皱零色差补单" }, { label: "无外露大Logo" });
  }

  // 设计单第三部分「交给人来定」（P0-5 严格分工）
  const handoffItems: HumanHandoffItem[] = [
    {
      task: hasHunchback || hasThickArm
        ? "量体：后背长、背宽、臂围与袖长"
        : hasWideShoulder
        ? "量体：肩宽、背宽、袖笼深与臂长"
        : mode === "uniform"
        ? "上门套号与特体员工净体采集"
        : "净体量体（肩宽、胸腰腹围、颈围、衣长）",
      owner: "制版师",
    },
    { task: "放量数值与富怡/ET 工业纸样", owner: "制版师" },
    { task: "实物面料色卡与手感签样", owner: "顾问" },
    { task: "正式报价、交期、合同与排产下单", owner: "业务人员" },
  ];

  const visualSlots = buildVisualSlots({
    mode,
    ctx,
    colors,
    primaryPattern,
    primaryFabric,
    eightFields,
    bodyRules,
    directions,
  });

  const activeDir = directions[0];
  const proposal = {
    proposalTitle: activeDir.title,
    clientShortLabel: ctx.isWeddingMom
      ? "陈女士 · 婚礼母亲外套"
      : mode === "uniform"
      ? `企业团装 · ${ctx.headcount} 人职业服`
      : ctx.isTwoPieceStage
      ? "舞台演奏 · 两件式演出服"
      : `个人定制 · ${eightFields.category}`,
    occasionShortLabel: ctx.isWeddingMom
      ? `女儿婚礼${ctx.seasonSpan ? ` · ${ctx.seasonSpan}` : ""}`
      : mode === "uniform"
      ? "企业四季职业形象"
      : ctx.seasonSpan || "正式定制场合",
    themeConcept: activeDir.positioning,
    stylePositioning: `${activeDir.tag} · ${activeDir.positioning}`,
    primaryPatternPlan: `${eightFields.structure}；${eightFields.easeAllowance}（基础母版 ${primaryPattern.id}）`,
    primaryFabricPlan: `${eightFields.fabric}；色彩：${eightFields.color}（面料 ${primaryFabric.id}）`,
    craftCombinationPlan: `${eightFields.patternCraft}`,
    sceneStylingAdvice: ctx.isQipaoOvercoat
      ? "外搭在旗袍外穿着，室内穿脱顺滑不钩挂旗袍面料。"
      : mode === "uniform"
      ? "跨季节模块化叠穿，兼顾日常办公与贵宾接待。"
      : "配简约素色内搭，突出领型与面料肌理。",
    designHighlights: activeDir.bullets,
    lockedHardBadges,
    directions,
    selectedDirectionId: "classic" as const,
    handoffItems,
    ...(mode === "uniform"
      ? {
          uniformTiers: [
            {
              tierName: "Tier 1 · 行政高管层",
              headcountNote: `约 ${Math.max(2, Math.round(ctx.headcount * 0.15))} 人`,
              garmentCombo: "缺角微立领外套 + 同料西裤/过膝裙",
              patternId: "PAT-UNI-01",
              fabricId: "FAB-UNI-01",
              viDesignTouch: "内门襟品牌色包边 + 如意免伤衣徽章眼",
              sizingStrategy: "净体单量，侧胁缝预留 2.0cm 微调余量",
            },
            {
              tierName: "Tier 2 · 核心业务顾问层",
              headcountNote: `约 ${Math.max(4, Math.round(ctx.headcount * 0.65))} 人`,
              garmentCombo: "东方折角窄驳领西装 + ±2cm隐形腰调西裤",
              patternId: "PAT-UNI-02",
              fabricId: "FAB-UNI-01",
              viDesignTouch: "袖叉末粒扣眼暗绣品牌色",
              sizingStrategy: "国标套码 + 特体定向改版",
            },
            {
              tierName: "Tier 3 · 贵宾迎宾礼仪层",
              headcountNote: `约 ${Math.max(2, Math.round(ctx.headcount * 0.2))} 人`,
              garmentCombo: "云肩斜襟短外套 + 抗静电玉兰暗纹过膝裙",
              patternId: "PAT-UNI-03",
              fabricId: "FAB-UNI-02",
              viDesignTouch: "偏斜襟 1.5mm 品牌色极细滚边",
              sizingStrategy: "国标女装套码，后中暗箱褶开衩防走光",
            },
          ],
        }
      : {}),
    feasibilityAlerts: {
      leadTimeEstimate:
        mode === "uniform"
          ? "参考周期 18–22 个工作日（产前封样 + 套号特体 + 批量精做）"
          : "参考周期 10–14 个工作日（CAD制版 + 初样试穿微调 + 成衣）",
      fittingCheckpoints: bodyRules.slice(0, 3).map((r) => r.masterConfirmNote),
      riskAndCareNotes: [
        `洗护说明：${primaryFabric.careInstruction}`,
        "实物面料色卡与合身度以线下确认和打样试穿为准。",
      ],
    },
    humanBoundaryNotice:
      "本设计单为前端需求梳理草稿。量体数值、富怡/ET 放量纸样、实物面料色卡、最终报价、交期与排产均由人工确认签字后生效。",
  };

  // ==================== 多智能体阶段 2：海派工艺图谱校验 Agent ====================
  const kgValidation = validateDesignAgainstKG(
    {
      customerText: fullText,
      collarText: eightFields.collar,
      patternId: activeDir.patternId,
      fabricId: activeDir.fabricId,
      craftId: activeDir.craftId,
      mode,
      requirements,
    },
    directions
  );

  // ==================== 执行 P0-2 核对器（含原话短句覆盖检查） ====================
  const verification = verifyRequirementCoverage({
    customerInput: fullText,
    customerParagraphs: advisorParagraphs, followUpQuestions,
    requirements,
    eightFields,
    proposal,
    visualSlots,
  });

  const assetMatches: ThreeDimMatchScore[] = [
    ...bodyRules.slice(0, 3).map((r) => ({
      assetId: r.id,
      assetName: r.bodyFeature,
      assetType: "体型规则" as const,
      matchReason: r.sourceRef,
      styleFit: r.collarOrSleeveAction,
      tactileFit: r.fabricConstraint,
      bodyOrRoleFit: r.patternAction,
      isPrimary: true,
    })),
    {
      assetId: primaryPattern.id,
      assetName: primaryPattern.name,
      assetType: "版型母版",
      matchReason: primaryPattern.category,
      styleFit: primaryPattern.styleTags.join("、"),
      tactileFit: primaryPattern.collarSpec,
      bodyOrRoleFit: primaryPattern.bodyAdaptationRules[0] || primaryPattern.usageNotes,
      isPrimary: true,
    },
    {
      assetId: primaryFabric.id,
      assetName: primaryFabric.name,
      assetType: "特色面料",
      matchReason: `${primaryFabric.crispnessLevel}`,
      styleFit: primaryFabric.styleFitDesc,
      tactileFit: primaryFabric.tactileFitDesc,
      bodyOrRoleFit: primaryFabric.bodyFitDesc,
      isPrimary: true,
    },
  ];

  const ts = isInitialSeed ? "14:02" : nowTimeStr();
  // 本地多智能体规则引擎只需几毫秒，耗时没有参考意义，不记录；只有大模型调用才记真实耗时。
  const LOCAL_DURATION = null;
  const ledgerNo = isInitialSeed
    ? "LY-20261120-003"
    : `LY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(
        Math.floor(100 + Math.random() * 899)
      )}`;
  const createdAt = isInitialSeed ? "2026-11-20 14:02" : nowDateTimeStr();

  // ==================== 多智能体阶段 4：版房工艺单 Agent ====================
  const baseLedger: LiangYiPlanPackage["ledger"] = {
    ledgerNo,
    createdAt,
    updatedAt: createdAt,
    projectName: proposal.proposalTitle,
    mode,
    clientOrOrgName: ctx.isWeddingMom ? "陈女士" : mode === "uniform" ? "意向团装企业" : "定制客户",
    contactDeptOrPerson: "上服定制顾问",
    headcountOrQty: mode === "uniform" ? `${ctx.headcount} 套` : "1 套",
    currentStage: 1,
    demandSummary: fullText.slice(0, 140),
    selectedPatternIds: patterns.map((p) => p.id),
    selectedFabricIds: [primaryFabric.id],
    selectedCraftIds: crafts.slice(0, 1).map((c) => c.id),
    referenceCaseIds: [refCase.id],
    estimatedTierNote: "待业务人员核价",
    fittingMemo: bodyRules.map((r) => r.masterConfirmNote).slice(0, 2).join("；") || "待净体量体",
    specialistName: "严顾问",
    reviewStatus: "待审核",
    ...(mode === "uniform"
      ? {
          uniformSizeTable: [
            {
              roleGroup: "管理与业务男装",
              gender: "男款",
              standardSizes: `48A–54A（约 ${Math.max(2, Math.round(ctx.headcount * 0.4))} 套）`,
              specialFitCount: Math.max(1, Math.round(ctx.headcount * 0.08)),
              specialFitNotes: "宽肩/偏胖特体启用胁片 2.0cm 放量单量微调",
            },
            {
              roleGroup: "顾问与迎宾女装",
              gender: "女款",
              standardSizes: `160/84A–170/92A（约 ${Math.max(2, Math.round(ctx.headcount * 0.5))} 套）`,
              specialFitCount: Math.max(1, Math.round(ctx.headcount * 0.05)),
              specialFitNotes: "按身高与领肩比例微调，配抗静电三醋酸内搭",
            },
          ],
        }
      : {}),
    auditLogs: [
      { id: "L-1", timestamp: ts, actor: "衣语 Agent", action: "对话解构 Agent · 录入客户原话", detail: fullText.slice(0, 60) },
      {
        id: "L-2",
        timestamp: ts,
        actor: "衣语 Agent",
        action: `对话解构 Agent · 拆出 ${requirements.length} 条需求`,
        detail: `已落实 ${verification.passedCount}，推断 ${verification.inferredCount}，待追问 ${verification.pendingAskCount}`,
      },
      {
        id: "L-3",
        timestamp: ts,
        actor: "衣语 Agent",
        action: "工艺图谱校验 Agent · 约束校验与归拔绑定",
        detail: kgValidation.summary,
      },
      { id: "L-4", timestamp: ts, actor: "衣语 Agent", action: "视觉企划 Agent · 生成方向 A / B / C", detail: directions.map((d) => d.title).join("；") },
    ],
  };

  const techPack = buildPatternRoomTechPack({
    mode,
    customerInput: fullText,
    requirements,
    eightFields,
    proposal,
    ledger: baseLedger,
    kgValidation,
  });

  baseLedger.auditLogs.push({
    id: "L-5",
    timestamp: ts,
    actor: "衣语 Agent",
    action: "版房工艺单 Agent · 生成工艺单草稿",
    detail: `${techPack.techPackNo}（${techPack.cadPieces.length} 项裁片，${techPack.shapingInstructions.length} 项归拔工艺）`,
  });

  const toolTraces: ToolCallTraceStep[] = [
    {
      stepIndex: 1,
      agentRole: "dialogue",
      agentName: "对话解构 Agent",
      toolName: "parse_requirements_and_conflicts",
      toolLabel: "拆解口语需求与追问缺口",
      inputArgs: { mode, paragraphs: advisorParagraphs.length },
      matchedAssetIds: bodyRules.map((r) => r.id),
      resultSummary: `拆出 ${requirements.length} 条需求，命中 ${bodyRules.length} 条体征规则，生成 ${followUpQuestions.length} 个追问`,
      durationMs: LOCAL_DURATION,
      timestamp: ts,
    },
    {
      stepIndex: 2,
      agentRole: "kg_validator",
      agentName: "工艺图谱校验 Agent",
      toolName: "search_patterns",
      toolLabel: "检索海派母版、面料与工艺资产",
      inputArgs: { mode },
      matchedAssetIds: [primaryPattern.id, primaryFabric.id, ...(crafts[0] ? [crafts[0].id] : [])],
      resultSummary: `匹配母版 ${primaryPattern.id}、面料 ${primaryFabric.id}${crafts[0] ? `、工艺 ${crafts[0].id}` : ""}`,
      durationMs: LOCAL_DURATION,
      timestamp: ts,
    },
    {
      stepIndex: 3,
      agentRole: "kg_validator",
      agentName: "工艺图谱校验 Agent",
      toolName: "validate_craft_knowledge_graph",
      toolLabel: "海派工艺图谱硬约束校验",
      inputArgs: { nodes: kgValidation.checkedNodesCount },
      matchedAssetIds: [
        ...kgValidation.requiredShaping.map((s) => s.id),
        ...kgValidation.blockedConflicts.map((c) => c.edgeId),
      ],
      resultSummary: kgValidation.summary,
      durationMs: LOCAL_DURATION,
      timestamp: ts,
    },
    {
      stepIndex: 4,
      agentRole: "visual_director",
      agentName: "视觉企划 Agent",
      toolName: "compose_visual_directions",
      toolLabel: "生成三方向方案与四分镜提示词",
      inputArgs: { directions: directions.length, visualSlots: visualSlots.length },
      matchedAssetIds: [refCase.id],
      resultSummary: `输出 ${directions.map((d) => d.tag.split(" ")[0]).join("/")} 三方向及 4 组视觉提示词`,
      durationMs: LOCAL_DURATION,
      timestamp: ts,
    },
    {
      stepIndex: 5,
      agentRole: "tech_pack",
      agentName: "版房工艺单 Agent",
      toolName: "build_pattern_room_tech_pack",
      toolLabel: "编排版房工艺单与短句覆盖终检",
      inputArgs: { cadPieces: techPack.cadPieces.length, clauses: verification.clauseCoverage.length },
      matchedAssetIds: [techPack.patternId, primaryFabric.id],
      resultSummary: `生成 ${techPack.cadPieces.length} 项裁片与 ${techPack.bomItems.length} 项 BOM；已落实 ${verification.passedCount}，待追问 ${verification.pendingAskCount}，漏句 ${verification.unhandledClauseCount}`,
      durationMs: LOCAL_DURATION,
      timestamp: ts,
    },
  ];

  // 简洁克制的顾问回复（P2：无 Markdown 粗体堆砌、无长段落）
  const kgFilterNote =
    kgValidation.filteredInfeasibleRequests.length > 0
      ? `海派工艺图谱已自动过滤 ${kgValidation.filteredInfeasibleRequests.length} 项不可制造诉求（${kgValidation.filteredInfeasibleRequests[0].pathText}）。`
      : "";
  const advisorReply = `已拆出 ${requirements.length} 条需求（已落实 ${verification.passedCount}，推断 ${verification.inferredCount}，待追问 ${verification.pendingAskCount}${
    verification.unhandledClauseCount > 0
      ? `，另有 ${verification.unhandledClauseCount} 句原话未处理需人工复核`
      : ""
  }）。${kgFilterNote}${
    followUpQuestions.length > 0
      ? `建议先确认下方 ${followUpQuestions.length} 个问题。`
      : "当前需求信息完整，可直接查看三个方向与版房工艺单。"
  }`;

  const plan: LiangYiPlanPackage = {
    scenarioId: isInitialSeed ? "INIT-SEED" : `SESS-${Date.now()}`,
    mode,
    engineSource: "local_rule_engine",
    modelUsed: params.modelLabel || "本地多智能体规则引擎（未配置大模型 Key）",
    customerInput: fullText,
    customerParagraphs: advisorParagraphs,
    conversationSummary: advisorReply,
    requirements,
    followUpQuestions,
    verification,
    toolTraces,
    sixDimensions: {
      styleTone: { dimensionName: "风格调性", completeness: 80, keywords: [], analysis: proposal.themeConcept },
      silhouette: { dimensionName: "廓形要求", completeness: 85, keywords: [], analysis: eightFields.structure },
      fabricTexture: { dimensionName: "面料质感", completeness: 80, keywords: [], analysis: eightFields.fabric },
      craftDetail: { dimensionName: "工艺细节", completeness: 75, keywords: [], analysis: eightFields.patternCraft },
      colorSystem: {
        dimensionName: "色彩体系",
        completeness: colors.colors.length > 0 || colors.hasContrast ? 95 : 20,
        keywords: [],
        analysis: eightFields.color,
      },
      sceneFitness: {
        dimensionName: "场景适配度",
        completeness: ctx.hasSeasonOrVenue ? 90 : 60,
        keywords: [],
        analysis: proposal.occasionShortLabel,
      },
    },
    eightFields,
    emotionalReport: {
      personaSummary: proposal.clientShortLabel,
      explicitNeeds: requirements.map((r) => `${r.rawPhrase} → ${r.solutionAction}`),
      implicitEmotions: [proposal.themeConcept],
      tabooRedlines: bodyRules.map((r) => r.taboo),
      advisorFollowUps: followUpQuestions.map((q) => q.question),
    },
    assetMatches,
    proposal,
    visualSlots,
    ledger: baseLedger,
    kgValidation,
    techPack,
  };

  return { plan, advisorReply };
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

export async function runLiangYiAgent(params: {
  mode: BusinessMode;
  conversation: ConversationInputTurn[];
  customConfig?: CustomLlmConfig;
}): Promise<AgentRunResponse> {
  const { mode, conversation, customConfig } = params;

  const apiKey = (
    customConfig?.apiKey || process.env.LIANGYI_LLM_API_KEY || process.env.DEEPSEEK_API_KEY || ""
  ).trim();
  const baseUrl = (
    (customConfig?.apiKey?.trim() && customConfig.baseUrl) ||
    process.env.LIANGYI_LLM_BASE_URL ||
    "https://api.deepseek.com/v1"
  )
    .trim()
    .replace(/\/+$/, "");
  const model = (
    customConfig?.model ||
    process.env.LIANGYI_LLM_MODEL ||
    "deepseek-chat"
  ).trim();

  const fallback = runLocalRuleEngine({ mode, conversation });
  if (customConfig?.localOnly || !apiKey) {
    return fallback;
  }

  try {
    const systemPrompt = `你是上海服装集团「衣语 TailorMind」海派定制 AI 企划助手。
请严格遵守：
1. 先调用工具检索体型/外搭规则库（search_body_rules）与版型/面料/工艺/案例库，再输出方案，严禁编造资产编号。
2. 把客户原话拆成逐条 RequirementItem[]，每条必须附 sourceSpan（原话精确子串），状态只能是「已落实 / 推断 / 待追问」之一。
3. 责任归属必须准确：体型放量归「制版师」（超出上服6案例的通用体型规则标 needsMasterApproval: true）；场合与外搭领型确认归「顾问」；审美方向归「设计师」；颜色未提时【色彩】必须写「无特殊需求」，绝不擅自定色。
4. 追问只问改变方案的缺口或冲突，已答过的不问，最多 3 个。
5. 三个方向（A · 稳妥 / B · 一处亮点 / C · 简洁现代）必须全部满足硬要求，卖点写成 3 条针对本客户的短句，绝不出现与场景无关的商务套话。
当前模式：${mode === "uniform" ? "团体职业服" : "海派高级私定"}。`;

    const messages: Record<string, unknown>[] = [
      { role: "system", content: systemPrompt },
      ...conversation.map((t) => ({
        role: t.role === "advisor" ? "user" : "assistant",
        content: t.content,
      })),
    ];

    const liveTraces: ToolCallTraceStep[] = [];
    const collectedPatterns = new Map<string, PatternAsset>();
    const collectedFabrics = new Map<string, FabricAsset>();
    const collectedCrafts = new Map<string, CraftAsset>();
    const collectedCases = new Map<string, HistoricalCaseAsset>();

    for (let round = 0; round < 3; round++) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools: AGENT_OPENAI_TOOLS,
          tool_choice: round === 0 ? "required" : "auto",
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) throw new Error(`LLM Tool Round ${round + 1} HTTP ${res.status}`);
      const data = await res.json();
      const assistantMsg = data?.choices?.[0]?.message;
      const toolCalls = assistantMsg?.tool_calls;
      if (!Array.isArray(toolCalls) || toolCalls.length === 0) break;

      messages.push(assistantMsg);
      for (const tc of toolCalls) {
        const fnName = tc?.function?.name as string;
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc?.function?.arguments || "{}");
        } catch {
          parsedArgs = {};
        }

        const tTool = Date.now();
        let toolOutput: unknown = [];
        let matchedIds: string[] = [];

        if (fnName === "search_body_rules") {
          const r = searchBodyRulesTool({
            rawText: conversation.map((c) => c.content).join(" "),
            bodyOrOccasionKeywords: (parsedArgs.bodyOrOccasionKeywords as string[]) || [],
          });
          toolOutput = r;
          matchedIds = r.map((x) => x.id);
        } else if (fnName === "search_patterns") {
          const r = searchPatternsTool({
            mode: (parsedArgs.mode as BusinessMode) || mode,
            keywords: (parsedArgs.keywords as string[]) || [],
            bodyOrRoleSignals: (parsedArgs.bodyOrRoleSignals as string[]) || [],
          });
          r.forEach((x) => collectedPatterns.set(x.id, x));
          toolOutput = r;
          matchedIds = r.map((x) => x.id);
        } else if (fnName === "search_fabrics") {
          const r = searchFabricsTool({
            mode: (parsedArgs.mode as BusinessMode) || mode,
            keywords: (parsedArgs.keywords as string[]) || [],
            requireHighWrinkleResistance: Boolean(parsedArgs.requireHighWrinkleResistance),
          });
          r.forEach((x) => collectedFabrics.set(x.id, x));
          toolOutput = r;
          matchedIds = r.map((x) => x.id);
        } else if (fnName === "search_crafts") {
          const r = searchCraftsTool({
            mode: (parsedArgs.mode as BusinessMode) || mode,
            keywords: (parsedArgs.keywords as string[]) || [],
            subtleViOrTrim: Boolean(parsedArgs.subtleViOrTrim),
          });
          r.forEach((x) => collectedCrafts.set(x.id, x));
          toolOutput = r;
          matchedIds = r.map((x) => x.id);
        } else if (fnName === "retrieve_similar_cases") {
          const r = retrieveSimilarCasesTool({
            mode: (parsedArgs.mode as BusinessMode) || mode,
            keywords: (parsedArgs.keywords as string[]) || [],
          });
          r.forEach((x) => collectedCases.set(x.id, x));
          toolOutput = r;
          matchedIds = r.map((x) => x.id);
        }

        liveTraces.push({
          stepIndex: liveTraces.length + 1,
          toolName: fnName as ToolCallTraceStep["toolName"],
          toolLabel: `调用 ${fnName}`,
          inputArgs: parsedArgs,
          matchedAssetIds: matchedIds,
          resultSummary: `返回 ${matchedIds.join("、") || "0 条"}`,
          durationMs: Date.now() - tTool,
          timestamp: nowTimeStr(),
        });

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolOutput),
        });
      }
    }

    const synthesisPrompt = `请仅输出严格 JSON（不加 Markdown 解释），结构如下：
{
  "advisorReply": "一两句简明回复，不用粗体",
  "requirements": [
    {
      "id": "REQ-01",
      "index": 1,
      "rawPhrase": "精简客户说的",
      "sourceSpan": "原话中的精确子串",
      "category": "体型修饰|功能动作|场合礼仪|色彩材质|审美风格|明确禁忌|穿搭结构|团装管理",
      "isHardRequirement": true,
      "priority": 1,
      "solutionAction": "简明具体做法",
      "rationale": "规则来源",
      "ruleOrAssetId": "规则或资产ID",
      "status": "已落实|推断|待追问",
      "ownerRole": "制版师|顾问|设计师|业务人员",
      "needsMasterApproval": false
    }
  ],
  "followUpQuestions": [
    { "id": "FQ-1", "question": "具体追问", "whyItMatters": "影响说明", "isConflict": false, "impactRank": 1, "quickAnswers": ["选项1","选项2"] }
  ],
  "eightFields": {
    "category": "", "structure": "", "collar": "", "fabric": "", "color": "", "patternCraft": "", "lengthRatio": "", "easeAllowance": ""
  },
  "directions": [
    { "id": "classic", "tag": "A · 稳妥", "title": "方向名", "swatches": [{"hex":"#6E1F2B","label":"酒红"},{"hex":"#57202A","label":"同色暗纹"}], "bullets": ["短卖点1","短卖点2","短卖点3"], "patternId": "PAT-SF-02", "fabricId": "FAB-SF-01", "craftId": "CRF-05" },
    { "id": "accent", "tag": "B · 一处亮点", "title": "...", "swatches": [], "bullets": ["","",""], "patternId": "", "fabricId": "" },
    { "id": "modern", "tag": "C · 简洁现代", "title": "...", "swatches": [], "bullets": ["","",""], "patternId": "", "fabricId": "" }
  ],
  "visualPrompts": [
    { "slotId": "design_effect", "seedreamPromptCn": "...", "midjourneyPromptEn": "...", "negativePrompt": "..." },
    { "slotId": "details", "seedreamPromptCn": "...", "midjourneyPromptEn": "...", "negativePrompt": "..." },
    { "slotId": "fabric_pattern", "seedreamPromptCn": "...", "midjourneyPromptEn": "...", "negativePrompt": "..." },
    { "slotId": "lookbook", "seedreamPromptCn": "...", "midjourneyPromptEn": "...", "negativePrompt": "..." }
  ]
}`;

    messages.push({ role: "user", content: synthesisPrompt });
    const tSyn = Date.now();
    const resFinal = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.25,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!resFinal.ok) throw new Error(`LLM Synthesis HTTP ${resFinal.status}`);
    const finalData = await resFinal.json();
    const parsed = extractJsonObject(finalData?.choices?.[0]?.message?.content || "");
    if (!parsed) throw new Error("大模型返回 JSON 解析失败");

    const llmReqs =
      Array.isArray(parsed.requirements) && parsed.requirements.length > 0
        ? (parsed.requirements as RequirementItem[]).map((r, i) => ({
            ...r,
            index: r.index || i + 1,
            id: r.id || `REQ-${String(i + 1).padStart(2, "0")}`,
          }))
        : fallback.plan.requirements;

    const llmFollowUps = Array.isArray(parsed.followUpQuestions)
      ? (parsed.followUpQuestions as FollowUpQuestion[]).slice(0, 3)
      : fallback.plan.followUpQuestions;

    const llmEightFields: EightFieldTranslation = {
      ...fallback.plan.eightFields,
      ...((parsed.eightFields as Partial<EightFieldTranslation>) || {}),
    };

    const llmDirsRaw = Array.isArray(parsed.directions)
      ? (parsed.directions as Partial<DesignDirectionOption>[])
      : [];
    const mergedDirs: DesignDirectionOption[] = fallback.plan.proposal.directions.map((baseDir, i) => {
      const override = llmDirsRaw.find((d) => d.id === baseDir.id) || llmDirsRaw[i];
      if (!override) return baseDir;
      return {
        ...baseDir,
        tag: override.tag || baseDir.tag,
        title: override.title || baseDir.title,
        swatches:
          Array.isArray(override.swatches) && override.swatches.length >= 2
            ? override.swatches.slice(0, 2)
            : baseDir.swatches,
        bullets:
          Array.isArray(override.bullets) && override.bullets.length >= 3
            ? override.bullets.slice(0, 3)
            : baseDir.bullets,
        patternId: override.patternId || baseDir.patternId,
        fabricId: override.fabricId || baseDir.fabricId,
        craftId: override.craftId || baseDir.craftId,
      };
    });

    const llmVis = Array.isArray(parsed.visualPrompts)
      ? (parsed.visualPrompts as Partial<VisualPromptSlot>[])
      : [];
    const mergedVisualSlots = fallback.plan.visualSlots.map((slot) => {
      const ov = llmVis.find((v) => v.slotId === slot.slotId);
      if (!ov) return slot;
      return {
        ...slot,
        seedreamPromptCn: ov.seedreamPromptCn || slot.seedreamPromptCn,
        midjourneyPromptEn: ov.midjourneyPromptEn || slot.midjourneyPromptEn,
        negativePrompt: ov.negativePrompt || slot.negativePrompt,
      };
    });

    const mergedProposal = {
      ...fallback.plan.proposal,
      proposalTitle: mergedDirs[0]?.title || fallback.plan.proposal.proposalTitle,
      directions: mergedDirs,
    };

    const verification = verifyRequirementCoverage({
      customerInput: fallback.plan.customerInput,
      customerParagraphs: fallback.plan.customerParagraphs, followUpQuestions: llmFollowUps,
      requirements: llmReqs,
      eightFields: llmEightFields,
      proposal: mergedProposal,
      visualSlots: mergedVisualSlots,
    });

    const liveKgValidation = validateDesignAgainstKG(
      {
        customerText: fallback.plan.customerInput,
        collarText: llmEightFields.collar,
        patternId: mergedDirs[0]?.patternId,
        fabricId: mergedDirs[0]?.fabricId,
        craftId: mergedDirs[0]?.craftId,
        mode,
        requirements: llmReqs,
      },
      mergedDirs
    );

    const liveLedger = {
      ...fallback.plan.ledger,
      projectName: mergedProposal.proposalTitle,
      selectedPatternIds: collectedPatterns.size
        ? Array.from(collectedPatterns.keys())
        : fallback.plan.ledger.selectedPatternIds,
      selectedFabricIds: collectedFabrics.size
        ? Array.from(collectedFabrics.keys())
        : fallback.plan.ledger.selectedFabricIds,
      selectedCraftIds: collectedCrafts.size
        ? Array.from(collectedCrafts.keys())
        : fallback.plan.ledger.selectedCraftIds,
      referenceCaseIds: collectedCases.size
        ? Array.from(collectedCases.keys())
        : fallback.plan.ledger.referenceCaseIds,
    };

    const liveTechPack = buildPatternRoomTechPack({
      mode,
      customerInput: fallback.plan.customerInput,
      requirements: llmReqs,
      eightFields: llmEightFields,
      proposal: mergedProposal,
      ledger: liveLedger,
      kgValidation: liveKgValidation,
    });

    liveTraces.push(
      {
        stepIndex: liveTraces.length + 1,
        agentRole: "kg_validator",
        agentName: "工艺图谱校验 Agent",
        toolName: "validate_craft_knowledge_graph",
        toolLabel: "海派工艺图谱硬约束校验",
        inputArgs: { nodes: liveKgValidation.checkedNodesCount },
        matchedAssetIds: liveKgValidation.requiredShaping.map((s) => s.id),
        resultSummary: liveKgValidation.summary,
        durationMs: 2,
        timestamp: nowTimeStr(),
      },
      {
        stepIndex: liveTraces.length + 2,
        agentRole: "tech_pack",
        agentName: "版房工艺单 Agent",
        toolName: "verify_requirements_coverage",
        toolLabel: "编排版房工艺单与短句覆盖终检",
        inputArgs: { model, cadPieces: liveTechPack.cadPieces.length },
        matchedAssetIds: Array.from(collectedPatterns.keys()).concat(
          Array.from(collectedFabrics.keys()),
          Array.from(collectedCrafts.keys())
        ),
        resultSummary: `生成 ${liveTechPack.cadPieces.length} 项裁片；核对完成：已落实 ${verification.passedCount}，待追问 ${verification.pendingAskCount}，未处理短句 ${verification.unhandledClauseCount}`,
        durationMs: Date.now() - tSyn,
        timestamp: nowTimeStr(),
      }
    );

    const advisorReply =
      typeof parsed.advisorReply === "string" && parsed.advisorReply.trim()
        ? parsed.advisorReply.trim()
        : fallback.advisorReply;

    return {
      advisorReply,
      plan: {
        ...fallback.plan,
        engineSource: "live_llm_tool_call",
        modelUsed: `${model}（实时调用）`,
        conversationSummary: advisorReply,
        requirements: llmReqs,
        followUpQuestions: llmFollowUps,
        verification,
        toolTraces: liveTraces,
        eightFields: llmEightFields,
        proposal: mergedProposal,
        visualSlots: mergedVisualSlots,
        ledger: liveLedger,
        kgValidation: liveKgValidation,
        techPack: liveTechPack,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "调用失败";
    return {
      plan: {
        ...fallback.plan,
        modelUsed: `本地规则引擎（模型回退：${msg}）`,
      },
      advisorReply: fallback.advisorReply,
    };
  }
}
