/** Read-only source audit. Writes review reports only; never exports playable data. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'
import { validateManifest, validateUnitData } from '../src/services/unitLoader.ts'
import { makeQuizQuestions, createQuizRound, quizTextKey } from '../src/utils/toeicQuiz.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = path.join(root, 'data-preparation/toeic')
const output = path.join(root, 'reports/toeic-quality')
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const inputs = ['manifest.json', 'audit.json', 'manual-review.json', 'id-registry.json']
const manifest = read(path.join(source, 'manifest.json'))
const units = validateManifest(manifest)
assert.equal(units.length, 50)
const lessons = units.map(unit => {
  const relative = `units/${unit.id}.json`
  inputs.push(relative)
  return { unit, data: validateUnitData(read(path.join(source, relative)), unit) }
})
const hashes = Object.fromEntries(inputs.map(file => [file, sha(path.join(source, file))]))
const cards = lessons.flatMap(lesson => lesson.data.flashcards)
assert.equal(cards.length, 615)
assert.equal(new Set(cards.map(card => card.id)).size, 615)
const byId = new Map(cards.map(card => [card.id, card]))
const byRow = new Map(cards.map(card => [card.sourceRow, card]))
const audit = read(path.join(source, 'audit.json'))
assert.equal(sha(path.join(root, 'toeic_600_words.csv')), audit.source.sha256)
const manual = read(path.join(source, 'manual-review.json'))
const registry = read(path.join(source, 'id-registry.json'))
const notes = read(path.join(output, 'review-notes.json'))
assert.deepEqual(new Set(Object.values(registry.cards)), new Set(cards.map(card => card.id)))
assert.equal(audit.validRecords, cards.length)
assert.deepEqual(units.map(unit => unit.id), audit.lessons.map(lesson => lesson.id))
for (const { unit, data } of lessons) {
  assert.equal(registry.lessons[unit.title], unit.id)
  assert.equal(data.flashcards.length, audit.lessons.find(lesson => lesson.id === unit.id).count)
  assert.equal(data.publication.publishable, false)
}
const originalFlagged = cards.filter(card => card.review.status === 'needs-review')
assert.equal(originalFlagged.length, 88)
assert.deepEqual(new Set(audit.reviews.map(review => review.id)), new Set(originalFlagged.map(card => card.id)))
for (const card of originalFlagged) assert.deepEqual(card.review.issues, audit.reviews.find(review => review.id === card.id).issues)
for (const note of manual) {
  const card = cards.find(card => card.source.topic === note.topic && card.english === note.english)
  assert(card, `Unmatched manual note: ${note.english}`)
  for (const issue of note.issues) assert(card.review.issues.some(candidate => candidate.reason === issue.reason))
}

// Execute the current loader's validators, without a browser/server or changing source.
const loaderSource = fs.readFileSync(path.join(root, 'src/services/toeicQuizLoader.ts'), 'utf8')
const loaderJs = stripTypeScriptTypes(loaderSource)
  .replaceAll("'../utils/toeicQuiz'", JSON.stringify(new URL('../src/utils/toeicQuiz.ts', import.meta.url).href))
const { validateQuizLesson } = await import(`data:text/javascript;base64,${Buffer.from(loaderJs).toString('base64')}`)
const actualContractRejectedLessons = lessons.filter(({ unit, data }) => {
  try { validateQuizLesson(data, 'toeic-vocabulary', unit.id); return false } catch { return true }
}).length

const categoryFor = issue => {
  if (issue.code === 'missing-field') return 'missing-data'
  if (issue.code === 'duplicate-english') return 'duplicate-english'
  if (issue.code === 'outer-whitespace') return 'formatting'
  if (issue.code === 'unsupported-pos' || issue.field === 'type') return 'suspect-pos'
  if (issue.field === 'vietnamese') return 'suspect-meaning'
  if (issue.field === 'pronounce') return 'suspect-pronunciation'
  return 'auxiliary'
}
const priorityFor = issue => {
  if (issue.code === 'manual-review' && ['type', 'vietnamese'].includes(issue.field)) return 'question-decision'
  if (issue.code === 'unsupported-pos') return 'question-decision'
  return ['pronounce', 'explain', 'example', 'example_vietnamese'].includes(issue.field) ? 'auxiliary-warning' : 'warning'
}
const issuesById = new Map(cards.map(card => [card.id, card.review.issues.map(issue => ({
  origin: 'existing-audit', category: categoryFor(issue), priority: priorityFor(issue), field: issue.field, reason: issue.reason,
}))]))
for (const note of notes.notes) {
  const card = byRow.get(note.sourceRow)
  assert(card, `Unknown source row: ${note.sourceRow}`)
  issuesById.get(card.id).push({ origin: 'additional-review', ...note })
}
const questionDecisionIds = new Set(cards.filter(card => issuesById.get(card.id).some(issue => issue.priority === 'question-decision')).map(card => card.id))
const originalCategoryCounts = Object.fromEntries(['missing-data', 'duplicate-english', 'suspect-pos', 'suspect-meaning', 'suspect-pronunciation', 'formatting', 'auxiliary'].map(category => [category,
  originalFlagged.filter(card => card.review.issues.some(issue => categoryFor(issue) === category)).length]))

const meaningKey = value => quizTextKey(value).replace(/[.,;]+$/g, '').trim()
// Detection keys only. The original Vietnamese text is never modified.
const glossParts = value => new Set(meaningKey(value).replace(/\([^)]*\)/g, '').replace(/‹[^›]*›/g, '')
  .split(/[,;/]/).map(fragment => fragment.replace(/^\s*sự\s+/, '').trim()).filter(fragment => fragment.length >= 4))
const posCompatible = (a, b) => !a.partOfSpeech || !b.partOfSpeech || a.partOfSpeech.split('/').some(part => b.partOfSpeech.split('/').includes(part))
const pairs = new Map()
function addPair(a, b, kind, evidence) {
  if (a.id === b.id) return
  const [first, second] = a.sourceRow < b.sourceRow ? [a, b] : [b, a]
  const key = `${first.id}|${second.id}`
  if (!pairs.has(key)) pairs.set(key, { firstId: first.id, secondId: second.id,
    sourceRows: [first.sourceRow, second.sourceRow], english: [first.english, second.english],
    lessonIds: [first.unitId, second.unitId], sameLesson: first.unitId === second.unitId,
    sameEnglish: quizTextKey(first.english) === quizTextKey(second.english), findings: [] })
  if (!pairs.get(key).findings.some(item => item.kind === kind && item.evidence === evidence)) pairs.get(key).findings.push({ kind, evidence })
}
for (let i = 0; i < cards.length; i++) {
  const a = cards[i]
  const fragments = glossParts(a.vietnamese)
  for (let j = i + 1; j < cards.length; j++) {
    const b = cards[j]
    if (quizTextKey(a.english) === quizTextKey(b.english)) addPair(a, b, 'duplicate-english', 'Chữ tiếng Anh trùng sau chuẩn hóa; không được xuất hiện thành hai lựa chọn.')
    if (meaningKey(a.vietnamese) === meaningKey(b.vietnamese)) addPair(a, b, 'same-full-meaning', a.vietnamese.trim())
    if (posCompatible(a, b)) {
      for (const fragment of glossParts(b.vietnamese)) {
        if (fragments.has(fragment)) addPair(a, b, 'shared-gloss-fragment', fragment)
      }
    }
  }
}
for (const group of notes.contextRiskGroups) {
  const members = cards.filter(card => group.english.includes(card.english))
  assert.deepEqual(new Set(members.map(card => card.english)), new Set(group.english))
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) addPair(members[i], members[j], 'context-risk', group.reason)
}
const conflictPairs = [...pairs.values()].sort((a, b) => a.sourceRows[0] - b.sourceRows[0] || a.sourceRows[1] - b.sourceRows[1])
const semanticPairs = conflictPairs.filter(pair => !pair.sameEnglish)
const semanticQuestionIds = new Set(semanticPairs.flatMap(pair => [pair.firstId, pair.secondId]))
const blocked = new Map(cards.map(card => [card.id, new Set()]))
for (const pair of conflictPairs) {
  blocked.get(pair.firstId).add(pair.secondId)
  blocked.get(pair.secondId).add(pair.firstId)
}

// NOT approvals. These transient objects stress-test the generator only. No playable
// payload, alias list, or approved whitelist is saved by this script.
const simulationPool = cards.map(card => ({ id: card.id, lessonId: card.unitId, english: card.english,
  vietnamese: card.vietnamese, partOfSpeech: card.partOfSpeechOriginal || null,
  quiz: { status: 'diagnostic-only', answerAliases: [], distractorIds: cards.filter(candidate => candidate.id !== card.id
    && !blocked.get(card.id).has(candidate.id)).map(candidate => candidate.id) } }))
const heldPool = simulationPool.filter(entry => !questionDecisionIds.has(entry.id))
const simulations = []
let checkedQuestions = 0
const positions = new Set()
for (let seed = 1; seed <= 20; seed++) {
  let state = seed
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32 }
  for (const { unit, data } of lessons) {
    const entries = simulationPool.filter(entry => entry.lessonId === unit.id)
    const generated = makeQuizQuestions(entries, simulationPool, random)
    assert.equal(generated.length, data.flashcards.length)
    for (const question of generated) {
      assert.equal(question.options.length, 4)
      assert.equal(new Set(question.options.map(option => quizTextKey(option.english))).size, 4)
      assert.equal(question.options.filter(option => option.id === question.correctId).length, 1)
      positions.add(question.options.findIndex(option => option.id === question.correctId))
      for (const option of question.options) {
        assert(byId.has(option.id))
        assert(!blocked.get(question.id).has(option.id))
      }
      checkedQuestions++
    }
    const round = createQuizRound(generated, random)
    assert.equal(round.length, 10)
    assert.equal(new Set(round.map(question => question.id)).size, 10)
    if (seed === 1) {
      const afterHold = makeQuizQuestions(heldPool.filter(entry => entry.lessonId === unit.id), heldPool, random)
      simulations.push({ lessonId: unit.id, title: unit.title, sourceRecords: data.flashcards.length,
        actualApprovedQuestions: 0, diagnosticQuestions: generated.length, diagnosticQuestionsAfterHoldingPromptIssues: afterHold.length,
        sourceFlaggedRecords: data.flashcards.filter(card => card.review.status === 'needs-review').length,
        promptDecisionRecords: data.flashcards.filter(card => questionDecisionIds.has(card.id)).length,
        semanticRiskRecords: data.flashcards.filter(card => semanticQuestionIds.has(card.id)).length,
        minLocalCandidateCount: Math.min(...entries.map(entry => entries.filter(candidate => entry.id !== candidate.id
          && !blocked.get(entry.id).has(candidate.id) && quizTextKey(candidate.english) !== quizTextKey(entry.english)).length)) })
    }
  }
  if (seed % 5 === 0) console.error(`Diagnostic seed ${seed}/20 complete; no source changes.`)
}
assert.equal(positions.size, 4)

// Prove the existing generator does not infer partial semantic overlap. Force a
// risky pair plus two harmless-by-detection IDs into a hypothetical allowlist.
const bypassExamples = semanticPairs.filter(pair => pair.sameLesson).map(pair => {
  const a = simulationPool.find(entry => entry.id === pair.firstId)
  const b = simulationPool.find(entry => entry.id === pair.secondId)
  const others = simulationPool.filter(entry => entry.lessonId === a.lessonId && entry.id !== a.id && entry.id !== b.id
    && !blocked.get(a.id).has(entry.id)).slice(0, 2)
  const probe = { ...a, quiz: { ...a.quiz, distractorIds: [b.id, ...others.map(entry => entry.id)] } }
  const result = makeQuizQuestions([probe], [probe, b, ...others], () => 0.5)
  return { ...pair, riskyOptionPassesWithNaiveAllowlist: result.some(question => question.options.some(option => option.id === b.id)) }
})

const originalIds = new Set(originalFlagged.map(card => card.id))
const flaggedNow = cards.filter(card => issuesById.get(card.id).length > 0 || semanticQuestionIds.has(card.id))
const classify = card => [...new Set(issuesById.get(card.id).map(issue => issue.category))]
const questionRows = cards.map(card => ({ id: card.id, lessonId: card.unitId, sourceRow: card.sourceRow,
  english: card.english, vietnamese: card.vietnamese, partOfSpeechOriginal: card.partOfSpeechOriginal,
  pronunciation: card.pronunciation, explanation: card.explanation, example: card.example, exampleTranslation: card.exampleTranslation,
  originalReviewStatus: card.review.status, originalAuditFlagged: originalIds.has(card.id), categories: classify(card),
  promptDecisionRequired: questionDecisionIds.has(card.id), sourceIssues: issuesById.get(card.id),
  semanticConflictIds: [...blocked.get(card.id)].filter(id => semanticQuestionIds.has(card.id) && quizTextKey(byId.get(id).english) !== quizTextKey(card.english)),
  diagnosticLocalCandidates: simulationPool.filter(candidate => candidate.lessonId === card.unitId && candidate.id !== card.id
    && !blocked.get(card.id).has(candidate.id)).length,
  approvalStatus: 'not-approved', adminDecision: '', approvedDistractorIds: '', adminComment: '' }))

const report = {
  schemaVersion: 1, reportDate: '2026-11-17', status: 'private-review-only', publicationAllowed: false,
  method: 'Đọc toàn bộ bản ghi, đối chiếu registry/audit/manual; dò chuỗi nghĩa + nhóm ngữ cảnh và mô phỏng generator hiện có. Không xác minh ngôn ngữ bằng từ điển; không cấp quyền hay duyệt câu.',
  inputs: hashes, sourceCsvSha256: audit.source.sha256,
  summary: { records: cards.length, lessons: units.length, originalFlaggedRecords: originalFlagged.length,
    originalCategoryCounts, originalIssueCount: originalFlagged.reduce((total, card) => total + card.review.issues.length, 0),
    actualReadyLessons: 0, actualApprovedQuestions: 0, actualContractRejectedLessons,
    diagnosticLessonsWithFourOptions: simulations.filter(lesson => lesson.diagnosticQuestions > 0).length,
    diagnosticQuestions: simulations.reduce((sum, lesson) => sum + lesson.diagnosticQuestions, 0),
    diagnosticLessonsWithTenAfterHoldingPromptIssues: simulations.filter(lesson => lesson.diagnosticQuestionsAfterHoldingPromptIssues >= 10).length,
    diagnosticQuestionsAfterHoldingPromptIssues: simulations.reduce((sum, lesson) => sum + lesson.diagnosticQuestionsAfterHoldingPromptIssues, 0),
    promptDecisionRecords: questionDecisionIds.size,
    originalFlaggedPromptDecisionRecords: [...questionDecisionIds].filter(id => originalIds.has(id)).length,
    flaggedRecordsIncludingNewWarningsAndRisks: flaggedNow.length,
    newlyFlaggedBeyondOriginalAudit: flaggedNow.filter(card => !originalIds.has(card.id)).length,
    candidateSemanticPairs: semanticPairs.length, candidateSemanticRiskRecords: semanticQuestionIds.size,
    sameLessonCandidateSemanticPairs: semanticPairs.filter(pair => pair.sameLesson).length,
    crossLessonCandidateSemanticPairs: semanticPairs.filter(pair => !pair.sameLesson).length,
    duplicateEnglishGroups: audit.duplicateEnglish.length,
    randomSeeds: 20, generatedQuestionsChecked: checkedQuestions, correctOptionPositionsObserved: [...positions].sort() },
  mandatoryDecisions: ['Xác minh quyền tái xuất bản văn bản và ghi tài liệu tham chiếu.',
    'Duyệt nghĩa hỏi/nhãn loại từ của các bản ghi promptDecisionRequired hoặc tạm loại khỏi payload Quiz.',
    'Duyệt câu và ít nhất ba distractorIds thực sự sai cho từng nghĩa; khai báo answerAliases, không tự chuyển báo cáo này thành whitelist.',
    'Xử lý từng cặp nghĩa chồng lấn khi chọn nhiễu, đặc biệt fallback khác bài; không nhất thiết phải sửa văn bản nếu loại nhiễu chéo.',
    'Xuất payload đúng hợp đồng Quiz bằng bước được ủy quyền sau khi có quyền và duyệt nội dung; giữ ID nguồn.'],
  warnings: ['Thiếu loại từ có thể để null nếu người quản trị chấp nhận không hiển thị nhãn; không tự suy đoán.',
    'Thiếu/sai phiên âm, giải thích và ví dụ không chặn Quiz tối giản hiện tại vì UI không hiển thị các trường đó; phải duyệt nếu dùng về sau.',
    'Khoảng trắng và từ trùng ở các bài khác nhau không buộc xóa/gộp bản ghi; phải loại lựa chọn trùng.',
    'Dò phần nghĩa giống nhau có thể báo nhầm và bỏ sót; số lượng cặp không phải danh sách đồng nghĩa đã xác nhận.',
    '527 bản ghi không có cờ cũ không đồng nghĩa đã được kiểm chứng. Không khẳng định số câu chắc chắn sai khi chưa có người duyệt.'],
  logicFindings: ['Bộ lọc hiện có chặn chữ trùng, alias đã khai báo và toàn bộ prompt trùng; không tự chặn mọi phần nghĩa trùng.',
    'makeQuizQuestions tự thân không kiểm tra approval/status: các caller ứng dụng phải tiếp tục đi qua loader đã kiểm tra quyền và nội dung.',
    'Mỗi correctId chỉ xuất hiện một lần là tính đúng về ID, không chứng minh chỉ một lựa chọn đúng về nghĩa.',
    'Các phép mô phỏng dùng status diagnostic-only trong bộ nhớ; không tạo dữ liệu approved, không tải media và không ghi payload vào public/dist.'],
  lessons: simulations, existingFlaggedRecords: questionRows.filter(row => row.originalAuditFlagged),
  additionalReviewNotes: notes, ambiguityPairs: conflictPairs, sameLessonGeneratorProbes: bypassExamples,
  questions: questionRows,
}

// Verify source immutability before writing any report artifacts.
for (const [relative, expected] of Object.entries(hashes)) assert.equal(sha(path.join(source, relative)), expected)
const writeJson = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', 'utf8')
const csv = rows => '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n'
const tableEscape = text => String(text).replaceAll('|', '\\|').replaceAll('\n', ' ')
const categories = { 'missing-data': 'Thiếu dữ liệu', 'duplicate-english': 'Từ trùng', 'suspect-pos': 'Loại từ nghi vấn',
  'suspect-meaning': 'Nghĩa nghi vấn', 'suspect-pronunciation': 'Phiên âm nghi vấn', formatting: 'Định dạng', auxiliary: 'Giải thích/ví dụ' }
writeJson('report.json', report)
const header = ['id', 'lessonId', 'sourceRow', 'english', 'vietnameseOriginal', 'partOfSpeechOriginal', 'originalAuditFlagged',
  'categories', 'promptDecisionRequired', 'issues', 'semanticConflictIds', 'diagnosticLocalCandidates', 'approvalStatus', 'adminDecision', 'approvedDistractorIds', 'adminComment']
const csvRows = records => [header, ...records.map(row => [row.id, row.lessonId, row.sourceRow, row.english, row.vietnamese, row.partOfSpeechOriginal,
  row.originalAuditFlagged, row.categories.join('; '), row.promptDecisionRequired,
  row.sourceIssues.map(issue => `[${issue.origin}/${issue.priority}] ${issue.field}: ${issue.reason}`).join(' | '),
  row.semanticConflictIds.join('; '), row.diagnosticLocalCandidates, row.approvalStatus, '', '', ''])]
fs.writeFileSync(path.join(output, 'existing-88.csv'), csv(csvRows(report.existingFlaggedRecords)), 'utf8')
fs.writeFileSync(path.join(output, 'question-approval.csv'), csv(csvRows(questionRows)), 'utf8')
const summary = report.summary
const md = [
  '# Rà soát chất lượng TOEIC Quiz — 17/11/2026', '',
  '**Chỉ dùng rà soát cục bộ. Không phải dữ liệu đã duyệt. Không xuất bản báo cáo chứa nội dung nguồn này lên website/kho công khai.**', '',
  `Đã đọc và đối chiếu **${summary.records} bản ghi / ${summary.lessons} bài**, manifest, registry, audit, manual-review và toàn bộ 50 file bài. Nguồn/ID/cờ được giữ nguyên.`, '',
  '## Kết quả cần phân biệt', '',
  '| Chỉ số | Kết quả |', '| --- | --- |',
  `| Bài/câu sẵn sàng theo hợp đồng Quiz thật và điều kiện xuất bản | **0 bài / 0 câu** |`,
  `| Bài đủ dữ liệu hình thức để mô phỏng bốn lựa chọn | **${summary.diagnosticLessonsWithFourOptions}/50 bài, ${summary.diagnosticQuestions} câu** |`,
  `| Sau khi tạm giữ các prompt/loại từ nghi vấn | ${summary.diagnosticQuestionsAfterHoldingPromptIssues} câu mô phỏng; ${summary.diagnosticLessonsWithTenAfterHoldingPromptIssues}/50 bài còn đủ 10 câu/lượt |`,
  `| Bản ghi có cờ trong audit gốc | **88**, giữ nguyên |`,
  `| Câu cần quyết định riêng về nghĩa hỏi/loại từ | **${summary.promptDecisionRecords}**; không đồng nghĩa chắc chắn phải sửa |`,
  `| Cặp tiếng Anh khác nhau có nguy cơ chồng nghĩa | ${summary.candidateSemanticPairs} cặp, ảnh hưởng ${summary.candidateSemanticRiskRecords} câu; ${summary.sameLessonCandidateSemanticPairs} cặp cùng bài |`,
  `| Tổng bản ghi có cờ/rủi ro sau mở rộng | ${summary.flaggedRecordsIncludingNewWarningsAndRisks}; thêm ${summary.newlyFlaggedBeyondOriginalAudit} ngoài 88 cũ |`, '',
  'Số câu **chắc chắn phải sửa** chưa thể kết luận khi chưa có quản trị viên duyệt. Các số mô phỏng chỉ đo số lựa chọn khác nhau theo chuỗi và bộ lọc rủi ro đã phát hiện, không chứng minh tính duy nhất về ngữ nghĩa. Cả 615 câu vẫn cần duyệt nội dung, đáp án tương đương và nhiễu. Không mặc định 527 bản ghi ngoài 88 cũ là đúng.', '',
  '## Phân loại 88 bản ghi gốc', '',
  '| Nhóm | Số bản ghi |', '| --- | --- |',
  ...Object.entries(originalCategoryCounts).map(([category, count]) => `| ${categories[category]} | ${count} |`), '',
  `Các nhóm có thể chồng nhau: ${summary.originalIssueCount} lượt cờ, không phải ${summary.originalIssueCount} bản ghi. Thiếu dữ liệu gồm 3 loại từ, 5 phiên âm, 29 giải thích; không thiếu chữ Anh/nghĩa Việt/chủ đề/ví dụ/bản dịch ví dụ. Danh sách đúng 88 hàng ở [existing-88.csv](existing-88.csv).`, '',
  '## Bắt buộc giải quyết trước khi mở bài', '',
  ...report.mandatoryDecisions.map((item, i) => `${i + 1}. ${item}`), '',
  'Quyết định có thể là xác nhận nguyên văn, biên tập có ghi nhận hoặc tạm loại khỏi payload công khai. Báo cáo không tự sửa trường nào và không ghi quyết định thay người quản trị.', '',
  '## Cảnh báo và giới hạn', '',
  ...report.warnings.map(item => `- ${item}`), '',
  '## Các prompt/loại từ ưu tiên duyệt', '',
  '| Hàng CSV | Bài | Từ | Lý do cần quyết định |', '| --- | --- | --- | --- |',
  ...questionRows.filter(row => row.promptDecisionRequired).map(row => `| ${row.sourceRow} | ${row.lessonId} | ${tableEscape(row.english)} | ${tableEscape(row.sourceIssues.filter(issue => issue.priority === 'question-decision').map(issue => issue.reason).join(' '))} |`), '',
  '## Nguy cơ nhiều đáp án đúng trong cùng bài', '',
  '| Bài | Hai từ | Bằng chứng từ nghĩa nguồn | Có thể lọt bộ lọc nếu nhiễu chưa được đối chiếu? |', '| --- | --- | --- | --- |',
  ...bypassExamples.map(pair => `| ${pair.lessonIds[0]} | ${pair.english.join(' ↔ ')} | ${tableEscape(pair.findings.map(item => item.evidence).join('; '))} | ${pair.riskyOptionPassesWithNaiveAllowlist ? 'Có — mô phỏng đã tái hiện' : 'Không — bộ lọc hiện có đã chặn'} |`), '',
  'Ở khác bài, location và position có toàn bộ nghĩa Vị trí giống nhau (bộ lọc hiện có chặn). Các phần nghĩa chồng lấn khác chỉ được nhận diện trong báo cáo, không tự cập nhật alias/whitelist của ứng dụng. Fallback khác bài phải được duyệt chặt như nhiễu cùng bài. Danh sách đầy đủ, ID và bằng chứng nằm ở `report.json → ambiguityPairs`.', '',
  '## Khả năng từng Lesson (mô phỏng, chưa duyệt)', '',
  '| Bài | Chủ đề | Bản ghi | Câu mô phỏng | Còn lại khi giữ prompt nghi vấn | Nhiễu cùng bài ít nhất sau loại rủi ro | Cờ gốc |', '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
  ...simulations.map(lesson => `| ${lesson.lessonId} | ${tableEscape(lesson.title)} | ${lesson.sourceRecords} | ${lesson.diagnosticQuestions} | ${lesson.diagnosticQuestionsAfterHoldingPromptIssues} | ${lesson.minLocalCandidateCount} | ${lesson.sourceFlaggedRecords} |`), '',
  '## Kiểm tra logic', '',
  `Dùng trực tiếp makeQuizQuestions/createQuizRound hiện có qua Node, 20 seed cho cả 50 bài: ${checkedQuestions} câu mô phỏng được kiểm tra. Đúng 4 chữ Anh khác nhau, đúng một correctId, không có cặp rủi ro đã phát hiện trong lựa chọn, không lấy từ ngoài 615 bản ghi, lượt 10 câu không lặp; vị trí đúng có đủ A/B/C/D. Đây không phải xác nhận nghĩa đúng duy nhất.`, '',
  ...report.logicFindings.map(item => `- ${item}`), '',
  '## Hồ sơ để quản trị viên duyệt', '',
  '- [existing-88.csv](existing-88.csv): đúng 88 bản ghi cờ cũ, kèm phân loại và nhận xét bổ sung.',
  '- [question-approval.csv](question-approval.csv): toàn bộ 615 câu, ID/hàng nguồn, vấn đề và ID có nguy cơ chồng nghĩa. Các cột quyết định/ID nhiễu đã duyệt/ghi chú để trống.',
  '- [report.json](report.json): kết quả có cấu trúc, 50 bài, 615 câu, cặp rủi ro, phép thử bộ lọc và SHA-256 đầu vào.',
  '- [review-notes.json](review-notes.json): nhận xét bổ sung và nhóm ngữ cảnh; tất cả pending-admin-review, không phải quyết định sửa.', '',
  'Các file chỉ là báo cáo, không đọc ngược vào ứng dụng hoặc chuyển thẳng thành whitelist. Sau khi có quyền và hoàn tất duyệt mới có thể thực hiện bước xuất payload hợp đồng Quiz riêng. Không thay đổi public, production build, Unit 2/3, Flashcard ID hay LocalStorage; không push/deploy.', '',
  'Tái tạo bằng `node scripts/report-toeic-quality.mjs` (Node 24). Script chỉ ghi các báo cáo ở reports/toeic-quality và kiểm tra nguồn không đổi trước khi ghi.', '',
].join('\n')
fs.writeFileSync(path.join(output, 'README.md'), md, 'utf8')
console.log(JSON.stringify(summary, null, 2))
