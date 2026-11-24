import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { DEMO_PRESET_PROMPTS, type DemoPresetPrompt } from "@/data/demo-scenarios";
import type { BusinessMode, InterviewPhoto } from "@/lib/types";
import { modeLabel } from "@/lib/workbench-orders";
import InterviewComposer from "./InterviewComposer";

interface Props {
  text: string;
  mode: BusinessMode;
  busy: boolean;
  customer?: { name: string; key: string };
  onText: (v: string) => void;
  onMode: (v: BusinessMode) => void;
  onClearCustomer: () => void;
  onBackToClients: () => void;
  onSubmit: (text: string, photos: InterviewPhoto[]) => void;
  onPreset: (p: DemoPresetPrompt) => void;
  onBoundary: () => void;
}

export default function NewInterview({ text, mode, busy, customer, onText, onMode, onClearCustomer, onBackToClients, onSubmit, onPreset, onBoundary }: Props) {
  const [presetHint, setPresetHint] = useState("");
  function pickPreset(preset: DemoPresetPrompt) {
    onPreset(preset);
    setPresetHint(`已填入「${preset.title}」示例，可修改后发送`);
  }
  return <section className="start"><div className="start-in">
    <div className="mark" aria-hidden="true"><span>衣</span><span>语</span></div>
    {customer && <div className="customer-ctx">
      <button type="button" className="ghost ctx-back" onClick={onBackToClients}><ArrowLeft size={14} />返回客户档案</button>
      <span className="chip o">关联客户：{customer.name}
        <button type="button" className="ctx-clear" aria-label="切换为新客户" title="取消关联，切换为新客户" onClick={onClearCustomer}><X size={12} />切换新客</button>
      </span>
    </div>}
    <h1>{customer ? customer.name + " · 新建定制" : "记录客户需求"}</h1>
    <InterviewComposer kind="new" draftKey={customer ? "new:" + customer.key : "new"} text={text}
      onText={v => { onText(v); if (!v) setPresetHint(""); }} onSubmit={onSubmit} busy={busy} autoFocus
      modeSwitch={<div className="seg2" aria-label="业务类型">
        {(["bespoke", "uniform"] as const).map(m => <button type="button" key={m} className={m === mode ? "on" : ""}
          aria-pressed={m === mode} disabled={busy} onClick={() => onMode(m)}>{modeLabel(m)}</button>)}</div>}
      starters={<>{!customer && <div className="starters" aria-label="快速填入演示案例">{DEMO_PRESET_PROMPTS.map(p => <button type="button" className="starter" key={p.id} disabled={busy}
        onClick={() => pickPreset(p)}>{p.title}<em>{modeLabel(p.mode)}</em></button>)}</div>}
        {presetHint && <p role="status" className="preset-hint">{presetHint}</p>}
        <p className="bound">照片仅存本机；量体、定稿与报价由人工确认 · <button type="button" onClick={onBoundary}>服务边界</button></p></>} />
    {busy && <p role="status" className="input-notice text-center">正在解析…</p>}
  </div></section>;
}
