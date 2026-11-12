# Kết quả Giai đoạn 1 — Bước 3A

Đã tích hợp **1 Unit xuất bản: Unit 2**, đọc đủ 6 trang/50 hàng nguồn, xuất **223 flashcard**. Unit 1 và Unit 3 không được thêm vào manifest. Không tạo backend, database, đăng nhập, upload, lưu tiến độ hoặc deploy.

## File tạo mới

- `public/data/units.json`: manifest xuất bản.
- `public/data/units/unit2.json`: toàn bộ thẻ và ghi chú rà soát.
- `src/services/unitLoader.ts`: tải/kiểm tra manifest và JSON Unit, đường dẫn theo Vite BASE_URL.
- `src/hooks/useUnitData.ts`: state loading/error, hủy request và chống kết quả cũ.
- `src/components/ui/DataState.tsx`: trạng thái tải/lỗi.
- `scripts/import-unit2.py`: bản chép đã đối chiếu và bộ xuất JSON tái lập.
- `docs/data-format.md`: format và cách thêm Unit.
- `docs/unit2-source-rows.json`: bản ghi 50 hàng × 4 ô gốc.
- `docs/unit2-counts.json`: tổng hợp số lượng.
- `docs/unit2-review.md`: nguồn, SHA-256, danh sách 19 mục cần rà soát.
- `tests/units.spec.ts`: kiểm tra dữ liệu, loading, lỗi và nhiều Unit bằng fixture chỉ trong bộ nhớ.
- `docs/step3a-report.md`: báo cáo này.

## File chỉnh sửa

- `src/types/flashcard.ts`: Unit/dataFile, UnitData, POS null và các POS đọc từ PDF.
- `src/data/index.ts`: nhãn POS, thống kê demo tách biệt; bỏ import dữ liệu học cũ.
- `src/pages/HomePage.tsx`: render danh sách Unit hợp lệ và số lượng thật.
- `src/pages/StudyPage.tsx`: chọn Unit, route theo ID, loading/error, đầy đủ thẻ, ghi chú rà soát.
- `src/pages/StatisticsPage.tsx`: giữ số liệu demo độc lập với bộ Unit thật.
- `src/components/flashcards/FlashcardPreview.tsx`: nhãn Unit từ metadata, POS null.
- `src/components/flashcards/StudyFlashcard.tsx`: truyền nhãn Unit; giữ nguyên Motion và cách lật.
- `src/components/layout/AppLayout.tsx`: sửa title cho route con /study/:unitId; giữ nguyên thiết kế header/navigation.
- `src/App.tsx`: thêm route /study/:unitId, giữ /study làm trang chọn Unit.
- `src/styles/index.css`: khoảng cách giữa nhiều card Unit; giữ style hiện có.
- `src/utils/progress.ts`: tiện ích cũ dùng dữ liệu demo cũ để không phụ thuộc loader mới; vẫn không được kết nối vào trang học.
- `tests/foundation.spec.ts`, `tests/study.spec.ts`: cập nhật route/data, duyệt tất cả 223 thẻ.
- `vercel.json`: loại trừ đường dẫn JSON tĩnh khỏi SPA fallback.
- `.gitignore`: bỏ qua công cụ trích xuất và bản render tạm.
- `README.md`, `VERIFICATION.md`: hướng dẫn và kết quả hiện tại.

## Dữ liệu

Manifest `{ schemaVersion, units: Unit[] }`; mỗi Unit có `{ id, number?, title, description, sections, dataFile }`. File Unit `{ schemaVersion, unitId, source?, flashcards, reviewNotes }`.

Thẻ có đủ `{ id, unitId, section, category, vietnamese, english, partOfSpeech, sourceRow }`. ID cố định theo Unit/hàng/category/thứ tự trong ô, không ngẫu nhiên. 50 collocation có loại từ null vì nguồn không ghi. Xem [format chi tiết](data-format.md).

| Phần | Hàng | base_word | word_family | synonym | collocation | Tổng |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A | 1–13 | 13 | 13 | 18 | 13 | 57 |
| B | 14–26 | 13 | 13 | 17 | 13 | 56 |
| C | 27–38 | 12 | 12 | 19 | 12 | 55 |
| D | 39–50 | 12 | 12 | 19 | 12 | 55 |
| Tổng | 50 hàng | 50 | 50 | 73 | 50 | 223 |

200 ô từ vựng nguồn, trong đó 23 ô đồng nghĩa có hai mục, tạo thêm 23 thẻ. Không thêm từ ngoài PDF. Nghĩa dùng chung được giữ nguyên cho mỗi từ và đánh dấu rà soát, không tự tạo nghĩa riêng.

19 mục cần rà soát tại hàng **1, 5, 6, 12, 19, 23, 24, 28, 32, 33, 34, 36, 41, 44, 45, 46, 47, 48, 50**. Danh sách từ, nghĩa và lý do từng mục ở [unit2-review.md](unit2-review.md); ứng dụng cũng hiển thị lời nhắc tại thẻ tương ứng. Các nghi vấn chưa được tự sửa.

## Kiểm thử thực tế

- `npm run typecheck`: đạt.
- `npm run build`: đạt, xuất `dist` cùng `dist/data/units.json` và `dist/data/units/unit2.json`.
- 26 ca Playwright đã đạt sau các lần sửa/chạy lại. Lần chạy toàn bộ gần nhất đạt 25/26; ca mobile còn lại ban đầu so sánh cả vị trí viewport khi trình duyệt tự cuộn. Đã sửa để đo đúng chiều rộng/chiều cao, chạy lại ca mobile và ca chuyển Unit trong SPA: 2/2 đạt. Không còn ca lỗi chưa xử lý.
- Duyệt đủ 223 thẻ bằng UI, lật hai chiều, kiểm tra thứ tự, reset, rồi quay về thẻ đầu; nút đầu/cuối và bàn phím đạt.
- Manifest chỉ có Unit 2, ID duy nhất, đủ 50 hàng, đúng số lượng theo phần/category, đủ 50 POS null; đối chiếu các ô base/family/collocation với bản ghi nguồn.
- Unit không tồn tại không được tải bằng đường dẫn đoán; JSON sai cú pháp, rỗng, trùng ID, sai Unit/section/category/POS, thiếu hàng nguồn, manifest sai và HTTP 404 đều hiển thị lỗi mà không crash.
- Loading và chuyển tham số Unit ngay trong SPA được kiểm tra bằng fixture mạng; chỉ một bộ thẻ hiện hành, không giữ thẻ/animation state cũ. Fixture không tạo Unit xuất bản giả.
- Responsive 320/390/768/1440px trong cả hai chế độ; Chrome mô phỏng mobile touch, animation Y 180°, chữ đúng chiều và kích thước ổn định khi lật.
- Không đọc/ghi tiến độ; dữ liệu LocalStorage cũ không bị sửa. Chế độ theme hiện có được giữ nguyên.

Giới hạn: chưa kiểm thử điện thoại thật/Safari/Firefox; chưa deploy Vercel nên chưa xác minh routing trên tên miền production. PDF chỉ được đọc để nhập dữ liệu, không nằm trong public/dist. Công cụ Python chỉ dùng cục bộ, không thêm dependency frontend. Dừng ở Bước 3A.
