"""Approval is explicit, exact-choice scoped, and separate from publication."""
import copy
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('toeic_unlock', ROOT / 'scripts/prepare-toeic-unlock.py')
unlock = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(unlock)


class UnlockPreparationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.state = unlock.load_state()
        cls.outputs = unlock.build_report(cls.state)

    def test_packet_is_unapproved_and_reproduces_exactly(self):
        for name, content in self.outputs.items():
            self.assertEqual((unlock.OUT / name).read_bytes(), content)
        rows = unlock.read_csv(unlock.OUT / 'approval-table.csv')
        self.assertEqual(len(rows), 600)
        self.assertEqual(unlock.validate_decisions(self.state, rows), self.state['ready'])
        self.assertTrue(all(not r[c] for r in rows for c in unlock.ADMIN_COLUMNS))
        report = json.loads(self.outputs['readiness.json'])
        self.assertFalse(report['publication']['publishable'])
        self.assertFalse(report['publication']['publicUnlockAllowed'])
        self.assertEqual(report['actualNewAdminApprovals'], 0)

    def test_28_approved_sets_are_preserved_exactly(self):
        for record_id in self.state['ready']:
            old = self.state['byId'][record_id]
            packet = self.state['packets'][record_id]
            self.assertEqual(packet['prompt'], old['vietnamese'])
            self.assertEqual(packet['partOfSpeech'], old['partOfSpeech'])
            self.assertEqual(packet['distractorIds'], old['quiz']['distractorIds'])
            self.assertEqual(packet['correctId'], record_id)
            self.assertEqual(len(packet['options']), 4)
        self.assertEqual(len(self.state['ready']), 28)

    def test_no_implicit_dependency_approval_and_25_items_held(self):
        current = unlock.readiness(self.state, self.state['ready'])
        self.assertEqual(current['approvedContentCount'], 28)
        self.assertEqual(current['completeQuestionCount'], 0)
        self.assertEqual(current['lessonsPlayableIgnoringRights'], 0)
        self.assertEqual(len(current['blockedQuestions']), 28)
        future_ids = self.state['ready'] | {i for i, p in self.state['packets'].items() if p['category'] == 'R'}
        future = unlock.readiness(self.state, future_ids)
        self.assertEqual(future['approvedContentCount'], 575)
        self.assertEqual(future['completeQuestionCount'], 570)
        self.assertEqual(future['lessonsPlayableIgnoringRights'], 50)
        self.assertEqual(future['lessonsWithTen'], 48)
        self.assertEqual([(l['id'], l['roundQuestionCount']) for l in future['lessons'] if l['roundQuestionCount'] < 10],
                         [('toeic600-mix-17', 9), ('toeic600-mix-25', 9)])
        self.assertEqual({self.state['byId'][i]['english'] for b in future['blockedQuestions'] for i in b['hiddenDistractorIds']},
                         {'assignment', 'perceptive', 'resolve', 'supply', 'housekeeper'})
        self.assertEqual(future['publicLessonsOpenable'], 0)

    def test_missing_id_duplicate_id_and_changed_four_option_set_are_rejected(self):
        variants = []
        variants.append(copy.deepcopy(self.state['rows'][:-1]))
        duplicate = copy.deepcopy(self.state['rows'])
        duplicate[-1] = duplicate[0]
        variants.append(duplicate)
        for field, value in [('Nghĩa chờ phê duyệt cho Quiz', 'Changed'), ('Nhiễu 1 ID', 'different-id'),
                             ('ID nguồn', 'wrong-source'), ('Nhóm', 'R'),
                             ('SHA256 bộ câu hỏi và bốn lựa chọn', 'forged')]:
            rows = copy.deepcopy(self.state['rows'])
            row = next(r for r in rows if r['Nhóm'] == 'A')
            row[field] = value
            variants.append(rows)
        for rows in variants:
            with self.subTest(variant=variants.index(rows)):
                with self.assertRaises(ValueError):
                    unlock.validate_decisions(self.state, rows)

    def test_only_explicit_R_approval_with_reviewer_and_date_is_counted(self):
        rows = copy.deepcopy(self.state['rows'])
        target = next(r for r in rows if r['Nhóm'] == 'R')
        target['Quyết định quản trị'] = 'Duyệt'
        with self.assertRaises(ValueError):
            unlock.validate_decisions(self.state, rows)
        target['Người duyệt'] = 'TEST ONLY — not an administrator decision'
        target['Ngày duyệt (YYYY-MM-DD)'] = '2026-11-18'
        accepted = unlock.validate_decisions(self.state, rows)
        self.assertEqual(accepted, self.state['ready'] | {target['ID']})
        self.assertFalse(any(self.state['byId'][i]['quiz']['status'] != 'pending-review'
                             for i in accepted - self.state['ready']))
        target['Ngày duyệt (YYYY-MM-DD)'] = '2026-02-30'
        with self.assertRaises(ValueError):
            unlock.validate_decisions(self.state, rows)

    def test_hold_approval_and_overwriting_existing_approval_are_rejected(self):
        for category in ('A', 'C', 'M'):
            rows = copy.deepcopy(self.state['rows'])
            target = next(r for r in rows if r['Nhóm'] == category)
            target.update({'Quyết định quản trị': 'Duyệt', 'Người duyệt': 'TEST ONLY',
                           'Ngày duyệt (YYYY-MM-DD)': '2026-11-18'})
            with self.subTest(category=category):
                with self.assertRaises(ValueError):
                    unlock.validate_decisions(self.state, rows)

    def test_explicit_approval_does_not_cascade_and_fully_approved_scenario_stays_private(self):
        rows = copy.deepcopy(self.state['rows'])
        for row in rows:
            if row['Nhóm'] == 'R':
                row.update({'Quyết định quản trị': 'Duyệt', 'Người duyệt': 'TEST ONLY — hypothetical',
                            'Ngày duyệt (YYYY-MM-DD)': '2026-11-18'})
        approved = unlock.validate_decisions(self.state, rows)
        self.assertEqual(len(approved), 575)
        self.assertEqual(unlock.readiness(self.state, approved)['publicLessonsOpenable'], 0)
        one = next(r for r in rows if r['Nhóm'] == 'R')
        one['Quyết định quản trị'] = 'Tạm loại'
        self.assertEqual(len(unlock.validate_decisions(self.state, rows)), 574)

    def test_generator_never_overwrites_human_decisions(self):
        original_out = unlock.OUT
        with tempfile.TemporaryDirectory() as temp:
            try:
                unlock.OUT = Path(temp)
                unlock.write_packet(self.outputs)
                table = unlock.OUT / 'approval-table.csv'
                edited = table.read_bytes() + b'USER WORK'
                table.write_bytes(edited)
                with self.assertRaises(ValueError):
                    unlock.write_packet(self.outputs)
                self.assertEqual(table.read_bytes(), edited)
            finally:
                unlock.OUT = original_out

    def test_current_quiz_logic_uses_exact_sets_and_shows_short_round_size(self):
        # No statuses are applied to learning files: these are hypothetical views
        # for the existing pure functions. Neither source nor app code is edited.
        payload = {'entries': self.state['entries'], 'packets': list(self.state['packets'].values())}
        js = r'''
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeQuizQuestions,createQuizRound,gradeQuizAnswer,quizTextKey} from './src/utils/toeicQuiz.ts';
const {entries,packets}=JSON.parse(fs.readFileSync(0,'utf8'));
const byId=new Map(packets.map(p=>[p.id,p]));
const views=entries.map(e=>{const p=byId.get(e.id);return {...e,vietnamese:p.prompt,partOfSpeech:p.partOfSpeech,
  quiz:{...e.quiz,distractorIds:p.distractorIds}}});
const current=views.filter(e=>byId.get(e.id).category==='A');
assert.equal(current.length,28);
assert.equal(makeQuizQuestions(current,current).length,0);
const pool=views.filter(e=>['A','R'].includes(byId.get(e.id).category));
const expected=pool.filter(e=>e.quiz.distractorIds.every(id=>pool.some(p=>p.id===id)));
assert.equal(expected.length,570);
for(const seed of [7,193,5107,10009]){
 let s=seed;const random=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/2**32);
 const questions=makeQuizQuestions(pool,pool,random);
 assert.equal(questions.length,570);
 for(const q of questions){
   const p=byId.get(q.id);
   assert.deepEqual(q.options.map(o=>o.id).sort(),[p.correctId,...p.distractorIds].sort());
   assert.equal(q.prompt,p.prompt);
   assert.equal(new Set(q.options.map(o=>quizTextKey(o.english))).size,4);
   assert.equal(q.options.filter(o=>gradeQuizAnswer(q,o.id)).length,1);
   assert(q.options.every(o=>['A','R'].includes(byId.get(o.id).category)));
 }
 for(const lessonId of new Set(pool.map(e=>e.lessonId))){
   const ids=new Set(pool.filter(e=>e.lessonId===lessonId).map(e=>e.id));
   const round=createQuizRound(questions.filter(q=>ids.has(q.id)),random);
   const expectedSize=['toeic600-mix-17','toeic600-mix-25'].includes(lessonId)?9:10;
   assert.equal(round.length,expectedSize);
   assert.equal(new Set(round.map(q=>q.id)).size,expectedSize);
 }
 for(const count of [0,1,3,9,10,11,12])assert.equal(createQuizRound(questions.slice(0,count),random).length,Math.min(count,10));
}
console.log('PASS: exact choice sets; approved-pool dependencies; hidden C/M; 2,280 question checks; 200 rounds including 9-question lessons.');
'''
        result = subprocess.run(['node', '--input-type=module', '--eval', js], cwd=ROOT,
                                input=json.dumps(payload, ensure_ascii=True), capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
