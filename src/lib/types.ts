export type BusinessMode = "bespoke" | "uniform";

export type WorkflowStage =
  | 1 // 1. 设计语言转化
  | 2 // 2. 设计图
  | 3 // 3. 选面料
  | 4 // 4. 版型设计 (CAD)
  | 5 // 5. 打样
  | 6; // 6. 成衣交付

// ==================== 1. 结构化定制资产知识库契约 ====================

export interface PatternAsset {
  id: string;
  name: string;
  modeScope: BusinessMode | "both";
  category: string;
  silhouetteType: string;
  shoulderSpec: string;
  collarSpec: string;
  lengthSpec: string;
  cadPieces: string[];
  seamAllowanceSpec: string;
  bodyAdaptationRules: string[];
  sceneTags: string[];
  styleTags: string[];
  usageNotes: string;
}

export interface FabricAsset {
  id: string;
  name: string;
  modeScope: BusinessMode | "both";
  category: "非遗/真丝高定" | "提花织锦" | "现代醋酸/针织" | "团装抗皱精纺";
  composition: string;
  weightRange: string;
  drapeLevel: string;
  crispnessLevel: string;
  lusterLevel: string;
  wrinkleResistance: "极高(免烫抗皱)" | "高" | "中" | "中低(需精细打理)";
  reorderStability: string;
  season: string[];
  careInstruction: string;
  styleFitDesc: string;
  tactileFitDesc: string;
  bodyFitDesc: string;
  tags: string[];
}

export interface CraftAsset {
  id: string;
  name: string;
  modeScope: BusinessMode | "both";
  craftCategory: "领襟结构" | "盘扣与装饰" | "滚边嵌条" | "织造暗纹" | "文化转译分割";
  culturalOrigin: string;
  visualEffect: string;
  cadTechPoints: string;
  viIntegrationNote: string;
  leadTimeImpact: "标准工期" | "+2~3天工期" | "+5天手工工期";
  tags: string[];
}

export interface EightFieldTranslation {
  category: string; // 【品类】
  structure: string; // 【版型结构】
  collar: string; // 【领型】
  fabric: string; // 【面料】
  color: string; // 【色彩】
  patternCraft: string; // 【装饰纹样】
  lengthRatio: string; // 【长度比例】
  easeAllowance: string; // 【松弛余量】
}

export interface HistoricalCaseAsset {
  id: string;
  title: string;
  sourceType: "上服集团官方真实案例 (2026.11)" | "上服团装模拟归档案例";
  mode: BusinessMode;
  customerRawQuote: string;
  translation: EightFieldTranslation;
  matchedPatternId: string;
  matchedFabricId: string;
  matchedCraftIds: string[];
  images: {
    url: string;
    caption: string;
    stage: "实拍成衣" | "上身效果" | "设计企划板" | "CAD制版" | "初样白坯";
  }[];
  expertTakeaway: string;
  tags: string[];
}

// ==================== 2. 逐条需求清单、短句覆盖核对器与追问契约（P0 核心） ====================

export type RequirementCategory =
  | "体型修饰"
  | "功能动作"
  | "场合礼仪"
  | "色彩材质"
  | "审美风格"
  | "明确禁忌"
  | "穿搭结构"
  | "团装管理";

// 三屏主流程统一使用的状态：已落实 / 推断 / 待追问 / 未处理
export type RequirementStatus = "已落实" | "推断" | "待追问" | "未处理";

// 严格的责任归属（P0-5）：体型放量归制版师，场合审美归顾问/设计师，颜色面料归顾问（色卡确认）
export type RequirementOwnerRole =
  | "制版师"
  | "顾问"
  | "设计师"
  | "业务人员";

export interface RequirementItem {
  id: string;
  index: number; // 用于在原话中标注上标编号 1, 2, 3...
  rawPhrase: string; // 客户原话短语（精简呈现）
  sourceSpan: string; // 对应客户原话中的精确子串，供下划线高亮标注
  category: RequirementCategory;
  isHardRequirement: boolean;
  priority: 1 | 2 | 3; // 1=身体舒适与功能, 2=客户明说要求, 3=推断审美
  solutionAction: string; // 怎么落实（简明具体做法）
  rationale: string; // 依据说明
  ruleOrAssetId?: string;
  status: RequirementStatus;
  ownerRole: RequirementOwnerRole;
  needsMasterApproval?: boolean; // 仅对 general_tailoring_pending_master 的体型规则为 true（显示“待制版师核准”）
  advisorEdits?: { solutionAction?: string; status?: RequirementStatus };
}

export interface ClauseCoverageItem {
  clauseIndex: number;
  clauseText: string;
  status: "covered" | "irrelevant" | "unhandled";
  matchedRequirementIds: string[];
  note: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  isConflict?: boolean;
  impactRank: number; // 对方案的影响权重，越小越优先
  quickAnswers: string[];
}

export interface VerificationCheckResult {
  allPassed: boolean;
  passedCount: number;
  inferredCount: number;
  pendingAskCount: number;
  failedCount: number;
  unhandledClauseCount: number;
  clauseCoverage: ClauseCoverageItem[];
  checks: {
    requirementId: string;
    label: string;
    passed: boolean;
    severity: "pass" | "warning" | "fail";
    detail: string;
  }[];
}

export interface ChatTurnMessage {
  id: string;
  role: "advisor" | "agent";
  content: string;
  timestamp: string;
  followUps?: FollowUpQuestion[];
}

// ==================== 3. 六维解构与情绪审美报告 ====================

export interface DimensionItem {
  dimensionName: string;
  completeness: number;
  keywords: string[];
  analysis: string;
}

export interface SixDimensionBreakdown {
  styleTone: DimensionItem;
  silhouette: DimensionItem;
  fabricTexture: DimensionItem;
  craftDetail: DimensionItem;
  colorSystem: DimensionItem;
  sceneFitness: DimensionItem;
}

export interface EmotionalAestheticReport {
  personaSummary: string;
  explicitNeeds: string[];
  implicitEmotions: string[];
  tabooRedlines: string[];
  advisorFollowUps: string[];
}

// ==================== 4. 资源匹配、三方向卡片（对齐样稿 2-选方向）与团装矩阵 ====================

export interface ThreeDimMatchScore {
  assetId: string;
  assetName: string;
  assetType: "版型母版" | "特色面料" | "海派工艺" | "参考案例" | "体型规则";
  matchReason: string;
  styleFit: string;
  tactileFit: string;
  bodyOrRoleFit: string;
  isPrimary: boolean;
}

export interface ColorSwatch {
  hex: string;
  label: string;
}

export type SleeveLength = "长袖" | "九分袖" | "七分袖";
export interface DirectionEdits {
  sleeveLength?: SleeveLength;
  patternId?: string;
  fabricId?: string;
  craftId?: string;
}

export interface DesignDirectionOption {
  id: "classic" | "accent" | "modern";
  tag: string; // 如 "A · 稳妥" / "B · 一处亮点" / "C · 简洁现代"
  title: string; // 如 "酒红暗纹宋锦短外套"
  swatches: ColorSwatch[]; // 两个色块
  bullets: string[]; // 三条针对这个客户的短卖点
  referenceImageUrl: string; // 当前用上服案例实物图
  referenceImageCaption: string; // 明确标“案例二实物”，不冒充效果图
  patternId: string;
  fabricId: string;
  craftId?: string;
  // 供兼容与导出使用的补充说明
  positioning: string;
  restraintNote: string;
  garmentSummary: string;
  collarAndCraftDiff: string;
  fabricSuggestion: string;
  suitableFor: string;
  hardReqGuarantee: string;
  commandEdits?: DirectionEdits;
  sheetLengthRatio?: string;
}

export interface UniformRoleTier {
  tierName: string;
  headcountNote: string;
  garmentCombo: string;
  patternId: string;
  fabricId: string;
  viDesignTouch: string;
  sizingStrategy: string;
}

export interface HumanHandoffItem {
  task: string; // 如 "量体：后背长、背宽、臂围"
  owner: RequirementOwnerRole; // 制版师 / 顾问 / 设计师 / 业务人员
}

export interface ProposalDraft {
  proposalTitle: string;
  clientShortLabel: string; // 顶栏右侧简短标识，如 "陈女士 · 婚礼母亲外套"
  occasionShortLabel: string; // 设计单场合行，如 "女儿婚礼 · 12 月底"
  themeConcept: string;
  stylePositioning: string;
  primaryPatternPlan: string;
  primaryFabricPlan: string;
  craftCombinationPlan: string;
  sceneStylingAdvice: string;
  designHighlights: string[];
  lockedHardBadges: { label: string; colorHex?: string }[]; // 选方向页顶部的硬要求标签行
  directions: DesignDirectionOption[];
  selectedDirectionId: "classic" | "accent" | "modern";
  handoffItems: HumanHandoffItem[]; // 设计单第三部分「交给人来定」
  uniformTiers?: UniformRoleTier[];
  feasibilityAlerts: {
    leadTimeEstimate: string;
    fittingCheckpoints: string[];
    riskAndCareNotes: string[];
  };
  humanBoundaryNotice: string;
}

// ==================== 5. 视觉企划板与提示词包契约 ====================

export type VisualSlotId = "design_effect" | "details" | "fabric_pattern" | "lookbook";

export interface VisualPromptSlot {
  slotId: VisualSlotId;
  titleCn: string;
  titleEn: string;
  subLabel: string;
  seedreamPromptCn: string;
  midjourneyPromptEn: string;
  negativePrompt: string;
  cameraLightingSpec: string;
  imageUrl: string;
  imageSource: "preset_reference" | "live_ai";
  visualCheckNote?: string;
}

// ==================== 6. 多智能体协同、海派工艺图谱与版房工艺单契约 ====================

export type AgentRoleId = "dialogue" | "kg_validator" | "visual_director" | "tech_pack";

export interface CraftKgConflict {
  edgeId: string;
  severity: "blocked" | "caution";
  fromId: string;
  fromLabel: string;
  toId: string;
  toLabel: string;
  pathText: string;
  reason: string;
  alternativeId?: string;
  alternativeLabel?: string;
  alternativeHint: string;
}

export interface CraftKgShapingSpec {
  id: string;
  label: string;
  summary: string;
  params: string[];
  triggeredBy: string;
}

export interface CraftKgValidationReport {
  passed: boolean;
  checkedNodesCount: number;
  activeNodeIds: string[];
  blockedConflicts: CraftKgConflict[];
  filteredInfeasibleRequests: CraftKgConflict[];
  cautions: CraftKgConflict[];
  requiredShaping: CraftKgShapingSpec[];
  directionStatuses: {
    directionId: DesignDirectionOption["id"];
    passed: boolean;
    blockedCount: number;
    cautionCount: number;
  }[];
  summary: string;
}

export interface TechPackMeasurementRow {
  part: string;
  easeRule: string;
  sourceRuleId: string;
  masterNote: string;
  actualValuePlaceholder: string;
}

export interface TechPackBomItem {
  role: "主料" | "里布" | "衬布" | "工艺辅料";
  name: string;
  spec: string;
  careOrProcessNote: string;
  assetId?: string;
}

export interface PatternRoomTechPack {
  techPackNo: string;
  garmentTitle: string;
  patternId: string;
  patternName: string;
  cadStandard: string;
  cadPieces: string[];
  seamAllowanceSpec: string;
  collarSpec: string;
  shoulderSpec: string;
  lengthSpec: string;
  measurementSpecs: TechPackMeasurementRow[];
  shapingInstructions: CraftKgShapingSpec[];
  bomItems: TechPackBomItem[];
  craftTechPoints: string;
  qcRedlines: string[];
  masterSignOffNote: string;
}

export interface ToolCallTraceStep {
  stepIndex: number;
  agentRole?: AgentRoleId;
  agentName?: string;
  toolName:
    | "parse_requirements_and_conflicts"
    | "search_body_rules"
    | "search_patterns"
    | "search_fabrics"
    | "search_crafts"
    | "retrieve_similar_cases"
    | "validate_craft_knowledge_graph"
    | "compose_visual_directions"
    | "build_pattern_room_tech_pack"
    | "verify_requirements_coverage";
  toolLabel: string;
  inputArgs: Record<string, unknown>;
  matchedAssetIds: string[];
  resultSummary: string;
  durationMs: number | null;
  timestamp: string;
}

export interface UniformSizeRow {
  roleGroup: string;
  gender: "男款" | "女款";
  standardSizes: string;
  specialFitCount: number;
  specialFitNotes: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: "衣语 Agent" | "量意 Agent" | "定制业务专员 (人工)";
  action: string;
  detail: string;
}

export interface BusinessLedger {
  ledgerNo: string;
  createdAt: string;
  updatedAt: string;
  projectName: string;
  mode: BusinessMode;
  clientOrOrgName: string;
  contactDeptOrPerson: string;
  headcountOrQty: string;
  currentStage: WorkflowStage;
  demandSummary: string;
  selectedPatternIds: string[];
  selectedFabricIds: string[];
  selectedCraftIds: string[];
  referenceCaseIds: string[];
  estimatedTierNote: string;
  fittingMemo: string;
  specialistName: string;
  reviewStatus: "待审核" | "已复核·待打样" | "意向已确认";
  // 上报、顾问选定方向和归档分别留存，兼容旧版台账。
  reportStatus?: "已上报";
  directionConfirmed?: boolean;
  archivedAt?: string;
  uniformSizeTable?: UniformSizeRow[];
  auditLogs: AuditLogEntry[];
}

// ==================== 全链路企划结果包 ====================

export type DirectionId = DesignDirectionOption["id"];
export interface CommandChange extends DirectionEdits {
  kind: "modify";
  directionId: DirectionId;
  select?: boolean;
  statuses?: { id: string; status: RequirementStatus }[];
  reply?: string;
}
export type CommandIntent = CommandChange
  | { kind: "explain"; directionId: DirectionId; assetIds: string[]; reply?: string }
  | { kind: "unsupported" };

// 撤销只保存指令能触及的字段，不重复存储成衣图、工具轨迹和整段对话。
export interface CommandSnapshot {
  directions: Pick<DesignDirectionOption, "id" | "patternId" | "fabricId" | "craftId" | "fabricSuggestion"
    | "garmentSummary" | "collarAndCraftDiff" | "sheetLengthRatio" | "commandEdits">[];
  proposal: Pick<ProposalDraft, "selectedDirectionId" | "proposalTitle" | "feasibilityAlerts">;
  ledger: Pick<BusinessLedger, "projectName" | "directionConfirmed" | "selectedPatternIds" | "selectedFabricIds" | "selectedCraftIds">;
  requirements: RequirementItem[];
  eightFields: EightFieldTranslation;
  verification: VerificationCheckResult;
}
export interface CommandTurn {
  id: string;
  text: string;
  kind: CommandIntent["kind"] | "unchanged";
  reply: string;
  directionId?: DirectionId;
  requirementId?: string;
  diffs?: { label: string; from?: string; to: string }[];
  sources?: { index: number; label: string }[];
  conflicts?: string[];
  assetIds?: string[];
  badge?: string;
  auditId?: string;
  undo?: CommandSnapshot;
  undone?: boolean;
}
export interface InterviewTurn {
  text: string;
  at: string;
  steps: ToolCallTraceStep[];
  reply: string;
}

export interface InterviewPhoto {
  id: string;
  label: "体型照" | "参考图";
  at: string;
}

export interface PlanSnapshot {
  directions: (CommandSnapshot["directions"][number] & Pick<DesignDirectionOption, "tag" | "title">)[];
  proposal: Pick<ProposalDraft, "selectedDirectionId" | "proposalTitle" | "feasibilityAlerts" | "handoffItems" | "uniformTiers">;
  assets: Omit<CommandSnapshot["ledger"], "projectName">;
  eightFields: EightFieldTranslation;
  requirements: RequirementItem[];
  followUpQuestions: FollowUpQuestion[];
  pendingCount: number;
  pendingQuestionIds: string[];
  // 原话始终保留在面谈记录里。索引指出这个版本采纳了哪些段落。
  paragraphIndices: number[];
}

export interface PlanVersion {
  number: number;
  at: string;
  action: string;
  snapshot: PlanSnapshot;
  origins: Record<string, { number: number; action: string }>;
}

export interface LiangYiPlanPackage {
  scenarioId: string;
  mode: BusinessMode;
  engineSource: "live_llm_tool_call" | "local_rule_engine";
  modelUsed: string;
  customerInput: string;
  customerParagraphs: string[]; // 多轮录入的客户原话分段，供第一屏展示
  conversationSummary: string;
  requirements: RequirementItem[];
  followUpQuestions: FollowUpQuestion[];
  verification: VerificationCheckResult;
  toolTraces: ToolCallTraceStep[];
  sixDimensions: SixDimensionBreakdown;
  eightFields: EightFieldTranslation;
  emotionalReport: EmotionalAestheticReport;
  assetMatches: ThreeDimMatchScore[];
  proposal: ProposalDraft;
  visualSlots: VisualPromptSlot[];
  ledger: BusinessLedger;
  kgValidation?: CraftKgValidationReport;
  techPack?: PatternRoomTechPack;
  commandHistory?: CommandTurn[];
  interviewTurns?: InterviewTurn[];
  photos?: InterviewPhoto[];
  // 未具名客户从档案再次面谈时，沿用首次订单的归档标识。
  clientGroupKey?: string;
  versions?: PlanVersion[];
  planParagraphIndices?: number[];
}
