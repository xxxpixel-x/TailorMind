import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Send, Shirt, X } from "lucide-react";
import type { DirectionId, LiangYiPlanPackage } from "@/lib/types";
import { currentDirection, pendingAsks, undoableCommandId, type AnswerQuestion, type FlowStep } from "@/lib/workbench-orders";
import { ASSET_BY_ID } from "@/lib/asset-catalog";
import { FABRIC_KB } from "@/data/kb-fabrics";

interface Props {
  pkg: LiangYiPlanPackage;
  step: FlowStep;
  busy: boolean;
  onAnswer: AnswerQuestion;
  onInspect: (id: string) => void;
  onDismiss: () => void;
  sending?: string;
  onCommand: (text: string) => void;
  onUndo: (id: string) => void;
  onDirection: (id: DirectionId) => void;
  onRequirement: (id: string) => void;
  onOpenDirections: () => void;
  onOpenTechPack: () => void;
  onOpenVisualBoard: () => void;
}

interface QuickAction {
  label: string;
  kind: "command" | "nav";
  run: () => void;
}

export default function AgentPanel({
  pkg,
  step,
  busy,
  sending,
  onAnswer,
  onInspect,
  onDismiss,
  onCommand,
  onUndo,
  onDirection,
  onRequirement,
  onOpenDirections,
  onOpenTechPack,
  onOpenVisualBoard,
}: Props) {
  const history = pkg.commandHistory ?? [];
  const hasChat = !!(history.length || sending);
  const [expandedTrace, setExpandedTrace] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showAsks, setShowAsks] = useState(step === 1);
  const [showAllActions, setShowAllActions] = useState(false);
  const [command, setCommand] = useState("");
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowAsks(step === 1 && !hasChat);
    if (hasChat) setShowInsights(false);
  }, [step, hasChat]);

  useEffect(() => {
    if (hasChat && body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [history.length, sending, hasChat]);

  const asks = pendingAsks(pkg);
  const activeDir = currentDirection(pkg) || pkg.proposal.directions[0];
  const activeFabric = activeDir ? FABRIC_KB.find(f => f.id === activeDir.fabricId) : undefined;
  const master = pkg.proposal.handoffItems.filter(item => item.owner === "制版师");
  const traces = pkg.toolTraces;
  const totalMs = traces.length > 0 && traces.every(t => t.durationMs != null)
    ? traces.reduce((n, t) => n + (t.durationMs ?? 0), 0) : null;
  const undoId = undoableCommandId(pkg);

  // 动态提炼「体型修饰核对」要点
  const bodyBullets = useMemo(() => {
    const fromReqs = pkg.requirements
      .filter(r => r.category === "体型修饰" || r.category === "穿搭结构" || r.category === "功能动作")
      .slice(0, 2)
      .map(r => r.solutionAction.replace(/[（(][^）)]*[）)]/g, "").slice(0, 34));
    if (fromReqs.length >= 2) return fromReqs;
    const fallbacks = [
      pkg.eightFields.structure.split("；")[0],
      pkg.eightFields.easeAllowance.split("，").slice(0, 2).join("，"),
    ].filter(Boolean);
    return [...fromReqs, ...fallbacks].slice(0, 2);
  }, [pkg.requirements, pkg.eightFields.structure, pkg.eightFields.easeAllowance]);

  // 动态提炼「面料搭配建议」要点
  const fabricBullets = useMemo(() => {
    const line1 = activeFabric
      ? `${activeFabric.name}，${activeFabric.tactileFitDesc.split("，")[0]}`
      : activeDir?.fabricSuggestion || pkg.eightFields.fabric;
    const line2 = activeFabric
      ? `${activeFabric.crispnessLevel}，${activeFabric.drapeLevel.split("，")[0]}`
      : activeDir?.collarAndCraftDiff || pkg.eightFields.patternCraft;
    return [line1.slice(0, 36), line2.slice(0, 36)].filter(Boolean);
  }, [activeFabric, activeDir, pkg.eightFields.fabric, pkg.eightFields.patternCraft]);

  function send(text: string) {
    if (busy || !text.trim()) return;
    setCommand("");
    onCommand(text.trim());
  }

  // 根据当前步骤动态呈现最高频的 3 个一键快捷动作（参考图青瓷胶囊动线）
  const quickActions: QuickAction[] = useMemo(() => {
    if (step === 1) {
      return [
        { label: "直接进入 02 选方向", kind: "nav", run: onOpenDirections },
        { label: "查看版房工艺单", kind: "nav", run: onOpenTechPack },
        { label: "说明选料依据", kind: "command", run: () => send("说明选料依据") },
      ];
    }
    if (step === 3) {
      return [
        { label: "打开视觉企划板", kind: "nav", run: onOpenVisualBoard },
        { label: "查看版房工艺单", kind: "nav", run: onOpenTechPack },
        { label: "说明选料依据", kind: "command", run: () => send("说明选料依据") },
      ];
    }
    return [
      { label: "B 方向改九分袖", kind: "command", run: () => send("B方向改九分袖") },
      { label: "查看版房工艺单", kind: "nav", run: onOpenTechPack },
      { label: "换更年轻的方向", kind: "command", run: () => send("换更年轻的方向") },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, busy]);

  return (
    <aside className="agent no-print" aria-label="衣语助手面板">
      <div className="ag-h">
        <span className="ag-brand">
          <span className="ag-icon" aria-hidden="true"><Shirt size={16} /></span>
          <b>衣语助手</b>
        </span>
        <span className={`status ${sending || busy ? "live" : ""} ${asks.count ? "" : "settled"}`} role="status">
          <i />
          {sending ? "处理中…" : busy ? "解析中…" : asks.count ? `${asks.count} 项待追问` : "已核对"}
        </span>
        <button className="ico agent-close agent-close-always" title="收起衣语助手 (快捷键 \)" aria-label="收起衣语面板" onClick={onDismiss}><X /></button>
      </div>

      <div className="ag-body" ref={body}>
        {/* 方案核心核对要点（有微调对话时自动折叠为一行，留足对话空间） */}
        {hasChat && (
          <button
            type="button"
            className="thought-mini-toggle"
            aria-expanded={showInsights}
            onClick={() => setShowInsights(v => !v)}
          >
            <ChevronRight size={14} className={showInsights ? "turn" : ""} />
            <span>体型与面料核对要点</span>
            <span className="tm">{showInsights ? "收起" : "展开"}</span>
          </button>
        )}

        {showInsights && (
          <>
            {/* 卡片 1：体型修饰核对 */}
            <section className="ag-insight" aria-label="体型修饰核对">
              <div className="ag-insight-head">
                <h3>体型修饰核对</h3>
                {activeDir?.patternId && (
                  <button className="ag-insight-btn" onClick={() => onInspect(activeDir.patternId)}>
                    {activeDir.patternId}
                  </button>
                )}
              </div>
              <ul className="ag-insight-list">
                {bodyBullets.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
              {master.length > 0 && (
                <div className="ag-insight-foot">
                  <span className="chip o">交制版师核准 · {master.length} 项</span>
                </div>
              )}
            </section>

            {/* 卡片 2：面料搭配建议 */}
            <section className="ag-insight" aria-label="面料搭配建议">
              <div className="ag-insight-head">
                <h3>面料搭配建议</h3>
                {activeDir?.fabricId && (
                  <button className="ag-insight-btn" onClick={() => onInspect(activeDir.fabricId)}>
                    {activeDir.fabricId}
                  </button>
                )}
              </div>
              <ul className="ag-insight-list">
                {fabricBullets.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
              {activeDir?.craftId && (
                <div className="ag-insight-foot">
                  <button className="ag-asset-link" onClick={() => onInspect(activeDir.craftId!)}>
                    工艺依据 · {activeDir.craftId}
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* 待追问折叠条（有缺口时提示，点击展开或直接作答） */}
        {asks.count > 0 && (
          <div>
            <button
              type="button"
              className="ag-asks-toggle"
              aria-expanded={showAsks}
              onClick={() => setShowAsks(v => !v)}
            >
              <span>还有 {asks.count} 项面谈追问待确认</span>
              <ChevronRight size={15} className={showAsks ? "turn" : ""} />
            </button>
            {showAsks && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {asks.questions.map(({ question: q, req: source }) => (
                  <div className="ask" key={q.id}>
                    <div className="k">
                      <span title={q.whyItMatters}>
                        {source ? `需求 Nº ${String(source.index).padStart(2, "0")}` : "面谈追问"}
                        {q.isConflict ? " · 需求取舍" : ""}
                      </span>
                      <em>待追问</em>
                    </div>
                    <div className="t">{q.question}</div>
                    <div className="opts">
                      {q.quickAnswers?.map(a => (
                        <button key={a} className="opt" disabled={busy} onClick={() => onAnswer(pkg, q, a)}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {asks.reqs.map(r => (
                  <div className="ask" key={r.id}>
                    <div className="k"><span>需求 Nº {String(r.index).padStart(2, "0")}</span><em>待追问</em></div>
                    <div className="t">{r.rawPhrase}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 多智能体解析过程（默认折叠保持清爽，随时可展开溯源） */}
        <div className="thought">
          <button className="tt" aria-expanded={expandedTrace} onClick={() => setExpandedTrace(!expandedTrace)}>
            <ChevronRight size={14} className={expandedTrace ? "turn" : ""} />
            解析过程 · {traces.length} 步
            {totalMs != null && <span className="tm">{totalMs} ms</span>}
          </button>
          {expandedTrace && (
            <ol className="tl">
              {traces.map(t => (
                <li className="tr" key={t.stepIndex}>
                  <div className="h">
                    <span>
                      {t.agentName && <b className="agent-badge" data-role={t.agentRole || "dialogue"}>{t.agentName}</b>}
                      {t.toolLabel}
                    </span>
                    {t.durationMs != null && <em>{t.durationMs} ms</em>}
                  </div>
                  <div className="r">
                    {t.resultSummary.split(/((?:RULE|PAT|FAB|CRF|CASE|SHP)-[A-Z0-9-]+)/g).map((part, i) =>
                      t.matchedAssetIds.includes(part) && ASSET_BY_ID.has(part)
                        ? <button key={i} className="trace-id" onClick={() => onInspect(part)}>{part}</button>
                        : part
                    )}
                    <span className="trace-ids">
                      {t.matchedAssetIds.filter(id => !t.resultSummary.includes(id)).map(id =>
                        ASSET_BY_ID.has(id)
                          ? <button key={id} onClick={() => onInspect(id)}>{id}</button>
                          : <span key={id}>{id}</span>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 指令微调对话流 */}
        {hasChat && (
          <>
            <div className="ag-lb">微调记录</div>
            <div className="convo" role="log" aria-label="订单指令对话">
              {history.map(turn => (
                <Fragment key={turn.id}>
                  <div className="me">{turn.text}</div>
                  <div className="ai">
                    <p>{turn.reply}</p>
                    {!!turn.diffs?.length && (
                      <div className="diff">
                        {turn.diffs.map((diff, i) => (
                          <div className="row" key={i}>
                            {diff.label}{diff.from && <><s>{diff.from}</s><span>→</span></>}
                            <span className="to">{diff.to}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!!turn.sources?.length && (
                      <div className="srcs">
                        {turn.sources.map(s => (
                          <span className="chip" key={s.index}>
                            {s.label}<span className="n">Nº{String(s.index).padStart(2, "0")}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {turn.conflicts?.map(c => <p key={c} className="conflict-note">{c}</p>)}
                    <div className="acts2">
                      {turn.kind === "modify" && (
                        <button
                          disabled={busy || undoId !== turn.id}
                          onClick={() => onUndo(turn.id)}
                          title={turn.undone ? "这条指令已撤销" : undoId !== turn.id ? "仅可撤销最近且未经后续人工修改的指令" : "恢复指令前的方案"}
                        >
                          {turn.undone ? "已撤销" : "撤销"}
                        </button>
                      )}
                      {turn.kind === "modify" && turn.directionId && (
                        <button onClick={() => onDirection(turn.directionId!)}>
                          查看 {pkg.proposal.directions.find(d => d.id === turn.directionId)?.tag.split(" · ")[0]} 方向
                        </button>
                      )}
                      {turn.kind === "modify" && !turn.directionId && turn.requirementId && (
                        <button onClick={() => onRequirement(turn.requirementId!)}>查看需求</button>
                      )}
                      {turn.assetIds?.map(id => <button key={id} onClick={() => onInspect(id)}>查看 {id}</button>)}
                      <span className="k">{turn.kind === "modify" ? "已记入台账" : turn.kind === "explain" ? "仅说明" : "未变更"}</span>
                    </div>
                  </div>
                </Fragment>
              ))}
              {sending && <><div className="me">{sending}</div><div className="ai">处理中…</div></>}
            </div>
          </>
        )}
      </div>

      {/* 底部青瓷胶囊快捷动线 + 极简指令框 */}
      <div className="ag-in">
        {(!hasChat || showAllActions) && (
          <div className="ag-pills">
            {quickActions.map(action => (
              <button
                key={action.label}
                type="button"
                className="ag-pill"
                disabled={busy}
                onClick={() => {
                  setShowAllActions(false);
                  action.run();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        {hasChat && (
          <div className="sug-toggle-row">
            <button
              type="button"
              className="sug-toggle"
              aria-expanded={showAllActions}
              onClick={() => setShowAllActions(v => !v)}
            >
              {showAllActions ? "收起快捷动作" : "快捷动作"}
            </button>
          </div>
        )}
        <form className="box" onSubmit={e => { e.preventDefault(); send(command); }}>
          <input
            aria-label="给衣语的指令"
            value={command}
            maxLength={500}
            placeholder="告诉衣语怎么改…"
            onChange={e => setCommand(e.target.value)}
          />
          <button className="send" disabled={busy || !command.trim()} aria-label="发送指令">
            <Send size={15} />
          </button>
        </form>
      </div>
    </aside>
  );
}
