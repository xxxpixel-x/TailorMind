import { ASSET_BY_ID } from "@/lib/asset-catalog";
import { assetConflicts } from "@/lib/workbench-evidence";
import { materialIds, modeLabel, orderTitle } from "@/lib/workbench-orders";
import { auditTime, shortTime } from "@/lib/workbench-time";
import type { LiangYiPlanPackage } from "@/lib/types";

function identity(pkg: LiangYiPlanPackage) {
  const recorded = pkg.ledger.clientOrOrgName.trim();
  if (recorded && !["定制客户", "意向团装企业", "未具名客户"].includes(recorded)) return { name: recorded, named: true };
  const first = pkg.customerParagraphs[0] ?? "";
  const explicit = pkg.mode === "uniform"
    ? first.match(/^(?:客户单位[：:]?|我们(?:是|来自))?\s*([^\s，。；,;（）()]{2,32}?(?:有限公司|公司|银行|学校|医院|集团))(?=[\s，。；,;（(0-9]|$)/)?.[1]
    : first.match(/(?:^|[，。；,;])\s*(?:我是|客户是|客户[：:])?([\u4e00-\u9fff]{1,3}(?:女士|先生))(?=[\s，。；,;：:说想要]|$)/)?.[1];
  if (explicit) return { name: explicit, named: true };
  // 匿名演讲单使用订单和原话中明示的身份。其他匿名订单各自归档。
  const speaker = orderTitle(pkg).match(/([^\s·]+论坛)主旨演讲/);
  if (speaker && /论坛主旨演讲/.test(pkg.customerInput)) return { name: speaker[1] + "主旨演讲人", named: true };
  return { name: recorded || "未具名客户", named: false };
}

function interviewDate(pkg: LiangYiPlanPackage) {
  const dates = [pkg.ledger.createdAt, ...(pkg.interviewTurns ?? []).map(t => t.at),
    ...pkg.ledger.auditLogs.filter(l => /录入客户原话|补录客户原话|回答追问/.test(l.action)).map(l => auditTime(l.timestamp, pkg.ledger.createdAt))];
  return dates.sort((a, b) => Date.parse(b.replace(" ", "T")) - Date.parse(a.replace(" ", "T")))[0];
}

export interface ClientProfile {
  key: string;
  name: string;
  orders: LiangYiPlanPackage[];
  latestAt: string;
}

export function groupClients(orders: LiangYiPlanPackage[]) {
  const groups = new Map<string, ClientProfile>();
  for (const order of orders) {
    const { name, named } = identity(order);
    const key = named ? name.normalize("NFKC").replace(/\s+/g, "").toLowerCase() : order.clientGroupKey ?? "订单/" + order.ledger.ledgerNo;
    const group = groups.get(key) ?? { key, name, orders: [], latestAt: "" };
    group.orders.push(order);
    groups.set(key, group);
  }
  const time = (value: string) => Date.parse(value.replace(" ", "T"));
  for (const group of groups.values()) {
    group.orders.sort((a, b) => time(interviewDate(b)) - time(interviewDate(a)));
    group.latestAt = interviewDate(group.orders[0]);
  }
  return Array.from(groups.values()).sort((a, b) => time(b.latestAt) - time(a.latestAt));
}

export function matchesClient(client: ClientProfile, query: string) {
  const normalize = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  const term = normalize(query);
  return normalize(client.name).includes(term) || client.orders.some(p => p.customerParagraphs.some(text => normalize(text).includes(term)));
}

export function clientSummary(client: ClientProfile) {
  const order = client.orders[0];
  const headcount = order.mode === "uniform" && (order.customerInput.match(/(\d+)\s*(?:名|位)员工|(\d+)\s*人(?:团|职业服)/)?.[0].match(/\d+/)?.[0]
    || order.ledger.headcountOrQty.match(/(\d+)\s*人/)?.[1]);
  return [...new Set(client.orders.map(p => modeLabel(p.mode)))].join(" / ") + " · " +
    (headcount && client.orders.length === 1 ? headcount + " 人" : client.orders.length + " 张订单");
}

export interface ProfileItem { text: string; note: string }

export function profileDetails(client: ClientProfile) {
  const body = new Map<string, ProfileItem>(), preferences = new Map<string, ProfileItem>(), avoid = new Map<string, ProfileItem>();
  const restrictions = new Map<string, ProfileItem>();
  const tags = new Set<string>();
  const negative = /不要|不想|不喜欢|不爱|不用|不做|不加|不能|不希望|别[太用做加]|避免|忌讳|拒绝|怕.{0,6}(?:卡|紧)/;
  function keep(items: Map<string, ProfileItem>, text: string, note: string) {
    if (text && !items.has(text)) items.set(text, { text, note });
  }
  for (const pkg of client.orders) {
    const recorded = pkg.ledger.createdAt;
    const speech = pkg.customerParagraphs[0]?.match(/[^，。；,;]{1,40}论坛[^，。；,;]{0,12}演讲/)?.[0];
    if (speech) tags.add(speech);
    for (const log of [...pkg.ledger.auditLogs].reverse()) {
      if (log.action === "回答追问") keep(preferences, log.detail, shortTime(auditTime(log.timestamp, recorded)) + " · 客户回复");
    }
    for (const req of pkg.requirements) {
      const quote = req.sourceSpan || req.rawPhrase;
      if (req.category === "体型修饰") keep(body, req.rawPhrase,
        req.solutionAction + (req.solutionAction.includes("待制版师核准") ? "" : " · 待制版师核准"));
      if (req.category === "明确禁忌" || negative.test(quote) || negative.test(req.rawPhrase)) keep(avoid, quote, req.solutionAction);
      else if (req.category === "色彩材质" || req.category === "审美风格") {
        const source = pkg.ledger.auditLogs.find(log => /录入客户原话|补录客户原话|回答追问/.test(log.action) && log.detail.includes(quote));
        const date = source ? auditTime(source.timestamp, recorded) : pkg.customerParagraphs[0]?.includes(quote) ? recorded : undefined;
        keep(preferences, req.rawPhrase, [req.solutionAction, date && shortTime(date)].filter(Boolean).join(" · "));
      }
      for (const clause of req.solutionAction.split(/[；，。]/).filter(s => negative.test(s)))
        keep(restrictions, clause, "需求 · " + req.rawPhrase);
      if (req.category === "场合礼仪" || req.category === "团装管理" && /岗位|人员|职业/.test(req.rawPhrase)) tags.add(req.rawPhrase);
    }
    for (const taboo of pkg.emotionalReport.tabooRedlines) keep(restrictions, taboo, "审美报告");
    for (const id of materialIds(pkg)) {
      const asset = ASSET_BY_ID.get(id);
      if (asset?.category === "特色面料" && assetConflicts(asset, pkg).length)
        keep(avoid, asset.name + "（" + id + "）", "已在设计单标出冲突面料");
    }
  }
  for (const item of restrictions.values()) keep(avoid, item.text, item.note);
  const photos = new Map(client.orders.flatMap(p => (p.photos ?? []).map(photo => [photo.id, photo] as const)));
  return { body: [...body.values()], preferences: [...preferences.values()], avoid: [...avoid.values()],
    tags: [...tags], photos: [...photos.values()] };
}
