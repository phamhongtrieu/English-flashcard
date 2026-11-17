/** Offline proposals only: never edits or exports application/source datasets. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { makeQuizQuestions, createQuizRound, quizTextKey } from '../src/utils/toeicQuiz.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const out = path.join(root, 'reports/toeic-approval')
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
const manifest = read('data-preparation/toeic/manifest.json')
const quality = read('reports/toeic-quality/report.json')
const decisions = read('reports/toeic-approval/review-decisions.json')
const sourcePaths = ['toeic_600_words.csv', 'data-preparation/toeic/manifest.json', 'data-preparation/toeic/id-registry.json',
  'data-preparation/toeic/audit.json', 'data-preparation/toeic/manual-review.json',
  'reports/toeic-quality/report.json', 'reports/toeic-quality/review-notes.json',
  'reports/toeic-approval/review-decisions.json', ...manifest.units.map(unit => `data-preparation/toeic/units/${unit.id}.json`)]
const hashes = Object.fromEntries(sourcePaths.map(file => [file, hash(file)]))
const cards = manifest.units.flatMap(unit => read(`data-preparation/toeic/units/${unit.id}.json`).flashcards)
assert.equal(cards.length, 615)
assert.equal(manifest.units.length, 50)
const byId = new Map(cards.map(card => [card.id, card]))
const byRow = new Map(cards.map(card => [card.sourceRow, card]))
assert.equal(byId.size, 615)
assert.deepEqual(new Set(cards.map(card => card.id)), new Set(quality.questions.map(question => question.id)))
const audit = read('data-preparation/toeic/audit.json')
assert.equal(hash('toeic_600_words.csv'), audit.source.sha256)
for (const [file, expected] of Object.entries(quality.inputs)) assert.equal(hash(`data-preparation/toeic/${file}`), expected)
const registry = read('data-preparation/toeic/id-registry.json')
assert.deepEqual(new Set(Object.values(registry.cards)), new Set(byId.keys()))
const qualityById = new Map(quality.questions.map(question => [question.id, question]))
const proposals = decisions.corrections.map(proposal => {
  const card = byRow.get(proposal.sourceRow)
  assert(card)
  return { flashcardId: card.id, lessonId: card.unitId, sourceRow: card.sourceRow, english: card.english,
    currentVietnamese: card.vietnamese, currentPOS: card.partOfSpeechOriginal,
    suspectIssues: qualityById.get(card.id).sourceIssues.filter(issue => issue.priority === 'question-decision').map(issue => issue.reason),
    proposedVietnamese: proposal.meaning, proposedPOS: proposal.pos, alternatives: proposal.alternatives ?? [],
    decisionType: proposal.decision, confidence: proposal.confidence, rationale: proposal.reason,
    sourceEvidence: { explanation: card.explanation, example: card.example, exampleTranslation: card.exampleTranslation },
    dictionarySources: [proposal.url, proposal.additionalUrl].filter(Boolean),
    evidenceDate: '2026-11-17', reviewStatus: 'pending-admin-review', applied: false, adminDecision: null }
})
assert.equal(proposals.length, 29)
assert.deepEqual(new Set(proposals.map(proposal => proposal.flashcardId)), new Set(quality.questions.filter(question => question.promptDecisionRequired).map(question => question.id)))
const proposalById = new Map(proposals.map(proposal => [proposal.flashcardId, proposal]))

const cleanMeaning = value => quizTextKey(value).replace(/\([^)]*\)/g, '').replace(/‹[^›]*›/g, '').replace(/[.,;]+$/g, '').trim()
const glossSet = value => new Set(cleanMeaning(value).split(/[,;/]/).map(part => part.replace(/^\s*sự\s+/, '').trim()).filter(Boolean))
const setEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value))
const pairReviews = quality.ambiguityPairs.filter(pair => !pair.sameEnglish).map(pair => {
  const a = byId.get(pair.firstId), b = byId.get(pair.secondId)
  const rowKey = pair.sourceRows.join('-')
  const definite = cleanMeaning(a.vietnamese) === cleanMeaning(b.vietnamese) || setEqual(glossSet(a.vietnamese), glossSet(b.vietnamese))
  const context = decisions.contextConditionalPairs[rowKey]
  const category = definite ? 'cannot-cooccur-current-prompt' : context ? 'usable-only-with-clear-context' : 'confusion-risk'
  return { firstId: a.id, secondId: b.id, sourceRows: pair.sourceRows, lessonIds: pair.lessonIds,
    firstEnglish: a.english, secondEnglish: b.english, firstVietnamese: a.vietnamese, secondVietnamese: b.vietnamese,
    firstPOS: a.partOfSpeechOriginal, secondPOS: b.partOfSpeechOriginal, sameLesson: pair.sameLesson,
    category, confidence: definite ? 'high' : 'medium', evidence: pair.findings,
    rationale: definite ? 'Hai chuỗi nghĩa nguồn trùng toàn bộ hoặc cùng tập nghĩa sau chuẩn hóa; cả hai có thể đáp ứng prompt hiện tại. Không dùng làm nhiễu chéo với các prompt này.'
      : context ?? `Có phần nghĩa/nhóm ngữ cảnh chồng lấn theo báo cáo; chưa đủ căn cứ coi là luôn đồng nghĩa hoặc luôn khác nghĩa. Tránh làm nhiễu chéo cho prompt hiện tại.`,
    requiredContext: context ?? '',
    usableWithCurrentPrompt: false, proposalOnly: true, reviewStatus: 'pending-admin-review', adminDecision: null }
})
assert.equal(pairReviews.length, 124)
const knownRowPairs = new Set(pairReviews.map(pair => pair.sourceRows.join('-')))
for (const key of Object.keys(decisions.contextConditionalPairs)) assert(knownRowPairs.has(key), `Unknown pair decision ${key}`)

const blocked = new Map(cards.map(card => [card.id, new Set()]))
const block = (a, b) => { blocked.get(a).add(b); blocked.get(b).add(a) }
for (const pair of quality.ambiguityPairs) block(pair.firstId, pair.secondId)
const supplementalPairs = []
for (const group of decisions.additionalExclusionGroups) {
  const members = cards.filter(card => group.includes(card.english))
  assert.deepEqual(new Set(members.map(card => card.english)), new Set(group))
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
    const a = members[i], b = members[j]
    if (!blocked.get(a.id).has(b.id)) supplementalPairs.push({ firstId: a.id, secondId: b.id,
      english: [a.english, b.english], reason: 'Loại bổ sung mang tính phòng ngừa do nét nghĩa/ngữ cảnh gần nhau; không kết luận cặp từ luôn đồng nghĩa.' })
    block(a.id, b.id)
  }
}

const stop = new Set('sự một những các cái người việc của cho được làm có là ở với để cách phần mang tính thuộc về và hoặc theo đến'.split(' '))
const tokens = value => new Set(cleanMeaning(value).match(/[\p{L}]+/gu)?.filter(word => word.length > 1 && !stop.has(word)) ?? [])
const tokenCache = new Map(cards.map(card => [card.id, tokens(card.vietnamese)]))
const englishKeys = new Map(cards.map(card => [card.id, quizTextKey(card.english)]))
const meaningKeys = new Map(cards.map(card => [card.id, cleanMeaning(card.vietnamese)]))
const overlap = (a, b) => [...tokenCache.get(a.id)].some(token => tokenCache.get(b.id).has(token))
const parts = card => new Set((card.partOfSpeech ?? '').split('/'))
const samePOS = (a, b) => a.partOfSpeech && b.partOfSpeech && [...parts(a)].some(part => parts(b).has(part))
const tie = (a, b) => crypto.createHash('sha256').update(`${a.id}:${b.id}`).digest('hex')
const canSuggest = (a, b) => a.id !== b.id && !proposalById.has(b.id) && !blocked.get(a.id).has(b.id)
  && englishKeys.get(a.id) !== englishKeys.get(b.id) && meaningKeys.get(a.id) !== meaningKeys.get(b.id)
  && !overlap(a, b)

const questions = cards.map(card => {
  const candidates = cards.filter(candidate => canSuggest(card, candidate))
  const ties = new Map(candidates.map(candidate => [candidate.id, tie(card, candidate)]))
  candidates.sort((a, b) => {
    const local = Number(b.unitId === card.unitId) - Number(a.unitId === card.unitId)
    if (local) return local
    const pos = Number(Boolean(samePOS(card, b))) - Number(Boolean(samePOS(card, a)))
    return pos || ties.get(a.id).localeCompare(ties.get(b.id))
  })
  const selected = []
  for (const candidate of candidates) {
    if (selected.some(previous => blocked.get(previous.id).has(candidate.id) || quizTextKey(previous.english) === quizTextKey(candidate.english))) continue
    selected.push(candidate)
    if (selected.length === 3) break
  }
  const correction = proposalById.get(card.id)
  return { flashcardId: card.id, lessonId: card.unitId, sourceRow: card.sourceRow, english: card.english,
    currentVietnamese: card.vietnamese, currentPOS: card.partOfSpeechOriginal,
    sourceAuditStatus: card.review.status, sourceAuditIssues: card.review.issues,
    suggestedDistractors: selected.map(candidate => ({ flashcardId: candidate.id, lessonId: candidate.unitId,
      english: candidate.english, vietnamese: candidate.vietnamese, partOfSpeech: candidate.partOfSpeechOriginal,
      rationale: `Theo nghĩa nguồn, “${candidate.vietnamese.trim()}” khác “${card.vietnamese.trim()}”; đã loại cặp rủi ro được biết. Đây là đề xuất cần người duyệt xác nhận, không phải chứng minh tự động về ngữ nghĩa.` })),
    selectionBasis: 'Ưu tiên cùng Lesson rồi cùng loại từ; loại cả 124 cặp, chữ trùng, nhóm nghĩa gần bổ sung và phần từ nội dung trong nghĩa Việt trùng. Không dùng 29 mục đang sửa làm nhiễu.',
    confidence: 'medium', recommendation: selected.length < 3 ? 'insufficient-evidence'
      : correction ? 'hold-for-correction-decision' : 'propose-admin-approval',
    correctionDecisionType: correction?.decisionType ?? null,
    reviewStatus: 'pending-admin-review', actualApproved: false, rightsStatus: 'unverified', adminDecision: null }
})
assert.equal(questions.length, 615)
assert.deepEqual(new Set(questions.map(question => question.flashcardId)), new Set(byId.keys()))
for (const question of questions) {
  assert.equal(question.suggestedDistractors.length, 3)
  const options = [byId.get(question.flashcardId), ...question.suggestedDistractors.map(suggestion => byId.get(suggestion.flashcardId))]
  assert.equal(new Set(options.map(option => quizTextKey(option.english))).size, 4)
  for (let i = 0; i < options.length; i++) for (let j = i + 1; j < options.length; j++) assert(!blocked.get(options[i].id).has(options[j].id))
}

// Invoke the actual generator with explicit non-approval status in memory only.
const pool = questions.map(question => ({ id: question.flashcardId, lessonId: question.lessonId, english: question.english,
  vietnamese: question.currentVietnamese, partOfSpeech: question.currentPOS || null,
  quiz: { status: 'proposal-only', answerAliases: [], distractorIds: question.suggestedDistractors.map(suggestion => suggestion.flashcardId) } }))
const heldIds = new Set(questions.filter(question => question.recommendation === 'hold-for-correction-decision').map(question => question.flashcardId))
const eligiblePool = pool.filter(entry => !heldIds.has(entry.id))
const lessonChecks = manifest.units.map(unit => {
  const generated = makeQuizQuestions(pool.filter(entry => entry.lessonId === unit.id), pool, () => 0.5)
  const eligible = makeQuizQuestions(eligiblePool.filter(entry => entry.lessonId === unit.id), eligiblePool, () => 0.5)
  for (const question of generated) {
    assert.equal(question.options.length, 4)
    assert.equal(question.options.filter(option => option.id === question.correctId).length, 1)
    for (const option of question.options) if (option.id !== question.id) assert(!blocked.get(question.id).has(option.id))
  }
  for (let seed = 1; seed <= 5; seed++) {
    let state = seed
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32 }
    const round = createQuizRound(eligible, random)
    assert.equal(round.length, Math.min(10, eligible.length))
    assert.equal(new Set(round.map(question => question.id)).size, round.length)
  }
  return { lessonId: unit.id, title: unit.title, sourceRecords: pool.filter(entry => entry.lessonId === unit.id).length,
    proposedQuestions: generated.length, questionsProposedForAdminApproval: eligible.length,
    maximumRoundSizeWithoutPendingCorrections: Math.min(10, eligible.length), actualApproved: 0 }
})
assert.equal(lessonChecks.reduce((sum, lesson) => sum + lesson.proposedQuestions, 0), 615)

const summary = { schemaVersion: 1, documentType: 'admin-review-proposals-only', reportDate: '2026-11-17',
  rightsStatus: 'unverified', publicationAllowed: false, sourceModified: false, unlockedLessons: 0,
  actualApprovedQuestions: 0, actualApprovedLessons: 0, reviewStatus: 'pending-admin-review', inputSha256: hashes,
  counts: { sourceRecords: 615, sourceLessons: 50, corrections: proposals.length,
    singleCorrectionProposals: proposals.filter(proposal => proposal.decisionType === 'single-proposal').length,
    manualSenseChoices: proposals.filter(proposal => proposal.decisionType === 'choose-sense').length,
    semanticPairs: pairReviews.length, pairCategories: Object.fromEntries(['cannot-cooccur-current-prompt','confusion-risk','usable-only-with-clear-context'].map(category => [category, pairReviews.filter(pair => pair.category === category).length])),
    questionTriples: questions.filter(question => question.suggestedDistractors.length === 3).length,
    proposedForAdminApproval: questions.filter(question => question.recommendation === 'propose-admin-approval').length,
    heldForCorrectionDecision: heldIds.size, insufficientEvidence: questions.filter(question => question.recommendation === 'insufficient-evidence').length,
    sameLessonOnlyTriples: questions.filter(question => question.suggestedDistractors.every(suggestion => suggestion.lessonId === question.lessonId)).length,
    lessonsWithTenProposalsWithoutPendingCorrections: lessonChecks.filter(lesson => lesson.maximumRoundSizeWithoutPendingCorrections === 10).length,
    supplementalExcludedPairs: supplementalPairs.length },
  interpretation: ['propose-admin-approval nghĩa là có thể trình người quản trị duyệt nội dung/bộ nhiễu, KHÔNG có nghĩa đã duyệt hay có quyền xuất bản.',
    'Toàn bộ 615 mục đều có ba nhiễu đề xuất. Với 29 câu đang nghi vấn, các nhiễu chỉ là dự thảo có điều kiện, cần chọn/sửa nghĩa rồi kiểm tra lại.',
    'cannot-cooccur-current-prompt chỉ áp dụng cho các nghĩa hỏi hiện có, không khẳng định hai từ luôn đồng nghĩa trong mọi ngữ cảnh.',
    'usable-only-with-clear-context yêu cầu người biên tập tạo/duyệt ngữ cảnh đủ rõ và kiểm tra lại; ứng dụng hiện chỉ hiển thị nghĩa/loại từ nên chưa đáp ứng điều kiện đó.',
    'Cả ba nhóm 124 cặp đều bị loại khỏi tất cả các bộ nhiễu đề xuất hiện tại. Các nhóm gần nghĩa bổ sung chỉ dùng loại thận trọng, không sửa báo cáo 124 cặp cũ.',
    'Độ tin cậy nghĩa là mức hỗ trợ cho đề xuất; không phải chứng nhận duy nhất về ngữ nghĩa hay quyền sử dụng. Đánh giá nhiễu dựa vào nguồn và nhận xét ngữ nghĩa, không phải xác minh từ điển toàn bộ 615 từ.'],
  requiredBeforePublication: ['Tài liệu xác minh quyền tái xuất bản văn bản nguồn.', 'Quyết định của quản trị viên cho 29 câu, gồm chọn nghĩa/loại từ khi có nhiều phương án.',
    'Quản trị viên xác nhận từng bộ ba nhiễu và đáp án tương đương; kiểm tra lại nếu thay đổi prompt/nhãn/ngữ cảnh.',
    'Bước xuất payload Quiz được ủy quyền riêng, giữ ID và cập nhật approval có căn cứ; không nạp thẳng các báo cáo này vào ứng dụng.'],
  corrections: proposals, pairReviews, supplementalExclusions: supplementalPairs, questions, lessonChecks,
  verification: { recordsRetained: true, idsRetained: true, fourDistinctEnglishOptions: true,
    knownAmbiguousOptionPairs: 0, roundsRepeatQuestionIds: false, maximumRoundSize: 10,
    generator: 'src/utils/toeicQuiz.ts (unchanged); proposal-only in-memory inputs', sourceHashChecksPassed: true,
    semanticAudit: 'pending-independent-admin-review' } }

const quote = value => `"${String(value ?? '').replaceAll('"','""')}"`
const csv = rows => '\ufeff' + rows.map(row => row.map(quote).join(',')).join('\r\n') + '\r\n'
const correctionRows = [['flashcardId','lessonId','sourceRow','english','currentVietnamese','currentPOS','suspectIssues','proposedVietnamese','proposedPOS',
  'alternativeSenseProposals','decisionType','confidence','rationale','sourceExplanation','sourceExample','sourceExampleTranslation','dictionarySources','reviewStatus','applied','adminDecision'],
  ...proposals.map(proposal => [proposal.flashcardId,proposal.lessonId,proposal.sourceRow,proposal.english,proposal.currentVietnamese,proposal.currentPOS,
    proposal.suspectIssues.join(' | '),proposal.proposedVietnamese,proposal.proposedPOS,JSON.stringify(proposal.alternatives),proposal.decisionType,proposal.confidence,
    proposal.rationale,proposal.sourceEvidence.explanation,proposal.sourceEvidence.example,proposal.sourceEvidence.exampleTranslation,
    proposal.dictionarySources.join(' | '),proposal.reviewStatus,false,''])]
const fields = ['recordType','flashcardId','relatedFlashcardId','lessonId','sourceRow','english','currentVietnamese','currentPOS','relatedEnglish','relatedVietnamese','relatedPOS',
  'pairCategory','requiredContext','confidence','rationale','suggestedDistractor1Id','distractor1English','distractor1Vietnamese','distractor1Rationale',
  'suggestedDistractor2Id','distractor2English','distractor2Vietnamese','distractor2Rationale',
  'suggestedDistractor3Id','distractor3English','distractor3Vietnamese','distractor3Rationale','recommendation','reviewStatus','adminDecision']
const pairRows = pairReviews.map(pair => ({ recordType:'overlap-pair',flashcardId:pair.firstId,relatedFlashcardId:pair.secondId,lessonId:pair.lessonIds.join(' | '),
  sourceRow:pair.sourceRows.join(' | '),english:pair.firstEnglish,currentVietnamese:pair.firstVietnamese,currentPOS:pair.firstPOS,
  relatedEnglish:pair.secondEnglish,relatedVietnamese:pair.secondVietnamese,relatedPOS:pair.secondPOS,pairCategory:pair.category,
  requiredContext:pair.requiredContext,confidence:pair.confidence,rationale:pair.rationale,recommendation:'exclude-from-current-proposed-options',reviewStatus:pair.reviewStatus,adminDecision:'' }))
const questionRows = questions.map(question => {
  const row = { recordType:'question-distractors',flashcardId:question.flashcardId,lessonId:question.lessonId,sourceRow:question.sourceRow,
    english:question.english,currentVietnamese:question.currentVietnamese,currentPOS:question.currentPOS,confidence:question.confidence,
    rationale:question.selectionBasis,recommendation:question.recommendation,reviewStatus:question.reviewStatus,adminDecision:'' }
  question.suggestedDistractors.forEach((suggestion,i) => { row[`suggestedDistractor${i+1}Id`]=suggestion.flashcardId;row[`distractor${i+1}English`]=suggestion.english;
    row[`distractor${i+1}Vietnamese`]=suggestion.vietnamese;row[`distractor${i+1}Rationale`]=suggestion.rationale })
  return row
})
for (const [file, expected] of Object.entries(hashes)) assert.equal(hash(file),expected)
fs.writeFileSync(path.join(out,'proposed-corrections.csv'),csv(correctionRows),'utf8')
fs.writeFileSync(path.join(out,'distractor-review.csv'),csv([fields,...[...pairRows,...questionRows].map(row=>fields.map(field=>row[field]))]),'utf8')
fs.writeFileSync(path.join(out,'approval-summary.json'),JSON.stringify(summary,null,2)+'\n','utf8')
console.log(JSON.stringify(summary.counts,null,2))
