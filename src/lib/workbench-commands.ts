import { ASSET_BY_ID, type AssetCategory } from "@/lib/asset-catalog";
import { resourceEvidence } from "@/lib/workbench-evidence";
import type { CommandChange, CommandIntent, CommandTurn, DirectionId, LiangYiPlanPackage, RequirementStatus } from "@/lib/types";

const directions: Record<string, DirectionId> = { A: "classic", B: "accent", C: "modern" };
const assetFields = { patternId: "版型母版", fabricId: "特色面料", craftId: "海派工艺" } as const satisfies Record<string, AssetCategory>;
const statuses: RequirementStatus[] = ["已落实", "推断", "待追问", "未处理"];
export const commandExamples = ["B 方向改九分袖", "换个更年轻的方向", "说明选料依据"];
const unsupported = { kind: "unsupported" } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// 两种引擎以及客户端只接受同一组字段，不直接合并模型给出的对象。
export function validateCommand(pkg: LiangYiPlanPackage, raw: unknown): CommandIntent {
  if (!isRecord(raw)) return unsupported;
  const dir = pkg.proposal.directions.find(d => d.id === raw.directionId);
  if (!dir) return unsupported;
  const reply = typeof raw.reply === "string" && raw.reply.trim().length <= 240
    && (raw.reply.match(/(?:PAT|FAB|CRF|CASE|RULE)-[A-Z0-9-]+/gi) || []).every(id => ASSET_BY_ID.has(id))
    ? raw.reply.trim() : undefined;
  if (raw.kind === "explain") {
    const used = [dir.fabricId, dir.patternId, dir.craftId].filter((id): id is string => !!id && ASSET_BY_ID.has(id));
    const ids = Array.isArray(raw.assetIds) && raw.assetIds.length ? used.filter(id => (raw.assetIds as unknown[]).includes(id)) : used;
    return ids.length ? { kind: "explain", directionId: dir.id, assetIds: ids, reply } : unsupported;
  }
  if (raw.kind !== "modify") return unsupported;
  const change: CommandChange = { kind: "modify", directionId: dir.id };
  if (raw.select === true) change.select = true;
  if (raw.sleeveLength === "长袖" || raw.sleeveLength === "九分袖" || raw.sleeveLength === "七分袖") change.sleeveLength = raw.sleeveLength;
  for (const key of Object.keys(assetFields) as (keyof typeof assetFields)[]) {
    const id = raw[key];
    if (typeof id === "string" && ASSET_BY_ID.get(id)?.category === assetFields[key]) change[key] = id;
  }
  if (Array.isArray(raw.statuses)) {
    const edits = new Map<string, RequirementStatus>();
    for (const item of raw.statuses) {
      if (isRecord(item) && statuses.includes(item.status as RequirementStatus) && pkg.requirements.some(r => r.id === item.id)) {
        edits.set(String(item.id), item.status as RequirementStatus);
      }
    }
    if (edits.size) change.statuses = Array.from(edits, ([id, status]) => ({ id, status }));
  }
  if (!change.select && !change.sleeveLength && !change.statuses && !change.fabricId && !change.patternId && !change.craftId) return unsupported;
  // 模型陈述必须和落地变更一致。有字段被过滤时仅使用实际差异生成回复。
  if (Object.keys(raw).every(key => key === "reply" || Object.hasOwn(change, key)) &&
    (!Array.isArray(raw.statuses) || raw.statuses.length === change.statuses?.length)) change.reply = reply;
  return change;
}

export function localCommand(pkg: LiangYiPlanPackage, text: string): CommandIntent {
  const words = text.normalize("NFKC").toUpperCase().replace(/[\s。！？!?，,]/g, "").replace(/^(?:请|麻烦)?(?:帮我)?(?:把|将)?/, "");
  if (/(?:[D-Z]方向|方向[D-Z])/.test(words)) return unsupported;
  const letter = words.match(/([ABC])(?:方向|方案)|(?:方向|方案)([ABC])|^([ABC])(?=的|袖|改|换|用|选)/);
  const specified = letter && directions[letter[1] || letter[2] || letter[3]];
  const selected = specified || pkg.proposal.selectedDirectionId;
  if (/为什么|说明|解释|依据|为何/.test(words)) {
    if (!/面料|选料|选材|工艺|版型|宋锦|香云纱|织花绸|(?:FAB|PAT|CRF)-|为什么选|为何选/.test(words)) return unsupported;
    const subject = words.match(/(?:为什么|为何)(?:要)?(?:选用|选择|选|用)(.+?)(?:呢|的原因)?$/)?.[1];
    const named = words.match(/(?:FAB|PAT|CRF)-[A-Z0-9-]+|宋锦|香云纱|织花绸/)?.[0]
      || (subject && !/^(?:[ABC]方向的?)?(?:这[款种个]|这个方向的?)?(?:面料|材料|版型|工艺|搭配)$/.test(subject) ? subject : undefined);
    const dirs = [...pkg.proposal.directions].sort((a, b) => Number(b.id === selected) - Number(a.id === selected));
    for (const dir of dirs) {
      if (specified && specified !== dir.id) continue;
      const ids = [dir.fabricId, dir.patternId, dir.craftId].filter((id): id is string => !!id && ASSET_BY_ID.has(id));
      const assets = named ? ids.filter(id => id === named || ASSET_BY_ID.get(id)?.name.includes(named)) : ids;
      if (assets.length) return validateCommand(pkg, { kind: "explain", directionId: dir.id, assetIds: assets });
    }
    return unsupported;
  }
  const target = words.replace(/(?:方向|方案)[ABC]|[ABC](?:方向|方案)?/, "");
  const sleeve = target.match(/^的?(?:袖长|袖子)?(?:改|换|调整|选|采用|用)?(?:成|为|到)?(长袖|九分袖|七分袖)$/);
  if (sleeve) return validateCommand(pkg, { kind: "modify", directionId: selected, sleeveLength: sleeve[1] });
  const style = words.match(/^(?:(?:换|选|要|来|改)(?:成|为)?(?:一?个)?)?更?(年轻|稳妥|有亮点)(?:一些|一点)?的?(?:方向|方案)?$/);
  if (style) return validateCommand(pkg, { kind: "modify", directionId: style[1] === "年轻" ? "modern" : style[1] === "稳妥" ? "classic" : "accent", select: true });

  // 支持无 API Key 时直接以口语替换面料或工艺，便于现场测试海派工艺知识图谱硬约束拦截
  const fabricMap: [RegExp, string][] = [
    [/FAB-SF-01|宋锦/, "FAB-SF-01"],
    [/FAB-SF-02|香云纱/, "FAB-SF-02"],
    [/FAB-SF-03|织花绸/, "FAB-SF-03"],
    [/FAB-SF-04|三醋酸提花|醋酸锦/, "FAB-SF-04"],
    [/FAB-SF-05|亮面缎|亮缎/, "FAB-SF-05"],
    [/FAB-SF-06|针织/, "FAB-SF-06"],
    [/FAB-UNI-01|羊毛呢/, "FAB-UNI-01"],
    [/FAB-UNI-02|可水洗三醋酸|职业缎/, "FAB-UNI-02"],
  ];
  const craftMap: [RegExp, string][] = [
    [/CRF-01|无扣贴边|一体贴边/, "CRF-01"],
    [/CRF-02|铜丝盘扣|流苏盘扣|刮浆盘扣|一字盘扣/, "CRF-02"],
    [/CRF-03|极细滚边|细滚边|嵌条/, "CRF-03"],
    [/CRF-04|马头墙|阶梯拼接|直角拼接/, "CRF-04"],
    [/CRF-05|梅花暗纹|星光暗纹/, "CRF-05"],
    [/CRF-06|白玉兰|石库门/, "CRF-06"],
  ];
  const matchedFabric = /(?:换|改|用|选|配)/.test(target) ? fabricMap.find(([rx]) => rx.test(target))?.[1] : undefined;
  const matchedCraft = /(?:换|改|用|选|配|加)/.test(target) ? craftMap.find(([rx]) => rx.test(target))?.[1] : undefined;
  if (matchedFabric || matchedCraft) {
    return validateCommand(pkg, {
      kind: "modify",
      directionId: selected,
      ...(matchedFabric ? { fabricId: matchedFabric } : {}),
      ...(matchedCraft ? { craftId: matchedCraft } : {}),
    });
  }
  return unsupported;
}

export function commandExplanation(pkg: LiangYiPlanPackage, intent: Extract<CommandIntent, { kind: "explain" }>, id: string, text: string): CommandTurn {
  const dir = pkg.proposal.directions.find(d => d.id === intent.directionId)!;
  const links = resourceEvidence(pkg, dir).filter(link => intent.assetIds.includes(link.id));
  const sources = new Map<number, string>();
  for (const link of links) for (const { req, label } of link.sources) sources.set(req.index, label);
  const reasons = links.map(link => {
    const match = pkg.assetMatches.find(a => a.assetId === link.id);
    return link.name + "：" + (match?.matchReason || ASSET_BY_ID.get(link.id)?.description || "暂无选用说明");
  });
  return { id, text, kind: "explain", directionId: dir.id, assetIds: links.map(l => l.id),
    reply: [intent.reply || dir.tag.split(" · ")[0] + " 方向的选用依据如下。", ...reasons].join("\n"),
    sources: Array.from(sources, ([index, label]) => ({ index, label })),
    conflicts: [...new Set(links.flatMap(l => l.conflicts.map(c => c.message)))] };
}
