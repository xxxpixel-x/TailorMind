"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Menu, X } from "lucide-react";
import Screen1Interview from "@/components/screens/Screen1Interview";
import Screen2Directions from "@/components/screens/Screen2Directions";
import Screen3SpecSheet from "@/components/screens/Screen3SpecSheet";
import AgentPanel from "@/components/workbench/AgentPanel";
import AssetLibrary from "@/components/workbench/AssetLibrary";
import LedgerPage from "@/components/workbench/LedgerPage";
import ClientsPage from "@/components/workbench/ClientsPage";
import VersionComparison from "@/components/workbench/VersionComparison";
import NewInterview from "@/components/workbench/NewInterview";
import InterviewThread, { interviewTime, useStepProgress, type InterviewInput, type InterviewSession } from "@/components/workbench/InterviewThread";
import SettingsPage, { type SettingsAnchor } from "@/components/workbench/SettingsPage";
import WorkbenchHome from "@/components/workbench/WorkbenchHome";
import { OrderHeader, Sidebar } from "@/components/workbench/WorkbenchShell";
import AssetInspectorDrawer from "@/components/modals/AssetInspectorDrawer";
import GarmentDetailInspectorModal, { type GarmentZoneId } from "@/components/modals/GarmentDetailInspectorModal";
import { DEFAULT_MODEL_SETTINGS, textModelConfig, type ClientModelSettings } from "@/lib/model-settings";
import { commandExamples, commandExplanation, validateCommand } from "@/lib/workbench-commands";
import Tab4VisualStudio from "@/components/studio/Tab4VisualStudio";
import { exportFullWorkbookXlsx } from "@/lib/export-ledger";
import { addRequirement, appendCommandTurn, applyOrderCommand, changeLedger, chooseDirection, createDemoOrders, editDesignFields, editLedgerFields, editRequirement, formatFollowUpAnswer,
  importArchivedOrders, mergeAnalysis, orderShortCode, orderTitle, recordSheet, reportOrder, restorePlanVersion, syncDemoVisuals, undoOrderCommand,
  type AnswerQuestion, type FlowStep, type WorkbenchView } from "@/lib/workbench-orders";
import { ASSET_BY_ID } from "@/lib/asset-catalog";
import { assetConflicts } from "@/lib/workbench-evidence";
import type { BusinessLedger, BusinessMode, DesignDirectionOption, FollowUpQuestion, InterviewPhoto, InterviewTurn, LiangYiPlanPackage } from "@/lib/types";
import { groupClients, type ClientProfile } from "@/lib/workbench-clients";
import { archivePhotos, clearPhotoLibrary, PHOTO_LIMIT } from "@/lib/workbench-photos";
import { planVersions } from "@/lib/workbench-versions";

const ORDERS_KEY = "liangyi_workbench_orders_v2";
const CURRENT_KEY = "liangyi_current_order_v2";
const SETTINGS_KEY = "liangyi_model_settings_v1";
const INTERVIEW_CONTEXT_KEY = "liangyi_interview_customer_v1";

function readLocation(): { view: WorkbenchView; step: FlowStep; compare?: boolean } {
  const hash = location.hash.slice(1);
  if (hash === "o2c") return { view: "order", step: 2 };
  if (hash === "o3v") return { view: "order", step: 3, compare: true };
  if (hash === "rec") return { view: "new", step: 1 };
  if (/^o[123]$/.test(hash)) return { view: "order", step: Number(hash[1]) as FlowStep };
  return { view: hash === "assets" || hash === "ledger" || hash === "clients" || hash === "new" || hash === "settings" || hash === "new-run" ? hash : "home", step: 1 };
}

interface AnalysisOptions {
  action?: string;
  input?: InterviewInput;
  replaceLast?: boolean;
  photos?: InterviewPhoto[];
  customer?: Pick<ClientProfile, "key" | "name">;
}

function withInitialVersion(pkg: LiangYiPlanPackage) {
  return { ...pkg, versions: planVersions(pkg) };
}

export default function LiangYiWorkbench() {
  const [orders, setOrders] = useState<LiangYiPlanPackage[]>(() => createDemoOrders().map(withInitialVersion));
  const [currentNo, setCurrentNo] = useState(orders[0].ledger.ledgerNo);
  const pkg = orders.find(p => p.ledger.ledgerNo === currentNo) || orders[0];
  const [view, setView] = useState<WorkbenchView>("home");
  const [step, setStep] = useState<FlowStep>(1);
  const [compare, setCompare] = useState(false);
  const [sheetView, setSheetView] = useState<"spec" | "techpack">("spec");
  const clients = useMemo(() => groupClients(orders), [orders]);
  const archivedPhotos = useRef(new Set<string>());
  const [hydrated, setHydrated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [agentOpen, setAgentOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"nav" | "agent" | null>(null);
  const [toast, setToast] = useState<{ text: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((text: string, action?: { label: string; run: () => void }) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ text, actionLabel: action?.label, onAction: action?.run });
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);
  const [newText, setNewText] = useState("");
  const [newMode, setNewMode] = useState<BusinessMode>("bespoke");
  const [newCustomer, setNewCustomer] = useState<AnalysisOptions["customer"]>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const [sending, setSending] = useState<{ no: string; text: string } | null>(null);
  const [highlightId, setHighlightId] = useState("");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const retry = useRef<{ paragraphs: string[]; options: AnalysisOptions } | null>(null);
  const runOrder = session?.orderNo ? orders.find(p => p.ledger.ledgerNo === session.orderNo) : undefined;
  const lastTurn = runOrder?.interviewTurns?.at(-1);
  const shown = useStepProgress(lastTurn?.steps, session?.playback);
  const running = !!(session?.pending && !session.failed) || !!(lastTurn && shown < lastTurn.steps.length);
  const navigationVersion = useRef(0);
  const canvas = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ dir: DesignDirectionOption; zone?: GarmentZoneId | null } | null>(null);
  const [modal, setModal] = useState<"visual" | null>(null);
  const [settingsSection, setSettingsSection] = useState<SettingsAnchor>("models");
  const [returnTarget, setReturnTarget] = useState<{ view: WorkbenchView; step: FlowStep; label: string } | null>(null);
  const [settings, setSettings] = useState<ClientModelSettings>(DEFAULT_MODEL_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDERS_KEY);
      const restored: LiangYiPlanPackage[] | null = saved && JSON.parse(saved);
      if (Array.isArray(restored) && restored.length) {
        setOrders(syncDemoVisuals(restored).map(withInitialVersion));
        const recent = restored.find(p => p.interviewTurns?.length);
        if (recent) setSession({ mode: recent.mode, orderNo: recent.ledger.ledgerNo, startedAt: recent.interviewTurns![0].at });
      }
      else {
        const archives = JSON.parse(localStorage.getItem("liangyi_archived_ledgers_v1") || "[]");
        if (Array.isArray(archives) && archives.length) setOrders(seeds => importArchivedOrders(seeds, archives).map(withInitialVersion));
      }
      const current = localStorage.getItem(CURRENT_KEY);
      if (current) setCurrentNo(current);
      const config = localStorage.getItem(SETTINGS_KEY);
      if (config) setSettings({ ...DEFAULT_MODEL_SETTINGS, ...JSON.parse(config) });
      if (readLocation().view === "new") {
        const context = JSON.parse(sessionStorage.getItem(INTERVIEW_CONTEXT_KEY) || "null");
        if (typeof context?.key === "string" && typeof context.name === "string") {
          setNewCustomer({ key: context.key, name: context.name });
          setNewMode(context.mode === "uniform" ? "uniform" : "bespoke");
        }
      }
    } catch { setError("未能读取本机存档，已载入演示订单。"); }
    function syncLocation() {
      const target = readLocation();
      navigationVersion.current++;
      if (target.view !== "order") setHighlightId("");
      setView(target.view); setStep(target.step); setCompare(!!target.compare); setMobilePanel(null);
    }
    syncLocation();
    if (window.innerWidth < 1220) setAgentOpen(false);
    setHydrated(true);
    window.addEventListener("hashchange", syncLocation);
    return () => { window.removeEventListener("hashchange", syncLocation); request.current?.abort(); if (toastTimer.current) window.clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      const ids = orders.flatMap(p => (p.photos ?? []).map(photo => photo.id)).filter(id => !archivedPhotos.current.has(id));
      if (ids.length) {
        ids.forEach(id => archivedPhotos.current.add(id));
        void archivePhotos(ids).catch(() => {
          ids.forEach(id => archivedPhotos.current.delete(id));
          setError("照片已关联订单，草稿状态将在下次读取时同步。");
        });
      }
    }
    catch { setError("本机存储空间不足，本次修改仅保存在当前窗口。可从台账导出备份。"); }
  }, [orders, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CURRENT_KEY, currentNo); } catch { /* 当前窗口仍可切单 */ }
  }, [currentNo, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (newCustomer) sessionStorage.setItem(INTERVIEW_CONTEXT_KEY, JSON.stringify({ ...newCustomer, mode: newMode }));
      else sessionStorage.removeItem(INTERVIEW_CONTEXT_KEY);
    } catch { /* 当前窗口仍可继续面谈。 */ }
  }, [newCustomer, newMode, hydrated]);

  useEffect(() => { canvas.current?.scrollTo(0, 0); }, [view, step, compare, currentNo]);

  const navigate = useCallback((next: WorkbenchView, nextStep: FlowStep = 1, showCompare = false, keepReturn = false) => {
    navigationVersion.current++;
    if (next !== "order") setHighlightId("");
    if (next === "new") setNewCustomer(undefined);
    if (!keepReturn) setReturnTarget(null);
    if (nextStep !== 3) setSheetView("spec");
    setView(next); setStep(nextStep); setCompare(showCompare); setMobilePanel(null); setError("");
  }, []);

  const openTechPack = useCallback(() => {
    setSheetView("techpack");
    navigate("order", 3, false, true);
  }, [navigate]);

  const openOrder = (order: LiangYiPlanPackage, next: FlowStep, fromLabel?: string) => {
    if (order.ledger.ledgerNo !== currentNo) setHighlightId("");
    setCurrentNo(order.ledger.ledgerNo);
    if (fromLabel) {
      setReturnTarget({ view, step, label: fromLabel });
      navigate("order", next, false, true);
    } else {
      navigate("order", next);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (view === "new-run" && !session) { navigate("new"); return; }
    const hash = view === "order" ? compare ? "o3v" : "o" + step + (step === 2 && pkg.commandHistory?.length ? "c" : "")
      : view === "new" && location.hash === "#rec" ? "rec" : view;
    if (location.hash !== "#" + hash) history.replaceState(null, "", "#" + hash);
  }, [hydrated, view, step, compare, session, navigate, pkg.commandHistory?.length]);

  function openSettings(section: SettingsAnchor = "models", fromLabel?: string) {
    setModal(null); setSettingsSection(section);
    if (fromLabel) {
      setReturnTarget({ view, step, label: fromLabel });
      navigate("settings", 1, false, true);
    } else {
      navigate("settings");
    }
  }

  function showOrderItem(nextStep: FlowStep, elementId: string) {
    navigate("order", nextStep);
    requestAnimationFrame(() => {
      const item = document.getElementById(elementId);
      item?.focus({ preventScroll: true }); item?.scrollIntoView({ block: "nearest" });
    });
  }

  const toggleAgent = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 940) {
      setMobilePanel(p => p === "agent" ? null : "agent");
    } else {
      setAgentOpen(v => !v);
    }
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setModal(null); setDetail(null); setInspectId(null); setMobilePanel(null); return; }
      if (modal || detail || inspectId || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if ((event.target as HTMLElement)?.closest("input,textarea,select,[contenteditable=true]")) return;
      const k = event.key.toLowerCase();
      if (k === "n") { event.preventDefault(); navigate("new"); }
      else if (k === "[") { event.preventDefault(); setCollapsed(v => !v); }
      else if (k === "\\" && view === "order") { event.preventDefault(); toggleAgent(); }
      else if (view === "order" && (k === "1" || k === "2" || k === "3")) {
        event.preventDefault();
        navigate("order", Number(k) as FlowStep, false, true);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [navigate, toggleAgent, view, modal, detail, inspectId]);

  function updateOrder(no: string, change: (p: LiangYiPlanPackage) => LiangYiPlanPackage) {
    setOrders(rows => rows.map(p => p.ledger.ledgerNo === no ? change(p) : p));
  }
  const updateCurrent = (change: (p: LiangYiPlanPackage) => LiangYiPlanPackage) => updateOrder(pkg.ledger.ledgerNo, change);
  const updateLedger = (order: LiangYiPlanPackage, patch: Partial<BusinessLedger>, action?: string) =>
    updateOrder(order.ledger.ledgerNo, p => action ? changeLedger(p, patch, action) : editLedgerFields(p, patch));

  async function analyze(mode: BusinessMode, paragraphs: string[], order?: LiangYiPlanPackage, options: AnalysisOptions = {}) {
    if (request.current || !paragraphs.length) return;
    const { action = "补录客户原话", input, replaceLast = false, photos = [], customer } = options;
    const indices = order?.planParagraphIndices && [...order.planParagraphIndices,
      ...paragraphs.slice(order.customerParagraphs.length).map((_, i) => order.customerParagraphs.length + i)];
    const activeText = indices ? indices.map(i => paragraphs[i]) : paragraphs;
    const origin = navigationVersion.current;
    const controller = new AbortController();
    request.current = controller; setBusy(true); setError("");
    if (input) {
      retry.current = { paragraphs, options };
      setSession(s => ({ mode, startedAt: order && s ? s.startedAt : input.at, orderNo: order?.ledger.ledgerNo, pending: input }));
    }
    try {
      const res = await fetch("/api/agent/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ mode, conversation: activeText.map(content => ({ role: "advisor", content })),
          customConfig: { ...textModelConfig(settings), localOnly: !settings.llmApiKey.trim() } }),
      });
      const json = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok || !json.ok || !json.data) throw new Error(json.error || "需求单更新失败，请重试。");
      const next: LiangYiPlanPackage = json.data;
      // 保留完整面谈文本，即使接口只读取最近几轮。
      next.customerParagraphs = paragraphs;
      next.customerInput = paragraphs.join("\n");
      next.planParagraphIndices = indices;
      const turn: InterviewTurn | undefined = input && { ...input, steps: next.toolTraces,
        reply: json.advisorReply || next.emotionalReport.personaSummary || next.conversationSummary };
      if (order) {
        updateOrder(order.ledger.ledgerNo, p => {
          const merged = mergeAnalysis(p, next, action, paragraphs.at(-1) || "");
          if (photos.length) merged.photos = Array.from(new Map([...(p.photos ?? []), ...photos].map(photo => [photo.id, photo])).values()).slice(0, PHOTO_LIMIT);
          if (!turn) return merged;
          const previous = p.interviewTurns ?? [];
          return { ...merged, interviewTurns: [...(replaceLast ? previous.slice(0, -1) : previous), turn] };
        });
        if (action === "补录客户原话") setDrafts(prev => ({ ...prev, [order.ledger.ledgerNo]: "" }));
      } else {
        // 引擎产生的单号如与本机历史重复，分配同日前缀的下一个空号。
        const prefix = next.ledger.ledgerNo.replace(/\d+$/, "");
        let sequence = Number(next.ledger.ledgerNo.slice(prefix.length));
        while (orders.some(p => p.ledger.ledgerNo === next.ledger.ledgerNo)) {
          next.ledger.ledgerNo = prefix + String(++sequence).padStart(3, "0");
        }
        next.ledger.directionConfirmed = false;
        if (photos.length) next.photos = photos;
        if (customer) { next.ledger.clientOrOrgName = customer.name; next.clientGroupKey = customer.key; }
        if (turn) next.interviewTurns = [turn];
        setOrders(prev => [withInitialVersion(next), ...prev]); setNewText(""); setNewCustomer(undefined);
        if (origin === navigationVersion.current) setCurrentNo(next.ledger.ledgerNo);
      }
      if (turn) {
        retry.current = null;
        setSession(s => ({ mode, startedAt: s?.startedAt ?? turn.at, orderNo: order?.ledger.ledgerNo ?? next.ledger.ledgerNo, playback: turn.at }));
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (input) setSession(s => s && { ...s, failed: true });
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "未能连接解析服务，请重试。");
    } finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }

  function startInterview(mode: BusinessMode, raw: string, photos?: InterviewPhoto[], customer?: AnalysisOptions["customer"]) {
    const text = raw.trim();
    if (!text || request.current) return;
    navigate("new-run");
    void analyze(mode, [text], undefined, { action: "新建面谈", input: { text, at: new Date().toISOString() }, photos, customer });
  }
  function appendInterview(text: string, question?: FollowUpQuestion, photos?: InterviewPhoto[]) {
    if (!runOrder) return;
    const paragraph = question ? formatFollowUpAnswer(question.id, text) : text;
    void analyze(runOrder.mode, [...runOrder.customerParagraphs, paragraph], runOrder, { action: question ? "回答追问" : "补录客户原话",
      input: { text, at: new Date().toISOString() }, photos });
  }

  async function sendCommand(text: string) {
    if (request.current || !text.trim()) return;
    const controller = new AbortController();
    const no = pkg.ledger.ledgerNo;
    const id = globalThis.crypto?.randomUUID?.() || "cmd-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    request.current = controller; setSending({ no, text }); setHighlightId(id); setBusy(true); setError("");
    try {
      const res = await fetch("/api/agent/command", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ text, order: { ...pkg, commandHistory: undefined, interviewTurns: undefined,
          photos: undefined, versions: undefined, clientGroupKey: undefined }, customConfig: textModelConfig(settings) }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error("指令处理失败，请重新发送。");
      if (controller.signal.aborted) return;
      updateOrder(no, p => {
        if (p !== pkg) return appendCommandTurn(p, { id, text, kind: "unchanged", reply: "这张订单刚刚更新，请按当前方案重新发送指令。" });
        const intent = validateCommand(p, json.intent);
        if (intent.kind === "modify") return applyOrderCommand(p, intent, id, text);
        if (intent.kind === "explain") return appendCommandTurn(p, commandExplanation(p, intent, id, text));
        return appendCommandTurn(p, { id, text, kind: "unsupported", reply: "暂不支持该指令，可尝试「" + commandExamples.join("」「") + "」。" });
      });
    } catch {
      if (!controller.signal.aborted) updateOrder(no, p => appendCommandTurn(p, { id, text, kind: "unchanged", reply: "未能连接指令服务，请重新发送。" }));
    } finally { if (request.current === controller) { request.current = null; setSending(null); setBusy(false); } }
  }

  const answer: AnswerQuestion = (order, q, value) => {
    const formatted = formatFollowUpAnswer(q.id, value);
    void analyze(order.mode, [...order.customerParagraphs, formatted], order, { action: "回答追问" }).then(() => {
      showToast(`已记录「${formatted}」· 需求单已更新`, view !== "order" ? { label: "查看订单", run: () => openOrder(order, 1) } : undefined);
    });
  };
  const report = (order: LiangYiPlanPackage) => {
    updateOrder(order.ledger.ledgerNo, reportOrder);
    showToast(`「${orderTitle(order)}」已上报至本地台账`);
  };
  const inspectDetail = (dir: DesignDirectionOption, zone?: GarmentZoneId | null) => setDetail({ dir, zone });
  const saveSettings = (next: ClientModelSettings) => {
    setSettings(next);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { setError("设置已用于当前窗口，本机保存失败。"); }
  };
  async function resetDemo() {
    request.current?.abort(); request.current = null; retry.current = null;
    setBusy(true); setSending(null);
    try {
      await clearPhotoLibrary(); archivedPhotos.current.clear();
      setSession(null); setHighlightId(""); setDrafts({}); setNewText(""); setNewMode("bespoke"); setNewCustomer(undefined); setError("");
      const seeds = createDemoOrders().map(withInitialVersion);
      setOrders(seeds); setCurrentNo(seeds[0].ledger.ledgerNo);
      try {
        localStorage.removeItem("liangyi_archived_ledgers_v1");
        localStorage.setItem(ORDERS_KEY, JSON.stringify(seeds)); localStorage.setItem(CURRENT_KEY, seeds[0].ledger.ledgerNo);
      } catch (error) { setError("演示订单已恢复到当前窗口，本机存档写入失败。"); throw error; }
    } finally { setBusy(false); }
  }

  const inspectedAsset = inspectId ? ASSET_BY_ID.get(inspectId) : undefined;
  const inspectedConflicts = inspectedAsset ? assetConflicts(inspectedAsset, pkg) : undefined;

  const showAgentColumn = view === "order" && agentOpen;

  return <>
    <div className="workbench">
      <div className={`app ${showAgentColumn ? "" : "no-agent"} ${collapsed ? "compact" : ""} ${mobilePanel ? "show-" + mobilePanel : ""}`}>
        <Sidebar view={view} step={step} compare={compare} orders={orders} clientCount={clients.length} current={pkg} collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)}
          interview={session ? { time: interviewTime(session.startedAt), orderNo: session.orderNo, running, failed: session.failed } : undefined}
          onDismiss={() => setMobilePanel(null)} onView={navigate} onOrder={openOrder} onSettings={() => openSettings()} />
        <main className="main" ref={canvas} aria-label="主画布">
          <div className="mobile-bar no-print">
            <button className="ico mobile-nav" aria-label="打开导航" onClick={() => setMobilePanel("nav")}><Menu /></button>
            <span className="mobile-brand">衣语 TailorMind</span>
          </div>
          {error && <div className="notice no-print" role="alert">{error}<button aria-label="关闭提示" onClick={() => setError("")}><X /></button></div>}
          <div className="view on" key={view === "order" ? pkg.ledger.ledgerNo + step : view}>
            {view === "home" && <WorkbenchHome orders={orders} busy={busy} onOrder={openOrder} onAnswer={answer} onNew={() => navigate("new")}
              onQuickStart={(text) => startInterview("bespoke", text)} onLedger={() => navigate("ledger")} onAssets={() => navigate("assets")} />}
            {view === "new" && <NewInterview text={newText} mode={newMode} customer={newCustomer} busy={busy} onText={setNewText} onMode={setNewMode}
              onClearCustomer={() => setNewCustomer(undefined)} onBackToClients={() => navigate("clients")}
              onBoundary={() => openSettings("boundaries", "新建面谈")} onSubmit={(text, photos) => startInterview(newMode, text, photos, newCustomer)}
              onPreset={preset => { setNewMode(preset.mode); setNewText(preset.promptText); }} />}
            {view === "settings" && hydrated && <SettingsPage settings={settings} orders={orders} initialSection={settingsSection}
              backLabel={returnTarget?.label} onBack={returnTarget ? () => navigate(returnTarget.view, returnTarget.step) : undefined}
              onSave={saveSettings} onReset={resetDemo} />}
            {view === "new-run" && session && <InterviewThread key={session.startedAt} session={session} order={runOrder} shown={shown} running={running} busy={busy}
              onAppend={appendInterview} onOpen={n => { if (runOrder) openOrder(runOrder, n); }}
              onRetry={() => { if (session.pending && retry.current) void analyze(session.mode, retry.current.paragraphs, runOrder, retry.current.options); }}
              onRegenerate={() => { if (runOrder && lastTurn) void analyze(runOrder.mode, runOrder.customerParagraphs, runOrder,
                { action: "重新解析面谈", input: { text: lastTurn.text, at: new Date().toISOString() }, replaceLast: true }); }} />}
            {view === "assets" && <AssetLibrary orders={orders} pkg={pkg} onSelectOrder={setCurrentNo}
              onOpenOrder={(o, s) => openOrder(o, s, "资产库")} onInspectAsset={setInspectId} />}
            {view === "ledger" && <LedgerPage orders={orders} onReport={report} onOrder={(o, s) => openOrder(o, s, "台账")} onEdit={updateLedger} />}
            {view === "clients" && <ClientsPage clients={clients} onOrder={(o, s) => openOrder(o, s, "客户档案")}
              onInterview={({ key, name }, mode) => { navigate("new"); setNewText(""); setNewMode(mode); setNewCustomer({ key, name }); }} />}
            {view === "order" && <>
              <OrderHeader pkg={pkg} step={step} compare={compare}
                backLabel={returnTarget?.label} onBack={returnTarget ? () => navigate(returnTarget.view, returnTarget.step) : undefined}
                onStep={n => navigate("order", n, false, true)}
                agentOpen={mobilePanel === "agent" || agentOpen}
                onToggleAgent={toggleAgent} />
              {step === 1 && <Screen1Interview pkg={pkg} draftInput={drafts[pkg.ledger.ledgerNo] || ""}
                onDraftInputChange={value => setDrafts(prev => ({ ...prev, [pkg.ledger.ledgerNo]: value }))}
                onSubmitAppend={(text, photos) => analyze(pkg.mode, [...pkg.customerParagraphs, text], pkg, { photos })}
                onEditRequirement={(id, patch) => updateCurrent(p => editRequirement(p, id, patch))}
                onAddManualRequirement={(raw, how) => updateCurrent(p => addRequirement(p, raw, how))}
                onOpenThread={pkg.interviewTurns?.length ? () => {
                  setSession({ mode: pkg.mode, orderNo: pkg.ledger.ledgerNo, startedAt: pkg.interviewTurns![0].at });
                  navigate("new-run");
                } : undefined}
                onInspectAsset={setInspectId} onGoToDirections={() => navigate("order", 2, false, true)} isLoading={busy} />}
              {step === 2 && <Screen2Directions pkg={pkg} modelSettings={settings}
                changed={pkg.commandHistory?.find(t => t.id === highlightId && t.kind === "modify" && !t.undone)}
                onPickDirection={id => {
                  const chosen = pkg.proposal.directions.find(d => d.id === id);
                  if (!chosen) return;
                  updateCurrent(p => chooseDirection(p, chosen));
                  showToast(`已采用「${chosen.tag} · ${chosen.title}」`, { label: "生成设计单", run: () => { setSheetView("spec"); updateCurrent(recordSheet); navigate("order", 3, false, true); } });
                }}
                onGenerateSheet={() => { setSheetView("spec"); updateCurrent(recordSheet); navigate("order", 3, false, true); }}
                onOpenTechPack={openTechPack}
                onUpdateDirectionImage={(id, url, caption) => updateCurrent(p => ({ ...p, proposal: { ...p.proposal,
                  directions: p.proposal.directions.map(d => d.id === id ? { ...d, referenceImageUrl: url, referenceImageCaption: caption } : d) } }))}
                onInspectDetail={inspectDetail} onInspectAsset={setInspectId} onRegenerateDirections={() => analyze(pkg.mode, pkg.customerParagraphs, pkg, { action: "重新生成方向" })}
                onOpenModelConfig={() => openSettings("image", "当前订单")} onOpenFullVisualBoard={() => setModal("visual")} isLoading={busy} />}
              {step === 3 && compare && <VersionComparison pkg={pkg} busy={busy} onBack={() => navigate("order", 3, false, true)}
                onRestore={n => { updateCurrent(p => restorePlanVersion(p, n)); setHighlightId(""); showToast(`已恢复到 v${n}，并记入台账`); }} />}
              {step === 3 && !compare && <Screen3SpecSheet pkg={pkg} initialView={sheetView} onCompare={() => navigate("order", 3, true, true)}
                onUpdateEightFields={fields => { updateCurrent(p => editDesignFields(p, fields)); showToast("设计语言已更新并重新核对"); }}
                onUpdateLedger={(patch, action) => { updateLedger(pkg, patch, action); if (patch.reviewStatus) showToast(`审核状态已切换为「${patch.reviewStatus}」`); }}
                onConfirmDirection={() => {
                  const target = pkg.proposal.directions.find(d => d.id === pkg.proposal.selectedDirectionId) || pkg.proposal.directions[0];
                  if (target) {
                    updateCurrent(p => chooseDirection(p, target));
                    showToast(`已确认采用「${target.tag}」`);
                  }
                }}
                onBackToDirections={() => navigate("order", 2, false, true)}
                onReport={() => report(pkg)}
                onArchiveOrder={() => {
                  const archived = changeLedger(pkg, { archivedAt: new Date().toISOString(), reviewStatus: "已复核·待打样" }, "归档台账并导出 Excel");
                  exportFullWorkbookXlsx(archived); updateCurrent(() => archived);
                  showToast("已归档并导出 6 表 Excel 台账");
                }}
                onInspectAsset={setInspectId} onInspectDetail={inspectDetail} onOpenVisualPrompts={() => setModal("visual")} />}
            </>}
          </div>
          {toast && (
            <div className="wb-toast no-print" role="status" aria-live="polite">
              <span className="wb-toast-icon" aria-hidden="true"><Check size={14} /></span>
              <span className="wb-toast-text">{toast.text}</span>
              {toast.actionLabel && toast.onAction && (
                <button type="button" className="wb-toast-action" onClick={() => { toast.onAction?.(); setToast(null); }}>
                  {toast.actionLabel}
                </button>
              )}
              <button type="button" className="wb-toast-close" aria-label="关闭通知" onClick={() => setToast(null)}><X size={13} /></button>
            </div>
          )}
        </main>
        {view === "order" && <AgentPanel key={pkg.ledger.ledgerNo} pkg={pkg} step={step} busy={busy} sending={sending?.no === pkg.ledger.ledgerNo ? sending.text : undefined}
          onCommand={sendCommand} onUndo={id => { updateCurrent(p => undoOrderCommand(p, id)); setHighlightId(""); showToast("已撤销该条指令修改"); }}
          onDirection={id => showOrderItem(2, "direction-" + id)} onRequirement={id => showOrderItem(1, "req-" + id)}
          onOpenDirections={() => navigate("order", 2, false, true)}
          onOpenTechPack={openTechPack}
          onOpenVisualBoard={() => setModal("visual")}
          onAnswer={answer} onInspect={setInspectId} onDismiss={() => { setMobilePanel(null); setAgentOpen(false); }} />}
        {mobilePanel && <button className="panel-scrim no-print" aria-label="关闭侧面板" onClick={() => setMobilePanel(null)} />}
      </div>
    </div>
    {detail && <GarmentDetailInspectorModal open pkg={pkg} direction={detail.dir} initialZone={detail.zone ?? null}
      onClose={() => setDetail(null)} onInspectAsset={id => { setDetail(null); setInspectId(id); }} />}
    <AssetInspectorDrawer assetId={inspectId} inAssetLibrary={view === "assets"}
      orderLabel={`${orderTitle(pkg)} (${orderShortCode(pkg)})`} conflicts={inspectedConflicts}
      onClose={() => setInspectId(null)} onOpenFullKb={() => navigate("assets")}
      onApplyCase={c => { setInspectId(null); navigate("new"); setNewText(c.customerRawQuote); setNewMode(c.mode); }} />
    {modal === "visual" && <div className="visual-backdrop no-print" onClick={() => setModal(null)}>
      <section role="dialog" aria-modal="true" aria-label="四分镜绘图提示词" className="visual-dialog" onClick={e => e.stopPropagation()}>
        <button className="visual-close" onClick={() => setModal(null)} aria-label="关闭视觉需求包"><X size={18} /></button>
        <Tab4VisualStudio pkg={pkg} modelSettings={settings} onOpenModelConfig={() => openSettings("image", "当前订单")}
          onUpdateSlot={(id, patch) => updateCurrent(p => ({ ...p, visualSlots: p.visualSlots.map(s => s.slotId === id ? { ...s, ...patch } : s) }))} />
      </section></div>}
  </>;
}
