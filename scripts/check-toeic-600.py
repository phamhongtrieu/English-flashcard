"""Read-only verification of the preservation-first 600-record proposal."""
import csv
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data-proposals/toeic-600'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def key(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', value).strip().casefold())


def rows(name):
    with (OUT / name).open(encoding='utf-8-sig', newline='') as stream:
        result = list(csv.DictReader(stream))
    assert all(None not in row for row in result)
    return result


source_manifest = read(ROOT / 'data-preparation/toeic/manifest.json')
original = [card for unit in source_manifest['units'] for card in read(
    ROOT / 'data-preparation/toeic/units' / f"{unit['id']}.json")['flashcards']]
by_source = {card['id']: card for card in original}
manifest = read(OUT / 'manifest.json')
summary = read(OUT / 'review-summary.json')
assert len(original) == 615 and len(manifest['lessons']) == 50
assert summary['correctionsApplied'] == summary['sourceTextFieldsChangedInSnapshot'] == 0
assert manifest['publication']['rightsStatus'] == 'unverified'
assert manifest['publication']['publishable'] is False
for relative, expected in summary['inputSha256'].items():
    assert hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() == expected, relative

items = []
for lesson in manifest['lessons']:
    assert lesson['dataFile'] == f"lessons/{lesson['id']}.json"
    data = read(OUT / lesson['dataFile'])
    assert data['lessonId'] == lesson['id'] and len(data['items']) == 12
    assert data['publication'] == manifest['publication']
    assert len({by_source[item['sourceRecordId']]['unitId'] for item in data['items']}) >= 6
    items.extend(data['items'])
assert len(items) == len({item['id'] for item in items}) == len({item['sourceRecordId'] for item in items}) == 600
assert len({key(item['english']) for item in items}) == 595
by_learning = {item['id']: item for item in items}
kept = {item['sourceRecordId'] for item in items}
removed = {item['sourceRecordId'] for item in summary['exclusions']}
assert len(removed) == 15 and kept.isdisjoint(removed) and kept | removed == set(by_source)
for proposal in summary['exclusions']:
    unit = next(unit for unit in source_manifest['units'] if unit['id'] == proposal['sourceUnitId'])
    members = [card for card in original if card['unitId'] == unit['id']]
    forms = {key(unit['title'])}
    if key(unit['title']).endswith('s'):
        forms.add(key(unit['title'])[:-1])
    matches = [card for card in members if key(card['english']) in forms]
    assert len(members) == 13 and len(matches) == 1 and matches[0]['id'] == proposal['sourceRecordId']
    assert proposal['sourceDeleted'] is False and proposal['originalRoleConfirmed'] is False
assert sum(item['explanationMissing'] for item in summary['exclusions']) == 14
assert next(item for item in summary['exclusions'] if item['english'] == 'accounting')['explanationMissing'] is False

registry = read(OUT / 'id-registry.json')
assert {record['id']: record['sourceRecordId'] for record in registry['records']} == {
    item['id']: item['sourceRecordId'] for item in items}
for item in items:
    source = by_source[item['sourceRecordId']]
    expected = 'toeic600-' + hashlib.sha256(
        f"english-flashcard:toeic600:v1:{source['id']}".encode()).hexdigest()[:32]
    assert item['id'] == expected
    for field in ('english', 'vietnamese', 'partOfSpeech', 'partOfSpeechOriginal', 'pronunciation'):
        assert item[field] == source[field], (item['id'], field)
    assert item['sourceReview'] == source['review']
    if source['review']['status'] == 'needs-review':
        assert item['review']['status'] == 'needs-review'
    assert item['review']['approved'] is False
    assert item['quizProposal']['status'] == 'pending-admin-review'
    assert not {'example', 'exampleTranslation', 'explanation', 'image_url', 'audio_url', 'image', 'audio', 'topicUrl'} & set(item)

quality = read(ROOT / 'reports/toeic-quality/report.json')
approval = read(ROOT / 'reports/toeic-approval/approval-summary.json')
risks = read(OUT / 'ambiguity-review.json')
blocked = {frozenset((pair['firstId'], pair['secondId'])) for pair in quality['ambiguityPairs']}
blocked |= {frozenset((pair['firstId'], pair['secondId'])) for pair in approval['supplementalExclusions']}
blocked |= {frozenset(pair['sourceIds']) for pair in risks['newContextPairs']}
held = {question['id'] for question in quality['questions'] if question['promptDecisionRequired']}
for item in items:
    ids = [item['id'], *item['quizProposal']['suggestedDistractorIds']]
    assert len(ids) == len(set(ids)) == 4
    assert all(id in by_learning for id in ids)
    assert len({key(by_learning[id]['english']) for id in ids}) == 4
    assert all(by_learning[id]['sourceRecordId'] not in held for id in ids[1:])
    for i, first in enumerate(ids):
        for second in ids[i + 1:]:
            assert frozenset((by_learning[first]['sourceRecordId'], by_learning[second]['sourceRecordId'])) not in blocked
for lesson in summary['lessonReport']:
    count = sum(item['lessonId'] == lesson['lessonId'] and item['sourceRecordId'] not in held for item in items)
    assert lesson['maximumRoundSizeWithContentHolds'] == min(10, count)
assert len(rows('excluded-15.csv')) == 15
retained = rows('retained-600.csv')
assert len(retained) == 600 and {row['learningId'] for row in retained} == set(by_learning)
for row in retained:
    item = by_learning[row['learningId']]
    assert row['vietnameseOriginal'] == item['vietnamese']
    assert row['partOfSpeechOriginal'] == item['partOfSpeechOriginal']
    assert row['pronunciationOriginal'] == item['pronunciation']
corrections = rows('minimal-corrections.csv')
assert len(corrections) == summary['fieldReviewRows']
assert sum(row['hasConcreteProposal'] == 'true' for row in corrections) == 14
for row in corrections:
    assert row['sourceRecordId'] in kept and row['learningId'] in by_learning
    assert row['before'] == by_source[row['sourceRecordId']][row['field']]
    assert row['applied'] == 'false' and row['adminDecision'] == ''
    if row['hasConcreteProposal'] == 'true':
        assert row['proposedAfter'] and row['proposedAfter'] != row['before']
    else:
        assert row['proposedAfter'] == ''
print('PASS: 615 = 600 kept + 15 proposed exclusions; 595 distinct English spellings; '
      '50 x 12; stable IDs; all text/POS/pronunciation/audit fields unchanged; '
      'no known risky option pairs; before/after proposals unapplied; source hashes intact.')
