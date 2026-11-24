"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  DesignDirectionOption,
  LiangYiPlanPackage,
  RequirementItem,
} from "@/lib/types";

export type GarmentZoneId = "collar" | "shoulder" | "craft" | "fabric";

export interface ZoneCoord {
  x: number; // 0..100 (% of garment image width)
  y: number; // 0..100 (% of garment image height)
  zoom: number; // 2.2..3.4
  boxW: number; // optical focus box width in px at screen overlay
  boxH: number; // optical focus box height in px at screen overlay
}

const DEFAULT_COORDS: Record<GarmentZoneId, ZoneCoord> = {
  collar: { x: 50, y: 23, zoom: 2.8, boxW: 144, boxH: 112 },
  shoulder: { x: 28, y: 29, zoom: 2.5, boxW: 148, boxH: 120 },
  craft: { x: 50, y: 48, zoom: 2.8, boxW: 148, boxH: 128 },
  fabric: { x: 60, y: 65, zoom: 3.1, boxW: 152, boxH: 124 },
};

// 针对上服官方 15 张实拍与企划图的像素级校准坐标
const IMAGE_ZONE_CALIBRATION: Record<string, Record<GarmentZoneId, ZoneCoord>> = {
  "/cases/shangfu/image1.jpeg": {
    collar: { x: 50, y: 18, zoom: 2.85, boxW: 146, boxH: 108 },
    shoulder: { x: 73, y: 27, zoom: 2.55, boxW: 142, boxH: 124 },
    craft: { x: 47, y: 42, zoom: 2.75, boxW: 132, boxH: 148 },
    fabric: { x: 34, y: 63, zoom: 3.15, boxW: 152, boxH: 126 },
  },
  "/cases/shangfu/image3.jpeg": {
    collar: { x: 48, y: 34, zoom: 2.75, boxW: 146, boxH: 118 },
    shoulder: { x: 66, y: 36, zoom: 2.55, boxW: 142, boxH: 120 },
    craft: { x: 51, y: 74, zoom: 2.95, boxW: 156, boxH: 126 },
    fabric: { x: 34, y: 58, zoom: 2.75, boxW: 148, boxH: 120 },
  },
  "/cases/shangfu/image4.jpeg": {
    collar: { x: 49, y: 26, zoom: 2.8, boxW: 146, boxH: 124 },
    shoulder: { x: 27, y: 29, zoom: 2.55, boxW: 140, boxH: 124 },
    craft: { x: 63, y: 42, zoom: 3.05, boxW: 148, boxH: 128 },
    fabric: { x: 37, y: 72, zoom: 3.05, boxW: 152, boxH: 126 },
  },
  "/cases/shangfu/image5.jpeg": {
    collar: { x: 50, y: 24, zoom: 2.75, boxW: 148, boxH: 124 },
    shoulder: { x: 26, y: 32, zoom: 2.55, boxW: 142, boxH: 124 },
    craft: { x: 42, y: 63, zoom: 2.95, boxW: 136, boxH: 148 },
    fabric: { x: 80, y: 68, zoom: 2.85, boxW: 148, boxH: 122 },
  },
  "/cases/shangfu/image7.jpeg": {
    collar: { x: 52, y: 24, zoom: 2.9, boxW: 144, boxH: 110 },
    shoulder: { x: 27, y: 30, zoom: 2.6, boxW: 140, boxH: 124 },
    craft: { x: 51, y: 47, zoom: 3.0, boxW: 128, boxH: 146 },
    fabric: { x: 64, y: 66, zoom: 3.15, boxW: 152, boxH: 126 },
  },
  "/cases/shangfu/image10.jpeg": {
    collar: { x: 50, y: 20, zoom: 2.85, boxW: 144, boxH: 108 },
    shoulder: { x: 27, y: 28, zoom: 2.6, boxW: 144, boxH: 124 },
    craft: { x: 57, y: 31, zoom: 2.85, boxW: 158, boxH: 118 },
    fabric: { x: 63, y: 58, zoom: 3.2, boxW: 152, boxH: 126 },
  },
  "/cases/shangfu/image12.jpeg": {
    collar: { x: 48, y: 25, zoom: 2.85, boxW: 144, boxH: 122 },
    shoulder: { x: 72, y: 29, zoom: 2.55, boxW: 140, boxH: 124 },
    craft: { x: 46, y: 50, zoom: 2.85, boxW: 132, boxH: 146 },
    fabric: { x: 62, y: 44, zoom: 3.2, boxW: 152, boxH: 126 },
  },
  "/cases/shangfu/image13.png": {
    collar: { x: 19, y: 61, zoom: 2.65, boxW: 150, boxH: 126 },
    shoulder: { x: 50, y: 61, zoom: 2.65, boxW: 150, boxH: 126 },
    craft: { x: 80, y: 88, zoom: 2.55, boxW: 152, boxH: 120 },
    fabric: { x: 31, y: 88, zoom: 2.55, boxW: 156, boxH: 120 },
  },
  // Nano Banana 生成的高定与团装方向效果图校准坐标
  "/generated/dir-wedding-a.jpg": {
    collar: { x: 50, y: 31, zoom: 2.8, boxW: 146, boxH: 112 },
    shoulder: { x: 26, y: 36, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 50, y: 52, zoom: 3.0, boxW: 136, boxH: 142 },
    fabric: { x: 37, y: 58, zoom: 3.2, boxW: 152, boxH: 126 },
  },
  "/generated/dir-wedding-b.jpg": {
    collar: { x: 50, y: 27, zoom: 2.8, boxW: 146, boxH: 112 },
    shoulder: { x: 25, y: 34, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 50, y: 48, zoom: 3.05, boxW: 132, boxH: 148 },
    fabric: { x: 35, y: 56, zoom: 3.15, boxW: 152, boxH: 126 },
  },
  "/generated/dir-wedding-c.jpg": {
    collar: { x: 48, y: 30, zoom: 2.8, boxW: 146, boxH: 116 },
    shoulder: { x: 26, y: 36, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 48, y: 52, zoom: 2.9, boxW: 138, boxH: 146 },
    fabric: { x: 64, y: 58, zoom: 3.2, boxW: 152, boxH: 126 },
  },
  "/generated/dir-bank-a.jpg": {
    collar: { x: 50, y: 24, zoom: 2.85, boxW: 144, boxH: 110 },
    shoulder: { x: 24, y: 30, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 63, y: 40, zoom: 3.2, boxW: 140, boxH: 116 },
    fabric: { x: 35, y: 58, zoom: 3.15, boxW: 152, boxH: 126 },
  },
  "/generated/dir-bank-b.jpg": {
    collar: { x: 50, y: 26, zoom: 2.85, boxW: 146, boxH: 112 },
    shoulder: { x: 25, y: 34, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 58, y: 41, zoom: 3.05, boxW: 142, boxH: 132 },
    fabric: { x: 36, y: 58, zoom: 3.15, boxW: 152, boxH: 126 },
  },
  "/generated/dir-bank-c.jpg": {
    collar: { x: 50, y: 24, zoom: 2.85, boxW: 146, boxH: 110 },
    shoulder: { x: 25, y: 33, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 50, y: 42, zoom: 2.85, boxW: 156, boxH: 120 },
    fabric: { x: 35, y: 62, zoom: 3.15, boxW: 152, boxH: 126 },
  },
  "/generated/dir-forum-a.jpg": {
    collar: { x: 50, y: 26, zoom: 2.85, boxW: 144, boxH: 110 },
    shoulder: { x: 25, y: 33, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 50, y: 36, zoom: 3.0, boxW: 142, boxH: 122 },
    fabric: { x: 63, y: 56, zoom: 3.2, boxW: 152, boxH: 126 },
  },
  "/generated/dir-forum-b.jpg": {
    collar: { x: 50, y: 25, zoom: 2.85, boxW: 144, boxH: 110 },
    shoulder: { x: 24, y: 33, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 50, y: 48, zoom: 3.05, boxW: 132, boxH: 148 },
    fabric: { x: 35, y: 60, zoom: 3.15, boxW: 152, boxH: 126 },
  },
  "/generated/dir-forum-c.jpg": {
    collar: { x: 50, y: 27, zoom: 2.85, boxW: 146, boxH: 116 },
    shoulder: { x: 25, y: 33, zoom: 2.55, boxW: 144, boxH: 124 },
    craft: { x: 48, y: 48, zoom: 2.9, boxW: 136, boxH: 146 },
    fabric: { x: 64, y: 58, zoom: 3.2, boxW: 152, boxH: 126 },
  },
};

interface ZoneMeta {
  id: GarmentZoneId;
  code: string;
  label: string;
  shortLabel: string;
  specTitle: string;
  specValue: string;
  engineeringNote: string;
  assetId?: string;
  matchedReqs: RequirementItem[];
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function matchReqsForZone(
  zoneId: GarmentZoneId,
  requirements: RequirementItem[]
): RequirementItem[] {
  const regexMap: Record<GarmentZoneId, RegExp> = {
    collar: /领|脖|颈|旗袍|内搭|叠穿/,
    shoulder: /肩|背|驼|袖|手臂|抬手|肚腩|宽松|合身|活动|特体|坐奏/,
    craft: /纹|花|滚边|盘扣|流苏|马头墙|老气|亮点|暗纹|徽章|Logo|撞色|星光/,
    fabric: /面料|宋锦|真丝|醋酸|香云纱|针织|抗皱|耐洗|季节|酒店|贴身|垂感|色|红|黑|蓝|灰/,
  };
  const rx = regexMap[zoneId];
  return requirements.filter(
    (r) =>
      rx.test(r.rawPhrase) ||
      rx.test(r.solutionAction) ||
      (zoneId === "collar" && r.category === "穿搭结构") ||
      (zoneId === "shoulder" && r.category === "体型修饰") ||
      (zoneId === "fabric" && r.category === "色彩材质")
  );
}

interface Props {
  open: boolean;
  pkg: LiangYiPlanPackage;
  direction: DesignDirectionOption;
  initialZone?: GarmentZoneId | null;
  onClose: () => void;
  onInspectAsset?: (assetId: string) => void;
}

const ZONE_ORDER: GarmentZoneId[] = ["collar", "shoulder", "craft", "fabric"];

export default function GarmentDetailInspectorModal({
  open,
  pkg,
  direction,
  initialZone = null,
  onClose,
  onInspectAsset,
}: Props) {
  const [activeZone, setActiveZone] = useState<GarmentZoneId | null>(null);
  const [autoTour, setAutoTour] = useState(false);
  const plateRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );

  const coordsMap = useMemo(
    () => IMAGE_ZONE_CALIBRATION[direction.referenceImageUrl] || DEFAULT_COORDS,
    [direction.referenceImageUrl]
  );

  // 打开时先给全身，指定了部位则稍后慢慢推近
  useEffect(() => {
    if (!open) return;
    setAutoTour(false);
    setActiveZone(null);
    setLens(null);
    if (!initialZone) return;
    const timer = setTimeout(() => setActiveZone(initialZone), 120);
    return () => clearTimeout(timer);
  }, [open, initialZone]);

  const step = (k: number) =>
    setActiveZone((prev) => {
      const i = prev ? ZONE_ORDER.indexOf(prev) : -1;
      const next = i < 0 ? (k > 0 ? 0 : ZONE_ORDER.length - 1) : (i + k + ZONE_ORDER.length) % ZONE_ORDER.length;
      return ZONE_ORDER[next];
    });

  // 键盘：← → 切部位，1-4 直达，0 回全身，Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        setAutoTour(false);
        step(e.key === "ArrowRight" ? 1 : -1);
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        setAutoTour(false);
        setActiveZone(ZONE_ORDER[Number(e.key) - 1]);
      } else if (e.key === "0") {
        setAutoTour(false);
        setActiveZone(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // 自动导览：每 4 秒换一个部位（适合录屏与路演）
  useEffect(() => {
    if (!open || !autoTour) return;
    const interval = setInterval(() => step(1), 4000);
    return () => clearInterval(interval);
  }, [open, autoTour]);

  const zones: ZoneMeta[] = useMemo(() => {
    const { eightFields, requirements } = pkg;
    const isSelectedDir = pkg.proposal.selectedDirectionId === direction.id;
    const collarText = isSelectedDir
      ? eightFields.collar
      : direction.bullets[0] || eightFields.collar;
    const craftText = isSelectedDir
      ? eightFields.patternCraft
      : direction.bullets[1] || eightFields.patternCraft;
    const fabricText = direction.fabricSuggestion || eightFields.fabric;

    return [
      {
        id: "collar",
        code: "01",
        label: "领口结构",
        shortLabel: "领口",
        specTitle: "领型与颈部避让",
        specValue: collarText,
        engineeringNote:
          "立领高度、领口开度与内搭旗袍或衬衣的叠穿间隙，由制版师在白坯试穿时确认。",
        assetId: direction.patternId,
        matchedReqs: matchReqsForZone("collar", requirements).slice(0, 3),
      },
      {
        id: "shoulder",
        code: "02",
        label: "肩袖放量",
        shortLabel: "肩袖",
        specTitle: "肩型、后背与袖肥余量",
        specValue: `${eightFields.structure}；${eightFields.easeAllowance}`,
        engineeringNote:
          "肩斜、袖笼深与手臂活动松量对应富怡 / ET 纸样放码参数，净体围度需人工量体核准。",
        assetId: direction.patternId,
        matchedReqs: matchReqsForZone("shoulder", requirements).slice(0, 3),
      },
      {
        id: "craft",
        code: "03",
        label: "工艺纹样",
        shortLabel: "工艺",
        specTitle: "装饰焦点与克制边界",
        specValue: craftText,
        engineeringNote:
          "遵循海派定制「全身只留一处亮点」的原则，避免满绣堆砌、抢主客风头。",
        assetId: direction.craftId,
        matchedReqs: matchReqsForZone("craft", requirements).slice(0, 3),
      },
      {
        id: "fabric",
        code: "04",
        label: "面料肌理",
        shortLabel: "面料",
        specTitle: "织物垂感、色彩与体感",
        specValue: `${fabricText}；色彩：${eightFields.color}`,
        engineeringNote:
          "色差、手感与垂坠度以客户现场触摸实物色卡并签样为准。",
        assetId: direction.fabricId,
        matchedReqs: matchReqsForZone("fabric", requirements).slice(0, 3),
      },
    ];
  }, [pkg, direction]);

  if (!open) return null;

  const activeMeta = activeZone ? zones.find((z) => z.id === activeZone) || null : null;
  const isPending = (r: RequirementItem) => r.status === "待追问" || r.status === "未处理";

  // 推近：把部位移到画面中央再放大，并夹紧范围避免露出图外
  let plateTransform: React.CSSProperties = { transform: "none" };
  if (activeZone) {
    const c = coordsMap[activeZone];
    const lim = 50 / c.zoom;
    const x = clamp(c.x, lim, 100 - lim);
    const y = clamp(c.y, lim, 100 - lim);
    plateTransform = {
      transformOrigin: `${x}% ${y}%`,
      transform: `translate(${50 - x}%, ${50 - y}%) scale(${c.zoom})`,
    };
  }

  // 悬停放大镜：按 object-cover 的实际铺放尺寸换算背景位置
  const LENS = 170;
  const LENS_ZOOM = 2.6;
  let lensStyle: React.CSSProperties | null = null;
  if (lens && natural && !activeZone) {
    const scale = Math.max(lens.w / natural.w, lens.h / natural.h);
    const rw = natural.w * scale;
    const rh = natural.h * scale;
    const offX = (lens.w - rw) / 2;
    const offY = (lens.h - rh) / 2;
    lensStyle = {
      left: lens.x - LENS / 2,
      top: lens.y - LENS / 2,
      width: LENS,
      height: LENS,
      backgroundImage: `url(${direction.referenceImageUrl})`,
      backgroundSize: `${rw * LENS_ZOOM}px ${rh * LENS_ZOOM}px`,
      backgroundPosition: `${-((lens.x - offX) * LENS_ZOOM - LENS / 2)}px ${-((lens.y - offY) * LENS_ZOOM - LENS / 2)}px`,
    };
  }

  const handlePlateMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeZone || !plateRef.current) return;
    const rect = plateRef.current.getBoundingClientRect();
    setLens({
      x: clamp(e.clientX - rect.left, 0, rect.width),
      y: clamp(e.clientY - rect.top, 0, rect.height),
      w: rect.width,
      h: rect.height,
    });
  };

  const focusZone = (z: GarmentZoneId | null) => {
    setAutoTour(false);
    setActiveZone(z);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`细节放大 — ${direction.title}`}
      className="animate-fade-in no-print fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ground lg:overflow-hidden"
    >
      {/* 顶栏 */}
      <div className="flex min-h-[72px] shrink-0 items-center justify-between gap-6 border-b border-paper-border px-4 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-baseline gap-4">
          <span className="shrink-0 text-[12px] tracking-[3px] text-ink-light">细节</span>
          <b className="truncate font-serif text-[16px] font-semibold tracking-[2px] text-ink sm:text-[18px]">
            {direction.tag}
            <span className="ml-4">{direction.title}</span>
          </b>
        </div>
        <div className="flex shrink-0 items-center gap-6 text-[13px] text-ink-light sm:gap-8">
          <button
            type="button"
            onClick={() => {
              if (autoTour) return setAutoTour(false);
              step(1);
              setAutoTour(true);
            }}
            className={`min-h-[40px] transition-colors hover:text-ink ${autoTour ? "text-cinnabar" : ""}`}
          >
            {autoTour ? "暂停导览" : "自动导览"}
          </button>
          <button
            type="button"
            aria-label="关闭细节放大"
            onClick={onClose}
            className="inline-flex min-h-[40px] items-center gap-1.5 transition-colors hover:text-ink"
          >
            关闭
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* 看图区 */}
        <div className="relative flex items-center justify-center px-4 pb-16 pt-8 sm:px-8 lg:px-12 lg:pt-9">
          <div
            ref={plateRef}
            onMouseMove={handlePlateMove}
            onMouseLeave={() => setLens(null)}
            className="relative aspect-[4/5] w-full max-w-[520px] overflow-hidden bg-paper-warm shadow-[0_30px_60px_-40px_rgb(60_40_20/0.4)] lg:h-full lg:max-h-[calc(100vh-190px)] lg:w-auto lg:max-w-none"
          >
            <div
              className="absolute inset-0 transition-transform duration-1000 ease-[cubic-bezier(.2,.7,.2,1)]"
              style={plateTransform}
            >
              <img
                src={direction.referenceImageUrl}
                alt={`${direction.title}参考实物`}
                onLoad={(e) =>
                  setNatural({
                    w: e.currentTarget.naturalWidth,
                    h: e.currentTarget.naturalHeight,
                  })
                }
                className="block h-full w-full object-cover"
              />
            </div>

            {/* 部位热点：细线小圆 + 斜体数字，有待追问的加酒红小点 */}
            {zones.map((z, i) => {
              const c = coordsMap[z.id];
              const warn = z.matchedReqs.some(isPending);
              return (
                <button
                  key={z.id}
                  type="button"
                  aria-label={z.label}
                  onClick={() => focusZone(z.id)}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  className={`absolute -ml-[15px] -mt-[15px] flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#FFFDF8]/95 bg-ink/35 font-num text-[16px] italic text-[#FFFDF8] backdrop-blur-[2px] transition-[opacity,background-color,transform] duration-300 hover:scale-110 hover:bg-cinnabar ${
                    activeZone ? "pointer-events-none opacity-0" : "opacity-100"
                  }`}
                >
                  {i + 1}
                  {warn && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full bg-cinnabar shadow-[0_0_0_1.5px_#FFFDF8]"
                    />
                  )}
                </button>
              );
            })}

            {lensStyle && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute rounded-full border border-[#FFFDF8]/90 bg-no-repeat shadow-[0_12px_30px_-10px_rgb(0_0_0/0.45)]"
                style={lensStyle}
              />
            )}
          </div>

          {activeZone ? (
            <button
              type="button"
              onClick={() => focusZone(null)}
              className="absolute bottom-6 left-4 min-h-[36px] text-[13px] text-ink-light transition-colors hover:text-ink sm:left-8 lg:left-12"
            >
              ← 返回全身
            </button>
          ) : (
            <span className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[12px] tracking-[2px] text-ink-light sm:block">
              悬停查看面料 · 点数字看部位
            </span>
          )}
        </div>

        {/* 说明页 */}
        <aside className="flex min-h-0 flex-col border-t border-paper-border lg:border-l lg:border-t-0">
          <div className="flex-1 overflow-y-auto px-6 pb-8 pt-10 sm:px-12 lg:pt-[52px]">
            {activeMeta ? (
              <div key={activeMeta.id} className="animate-fade-in">
                <div className="font-num text-[15px] tracking-[2px] text-ink-light">
                  Nº {activeMeta.code} / 04
                </div>
                <h2 className="m-0 mt-2.5 font-serif text-[32px] font-semibold tracking-[3px] text-ink">
                  {activeMeta.label}
                </h2>
                <div className="mt-2 text-[14px] tracking-[1px] text-ink-light">
                  {activeMeta.specTitle}
                </div>

                <section className="mt-10">
                  <h3 className="m-0 border-b border-paper-border pb-3 text-[12px] font-normal tracking-[2px] text-ink-light">
                    客户原话
                  </h3>
                  {activeMeta.matchedReqs.length > 0 ? (
                    activeMeta.matchedReqs.map((r) => (
                      <div key={r.id} className="border-b border-paper-border py-4">
                        <p className="m-0 font-serif text-[20px] leading-[1.6] text-ink">
                          “{r.rawPhrase}”
                        </p>
                        <span className="mt-1.5 flex gap-3.5 text-[12px] text-ink-light">
                          <span>需求 Nº {String(r.index).padStart(2, "0")}</span>
                          {isPending(r) && <span className="text-cinnabar">{r.status}</span>}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="m-0 border-b border-paper-border py-4 text-[14px] text-ink-light">
                      这一部位没有对应的客户原话，按方向默认做法处理。
                    </p>
                  )}
                </section>

                <section className="mt-10">
                  <h3 className="m-0 border-b border-paper-border pb-3 text-[12px] font-normal tracking-[2px] text-ink-light">
                    做法
                  </h3>
                  <p className="m-0 mt-4 text-[15px] leading-[1.9] text-ink-body">
                    {activeMeta.specValue}
                  </p>
                  {activeMeta.assetId && (
                    <div className="mt-3.5 text-[11px] tracking-[1.5px] text-ink-light">
                      {activeMeta.assetId}
                      {onInspectAsset && (
                        <button
                          type="button"
                          onClick={() => onInspectAsset(activeMeta.assetId!)}
                          className="ml-3 text-[12px] tracking-normal transition-colors hover:text-ink"
                        >
                          查看资产 →
                        </button>
                      )}
                    </div>
                  )}
                </section>

                <section className="mt-10">
                  <h3 className="m-0 border-b border-paper-border pb-3 text-[12px] font-normal tracking-[2px] text-ink-light">
                    人工核准要点
                  </h3>
                  <p className="m-0 mt-4 text-[13px] leading-[1.85] text-ink-muted">
                    {activeMeta.engineeringNote}
                  </p>
                </section>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="text-[13px] tracking-[2px] text-ink-light">四处细节</div>
                <h2 className="m-0 mt-2.5 font-serif text-[28px] font-semibold tracking-[2px] text-ink">
                  细节与需求对照
                </h2>
                <div className="mt-2 text-[13px] text-ink-light">
                  点击画面编号查看对应做法与依据
                </div>
                <ul className="m-0 mt-7 list-none p-0">
                  {zones.map((z, i) => {
                    const warn = z.matchedReqs.some(isPending);
                    return (
                      <li key={z.id}>
                        <button
                          type="button"
                          onClick={() => focusZone(z.id)}
                          className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-paper-border py-[18px] text-left transition-colors duration-300 hover:text-cinnabar ${
                            i === 0 ? "border-t" : ""
                          }`}
                        >
                          <span className="font-num text-[20px] italic text-ink-light">{i + 1}</span>
                          <span className="font-serif text-[18px]">{z.label}</span>
                          <span className={`text-[12px] ${warn ? "text-cinnabar" : "text-ink-light"}`}>
                            {z.matchedReqs.length} 条需求{warn ? " · 待追问" : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* 部位切换 */}
          <div className="flex shrink-0 items-center justify-between border-t border-paper-border px-6 py-[18px] text-[13px] text-ink-light sm:px-12">
            <div className="flex gap-[22px]">
              {zones.map((z, i) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => focusZone(z.id)}
                  className={`border-b py-1 transition-colors duration-300 ${
                    activeZone === z.id
                      ? "border-ink text-ink"
                      : "border-transparent hover:text-ink"
                  }`}
                >
                  {"一二三四"[i]} {z.shortLabel}
                </button>
              ))}
            </div>
            <div className="flex gap-[18px] text-[16px]">
              <button
                type="button"
                aria-label="上一个部位"
                onClick={() => {
                  setAutoTour(false);
                  step(-1);
                }}
                className="transition-colors hover:text-ink"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="下一个部位"
                onClick={() => {
                  setAutoTour(false);
                  step(1);
                }}
                className="transition-colors hover:text-ink"
              >
                →
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
