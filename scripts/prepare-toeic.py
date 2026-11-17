"""Offline preparation only; never writes to public/ or the application catalog."""
import argparse
import csv
import hashlib
import io
import json
import shutil
import tempfile
import unicodedata
import uuid
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data-preparation' / 'toeic'
FIELDS = ['english', 'type', 'vietnamese', 'pronounce', 'explain', 'example',
          'example_vietnamese', 'image_url', 'audio_url', 'topic', 'topic_url']
PARTS = {'n.': 'n', 'v.': 'v', 'adj.': 'adj', 'adv.': 'adv', 'n,v.': 'n/v',
         'n, v.': 'n/v', 'v, n.': 'v/n', 'phr. v.': 'phr.v', 'phr.v.': 'phr.v'}
POLICY = {'rightsStatus': 'unverified', 'publishable': False}


def canonical(value):
    return unicodedata.normalize('NFC', value).strip().casefold()


def read_csv(path):
    raw = path.read_bytes()
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig'), newline=''), strict=True)
    if reader.fieldnames != FIELDS:
        raise ValueError(f'Unexpected CSV columns: {reader.fieldnames}')
    rows = []
    end = 1
    for record, row in enumerate(reader, 1):
        start, end = end + 1, reader.line_num
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f'Malformed CSV record {record}, lines {start}-{end}')
        rows.append((record, start, end, row))
    return raw, rows


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def prepare(source, output):
    raw, rows = read_csv(source)
    if len({row['topic'] for _, _, _, row in rows if row['topic'].strip()}) != 50:
        raise ValueError('Expected exactly 50 non-empty topics; review the CSV before proceeding.')
    registry_path = output / 'id-registry.json'
    registry = json.loads(registry_path.read_text(encoding='utf-8')) if registry_path.exists() else {
        'schemaVersion': 1, 'lessons': {}, 'cards': {}}
    manual = json.loads((ROOT / 'data-preparation/toeic/manual-review.json').read_text(encoding='utf-8'))
    manual_by_key = {(item['topic'], item['english']): item['issues'] for item in manual}
    words = defaultdict(list)
    for record, start, end, row in rows:
        words[canonical(row['english'])].append(record)
    duplicates = {word: records for word, records in words.items() if len(records) > 1}
    exact = defaultdict(list)
    for record, _, _, row in rows:
        exact[tuple(row[field] for field in FIELDS)].append(record)
    lessons, units, missing, invalid, reviews = {}, [], defaultdict(list), [], []
    occurrences = Counter()
    for record, start, end, row in rows:
        for field in FIELDS:
            if not row[field].strip():
                missing[field].append(record)
        if any(not row[field].strip() for field in ['english', 'vietnamese', 'topic']):
            invalid.append(record)
            continue
        topic = row['topic']
        if topic not in lessons:
            if topic not in registry['lessons']:
                # Persisted once: adding/reordering topics cannot renumber existing IDs.
                registry['lessons'][topic] = f"toeic-{max([int(v.split('-')[-1]) for v in registry['lessons'].values()], default=0) + 1:02d}"
            lesson_id = registry['lessons'][topic]
            lessons[topic] = {'schemaVersion': 1, 'unitId': lesson_id,
                              'publication': POLICY, 'flashcards': [], 'reviewNotes': []}
            units.append({'id': lesson_id, 'number': len(units) + 1, 'title': topic,
                          'description': f'TOEIC Vocabulary — {topic}',
                          'sections': [{'id': 'vocabulary', 'title': topic, 'description': 'CSV source vocabulary'}],
                          'dataFile': f'data/units/{lesson_id}.json'})
        lesson = lessons[topic]
        # Identity excludes row number, meaning and POS. Registry survives reordering/edits.
        identity = (canonical(topic), canonical(row['english']))
        occurrences[identity] += 1
        key = json.dumps([*identity, occurrences[identity]], ensure_ascii=False)
        if key not in registry['cards']:
            registry['cards'][key] = f"{lesson['unitId']}-{uuid.uuid4().hex}"
        issues = []

        def issue(code, field, reason):
            issues.append({'code': code, 'field': field, 'reason': reason})

        for field in ['type', 'pronounce', 'explain', 'example', 'example_vietnamese']:
            if not row[field].strip():
                issue('missing-field', field, f'Trường {field} còn trống; chưa tự bổ sung.')
        if row['type'] and row['type'] not in PARTS:
            issue('unsupported-pos', 'type', 'Loại từ chưa có ánh xạ chắc chắn trong ứng dụng; giữ nguyên và dùng null ở trường tương thích.')
        for field, value in row.items():
            if value != value.strip():
                issue('outer-whitespace', field, 'Có khoảng trắng đầu/cuối; giữ nguyên nguồn để rà soát.')
        if canonical(row['english']) in duplicates:
            issue('duplicate-english', 'english', 'Từ xuất hiện ở nhiều bản ghi; giữ riêng ID, không gộp nghĩa hay đáp án.')
        for item in manual_by_key.get((topic, row['english']), []):
            issue('manual-review', item['field'], item['reason'])
        card = {'id': registry['cards'][key], 'unitId': lesson['unitId'], 'section': 'vocabulary',
                'category': 'base_word', 'english': row['english'], 'vietnamese': row['vietnamese'],
                'partOfSpeech': PARTS.get(row['type']), 'partOfSpeechOriginal': row['type'],
                'sourceRow': record + 1, 'example': row['example'],
                'exampleTranslation': row['example_vietnamese'], 'pronunciation': row['pronounce'],
                'explanation': row['explain'],
                'source': {'record': record, 'lineStart': start, 'lineEnd': end,
                           'topic': topic, 'topicUrl': row['topic_url']},
                'review': {'status': 'needs-review' if issues else 'unreviewed', 'issues': issues}}
        lesson['flashcards'].append(card)
        for item in issues:
            lesson['reviewNotes'].append({'sourceRow': record + 1, 'category': 'base_word',
                                         'original': row[item['field']] if row[item['field']].strip() else row['english'],
                                         'reason': item['reason']})
        if issues:
            reviews.append({'id': card['id'], 'sourceRecord': record, 'sourceRow': record + 1,
                            'english': row['english'], 'topic': topic, 'issues': issues})
    if invalid:
        raise ValueError(f'Missing required content in CSV records: {invalid}; no output written.')
    ids = [card['id'] for lesson in lessons.values() for card in lesson['flashcards']]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate registry IDs; no output written.')
    manifest = {'schemaVersion': 1, 'publication': POLICY, 'units': units}
    audit = {'schemaVersion': 1, 'source': {'file': source.name, 'sha256': hashlib.sha256(raw).hexdigest()},
             'publication': POLICY, 'totalRecords': len(rows), 'validRecords': len(ids),
             'validityDefinition': 'CSV structure and non-empty english/vietnamese/topic; linguistic accuracy unverified',
             'lessonCount': len(units), 'uniqueEnglishCount': len(words),
             'duplicateEnglish': [{'english': word, 'sourceRecords': records,
                                   'sourceRows': [n + 1 for n in records]} for word, records in duplicates.items()],
             'exactDuplicateRecords': [records for records in exact.values() if len(records) > 1],
             'missingFields': dict(missing), 'originalPartOfSpeechCounts': dict(Counter(r['type'] for _, _, _, r in rows)),
             'lessons': [{'id': lesson['unitId'], 'topic': topic, 'count': len(lesson['flashcards'])}
                         for topic, lesson in lessons.items()],
             'flaggedRecords': len(reviews), 'reviewIssueCounts': dict(Counter(
                 item['code'] for review in reviews for item in review['issues'])), 'reviews': reviews,
             'mediaPolicy': 'No media downloaded; image_url and audio_url omitted from prepared JSON.'}
    write_json(registry_path, registry)
    write_json(output / 'manifest.json', manifest)
    for lesson in lessons.values():
        write_json(output / 'units' / f"{lesson['unitId']}.json", lesson)
    write_json(output / 'audit.json', audit)
    return audit


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'toeic_600_words.csv')
    parser.add_argument('--check', action='store_true', help='Verify existing artifacts without updating them')
    args = parser.parse_args()
    if args.check:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            shutil.copyfile(OUTPUT / 'id-registry.json', target / 'id-registry.json')
            result = prepare(args.source, target)
            expected = {p.relative_to(target): p.read_bytes() for p in target.rglob('*.json')}
            actual_paths = {p.relative_to(OUTPUT) for p in OUTPUT.rglob('*.json')}
            actual_paths.discard(Path('manual-review.json'))
            if actual_paths != set(expected) or any((OUTPUT / p).read_bytes() != data for p, data in expected.items()):
                raise SystemExit('Prepared artifacts are stale; review source/registry and rerun preparation.')
    else:
        result = prepare(args.source, OUTPUT)
    print(f"Prepared {result['validRecords']} records / {result['lessonCount']} lessons; "
          f"{result['flaggedRecords']} flagged records. Publication blocked: rights unverified.")
