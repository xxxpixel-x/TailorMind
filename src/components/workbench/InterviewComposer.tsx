import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUp, Image as Photo, LoaderCircle, Mic } from "lucide-react";
import type { InterviewPhoto } from "@/lib/types";
import { addDraftPhotos, draftPhotos, editDraftPhoto, PHOTO_DRAFT_CHANGED, PHOTO_LIMIT } from "@/lib/workbench-photos";
import { PhotoImage } from "./InterviewPhotos";
import { useTranscription } from "./useTranscription";

interface Props {
  kind: "new" | "thread" | "record";
  draftKey: string;
  savedPhotos?: InterviewPhoto[];
  text: string;
  onText: (value: string) => void;
  busy: boolean;
  autoFocus?: boolean;
  onSubmit: (text: string, photos: InterviewPhoto[]) => void;
  modeSwitch?: ReactNode;
  starters?: ReactNode;
}

const labels = {
  new: ["客户原话", "输入客户口述原话，如场合、身形顾虑、颜色或面料偏好…", "发送原话"],
  thread: ["补充原话或回答追问", "补充说明，或回复上方追问…", "发送补充"],
  record: ["补充客户原话", "补充客户原话…", "更新需求"],
};
const stillBars = [6, 9, 12, 9, 6, 4, 6, 9, 12, 9, 6, 4, 6, 9, 12, 9];

export default function InterviewComposer({ kind, draftKey, savedPhotos, text, onText, busy, autoFocus, onSubmit, modeSwitch, starters }: Props) {
  const [photos, setPhotos] = useState<InterviewPhoto[]>([]);
  const [working, setWorking] = useState(false);
  const [photoNotice, setPhotoNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [label, placeholder, sendLabel] = labels[kind];
  const file = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lifetime = useRef<AbortController | null>(null);
  const speech = useTranscription(text, onText, busy);
  useEffect(() => {
    if (autoFocus && !busy) inputRef.current?.focus();
  }, [autoFocus, draftKey, busy]);
  const listening = speech.state === "recording";
  const attachments = photos.filter(p => !savedPhotos?.some(saved => saved.id === p.id));
  const available = PHOTO_LIMIT - (savedPhotos?.length ?? 0);
  useEffect(() => {
    if (kind === "new" && (listening || attachments.length) && location.hash === "#new")
      history.replaceState(null, "", "#rec");
  }, [kind, listening, attachments.length]);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    let read = 0;
    setPhotos([]); setReady(false); setWorking(false); setPhotoNotice("");
    function refresh() {
      const revision = ++read;
      void draftPhotos(draftKey).then(items => {
        if (!controller.signal.aborted && revision === read) setPhotos(items);
      }).catch(() => {
        if (!controller.signal.aborted) setPhotoNotice("无法读取本机照片库。");
      }).finally(() => { if (!controller.signal.aborted) setReady(true); });
    }
    refresh(); window.addEventListener(PHOTO_DRAFT_CHANGED, refresh);
    return () => { controller.abort(); window.removeEventListener(PHOTO_DRAFT_CHANGED, refresh); };
  }, [draftKey]);

  async function changePhotos(change: (signal: AbortSignal) => Promise<string | void>) {
    const signal = lifetime.current?.signal;
    if (!signal || busy || working) return;
    setWorking(true); setPhotoNotice("");
    try {
      const message = await change(signal);
      const saved = await draftPhotos(draftKey);
      if (!signal.aborted) { setPhotos(saved); setPhotoNotice(message || ""); }
    } catch { if (!signal.aborted) setPhotoNotice("照片未能保存，请检查本机存储空间后重试。"); }
    finally { if (!signal.aborted) setWorking(false); }
  }

  const blocked = busy || working || !ready;
  function submit() {
    if (blocked || !text.trim()) return;
    speech.stop();
    onSubmit(text.trim(), attachments);
  }
  const time = [Math.floor(speech.seconds / 60), speech.seconds % 60].map(n => String(n).padStart(2, "0")).join(":");
  return <>
    <form className={kind === "record" ? "composer record-composer" : "composer"} onSubmit={e => { e.preventDefault(); submit(); }}>
      {listening && <div className="recbar"><i className="dot" /><span role="status">正在转写</span>
        <span className="wave" aria-label={speech.levels ? "麦克风音量" : "静态波形"}>{(speech.levels ?? stillBars).map((height, i) =>
          <i key={i} style={{ height }} />)}</span>
        <time className="tm">{time}</time><button type="button" className="stop" onClick={speech.stop}><i />停止</button></div>}
      {!!attachments.length && <div className="atts">{attachments.map(p => <div className="att" key={p.id}>
        <PhotoImage photo={p} /><button type="button" className="lb" title="切换照片标签" disabled={blocked}
          onClick={() => void changePhotos(() => editDraftPhoto(draftKey, p.id, p.label === "体型照" ? "参考图" : "体型照"))}>{p.label}</button>
        <button type="button" className="x" aria-label={"删除" + p.label} disabled={blocked}
          onClick={() => void changePhotos(() => editDraftPhoto(draftKey, p.id))}>×</button></div>)}</div>}
      {listening ? <div className="ph transcript" role="textbox" aria-label={label} aria-readonly="true">
        <span className="said">{text}</span><span className="interim">{speech.interim}</span></div>
        : <textarea ref={inputRef} className="ph" aria-label={label} placeholder={placeholder} value={text} maxLength={1500}
          disabled={kind !== "thread" && busy} onChange={e => onText(e.target.value)} onKeyDown={e => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            if (kind === "new" ? e.ctrlKey || e.metaKey : !e.shiftKey) { e.preventDefault(); submit(); }
          }} />}
      <div className="ctools"><div className="l">{modeSwitch}
        <input ref={file} type="file" hidden multiple accept="image/*" aria-label="选择面谈照片" onChange={e => {
          const files = Array.from(e.target.files ?? []); e.target.value = "";
          if (files.length) void changePhotos(signal => addDraftPhotos(draftKey, files, available, signal));
        }} />
        <button type="button" className="pill" disabled={blocked} onClick={() => {
          if (attachments.length >= available) setPhotoNotice("每单最多添加 6 张照片"); else file.current?.click();
        }}><Photo />添加照片</button>
        <button type="button" className={"pill" + (listening ? " recording" : "")} disabled={busy}
          aria-pressed={speech.state !== "idle"} onClick={speech.state === "idle" ? speech.start : speech.stop}><Mic />
          {listening ? "录音中" : speech.state === "starting" ? "等待麦克风" : "录音"}</button>
        {speech.notice && <small className="media-notice" role="status">{speech.notice}</small>}
        {(photoNotice || working) && <small className="media-notice" role="status">{photoNotice || "正在保存照片…"}</small>}
      </div>
      <div className="ctools-r">
        {kind === "new" && <span className="send-hint">Ctrl + Enter 发送</span>}
        <button className={kind === "record" ? "btn" : "send" + (!text.trim() || blocked ? " off" : "")}
          aria-label={sendLabel} disabled={blocked || !text.trim()}>{kind === "record" ? <>{busy ? "解析中…" : sendLabel}<ArrowRight /></>
            : busy ? <LoaderCircle className="spin" /> : <ArrowUp />}</button>
      </div></div>
    </form>
    {ready && speech.state === "idle" && !attachments.length && !working && starters}
  </>;
}
