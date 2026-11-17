"""Offline invariants for source fidelity and persistent identity."""
import csv
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('prepare_toeic', ROOT / 'scripts/prepare-toeic.py')
PREPARE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)


class ToeicPreparationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / 'output'
        self.output.mkdir()
        shutil.copyfile(ROOT / 'data-preparation/toeic/id-registry.json', self.output / 'id-registry.json')
        self.source = ROOT / 'toeic_600_words.csv'

    def cards(self):
        manifest = json.loads((self.output / 'manifest.json').read_text(encoding='utf-8'))
        return [card for unit in manifest['units'] for card in json.loads(
            (self.output / 'units' / Path(unit['dataFile']).name).read_text(encoding='utf-8'))['flashcards']]

    def test_source_fidelity_and_order(self):
        audit = PREPARE.prepare(self.source, self.output)
        _, rows = PREPARE.read_csv(self.source)
        self.assertEqual(audit['validRecords'], len(rows))
        self.assertEqual(audit['lessonCount'], 50)
        self.assertEqual([lesson['topic'] for lesson in audit['lessons']], list(dict.fromkeys(r['topic'] for _, _, _, r in rows)))
        by_record = {card['source']['record']: card for card in self.cards()}
        self.assertEqual(len({card['id'] for card in by_record.values()}), len(rows))
        for record, _, _, row in rows:
            card = by_record[record]
            for original, prepared in [('english', 'english'), ('vietnamese', 'vietnamese'),
                                       ('type', 'partOfSpeechOriginal'), ('example', 'example'),
                                       ('example_vietnamese', 'exampleTranslation'), ('pronounce', 'pronunciation')]:
                self.assertEqual(card[prepared], row[original])
            self.assertNotIn('audio_url', card)
            self.assertNotIn('image_url', card)
        self.assertFalse(audit['publication']['publishable'])

    def test_ids_survive_reorder_and_content_corrections(self):
        PREPARE.prepare(self.source, self.output)
        before = {(card['source']['topic'], card['english']): card['id'] for card in self.cards()}
        _, rows = PREPARE.read_csv(self.source)
        changed = [dict(row) for _, _, _, row in reversed(rows)]
        changed[0]['vietnamese'] = 'Edited meaning for identity test'
        changed[0]['type'] = 'n.'
        new_source = Path(self.temp.name) / 'reordered.csv'
        with new_source.open('w', encoding='utf-8', newline='') as stream:
            writer = csv.DictWriter(stream, fieldnames=PREPARE.FIELDS)
            writer.writeheader()
            writer.writerows(changed)
        PREPARE.prepare(new_source, self.output)
        after = {(card['source']['topic'], card['english']): card['id'] for card in self.cards()}
        self.assertEqual(before, after)

    def test_rejects_malformed_csv(self):
        source = Path(self.temp.name) / 'malformed.csv'
        source.write_text(','.join(PREPARE.FIELDS) + '\nword,n.,meaning\n', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Malformed CSV'):
            PREPARE.prepare(source, self.output)


if __name__ == '__main__':
    unittest.main()
