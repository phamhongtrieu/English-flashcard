# Giai đoạn 2 — Bước 4: Lọc và trộn Flashcard

## Kiểm tra trước khi sửa code

Đã chạy TypeScript, build và 4 ca kiểm thử Bước 3A: kiểm tra dữ liệu xuất bản, mở Unit từ trang chủ/refresh, bàn phím và animation mobile. Cả 4 đạt. Manifest có 1 Unit, Unit 2 gồm 223 thẻ/50 hàng nguồn hợp lệ. Không tạo dữ liệu giả hoặc chỉnh sửa JSON từ vựng.

## Chức năng

- Bộ lọc chủ đề đọc từ `unit.sections`; không gắn A/B/C/D vào logic dùng chung.
- Nhóm từ: tất cả/base_word/word_family/synonym/collocation.
- Loại từ: tất cả/n/v/adj/adv/khác. Tách chuỗi theo `/`; n.pl nhận là n. n/adj, adj/n, v/adj, v/n khớp các nhóm tương ứng. null không được suy đoán, chỉ thuộc Khác/Không xác định.
- Kết hợp ba điều kiện bằng AND. Số lượng và bộ đếm theo danh sách đã lọc; hiện rõ lựa chọn đang áp dụng. Không có kết quả thì không mount thẻ/listener điều hướng cũ, có thông báo và nút đặt lại.
- Trộn Fisher–Yates trên bản sao tập đã lọc. State giữ thứ tự đã tạo trong suốt lượt; không gọi random trong render/updater/effect. Tắt trộn trở lại thứ tự nguồn của tập đang lọc.
- Đổi bộ lọc, đặt lại hoặc bật/tắt trộn tạo lượt mới và reset thẻ đầu/mặt Việt, kể cả khi kết quả có số lượng bằng lượt trước. Chỉ phần học được mount lại; khu vực bộ lọc giữ focus.
- Đặt lại bộ lọc giữ trạng thái bật/tắt trộn, được ghi rõ trên giao diện. Đổi Unit/refresh đặt tất cả bộ lọc về Tất cả và tắt trộn.
- Lật, bàn phím, điều hướng trước/tiếp, animation, Dark Mode và các trang khác được giữ nguyên. Chỉ bổ sung panel bộ lọc bằng màu/font/border hiện có.
- Không thêm thư viện, backend/database, admin/upload, đánh dấu thuộc/chưa thuộc hoặc LocalStorage cho bộ lọc/tiến độ. Chế độ lưu theme cũ không thay đổi. Không deploy hoặc triển khai Bước 5.

## File tạo mới

- `src/types/study.ts`: kiểu dữ liệu bộ lọc.
- `src/utils/studyDeck.ts`: lọc loại từ, kết hợp điều kiện, trộn bất biến.
- `src/hooks/useStudyDeck.ts`: danh sách và tùy chọn của lượt học trong state.
- `src/components/flashcards/StudyFilters.tsx`: bộ lọc, số lượng, trộn và đặt lại.
- `tests/filters.spec.ts`: kiểm thử chức năng mới.
- `docs/step4-report.md`: báo cáo này.

## File sửa

- `src/pages/StudyPage.tsx`: kết nối bộ lọc, lượt học riêng theo revision, trạng thái không kết quả.
- `src/styles/index.css`: style bổ sung cho bộ lọc/empty state, responsive và dark qua biến màu hiện có.
- `tests/units.spec.ts`: xác minh reset bộ lọc/trộn khi đổi Unit; fixture có chủ đề tùy ý, không phải A/B/C/D. Không xuất bản fixture.
- `tests/study.spec.ts`: đo vị trí thẻ theo tọa độ trang thay vì viewport để không nhầm thao tác tự cuộn của trình duyệt với dịch chuyển bố cục.
- `README.md`, `VERIFICATION.md`: hành vi hiện tại và kết quả kiểm thử.

## Kết quả thực tế

- `npm run typecheck`: đạt.
- `npm run build`: đạt, output `dist`.
- 34 ca Playwright đã đạt: lần chạy toàn bộ đạt 33/34; ca mobile còn so sánh vị trí viewport bị thay đổi khi trình duyệt tự cuộn. Sau khi sửa phép đo theo tọa độ trang, chạy lại ca mobile và ca đổi Unit: 2/2 đạt. Không còn lỗi chưa xử lý.
- Kiểm tra riêng chủ đề A/B/C/D, cả 4 category, từng nhóm loại từ và điều kiện kết hợp. Kiểm tra A + base_word + danh từ = 12 thẻ; đổi sang D cùng 12 thẻ vẫn reset đúng.
- Kiểm tra null/mixed POS/n.pl, lọc rỗng và đặt lại, điều hướng/bàn phím sau lọc, chuyển Unit, lượt trộn mới theo bộ lọc.
- Kiểm tra trộn đủ tập và không trùng/mất, duyệt ngược giữ thứ tự cũ, lật/theme không trộn lại; tắt trộn và duyệt đủ thứ tự nguồn. Tiện ích thử trên mảng/đối tượng đóng băng và so sánh trước/sau để xác minh không sửa dữ liệu gốc.
- Bộ kiểm thử hồi quy đi đủ 223 thẻ theo hai chiều; route/lỗi JSON/dữ liệu xuất bản/LocalStorage bị chặn vẫn đạt.
- Responsive 320/390/768/1440 px, hai chế độ, select/switch trong màn hình. Đã xem ảnh giao diện mobile dark; ca touch xác minh xoay 180°, chữ đúng chiều, kích thước và tọa độ trang ổn định khi lật.

Giới hạn kiểm thử: Chrome trên máy hiện tại, mobile mô phỏng; chưa kiểm tra thiết bị thật hoặc Safari/Firefox. Chưa deploy Vercel.
