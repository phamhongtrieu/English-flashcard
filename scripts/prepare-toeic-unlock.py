"""Prepare a PRIVATE, unapproved review packet. No learning-data/public writes.

--check verifies the initial packet. --reviewed FILE validates an administrator's
filled CSV and prints an in-memory readiness calculation; it does not apply the
decisions, export a dataset, or verify publication rights.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import io
import itertools
import json
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports/toeic-unlock'
ADMIN_COLUMNS = ('Quyết định quản trị', 'Người duyệt', 'Ngày duyệt (YYYY-MM-DD)', 'Ghi chú quản trị')


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':')).encode('utf-8')).hexdigest()


def read_json(relative):
    return json.loads((ROOT / relative).read_text(encoding='utf-8'))


def csv_bytes(rows):
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue().encode('utf-8-sig')


def read_csv(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if len(reader.fieldnames or []) != len(set(reader.fieldnames or [])):
            raise ValueError('Duplicate CSV columns')
        return list(reader)


def load_state():
    # Reuse editorial risk rules without running its writer or native simulation.
    spec = importlib.util.spec_from_file_location('toeic_bulk_review', ROOT / 'scripts/report-toeic-bulk-review.py')
    bulk = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bulk)
    expected_bulk, counts, _, _, bulk_rows = bulk.build()
    for name, data in expected_bulk.items():
        if (ROOT / 'reports/toeic-bulk-review' / name).read_bytes() != data:
            raise ValueError('Bulk dossier is stale or changed; reconcile it before preparing unlock: ' + name)
    assert dict(counts) == {'R': 547, 'M': 16, 'C': 9}
    manifest = read_json('data-internal/toeic-600/manifest.json')
    assert manifest['publication']['rightsStatus'] == 'unverified'
    assert not manifest['publication']['publishable'] and not manifest['publication']['publicUnlockAllowed']
    lessons = [read_json('data-internal/toeic-600/' + l['dataFile']) for l in manifest['lessons']]
    entries = [e for lesson in lessons for e in lesson['entries']]
    by_id = {e['id']: e for e in entries}
    assert len(entries) == len(by_id) == 600 and len(lessons) == 50
    assert all(len(lesson['entries']) == 12 for lesson in lessons)
    proposed = {r['ID']: r for r in bulk_rows}
    ready = {e['id'] for e in entries if e['quiz']['status'] == 'internal-ready'}
    assert len(ready) == 28 and len(proposed) == 572 and ready.isdisjoint(proposed)
    assert ready | set(proposed) == set(by_id)
    reviewed = {r['id']: r for r in read_json('data-internal/toeic-600/distractor-review.json')['reviewedQuestions']}
    assert set(reviewed) == ready
    risks = read_json('data-proposals/toeic-600/ambiguity-review.json')
    blocked = {bulk.pair(*p['sourceIds']) for p in risks['knownRiskPairs'] if p['bothRetained']}
    blocked.update(bulk.pair(*p['sourceIds']) for p in risks['newContextPairs'])
    blocked.update(bulk.pair(p['firstId'], p['secondId']) for p in risks['additionalExcludedSourcePairs'])
    extra = read_json('data-internal/toeic-600/distractor-review.json')['additionalBlockedPairs']
    groups = bulk.EXTRA_GROUPS + [[p['first'], p['second']] for p in extra]
    for a, b in itertools.combinations(entries, 2):
        if bulk.key(a['english']) == bulk.key(b['english']) or any(
                bulk.key(a['english']) in group and bulk.key(b['english']) in group for group in groups):
            blocked.add(bulk.pair(a['sourceRecordId'], b['sourceRecordId']))
    packets = {}
    for e in entries:
        if e['id'] in ready:
            r = reviewed[e['id']]
            assert (r['prompt'], r['partOfSpeech'], r['distractorIds']) == (
                e['vietnamese'], e['partOfSpeech'], e['quiz']['distractorIds'])
            category, prompt, pos, distractors = 'A', e['vietnamese'], e['partOfSpeech'], e['quiz']['distractorIds']
            reference = 'data-internal/toeic-600/distractor-review.json#' + e['id']
            reason = r['basis']
            evidence_hash = digest(r)
        else:
            r = proposed[e['id']]
            assert r['ID nguồn'] == e['sourceRecordId'] and r['Bài'] == e['lessonId']
            assert r['Từ tiếng Anh'] == e['english']
            assert r['Nghĩa nội bộ hiện tại'] == e['vietnamese']
            assert r['Loại từ nội bộ hiện tại'] == (e['partOfSpeech'] or '')
            assert not r['Quyết định quản trị (Giữ/Sửa/Tạm loại)'] and not r['Ghi chú quản trị']
            category, prompt, pos = r['Mã nhóm'], r['Nghĩa ngắn đề nghị cho Quiz'], r['Loại từ đề nghị cho Quiz']
            distractors = [r[f'Nhiễu {i} ID'] for i in range(1, 4)]
            assert all(by_id[c]['english'] == r[f'Nhiễu {i} tiếng Anh']
                       and by_id[c]['sourceRecordId'] == r[f'Nhiễu {i} ID nguồn'] for i, c in enumerate(distractors, 1))
            reference = 'reports/toeic-bulk-review/approval-table.csv#' + e['id']
            reason, evidence_hash = r['Lý do'], digest(r)
        option_ids = [e['id'], *distractors]
        assert len(option_ids) == len(set(option_ids)) == 4
        assert len({bulk.key(by_id[i]['english']) for i in option_ids}) == 4
        ambiguous = [i for i in distractors if bulk.pair(e['sourceRecordId'], by_id[i]['sourceRecordId']) in blocked]
        # Do not silently change an already approved four-option set.
        # Correct-vs-noise risk blocks it; a noise-vs-noise precaution is reported
        # separately and cannot itself create a second correct option.
        noise_pairs = [(a, b) for a, b in itertools.combinations(distractors, 2)
                       if bulk.pair(by_id[a]['sourceRecordId'], by_id[b]['sourceRecordId']) in blocked]
        assert not ambiguous, ('Known correct-answer conflict; stop this item', e['id'], ambiguous)
        if category == 'R':
            assert not noise_pairs, ('Bulk choice set differs from its reviewed risk policy', e['id'])
        packets[e['id']] = {
            'id': e['id'], 'sourceRecordId': e['sourceRecordId'], 'lessonId': e['lessonId'],
            'category': category, 'prompt': prompt, 'partOfSpeech': pos, 'correctId': e['id'],
            'distractorIds': list(distractors),
            'options': [{'id': i, 'sourceRecordId': by_id[i]['sourceRecordId'], 'english': by_id[i]['english']} for i in option_ids],
            'evidenceReference': reference, 'evidenceSha256': evidence_hash,
            'internalRecordSha256': digest(e), 'reason': reason,
            'knownCorrectVsDistractorConflicts': ambiguous,
            'distractorOnlyPrecautions': [list(p) for p in noise_pairs],
        }
        packets[e['id']]['questionSha256'] = digest(packets[e['id']])
    rows = []
    for e in entries:
        p = packets[e['id']]
        category = p['category']
        row = {
            'ID': e['id'], 'ID nguồn': e['sourceRecordId'], 'Bài': e['lessonId'],
            'Từ tiếng Anh': e['english'], 'Nhóm': category,
            'Trạng thái phê duyệt thực tế': 'Đã duyệt nội bộ — giữ nguyên' if category == 'A' else 'Chưa phê duyệt',
            'Tạm ẩn do cần biên tập': 'Có' if category in ('C', 'M') else 'Không',
            'Nghĩa nội bộ hiện tại': e['vietnamese'], 'Loại từ nội bộ hiện tại': e['partOfSpeech'] or '',
            'Nghĩa chờ phê duyệt cho Quiz': p['prompt'], 'Loại từ chờ phê duyệt cho Quiz': p['partOfSpeech'],
            'ID đáp án đúng': e['id'],
        }
        for i, option in enumerate(p['options'][1:], 1):
            row[f'Nhiễu {i} ID'] = option['id']
            row[f'Nhiễu {i} tiếng Anh'] = option['english']
        row.update({
            'SHA256 bộ câu hỏi và bốn lựa chọn': p['questionSha256'],
            'SHA256 bản ghi nội bộ': p['internalRecordSha256'],
            'SHA256 mục rà soát': p['evidenceSha256'],
            'Hồ sơ đối chiếu': p['evidenceReference'],
            'Lý do hoặc nội dung còn thiếu': p['reason'],
            'Cảnh báo giữa hai nhiễu': '; '.join(by_id[a]['english'] + ' / ' + by_id[b]['english']
                                                    for a, b in p['distractorOnlyPrecautions']),
            'Phạm vi quyết định': 'Nghĩa hỏi + loại từ + đáp án đúng + đúng ba nhiễu đã ghi; không xác nhận quyền xuất bản.',
            **{column: '' for column in ADMIN_COLUMNS},
        })
        rows.append(row)
    paths = [ROOT / 'toeic_600_words.csv', ROOT / 'scripts/report-toeic-bulk-review.py']
    for directory in ('data-internal/toeic-600', 'data-preparation/toeic', 'data-proposals/toeic-600',
                      'reports/toeic-bulk-review'):
        paths.extend(p for p in (ROOT / directory).rglob('*') if p.is_file())
    paths += [ROOT / f for f in ('src/utils/toeicQuiz.ts', 'src/services/toeicQuizLoader.ts',
                                 'src/components/toeic/ToeicQuizRound.tsx', 'public/data/toeic/catalog.json')]
    inputs = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths))}
    return {'manifest': manifest, 'entries': entries, 'byId': by_id, 'packets': packets,
            'ready': ready, 'rows': rows, 'inputs': inputs}


def validate_decisions(state, rows):
    expected = {r['ID']: r for r in state['rows']}
    if len(rows) != 600 or {r.get('ID') for r in rows} != set(expected):
        raise ValueError('Must contain exactly the existing 600 unique IDs, including 28 approved and 25 held rows')
    approved = set(state['ready'])
    for row in rows:
        record_id = row['ID']
        original = expected[record_id]
        if set(row) != set(original):
            raise ValueError('Unexpected/missing columns on ' + record_id)
        for column, value in original.items():
            if column not in ADMIN_COLUMNS and row[column] != value:
                raise ValueError(f'Changed immutable field {column} on {record_id}; needs renewed editorial review')
        decision = row['Quyết định quản trị'].strip()
        reviewer, reviewed_date = row['Người duyệt'].strip(), row['Ngày duyệt (YYYY-MM-DD)'].strip()
        if not decision:
            if reviewer or reviewed_date:
                raise ValueError('Reviewer/date without an explicit decision on ' + record_id)
            continue
        if row['Nhóm'] == 'A':
            raise ValueError('Do not overwrite the existing internal approval on ' + record_id)
        if decision not in ('Duyệt', 'Tạm loại', 'Chờ xử lý'):
            raise ValueError('Unknown decision on ' + record_id)
        if decision == 'Duyệt' and row['Nhóm'] != 'R':
            raise ValueError('C/M items remain hidden and require revised review first: ' + record_id)
        if not reviewer or not reviewed_date:
            raise ValueError('Explicit reviewer and ISO review date required on ' + record_id)
        try:
            if date.fromisoformat(reviewed_date).isoformat() != reviewed_date:
                raise ValueError('Not ISO date')
        except ValueError as error:
            raise ValueError('Invalid review date on ' + record_id) from error
        if decision == 'Duyệt':
            approved.add(record_id)
    return approved


def readiness(state, approved):
    """Approval of one prompt does not automatically approve its dependencies."""
    packets = state['packets']
    holds = {i for i, p in packets.items() if p['category'] in ('C', 'M')}
    if not state['ready'] <= approved or approved & holds:
        raise ValueError('Cannot remove the 28 retained approvals or promote a held item')
    if not approved <= set(packets):
        raise ValueError('Unknown approved IDs')
    approved_pool = set(approved) - holds
    eligible, blocked = [], []
    for record_id in sorted(approved_pool):
        p = packets[record_id]
        missing = [i for i in p['distractorIds'] if i not in approved_pool]
        if missing:
            blocked.append({'id': record_id, 'lessonId': p['lessonId'], 'missingDistractorIds': missing,
                            'hiddenDistractorIds': [i for i in missing if i in holds]})
        elif p['knownCorrectVsDistractorConflicts']:
            raise ValueError('Known ambiguous answer on ' + record_id)
        else:
            eligible.append(record_id)
    lessons = []
    for l in state['manifest']['lessons']:
        ids = [i for i in eligible if packets[i]['lessonId'] == l['id']]
        lessons.append({'id': l['id'], 'approvedContentCount': sum(packets[i]['lessonId'] == l['id'] for i in approved_pool),
                        'completeQuestionCount': len(ids), 'roundQuestionCount': min(10, len(ids)),
                        'questionIds': ids, 'canPlayIgnoringRights': bool(ids), 'canPubliclyUnlock': False})
    return {'approvedContentCount': len(approved_pool), 'completeQuestionCount': len(eligible),
            'lessonsPlayableIgnoringRights': sum(bool(l['completeQuestionCount']) for l in lessons),
            'lessonsWithTen': sum(l['completeQuestionCount'] >= 10 for l in lessons),
            'publicLessonsOpenable': 0, 'eligibleQuestionIds': eligible, 'blockedQuestions': blocked, 'lessons': lessons}


def build_report(state):
    current = readiness(state, state['ready'])
    hypothetical_ids = state['ready'] | {i for i, p in state['packets'].items() if p['category'] == 'R'}
    future = readiness(state, hypothetical_ids)
    assert current['approvedContentCount'] == 28 and current['completeQuestionCount'] == 0
    assert future['approvedContentCount'] == 575 and future['completeQuestionCount'] == 570
    assert future['lessonsPlayableIgnoringRights'] == 50 and future['lessonsWithTen'] == 48
    p = state['packets']
    report = {
        'schemaVersion': 1, 'documentType': 'private-unlock-approval-packet', 'reviewDate': '2026-11-18',
        'publication': {'rightsStatus': 'unverified', 'publishable': False, 'publicUnlockAllowed': False},
        'policy': {'sourceWrites': False, 'automaticApproval': False, 'preserveApprovedQuestions': True,
                   'preserveExactFourOptions': True, 'shufflePositionsOnly': True,
                   'hideCMQuestionsAndDistractors': True, 'requireApprovedDistractorRecords': True,
                   'maxQuestionsPerRound': 10, 'showActualRoundSize': True},
        'recordCount': 600, 'lessonCount': 50,
        'actualInternalApprovedCount': 28, 'pendingProposedCount': 547, 'hiddenCorrectionCount': 9,
        'hiddenAdminDecisionCount': 16, 'actualNewAdminApprovals': 0,
        'currentApprovedPool': current,
        'ifAll547ExplicitlyApproved': {'scenarioOnly': True, **future},
        'hiddenIds': sorted(i for i, q in p.items() if q['category'] in ('C', 'M')),
        'preservedInternalApprovedIds': sorted(state['ready']),
        'questionBindings': {i: {'sourceRecordId': q['sourceRecordId'], 'category': q['category'],
                                'questionSha256': q['questionSha256'], 'correctId': q['correctId'],
                                'distractorIds': q['distractorIds'],
                                'distractorOnlyPrecautions': q['distractorOnlyPrecautions']} for i, q in p.items()},
        'inputSha256': state['inputs'],
    }
    md = [
        '# Hồ sơ chuẩn bị mở khóa TOEIC — chưa mở công khai', '',
        'Ngày đối chiếu: 2026-11-18. **600 bản ghi / 50 bài; 28 câu đã duyệt nội bộ, '
        '547 câu chờ phê duyệt, 9 C + 16 M tạm ẩn. Không có phê duyệt mới được áp dụng.**', '',
        '## Bảng phê duyệt tổng hợp', '',
        '`approval-table.csv` có đúng 600 hàng: A = 28 câu đã duyệt nội bộ giữ nguyên; R = 547 đề nghị; '
        'C/M = 25 câu tạm ẩn. Chỉ nhóm R có thể ghi quyết định Duyệt cho phiên bản hiện tại. '
        'Bốn cột cuối để trống cho quản trị viên: Quyết định quản trị, Người duyệt, Ngày duyệt (YYYY-MM-DD), '
        'Ghi chú quản trị. Duyệt hoặc Tạm loại/Chờ xử lý cần tên và ngày rõ ràng; '
        'không dùng chỉ tên/ngày để suy ra đồng ý. C/M phải được biên tập/rà lại trước khi có thể duyệt.', '',
        'Mỗi hàng giữ ID học, ID nguồn, bài, nội dung trước và đề xuất, đúng ba ID/chữ tiếng Anh làm nhiễu, '
        'đáp án đúng và SHA-256 ràng buộc cả bộ câu hỏi. Duyệt áp dụng cho **nghĩa + loại từ + toàn bộ bốn '
        'lựa chọn cụ thể**, không chỉ riêng từ đúng. Đổi bất kỳ trường nào ngoài bốn cột quản trị sẽ bị chặn '
        'để rà lại. SHA-256 dùng phát hiện thay đổi, không xác thực danh tính/thẩm quyền người điền bảng.', '',
        'Kiểm tra bảng đã điền bằng `python scripts/prepare-toeic-unlock.py --reviewed <đường-dẫn-CSV>`. '
        'Lệnh này chỉ đối chiếu và in khả năng sẵn sàng trong bộ nhớ; **không áp dụng vào dữ liệu học, '
        'không xuất dữ liệu công khai và không xác nhận quyền tái sử dụng**. '
        'Script mặc định không ghi đè bảng đã có quyết định/ghi chú của người quản trị.', '',
        '## Số câu/bài thực sự có thể mở', '',
        '- Đã duyệt nội dung nội bộ thực tế: **28**; các tệp và bộ lựa chọn của 28 câu giữ nguyên.',
        '- Dữ liệu nội bộ hiện có vẫn giữ toàn bộ 600 mục để truy vết/kiểm thử. '
        'Hồ sơ mở khóa này tạm ẩn 25 mục C/M ở cả vai trò câu hỏi và vai trò nhiễu, không xóa chúng.',
        '- **0 bài có thể mở công khai:** quyền tái sử dụng chưa xác minh, 547 mục chưa có quyết định quản trị.',
        '- Nếu chỉ đưa các bản ghi đã duyệt vào bộ tải hiện có: **0 câu có đủ ba nhiễu đã duyệt, 0 bài**. '
        'Cả 28 câu đều đang tham chiếu ít nhất một bản ghi pending. Không tự duyệt các bản ghi nhiễu để lấp chỗ trống.',
        '- Riêng bộ kiểm thử nội bộ đầy đủ trước đây có 28 câu trong 22 bài với toàn bộ từ của fixture làm nguồn '
        'lựa chọn. Điều này không đồng nghĩa 22 bài đủ điều kiện xuất bản.',
        '- **Kịch bản giả định duyệt chính xác cả 547 R:** 575 bản ghi có nội dung đã duyệt, '
        '**570 câu đủ bốn lựa chọn**, 50 bài có thể chơi sau khi còn đáp ứng quyền sử dụng và bước tích hợp riêng. '
        '**48 bài đạt lượt 10 câu; bài 17 và 25 có 9 câu**, phải hiển thị 9. '
        'Năm câu đã duyệt vẫn bị giữ khỏi lượt chơi do nhiễu nằm trong 25 mục tạm ẩn.', '',
        'Mốc 50 bài đủ 10 câu ở báo cáo bulk trước là mô phỏng với tập đủ 600 đầu mục. '
        'Khi áp dụng ràng buộc mới chỉ dùng bản ghi được duyệt và tạm ẩn C/M cả ở lựa chọn, '
        'phải tính lại như trên. Không thay nhiễu đã duyệt để giữ nguyên con số cũ.', '',
        '## Năm bộ đã duyệt đang tham chiếu mục tạm ẩn', '',
        '| Câu đã duyệt | Bài | Nhiễu đang tạm ẩn | ID câu |',
        '| --- | --- | --- | --- |',
    ]
    for item in future['blockedQuestions']:
        q = p[item['id']]
        md.append(f'| {state["byId"][q["id"]]["english"]} | {q["lessonId"]} | '
                  + ', '.join(state['byId'][i]['english'] for i in item['hiddenDistractorIds'])
                  + f' | {q["id"]} |')
    md += ['', 'Giữ nguyên trạng thái duyệt nội bộ của năm câu trên; chỉ chặn khả năng mở trong kế hoạch này. '
           'Để bổ sung chúng, cần duyệt/xử lý các phụ thuộc hoặc xin duyệt riêng bộ nhiễu thay thế. '
           'Không tự thay một lựa chọn bất kỳ.', '',
           '## Kiểm tra đáp án và giao diện hiện có', '',
           'Các bộ đều có đúng một ID đáp án đúng, ba ID nhiễu cố định, bốn cách viết khác nhau; không có '
           'cặp đáp án đúng–nhiễu bị chặn theo 552 cặp thận trọng của hồ sơ bulk. '
           'Đánh giá ngữ nghĩa vẫn giới hạn ở các nghĩa/ngữ cảnh đã rà soát, không phải chứng minh mọi nghĩa hiếm.', '',
           'Ở câu portion, announcement và indicator là hai nhiễu có quan hệ gần nghĩa được báo cáo bulk '
           'chặn thận trọng; **cả hai đều không mang nghĩa một phần của tổng thể**. Đây là cảnh báo giữa '
           'hai lựa chọn sai, không tạo đáp án đúng thứ hai. Giữ nguyên bộ portion đã duyệt và ghi cảnh báo '
           'trong bảng; không tự thay bộ hoặc hủy phê duyệt. Các 547 bộ R không chứa cả cặp cảnh báo giữa hai nhiễu.', '',
           'Quiz hiện dùng `createQuizRound(...).slice(0, 10)` và hiển thị `round.length` ở câu hỏi/tổng kết. '
           'Do đó lượt ít hơn 10 câu đã hiển thị số thực tế; không cần sửa giao diện, lưu tiến độ hay Unit 2/3. '
           'Với đúng ba ID nhiễu, hệ thống chỉ trộn vị trí A/B/C/D, không chọn bộ nhiễu mới.', '',
           '## Thống kê 50 bài', '',
           'Các cột tương lai chỉ là giả định sau quyết định duyệt R, chưa tính là bài mở công khai. '
           'Cột hiện tại tính với tập bản ghi đã duyệt, không lấy thêm nội dung pending làm nhiễu.', '',
           '| Bài | Đã duyệt nội bộ | Đủ bộ hiện tại | Đủ bộ nếu duyệt 547 R | Số câu/lượt khi đó |',
           '| --- | ---: | ---: | ---: | ---: |']
    current_by_lesson = {l['id']: l for l in current['lessons']}
    for lesson in future['lessons']:
        now = current_by_lesson[lesson['id']]
        md.append(f'| {lesson["id"]} | {now["approvedContentCount"]} | {now["completeQuestionCount"]} | '
                  f'{lesson["completeQuestionCount"]} | {lesson["roundQuestionCount"]} |')
    md += ['', '## Nội dung còn thiếu và điều kiện hoàn thành', '',
           '- Quản trị viên phê duyệt rõ ràng từng bộ R hoặc đánh dấu Tạm loại/Chờ xử lý; không suy ra duyệt '
           'từ nhãn đủ căn cứ hay từ việc yêu cầu chuẩn bị mở khóa.',
           '- 9 C cần sửa và duyệt lại; 16 M cần quyết định phạm vi/cách hỏi. Danh sách đầy đủ theo ID và lý do '
           'ở bảng tổng hợp; các mục này vẫn giữ nguyên trong dữ liệu nội bộ/nguồn.',
           '- Xử lý phụ thuộc assignment, perceptive, resolve, supply, housekeeper hoặc duyệt bộ nhiễu thay thế '
           'cho năm câu đã nêu. Muốn cả 50 bài đều có ít nhất 10 câu phải bổ sung ít nhất một câu hợp lệ ở '
           'bài 17 và một ở bài 25; không bắt buộc làm đủ 10 để cho phép lượt ít câu.',
           '- Xác minh quyền với **mọi nội dung thực sự đăng**, gồm nghĩa hỏi, từ/nhãn và các chữ dùng làm '
           'nhiễu; lưu tài liệu tham chiếu/phạm vi sử dụng. Không mặc định duyệt nội dung đồng nghĩa cấp quyền.',
           '- Sau quyết định và quyền sử dụng còn cần một bước tích hợp riêng có kiểm soát vào schema Quiz, '
           'kiểm tra lại ID/bộ bốn và bài được phép mở, rồi mới xét thay catalog. Hồ sơ này không sinh catalog '
           'hoặc dữ liệu cho public/dist và không có lệnh xuất bản.', '',
           '## Tệp và kiểm tra', '',
           '- `approval-table.csv`: một bảng 600 hàng để duyệt, không phải dataset học mới.',
           '- `readiness.json`: kế hoạch đóng mặc định, phụ thuộc theo ID, hash đầu vào, thống kê hiện tại '
           'và kịch bản giả định; không chứa một tập entries học mới.',
           '- `python scripts/prepare-toeic-unlock.py --check`: đối chiếu bảng/plan và ô duyệt trống.',
           '- `python -m unittest discover -s tests -p test_toeic_unlock.py`: kiểm tra cả trường hợp sửa '
           'trái phép, đổi bộ nhiễu, thiếu ID, tự duyệt C/M, thiếu người/ngày và phụ thuộc chưa duyệt.',
           '- Nguồn CSV/JSON, 28 phê duyệt hiện có, UUID, mã Quiz, Unit 2/3 và LocalStorage giữ nguyên. '
           'Không mở khóa công khai, push hoặc deploy.', '',
           '## Kết quả kiểm tra ngày 2026-11-18', '',
           '- TypeScript: `npm.cmd run typecheck` đạt.',
           '- 9 kiểm thử mới trong `tests/test_toeic_unlock.py` đạt; bao gồm 2.280 câu hỏi và 200 lượt '
           'mô phỏng bằng logic Quiz hiện có, kiểm tra bộ bốn cố định, phụ thuộc và hai bài 9 câu.',
           '- 6 kiểm thử Playwright (5 logic hiện có + `tests/toeic-unlock.spec.ts`) đạt. '
           'Kiểm tra trình duyệt chỉ dùng demo độc lập, hiển thị lượt 4 câu và tổng kết 4/4; '
           '50 bài TOEIC thật vẫn không có nút chơi.',
           '- 9 kiểm thử Node hiện có và 3 kiểm thử Python chuẩn bị nguồn đạt; '
           '`check-toeic-600.py` và chốt xuất bản cho cả public/dist đạt. Tổng cộng 27 kiểm thử đạt.',
           '- Hash trước/sau: 281 tệp đã có không đổi. Chỉ thêm ba tệp hồ sơ ở thư mục này, '
           '`scripts/prepare-toeic-unlock.py`, `tests/test_toeic_unlock.py`, `tests/toeic-unlock.spec.ts`.',
           '- Không chạy build mới trong lượt chuẩn bị hồ sơ; quét lại dist hiện có, giữ nguyên mã ứng dụng '
           'và nội dung public/production. Server preview dùng kiểm thử đã dừng.', '']
    return {'approval-table.csv': csv_bytes(state['rows']),
            'readiness.json': (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'),
            'README.md': '\n'.join(md).encode('utf-8')}


def write_packet(outputs):
    # Preflight every target before writing any, to preserve human decisions.
    for name, data in outputs.items():
        target = OUT / name
        if target.exists() and target.read_bytes() != data:
            raise ValueError('Existing packet differs; refusing to overwrite administrator work: ' + str(target))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, data in outputs.items():
        target = OUT / name
        if not target.exists():
            target.write_bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--reviewed', type=Path, help='read-only validation of a filled copy of the approval CSV')
    args = parser.parse_args()
    state = load_state()
    if args.reviewed:
        approved = validate_decisions(state, read_csv(args.reviewed))
        result = readiness(state, approved)
        print(json.dumps({'mode': 'reviewed-csv-check-only', 'decisionsAppliedToLearningData': False,
                          'rightsVerified': False, **result}, ensure_ascii=True))
        return
    outputs = build_report(state)
    if args.check:
        for name, data in outputs.items():
            if (OUT / name).read_bytes() != data:
                raise ValueError('Packet changed; validate an edited table using --reviewed: ' + name)
        assert validate_decisions(state, read_csv(OUT / 'approval-table.csv')) == state['ready']
    else:
        write_packet(outputs)
    print(json.dumps({'mode': 'check' if args.check else 'private-report-only', 'records': 600,
                      'actualInternalApproved': 28, 'newAdminApprovals': 0, 'pendingR': 547, 'hiddenCM': 25,
                      'currentPublicLessonsOpenable': 0, 'currentCompleteApprovedSets': 0,
                      'conditionalCompleteSetsAfterR': 570, 'conditionalLessonsPlayable': 50,
                      'conditionalLessonsWithTen': 48, 'sourceWrites': 0}, ensure_ascii=True))


if __name__ == '__main__':
    main()
