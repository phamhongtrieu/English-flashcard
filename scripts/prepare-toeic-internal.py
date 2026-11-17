"""Apply confirmed review fields to a private 600-record internal fixture only."""
import argparse
import copy
import csv
import hashlib
import io
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data-internal/toeic-600'
read_json = lambda relative: json.loads((ROOT / relative).read_text(encoding='utf-8'))
def read_csv(relative):
    with (ROOT / relative).open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))
def digest(relative):
    return hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()

plan = read_json('data-internal/toeic-600/review-plan.json')
proposal_manifest = read_json('data-proposals/toeic-600/manifest.json')
source_manifest = read_json('data-preparation/toeic/manifest.json')
input_files = ['toeic_600_words.csv', 'data-internal/toeic-600/review-plan.json',
               'reports/toeic-final-review/approval-table.csv', 'reports/toeic-final-review/supplemental-comparison.csv',
               'data-proposals/toeic-600/minimal-corrections.csv', 'data-proposals/toeic-600/manifest.json',
               'data-proposals/toeic-600/id-registry.json', 'data-proposals/toeic-600/ambiguity-review.json',
               'data-preparation/toeic/manifest.json', 'data-preparation/toeic/id-registry.json',
               'data-preparation/toeic/audit.json', 'data-preparation/toeic/manual-review.json',
               'reports/toeic-quality/report.json', 'src/utils/toeicQuiz.ts',
               *[f"data-preparation/toeic/units/{unit['id']}.json" for unit in source_manifest['units']],
               *[f"data-proposals/toeic-600/{lesson['dataFile']}" for lesson in proposal_manifest['lessons']]]
hashes = {name: digest(name) for name in input_files}
assert digest('toeic_600_words.csv') == read_json('data-preparation/toeic/audit.json')['source']['sha256']
source = {c['id']: c for unit in source_manifest['units']
          for c in read_json(f"data-preparation/toeic/units/{unit['id']}.json")['flashcards']}
proposals = [i for lesson in proposal_manifest['lessons']
             for i in read_json(f"data-proposals/toeic-600/{lesson['dataFile']}")['items']]
by_source = {i['sourceRecordId']: i for i in proposals}
by_id = {i['id']: i for i in proposals}
assert len(source) == 615 and len(proposals) == len(by_id) == len(by_source) == 600
assert len(proposal_manifest['lessons']) == 50

previous = {r['Mã mục duyệt']: r for r in read_csv('reports/toeic-final-review/approval-table.csv')}
supplement = {r['Mã mục duyệt']: r for r in read_csv('reports/toeic-final-review/supplemental-comparison.csv')}
accepted = set(plan['acceptedReviewCodes'])
final_codes = {r['reviewCode'] for r in plan['finalEight']}
assert len(accepted) == 35 and accepted == {code for code, row in supplement.items() if row['Kết quả đối chiếu'] == 'Đồng ý với gợi ý'}
assert len(final_codes) == 8 and accepted.isdisjoint(final_codes) and accepted | final_codes == set(supplement)
assert len(previous) == len(supplement) == 43

conflicts = []
blocked_records = set()
operations = {}
def conflict(source_id, code, reason):
    conflicts.append({'sourceRecordId': source_id, 'reviewCode': code, 'reason': reason, 'status': 'pending-review'})
    blocked_records.add(source_id)

for code, row in supplement.items():
    source_id = row['ID']
    card = source.get(source_id)
    item = by_source.get(source_id)
    old = previous.get(code)
    if not card or not item or not old or row['ID học hiện có'] != item['id'] or old['ID'] != source_id:
        conflict(source_id, code, 'ID or existing learning ID not found/mismatched. Stop this record.')
        continue
    if row['Từ tiếng Anh'] != card['english'] or any(row[col] != card[field] for col, field in [
            ('Nghĩa Việt nguyên trạng', 'vietnamese'), ('Loại từ nguyên trạng', 'partOfSpeechOriginal'), ('Phiên âm nguyên trạng', 'pronunciation')]):
        conflict(source_id, code, 'Review original fields no longer match the source. Stop this record.')

def propose(source_id, code, english, field, before, after, reason):
    if source_id in blocked_records:
        return
    if field not in {'vietnamese', 'partOfSpeech'}:
        conflict(source_id, code, 'Field not authorized for editing.')
        return
    card = source.get(source_id)
    raw_field = 'partOfSpeechOriginal' if field == 'partOfSpeech' else field
    if not card or source_id not in by_source or card['english'] != english or card[raw_field] != before:
        conflict(source_id, code, 'Expected source ID/English/before value mismatch. Stop this record.')
        return
    key = (source_id, field)
    if key in operations and operations[key]['after'] != after:
        conflict(source_id, code, 'Conflicting approved replacement values. Stop this record.')
        return
    if key in operations:
        operations[key]['reviewCodes'] = sorted(set(operations[key]['reviewCodes'] + [code]))
    elif before != after:
        operations[key] = {'sourceRecordId': source_id, 'learningId': by_source[source_id]['id'], 'english': english,
                           'field': field, 'before': before, 'after': after, 'reviewCodes': [code], 'reason': reason}

for code in sorted(accepted):
    row = previous[code]
    if not code.startswith('C'):
        continue
    propose(row['ID'], code, row['Từ tiếng Anh'], 'partOfSpeech' if row['Trường'] == 'partOfSpeechOriginal' else row['Trường'],
            row['Nội dung gốc'], row['Đề xuất'], 'User confirmed concrete field proposal; no other field implied.')
for row in plan['additionalConfirmedFields']:
    assert row['reviewCode'] in accepted
    propose(row['sourceRecordId'], row['reviewCode'], row['english'], row['field'], row['before'], row['after'], row['reason'])
for row in plan['finalEight']:
    card = source.get(row['sourceRecordId'])
    if not card:
        conflict(row['sourceRecordId'], row['reviewCode'], 'Final-eight source ID missing.')
        continue
    for field in ['vietnamese', 'partOfSpeech']:
        propose(row['sourceRecordId'], row['reviewCode'], row['english'], field,
                card['partOfSpeechOriginal' if field == 'partOfSpeech' else field], row[field],
                'User explicitly selected the final sense/POS for this Quiz prompt; preserve all source fields.')

confirmed_by_source = defaultdict(list)
for code in sorted(accepted | final_codes):
    confirmed_by_source[previous[code]['ID']].append(code)
held_by_source = {r['sourceRecordId']: r for r in plan['heldFields']}
applied = [op for op in operations.values() if op['sourceRecordId'] not in blocked_records]
applied_by_source = defaultdict(list)
for op in applied:
    applied_by_source[op['sourceRecordId']].append(op)

publication = {'rightsStatus': 'unverified', 'publishable': False, 'publicUnlockAllowed': False,
               'scope': 'internal-test-only', 'contentStatus': 'partially-user-confirmed'}
entries = []
for proposal in proposals:
    card = source[proposal['sourceRecordId']]
    entry = {'id': proposal['id'], 'sourceRecordId': card['id'], 'lessonId': proposal['lessonId'],
             'english': card['english'], 'vietnamese': card['vietnamese'],
             'partOfSpeech': card['partOfSpeechOriginal'] or None, 'pronunciation': card['pronunciation'],
             'sourceSnapshot': {key: copy.deepcopy(card[key]) for key in ['id', 'sourceRow', 'unitId', 'english',
                               'vietnamese', 'partOfSpeech', 'partOfSpeechOriginal', 'pronunciation', 'review']},
             'review': {'confirmedReviewCodes': confirmed_by_source.get(card['id'], []),
                        'sourceAuditPreserved': True, 'sourceAuditResolvedAutomatically': False,
                        'status': 'pending-review', 'pendingReasons': [], 'changes': applied_by_source.get(card['id'], [])},
             'quiz': {'status': 'pending-review', 'answerAliases': [], 'distractorIds': [],
                      'proposedDistractorIds': list(proposal['quizProposal']['suggestedDistractorIds'])}}
    for op in applied_by_source.get(card['id'], []):
        entry[op['field']] = op['after']
    if card['id'] in blocked_records:
        entry['review']['pendingReasons'].append('conflicting-or-stale-review-fields')
    if card['id'] not in confirmed_by_source:
        entry['review']['pendingReasons'].append('content-not-confirmed-in-current-user-scope')
    if card['id'] in held_by_source:
        entry['review']['pendingReasons'].append('final-adverb-gloss-and-pronunciation-not-approved')
    entries.append(entry)

entry_by_id = {e['id']: e for e in entries}
entry_by_source = {e['sourceRecordId']: e for e in entries}
risks = read_json('data-proposals/toeic-600/ambiguity-review.json')
blocked_pairs = {frozenset(p['sourceIds']) for p in risks['knownRiskPairs'] if p['bothRetained']}
blocked_pairs |= {frozenset(p['sourceIds']) for p in risks['newContextPairs']}
blocked_pairs |= {frozenset((p['firstId'], p['secondId'])) for p in risks['additionalExcludedSourcePairs']}
def pair_for_words(a, b):
    return [frozenset((x['sourceRecordId'], y['sourceRecordId'])) for x in entries for y in entries
            if x['english'] == a and y['english'] == b]
new_pair_rules = [('manage', 'be in charge of'), ('apprehensive', 'anxious'), ('mention', 'refer'), ('escort', 'guide')]
for a, b in new_pair_rules:
    blocked_pairs.update(pair_for_words(a, b))

distractor_reviews = []
for decision in plan['distractorReviews']:
    code = decision['reviewCode']
    source_id = previous[code]['ID']
    entry = entry_by_source[source_id]
    assert entry['english'] == decision['english']
    option_ids = list(entry['quiz']['proposedDistractorIds'])
    if 'replaceSourceId' in decision:
        before_id = entry_by_source[decision['replaceSourceId']]['id']
        after_id = entry_by_source[decision['replacementSourceId']]['id']
        assert before_id in option_ids
        option_ids = [after_id if id == before_id else id for id in option_ids]
    options = [entry_by_id[id] for id in option_ids]
    assert [o['english'] for o in options] == decision['expectedOptions'], code
    assert all(o['lessonId'] == entry['lessonId'] for o in options), code
    all_options = [entry, *options]
    normalized = lambda text: ' '.join(text.strip().casefold().split())
    safe = len({o['id'] for o in all_options}) == len({normalized(o['english']) for o in all_options}) == 4
    safe &= all(normalized(o['vietnamese']) != normalized(entry['vietnamese']) for o in options)
    safe &= all(frozenset((a['sourceRecordId'], b['sourceRecordId'])) not in blocked_pairs
                for i, a in enumerate(all_options) for b in all_options[i+1:])
    if not safe:
        entry['review']['pendingReasons'].append('distractor-structure-or-known-semantic-conflict')
    if not entry['review']['pendingReasons'] and safe:
        entry['review']['status'] = 'ready-for-internal-question'
        entry['quiz']['status'] = 'internal-ready'
        entry['quiz']['distractorIds'] = option_ids
    entry['quiz']['proposedDistractorIds'] = option_ids
    distractor_reviews.append({'id': entry['id'], 'sourceRecordId': source_id, 'english': entry['english'],
                               'prompt': entry['vietnamese'], 'partOfSpeech': entry['partOfSpeech'],
                               'distractorIds': option_ids, 'distractorEnglish': [o['english'] for o in options],
                               'semanticAssessment': 'reviewed-for-selected-prompt', 'reviewer': 'assistant',
                               'basis': decision['reason'], 'status': entry['quiz']['status'],
                               'scope': 'Specific English options for this prompt only; does not approve candidate prompts or their source fields.'})

for entry in entries:
    if entry['review']['status'] != 'ready-for-internal-question' and not entry['review']['pendingReasons']:
        entry['review']['pendingReasons'].append('distractor-review-not-complete')
    assert entry['pronunciation'] == source[entry['sourceRecordId']]['pronunciation']
    assert entry['sourceSnapshot']['id'] == entry['sourceRecordId']
    assert entry['id'] == by_source[entry['sourceRecordId']]['id']

ready = [e for e in entries if e['quiz']['status'] == 'internal-ready']
pending = [e for e in entries if e['quiz']['status'] != 'internal-ready']
lesson_report = []
for lesson in proposal_manifest['lessons']:
    members = [e for e in entries if e['lessonId'] == lesson['id']]
    assert len(members) == 12
    count = sum(e['quiz']['status'] == 'internal-ready' for e in members)
    lesson_report.append({'lessonId': lesson['id'], 'records': 12, 'readyQuestions': count,
                          'pendingQuestions': 12-count, 'maximumInternalRoundSize': min(10, count)})

ledger = []
for code in sorted(accepted | final_codes):
    row = previous[code]
    relevant = [op for op in applied if code in op['reviewCodes'] or (not code.startswith('C') and op['sourceRecordId'] == row['ID'])]
    ledger.append({'reviewCode': code, 'sourceRecordId': row['ID'], 'english': row['Từ tiếng Anh'],
                   'authority': 'explicit-user-confirmation-in-conversation', 'date': '2026-11-17',
                   'scope': 'final-eight-quiz-sense' if code in final_codes else 'agreed-supplemental-scope',
                   'fieldChanges': [{'field': op['field'], 'before': op['before'], 'after': op['after']} for op in relevant],
                   'heldFields': held_by_source.get(row['ID'], {}).get('fields', []),
                   'doesNotResolveAllSourceAuditFlags': True})

summary = {'schemaVersion': 1, 'date': '2026-11-17', 'publication': publication,
           'sourceRecords': 615, 'internalRecords': 600, 'distinctEnglishSpellings': len({e['english'].strip().casefold() for e in entries}),
           'lessons': 50, 'acceptedSupplementalRows': 35, 'finalEightRows': 8, 'confirmationLedgerRows': len(ledger),
           'confirmedSourceRecords': len(confirmed_by_source), 'changedRecords': len({o['sourceRecordId'] for o in applied}),
           'changedFields': len(applied), 'fieldChangeCounts': dict(Counter(o['field'] for o in applied)),
           'pronunciationChanges': 0, 'sourceFieldsOverwritten': 0, 'idsChanged': 0,
           'readyForInternalQuestions': len(ready), 'pendingQuestions': len(pending),
           'lessonsWithInternalQuestions': sum(l['readyQuestions'] > 0 for l in lesson_report),
           'lessonsWithTenReadyQuestions': sum(l['readyQuestions'] >= 10 for l in lesson_report),
           'publiclyApprovedLessons': 0, 'conflicts': conflicts, 'heldFields': plan['heldFields'],
           'pendingReasonCounts': dict(Counter(reason for e in pending for reason in e['review']['pendingReasons'])),
           'inputSha256': hashes, 'lessonReport': lesson_report}
manifest = {'schemaVersion': 1, 'documentType': 'private-internal-partially-confirmed-toeic',
            'collectionId': 'toeic-600-internal', 'publication': publication,
            'approval': {'rightsStatus': 'unverified', 'rightsReference': '', 'contentStatus': 'pending'},
            'lessons': [{**l, 'dataFile': f"lessons/{l['id']}.json"} for l in proposal_manifest['lessons']]}

def encode_json(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
def encode_csv(headers, rows):
    out = io.StringIO(newline='')
    writer = csv.writer(out, lineterminator='\r\n')
    writer.writerow(headers)
    writer.writerows(rows)
    return ('\ufeff' + out.getvalue()).encode('utf-8')

outputs = {'manifest.json': encode_json(manifest), 'application-report.json': encode_json(summary),
           'approval-ledger.json': encode_json({'authority': plan['authority'], 'rows': ledger}),
           'distractor-review.json': encode_json({'publication': publication, 'reviewedQuestions': distractor_reviews,
                                                 'additionalBlockedPairs': [{'first': a, 'second': b} for a, b in new_pair_rules]})}
for lesson in proposal_manifest['lessons']:
    outputs[f"lessons/{lesson['id']}.json"] = encode_json({'schemaVersion': 1, 'documentType': 'private-internal-lesson',
        'collectionId': manifest['collectionId'], 'lessonId': lesson['id'], 'publication': publication,
        'approval': manifest['approval'], 'entries': [e for e in entries if e['lessonId'] == lesson['id']]})
outputs['changes.csv'] = encode_csv(['sourceRecordId', 'learningId', 'english', 'field', 'before', 'after', 'reviewCodes', 'scope'],
    [[o['sourceRecordId'], o['learningId'], o['english'], o['field'], o['before'], o['after'], ';'.join(o['reviewCodes']), o['reason']] for o in applied])
outputs['pending-review.csv'] = encode_csv(['sourceRecordId', 'learningId', 'english', 'lessonId', 'reasons', 'sourceAuditStatus'],
    [[e['sourceRecordId'], e['id'], e['english'], e['lessonId'], ';'.join(e['review']['pendingReasons']), e['sourceSnapshot']['review']['status']] for e in pending])

parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
for name, content in outputs.items():
    target = OUT / name
    assert OUT.resolve() in target.resolve().parents
    if args.check:
        assert target.read_bytes() == content, f'Generated artifact differs: {name}'
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
for name, expected in hashes.items():
    assert digest(name) == expected, f'Input modified: {name}'
print(json.dumps({k: summary[k] for k in ['internalRecords', 'lessons', 'confirmedSourceRecords', 'changedRecords', 'changedFields',
      'fieldChangeCounts', 'pronunciationChanges', 'readyForInternalQuestions', 'pendingQuestions',
      'lessonsWithInternalQuestions', 'lessonsWithTenReadyQuestions', 'conflicts']}, ensure_ascii=True, indent=2))
