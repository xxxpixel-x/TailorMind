"use client";

import React, { useState } from "react";
import {
  Compass,
  Edit3,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardCheck,
  HeartHandshake,
} from "lucide-react";
import {
  EightFieldTranslation,
  EmotionalAestheticReport,
  RequirementItem,
  SixDimensionBreakdown,
  VerificationCheckResult,
} from "@/lib/types";

interface Props {
  requirements: RequirementItem[];
  verification: VerificationCheckResult;
  sixDimensions: SixDimensionBreakdown;
  eightFields: EightFieldTranslation;
  emotionalReport: EmotionalAestheticReport;
  onUpdateEightFields: (next: EightFieldTranslation) => void;
}

const EIGHT_FIELD_LABELS: { key: keyof EightFieldTranslation; label: string }[] = [
  { key: "category", label: "【品类】" },
  { key: "structure", label: "【版型结构】" },
  { key: "collar", label: "【领型】" },
  { key: "fabric", label: "【面料】" },
  { key: "color", label: "【色彩】" },
  { key: "patternCraft", label: "【装饰纹样】" },
  { key: "lengthRatio", label: "【长度比例】" },
  { key: "easeAllowance", label: "【松弛余量】" },
];

export default function Tab1Deconstruct({
  requirements,
  verification,
  sixDimensions,
  eightFields,
  emotionalReport,
  onUpdateEightFields,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftFields, setDraftFields] = useState<EightFieldTranslation>(eightFields);

  const dims = [
    sixDimensions.styleTone,
    sixDimensions.silhouette,
    sixDimensions.fabricTexture,
    sixDimensions.craftDetail,
    sixDimensions.colorSystem,
    sixDimensions.sceneFitness,
  ];

  const cx = 130;
  const cy = 125;
  const maxR = 84;
  const angles = [-90, -30, 30, 90, 150, 210].map((deg) => (deg * Math.PI) / 180);

  const pointAt = (idx: number, ratio: number) => {
    const x = cx + maxR * ratio * Math.cos(angles[idx]);
    const y = cy + maxR * ratio * Math.sin(angles[idx]);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const dataPolygon = dims
    .map((d, i) => pointAt(i, Math.min(1, Math.max(0.2, d.completeness / 100))))
    .join(" ");

  const startEdit = () => {
    setDraftFields(eightFields);
    setIsEditing(true);
  };

  const saveEdit = () => {
    onUpdateEightFields(draftFields);
    setIsEditing(false);
  };

  const renderStatusBadge = (status: RequirementItem["status"]) => {
    if (status === "已落实") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-jade-light px-2 py-0.5 text-[10px] font-bold text-jade whitespace-nowrap">
          <CheckCircle2 className="h-3 w-3" />
          已落实
        </span>
      );
    }
    if (status === "推断") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          推断
        </span>
      );
    }
    if (status === "待追问") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-cinnabar-light border border-cinnabar/40 px-2 py-0.5 text-[10px] font-bold text-cinnabar whitespace-nowrap">
          待追问
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-cinnabar px-2 py-0.5 text-[10px] font-bold text-on-accent whitespace-nowrap">
        <XCircle className="h-3 w-3" />
        未处理
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. 核心：客户需求逐条落实对照表 + 确定性核验状态栏 */}
      <section className="rounded-xl border border-brocade/45 bg-paper p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-brocade-dark" />
            <h3 className="font-serif text-base font-bold text-ink">
              一、客户需求逐条落实对照表（说了什么 → 怎么做 → 为什么）
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-md bg-jade-light px-2 py-0.5 font-semibold text-jade">
              <CheckCircle2 className="h-3 w-3" />
              已落实 {verification.passedCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 font-semibold text-amber-800">
              推断 {verification.inferredCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-cinnabar-light border border-cinnabar/30 px-2 py-0.5 font-semibold text-cinnabar">
              <AlertTriangle className="h-3 w-3" />
              待追问 {verification.pendingAskCount}
            </span>
            {verification.failedCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-cinnabar px-2 py-0.5 font-semibold text-on-accent">
                <XCircle className="h-3 w-3" />
                未处理/告警 {verification.failedCount}
              </span>
            )}
          </div>
        </div>

        {/* 如有核验未通过项，顶部直接标红提醒 */}
        {verification.failedCount > 0 && (
          <div className="mb-3 rounded-lg border border-cinnabar bg-cinnabar-light p-3 text-xs text-cinnabar">
            <div className="font-bold">对照检查器发现硬要求未完全落实，请顾问复核修正：</div>
            {verification.checks
              .filter((c) => c.severity === "fail")
              .map((c) => (
                <div key={c.requirementId} className="mt-1">
                  • [{c.requirementId}] {c.label}：{c.detail}
                </div>
              ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-paper-border bg-paper-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-paper-border bg-paper-warm text-ink">
              <tr>
                <th className="px-3 py-2.5 w-32">客户原话 / 类型</th>
                <th className="px-3 py-2.5 w-24">要求级别</th>
                <th className="px-3 py-2.5">对应具体做法（裁剪 / 面料 / 配色 / 工艺）</th>
                <th className="px-3 py-2.5 w-52">规则依据与来源</th>
                <th className="px-3 py-2.5 w-28">核验状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {requirements.map((req) => (
                <tr key={req.id} className="hover:bg-paper/50">
                  <td className="px-3 py-2.5 align-top">
                    <div className="font-semibold text-ink">{req.rawPhrase}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="rounded bg-paper-warm px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {req.category}
                      </span>
                      <span className="font-mono text-[10px] text-ink-light">P{req.priority}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                        req.isHardRequirement
                          ? "bg-ink text-paper"
                          : "bg-paper-warm text-ink-muted"
                      }`}
                    >
                      {req.isHardRequirement ? "客户明说(硬)" : "推断/待定"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top leading-relaxed text-ink">
                    {req.solutionAction}
                  </td>
                  <td className="px-3 py-2.5 align-top text-[11px] leading-relaxed text-ink-muted">
                    {req.ruleOrAssetId && (
                      <span className="mr-1 rounded border border-brocade/40 bg-brocade-light px-1 py-0.5 font-mono text-[10px] font-bold text-brocade-dark">
                        {req.ruleOrAssetId}
                      </span>
                    )}
                    {req.rationale}
                  </td>
                  <td className="px-3 py-2.5 align-top">{renderStatusBadge(req.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11px] text-ink-muted">
          优先级规则：<strong>P1 身体舒适与功能</strong> &gt; <strong>P2 客户明说要求（色彩/款式/禁忌）</strong> &gt; <strong>P3 推断审美</strong>；超出上服 6 个官方案例范围的体型规则一律标注「待制版师核准」。
        </p>
      </section>

      {/* 2. 上服集团标准八项设计语言转化表（支持顾问微调） */}
      <section className="rounded-xl border border-paper-border bg-paper p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-ink">
              二、上服标准「八项设计语言转化表」（工作流第 1 步交付单）
            </h3>
            <p className="text-xs text-ink-muted">
              客户未提颜色时如实保留「无特殊需求」；顾问可直接微调并同步写入台账与核验器
            </p>
          </div>
          {!isEditing ? (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-paper-border bg-paper-card px-3 py-1.5 text-xs font-medium text-ink hover:border-brocade no-print"
            >
              <Edit3 className="h-3.5 w-3.5 text-brocade-dark" />
              顾问微调
            </button>
          ) : (
            <button
              type="button"
              onClick={saveEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-jade px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-jade/90 no-print"
            >
              <Check className="h-3.5 w-3.5" />
              保存并重验
            </button>
          )}
        </div>

        <div className="divide-y divide-paper-border rounded-xl border border-paper-border bg-paper-card overflow-hidden">
          {EIGHT_FIELD_LABELS.map(({ key, label }) => (
            <div
              key={key}
              className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-12 sm:items-center sm:gap-3"
            >
              <div className="font-serif text-xs font-bold text-brocade-dark sm:col-span-3">
                {label}
              </div>
              <div className="sm:col-span-9">
                {isEditing ? (
                  <input
                    type="text"
                    value={draftFields[key]}
                    onChange={(e) =>
                      setDraftFields({ ...draftFields, [key]: e.target.value })
                    }
                    className="w-full rounded border border-brocade bg-paper px-2.5 py-1 text-xs text-ink focus:outline-none"
                  />
                ) : (
                  <span className="text-xs leading-relaxed text-ink">
                    {eightFields[key]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 六大维度信息明确度与审美禁忌报告 */}
      <section className="rounded-xl border border-paper-border bg-paper p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-brocade-dark" />
            <h3 className="font-serif text-base font-bold text-ink">
              三、六大维度信息明确度与设计禁忌报告
            </h3>
          </div>
          <span className="text-xs text-ink-muted">
            分值代表当前已收集到的信息明确度（低分项表示需顾问继续追问）
          </span>
        </div>

        <div className="grid items-center gap-5 lg:grid-cols-12">
          <div className="flex justify-center lg:col-span-5">
            <svg viewBox="0 0 260 250" className="h-56 w-64">
              {[0.33, 0.66, 1].map((level) => (
                <polygon
                  key={level}
                  points={angles.map((_, i) => pointAt(i, level)).join(" ")}
                  fill="none"
                  stroke="#E5DEC9"
                  strokeWidth="1"
                />
              ))}
              {angles.map((_, i) => (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={cx + maxR * Math.cos(angles[i])}
                  y2={cy + maxR * Math.sin(angles[i])}
                  stroke="#E5DEC9"
                  strokeWidth="1"
                />
              ))}
              <polygon
                points={dataPolygon}
                fill="rgba(176, 138, 78, 0.2)"
                stroke="#8A6832"
                strokeWidth="2"
              />
              {dims.map((d, i) => {
                const ratio = Math.min(1, Math.max(0.2, d.completeness / 100));
                const px = cx + maxR * ratio * Math.cos(angles[i]);
                const py = cy + maxR * ratio * Math.sin(angles[i]);
                const lx = cx + (maxR + 24) * Math.cos(angles[i]);
                const ly = cy + (maxR + 18) * Math.sin(angles[i]);
                return (
                  <g key={d.dimensionName}>
                    <circle cx={px} cy={py} r="3.5" fill="#8A6832" />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-ink text-[10px] font-semibold"
                    >
                      {d.dimensionName}({d.completeness}%)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:col-span-7">
            {dims.map((d) => (
              <div
                key={d.dimensionName}
                className="rounded-lg border border-paper-border bg-paper-card p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xs font-bold text-ink">
                    {d.dimensionName}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      d.completeness < 50
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-brocade-light text-brocade-dark"
                    }`}
                  >
                    明确度 {d.completeness}%
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                  {d.analysis}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-paper-border bg-paper-card p-3.5 text-xs">
            <div className="mb-1.5 flex items-center gap-1.5 font-bold text-ink">
              <HeartHandshake className="h-3.5 w-3.5 text-brocade-dark" />
              <span>客户画像与情绪审美</span>
            </div>
            <div className="text-ink-muted">{emotionalReport.personaSummary}</div>
            <ul className="mt-1.5 space-y-1 text-ink-muted">
              {emotionalReport.implicitEmotions.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-cinnabar/30 bg-cinnabar-light/50 p-3.5 text-xs">
            <div className="mb-1.5 flex items-center gap-1 font-bold text-cinnabar">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>明确禁忌与避雷清单</span>
            </div>
            <ul className="space-y-1 text-ink">
              {emotionalReport.tabooRedlines.length > 0 ? (
                emotionalReport.tabooRedlines.map((item, i) => <li key={i}>{item}</li>)
              ) : (
                <li>• 避免领高过紧或面料贴身软塌</li>
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
