/** Preservation-first, offline 600-record proposal. No source/app writes. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { makeQuizQuestions, createQuizRound, quizTextKey } from '../src/utils/toeicQuiz.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const out = path.join(root, 'data-proposals/toeic-600')
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'))
const sha = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex')
const sourceManifest = read('data-preparation/toeic/manifest.json')
const quality = read('reports/toeic-quality/report.json')
const approval = read('reports/toeic-approval/approval-summary.json')
const audit = read('data-preparation/toeic/audit.json')
const sourceFiles = ['toeic_600_words.csv', 'data-preparation/toeic/manifest.json', 'data-preparation/toeic/id-registry.json',
  'data-preparation/toeic/audit.json', 'data-preparation/toeic/manual-review.json',
  'reports/toeic-quality/report.json', 'reports/toeic-quality/review-notes.json',
  'reports/toeic-approval/approval-summary.json', ...sourceManifest.units.map(unit => `data-preparation/toeic/units/${unit.id}.json`)]
const inputHashes = Object.fromEntries(sourceFiles.map(file => [file, sha(file)]))
assert.equal(sha('toeic_600_words.csv'), audit.source.sha256)
for (const [file, hash] of Object.entries(quality.inputs)) assert.equal(sha(`data-preparation/toeic/${file}`), hash)
const sourceLessons = sourceManifest.units.map(unit => ({ unit, data: read(`data-preparation/toeic/units/${unit.id}.json`) }))
const sourceCards = sourceLessons.flatMap(lesson => lesson.data.flashcards)
const sourceById = new Map(sourceCards.map(card => [card.id, card]))
assert.equal(sourceCards.length, 615)
assert.equal(sourceById.size, 615)
const exclusions = []
for (const { unit, data } of sourceLessons) {
  if (data.flashcards.length !== 13) continue
  const title = quizTextKey(unit.title)
  const forms = new Set([title])
  if (title.endsWith('s')) forms.add(title.slice(0, -1))
  // Check every record, rather than assuming the first item is an extra.
  const matches = data.flashcards.filter(card => forms.has(quizTextKey(card.english)))
  assert.equal(matches.length, 1, `Ambiguous title matching: ${unit.id}`)
  const card = matches[0]
  exclusions.push({ sourceRecordId: card.id, sourceRow: card.sourceRow, sourceUnitId: unit.id, sourceTopic: unit.title,
    english: card.english, sourceLessonCount: data.flashcards.length,
    matchingRule: title === quizTextKey(card.english) ? 'case-insensitive-exact-title' : 'title-singular-plural',
    matchingCandidatesInLesson: matches.length, sourcePosition: data.flashcards.indexOf(card) + 1,
    explanationMissing: !card.explanation.trim(), hasOtherVocabularyFields: Boolean(card.vietnamese.trim() && card.example.trim()),
    rationale: 'Bài có 13 mục, có đúng một từ khớp tên chủ đề; đề xuất bỏ mục khớp để tạo bản 12 mục. Vị trí đầu bài/trường thiếu chỉ là bằng chứng phụ, không chứng minh mục không phải từ vựng.',
    confidence: 'medium', selectionStatus: 'proposed-exclusion-only', originalRoleConfirmed: false, sourceDeleted: false })
}
assert.equal(exclusions.length, 15)
const excluded = new Set(exclusions.map(item => item.sourceRecordId))
const kept = sourceCards.filter(card => !excluded.has(card.id))
assert.equal(kept.length, 600)
for (const { data } of sourceLessons) assert.equal(data.flashcards.filter(card => !excluded.has(card.id)).length, 12)
const learningId = sourceId => `toeic600-${crypto.createHash('sha256').update(`english-flashcard:toeic600:v1:${sourceId}`).digest('hex').slice(0, 32)}`

// Independent mixed-practice organization: interleave grammatical buckets sorted
// by English, then deal in alternating directions across 50 lessons. No source
// topic/title/order is used in assignment or naming.
const bucketNames = ['n', 'v', 'adj', 'adv', 'other']
const buckets = new Map(bucketNames.map(bucket => [bucket, kept.filter(card => (bucketNames.slice(0, 4).includes(card.partOfSpeech) ? card.partOfSpeech : 'other') === bucket)
  .sort((a, b) => quizTextKey(a.english).localeCompare(quizTextKey(b.english), 'en') || a.id.localeCompare(b.id))]))
const interleaved = []
while (interleaved.length < kept.length) for (const bucket of bucketNames) {
  const card = buckets.get(bucket).shift()
  if (card) interleaved.push(card)
}
const newGroups = Array.from({ length: 50 }, (_, index) => ({ id: `toeic600-mix-${String(index + 1).padStart(2, '0')}`,
  title: `Bài luyện xen kẽ ${String(index + 1).padStart(2, '0')}`, number: index + 1, cards: [] }))
interleaved.forEach((card, index) => {
  const pass = Math.floor(index / 50), offset = index % 50
  newGroups[pass % 2 ? 49 - offset : offset].cards.push(card)
})
for (const group of newGroups) {
  assert.equal(group.cards.length, 12)
  assert(new Set(group.cards.map(card => card.unitId)).size >= 6, `Insufficient source mixing: ${group.id}`)
}

const issues = []
function issue(card, field, kind, proposedAfter, reason, confidence = 'medium', evidence = []) {
  const before = card[field]
  assert(typeof before === 'string')
  assert(proposedAfter === null || (typeof proposedAfter === 'string' && proposedAfter !== before))
  issues.push({ learningId: learningId(card.id), sourceRecordId: card.id, sourceRow: card.sourceRow, english: card.english,
    field, kind, before, proposedAfter, reason, confidence, evidence, status: 'pending-admin-review', applied: false })
}
const spelling = new Map([
  [267, ['tồng', 'tổng']], [329, ['đếm', 'đến']], [382, ['từng nằm', 'từng năm']],
  [385, ['Chuẩn đoán', 'Chẩn đoán']], [388, ['Quán lý', 'Quản lý']], [398, ['đúng dắn', 'đúng đắn']],
])
const pos = new Map([[17, 'prep.'], [69, 'idiom'], [118, 'n.'], [132, 'adv.'], [155, 'adv.'], [286, 'adv.'], [531, 'adv.']])
const correctionById = new Map(approval.corrections.map(item => [item.flashcardId, item]))
const qualityById = new Map(quality.questions.map(question => [question.id, question]))
const priorityIds = new Set(quality.questions.filter(question => question.promptDecisionRequired).map(question => question.id))
for (const card of kept) {
  const existing = correctionById.get(card.id)
  const evidence = existing?.dictionarySources ?? []
  if (spelling.has(card.sourceRow)) {
    const [before, after] = spelling.get(card.sourceRow)
    assert(card.vietnamese.includes(before))
    issue(card, 'vietnamese', 'minimal-spelling-proposal', card.vietnamese.replace(before, after),
      `Chỉ đề xuất thay “${before}” bằng “${after}”; các phần nghĩa khác giữ nguyên.`, 'high', evidence)
  }
  if (pos.has(card.sourceRow)) issue(card, 'partOfSpeechOriginal', 'pos-proposal', pos.get(card.sourceRow),
    'Nhãn nguồn có dấu hiệu sai/lỗi gõ so với cách dùng đã được rà soát. Chỉ là đề xuất; chưa thay nhãn gốc hay trường ánh xạ.', card.sourceRow === 17 ? 'medium' : 'high', evidence)
  if (card.sourceRow === 69) issue(card, 'vietnamese', 'meaning-proposal', 'Đi đúng hướng để đạt mục tiêu',
    'Nghĩa Theo dõi, đi tìm không khớp cách dùng on track đã được đối chiếu trong hồ sơ duyệt. Đây là một trường hợp cần sửa riêng, không viết lại hàng loạt.', 'high', evidence)
  if (priorityIds.has(card.id)) {
    const decisions = qualityById.get(card.id).sourceIssues.filter(item => item.priority === 'question-decision')
    const field = decisions.every(item => item.category === 'suspect-pos') ? 'partOfSpeechOriginal' : 'vietnamese'
    issue(card, field, 'scope-or-consistency-decision', null,
      decisions.map(item => item.reason).join(' ')
        + ' Không tự cắt bỏ các nghĩa hợp lệ hoặc đổi loại từ khi còn nhiều cách dùng; xem hồ sơ duyệt cũ nếu cần phương án theo ngữ cảnh.', 'medium', evidence)
  }
  if (!card.partOfSpeechOriginal.trim()) issue(card, 'partOfSpeechOriginal', 'missing-pos-review', null,
    'Loại từ đang thiếu. Giữ trống/null, yêu cầu người quản trị xác nhận; không tự điền loại từ.', 'high')
  if (!card.pronunciation.trim()) issue(card, 'pronunciation', 'missing-pronunciation-review', null,
    'Phiên âm đang thiếu. Không tự biên soạn hoặc lấy phiên âm/âm thanh bên ngoài; có thể để trống nếu Quiz không dùng.', 'high')
  const pronunciationConcerns = qualityById.get(card.id).sourceIssues.filter(item => item.category === 'suspect-pronunciation')
  if (pronunciationConcerns.length) issue(card, 'pronunciation', 'pronunciation-review', null,
    pronunciationConcerns.map(item => item.reason).join(' ') + ' Chưa xác nhận bản thay thế; giữ nguyên chuỗi nguồn.', 'medium')
}
const pendingIssueIds = new Set(issues.map(item => item.sourceRecordId))
const sourceSemanticRiskIds = new Set(quality.ambiguityPairs.filter(pair => !pair.sameEnglish).flatMap(pair => [pair.firstId, pair.secondId]))
const publication = { rightsStatus: 'unverified', publishable: false, approvalStatus: 'pending-admin-review' }
const items = newGroups.flatMap(group => group.cards.map(card => ({ id: learningId(card.id), sourceRecordId: card.id,
  sourceRow: card.sourceRow, lessonId: group.id, english: card.english, vietnamese: card.vietnamese,
  partOfSpeech: card.partOfSpeech, partOfSpeechOriginal: card.partOfSpeechOriginal, pronunciation: card.pronunciation,
  sourceReview: structuredClone(card.review), review: {
    status: pendingIssueIds.has(card.id) || card.review.status === 'needs-review' || sourceSemanticRiskIds.has(card.id) ? 'needs-review' : 'unreviewed',
    reasons: [pendingIssueIds.has(card.id) ? 'pending-field-decision' : null, card.review.status === 'needs-review' ? 'source-audit' : null,
      sourceSemanticRiskIds.has(card.id) ? 'known-context-overlap' : null].filter(Boolean), approved: false },
  quizProposal: { status: 'pending-admin-review', suggestedDistractorIds: [] } })))
const itemBySource = new Map(items.map(item => [item.sourceRecordId, item]))
const itemById = new Map(items.map(item => [item.id, item]))
assert.equal(itemById.size, 600)
const blocked = new Map(kept.map(card => [card.id, new Set()]))
const block = (a, b) => { if (blocked.has(a) && blocked.has(b)) { blocked.get(a).add(b); blocked.get(b).add(a) } }
for (const pair of quality.ambiguityPairs) block(pair.firstId, pair.secondId)
for (const pair of approval.supplementalExclusions) block(pair.firstId, pair.secondId)
// Extra conservative context checks for the newly mixed lessons. A displayed
// English option can have other senses than its own source gloss; do not assume
// that a different source gloss alone proves it is a wrong answer.
const extraContextGroups = [
  ['return', 'refund', 'take back'], ['draw', 'take out'], ['file', 'record'], ['stock', 'store'],
  ['function', 'operate', 'run'], ['practice', 'training'], ['lead time', 'duration'],
  ['acquire', 'obtain', 'pick up'], ['prefer', 'favor', 'opt', 'select', 'choose'],
  ['significant', 'crucial', 'integral', 'mandatory', 'prerequisite'],
  ['apprehensive', 'anxious', 'hesitant'], ['eligible', 'pertinent', 'compatible', 'conducive', 'suit'],
  ['cover', 'incorporate', 'constitute'], ['reputation', 'popularity'],
  ['procedure', 'process', 'method', 'system'], ['result', 'consequence', 'impact', 'influence'],
  ['description', 'representation', 'statement'], ['impose', 'obligate', 'require'],
  ['usually', 'commonly', 'frequently', 'regularly', 'constantly'], ['flavor', 'taste'],
  ['minimize', 'narrow', 'deduct', 'subtract'], ['charge', 'expense', 'fare', 'rate'],
  ['quote', 'estimate'], ['thorough', 'in-depth', 'comprehensive'], ['annually', 'periodically'],
  ['expose', 'display', 'present'], ['recommendation', 'suggestion', 'offer'], ['site', 'location', 'position', 'address'],
]
const newContextPairs = []
for (const group of extraContextGroups) {
  const members = kept.filter(card => group.includes(card.english))
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
    const a = members[i], b = members[j]
    if (!blocked.get(a.id).has(b.id)) newContextPairs.push({ sourceIds: [a.id, b.id], learningIds: [learningId(a.id), learningId(b.id)],
      english: [a.english, b.english], status: 'pending-admin-review', classification: 'precautionary-context-review',
      reason: 'Loại thận trọng do nét nghĩa gần nhau hoặc cách dùng khác của từ có thể phù hợp với prompt ngắn. Đây là suy luận rà soát, không kết luận hai từ luôn đồng nghĩa hoặc nguồn phải sửa.' })
    block(a.id, b.id)
    for (const card of [a, b]) {
      const item = itemBySource.get(card.id)
      item.review.status = 'needs-review'
      if (!item.review.reasons.includes('new-mixed-lesson-context-review')) item.review.reasons.push('new-mixed-lesson-context-review')
    }
  }
}
// Suppress matching English across independently regrouped lessons, regardless of sense.
for (const a of kept) for (const b of kept) if (a.id !== b.id && quizTextKey(a.english) === quizTextKey(b.english)) block(a.id, b.id)
const stop = new Set('sự một những các cái người việc của cho được làm có là ở với để cách phần mang tính thuộc về và hoặc theo đến'.split(' '))
const tokens = value => new Set(quizTextKey(value).replace(/\([^)]*\)/g, '').replace(/‹[^›]*›/g, '').match(/[\p{L}]+/gu)?.filter(word => word.length > 1 && !stop.has(word)) ?? [])
const tokenMap = new Map(kept.map(card => [card.id, tokens(card.vietnamese)]))
const englishMap = new Map(kept.map(card => [card.id, quizTextKey(card.english)]))
const meaningMap = new Map(kept.map(card => [card.id, quizTextKey(card.vietnamese)]))
const shareTokens = (a, b) => [...tokenMap.get(a.id)].some(word => tokenMap.get(b.id).has(word))
for (const target of items) {
  const source = sourceById.get(target.sourceRecordId)
  const candidates = items.filter(candidate => candidate.id !== target.id && !priorityIds.has(candidate.sourceRecordId)
    && !blocked.get(source.id).has(candidate.sourceRecordId) && englishMap.get(source.id) !== englishMap.get(candidate.sourceRecordId)
    && meaningMap.get(source.id) !== meaningMap.get(candidate.sourceRecordId) && !shareTokens(source, sourceById.get(candidate.sourceRecordId)))
  const ties = new Map(candidates.map(candidate => [candidate.id, crypto.createHash('sha256').update(`${target.id}:${candidate.id}`).digest('hex')]))
  candidates.sort((a, b) => Number(b.lessonId === target.lessonId) - Number(a.lessonId === target.lessonId)
    || Number(Boolean(b.partOfSpeech && b.partOfSpeech === target.partOfSpeech)) - Number(Boolean(a.partOfSpeech && a.partOfSpeech === target.partOfSpeech))
    || ties.get(a.id).localeCompare(ties.get(b.id)))
  const selected = []
  for (const candidate of candidates) {
    if (selected.some(previous => blocked.get(previous.sourceRecordId).has(candidate.sourceRecordId)
      || englishMap.get(previous.sourceRecordId) === englishMap.get(candidate.sourceRecordId))) continue
    selected.push(candidate)
    if (selected.length === 3) break
  }
  assert.equal(selected.length, 3, `Insufficient proposed options: ${target.id}`)
  target.quizProposal.suggestedDistractorIds = selected.map(item => item.id)
}

const toSimulation = item => ({ id: item.id, lessonId: item.lessonId, english: item.english, vietnamese: item.vietnamese,
  partOfSpeech: item.partOfSpeechOriginal || null,
  quiz: { status: 'proposal-only', answerAliases: [], distractorIds: item.quizProposal.suggestedDistractorIds } })
const pool = items.map(toSimulation)
const holdLearningIds = new Set(items.filter(item => priorityIds.has(item.sourceRecordId)).map(item => item.id))
const conservativePool = pool.filter(item => !holdLearningIds.has(item.id))
const lessonReport = []
let checks = 0
const correctPositions = new Set()
for (const group of newGroups) {
  const eligible = conservativePool.filter(item => item.lessonId === group.id)
  const all = pool.filter(item => item.lessonId === group.id)
  for (let seed = 1; seed <= 10; seed++) {
    let state = seed
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32 }
    const questions = makeQuizQuestions(all, pool, random)
    assert.equal(questions.length, 12)
    for (const question of questions) {
      assert.equal(new Set(question.options.map(option => quizTextKey(option.english))).size, 4)
      assert.equal(question.options.filter(option => option.id === question.correctId).length, 1)
      correctPositions.add(question.options.findIndex(option => option.id === question.correctId))
      for (let i = 0; i < question.options.length; i++) for (let j = i + 1; j < question.options.length; j++) {
        const a = itemById.get(question.options[i].id), b = itemById.get(question.options[j].id)
        assert(!blocked.get(a.sourceRecordId).has(b.sourceRecordId))
      }
      checks++
    }
    const safeQuestions = makeQuizQuestions(eligible, conservativePool, random)
    const round = createQuizRound(safeQuestions, random)
    assert.equal(round.length, Math.min(10, eligible.length))
    assert.equal(new Set(round.map(question => question.id)).size, round.length)
  }
  lessonReport.push({ lessonId: group.id, recordCount: 12, originalSourceUnits: new Set(group.cards.map(card => card.unitId)).size,
    technicalProposalQuestions: 12, contentHoldCount: all.length - eligible.length, contentReviewCandidates: eligible.length,
    maximumRoundSizeWithContentHolds: Math.min(10, eligible.length), actualApprovedQuestions: 0 })
}
assert.equal(correctPositions.size, 4)
const knownRiskPairs = quality.ambiguityPairs.filter(pair => !pair.sameEnglish).map(pair => ({
  sourceIds: [pair.firstId, pair.secondId], learningIds: [itemBySource.get(pair.firstId)?.id ?? null, itemBySource.get(pair.secondId)?.id ?? null],
  english: pair.english, bothRetained: itemBySource.has(pair.firstId) && itemBySource.has(pair.secondId),
  classification: approval.pairReviews.find(item => item.firstId === pair.firstId && item.secondId === pair.secondId)?.category ?? 'pending-review',
  evidence: pair.findings, usedTogetherInProposedOptions: false, status: 'pending-admin-review' }))
const duplicateWords = new Map()
for (const item of items) {
  const key = quizTextKey(item.english)
  if (!duplicateWords.has(key)) duplicateWords.set(key, [])
  duplicateWords.get(key).push({ learningId: item.id, sourceRecordId: item.sourceRecordId, lessonId: item.lessonId })
}
const duplicates = [...duplicateWords].filter(([, records]) => records.length > 1).map(([english, records]) => ({ english, records,
  note: 'Giữ bản ghi riêng theo lựa chọn của người dùng; không coi là các cách viết tiếng Anh khác nhau và không tự khẳng định mọi bản ghi trùng có nghĩa khác nhau.' }))
assert.equal(duplicateWords.size, 595)
assert.equal(duplicates.length, 5)
for (const item of items) {
  const original = sourceById.get(item.sourceRecordId)
  for (const field of ['english', 'vietnamese', 'partOfSpeech', 'partOfSpeechOriginal', 'pronunciation']) assert.deepEqual(item[field], original[field])
  assert.deepEqual(item.sourceReview, original.review)
  assert(item.quizProposal.suggestedDistractorIds.every(id => itemById.has(id)))
}
for (const [file, hash] of Object.entries(inputHashes)) assert.equal(sha(file), hash)

const manifest = { schemaVersion: 1, documentType: 'private-preservation-proposal', title: 'TOEIC 600 — bản đề xuất bảo toàn nguồn',
  publication, countDefinition: '600 bản ghi có ID riêng; 595 cách viết tiếng Anh khác nhau; giữ cả 5 nhóm từ trùng theo lựa chọn người dùng.',
  grouping: 'Bài luyện xen kẽ, phân bổ từ các nhóm loại từ theo thứ tự chữ Anh rồi chia lượt luân phiên; không dùng chủ đề/thứ tự bài gốc để chia bài.',
  lessons: newGroups.map(group => ({ id: group.id, number: group.number, title: group.title, recordCount: 12,
    dataFile: `lessons/${group.id}.json`, reviewStatus: 'pending-admin-review' })) }
const summary = { schemaVersion: 1, documentType: 'private-preservation-review-report', date: '2026-11-17', publication,
  sourceModified: false, originalIdsChanged: false, sourceTextFieldsChangedInSnapshot: 0, correctionsApplied: 0,
  originalRecords: 615, proposedRecords: 600, distinctEnglishSpellings: 595, proposedLessons: 50, recordsPerLesson: 12,
  proposedExclusions: exclusions.length, excludedWithMissingExplanation: exclusions.filter(item => item.explanationMissing).length,
  originalAuditFlaggedRetained: items.filter(item => item.sourceReview.status === 'needs-review').length,
  reviewFlaggedRecords: items.filter(item => item.review.status === 'needs-review').length,
  priorityContentHoldRecords: holdLearningIds.size, recordsWithIssueReview: pendingIssueIds.size, fieldReviewRows: issues.length,
  concreteFieldProposals: issues.filter(item => item.proposedAfter !== null).length,
  contentReviewCandidates: 600 - holdLearningIds.size, actualApprovedQuestions: 0, actualUnlockedLessons: 0,
  lessonsWithTenQuestionsAfterContentHolds: lessonReport.filter(lesson => lesson.maximumRoundSizeWithContentHolds === 10).length,
  fallbackDistractorQuestions: items.filter(item => item.quizProposal.suggestedDistractorIds.some(id => itemById.get(id).lessonId !== item.lessonId)).length,
  minimumOriginalSourceUnitsPerNewLesson: Math.min(...lessonReport.map(lesson => lesson.originalSourceUnits)),
  knownSemanticPairsRetained: knownRiskPairs.filter(pair => pair.bothRetained).length,
  newContextReviewPairs: newContextPairs.length,
  questionChecks: checks, randomSeeds: 10, correctOptionPositionsObserved: [...correctPositions].sort(),
  inputSha256: inputHashes, exclusions, duplicates, lessonReport,
  policy: ['Giữ nguyên nội dung gốc tối đa: không viết lại hàng loạt nghĩa, loại từ, phiên âm. Không áp dụng đề xuất nào.',
    'Tất cả câu/nhiễu là đề xuất chờ duyệt. Một correctId không chứng minh tính duy nhất về ngữ nghĩa; bộ lọc chỉ loại rủi ro đã biết.',
    'Các trường giải thích, ví dụ, bản dịch ví dụ, ảnh, âm thanh và URL media không được đưa vào snapshot học này.',
    '15 mục khớp tên chủ đề chỉ được loại khỏi bản đề xuất; chưa xác minh vai trò trong nguồn hoặc một danh sách TOEIC chuẩn chính thức.',
    'Các mục thiếu/phiên âm nghi vấn không tự bổ sung. Quiz hiện không cần phiên âm nhưng vẫn ghi cờ để rà soát trước khi dùng trường đó.',
    'Quyền tái sử dụng nguồn vẫn chưa xác minh; chia bài lại hoặc cấp ID mới không tự tạo quyền xuất bản.'],
  requiredDecisions: ['Duyệt danh sách 15 mục đề xuất loại; nguồn 615 vẫn nguyên vẹn.',
    'Duyệt các đề xuất trước/sau tối thiểu và lựa chọn ngữ cảnh khi cần; không bắt buộc cắt các nghĩa hợp lệ chỉ để rút gọn.',
    'Duyệt từng bộ ba nhiễu sau cách chia bài mới, đáp án tương đương và các trường hợp mơ hồ còn lại.',
    'Xác minh quyền tái xuất bản trước khi xuất payload, mở khóa hoặc triển khai.'] }

fs.mkdirSync(path.join(out, 'lessons'), { recursive: true })
const writeJson = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', 'utf8')
const csv = rows => '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n'
writeJson('manifest.json', manifest)
writeJson('review-summary.json', summary)
writeJson('id-registry.json', { schemaVersion: 1, namespace: 'english-flashcard:toeic600:v1', identityBasis: 'source record UUID, never English alone or lesson position',
  records: items.map(item => ({ id: item.id, sourceRecordId: item.sourceRecordId })) })
for (const group of newGroups) writeJson(`lessons/${group.id}.json`, { schemaVersion: 1, lessonId: group.id, publication,
  items: items.filter(item => item.lessonId === group.id) })
fs.writeFileSync(path.join(out, 'excluded-15.csv'), csv([['sourceRecordId', 'sourceRow', 'sourceUnitId', 'sourceTopic', 'english', 'matchingRule', 'sourcePosition', 'explanationMissing', 'rationale', 'confidence', 'status'],
  ...exclusions.map(item => [item.sourceRecordId, item.sourceRow, item.sourceUnitId, item.sourceTopic, item.english, item.matchingRule, item.sourcePosition, item.explanationMissing, item.rationale, item.confidence, item.selectionStatus])]), 'utf8')
fs.writeFileSync(path.join(out, 'retained-600.csv'), csv([['learningId', 'sourceRecordId', 'sourceRow', 'lessonId', 'english', 'vietnameseOriginal', 'partOfSpeechOriginal', 'partOfSpeechMappedOriginal', 'pronunciationOriginal', 'sourceReviewStatus', 'reviewStatus'],
  ...items.map(item => [item.id, item.sourceRecordId, item.sourceRow, item.lessonId, item.english, item.vietnamese, item.partOfSpeechOriginal, item.partOfSpeech, item.pronunciation, item.sourceReview.status, item.review.status])]), 'utf8')
fs.writeFileSync(path.join(out, 'minimal-corrections.csv'), csv([['learningId', 'sourceRecordId', 'sourceRow', 'english', 'field', 'kind', 'before', 'proposedAfter', 'hasConcreteProposal', 'reason', 'confidence', 'evidence', 'status', 'applied', 'adminDecision'],
  ...issues.map(item => [item.learningId, item.sourceRecordId, item.sourceRow, item.english, item.field, item.kind, item.before, item.proposedAfter, item.proposedAfter !== null, item.reason, item.confidence, item.evidence.join(' | '), item.status, false, ''])]), 'utf8')
writeJson('ambiguity-review.json', { documentType: 'private-review-only', publication,
  knownRiskPairs, newContextPairs, contextGroupsUsed: extraContextGroups,
  additionalExcludedSourcePairs: approval.supplementalExclusions.filter(pair => itemBySource.has(pair.firstId) && itemBySource.has(pair.secondId)),
  questions: items.map(item => ({ id: item.id, sourceRecordId: item.sourceRecordId, english: item.english, vietnamese: item.vietnamese, partOfSpeechOriginal: item.partOfSpeechOriginal,
    contentDecisionRequired: holdLearningIds.has(item.id), status: 'pending-admin-review',
    proposedOptions: [item.id, ...item.quizProposal.suggestedDistractorIds].map(id => { const option = itemById.get(id); return { id: option.id, sourceRecordId: option.sourceRecordId, english: option.english, vietnamese: option.vietnamese } }),
    correctId: item.id, semanticUniquenessCertified: false })) })
console.log(JSON.stringify({ records: summary.proposedRecords, distinctEnglish: summary.distinctEnglishSpellings, lessons: 50,
  excluded: 15, missingExplanationInExclusions: summary.excludedWithMissingExplanation, sourceTextChanges: 0,
  concreteProposals: summary.concreteFieldProposals, pendingContentDecisions: summary.priorityContentHoldRecords,
  fieldReviewRecords: summary.recordsWithIssueReview, fieldReviewRows: summary.fieldReviewRows,
  tenQuestionLessonsAfterHolds: summary.lessonsWithTenQuestionsAfterContentHolds,
  minSourceUnitsPerNewLesson: summary.minimumOriginalSourceUnitsPerNewLesson,
  fallbackQuestions: summary.fallbackDistractorQuestions, checks: summary.questionChecks }, null, 2))
