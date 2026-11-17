/** Independent invariant, negative, and native Quiz tests for the private fixture. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { makeQuizQuestions, createQuizRound, gradeQuizAnswer, quizTextKey } from '../src/utils/toeicQuiz.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const privateRoot = path.join(root, 'data-internal/toeic-600')
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'))
const manifest = read('data-internal/toeic-600/manifest.json')
const summary = read('data-internal/toeic-600/application-report.json')
const plan = read('data-internal/toeic-600/review-plan.json')
const registry = read('data-proposals/toeic-600/id-registry.json')
const registryBySource = new Map(registry.records.map(item => [item.sourceRecordId, item.id]))
const sourceManifest = read('data-preparation/toeic/manifest.json')
const sourceCards = sourceManifest.units.flatMap(unit => read(`data-preparation/toeic/units/${unit.id}.json`).flashcards)
const source = new Map(sourceCards.map(card => [card.id, card]))
const lessons = manifest.lessons.map(lesson => read(`data-internal/toeic-600/${lesson.dataFile}`))
const entries = lessons.flatMap(lesson => lesson.entries)
const byId = new Map(entries.map(entry => [entry.id, entry]))
const bySource = new Map(entries.map(entry => [entry.sourceRecordId, entry]))
const reviewed = read('data-internal/toeic-600/distractor-review.json').reviewedQuestions
const reviewedBySource = new Map(reviewed.map(question => [question.sourceRecordId, question]))
const heldIds = new Set(plan.heldFields.map(item => item.sourceRecordId))
const ledger = read('data-internal/toeic-600/approval-ledger.json').rows
const confirmedIds = new Set(ledger.map(row => row.sourceRecordId))
const changes = new Map()
for (const row of ledger) for (const change of row.fieldChanges) {
  const key = `${row.sourceRecordId}:${change.field}`
  if (changes.has(key)) assert.deepEqual(changes.get(key), change)
  changes.set(key, change)
}
const oldRisks = read('data-proposals/toeic-600/ambiguity-review.json')
const pairKey = (a, b) => [a, b].sort().join('|')
const blocked = new Set([
  ...oldRisks.knownRiskPairs.filter(pair => pair.bothRetained).map(pair => pairKey(...pair.sourceIds)),
  ...oldRisks.newContextPairs.map(pair => pairKey(...pair.sourceIds)),
  ...oldRisks.additionalExcludedSourcePairs.map(pair => pairKey(pair.firstId, pair.secondId)),
])
for (const pair of read('data-internal/toeic-600/distractor-review.json').additionalBlockedPairs) {
  for (const a of entries.filter(entry => entry.english === pair.first))
    for (const b of entries.filter(entry => entry.english === pair.second)) blocked.add(pairKey(a.sourceRecordId, b.sourceRecordId))
}

function validateFixture(candidateEntries) {
  assert.equal(candidateEntries.length, 600)
  assert.equal(new Set(candidateEntries.map(entry => entry.id)).size, 600)
  assert.equal(new Set(candidateEntries.map(entry => entry.sourceRecordId)).size, 600)
  const candidateMap = new Map(candidateEntries.map(entry => [entry.id, entry]))
  for (const entry of candidateEntries) {
    const card = source.get(entry.sourceRecordId)
    assert(card)
    assert.equal(entry.id, registryBySource.get(card.id))
    assert.equal(entry.english, card.english)
    assert.equal(entry.pronunciation, card.pronunciation, 'pronunciation was not authorized for edits')
    for (const field of Object.keys(entry.sourceSnapshot)) assert.deepEqual(entry.sourceSnapshot[field], card[field])
    assert.deepEqual(Object.keys(entry.sourceSnapshot).sort(), ['id', 'sourceRow', 'unitId', 'english', 'vietnamese',
      'partOfSpeech', 'partOfSpeechOriginal', 'pronunciation', 'review'].sort())
    for (const field of ['vietnamese', 'partOfSpeech']) {
      const change = changes.get(`${card.id}:${field}`)
      const original = field === 'partOfSpeech' ? card.partOfSpeechOriginal || null : card[field]
      if (change) assert.equal(change.before, field === 'partOfSpeech' ? card.partOfSpeechOriginal : card[field])
      assert.equal(entry[field], change?.after ?? original, `unauthorized ${field} change on ${card.id}`)
    }
    assert.equal(entry.review.sourceAuditResolvedAutomatically, false)
    const shouldBeReady = confirmedIds.has(card.id) && !heldIds.has(card.id) && reviewedBySource.has(card.id)
      && !summary.conflicts.some(conflict => conflict.sourceRecordId === card.id)
    assert.equal(entry.quiz.status === 'internal-ready', shouldBeReady)
    if (!shouldBeReady) {
      assert(entry.review.pendingReasons.length > 0)
      assert.deepEqual(entry.quiz.distractorIds, [])
      continue
    }
    assert.equal(entry.review.status, 'ready-for-internal-question')
    assert.deepEqual(entry.review.pendingReasons, [])
    const review = reviewedBySource.get(card.id)
    assert.equal(review.prompt, entry.vietnamese)
    assert.equal(review.partOfSpeech, entry.partOfSpeech)
    assert.equal(review.semanticAssessment, 'reviewed-for-selected-prompt')
    assert(review.basis.length > 25)
    assert.deepEqual(entry.quiz.distractorIds, review.distractorIds)
    const options = [entry, ...entry.quiz.distractorIds.map(id => candidateMap.get(id))]
    assert(options.every(Boolean))
    assert.equal(options.length, 4)
    assert.equal(new Set(options.map(option => option.id)).size, 4)
    assert.equal(new Set(options.map(option => quizTextKey(option.english))).size, 4)
    for (const option of options.slice(1)) assert.equal(option.lessonId, entry.lessonId)
    for (let i = 0; i < options.length; i++) for (let j = i + 1; j < options.length; j++) {
      assert(!blocked.has(pairKey(options[i].sourceRecordId, options[j].sourceRecordId)), 'known ambiguous pair in options')
    }
    assert(options.slice(1).every(option => quizTextKey(option.vietnamese) !== quizTextKey(entry.vietnamese)))
  }
  for (const lesson of manifest.lessons) assert.equal(candidateEntries.filter(entry => entry.lessonId === lesson.id).length, 12)
}

test('600 existing IDs, 50 x 12, preserved source fields and only confirmed learning edits', () => {
  assert.equal(source.size, 615)
  assert.equal(manifest.lessons.length, 50)
  assert.equal(summary.distinctEnglishSpellings, 595)
  assert.equal(new Set(entries.map(entry => quizTextKey(entry.english))).size, 595)
  assert.equal(ledger.length, 43)
  assert.equal(confirmedIds.size, 29)
  assert.equal(changes.size, 32)
  for (const [relative, expected] of Object.entries(summary.inputSha256)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex'), expected, relative)
  }
  validateFixture(entries)
  assert.equal(entries.filter(entry => entry.quiz.status === 'internal-ready').length, 28)
  assert.equal(entries.filter(entry => entry.quiz.status !== 'internal-ready').length, 572)
  assert(lessons.every(lesson => lesson.publication.publishable === false && lesson.approval.rightsStatus === 'unverified'))
})

test('all eight final Quiz senses applied; wisely retains unresolved fields; source audit flags survive', () => {
  for (const final of plan.finalEight) {
    const entry = bySource.get(final.sourceRecordId)
    assert.equal(entry.vietnamese, final.vietnamese)
    assert.equal(entry.partOfSpeech, final.partOfSpeech)
    assert.equal(entry.quiz.status, 'internal-ready')
    assert.deepEqual(entry.sourceSnapshot.review, source.get(final.sourceRecordId).review)
  }
  const wisely = bySource.get('toeic-43-975e941b06814ce88da094907ab5c433')
  assert.equal(wisely.partOfSpeech, 'adv.')
  assert.equal(wisely.pronunciation, '/waɪz/')
  assert.equal(wisely.vietnamese, wisely.sourceSnapshot.vietnamese)
  assert.equal(wisely.quiz.status, 'pending-review')
  const manage = bySource.get('toeic-32-1abcb76277ff470b93808744f99c8d73')
  assert.deepEqual(manage.quiz.distractorIds.map(id => byId.get(id).english), ['checkout', 'establish', 'research'])
  const duplicates = new Map()
  for (const entry of entries) duplicates.set(quizTextKey(entry.english), (duplicates.get(quizTextKey(entry.english)) ?? 0) + 1)
  assert.deepEqual([...duplicates].filter(([, count]) => count > 1).map(([word]) => word).sort(), ['basis', 'constantly', 'express', 'productive', 'register'])
})

test('reject unauthorized text/pronunciation edits, duplicate IDs and silent promotion of pending questions', () => {
  const pendingIndex = entries.findIndex(entry => !confirmedIds.has(entry.sourceRecordId))
  for (const mutate of [
    copy => { copy[pendingIndex].vietnamese = 'UNAUTHORIZED' },
    copy => { copy[0].pronunciation = 'UNAUTHORIZED' },
    copy => { copy[0].sourceSnapshot.vietnamese = 'UNAUTHORIZED' },
    copy => { copy[1].id = copy[0].id },
    copy => { copy[pendingIndex].quiz.status = 'internal-ready' },
    copy => { copy.pop() },
  ]) {
    const copy = structuredClone(entries)
    mutate(copy)
    assert.throws(() => validateFixture(copy))
  }
})

test('reject the known manage / be in charge of ambiguity even though IDs and English differ', () => {
  const copy = structuredClone(entries)
  const manage = copy.find(entry => entry.english === 'manage')
  const inCharge = copy.find(entry => entry.sourceRecordId === 'toeic-05-2b61e55f119c4a47883e9e70fcaf00c8')
  manage.quiz.distractorIds[0] = inCharge.id
  assert.throws(() => validateFixture(copy))
  assert(blocked.has(pairKey(manage.sourceRecordId, inCharge.sourceRecordId)))
})

test('native Quiz generates unique four-option questions, shuffled answers, scores and max-ten non-repeating rounds', () => {
  const positions = new Set()
  let checked = 0
  for (let seed = 1; seed <= 30; seed++) {
    let state = seed
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32 }
    const allQuestions = []
    for (const lesson of lessons) {
      const ready = lesson.entries.filter(entry => entry.quiz.status === 'internal-ready')
      // Offline utility simulation only. No rights/content bypass in the web loader.
      const questions = makeQuizQuestions(ready, entries, random)
      assert.equal(questions.length, ready.length)
      for (const question of questions) {
        assert.equal(new Set(question.options.map(option => quizTextKey(option.english))).size, 4)
        assert.equal(question.options.filter(option => gradeQuizAnswer(question, option.id)).length, 1)
        assert.equal(gradeQuizAnswer(question, 'unknown-answer'), false)
        positions.add(question.options.findIndex(option => option.id === question.correctId))
        const correct = byId.get(question.correctId)
        assert.equal(correct.quiz.status, 'internal-ready')
        assert.deepEqual(new Set(question.options.map(option => option.id)), new Set([correct.id, ...correct.quiz.distractorIds]))
        checked++
      }
      const round = createQuizRound(questions, random)
      assert.equal(round.length, Math.min(10, ready.length))
      assert.equal(new Set(round.map(question => question.id)).size, round.length)
      allQuestions.push(...questions)
    }
    assert.equal(allQuestions.length, 28)
    const utilityRound = createQuizRound(allQuestions, random)
    assert.equal(utilityRound.length, 10)
    assert.equal(new Set(utilityRound.map(question => question.id)).size, 10)
  }
  assert.equal(checked, 840)
  assert.deepEqual([...positions].sort(), [0, 1, 2, 3])
})

test('private data remains outside public/dist; publication guard rejects even a copied internal lesson', () => {
  for (const directory of ['public', 'dist']) {
    const target = path.join(root, directory)
    assert(fs.existsSync(target))
    for (const relative of fs.readdirSync(target, { recursive: true })) {
      const file = path.join(target, relative)
      if (!fs.statSync(file).isFile()) continue
      const content = fs.readFileSync(file, 'utf8')
      assert(!content.includes('data-internal/toeic-600'))
      assert(!entries.some(entry => content.includes(entry.id) || content.includes(entry.sourceRecordId)), file)
    }
  }
  const workRoot = path.resolve(root, '.work')
  fs.mkdirSync(workRoot, { recursive: true })
  const temp = fs.mkdtempSync(path.join(workRoot, 'toeic-internal-publication-'))
  assert(path.resolve(temp).startsWith(workRoot + path.sep))
  try {
    fs.writeFileSync(path.join(temp, 'lesson.json'), JSON.stringify(lessons[0]))
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/check-toeic-publication.mjs'), temp], { encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Unapproved TOEIC|Preparation-only/)
  } finally {
    assert(path.resolve(temp).startsWith(workRoot + path.sep))
    fs.rmSync(temp, { recursive: true, force: true })
  }
  assert.equal(path.resolve(privateRoot), path.resolve(root, 'data-internal/toeic-600'))
})
