"""Reviewed transcription of all 50 rows in Unit3.pdf (9 pages).

No PDF is shipped to public/. Stable IDs depend on source row, category and
item position, never on load order or random values. Unit 2 is never written.
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATEGORIES = ('base_word', 'word_family', 'synonym', 'collocation')
# Each cell: English ~ source part of speech (blank when absent) ~ Vietnamese.
SOURCE = """Diet~n/v~Chế độ ăn uống|Dietary~adj~Thuộc chế độ ăn|Eating pattern~n~Thói quen ăn uống|Balanced diet~~Chế độ ăn cân bằng dưỡng chất
Calorie~n~Calo (đơn vị năng lượng)|Caloric / Calorific~adj~Thuộc về calo|Energy value~n~Giá trị năng lượng|Caloric intake~~Lượng calo nạp vào cơ thể
Protein~n~Chất đạm|Proteinous~adj~Chứa nhiều đạm|Amino acid~n~Axit amin (cấu thành đạm)|Lean protein~~Đạm nạc (tốt cho cơ bắp)
Carbohydrate~n~Chất bột đường|Carb-heavy~adj~Nhiều tinh bột|Complex carb~n~Tinh bột hấp thụ chậm|Reduce carbohydrate intake~~Giảm lượng tinh bột nạp vào
Lipid~n~Chất béo, dầu mỡ|Lipidic~adj~Thuộc chất béo|Fat / Fatty acids~n/adj~Chất béo|Saturated fat~~Chất béo bão hòa (không tốt)
Metabolism~n~Sự trao đổi chất|Metabolic~adj~Thuộc trao đổi chất|Caloric burn~n~Sự đốt cháy calo|Boost metabolic rate~~Tăng tốc độ trao đổi chất
Additive~n~Chất phụ gia (trong thực phẩm)|Add~v~Thêm vào|Preservative~n~Chất bảo quản thực phẩm|Artificial additive~~Chất phụ gia nhân tạo
Organic~adj~Hữu cơ (sạch, tự nhiên)|Organically~adv~Một cách hữu cơ|Natural / Chemical-free~adj~Tự nhiên / Không hóa chất|Organic produce~~Nông sản hữu cơ
Processed~adj~Đã qua chế biến|Process~v/n~Quy trình chế biến|Refined~adj~Tinh chế, qua xử lý công nghiệp|Processed food~~Thực phẩm chế biến sẵn
Supplements~n~Thực phẩm bổ sung|Supplement~v~Bổ sung thêm|Dietary adjunct~n~Chất phụ trợ dinh dưỡng|Take vitamin supplements~~Uống vitamin bổ sung
Hydration~n~Sự cung cấp đủ nước|Hydrate~v~Cấp nước cho cơ thể|Fluid intake~n~Lượng chất lỏng nạp vào|Maintain proper hydration~~Duy trì đủ nước cho cơ thể
Dehydration~n~Tình trạng mất nước|Dehydrate~v~Làm mất nước|Water depletion~n~Sự cạn kiệt nước|Risk of dehydration~~Nguy cơ bị mất nước
Malnutrition~n~Suy dinh dưỡng|Malnourished~adj~Bị thiếu dinh dưỡng|Undernourishment~n~Tình trạng thiếu ăn|Combat malnutrition~~Chống lại tình trạng suy dinh dưỡng
Stamina~n~Thể lực, sức bền|Stamen~n~Nhị hoa (từ gốc khác)|Endurance / Vigor~n~Sức chịu đựng / Sức sống|Build up stamina~~Xây dựng sức bền thể lực
Cardio~n~Bài tập tim mạch|Cardiovascular~adj~Thuộc hệ tim mạch|Aerobic exercise~n~Bài tập thể dục nhịp điệu|Engage in cardio workouts~~Tham gia tập cardio
Flexibility~n~Sự dẻo dai, linh hoạt|Flexible~adj~Linh hoạt, mềm dẻo|Agility / Suppleness~n~Sự nhanh nhẹn / Mềm mại|Improve joint flexibility~~Cải thiện độ dẻo của khớp
Musculature~n~Hệ thống cơ bắp|Muscular~adj~Vạm vỡ, có cơ bắp|Muscle mass~n~Khối lượng cơ bắp|Develop robust musculature~~Phát triển hệ cơ bắp vạm vỡ
Conditioning~n~Sự rèn luyện thể lực|Condition~v/n~Điều kiện / Rèn luyện|Physical training~n~Huấn luyện thể chất|Physical conditioning~~Quá trình rèn luyện thể chất
Exertion~n~Sự gắng sức, tốn sức|Exert~v~Gắng sức, dùng (sức lực)|Effort / Strain~n~Nỗ lực / Sự căng thẳng cơ|Physical exertion~~Sự gắng sức về thể xác
Sedentary~adj~Ít vận động, ngồi nhiều|Sedentariness~n~Lối sống tĩnh tại|Inactive lifestyle~n~Lối sống kém vận động|Counteract a sedentary lifestyle~~Chống lại lối sống ít vận động
Regimen~n~Chế độ luyện tập/chăm sóc|Regime~n~Chế độ chính trị/quản lý|Routine / Program~n~Thói quen / Chương trình|Strict training regimen~~Chế độ tập luyện nghiêm ngặt
Work-out~n/v~Buổi tập thể hình/thể thao|Exercise~v/n~Tập luyện|Gym session~n~Buổi tập phòng gym|Intense workout~~Buổi tập cường độ cao
Overexertion~n~Sự vắt kiệt sức, gắng quá độ|Overexert~v~Gắng sức quá mức|Burnout~n~Tình trạng kiệt sức|Avoid physical overexertion~~Tránh việc vắt kiệt sức lực
Physique~n~Vóc dáng, hình thể|Physical~adj~Thuộc thể chất|Body shape~n~Hình dáng cơ thể|Sculpt one's physique~~Tạo hình vóc dáng cơ thể
Tone~v/n~Làm săn chắc cơ thể|Toned~adj~Săn chắc, thon gọn|Firm up~phr.v~Làm cho săn lại|Tone up muscles~~Làm săn chắc các nhóm cơ
Recovery~n~Sự hồi phục (sau tập)|Recover~v~Hồi phục sức khỏe|Restoration / Healing~n~Sự phục hồi|Muscle recovery time~~Thời gian phục hồi cơ bắp
Wellness~n~Sức khỏe toàn diện|Well-being~n~Sự thịnh vượng, khỏe mạnh|Healthiness~n~Tình trạng khỏe mạnh|Holistic wellness~~Sức khỏe toàn diện (thể xác lẫn tinh thần)
Longevity~n~Tuổi thọ cao|Long-lived~adj~Sống lâu|Life span~n~Vòng đời, tuổi thọ|Promote health and longevity~~Thúc đẩy sức khỏe và trường thọ
Preventive~adj~Mang tính phòng ngừa|Prevent~v~Ngăn chặn|Proactive~adj~Chủ động phòng tránh|Preventive healthcare~~Y tế dự phòng, chăm sóc sức khỏe chủ động
Screening~n~Sự sàng lọc bệnh|Screen~v~Sàng lọc, kiểm tra|Medical check-up~n~Khám sức khỏe tổng quát|Undergo routine health screening~~Kiểm tra sức khỏe định kỳ
Sanitation~n~Hệ thống vệ sinh|Sanitary~adj~Thuộc vệ sinh|Hygiene~n~Vệ sinh cá nhân/môi trường|Public sanitation~~Vệ sinh công cộng
Contagious~adj~Dễ lây nhiễm|Contagion~n~Sự truyền bệnh|Infectious / Transmissible~adj~Truyền nhiễm|Contagious disease~~Bệnh truyền nhiễm
Alleviate~v~Làm giảm bớt (đau đớn)|Alleviation~n~Sự làm dịu bớt|Relieve / Mitigate~v~Xoa dịu, giảm thiểu|Alleviate chronic pain~~Giảm bớt các cơn đau mãn tính
Rehabilitation~n~Phục hồi chức năng|Rehabilitate~v~Phục hồi|Physical recovery~n~Hồi phục thể chất|Post-injury rehabilitation~~Phục hồi sau chấn thương
Therapeutic~adj~Có tác dụng chữa bệnh|Therapy~n~Liệu pháp|Curative / Healing~adj~Chữa lành|Therapeutic benefits~~Lợi ích mang tính chữa bệnh
Ailment~n~Bệnh nhẹ, chứng bệnh vặt|Ail~v~Gây đau ốm|Minor sickness~n~Bệnh vặt thông thường|Treat minor ailments~~Điều trị các chứng bệnh vặt
Vitality~n~Sức sống mãnh liệt|Vital~adj~Quan trọng, tràn đầy sức sống|Vigour / Energy~n~Sức mạnh, năng lượng|Restore physical vitality~~Khôi phục sức sống thể chất
Robust~adj~Khỏe mạnh, vạm vỡ|Robustness~n~Sự tráng kiện|Hardy / Sturdy~adj~Bền bỉ, cứng cáp|Maintain robust health~~Duy trì sức khỏe tráng kiện
Lifestyle~n~Lối sống|Life-style~n~Phong cách sống|Way of living~n~Cách sinh hoạt|Adopt a healthy lifestyle~~Áp dụng lối sống lành mạnh
Detoxification~n~Sự thải độc cơ thể|Detox~v/n~Thải độc|Cleansing~n~Sự thanh lọc|Undergo a body detox~~Thực hiện quá trình thải độc cơ thể
Equilibrium~n~Trạng thái cân bằng|Equilibrate~v~Làm cân bằng|Balance / Stability~n~Sự cân bằng, ổn định|Maintain mind-body equilibrium~~Giữ cân bằng giữa thể xác và tâm hồn
Moderation~n~Sự điều độ, chừng mực|Moderate~adj~Điều độ, ôn hòa|Temperance~n~Tính tiết chế, điều độ|Practice moderation in diet~~Thực hiện ăn uống điều độ
Habit~n~Thói quen|Habitual~adj~Mang tính thói quen|Custom / Practice~n~Thói quen, tập quán|Cultivate healthy habits~~Nuôi dưỡng các thói quen lành mạnh
Restorative~adj~Mang tính phục hồi|Restore~v~Khôi phục lại|Rejuvenating~adj~Trẻ hóa, phục hồi năng lượng|Restorative sleep~~Giấc ngủ sâu có tính phục hồi cơ thể
Burnout~n~Tình trạng kiệt sức (do áp lực)|Burn out~phr.v~Kiệt sức|Exhaustion~n~Sự kiệt quệ năng lượng|Prevent mental burnout~~Ngăn ngừa tình trạng kiệt sức tinh thần
Self-care~n~Việc tự chăm sóc bản thân|Care for~v~Chăm sóc|Personal upkeep~n~Sự tự bảo dưỡng bản thân|Prioritize self-care~~Đặt việc tự chăm sóc bản thân lên hàng đầu
Longevity~n~Sự sống lâu, trường thọ|Long-lived~adj~Sống thọ|Extended lifespan~n~Vòng đời kéo dài|Secrets to longevity~~Bí quyết sống trường thọ
Mindful~adj~Sống tỉnh thức, chú tâm|Mindfulness~n~Sự chánh niệm, tỉnh thức|Attentive / Conscious~adj~Tỉnh táo, có ý thức|Mindful eating~~Thói quen ăn uống có ý thức, chậm rãi
Endurance~n~Sức chịu đựng bền bỉ|Endure~v~Chịu đựng, kéo dài|Stamina / Persistence~n~Sức bền / Sự kiên trì|Test one's physical endurance~~Thử thách sức chịu đựng thể lực
Well-being~n~Tình trạng hạnh phúc, khỏe mạnh|Wellness~n~Sự khỏe mạnh toàn diện|Happiness and health~n~Sức khỏe và niềm vui|Enhance overall well-being~~Nâng cao mức độ khỏe mạnh toàn diện"""

def generate():
    rows, cards, notes = [], [], []
    for number, line in enumerate(SOURCE.splitlines(), 1):
        cells = line.split('|')
        assert len(cells) == 4
        row = {'sourceRow': number, 'section': 'a' if number <= 13 else 'b' if number <= 26 else 'c' if number <= 38 else 'd', 'cells': {}}
        for category, cell in zip(CATEGORIES, cells):
            english, pos, vietnamese = cell.split('~')
            row['cells'][category] = {'english': english, 'partOfSpeech': pos or None, 'vietnamese': vietnamese}
            words = english.split(' / ')
            meanings = vietnamese.split(' / ')
            # Split only explicit slash-separated English entries, never POS or Vietnamese alone.
            mapped = len(words) > 1 and len(words) == len(meanings)
            if len(words) > 1 and not mapped:
                notes.append({'sourceRow': number, 'category': category, 'original': f'{english} ({pos}): {vietnamese}', 'reason': 'PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn.'})
            for index, word in enumerate(words, 1):
                cards.append({'id': f'unit3-r{number:03d}-{category.replace("_", "-")}-{index:02d}', 'unitId': 'unit3', 'section': row['section'], 'category': category, 'vietnamese': meanings[index - 1] if mapped else vietnamese, 'english': word, 'partOfSpeech': pos or None, 'sourceRow': number})
        rows.append(row)
    issues = [
        (1, 'base_word', 'Diet: PDF ghi n/v nhưng chỉ cung cấp nghĩa “Chế độ ăn uống”; giữ nguyên, không tự thêm nghĩa động từ.'),
        (5, 'synonym', 'Fat / Fatty acids cùng mang n/adj trong PDF; giữ n/adj cho cả hai, không suy đoán phân bổ loại từ. Cần duyệt tính chính xác của loại từ.'),
        (9, 'word_family', 'Process: nguồn ghi v/n nhưng nghĩa “Quy trình chế biến” không phân biệt từng loại từ; giữ nguyên.'),
        (14, 'word_family', 'Stamen được xếp Word Family của Stamina dù PDF ghi “Nhị hoa (từ gốc khác)”. Giữ nguyên mục và category, chờ người dùng duyệt; không tự sửa hoặc bỏ.'),
        (18, 'word_family', 'Condition: v/n đi kèm “Điều kiện / Rèn luyện”; không ánh xạ nghĩa theo thứ tự loại từ, giữ một thẻ với toàn bộ nghĩa.'),
        (21, 'word_family', 'Regime nằm ở cột Word Family của Regimen với nghĩa chính trị/quản lý; giữ nguyên và cần duyệt quan hệ nhóm từ.'),
        (22, 'base_word', 'Work-out: giữ cách viết và n/v của nguồn, dù nghĩa được cung cấp chỉ diễn đạt buổi tập; không tự chuẩn hóa thành workout.'),
        (22, 'word_family', 'Exercise được xếp Word Family của Work-out; giữ nguyên category nguồn, cần duyệt quan hệ nhóm từ.'),
        (25, 'base_word', 'Tone: PDF ghi v/n nhưng chỉ có nghĩa “Làm săn chắc cơ thể”; giữ nguyên, không bổ sung nghĩa danh từ.'),
        (27, 'word_family', 'Well-being được xếp Word Family của Wellness, nghĩa “Sự thịnh vượng, khỏe mạnh”; giữ nguyên, cần duyệt quan hệ nhóm từ.'),
        (50, 'word_family', 'Wellness được xếp Word Family của Well-being; giữ nguyên, cần duyệt quan hệ nhóm từ.'),
    ]
    for number, category, reason in issues:
        cell = rows[number - 1]['cells'][category]
        notes.append({'sourceRow': number, 'category': category, 'original': f'{cell["english"]} ({cell["partOfSpeech"]}): {cell["vietnamese"]}', 'reason': reason})
    notes.sort(key=lambda note: (note['sourceRow'], CATEGORIES.index(note['category'])))
    assert len(rows) == 50 and len(cards) == 217
    assert len({card['id'] for card in cards}) == len(cards)
    result = {'schemaVersion': 1, 'unitId': 'unit3', 'source': {'fileName': 'Unit3.pdf', 'pages': 9, 'sourceRowCount': 50, 'sha256': '2d813e0b0be0bfa5c9457f2b01b6acca5b3c6191769fad7a846bd3512de70fef', 'method': 'Trích xuất văn bản và đối chiếu trực quan đủ 9 trang; chép 50 hàng, tách mục từ có dấu /, không suy đoán loại từ.'}, 'flashcards': cards, 'reviewNotes': notes}
    write('public/data/units/unit3.json', result)
    write('docs/unit3-source-rows.json', {'source': result['source'], 'rows': rows})
    write('docs/unit3-counts.json', {'total': len(cards), 'sections': dict(Counter(card['section'] for card in cards)), 'categories': dict(Counter(card['category'] for card in cards)), 'sourceRows': len(rows), 'reviewNotes': len(notes)})
    return cards, notes

def write(path, data):
    (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    cards, notes = generate()
    print(json.dumps({'total': len(cards), 'sections': dict(Counter(card['section'] for card in cards)), 'categories': dict(Counter(card['category'] for card in cards)), 'reviewNotes': len(notes)}, ensure_ascii=False))
