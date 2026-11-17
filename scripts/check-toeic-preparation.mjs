import fs from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { validateManifest, validateUnitData } from '../src/services/unitLoader.ts'

test('all 50 prepared lessons pass existing Unit validators', () => {
  const root = new URL('../data-preparation/toeic/', import.meta.url)
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8'))
  const units = validateManifest(manifest)
  assert.equal(units.length, 50)
  let count = 0
  const ids = new Set()
  for (const unit of units) {
    const data = JSON.parse(fs.readFileSync(new URL(`units/${unit.id}.json`, root), 'utf8'))
    validateUnitData(data, unit)
    assert.equal(data.publication.publishable, false)
    for (const card of data.flashcards) {
      assert(!ids.has(card.id))
      ids.add(card.id)
      count++
    }
  }
  assert.equal(count, 615)
})

test('production bundle and active catalog exclude TOEIC content', () => {
  const root = new URL('../', import.meta.url)
  const dist = new URL('dist/', root)
  const files = fs.readdirSync(dist, { recursive: true }).filter(path => fs.statSync(new URL(path.replaceAll('\\', '/'), dist)).isFile())
  assert(!files.some(path => /toeic_600_words|data-preparation/i.test(path)))
  const manifest = JSON.parse(fs.readFileSync(new URL('data-preparation/toeic/manifest.json', root), 'utf8'))
  const registry = JSON.parse(fs.readFileSync(new URL('data-preparation/toeic/id-registry.json', root), 'utf8'))
  const markers = [manifest.units[0].title, ...Object.values(registry.cards)]
  for (const file of files) {
    const text = fs.readFileSync(new URL(file.replaceAll('\\', '/'), dist), 'utf8')
    assert(!markers.some(marker => text.includes(marker)), `TOEIC data found in ${file}`)
  }
  const active = JSON.parse(fs.readFileSync(new URL('public/data/units.json', root), 'utf8'))
  assert(!active.units.some(unit => unit.id.startsWith('toeic-')))
  const quiz = JSON.parse(fs.readFileSync(new URL('public/data/toeic/catalog.json', root), 'utf8'))
  const planned = quiz.collections.find(collection => collection.kind === 'toeic')
  assert.equal(planned.lessons.length, 50)
  assert.equal(planned.approval.rightsStatus, 'unverified')
  assert(planned.lessons.every(lesson => lesson.dataFile === null))
})

test('publication guard rejects preparation-only JSON and unlicensed catalog references', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toeic-publication-test-'))
  try {
    const script = new URL('check-toeic-publication.mjs', import.meta.url)
    const draft = path.join(directory, 'draft.json')
    fs.writeFileSync(draft, JSON.stringify({ publication: { publishable: false } }))
    let result = spawnSync(process.execPath, [script.pathname.replace(/^\/(\w:)/, '$1'), directory], { encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Preparation-only JSON/)
    fs.unlinkSync(draft)
    fs.mkdirSync(path.join(directory, 'data/toeic'), { recursive: true })
    fs.writeFileSync(path.join(directory, 'data/toeic/catalog.json'), JSON.stringify({ collections: [{
      id: 'test', approval: { rightsStatus: 'unverified', contentStatus: 'pending', rightsReference: '' },
      lessons: [{ dataFile: 'data/toeic/lessons/test.json' }],
    }] }))
    result = spawnSync(process.execPath, [script.pathname.replace(/^\/(\w:)/, '$1'), directory], { encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Unapproved collection/)
  } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})
