"""Validate exported review files independently; never changes source or reports."""
import csv
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports/toeic-approval'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def csv_rows(name):
    with (OUT / name).open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream))
    assert all(None not in row for row in rows), 'CSV column mismatch'
    return rows


def key(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', value).strip().casefold())


summary = read(OUT / 'approval-summary.json')
quality = read(ROOT / 'reports/toeic-quality/report.json')
decisions = read(OUT / 'review-decisions.json')
manifest = read(ROOT / 'data-preparation/toeic/manifest.json')
cards = [card for unit in manifest['units'] for card in read(
    ROOT / 'data-preparation/toeic/units' / f"{unit['id']}.json")['flashcards']]
source_by_id = {card['id']: card for card in cards}
assert len(cards) == len(source_by_id) == 615
assert summary['rightsStatus'] == 'unverified' and summary['publicationAllowed'] is False
assert summary['actualApprovedQuestions'] == summary['actualApprovedLessons'] == summary['unlockedLessons'] == 0
assert len(summary['questions']) == 615 and len(summary['corrections']) == 29
assert len(summary['pairReviews']) == 124 and len(summary['lessonChecks']) == 50
assert {q['flashcardId'] for q in summary['questions']} == set(source_by_id)
assert {q['flashcardId'] for q in summary['corrections']} == {
    q['id'] for q in quality['questions'] if q['promptDecisionRequired']}
for relative, expected in summary['inputSha256'].items():
    assert hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() == expected, relative

blocked = {frozenset((pair['firstId'], pair['secondId'])) for pair in quality['ambiguityPairs']}
for group in decisions['additionalExclusionGroups']:
    members = [card['id'] for card in cards if card['english'] in group]
    for i, first in enumerate(members):
        for second in members[i + 1:]:
            blocked.add(frozenset((first, second)))

held = {q['flashcardId'] for q in summary['corrections']}
questions_by_id = {q['flashcardId']: q for q in summary['questions']}
for question in summary['questions']:
    original = source_by_id[question['flashcardId']]
    assert question['currentVietnamese'] == original['vietnamese']
    assert question['currentPOS'] == original['partOfSpeechOriginal']
    assert question['reviewStatus'] == 'pending-admin-review' and question['actualApproved'] is False
    assert question['adminDecision'] is None and question['rightsStatus'] == 'unverified'
    ids = [question['flashcardId']] + [d['flashcardId'] for d in question['suggestedDistractors']]
    assert len(ids) == len(set(ids)) == 4
    assert len({key(source_by_id[id]['english']) for id in ids}) == 4
    assert not set(ids[1:]) & held, 'Pending corrections used as distractors'
    for suggestion in question['suggestedDistractors']:
        source = source_by_id[suggestion['flashcardId']]
        assert suggestion['english'] == source['english'] and suggestion['vietnamese'] == source['vietnamese']
        assert suggestion['lessonId'] == question['lessonId']
    for i, first in enumerate(ids):
        for second in ids[i + 1:]:
            assert frozenset((first, second)) not in blocked, f'Known ambiguity: {first}, {second}'
    expected = 'hold-for-correction-decision' if question['flashcardId'] in held else 'propose-admin-approval'
    assert question['recommendation'] == expected

corrections = csv_rows('proposed-corrections.csv')
review = csv_rows('distractor-review.csv')
assert len(corrections) == len({row['flashcardId'] for row in corrections}) == 29
assert len(review) == 739
pair_rows = [row for row in review if row['recordType'] == 'overlap-pair']
question_rows = [row for row in review if row['recordType'] == 'question-distractors']
assert len(pair_rows) == 124 and len(question_rows) == 615
assert {row['flashcardId'] for row in question_rows} == set(source_by_id)
assert {frozenset((row['flashcardId'], row['relatedFlashcardId'])) for row in pair_rows} == {
    frozenset((pair['firstId'], pair['secondId'])) for pair in quality['ambiguityPairs'] if not pair['sameEnglish']}
for row in corrections + review:
    assert row['reviewStatus'] == 'pending-admin-review' and row['adminDecision'] == ''
    source = source_by_id[row['flashcardId']]
    assert row['currentVietnamese'] == source['vietnamese'] and row['currentPOS'] == source['partOfSpeechOriginal']
for row in question_rows:
    assert [row[f'suggestedDistractor{i}Id'] for i in (1, 2, 3)] == [
        d['flashcardId'] for d in questions_by_id[row['flashcardId']]['suggestedDistractors']]
for lesson in summary['lessonChecks']:
    eligible = [q for q in summary['questions'] if q['lessonId'] == lesson['lessonId'] and q['flashcardId'] not in held]
    assert lesson['maximumRoundSizeWithoutPendingCorrections'] == min(10, len(eligible))
    assert lesson['actualApproved'] == 0
assert sum(q['recommendation'] == 'propose-admin-approval' for q in summary['questions']) == 586
assert sum(q['decisionType'] == 'choose-sense' for q in summary['corrections']) == 7
print('PASS: 615 IDs, 29 corrections, 124 pair decisions, 615 triples, CSV/JSON parity, '
      'no known ambiguous pairs, immutable inputs, pending approvals and max-10 lesson counts.')
