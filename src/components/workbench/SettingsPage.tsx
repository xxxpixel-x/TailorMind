import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Check, Download, RotateCcw } from "lucide-react";
import { LLM_PRESETS, textModelConfig, type ClientModelSettings } from "@/lib/model-settings";
import { exportLedgerRegisterXlsx } from "@/lib/export-ledger";
import type { LiangYiPlanPackage } from "@/lib/types";

const sections = { models: "模型接口", boundaries: "能力边界", data: "本地数据" } as const;
type SettingsSection = keyof typeof sections;
export type SettingsAnchor = SettingsSection | "image";
const responsibilities = [
  ["感性语义解构", "衣语", "把口语化审美、体型痛点和企业 VI 需求整理成六维参数与八项设计语言草稿。"],
  ["存量资产检索", "衣语", "从版型母版、面料、非遗工艺和历史案例中匹配参考。"],
  ["方案初稿与可行性提示", "衣语", "给出风格定位、适配依据、团装岗位分级和打样试穿重点。"],
  ["视觉提示词", "衣语", "生成四分镜企划提示词与概念参考图。"],
  ["台账留痕", "衣语", "记录操作，生成可二次编辑的台账。"],
];
const handoffs = [
  ["净体量体与最终制版", "制版师", "完成 CAD 纸样、放码和样衣立裁微调。"],
  ["实物面料签样", "顾问", "与客户现场核对色卡、触摸面料并签样。"],
  ["报价、交期与合同", "业务人员", "负责核价、折扣、签约和收款。"],
  ["下达排产", "业务人员", "原型使用集团静态模拟数据，排产由业务人员办理。"],
];

interface Props {
  settings: ClientModelSettings;
  initialSection: SettingsAnchor;
  orders: LiangYiPlanPackage[];
  backLabel?: string;
  onBack?: () => void;
  onSave: (settings: ClientModelSettings) => void;
  onReset: () => Promise<void>;
}

function ModelField({ label, value, onChange, secret = false, hint }: {
  label: string; value: string; onChange: (value: string) => void; secret?: boolean; hint?: string;
}) {
  return <label className={"fld" + (secret ? " full" : "")}><span>{label}</span><span className="in">
    <input aria-label={label} type={secret ? "password" : "text"} autoComplete="off" spellCheck={false}
      value={value} onChange={e => onChange(e.target.value)} />
    {hint && <small className="hint">{hint}</small>}
  </span></label>;
}

export default function SettingsPage({ settings, initialSection, orders, backLabel, onBack, onSave, onReset }: Props) {
  const [draft, setDraft] = useState(settings);
  const [section, setSection] = useState<SettingsSection>(initialSection === "image" ? "models" : initialSection);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState("");
  const [dataNotice, setDataNotice] = useState("");
  const [resetting, setResetting] = useState(false);
  const attempt = useRef<AbortController | null>(null);
  const panels = useRef<HTMLDivElement>(null);
  const hasKey = !!draft.llmApiKey.trim();
  const connected = hasKey && draft.llmVerified;
  const currentPreset = LLM_PRESETS.find(p => p.baseUrl === settings.llmBaseUrl);
  const imageDirty = draft.imgModel !== settings.imgModel || draft.imgBaseUrl !== settings.imgBaseUrl || draft.imgApiKey !== settings.imgApiKey;
  const logCount = orders.reduce((sum, p) => sum + p.ledger.auditLogs.length, 0);

  function go(id: SettingsAnchor) {
    setSection(id === "image" ? "models" : id);
    panels.current?.querySelector('[data-section="' + id + '"]')?.scrollIntoView({ block: "start" });
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() => go(initialSection));
    return () => { cancelAnimationFrame(frame); attempt.current?.abort(); };
  }, [initialSection]);

  useEffect(() => {
    const container = panels.current;
    const scroller = container?.closest(".main");
    if (!container || !scroller) return;
    function onScroll() {
      if (!container || !scroller) return;
      const top = scroller.getBoundingClientRect().top + 120;
      const targets = (["models", "boundaries", "data"] as SettingsSection[])
        .map(id => ({ id, el: container.querySelector<HTMLElement>(`[data-section="${id}"]`) }))
        .filter((x): x is { id: SettingsSection; el: HTMLElement } => !!x.el);
      let active: SettingsSection = "models";
      for (const item of targets) {
        if (item.el.getBoundingClientRect().top <= top) active = item.id;
      }
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 24 && targets.length) {
        active = targets[targets.length - 1].id;
      }
      setSection(active);
    }
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  function updateText(patch: Partial<ClientModelSettings>) {
    attempt.current?.abort(); attempt.current = null;
    setTesting(false); setNotice(""); setDraft(d => ({ ...d, ...patch, llmVerified: false }));
  }
  async function testConnection() {
    const controller = new AbortController();
    attempt.current = controller; setTesting(true); setNotice("");
    try {
      const res = await fetch("/api/agent/ping", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textModelConfig(draft)), signal: controller.signal });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "模型连接失败。");
      if (!controller.signal.aborted) {
        setDraft(d => ({ ...d, llmVerified: true })); setNotice("测试连接成功。");
        if (draft.llmBaseUrl === settings.llmBaseUrl && draft.llmModel === settings.llmModel && draft.llmApiKey === settings.llmApiKey)
          onSave({ ...settings, llmVerified: true });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setDraft(d => ({ ...d, llmVerified: false }));
        if (settings.llmVerified && draft.llmBaseUrl === settings.llmBaseUrl && draft.llmModel === settings.llmModel && draft.llmApiKey === settings.llmApiKey)
          onSave({ ...settings, llmVerified: false });
        setNotice(err instanceof TypeError ? "未能连接测试服务，请重试。" : err instanceof Error ? err.message : "测试连接失败。");
      }
    } finally { if (!controller.signal.aborted) setTesting(false); }
  }
  function save() { onSave(draft); setNotice("模型配置已保存。"); }
  return <>
    <header className="mhead"><div className="order-head-left">
      <div className="crumb-row">
        {backLabel && onBack && <button className="crumb-back" onClick={onBack}><ArrowLeft size={13} />返回{backLabel}</button>}
        <span className="crumb">衣语 TailorMind · 海派定制中心</span>
      </div>
      <h1>设置</h1></div>
      <nav className="seg" aria-label="设置分区">{(Object.keys(sections) as SettingsSection[]).map(id =>
        <button key={id} className={id === section ? "on" : ""} aria-pressed={id === section} onClick={() => go(id)}>{sections[id]}</button>)}</nav>
    </header>
    <div className="wrap"><div className="set" ref={panels}>
      <section className="panel" data-section="models" aria-label="文本模型">
        <div className="hd2"><div><h3>文本模型</h3><p className="sub">用于需求拆解、方案生成与指令调整</p></div>
          <span className={"chip" + (connected ? " j" : "")}>{connected ? "已连接" : hasKey ? "已配置" : "本地规则模式"}</span></div>
        <div className="engine"><i className="dot" />{settings.llmApiKey.trim()
          ? "当前文本模型：" + (currentPreset ? currentPreset.name + " · " : "") + settings.llmModel + "（异常时自动回退本地规则）"
          : "当前运行本地规则引擎；保存 API Key 后可启用大模型解析"}</div>
        <div className="presets">{LLM_PRESETS.map(p => <button key={p.baseUrl}
          className={"fchip" + (draft.llmBaseUrl === p.baseUrl && draft.llmModel === p.model ? " on" : "")}
          onClick={() => updateText({ llmBaseUrl: p.baseUrl, llmModel: p.model })}>{p.name}</button>)}</div>
        <div className="fields">
          <ModelField label="接口地址" value={draft.llmBaseUrl} onChange={v => updateText({ llmBaseUrl: v })} />
          <ModelField label="模型" value={draft.llmModel} onChange={v => updateText({ llmModel: v })} />
          <ModelField secret label="API Key" hint="仅存本地" value={draft.llmApiKey} onChange={v => updateText({ llmApiKey: v })} />
        </div>
        <div className="foot2"><span role="status">{notice}</span>
          <button className="btn-soft" disabled={!hasKey || !draft.llmModel.trim() || !draft.llmBaseUrl.trim() || testing} onClick={testConnection}>{testing ? "测试中…" : "测试连接"}</button>
          <button className="btn" disabled={testing} onClick={save}>保存</button></div>
      </section>
      <section className="panel" data-section="image" aria-label="图像模型">
        <div className="hd2"><div><h3>图像模型</h3><p className="sub">用于生成视觉参考图，不作为实物色差与手感依据</p></div><span className="chip">{draft.imgApiKey.trim() ? "已配置" : "未配置"}</span></div>
        <div className="fields">
          <ModelField label="接口地址" value={draft.imgBaseUrl} onChange={v => setDraft({ ...draft, imgBaseUrl: v })} />
          <ModelField label="模型" value={draft.imgModel} onChange={v => setDraft({ ...draft, imgModel: v })} />
          <ModelField secret label="API Key" hint={draft.imgApiKey.trim() ? "仅存本地" : "未配置时使用案例参考图"} value={draft.imgApiKey} onChange={v => setDraft({ ...draft, imgApiKey: v })} />
        </div>{imageDirty && <div className="foot2"><button className="btn" disabled={testing} onClick={save}>保存图像配置</button></div>}
      </section>
      <section className="panel" data-section="boundaries"><div className="hd2"><div><h3>能力边界</h3><p className="sub">AI 辅助与人工终审分工</p></div></div>
        <div className="bounds">{[responsibilities, handoffs].map((items, i) => <div key={i} className={"bcol " + (i ? "human" : "ai-do")}>
          <h4><i>{i ? "!" : <Check size={13} />}</i>{i ? "人工终审与交付" : "衣语辅助"}</h4>
          <ul>{items.map(([name, owner, job]) => <li key={name}><b>{name}<span className="chip">{owner}</span></b>{job}</li>)}</ul></div>)}</div>
        <p className="redline"><BookOpen />上报审核仅更新本地台账记录，不接入外部生产系统</p>
      </section>
      <section className="panel" data-section="data"><div className="hd2"><div><h3>本地数据</h3><p className="sub">订单、台账与照片均保存在当前浏览器本地</p></div></div>
        <div className="datarow"><span>{orders.length} 笔订单 · {logCount} 条操作记录</span><div className="r">
          <button className="ghost" onClick={() => exportLedgerRegisterXlsx(orders)}><Download />导出全部台账</button>
          <button className="ghost danger" disabled={resetting} onClick={async () => {
            if (!window.confirm("恢复演示数据将清空本机订单、照片、对话、版本和操作留痕，并重新生成演示订单。确定恢复？")) return;
            setResetting(true); setDataNotice("");
            try { await onReset(); setDataNotice("已恢复演示数据并清空本地照片库"); }
            catch { setDataNotice("恢复失败，请检查浏览器存储权限后重试"); }
            finally { setResetting(false); }
          }}><RotateCcw />恢复演示数据</button>
        </div></div>
        <p className="sub">语音转写调用浏览器内置识别能力</p>
        {dataNotice && <p className="sub" role="status">{dataNotice}</p>}
      </section>
    </div></div>
  </>;
}
