import { BODY_TAILORING_RULES } from "@/data/kb-body-rules";
import { CASE_KB } from "@/data/kb-cases";
import { CRAFT_KB } from "@/data/kb-crafts";
import { FABRIC_KB } from "@/data/kb-fabrics";
import { PATTERN_KB } from "@/data/kb-patterns";
import type { HistoricalCaseAsset } from "@/lib/types";

export const ASSET_CATEGORIES = ["特色面料", "版型母版", "海派工艺", "体型规则", "历史案例"] as const;
export type AssetCategory = typeof ASSET_CATEGORIES[number];
export interface CatalogAsset {
  id: string;
  category: AssetCategory;
  name: string;
  description: string;
  tags: string[];
  // 检索与规则比对使用原始资产属性；案例中的客户禁忌不算资产特征。
  attributes: string;
  filterText: string;
  image?: string;
  imageFit?: "cover" | "diagram" | "zoom";
}

const CURATED_ASSET_IMAGES: Record<string, { url: string; fit: "cover" | "diagram" }> = {
  // 特色面料色卡微距
  "FAB-SF-01": { url: "/generated/swatch-burgundy-songjin.jpg", fit: "cover" },
  "FAB-UNI-01": { url: "/generated/swatch-navy-wool.jpg", fit: "cover" },
  "FAB-UNI-02": { url: "/generated/swatch-magnolia-triacetate.jpg", fit: "cover" },
  "FAB-UNI-03": { url: "/generated/swatch-sorona-twill.jpg", fit: "cover" },
  // 团装版型母版
  "PAT-UNI-01": { url: "/generated/dir-bank-a.jpg", fit: "cover" },
  "PAT-UNI-02": { url: "/generated/dir-bank-c.jpg", fit: "cover" },
  "PAT-UNI-03": { url: "/generated/asset-pat-uni-03.jpg", fit: "cover" },
  // 海派工艺微距
  "CRF-06": { url: "/generated/asset-crf-06.jpg", fit: "cover" },
  "CRF-08": { url: "/generated/asset-crf-08.jpg", fit: "cover" },
  // 通用体型/场合裁剪规则（海派版房手绘示意图与场景参考）
  "RULE-GEN-01": { url: "/generated/rule-round-back.jpg", fit: "diagram" },
  "RULE-GEN-02": { url: "/generated/rule-arm-sleeve.jpg", fit: "diagram" },
  "RULE-GEN-08": { url: "/generated/rule-qipao-layer.jpg", fit: "diagram" },
  "RULE-GEN-03": { url: "/generated/rule-pear-hip.jpg", fit: "diagram" },
  "RULE-GEN-04": { url: "/generated/rule-petite-ratio.jpg", fit: "diagram" },
  "RULE-GEN-05": { url: "/generated/rule-full-bust.jpg", fit: "diagram" },
  "RULE-GEN-06": { url: "/generated/lookbook-wedding.jpg", fit: "cover" },
  "RULE-GEN-07": { url: "/generated/lookbook-bank.jpg", fit: "cover" },
  // 团装历史案例
  "CASE-UNI-01": { url: "/generated/lookbook-bank.jpg", fit: "cover" },
};

function caseRefs(id: string) {
  return CASE_KB.filter(c => [c.matchedPatternId, c.matchedFabricId, ...c.matchedCraftIds].includes(id));
}

function catalogEntry(category: AssetCategory, id: string, name: string, description: string,
  tags: string[], fields: string[], cases: HistoricalCaseAsset[], scope = ""): CatalogAsset {
  const attributes = [name, description, ...fields, ...tags].join(" ");
  const curated = CURATED_ASSET_IMAGES[id];
  const photos = cases.flatMap(c => c.images);
  const photosOfGarment = photos.filter(p => p.stage === "实拍成衣");
  const fallbackImage = photosOfGarment.find(p => tags.some(t => p.caption.includes(t)) || (name.includes("缎") && p.caption.includes("缎")))
    || photosOfGarment[0] || photos.find(p => p.stage === "上身效果");
  return {
    id, category, name, description, tags, attributes,
    image: curated?.url ?? fallbackImage?.url,
    imageFit: curated ? curated.fit : "zoom",
    filterText: [attributes, scope, ...cases.flatMap(c => [c.title, ...c.tags])].join(" "),
  };
}

export const ASSET_CATALOG: CatalogAsset[] = [
  ...BODY_TAILORING_RULES.map(r => catalogEntry("体型规则", r.id, r.bodyFeature, r.patternAction,
    [r.category, r.ownerRole, ...r.triggerKeywords], [r.collarOrSleeveAction, r.fabricConstraint],
    CASE_KB.filter(c => {
      const ref = c.title.match(/案例[一二三四五六七八]/)?.[0];
      return ref && r.sourceRef.includes(ref);
    }))),
  ...PATTERN_KB.map(p => catalogEntry("版型母版", p.id, p.name, p.usageNotes,
    [...p.styleTags, ...p.sceneTags], [p.category, p.silhouetteType, p.collarSpec, p.shoulderSpec,
      p.lengthSpec, ...p.bodyAdaptationRules], caseRefs(p.id), p.modeScope === "uniform" ? "团装" : "")),
  ...FABRIC_KB.map(f => catalogEntry("特色面料", f.id, f.name, f.styleFitDesc, f.tags,
    [f.category, f.lusterLevel, f.composition, f.crispnessLevel, f.drapeLevel, f.tactileFitDesc, f.bodyFitDesc,
      f.careInstruction, ...f.season], caseRefs(f.id), f.modeScope === "uniform" ? "团装" : "")),
  ...CRAFT_KB.map(c => catalogEntry("海派工艺", c.id, c.name, c.visualEffect, c.tags,
    [c.craftCategory, c.culturalOrigin, c.viIntegrationNote, c.cadTechPoints], caseRefs(c.id),
    c.modeScope === "uniform" ? "团装" : "")),
  ...CASE_KB.map(c => catalogEntry("历史案例", c.id, c.title, c.expertTakeaway, c.tags,
    Object.values(c.translation), [c], c.mode === "uniform" ? "团装" : "")),
];

export const ASSET_BY_ID = new Map(ASSET_CATALOG.map(a => [a.id, a]));

export const SCENE_FILTERS: Record<string, RegExp> = {
  婚礼宴会: /婚礼|婚宴|结婚|礼服|晚宴|主婚/,
  商务正式: /商务|正式|论坛|会谈|政务|高管/,
  舞台演出: /舞台|演出|演奏|剧场/,
  团体职业: /团装|职业服|企业VI|职业装|制服|套号/i,
};
export const STYLE_FILTERS: Record<string, RegExp> = {
  端庄: /端庄|稳重|庄重|沉稳/,
  内敛: /内敛|低调|含蓄|克制|素净/,
  现代: /现代|简约|极简|几何/,
};

export function filterAssets(category: AssetCategory, query: string, scene: string, style: string) {
  const term = query.trim().toLowerCase();
  return ASSET_CATALOG.filter(a => a.category === category &&
    [a.id, a.attributes].join(" ").toLowerCase().includes(term) &&
    (!SCENE_FILTERS[scene] || SCENE_FILTERS[scene].test(a.filterText)) &&
    (!STYLE_FILTERS[style] || STYLE_FILTERS[style].test(a.filterText)));
}
