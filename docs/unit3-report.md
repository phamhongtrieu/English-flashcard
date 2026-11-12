# Bổ sung Unit 3 — Nutrition, Fitness & Healthy Lifestyle

Đã bổ sung duy nhất Unit 3 từ Unit3.pdf, đọc đủ 9 trang và xử lý đủ 50 hàng/200 ô. Giữ nguyên giao diện, routing, loader và các chức năng học hiện có. Không thêm dependency, không push/deploy.

## Nguồn và số lượng

PDF nguồn: C:\Users\Admin\Downloads\Unit3.pdf.
SHA-256: `2d813e0b0be0bfa5c9457f2b01b6acca5b3c6191769fad7a846bd3512de70fef`.
Đã đối chiếu trực quan 9 trang và kiểm tra 400 chuỗi English/Vietnamese của bản chép với văn bản trích xuất từ các cột PDF, bỏ khoảng trắng xuống dòng: không có chuỗi lệch. PDF và ảnh kiểm tra chỉ ở môi trường làm việc, không sao chép vào public/dist.

| Phần | Hàng nguồn | Base Word | Word Family | Synonym | Collocation | Tổng |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A — Chế độ dinh dưỡng & Thành phần thức ăn | 1–13 | 13 | 14 | 15 | 13 | 55 |
| B — Thể hình, Tập luyện & Vận động | 14–26 | 13 | 13 | 18 | 13 | 57 |
| C — Sức khỏe tổng thể & Y tế phòng ngừa | 27–38 | 12 | 12 | 17 | 12 | 53 |
| D — Xu hướng lối sống lành mạnh & Thói quen | 39–50 | 12 | 12 | 16 | 12 | 52 |
| **Tổng** | **50 hàng** | **50** | **51** | **66** | **50** | **217** |

200 ô PDF tạo 217 thẻ do tách 17 mục bổ sung: 1 mục Word Family (Caloric / Calorific) và 16 mục Synonym. Số lượng trong tiêu đề PDF đếm ô, ứng dụng hiển thị số thẻ thực tế sau tách.

## Quy tắc dữ liệu

- SchemaVersion 1 giữ nguyên: unitId, flashcards và reviewNotes; metadata source bổ sung xuất xứ.
- Manifest đăng ký `id: "unit3"`, `number: 3`, `dataFile: "data/units/unit3.json"`. Route: `/study/unit3`.
- Mỗi thẻ gồm id, unitId, section, category, vietnamese, english, partOfSpeech, sourceRow. ID có dạng `unit3-r001-base-word-01`, cố định theo hàng/category/thứ tự mục nguồn.
- Chỉ tách dấu ` / ` trong ô tiếng Anh. Nếu nghĩa có các phần tương ứng ngăn bằng ` / `, ánh xạ từng phần; nếu dùng nghĩa chung, giữ nguyên nghĩa chung cho từng từ và ghi chú rà soát. Không tách ký hiệu n/v, v/n, n/adj; không tách dấu / chỉ xuất hiện trong nghĩa tiếng Việt.
- 50 collocation không có loại từ trong PDF nên để null. Bổ sung đúng ký hiệu nguồn n/v và phr.v vào type/validator/nhãn. n/v khớp cả danh từ và động từ; phr.v khớp động từ.
- Giữ nguyên cách viết Proteinous, Work-out, Life-style, Medical check-up, Vigor và Vigour theo từng ô, không chuẩn hóa. Happiness and health là một cụm, giữ một thẻ.
- Longevity ở hàng 28/47 và các mục lặp ở hàng/category khác giữ ID riêng. Từ trùng Unit 2 không dùng chung trạng thái.
- Unit 2 và toàn bộ ID không thay đổi. SHA-256 trước/sau: `45cbea2323863ff83f42aedc1575fea165cf210c45b923bdf5268ca57d7977b5`.
- Không đổi schema/key/cách ghi LocalStorage; tiếp tục dùng namespace Unit ID + Flashcard ID. Không có migration hoặc xóa tiến độ.

## Các mục cần duyệt

Có **22 ghi chú**, gồm cả ghi chú về nghĩa dùng chung; không có nghĩa tự bổ sung. Các mục nghi vấn vẫn giữ nguyên trong JSON, chờ người dùng duyệt trước khi sửa/bỏ/chuyển nhóm.

| Hàng | Category | Mục gốc | Nội dung rà soát |
| --- | --- | --- | --- |
| 1 | base_word | Diet (n/v): Chế độ ăn uống | Diet: PDF ghi n/v nhưng chỉ cung cấp nghĩa “Chế độ ăn uống”; giữ nguyên, không tự thêm nghĩa động từ. |
| 2 | word_family | Caloric / Calorific (adj): Thuộc về calo | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 5 | synonym | Fat / Fatty acids (n/adj): Chất béo | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 5 | synonym | Fat / Fatty acids (n/adj): Chất béo | Fat / Fatty acids cùng mang n/adj trong PDF; giữ n/adj cho cả hai, không suy đoán phân bổ loại từ. Cần duyệt tính chính xác của loại từ. |
| 9 | word_family | Process (v/n): Quy trình chế biến | Process: nguồn ghi v/n nhưng nghĩa “Quy trình chế biến” không phân biệt từng loại từ; giữ nguyên. |
| 14 | word_family | Stamen (n): Nhị hoa (từ gốc khác) | Stamen được xếp Word Family của Stamina dù PDF ghi “Nhị hoa (từ gốc khác)”. Giữ nguyên mục và category, chờ người dùng duyệt; không tự sửa hoặc bỏ. |
| 18 | word_family | Condition (v/n): Điều kiện / Rèn luyện | Condition: v/n đi kèm “Điều kiện / Rèn luyện”; không ánh xạ nghĩa theo thứ tự loại từ, giữ một thẻ với toàn bộ nghĩa. |
| 21 | word_family | Regime (n): Chế độ chính trị/quản lý | Regime nằm ở cột Word Family của Regimen với nghĩa chính trị/quản lý; giữ nguyên và cần duyệt quan hệ nhóm từ. |
| 22 | base_word | Work-out (n/v): Buổi tập thể hình/thể thao | Work-out: giữ cách viết và n/v của nguồn, dù nghĩa được cung cấp chỉ diễn đạt buổi tập; không tự chuẩn hóa thành workout. |
| 22 | word_family | Exercise (v/n): Tập luyện | Exercise được xếp Word Family của Work-out; giữ nguyên category nguồn, cần duyệt quan hệ nhóm từ. |
| 25 | base_word | Tone (v/n): Làm săn chắc cơ thể | Tone: PDF ghi v/n nhưng chỉ có nghĩa “Làm săn chắc cơ thể”; giữ nguyên, không bổ sung nghĩa danh từ. |
| 26 | synonym | Restoration / Healing (n): Sự phục hồi | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 27 | word_family | Well-being (n): Sự thịnh vượng, khỏe mạnh | Well-being được xếp Word Family của Wellness, nghĩa “Sự thịnh vượng, khỏe mạnh”; giữ nguyên, cần duyệt quan hệ nhóm từ. |
| 32 | synonym | Infectious / Transmissible (adj): Truyền nhiễm | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 33 | synonym | Relieve / Mitigate (v): Xoa dịu, giảm thiểu | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 35 | synonym | Curative / Healing (adj): Chữa lành | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 37 | synonym | Vigour / Energy (n): Sức mạnh, năng lượng | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 38 | synonym | Hardy / Sturdy (adj): Bền bỉ, cứng cáp | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 41 | synonym | Balance / Stability (n): Sự cân bằng, ổn định | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 43 | synonym | Custom / Practice (n): Thói quen, tập quán | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 48 | synonym | Attentive / Conscious (adj): Tỉnh táo, có ý thức | PDF dùng chung một nghĩa cho nhiều mục từ. Đã tách mục tiếng Anh và giữ nguyên toàn bộ nghĩa, loại từ nguồn cho mỗi thẻ; cần rà soát nghĩa riêng nếu muốn chi tiết hơn. |
| 50 | word_family | Wellness (n): Sự khỏe mạnh toàn diện | Wellness được xếp Word Family của Well-being; giữ nguyên, cần duyệt quan hệ nhóm từ. |

## File tạo/sửa trong lần bổ sung Unit 3

Tạo:
- public/data/units/unit3.json — bộ thẻ và reviewNotes.
- docs/unit3-source-rows.json — bản chép 50 hàng/200 ô trước khi tách.
- docs/unit3-counts.json — số lượng để đối chiếu.
- docs/unit3-report.md — báo cáo này.
- scripts/import-unit3.py — bản chép đã đối chiếu và xuất JSON, chỉ ghi Unit 3/audit/counts.
- tests/unit3.spec.ts — dữ liệu, 217 thẻ, bộ lọc và tiến độ độc lập.

Sửa:
- public/data/units.json — thêm Unit 3; không sửa mục Unit 2.
- src/types/flashcard.ts, src/services/unitLoader.ts, src/data/index.ts, src/utils/studyDeck.ts — hỗ trợ ký hiệu n/v và phr.v từ PDF.
- tests/units.spec.ts, tests/foundation.spec.ts, tests/progress.spec.ts, tests/filters.spec.ts — cập nhật kỳ vọng catalog 2 Unit, thống kê 440 thẻ, kiểm tra loại từ mới.
- tests/pronunciation.spec.ts — thêm ca phát âm Unit 3/cụm dài và hủy đọc khi chuyển Unit.
- README.md, VERIFICATION.md, docs/data-format.md — cập nhật tài liệu.

Các thay đổi chức năng phát âm đã có trong working tree trước tác vụ được giữ nguyên; không sửa component, CSS hay hook phát âm trong lần này.

## Kiểm thử thực tế

- `npm.cmd run typecheck`: đạt.
- `npm.cmd run build`: đạt, xuất dist; không thay dependencies/lockfile.
- `npm.cmd run test:e2e -- --workers=3`: **61/61 ca đạt** trên production preview bằng Chrome.
- Đã duyệt toàn bộ 217 thẻ Unit 3 theo thứ tự, kiểm tra mặt trước, bộ đếm, lật thẻ cuối, nút biên và ArrowLeft/ArrowRight; bộ kiểm thử cũ vẫn duyệt/lật đủ 223 thẻ Unit 2.
- Dữ liệu: đủ 1–50, đủ 4 category từng hàng; không trùng ID trong tổng 440 thẻ; không có từ/nghĩa rỗng; giữ đúng nghĩa/POS trong audit.
- Đầu: Diet — Chế độ ăn uống (n/v). Cuối: Enhance overall well-being — Nâng cao mức độ khỏe mạnh toàn diện (null).
- Trang chủ mở đúng Unit 3, truy cập trực tiếp/refresh thành công. Chuyển SPA Unit 2 ↔ Unit 3 không giữ thẻ/bộ lọc cũ.
- Bộ lọc chủ đề/category/loại từ, trộn bật/tắt, kết hợp không có kết quả, n/v và phr.v: đạt; không sửa dữ liệu gốc.
- Hai thẻ Physique cùng từ tiếng Anh nhưng ID/tiến độ riêng: Unit 3 learning → known không đổi record known Unit 2; ôn tập, hoàn thành thẻ cuối, refresh, thống kê tổng hợp và theo Unit: đạt.
- Các kiểm tra cũ về đánh giá lại, persist qua đóng/mở Chrome, storage hỏng/bị chặn/quota và phục hồi quyền ghi đều đạt.
- Phát âm Unit 3: mock Web Speech xác minh Diet/cụm dài đúng payload, nút loa không lật thẻ và chuyển Unit hủy đọc. Kiểm tra phát âm hiện có cho Physique/Physical, mobile touch, lỗi engine/voices cũng đạt. Chưa xác nhận âm thanh nghe được trên thiết bị thật; đây là kiểm thử engine giả lập.
- Responsive 320/390/768/1440px trên các trang, gồm Unit 3, trong Light/Dark: đạt, không tràn ngang. Đã xem ảnh trang chủ mobile có cả 2 Unit. Chưa kiểm tra điện thoại thật/Safari/Firefox hoặc môi trường Vercel.
- Lần chạy đầu có 1 ca test thất bại do chép dư một ký tự trong hash kỳ vọng Unit 2; sửa kỳ vọng theo hash ghi nhận trước khi chỉnh sửa, chạy lại toàn bộ 61 ca đạt. File Unit 2 không thay đổi.

## Tái tạo và commit/push

`python scripts/import-unit3.py` chỉ tái tạo JSON Unit 3, source rows và counts từ bản chép đã đối chiếu, không phải công cụ upload/trích xuất PDF tổng quát. Không chạy nếu đã sửa JSON thủ công mà chưa cập nhật bản chép.

Working tree đã có thay đổi chức năng phát âm chưa commit trước tác vụ. Hãy review và commit riêng phần phát âm trước, hoặc chủ động đưa kèm đầy đủ component/hook/CSS/test/tài liệu phát âm vào commit sau khi review. Không commit riêng test phát âm mà bỏ các file chức năng đang chưa được Git theo dõi. Các lệnh cho phần Unit 3 dưới đây giả định đã xử lý các thay đổi có sẵn; đây chỉ là hướng dẫn, chưa thực thi:

```powershell
git status --short
git diff
git add public/data/units.json public/data/units/unit3.json scripts/import-unit3.py docs/unit3-source-rows.json docs/unit3-counts.json docs/unit3-report.md docs/data-format.md src/types/flashcard.ts src/services/unitLoader.ts src/data/index.ts src/utils/studyDeck.ts tests/unit3.spec.ts tests/units.spec.ts tests/foundation.spec.ts tests/progress.spec.ts tests/filters.spec.ts
git add -p README.md VERIFICATION.md
git add tests/pronunciation.spec.ts
git diff --cached
git commit -m "Add Unit 3 flashcards from reviewed PDF"
git push origin tr
```

Nhánh hiện tại: `tr`. Không tự động commit/push/deploy trong tác vụ này. Nếu GitHub đã nối Vercel, push có thể kích hoạt deploy theo cấu hình hiện tại.
