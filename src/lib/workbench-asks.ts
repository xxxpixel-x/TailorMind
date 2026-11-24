import type { FollowUpQuestion, LiangYiPlanPackage, RequirementItem } from "@/lib/types";

type AskContext = Pick<LiangYiPlanPackage, "customerParagraphs" | "planParagraphIndices" | "followUpQuestions" | "requirements" | "proposal">;

export function planParagraphs(pkg: Pick<AskContext, "customerParagraphs" | "planParagraphIndices">) {
  return pkg.planParagraphIndices?.map(i => pkg.customerParagraphs[i]).filter(p => p !== undefined) ?? pkg.customerParagraphs;
}

export function isSleeveQuestion(q: FollowUpQuestion) {
  return q.id === "FQ-SLEEVE-LEN" || /袖长|手臂想遮到哪里/.test(q.question);
}

export function formatFollowUpAnswer(id: string, answer: string) {
  if (id === "FQ-QIPAO-COLLAR") return answer === "还没定" ? "旗袍领型还没定" : `旗袍是${answer}`;
  if (id === "FQ-SLEEVE-LEN") return `袖长选${answer}`;
  if (id === "FQ-OLD-STYLE") return `老气更接近${answer}`;
  return answer;
}

const questionTopics: Record<string, RegExp> = {
  "FQ-QIPAO-COLLAR": /旗袍/, "FQ-SLEEVE-LEN": /手臂|胳膊|袖长/,
  "FQ-OLD-STYLE": /老气/, "FQ-CONFLICT-LOOSE-SLIM": /宽松|显瘦/,
  "FQ-COLOR": /主色|颜色|色彩/, "FQ-SEASON": /季节|室内|户外/,
  "FQ-UNI-VI": /品牌|企业色|套号/,
};
export function questionSource(q: FollowUpQuestion, requirements: RequirementItem[]) {
  const topic = questionTopics[q.id];
  return requirements.find(r => topic ? topic.test(r.rawPhrase + r.sourceSpan) : q.question.includes(r.sourceSpan) && r.sourceSpan.length >= 2);
}

function unansweredQuestions(pkg: AskContext) {
  const paragraphs = planParagraphs(pkg);
  return pkg.followUpQuestions.filter(q => {
    if (isSleeveQuestion(q) && pkg.proposal.directions.some(d => d.commandEdits?.sleeveLength)) return false;
    const answers = (q.quickAnswers || []).map(a => formatFollowUpAnswer(q.id, a));
    const lastAnswer = paragraphs.findLast(p => answers.includes(p));
    return !lastAnswer || /还没定|再定/.test(lastAnswer);
  });
}

// 「待追问」全站唯一口径：没回答的追问 + 没有追问覆盖、但仍标为待追问的需求。
// 需求挂着没回答的追问就算待追问；顾问手动改过它的状态，视为这条追问已处理。
export function pendingAsks(pkg: AskContext) {
  const questions = unansweredQuestions(pkg)
    .map(question => ({ question, req: questionSource(question, pkg.requirements) }))
    .filter(({ req }) => !req?.advisorEdits?.status || req.advisorEdits.status === "待追问");
  const asked = new Set(questions.flatMap(({ req }) => req ? [req.id] : []));
  const reqs = pkg.requirements.filter(r => r.status === "待追问" && !asked.has(r.id));
  return { questions, reqs, asked, count: questions.length + reqs.length };
}

export function pendingQuestions(pkg: AskContext) {
  return pendingAsks(pkg).questions.map(({ question }) => question);
}

export function reqStatus(req: RequirementItem, asked: Set<string>) {
  return asked.has(req.id) ? "待追问" as const : req.status;
}
