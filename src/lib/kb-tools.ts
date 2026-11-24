import { BODY_TAILORING_RULES, type BodyTailoringRule } from "@/data/kb-body-rules";
import { PATTERN_KB } from "@/data/kb-patterns";
import { FABRIC_KB } from "@/data/kb-fabrics";
import { CRAFT_KB } from "@/data/kb-crafts";
import { CASE_KB } from "@/data/kb-cases";
import type {
  BusinessMode,
  CraftAsset,
  FabricAsset,
  HistoricalCaseAsset,
  PatternAsset,
} from "@/lib/types";

function scoreTextMatch(haystack: string, keywords: string[]): number {
  let score = 0;
  const lowerHay = haystack.toLowerCase();
  for (const kw of keywords) {
    const clean = kw.trim().toLowerCase();
    if (!clean) continue;
    if (lowerHay.includes(clean)) {
      score += clean.length >= 3 ? 20 : 12;
    } else {
      for (const ch of clean) {
        if (ch.trim() && lowerHay.includes(ch)) {
          score += 1;
        }
      }
    }
  }
  return score;
}

export function searchBodyRulesTool(args: {
  rawText?: string;
  bodyOrOccasionKeywords: string[];
}): BodyTailoringRule[] {
  const raw = (args.rawText || "").toLowerCase();
  const kws = (args.bodyOrOccasionKeywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);
  const queryBlob = [raw, ...kws].join(" ");

  const hits = BODY_TAILORING_RULES.map((rule) => {
    let score = 0;
    for (const kw of rule.triggerKeywords) {
      if (queryBlob.includes(kw.toLowerCase())) {
        score += 30;
      }
    }
    for (const rxStr of rule.triggerRegexes) {
      try {
        const rx = new RegExp(rxStr, "i");
        if (rx.test(queryBlob)) {
          score += 35;
        }
      } catch {
        // ignore invalid regex
      }
    }
    if (!raw && kws.length > 0) {
      for (const kw of kws) {
        if (
          kw.length >= 2 &&
          (rule.bodyFeature.toLowerCase().includes(kw) ||
            rule.triggerKeywords.some((tk) => tk.toLowerCase().includes(kw)))
        ) {
          score += 20;
        }
      }
    }
    return { rule, score };
  }).filter((x) => x.score >= 20);

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, 6).map((x) => x.rule);
}

export function searchPatternsTool(args: {
  mode: BusinessMode;
  keywords: string[];
  bodyOrRoleSignals?: string[];
}): PatternAsset[] {
  const allSignals = [...(args.keywords || []), ...(args.bodyOrRoleSignals || [])];
  const candidates = PATTERN_KB.filter(
    (p) => p.modeScope === args.mode || p.modeScope === "both"
  );

  const scored = candidates.map((p) => {
    const blob = [
      p.name,
      p.category,
      p.silhouetteType,
      p.shoulderSpec,
      p.collarSpec,
      ...p.bodyAdaptationRules,
      ...p.sceneTags,
      ...p.styleTags,
      p.usageNotes,
    ].join(" ");
    let s = scoreTextMatch(blob, allSignals);
    if (p.modeScope === args.mode) s += 10;
    return { item: p, score: s };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, args.mode === "uniform" ? 3 : 2).map((x) => x.item);
}

export function searchFabricsTool(args: {
  mode: BusinessMode;
  keywords: string[];
  requireHighWrinkleResistance?: boolean;
}): FabricAsset[] {
  const candidates = FABRIC_KB.filter(
    (f) => f.modeScope === args.mode || f.modeScope === "both"
  );

  const scored = candidates.map((f) => {
    const blob = [
      f.name,
      f.category,
      f.composition,
      f.drapeLevel,
      f.crispnessLevel,
      f.lusterLevel,
      f.wrinkleResistance,
      f.styleFitDesc,
      f.tactileFitDesc,
      f.bodyFitDesc,
      ...f.tags,
    ].join(" ");
    let s = scoreTextMatch(blob, args.keywords || []);
    if (f.modeScope === args.mode) s += 10;
    if (
      args.requireHighWrinkleResistance &&
      (f.wrinkleResistance.includes("极高") || f.wrinkleResistance === "高")
    ) {
      s += 18;
    }
    return { item: f, score: s };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((x) => x.item);
}

export function searchCraftsTool(args: {
  mode: BusinessMode;
  keywords: string[];
  subtleViOrTrim?: boolean;
}): CraftAsset[] {
  const candidates = CRAFT_KB.filter(
    (c) => c.modeScope === args.mode || c.modeScope === "both"
  );

  const scored = candidates.map((c) => {
    const blob = [
      c.name,
      c.craftCategory,
      c.culturalOrigin,
      c.visualEffect,
      c.viIntegrationNote,
      ...c.tags,
    ].join(" ");
    let s = scoreTextMatch(blob, args.keywords || []);
    if (c.modeScope === args.mode) s += 10;
    if (args.subtleViOrTrim && (c.id === "CRF-08" || c.id === "CRF-03")) {
      s += 15;
    }
    return { item: c, score: s };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((x) => x.item);
}

export function retrieveSimilarCasesTool(args: {
  mode: BusinessMode;
  keywords: string[];
}): HistoricalCaseAsset[] {
  const scored = CASE_KB.map((c) => {
    const blob = [
      c.title,
      c.customerRawQuote,
      c.translation.collar,
      c.translation.fabric,
      c.translation.structure,
      c.translation.patternCraft,
      c.expertTakeaway,
      ...c.tags,
    ].join(" ");
    let s = scoreTextMatch(blob, args.keywords || []);
    if (c.mode === args.mode) s += 18;
    return { item: c, score: s };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((x) => x.item);
}

export const AGENT_OPENAI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_body_rules",
      description:
        "检索「体型/体态/穿搭结构 → 裁剪」规则库（覆盖短颈、肚腩、溜肩、宽肩、驼背、手臂粗、旗袍外搭、身高娇小、婚礼母亲、团装等）",
      parameters: {
        type: "object",
        properties: {
          bodyOrOccasionKeywords: {
            type: "array",
            items: { type: "string" },
            description: "体征、穿搭结构或场合关键词",
          },
        },
        required: ["bodyOrOccasionKeywords"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_patterns",
      description: "从上服集团版型母版库中检索基础母版（含富怡/ET CAD裁片与放量规则）",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["bespoke", "uniform"] },
          keywords: { type: "array", items: { type: "string" } },
          bodyOrRoleSignals: { type: "array", items: { type: "string" } },
        },
        required: ["mode", "keywords"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_fabrics",
      description: "按风格、体感、体型/岗位三维逻辑检索集团存量面料",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["bespoke", "uniform"] },
          keywords: { type: "array", items: { type: "string" } },
          requireHighWrinkleResistance: { type: "boolean" },
        },
        required: ["mode", "keywords"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_crafts",
      description: "检索海派盘扣、极细嵌条滚边、建筑分割、同色暗纹或团装内敛VI工艺",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["bespoke", "uniform"] },
          keywords: { type: "array", items: { type: "string" } },
          subtleViOrTrim: { type: "boolean" },
        },
        required: ["mode", "keywords"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "retrieve_similar_cases",
      description: "调取上服集团历史案例作为工艺比例参考（不得用历史案例默认色覆盖当前客户明说要求）",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["bespoke", "uniform"] },
          keywords: { type: "array", items: { type: "string" } },
        },
        required: ["mode", "keywords"],
      },
    },
  },
];
