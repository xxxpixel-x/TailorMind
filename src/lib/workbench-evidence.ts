import { ASSET_BY_ID, type CatalogAsset } from "@/lib/asset-catalog";
import { currentDirection, materialIds } from "@/lib/workbench-orders";
import type { DesignDirectionOption, LiangYiPlanPackage, SixDimensionBreakdown } from "@/lib/types";

type Dimension = keyof SixDimensionBreakdown;
const dimensionLinks: { key: Dimension; fields: (keyof LiangYiPlanPackage["eightFields"])[]; topics: RegExp[] }[] = [
  { key: "styleTone", fields: [], topics: [/婚礼|主婚|婚宴/, /端庄|稳重|庄重/, /克制|内敛|低调/, /老气|年轻|显精神/, /玉兰|江南|海派文化/, /现代|简约|利落/] },
  { key: "silhouette", fields: ["structure", "lengthRatio", "easeAllowance"], topics: [/收腰|腰省/, /直身|宽松|H\s*型/i,
    /后背|后衣片|后片/, /袖肥|袖管|臂围/, /袖笼|抬臂|抬手/, /衣长|腰线/, /腹部|肚腩|前腹/, /落肩|肩宽|肩背/, /叠穿|外搭|内搭/, /特体|套码/] },
  { key: "fabricTexture", fields: ["fabric"], topics: [/骨感|挺而不硬|不贴/, /垂感|垂顺/, /宋锦|织锦/, /真丝|桑蚕丝/,
    /抗皱|免烫/, /透气|亲肤/, /肌理|提花|织花/, /里布|夹棉/, /哑光|光泽/] },
  { key: "craftDetail", fields: ["patternCraft", "collar"], topics: [/立领|领型|青果领|交领/, /袖口|袖叉/, /暗花|暗纹/,
    /装饰|满绣|纹样/, /盘扣|纽扣/, /滚边|嵌条|包边/, /徽章|扣眼|Logo/i] },
  { key: "colorSystem", fields: ["color"], topics: [/酒红|绛红/, /青色|藏青|海蓝/, /香槟金|金色/, /白色|米白/, /撞色|拼色/, /主色|品牌色|配色/, /同色/] },
  { key: "sceneFitness", fields: [], topics: [/女儿|婚礼|结婚|主婚/, /商务|演讲|论坛/, /舞台|演奏|演出/, /职业|团装|企业|岗位/, /室内|户外/, /春秋|季节|秋冬|月[底初中]/] },
];

export function dimensionEvidence(pkg: LiangYiPlanPackage) {
  return dimensionLinks.map(({ key, topics, fields }) => {
    const dim = pkg.sixDimensions[key];
    const context = [dim.analysis, ...dim.keywords, ...fields.map(f => pkg.eightFields[f])].join(" ");
    const sources = !dim.analysis || /^(无特殊需求|未提及|待补充)$/.test(dim.analysis) ? [] : pkg.requirements.filter(r => {
      const text = [r.rawPhrase, r.sourceSpan, r.solutionAction].join(" ");
      return dim.keywords.some(k => k.length >= 2 && text.includes(k)) ||
        topics.some(term => term.test(context) && term.test(text));
    });
    return { key, label: key === "sceneFitness" ? "场景适配" : dim.dimensionName, analysis: dim.analysis, sources };
  });
}

// 同一组词指向一种具体诉求，避免靠「外套」「适合」这样的泛词建立出处。
const concepts = [
  /婚礼|结婚|母亲|主婚|喜气|新娘/, /老气|年轻|显老/, /端庄|庄重|稳重/,
  /旗袍|叠穿|外搭|内搭/, /驼背|圆背|后背|后衣片/, /手臂|胳膊|袖肥|臂围|遮臂/,
  /骨感|挺而不硬|不贴身|不贴背/, /宽肩|肩背|压肩/, /低立领|短颈|脖子|卡脖/,
  /肚腩|腹部|腹围|前腹/, /肩斜|溜肩|落肩/, /九分袖|长袖|袖长/,
  /抬手|抬臂|举手|举杯|袖笼/, /收腰|腰线/, /青果领|青果西装领|窄青果/,
  /暗纹|暗花|暗影/, /极简|克制|简洁|简约|素净|含蓄/, /梅花|梅枝|傲梅/,
  /玉兰|石库门|江南/, /徽派|马头墙|阶梯/, /抗皱|免烫|抗褶/, /机洗|水洗/,
  /补单|批次|色差/, /职业服|团装|套号|岗位/, /演奏|舞台|演出/,
  /滚边|嵌条|包边/, /刺绣|满绣/, /撞色/, /色卡|主色|配色/,
  /酒红|绛红/, /藏青|海军蓝/, /干练|商务|专业形象/, /透气|透湿/,
];

function evidenceScore(text: string, other: string) {
  return concepts.filter(term => term.test(text) && term.test(other)).length;
}

export function emotionEvidence(pkg: LiangYiPlanPackage) {
  const { implicitEmotions, explicitNeeds } = pkg.emotionalReport;
  const anchored = pkg.requirements.flatMap(req => {
    const quote = [req.sourceSpan, req.rawPhrase].find(s => s && pkg.customerParagraphs.some(p => p.includes(s)));
    return quote ? [{ req, quote }] : [];
  });
  const cards: { title: string; quote: string }[] = [];
  // 优先呈现情绪判断，再依次保留不同类别的明确需求。
  const explicit = explicitNeeds.map(text => {
    const title = text.split(/\s*→\s*/)[0];
    const source = anchored.find(a => a.req.rawPhrase === title || a.quote === title);
    return { title, source };
  });
  // 优先从「想遮」「怕」「喜欢」等明确原话中呈现客户的在意点。
  function preferenceRank(entry: typeof explicit[number]) {
    if (!entry.source) return 0;
    const { quote, req } = entry.source;
    if (req.category === "审美风格" || req.category === "明确禁忌") return 5;
    if (/想遮|不想|怕|喜欢|希望|担心|必须|不要/.test(quote)) return 4;
    if (req.category === "色彩材质") return 3;
    if (req.category === "体型修饰" || req.category === "功能动作") return 2;
    return 1;
  }
  const rankedExplicit = [...explicit].sort((a, b) => preferenceRank(b) - preferenceRank(a));
  const usedCategories = new Set<string>();
  function add(title: string, source: typeof anchored[number] | undefined) {
    if (!source || cards.some(c => c.quote === source.quote) || cards.length === 4) return;
    cards.push({ title, quote: source.quote });
    usedCategories.add(source.req.category);
  }
  function findSource(title: string) {
    const literal = anchored.find(a => title.includes(a.quote) || a.quote.includes(title));
    if (literal) return literal;
    const ranked = anchored.map(a => ({ a, score: evidenceScore(title, a.req.rawPhrase + a.req.solutionAction) }))
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.score ? ranked[0].a : undefined;
  }
  for (const emotion of implicitEmotions) add(emotion, findSource(emotion));
  for (const { title, source } of rankedExplicit) {
    if (source && !usedCategories.has(source.req.category)) add(title, source);
  }
  for (const { title, source } of explicit) add(title, source || findSource(title));
  return cards;
}

export { questionSource } from "@/lib/workbench-orders";

interface ConflictRule { taboo: RegExp; property: RegExp; advice: string }
const conflictRules: ConflictRule[] = [
  {
    taboo: /(?:不要|不想|不喜欢|不爱|不用|不能|避免|拒绝|忌|别用|不做)[^。，；,\n]{0,18}?(?:亮片|闪光|反光|微闪|亮面|闪亮)/,
    property: /微闪星光纬纱|星光纬线|微闪星光|点状微光|镜面绸缎|亮面缎/g,
    advice: "请用实物色卡与客户确认光泽。",
  },
  {
    taboo: /(?:不要|不用|避免|不喜欢|拒绝|别用)[^。，；,\n]{0,10}?撞色/,
    property: /撞色分割|撞色细线|阶梯撞色|翻折撞色|撞色滚边/g,
    advice: "请与客户核对拼色位置或改用同色做法。",
  },
  {
    taboo: /(?:必须|需要|只接受|希望|要求)(?:能|可|可以)?机洗|(?:不能|不要|不接受)干洗/,
    property: /专业低温石油干洗|仅限专业干洗|必须干洗|严禁水洗|忌[^。，；]{0,8}水洗/g,
    advice: "请核对洗护方式或另选面料。",
  },
];

export function assetConflicts(asset: CatalogAsset, pkg: LiangYiPlanPackage) {
  if (asset.category === "体型规则" || asset.category === "历史案例") return [];
  return conflictRules.flatMap(rule => {
    const property = asset.attributes.match(rule.property)?.[0];
    if (!property) return [];
    const spoken = pkg.customerInput.match(rule.taboo)?.[0];
    const req = pkg.requirements.find(r => rule.taboo.test(r.solutionAction));
    const inferred = req?.solutionAction.match(rule.taboo)?.[0]
      || pkg.emotionalReport.tabooRedlines.map(t => t.match(rule.taboo)?.[0]).find(Boolean);
    if (!spoken && !inferred) return [];
    const source = spoken ? `客户原话“${spoken}”` : `${req ? "需求 Nº " + String(req.index).padStart(2, "0") : "审美报告"}建议“${inferred}”`;
    return [{ property, source, requirementId: spoken ? undefined : req?.id,
      message: `${asset.id} 含“${property}”。${source}，${rule.advice}` }];
  });
}

export function resourceEvidence(pkg: LiangYiPlanPackage, direction?: DesignDirectionOption) {
  const dir = direction ?? currentDirection(pkg);
  const ids = direction ? [direction.fabricId, direction.patternId, ...(direction.craftId ? [direction.craftId] : [])] : materialIds(pkg);
  return [...new Set(ids)].map(id => {
    const asset = ASSET_BY_ID.get(id);
    const match = pkg.assetMatches.find(m => m.assetId === id);
    const design = id === dir?.patternId ? dir.garmentSummary : id === dir?.craftId
      ? [dir.collarAndCraftDiff, dir.restraintNote].join(" ") : id === dir?.fabricId ? dir.fabricSuggestion : "";
    const text = [asset?.attributes, match?.matchReason, match?.styleFit, match?.tactileFit, match?.bodyOrRoleFit, design].filter(Boolean).join(" ");
    const conflicts = asset ? assetConflicts(asset, pkg) : [];
    const sources = pkg.requirements.flatMap(r => {
      if (conflicts.some(c => c.requirementId === r.id || (r.sourceSpan && c.source.includes(r.sourceSpan)))) return [];
      // 工艺可满足色彩需求中的「同色暗纹」，不能据此断言工艺决定了主色。
      if (r.ruleOrAssetId === id || evidenceScore(text, r.rawPhrase) > 0) return [{ req: r, label: r.rawPhrase }];
      const feature = r.solutionAction.split(/[，；：。]/).find(clause => evidenceScore(text, clause) > 0);
      return feature ? [{ req: r, label: feature }] : [];
    });
    return { id, name: match?.assetName || asset?.name || id, sources, conflicts };
  });
}
