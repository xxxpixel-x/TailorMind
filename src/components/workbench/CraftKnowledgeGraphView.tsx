"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  GitBranch,
  Layers,
  ShieldAlert,
  SlidersHorizontal,
  Wand2,
} from "lucide-react";
import {
  CRAFT_KG_EDGES,
  CRAFT_KG_NODES,
  KG_NODE_BY_ID,
  KG_NODE_TYPE_META,
  type KGEdge,
  type KGNode,
  type KGNodeType,
  type KGRelationType,
} from "@/data/craft-knowledge-graph";
import {
  getConnectedEdges,
  testCraftCombination,
  validateDesignAgainstKG,
} from "@/lib/craft-kg-validator";
import { currentDirection } from "@/lib/workbench-orders";
import type { LiangYiPlanPackage } from "@/lib/types";

interface Props {
  pkg: LiangYiPlanPackage;
  onInspectAsset: (id: string) => void;
}

type StudioMode = "explore" | "sandbox";
type EdgeFilter = "all" | KGRelationType | "active_order";

const LAYERS: { type: KGNodeType; num: string; title: string; short: string }[] = [
  { type: "body_context", num: "01", title: "体征 / 场合", short: "约束" },
  { type: "pattern", num: "02", title: "版型母版", short: "版型" },
  { type: "collar", num: "03", title: "领型制式", short: "领型" },
  { type: "fabric", num: "04", title: "海派面料", short: "面料" },
  { type: "craft", num: "05", title: "盘扣工艺", short: "工艺" },
  { type: "shaping", num: "06", title: "归拔整烫", short: "归拔" },
];

const LAYER_INDEX = new Map<KGNodeType, number>(LAYERS.map((l, i) => [l.type, i]));

const RELATION_META: Record<KGRelationType, { label: string; short: string; tone: "w" | "j" | "" }> = {
  CONFLICTS_WITH: { label: "不可制造禁忌", short: "禁忌 ✕", tone: "w" },
  REQUIRES_SHAPING: { label: "必配归拔整烫", short: "归拔", tone: "j" },
  COMPATIBLE_WITH: { label: "工艺适配推荐", short: "适配", tone: "" },
};

const PRESET_CONFLICT_TESTS = [
  {
    id: "qipao-high",
    label: "立领旗袍 × 高立领",
    expectBlock: true,
    contextId: "CTX-QIPAO-STAND",
    collarId: "COL-HIGH-STAND",
    fabricId: "FAB-SF-01",
    craftId: "CRF-02",
  },
  {
    id: "knit-frog",
    label: "针织 × 铜丝盘扣",
    expectBlock: true,
    contextId: "CTX-BELLY",
    collarId: "COL-LOW-STAND",
    fabricId: "FAB-SF-06",
    craftId: "CRF-02",
  },
  {
    id: "wash-xys",
    label: "可机洗 × 香云纱",
    expectBlock: true,
    contextId: "CTX-WASHABLE",
    collarId: "COL-LOW-STAND",
    fabricId: "FAB-SF-02",
    craftId: "CRF-03",
  },
  {
    id: "satin-wall",
    label: "亮缎 × 阶梯拼接",
    expectBlock: true,
    contextId: "CTX-STAGE-ARM",
    collarId: "COL-LOW-STAND",
    fabricId: "FAB-SF-05",
    craftId: "CRF-04",
  },
  {
    id: "hunch-songjin",
    label: "驼背 × 宋锦青果领",
    expectBlock: false,
    contextId: "CTX-HUNCHBACK",
    collarId: "COL-SHAWL",
    fabricId: "FAB-SF-01",
    craftId: "CRF-05",
  },
];

interface EdgeGeometry {
  edge: KGEdge;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

export default function CraftKnowledgeGraphView({ pkg, onInspectAsset }: Props) {
  const [mode, setMode] = useState<StudioMode>("explore");
  const [filter, setFilter] = useState<EdgeFilter>("all");
  const [selectedId, setSelectedId] = useState<string>("CTX-QIPAO-STAND");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 可行性校验台状态
  const [testCtx, setTestCtx] = useState<string>("CTX-QIPAO-STAND");
  const [testCollar, setTestCollar] = useState<string>("COL-HIGH-STAND");
  const [testFabric, setTestFabric] = useState<string>("FAB-SF-01");
  const [testCraft, setTestCraft] = useState<string>("CRF-02");

  // 节点按层级分组
  const nodesByLayer = useMemo(() => {
    const map = new Map<KGNodeType, KGNode[]>();
    for (const layer of LAYERS) {
      map.set(
        layer.type,
        CRAFT_KG_NODES.filter((n) => n.type === layer.type)
      );
    }
    return map;
  }, []);

  // 当前订单激活节点
  const activeOrderValidation = useMemo(() => {
    const dir = currentDirection(pkg);
    return (
      pkg.kgValidation ||
      validateDesignAgainstKG(
        {
          customerText: pkg.customerInput,
          collarText: pkg.eightFields.collar,
          patternId: dir?.patternId,
          fabricId: dir?.fabricId,
          craftId: dir?.craftId,
          mode: pkg.mode,
          requirements: pkg.requirements,
        },
        pkg.proposal.directions
      )
    );
  }, [pkg]);

  const orderNodeSet = useMemo(
    () => new Set(activeOrderValidation.activeNodeIds),
    [activeOrderValidation]
  );

  // 实时校验台结果
  const sandboxResult = useMemo(
    () =>
      testCraftCombination({
        contextIds: testCtx ? [testCtx] : [],
        collarId: testCollar,
        fabricId: testFabric,
        craftId: testCraft,
      }),
    [testCtx, testCollar, testFabric, testCraft]
  );

  const sandboxActiveSet = useMemo(
    () => new Set(sandboxResult.activeNodeIds),
    [sandboxResult.activeNodeIds]
  );

  // 当前焦点节点（悬停优先于选中）
  const focusId = hoveredId ?? selectedId;
  const selectedNode = KG_NODE_BY_ID.get(selectedId) || CRAFT_KG_NODES[0];
  const selectedConnected = useMemo(() => getConnectedEdges(selectedNode.id), [selectedNode.id]);
  const focusConnected = useMemo(() => getConnectedEdges(focusId), [focusId]);

  const focusNeighborSet = useMemo(() => {
    const set = new Set<string>([focusId]);
    for (const item of focusConnected.outgoing) set.add(item.target.id);
    for (const item of focusConnected.incoming) set.add(item.source.id);
    return set;
  }, [focusId, focusConnected]);

  // 焦点节点到邻居的关系类型映射，用于在邻居节点角落显示清晰标签（不遮挡中间卡片）
  const focusRelationMap = useMemo(() => {
    const map = new Map<string, KGRelationType>();
    for (const item of focusConnected.outgoing) map.set(item.target.id, item.edge.relation);
    for (const item of focusConnected.incoming) {
      if (!map.has(item.source.id) || item.edge.relation === "CONFLICTS_WITH") {
        map.set(item.source.id, item.edge.relation);
      }
    }
    return map;
  }, [focusConnected]);

  // 当前图谱上应展示的边
  const visibleEdges = useMemo(() => {
    if (mode === "sandbox") {
      return CRAFT_KG_EDGES.filter((e) => {
        if (e.relation === "REQUIRES_SHAPING") {
          return sandboxActiveSet.has(e.from) && sandboxActiveSet.has(e.to);
        }
        return sandboxActiveSet.has(e.from) && sandboxActiveSet.has(e.to);
      });
    }
    return CRAFT_KG_EDGES.filter((e) => {
      if (filter === "active_order") {
        return orderNodeSet.has(e.from) && orderNodeSet.has(e.to);
      }
      if (filter !== "all" && e.relation !== filter) return false;
      return true;
    });
  }, [mode, filter, orderNodeSet, sandboxActiveSet]);

  // DOM 端口精确连线测量
  const boardRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [edgeGeoms, setEdgeGeoms] = useState<EdgeGeometry[]>([]);

  const recomputeEdges = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const bRect = board.getBoundingClientRect();
    const width = board.scrollWidth;
    const height = board.scrollHeight;
    setCanvasSize({ width, height });

    const geoms: EdgeGeometry[] = [];
    for (const edge of visibleEdges) {
      const elA = nodeRefs.current[edge.from];
      const elB = nodeRefs.current[edge.to];
      if (!elA || !elB) continue;

      const rA = elA.getBoundingClientRect();
      const rB = elB.getBoundingClientRect();
      const nA = KG_NODE_BY_ID.get(edge.from);
      const nB = KG_NODE_BY_ID.get(edge.to);
      const colA = nA ? (LAYER_INDEX.get(nA.type) ?? 0) : 0;
      const colB = nB ? (LAYER_INDEX.get(nB.type) ?? 0) : 0;

      const leftToRight = colA <= colB;
      const x1 = (leftToRight ? rA.right : rA.left) - bRect.left + board.scrollLeft;
      const y1 = rA.top + rA.height / 2 - bRect.top + board.scrollTop;
      const x2 = (leftToRight ? rB.left : rB.right) - bRect.left + board.scrollLeft;
      const y2 = rB.top + rB.height / 2 - bRect.top + board.scrollTop;

      const dx = Math.abs(x2 - x1);
      const span = Math.abs(colB - colA);

      // 跨多列连线添加轻微拱弧偏移，避免直线横切中间节点
      const arch =
        span > 1
          ? (y1 <= y2 ? -1 : 1) * Math.min(46, 16 + span * 8)
          : Math.abs(y2 - y1) < 8
          ? -10
          : 0;

      const cOffset = Math.max(36, dx * 0.42);
      const cx1 = leftToRight ? x1 + cOffset : x1 - cOffset;
      const cx2 = leftToRight ? x2 - cOffset : x2 + cOffset;
      const cy1 = y1 + arch;
      const cy2 = y2 + arch;

      const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      // 三次贝塞尔曲线 t=0.5 中点坐标
      const midX = 0.125 * x1 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * x2;
      const midY = 0.125 * y1 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * y2;

      geoms.push({ edge, d, x1, y1, x2, y2, midX, midY });
    }
    setEdgeGeoms(geoms);
  }, [visibleEdges]);

  useLayoutEffect(() => {
    recomputeEdges();
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputeEdges());
    ro.observe(board);
    return () => ro.disconnect();
  }, [recomputeEdges]);

  // 将某节点带入校验台测试
  function sendNodeToSandbox(node: KGNode) {
    if (node.type === "body_context") setTestCtx(node.id);
    else if (node.type === "collar") setTestCollar(node.id);
    else if (node.type === "fabric") setTestFabric(node.id);
    else if (node.type === "craft") setTestCraft(node.id);
    setMode("sandbox");
  }

  // 在校验台中一键采用图谱推荐替代工艺
  function applyAlternative(alternativeNodeId?: string) {
    if (!alternativeNodeId) return;
    const alt = KG_NODE_BY_ID.get(alternativeNodeId);
    if (!alt) return;
    if (alt.type === "collar") setTestCollar(alt.id);
    else if (alt.type === "fabric") setTestFabric(alt.id);
    else if (alt.type === "craft") setTestCraft(alt.id);
    else if (alt.type === "body_context") setTestCtx(alt.id);
  }

  const conflictCount = CRAFT_KG_EDGES.filter((e) => e.relation === "CONFLICTS_WITH").length;
  const shapingCount = CRAFT_KG_NODES.filter((n) => n.type === "shaping").length;

  // 关联分组（供右侧档案卡使用）
  const groupedRelations = useMemo(() => {
    const all = [
      ...selectedConnected.outgoing.map(({ edge, target }) => ({
        id: edge.id,
        edge,
        peer: target,
        direction: "out" as const,
      })),
      ...selectedConnected.incoming.map(({ edge, source }) => ({
        id: edge.id + "-in",
        edge,
        peer: source,
        direction: "in" as const,
      })),
    ];
    return {
      conflicts: all.filter((x) => x.edge.relation === "CONFLICTS_WITH"),
      shaping: all.filter((x) => x.edge.relation === "REQUIRES_SHAPING"),
      compat: all.filter((x) => x.edge.relation === "COMPATIBLE_WITH"),
    };
  }, [selectedConnected]);

  return (
    <div className="kg2-studio">
      {/* 顶部极简指挥条：模式切换 + 静默指标 */}
      <div className="kg2-topbar">
        <div className="seg kg2-mode-seg" role="tablist" aria-label="工艺图谱工作模式">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "explore"}
            className={mode === "explore" ? "on" : ""}
            onClick={() => setMode("explore")}
          >
            <GitBranch size={14} />
            工艺关系图谱
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sandbox"}
            className={mode === "sandbox" ? "on" : ""}
            onClick={() => setMode("sandbox")}
          >
            <SlidersHorizontal size={14} />
            可行性校验台
            {!sandboxResult.passed && <span className="kg2-tab-dot" aria-hidden="true" />}
          </button>
        </div>

        <div className="kg2-metrics" aria-label="图谱规模概览">
          <span>
            <b>{CRAFT_KG_NODES.length}</b> 节点
          </span>
          <i aria-hidden="true" />
          <span className="w">
            <b>{conflictCount}</b> 禁忌红线
          </span>
          <i aria-hidden="true" />
          <span className="j">
            <b>{shapingCount}</b> 归拔定型
          </span>
          <i aria-hidden="true" />
          <span>
            当前订单激活 <b>{activeOrderValidation.checkedNodesCount}</b>
          </span>
        </div>
      </div>

      {/* 主体双栏工作台：左制图画布 + 右实时档案/校验台 */}
      <div className="kg2-workspace">
        {/* 左侧：海派版房点阵制图画布 */}
        <section className="panel kg2-stage" aria-label="海派工艺关系制图画布">
          <div className="kg2-stage-head">
            <div className="kg2-stage-title">
              <h3>
                {mode === "explore"
                  ? "海派裁剪工艺图谱"
                  : "实时工艺组合链路"}
              </h3>
            </div>

            {mode === "explore" ? (
              <div className="kg2-filter-bar" role="group" aria-label="关系筛选">
                {(
                  [
                    { id: "all", label: "全部" },
                    { id: "CONFLICTS_WITH", label: "禁忌拦截" },
                    { id: "REQUIRES_SHAPING", label: "归拔绑定" },
                    { id: "COMPATIBLE_WITH", label: "适配推荐" },
                    { id: "active_order", label: "当前订单" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`kg2-fbtn ${filter === item.id ? "on" : ""}`}
                    aria-pressed={filter === item.id}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className={`kg2-live-pill ${sandboxResult.passed ? "pass" : "blocked"}`}>
                {sandboxResult.passed ? (
                  <>
                    <CheckCircle2 size={14} />
                    当前组合可落地打样
                  </>
                ) : (
                  <>
                    <ShieldAlert size={14} />
                    拦截 {sandboxResult.blocked.length} 处冲突
                  </>
                )}
              </div>
            )}
          </div>

          {/* 6 列制图板 + 端口精确 SVG 贝塞尔连线层 */}
          <div className="kg2-board-scroll">
            <div className="kg2-board" ref={boardRef}>
              {/* 底层 + 顶层精确 SVG 连线 */}
              {canvasSize.width > 0 && (
                <svg
                  className="kg2-svg-layer"
                  width={canvasSize.width}
                  height={canvasSize.height}
                  viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
                  aria-hidden="true"
                >
                  {/* 1. 背景静默连线 */}
                  {edgeGeoms.map((g) => {
                    const isActive =
                      mode === "sandbox"
                        ? true
                        : g.edge.from === focusId || g.edge.to === focusId;
                    if (isActive) return null;
                    return (
                      <path
                        key={g.edge.id}
                        d={g.d}
                        className={`kg2-curve quiet ${
                          g.edge.relation === "CONFLICTS_WITH"
                            ? "conflict"
                            : g.edge.relation === "REQUIRES_SHAPING"
                            ? "shaping"
                            : "compat"
                        }`}
                      />
                    );
                  })}

                  {/* 2. 聚焦高亮连线 + 端点圆点 */}
                  {edgeGeoms.map((g) => {
                    const isActive =
                      mode === "sandbox"
                        ? true
                        : g.edge.from === focusId || g.edge.to === focusId;
                    if (!isActive) return null;
                    const kind =
                      g.edge.relation === "CONFLICTS_WITH"
                        ? "conflict"
                        : g.edge.relation === "REQUIRES_SHAPING"
                        ? "shaping"
                        : "compat";

                    return (
                      <g key={g.edge.id + "-hi"} className={`kg2-curve-group ${kind}`}>
                        <path d={g.d} className={`kg2-curve hi ${kind}`} />
                        <circle cx={g.x1} cy={g.y1} r={3.5} className={`kg2-port ${kind}`} />
                        <circle cx={g.x2} cy={g.y2} r={3.5} className={`kg2-port ${kind}`} />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* 6 列节点画布 */}
              <div className="kg2-columns">
                {LAYERS.map((layer) => {
                  const nodes = nodesByLayer.get(layer.type) ?? [];
                  return (
                    <div className="kg2-col" key={layer.type}>
                      <div className="kg2-col-head">
                        <span className="kg2-col-num">{layer.num}</span>
                        <span className="kg2-col-name">{layer.title}</span>
                      </div>
                      <div className="kg2-col-list">
                        {nodes.map((node) => {
                          const inOrder = orderNodeSet.has(node.id);
                          const isSelected = mode === "explore" && node.id === selectedId;
                          const isHovered = mode === "explore" && node.id === hoveredId;
                          const isNeighbor = mode === "explore" && focusNeighborSet.has(node.id);
                          const inSandbox = mode === "sandbox" && sandboxActiveSet.has(node.id);
                          const isBlockedNode =
                            mode === "sandbox" &&
                            sandboxResult.blocked.some(
                              (c) => c.fromId === node.id || c.toId === node.id
                            );
                          const isDimmed =
                            mode === "sandbox"
                              ? !inSandbox
                              : !isNeighbor &&
                                (filter === "active_order" ? !inOrder : true);

                          const relToFocus =
                            mode === "explore" && node.id !== focusId
                              ? focusRelationMap.get(node.id)
                              : undefined;
                          const sandboxShaping =
                            mode === "sandbox" &&
                            sandboxResult.shapingNodes.some((s) => s.id === node.id);

                          return (
                            <button
                              key={node.id}
                              type="button"
                              ref={(el) => {
                                nodeRefs.current[node.id] = el;
                              }}
                              className={[
                                "kg2-node",
                                `type-${node.type}`,
                                isSelected ? "is-selected" : "",
                                isHovered ? "is-hovered" : "",
                                isNeighbor && !isSelected ? "is-neighbor" : "",
                                relToFocus === "CONFLICTS_WITH" ? "rel-conflict" : "",
                                relToFocus === "REQUIRES_SHAPING" ? "rel-shaping" : "",
                                inOrder ? "in-order" : "",
                                inSandbox ? "in-sandbox" : "",
                                isBlockedNode ? "is-blocked" : "",
                                isDimmed ? "is-dim" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onMouseEnter={() => mode === "explore" && setHoveredId(node.id)}
                              onMouseLeave={() => mode === "explore" && setHoveredId(null)}
                              onClick={() => {
                                setSelectedId(node.id);
                                if (mode === "sandbox") {
                                  if (node.type === "body_context") setTestCtx(node.id);
                                  else if (node.type === "collar") setTestCollar(node.id);
                                  else if (node.type === "fabric") setTestFabric(node.id);
                                  else if (node.type === "craft") setTestCraft(node.id);
                                }
                              }}
                            >
                              <span className="kg2-node-top">
                                <span className="kg2-node-code">{node.id}</span>
                                {relToFocus ? (
                                  <span className={`kg2-node-rel ${RELATION_META[relToFocus].tone}`}>
                                    {RELATION_META[relToFocus].short}
                                  </span>
                                ) : isBlockedNode ? (
                                  <span className="kg2-node-rel w">冲突</span>
                                ) : sandboxShaping ? (
                                  <span className="kg2-node-rel j">归拔</span>
                                ) : inOrder ? (
                                  <span className="kg2-order-dot" title="当前订单已激活" />
                                ) : null}
                              </span>
                              <span className="kg2-node-label">{node.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 底部图例标尺 */}
          <footer className="kg2-legend">
            <span>
              <i className="kg2-lg-line conflict" />
              不可制造禁忌
            </span>
            <span>
              <i className="kg2-lg-line shaping" />
              必配归拔整烫
            </span>
            <span>
              <i className="kg2-lg-line compat" />
              工艺适配推荐
            </span>
            <span className="kg2-lg-right">
              <i className="kg2-order-dot" />
              当前订单已激活
            </span>
          </footer>
        </section>

        {/* 右侧：常驻联动工艺档案 / 可行性校验台 */}
        <aside className="panel kg2-rail" aria-label={mode === "explore" ? "节点工艺档案" : "可行性校验台"}>
          {mode === "explore" ? (
            <div className="kg2-dossier">
              <div className="kg2-dossier-head">
                <div className="kg2-dossier-eyebrow">
                  <span className="chip">{KG_NODE_TYPE_META[selectedNode.type].label}</span>
                  <span className="kg2-dossier-id">{selectedNode.id}</span>
                </div>
                <h4>{selectedNode.label}</h4>
                <p className="kg2-dossier-summary">{selectedNode.summary}</p>

                {selectedNode.params && selectedNode.params.length > 0 && (
                  <div className="kg2-param-list">
                    {selectedNode.params.map((p) => (
                      <span className="kg2-param" key={p}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                <div className="kg2-dossier-actions">
                  {selectedNode.assetId && (
                    <button
                      type="button"
                      className="btn-soft kg2-action-sm"
                      onClick={() => onInspectAsset(selectedNode.assetId!)}
                    >
                      <Layers size={13} />
                      资产档案 {selectedNode.assetId}
                      <ArrowUpRight size={13} />
                    </button>
                  )}
                  {selectedNode.type !== "pattern" && selectedNode.type !== "shaping" && (
                    <button
                      type="button"
                      className="ghost kg2-action-sm"
                      onClick={() => sendNodeToSandbox(selectedNode)}
                    >
                      <SlidersHorizontal size={13} />
                      带入校验台
                    </button>
                  )}
                </div>
              </div>

              <div className="kg2-dossier-body">
                {groupedRelations.conflicts.length > 0 && (
                  <div className="kg2-rel-sec">
                    <div className="kg2-rel-sec-h w">
                      <ShieldAlert size={13} />
                      不可制造禁忌（{groupedRelations.conflicts.length}）
                    </div>
                    {groupedRelations.conflicts.map(({ id, edge, peer, direction }) => (
                      <article className="kg2-rel-card w" key={id}>
                        <button
                          type="button"
                          className="kg2-rel-peer"
                          onClick={() => setSelectedId(peer.id)}
                        >
                          <span>
                            {direction === "out" ? "冲突对象" : "受限来源"} · <b>{peer.label}</b>
                          </span>
                          <ArrowRight size={13} />
                        </button>
                        <p>{edge.reason}</p>
                        {edge.alternativeHint && (
                          <div className="kg2-rel-alt">替代：{edge.alternativeHint}</div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                {groupedRelations.shaping.length > 0 && (
                  <div className="kg2-rel-sec">
                    <div className="kg2-rel-sec-h j">
                      <Flame size={13} />
                      必配归拔整烫（{groupedRelations.shaping.length}）
                    </div>
                    {groupedRelations.shaping.map(({ id, edge, peer }) => (
                      <article className="kg2-rel-card j" key={id}>
                        <button
                          type="button"
                          className="kg2-rel-peer"
                          onClick={() => setSelectedId(peer.id)}
                        >
                          <span>
                            <b>{peer.label}</b>
                          </span>
                          <ArrowRight size={13} />
                        </button>
                        <p>{edge.reason}</p>
                      </article>
                    ))}
                  </div>
                )}

                {groupedRelations.compat.length > 0 && (
                  <div className="kg2-rel-sec">
                    <div className="kg2-rel-sec-h">
                      <CheckCircle2 size={13} />
                      工艺适配推荐（{groupedRelations.compat.length}）
                    </div>
                    {groupedRelations.compat.map(({ id, edge, peer }) => (
                      <article className="kg2-rel-card" key={id}>
                        <button
                          type="button"
                          className="kg2-rel-peer"
                          onClick={() => setSelectedId(peer.id)}
                        >
                          <span>
                            <b>{peer.label}</b>
                          </span>
                          <ArrowRight size={13} />
                        </button>
                        <p>{edge.reason}</p>
                      </article>
                    ))}
                  </div>
                )}

                {groupedRelations.conflicts.length === 0 &&
                  groupedRelations.shaping.length === 0 &&
                  groupedRelations.compat.length === 0 && (
                    <p className="empty">该节点暂无直接关联约束。</p>
                  )}
              </div>
            </div>
          ) : (
            <div className="kg2-bench">
              <div className="kg2-bench-head">
                <h4>可行性校验台</h4>
                <p>组合任意体征、领型、面料与工艺，验证是否可打样</p>
              </div>

              {/* 快捷演示用例 */}
              <div className="kg2-preset-wrap">
                <span className="kg2-sub-label">典型冲突 / 通过用例</span>
                <div className="kg2-preset-chips">
                  {PRESET_CONFLICT_TESTS.map((p) => {
                    const isCurrent =
                      testCtx === p.contextId &&
                      testCollar === p.collarId &&
                      testFabric === p.fabricId &&
                      testCraft === p.craftId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`kg2-pchip ${isCurrent ? "on" : ""} ${p.expectBlock ? "warn" : "ok"}`}
                        onClick={() => {
                          setTestCtx(p.contextId);
                          setTestCollar(p.collarId);
                          setTestFabric(p.fabricId);
                          setTestCraft(p.craftId);
                        }}
                      >
                        <i aria-hidden="true" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 项工艺维度选择器 */}
              <div className="kg2-bench-form">
                <label className="kg2-select-field">
                  <span>01 体征 / 场合约束</span>
                  <select value={testCtx} onChange={(e) => setTestCtx(e.target.value)}>
                    {CRAFT_KG_NODES.filter((n) => n.type === "body_context").map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="kg2-select-field">
                  <span>03 领型制式</span>
                  <select value={testCollar} onChange={(e) => setTestCollar(e.target.value)}>
                    {CRAFT_KG_NODES.filter((n) => n.type === "collar").map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="kg2-select-field">
                  <span>04 海派面料</span>
                  <select value={testFabric} onChange={(e) => setTestFabric(e.target.value)}>
                    {CRAFT_KG_NODES.filter((n) => n.type === "fabric").map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="kg2-select-field">
                  <span>05 盘扣与工艺</span>
                  <select value={testCraft} onChange={(e) => setTestCraft(e.target.value)}>
                    {CRAFT_KG_NODES.filter((n) => n.type === "craft").map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 实时校验判定结论 */}
              <div className={`kg2-verdict ${sandboxResult.passed ? "pass" : "blocked"}`}>
                <div className="kg2-verdict-head">
                  {sandboxResult.passed ? (
                    <>
                      <CheckCircle2 size={16} />
                      <b>通过校验 · 版房可落地打样</b>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      <b>已拦截 {sandboxResult.blocked.length} 处不可制造冲突</b>
                    </>
                  )}
                </div>

                {sandboxResult.blocked.map((c) => {
                  const edge = CRAFT_KG_EDGES.find((e) => e.id === c.edgeId);
                  return (
                    <div className="kg2-v-item w" key={c.edgeId}>
                      <div className="kg2-v-path">{c.pathText}</div>
                      <p>{c.reason}</p>
                      <div className="kg2-v-alt-row">
                        <span>{c.alternativeHint}</span>
                        {edge?.alternativeNodeId && (
                          <button
                            type="button"
                            className="kg2-fix-btn"
                            onClick={() => applyAlternative(edge.alternativeNodeId)}
                          >
                            <Wand2 size={12} />
                            一键替换为推荐工艺
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {sandboxResult.cautions.map((c) => (
                  <div className="kg2-v-item caution" key={c.edgeId}>
                    <div className="kg2-v-path">工艺提示 · {c.pathText}</div>
                    <p>{c.reason}</p>
                    <div className="kg2-v-alt-row">
                      <span>{c.alternativeHint}</span>
                    </div>
                  </div>
                ))}

                {sandboxResult.shapingNodes.length > 0 && (
                  <div className="kg2-v-shaping">
                    <div className="kg2-v-sh-title">
                      <Flame size={13} />
                      自动挂载归拔工艺（{sandboxResult.shapingNodes.length}）
                    </div>
                    {sandboxResult.shapingNodes.map((s) => (
                      <div className="kg2-v-sh-card" key={s.id}>
                        <div className="kg2-v-sh-top">
                          <b>{s.label}</b>
                          <span className="kg2-node-code">{s.id}</span>
                        </div>
                        <div className="kg2-v-sh-trig">触发：{s.triggeredBy}</div>
                        <div className="kg2-param-list">
                          {s.params.map((p) => (
                            <span className="kg2-param j" key={p}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
