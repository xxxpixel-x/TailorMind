import { useEffect, useRef, useState } from "react";

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  start(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

const messages: Record<string, string> = {
  "not-allowed": "没有麦克风权限，请在浏览器里允许使用麦克风。",
  "service-not-allowed": "浏览器未允许使用语音识别服务。",
  "audio-capture": "未能打开麦克风，请检查输入设备。",
  "no-speech": "没有听到语音，可以再试一次。",
  network: "浏览器语音服务连接失败，请稍后再试。",
  "language-not-supported": "浏览器的识别服务暂不支持中文。",
};

export function useTranscription(text: string, onText: (value: string) => void, disabled: boolean) {
  const [state, setState] = useState<"idle" | "starting" | "recording">("idle");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[] | null>(null);
  const [notice, setNotice] = useState("");
  const latest = useRef({ text, onText });
  latest.current = { text, onText };
  const cancel = useRef<((update: boolean) => void) | null>(null);
  const stop = () => cancel.current?.(true);

  useEffect(() => {
    const leave = () => cancel.current?.(true);
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); cancel.current?.(false); };
  }, []);
  useEffect(() => { if (disabled) cancel.current?.(true); }, [disabled]);

  function start() {
    if (disabled || cancel.current) return;
    const browser = window as SpeechWindow;
    const Engine = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Engine) { setNotice("这个浏览器不支持语音转写，请用 Edge 或 Chrome。"); return; }
    let recognition: Recognition;
    try { recognition = new Engine(); }
    catch { setNotice("浏览器未能启动语音转写。"); return; }
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    let ended = false;
    let clock: number | undefined, meter: number | undefined;
    let stream: MediaStream | undefined, audio: AudioContext | undefined;
    const confirmed = new Set<number>();
    function finish(update: boolean) {
      if (ended) return;
      ended = true;
      cancel.current = null;
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.abort(); } catch { /* 识别服务可能已自行结束。 */ }
      window.clearInterval(clock); window.clearInterval(meter);
      stream?.getTracks().forEach(track => track.stop());
      if (audio && audio.state !== "closed") void audio.close().catch(() => {});
      if (update) { setState("idle"); setInterim(""); setLevels(null); }
    }
    async function measureVolume() {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (ended) { mic.getTracks().forEach(track => track.stop()); return; }
        stream = mic;
        audio = new AudioContext();
        if (audio.state === "suspended") await audio.resume();
        if (ended) return;
        const analyser = audio.createAnalyser();
        analyser.fftSize = 512;
        audio.createMediaStreamSource(mic).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        let bars = Array<number>(16).fill(3);
        meter = window.setInterval(() => {
          analyser.getByteTimeDomainData(samples);
          let power = 0;
          for (const sample of samples) power += ((sample - 128) / 128) ** 2;
          const height = 3 + Math.min(19, Math.round(Math.sqrt(power / samples.length) * 90));
          bars = [...bars.slice(1), height];
          setLevels(bars);
        }, 90);
      } catch {
        stream?.getTracks().forEach(track => track.stop());
        // 电平不可用时保留静止竖条，浏览器识别服务可独立继续。
      }
    }
    cancel.current = finish;
    setNotice(""); setInterim(""); setSeconds(0); setLevels(null); setState("starting");
    recognition.onstart = () => {
      setState("recording");
      const started = performance.now();
      clock = window.setInterval(() => setSeconds(Math.floor((performance.now() - started) / 1000)), 250);
      void measureVolume();
    };
    recognition.onresult = event => {
      let addition = "", pending = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) pending += result[0].transcript;
        else if (i >= event.resultIndex && !confirmed.has(i)) {
          addition += result[0].transcript;
          confirmed.add(i);
        }
      }
      if (addition) {
        const value = latest.current.text + addition;
        latest.current.text = value.slice(0, 1500);
        latest.current.onText(latest.current.text);
        if (value.length >= 1500) { setNotice("已达到 1500 字上限，请分段记录。"); finish(true); return; }
      }
      setInterim(pending);
    };
    recognition.onerror = event => { setNotice(messages[event.error] ?? "语音转写已中断，可以重新录音。"); finish(true); };
    recognition.onend = () => finish(true);
    try { recognition.start(); }
    catch (error) {
      setNotice(error instanceof DOMException && error.name === "NotAllowedError" ? messages["not-allowed"] : "浏览器未能启动语音转写。");
      finish(true);
    }
  }
  return { state, interim, seconds, levels, notice, start, stop };
}
