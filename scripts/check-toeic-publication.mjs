import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const target = path.resolve(root, process.argv[2] ?? 'public')
const approved = value => value?.rightsStatus === 'verified' && value.contentStatus === 'approved'
  && typeof value.rightsReference === 'string' && value.rightsReference.trim().length > 0
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const catalogFile = path.join(target, 'data/toeic/catalog.json')
const catalog = fs.existsSync(catalogFile) ? read(catalogFile) : null
const licensedIds = new Set()
for (const collection of catalog?.collections ?? []) {
  for (const lesson of collection.lessons ?? []) {
    if (!lesson.dataFile) continue
    if (!/^data\/toeic\/lessons\/[a-z0-9-]+\.json$/.test(lesson.dataFile)) throw new Error('Unsafe TOEIC data path')
    if (!approved(collection.approval)) throw new Error(`Unapproved collection references public data: ${collection.id}`)
    const data = read(path.join(target, lesson.dataFile))
    if (data.collectionId !== collection.id || data.lessonId !== lesson.id || !approved(data.approval)
      || !Array.isArray(data.entries) || data.entries.some(entry => entry.quiz?.status !== 'approved')) {
      throw new Error(`Unapproved TOEIC lesson in publication: ${lesson.id}`)
    }
    if (collection.kind === 'toeic') for (const entry of data.entries) licensedIds.add(entry.id)
  }
}
const registryFile = path.join(root, 'data-preparation/toeic/id-registry.json')
const protectedIds = fs.existsSync(registryFile) ? Object.values(read(registryFile).cards) : []
const markers = protectedIds.filter(id => !licensedIds.has(id))
const forbidden = ['toeic_600_words.csv', 'data-preparation/toeic', 'audio.tflat.vn', 'tienganhtflat.com/blog/toeic-words-']
for (const relative of fs.readdirSync(target, { recursive: true })) {
  const file = path.join(target, relative)
  if (!fs.statSync(file).isFile()) continue
  if (/toeic_600_words|data-preparation/i.test(relative)) throw new Error(`Private source path in publication: ${relative}`)
  const text = fs.readFileSync(file, 'utf8')
  if (forbidden.some(marker => text.includes(marker)) || markers.some(marker => text.includes(marker))) {
    throw new Error(`Unapproved TOEIC source content in publication: ${relative}`)
  }
  if (file.endsWith('.json')) {
    const value = read(file)
    if (value?.publication?.publishable === false) throw new Error(`Preparation-only JSON in publication: ${relative}`)
    if (Array.isArray(value?.entries) && !approved(value.approval)) throw new Error(`Unapproved quiz data: ${relative}`)
  }
}
console.log(`TOEIC publication check passed: ${path.relative(root, target)}`)
