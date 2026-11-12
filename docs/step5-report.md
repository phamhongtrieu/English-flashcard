# Giai đoạn 2 — Bước 5

Đã thêm trạng thái new/known/learning, đánh dấu sau khi xem tiếng Anh, tự chuyển thẻ, hoàn thành lượt, lưu tiến độ thật và hai chế độ tiếp tục học/ôn tập. Giữ dữ liệu JSON và kiến trúc tải Unit hiện tại.

## File tạo mới

- `src/components/layout/ProgressProvider.tsx`: state tiến độ dùng chung giữa các trang; đồng bộ record storage event.
- `src/components/ui/StorageNotice.tsx`: thông báo dữ liệu hỏng hoặc không thể lưu.
- `src/components/flashcards/UnitProgress.tsx`: tiến độ thật và liên kết tiếp tục học trong danh sách Unit.
- `tests/progress.spec.ts`: 11 ca kiểm thử tiến độ, persistence và lỗi lưu trữ.
- `docs/progress-storage.md`: schema lưu trữ, chế độ học và cách xử lý lỗi.
- `docs/step5-report.md`: báo cáo này.

## File chỉnh sửa

- `src/types/progress.ts`, `src/utils/progress.ts`, `src/hooks/useLearningProgress.ts`: thay tiện ích demo cũ bằng trạng thái thật, kiểm tra/ghi record riêng, tổng hợp thống kê.
- `src/App.tsx`: cung cấp progress context toàn ứng dụng.
- `src/types/study.ts`, `src/utils/studyDeck.ts`, `src/hooks/useStudyDeck.ts`: chế độ all/new/learning kết hợp bộ lọc và thứ tự lượt.
- `src/hooks/useFlashcardStudy.ts`: điều hướng theo ID, xử lý danh sách thu ngắn và hoàn thành lượt.
- `src/pages/StudyPage.tsx`: đánh dấu, trạng thái hiện tại, tiến độ thật, hoàn thành, ôn và tiếp tục học.
- `src/pages/StatisticsPage.tsx`: bỏ thống kê demo; số liệu tổng hợp và theo Unit, phần trăm known đúng công thức.
- `src/pages/HomePage.tsx`: hiển thị tiến độ và tiếp tục học thẻ chưa học.
- `src/components/flashcards/StudyFilters.tsx`: lựa chọn chế độ học, giữ các bộ lọc cũ.
- `src/components/flashcards/StudyFlashcard.tsx`: callback sau animation để chỉ mở đánh giá khi mặt Anh đã hiện.
- `src/data/index.ts`: bỏ export số liệu thống kê demo không còn sử dụng.
- `src/styles/index.css`: bổ sung style chế độ học, tiến độ, nút đánh giá và hoàn thành, responsive/dark bằng màu hiện có.
- `tests/study.spec.ts`, `tests/foundation.spec.ts`: cập nhật hành vi đánh giá và hồi quy.
- `README.md`, `VERIFICATION.md`, `docs/data-format.md`: hướng dẫn và kết quả hiện tại.

## Kết quả kiểm thử thực tế

- `npm run typecheck`: đạt.
- `npm run build`: đạt, output `dist`.
- `npm run test:e2e`: **45/45 ca đạt** trong lần chạy toàn bộ, không còn ca lỗi.
- 11 ca tiến độ kiểm tra: ba trạng thái/schema lỗi; known/learning/đánh dấu lại; ghi đúng một record; refresh; ôn thu ngắn không bỏ qua; thẻ cuối; tiếp tục học; bộ lọc/trộn cùng trạng thái; chuyển Unit và thống kê từng Unit; record hỏng giữ nguyên record hợp lệ; storage bị chặn; quota ghi lỗi vẫn đọc tiến độ cũ; Unit/catalog rỗng không chia cho 0; đóng/mở lại Chrome cùng profile giữ tiến độ; phục hồi quyền ghi không che cảnh báo của record khác còn chưa lưu.
- Kiểm tra đóng/mở là hai lần khởi chạy persistent Chrome với cùng thư mục profile kiểm thử trong thư mục tạm, không sử dụng profile cá nhân.
- Hồi quy gồm đủ 223 thẻ theo cả hai chiều, lật/animation, bàn phím, bộ lọc/trộn, route và JSON lỗi, responsive 320/390/768/1440 px trong hai chế độ. Ca mobile kiểm tra touch và tọa độ trang/kích thước ổn định khi lật.
- Không thêm dependency, không sửa file dữ liệu từ vựng. Không tạo Unit giả; fixture Unit chỉ có trong bộ nhớ kiểm thử.

Giới hạn: Chrome trên máy hiện tại/mobile mô phỏng, chưa kiểm tra Safari/Firefox hoặc điện thoại thật. LocalStorage thuộc trình duyệt/profile/origin hiện tại, không đồng bộ tài khoản/thiết bị; bị chặn/quota thì đánh giá mới chỉ tồn tại trong phiên và có thông báo. Không có backend/database/đăng nhập/admin/upload PDF. Không deploy Vercel, không thực hiện Bước 6.

Định dạng và quy tắc chi tiết: [progress-storage.md](progress-storage.md).
