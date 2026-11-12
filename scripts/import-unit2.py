"""Bản chép đối chiếu trực quan 6 trang Unit2.pdf; không suy diễn bản dịch.
Chạy python scripts/import-unit2.py để tái tạo JSON và báo cáo số lượng.
PDF nguồn không được sao chép vào public/.
"""
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
# Mỗi dòng tương ứng chính xác một hàng PDF, mỗi ô: tiếng Anh ~ loại từ ~ nghĩa gốc.
# Khoảng trắng xuống dòng trong PDF được nối; dấu câu và nghĩa được giữ nguyên.
SOURCE = """Physique~n~Vóc dáng cơ thể|Physical~adj~Thuộc thể chất|Build / Constitution~n~Thể hình, thể trạng|Athletic physique~~Vóc dáng thể thao, săn chắc
Stature~n~Vóc người / Tầm vóc|Statuesque~adj~Cao ráo, uy nghi|Height / Standing~n~Chiều cao / Vị thế|Grow in stature~~Phát triển tầm vóc / Nâng cao vị thế
Maturation~n~Quá trình trưởng thành|Mature~v/adj~Trưởng thành|Development~n~Sự phát triển|Biological maturation~~Sự trưởng thành sinh học
Puberty~n~Tuổi dậy thì|Pubescent~adj~Đến tuổi dậy thì|Adolescence~n~Tuổi vị thành niên|Reach puberty~~Đến tuổi dậy thì
Metabolism~n~Quá trình trao đổi chất|Metabolic~adj~Thuộc trao đổi chất|Anabolism/Catabolism~n~Đồng/Dị hóa|Boost metabolism~~Tăng cường trao đổi chất
Anatomy~n~Giải ph học|Anatomical~adj~Thuộc giải phẫu|Body structure~n~Cấu trúc cơ thể|Human anatomy~~Giải phẫu cơ thể người
Physiology~n~Sinh lý học|Physiological~adj~Thuộc sinh lý|Bodily function~n~Chức năng cơ thể|Physiological changes~~Những biến đổi sinh lý
Longevity~n~Tuổi thọ|Long-lived~adj~Sống lâu|Life expectancy~n~Kỳ vọng sống|Ensure longevity~~Đảm bảo trường thọ
Senility~n~Sự lão suy, lú lẫn tuổi già|Senile~adj~Lão suy, già nua|Old age / Cognitive decline~n~Tuổi già / Suy giảm nhận thức|Show signs of senility~~Cho thấy dấu hiệu lú lẫn
Degeneration~n~Sự thoái hóa|Degenerate~v/adj~Thoái hóa|Deterioration~n~Sự xuống cấp, suy giảm|Joint degeneration~~Sự thoái hóa khớp
Vigour~n~Sức sống, sự cường tráng|Vigorous~adj~Mạnh mẽ, tràn năng lượng|Vitality~n~Sức sống mãnh liệt|Youthful vigour~~Sức sống tuổi trẻ
Robust~adj~Khỏe mạnh, vạm vỡ|Robustness~n~Sự tráng kiện|Sturdy / Hardiness~adj/n~Cứng cáp, bền bỉ|Robust health~~Sức khỏe cường tráng
Frailty~n~Sự yếu ớt, mỏng manh|Frail~adj~Yếu ớt, dễ tổn thương|Vulnerability~n~Tính dễ bị tổn thương|Physical frailty~~Sự yếu ớt về thể xác
Nutrient~n~Chất dinh dưỡng|Nutrition~n~Dinh dưỡng học|Nourishment~n~Chất nuôi dưỡng|Essential nutrients~~Các chất dinh dưỡng thiết yếu
Malnutrition~n~Suy dinh dưỡng|Malnourished~adj~Bị suy dinh dưỡng|Undernourishment~n~Thiếu ăn, thiếu dưỡng chất|Severe malnutrition~~Tình trạng suy dinh dưỡng nặng
Obesity~n~Bệnh béo phì|Obese~adj~Béo phì|Overweight~adj~Thừa cân|Childhood obesity~~Béo phì ở trẻ em
Sedentary~adj~Ít vận động, ngồi nhiều|Sedentariness~n~Lối sống tĩnh tại|Inactive~adj~Kém vận động|Sedentary lifestyle~~Lối sống ít vận động
Immunity~n~Hệ miễn dịch / Sức đề kháng|Immune~adj~Miễn dịch|Resistance~n~Sức kháng bệnh|Boost the immune system~~Tăng cường hệ miễn dịch
Ailment~n~Bệnh tật nhẹ, ốm vặt|Ail~v~Gây đau ốm|Minor illness / Malady~n~Bệnh nhẹ / Cơn đau|Common ailments~~Các bệnh vặt thông thường
Chronic~adj~Mãn tính (bệnh kéo dài)|Chronicity~n~Tính mãn tính|Long-standing~adj~Kéo dài lâu năm|Chronic disease~~Bệnh mãn tính
Epidemic~n/adj~Bệnh dịch, dịch lan rộng|Pandemic~n~Đại dịch toàn cầu|Outbreak~n~Sự bùng phát dịch|Combat an epidemic~~Chống lại dịch bệnh
Symptom~n~Triệu chứng bệnh|Symptomatic~adj~Có triệu chứng|Sign / Manifestation~n~Dấu hiệu / Biểu hiện|Exhibiting symptoms~~Biểu hiện các triệu chứng
Diagnosis~n~Sự chẩn đoán|Diagnose~v~Chẩn đoán bệnh|Detection / Identification~n~Sự phát hiện|Early diagnosis~~Chẩn đoán sớm
Therapy~n~Liệu pháp điều trị|Therapeutic~adj~Mang tính chữa bệnh|Treatment / Remedy~n~Phương pháp chữa trị|Physical therapy~~Vật lý trị liệu
Rehabilitation~n~Sự phục hồi chức năng|Rehabilitate~v~Phục hồi|Recovery~n~Sự hồi phục|Undergo rehabilitation~~Trải qua phục hồi chức năng
Wellness~n~Tình trạng khỏe mạnh toàn diện|Well-being~n~Sự thịnh vượng, khỏe mạnh|Fitness~n~Thể hình, sự sung sức|Mental and physical wellness~~Sức khỏe thể chất và tinh thần
Cognition~n~Nhận thức, quá trình nhận thức|Cognitive~adj~Thuộc nhận thức|Perception~n~Sự nhận thức, cảm nhận|Cognitive development~~Sự phát triển nhận thức
Intellect~n~Trí tuệ, khả năng tư duy|Intellectual~adj/n~Thuộc trí tuệ / Tri thức|Intelligence~n~Trí thông minh|Intellectual capacity~~Năng lực trí tuệ
Acumen~n~Sự nhạy bén, sắc sảo|Acute~adj~Sắc bén, nhạy bén|Shrewdness~n~Sự khôn ngoan, sắc sảo|Business acumen~~Sự nhạy bén trong kinh doanh
Perception~n~Sự nhận thức, góc nhìn|Perceive~v~Nhận thức, nhìn nhận|Viewpoint / Insight~n~Góc nhìn / Sự thấu hiểu|Change public perception~~Thay đổi nhận thức công chúng
Comprehend~v~Lĩnh hội, hiểu thấu đáo|Comprehension~n~Sự hiểu biết|Fathom / Grasp~v~Thấu hiểu / Nắm bắt|Beyond comprehension~~Vượt quá tầm hiểu biết
Reasoning~n~Lập luận, lý luận|Reason~v/n~Suy luận / Lý do|Logic / Rationale~n~Lập luận logic|Logical reasoning~~Khả năng lập luận logic
Faculty~n~Năng lực (của tâm trí/cơ thể)|Faculties~n.pl~Các giác quan/khả năng|Capability / Power~n~Năng lực|Mental faculties~~Các chức năng tinh thần/trí tuệ
Stimulate~v~Kích thích, khơi gợi|Stimulation~n~Sự kích thích|Provoke / Spur~v~Kích thích, thúc đẩy|Stimulate intellectual growth~~Kích thích phát triển trí tuệ
Aptitude~n~Năng khiếu, sở trường|Apt~adj~Có khiếu, thích hợp|Talent / Flair~n~Tài năng / Thiên hướng|Natural aptitude for~~Năng khiếu bẩm sinh về môn gì
Retention~n~Khả năng ghi nhớ, lưu giữ|Retain~v~Giữ lại, ghi nhớ|Memory / Recollection~n~Trí nhớ|Memory retention~~Khả năng lưu giữ trí nhớ
Abstract~adj~Trừu tượng|Abstraction~n~Tính trừu tượng|Theoretical~adj~Mang tính lý thuyết|Abstract thinking~~Tư duy trừu tượng
Intuition~n~trực giác|Intuitive~adj~Mang tính trực giác|Instinct~n~Bản năng|Trust one's intuition~~Tin vào trực giác của bản thân
Psychology~n~Tâm lý học|Psychological~adj~Thuộc tâm lý|Mental~adj~Thuộc về tâm trí|Psychological barrier~~Rào cản tâm lý
Subconscious~n/adj~Tiềm thức|Subconsciously~adv~Trong tiềm thức|Unconscious~n/adj~Vô thức|Subconscious mind~~Tâm trí tiềm thức
Resilience~n~Khả năng phục hồi tâm lý, kiên cường|Resilient~adj~Kiên cường, bền bỉ|Toughness / Bouncing back~n~Sự dai sức|Build emotional resilience~~Xây dựng sự kiên cường cảm xúc
Vulnerability~n~Tính dễ bị tổn thương|Vulnerable~adj~Dễ bị tổn thương|Susceptibility~n~Tính nhạy cảm, dễ nhiễm|Emotional vulnerability~~Sự dễ tổn thương về cảm xúc
Trauma~n~Chấn thương tâm lý|Traumatic~adj~Gây chấn thương sâu sắc|Psychological shock~n~Cú sốc tâm lý|Childhood trauma~~Chấn thương thời thơ ấu
Anxiety~n~Sự lo âu, bồn chồn|Anxious~adj~Lo lắng|Apprehension / Distress~n~Sự sợ hãi lo âu|Deal with anxiety~~Đối phó với sự lo âu
Coping~n/adj~Sự đối phó, đương đầu|Cope~v~Đương đầu, vượt qua|Managing / Handling~v~Xử lý, quản lý|Coping mechanisms~~Cơ chế đối phó với áp lực
Inhibition~n~Sự ức chế, sự rụt rè|Inhibit~v~Cản trở, ức chế|Constraint / Restraint~n~Sự kìm hãm|Overcome inhibitions~~Vượt qua sự rụt rè, e ngại
Ego~n~Cái tôi, lòng tự ái|Egotistic~adj~Ích kỷ, tự cao|Self-esteem / Pride~n~Lòng tự trọng|Boost self-esteem~~Nâng cao lòng tự trọng
Alienation~n~Sự tha hóa, cảm giác bị cô lập|Alienate~v~Làm xa lánh, cô lập|Isolation / Estrangement~n~Sự cô lập|Feel a sense of alienation~~Cảm thấy bị cô lập với xã hội
Catharsis~n~Sự giải tỏa cảm xúc|Cathartic~adj~Mang tính giải tỏa|Emotional release~n~Sự trút bỏ cảm xúc|Achieve catharsis~~Đạt được sự giải tỏa tâm lý
Equanimity~n~Sự bình thản, điềm tĩnh|Equanimous~adj~Điềm tĩnh|Composure / Serenity~n~Sự tĩnh tâm|Maintain equanimity~~Giữ sự điềm tĩnh trong nghịch cảnh"""

SECTIONS = [
    {"id": "a", "title": "Phần A: Cấu trúc cơ thể & Sự phát triển sinh học", "description": "Hàng 1–13 trong PDF."},
    {"id": "b", "title": "Phần B: Sức khỏe thể chất, Bệnh tật & Dinh dưỡng", "description": "Hàng 14–26 trong PDF."},
    {"id": "c", "title": "Phần C: Nhận thức, Trí tuệ & Tư duy", "description": "Hàng 27–38 trong PDF."},
    {"id": "d", "title": "Phần D: Tâm lý học, Cảm xúc & Sự phát triển tinh thần", "description": "Hàng 39–50 trong PDF."},
]
CATEGORIES = ["base_word", "word_family", "synonym", "collocation"]
# Chỉ tách nghĩa khi nguồn thể hiện cặp tương ứng. Nghĩa chung giữ nguyên cho cả hai mục.
SPLIT_MEANINGS = {
    1: ["Thể hình", "thể trạng"], 2: ["Chiều cao", "Vị thế"],
    5: ["Đồng hóa", "Dị hóa"], 9: ["Tuổi già", "Suy giảm nhận thức"],
    12: ["Cứng cáp", "bền bỉ"], 19: ["Bệnh nhẹ", "Cơn đau"],
    22: ["Dấu hiệu", "Biểu hiện"], 30: ["Góc nhìn", "Sự thấu hiểu"],
    31: ["Thấu hiểu", "Nắm bắt"], 34: ["Kích thích", "thúc đẩy"],
    35: ["Tài năng", "Thiên hướng"],
}
SHARED_MEANING_ROWS = [23, 24, 32, 33, 36, 41, 44, 45, 46, 47, 48, 50]
NOTES = [
    (1, "synonym", "Nghĩa ghép bằng dấu phẩy; tách theo thứ tự Build → Thể hình, Constitution → thể trạng. Cần duyệt ánh xạ."),
    (5, "synonym", "Nguồn viết rút gọn Đồng/Dị hóa; triển khai thành Đồng hóa và Dị hóa, không bổ sung nghĩa."),
    (6, "base_word", "PDF in Giải ph học, có dấu hiệu thiếu chữ. Giữ nguyên, chưa tự sửa thành Giải phẫu học."),
    (12, "synonym", "Tách adj/n theo thứ tự Sturdy/Hardiness, giữ nguyên Cứng cáp/bền bỉ; cần rà soát loại từ và bản dịch của Hardiness."),
    (19, "synonym", "Giữ ánh xạ theo thứ tự Minor illness → Bệnh nhẹ, Malady → Cơn đau; cần rà soát bản dịch Malady trong nguồn."),
    (28, "word_family", "PDF ghi Tri thức cho Intellectual (adj/n); giữ nguyên cách viết, cần rà soát nghĩa danh từ."),
    (34, "synonym", "Nghĩa ghép bằng dấu phẩy; tách theo thứ tự Provoke → Kích thích, Spur → thúc đẩy. Cần duyệt ánh xạ."),
]

def main():
    cards, source_rows, notes = [], [], []
    for row, line in enumerate(SOURCE.splitlines(), 1):
        section = "a" if row <= 13 else "b" if row <= 26 else "c" if row <= 38 else "d"
        cells = line.split("|")
        assert len(cells) == 4
        source = {"sourceRow": row, "section": section, "page": 1 if row <= 9 else 2 if row <= 18 else 3 if row <= 26 else 4 if row <= 35 else 5 if row <= 43 else 6, "cells": {}}
        for category, cell in zip(CATEGORIES, cells):
            english, pos, meaning = cell.split("~")
            source["cells"][category] = {"english": english, "partOfSpeech": pos or None, "vietnamese": meaning}
            words = [w.strip() for w in english.split("/")] if category == "synonym" else [english]
            meanings = SPLIT_MEANINGS.get(row, [meaning] * len(words)) if category == "synonym" else [meaning]
            assert len(words) == len(meanings)
            for item, (word, translated) in enumerate(zip(words, meanings), 1):
                part = (["adj", "n"][item - 1] if row == 12 and category == "synonym" else pos) or None
                cards.append({"id": f"unit-2-r{row:03d}-{category.replace('_', '-')}-{item:02d}", "unitId": "unit-2", "section": section, "category": category, "vietnamese": translated, "english": word, "partOfSpeech": part, "sourceRow": row})
        source_rows.append(source)
    assert len(source_rows) == 50 and len({c['id'] for c in cards}) == len(cards)
    for row, category, reason in NOTES + [(r, "synonym", "PDF chỉ cung cấp một nghĩa chung cho hai từ/cụm. Mỗi từ có một thẻ, cùng giữ nguyên nghĩa nguồn; cần rà soát bản dịch riêng trước khi xác nhận nội dung.") for r in SHARED_MEANING_ROWS]:
        cell = source_rows[row - 1]["cells"][category]
        notes.append({"sourceRow": row, "category": category, "original": f"{cell['english']} ({cell['partOfSpeech']}): {cell['vietnamese']}", "reason": reason})
    notes.sort(key=lambda n: (n['sourceRow'], n['category']))
    unit = {"id": "unit-2", "number": 2, "title": "Human Development & Health", "description": "Từ vựng về cấu trúc cơ thể, sức khỏe, nhận thức và tâm lý học từ Unit2.pdf.", "sections": SECTIONS, "dataFile": "data/units/unit2.json"}
    manifest_path = ROOT / 'public/data/units.json'
    existing_units = json.loads(manifest_path.read_text(encoding='utf-8'))['units'] if manifest_path.exists() else []
    published_units = [entry for entry in existing_units if entry['id'] != unit['id']] + [unit]
    outputs = {
        'public/data/units.json': {"schemaVersion": 1, "units": published_units},
        'public/data/units/unit2.json': {"schemaVersion": 1, "unitId": unit['id'], "source": {"fileName": "Unit2.pdf", "pages": 6, "sourceRowCount": 50, "method": "Text extraction and visual verification of all six pages"}, "flashcards": cards, "reviewNotes": notes},
        'docs/unit2-source-rows.json': {"sourceFile": "Unit2.pdf", "rows": source_rows},
    }
    for relative, value in outputs.items():
        path = ROOT / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = {"total": len(cards), "sections": dict(Counter(c['section'] for c in cards)), "categories": dict(Counter(c['category'] for c in cards)), "sourceRows": len(source_rows), "reviewNotes": len(notes)}
    (ROOT / 'docs/unit2-counts.json').write_text(json.dumps(counts, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(counts))

if __name__ == '__main__':
    main()
