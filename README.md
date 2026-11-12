# English Flashcard

Giai đoạn 2 — Bước 5. React + TypeScript + Vite + Tailwind CSS 4, React Router, Motion và Lucide. Frontend Only, từ vựng JSON tĩnh và tiến độ LocalStorage. Không có backend, database, API key hoặc đăng nhập.

## Chạy tại máy

Node.js 22.12+ hoặc Node 24 LTS và npm.

```sh
npm ci
npm run dev
```

Mở http://127.0.0.1:5173. PowerShell chặn npm.ps1: dùng npm.cmd thay npm.

```sh
npm run typecheck
npm run build
npm run test:e2e
npm run preview
```

Build xuất ra dist/. Playwright dùng Google Chrome đã cài trên máy và kiểm tra production build; chạy build trước test. Ảnh kiểm tra ở test-results/ (không đưa vào Git).

## Cấu trúc chính

```text
public/data/
  units.json                  # Manifest Unit xuất bản
  units/unit2.json             # 223 thẻ, 50 hàng PDF và reviewNotes
  units/unit3.json             # 217 thẻ, 50 hàng PDF và reviewNotes
src/
  components/layout/          # Header, navigation, footer
  components/ui/              # Badge, ProgressBar, DataState
  components/flashcards/      # Hai mặt thẻ và animation
  services/unitLoader.ts      # Fetch JSON và kiểm tra schema
  hooks/useUnitData.ts         # Loading/error, hủy request cũ
  hooks/useFlashcardStudy.ts   # Lật và điều hướng trong phiên
  hooks/useStudyDeck.ts        # Bộ lọc và thứ tự thẻ của lượt học
  utils/studyDeck.ts           # Lọc loại từ kết hợp, Fisher–Yates
  types/study.ts               # Kiểu bộ lọc
  pages/                      # Home, Study, Statistics, NotFound
  types/                      # Unit, Flashcard, UnitData
  data/                       # Nhãn; JSON demo cũ được giữ nhưng không dùng học
  styles/                     # Giao diện hiện tại và responsive
docs/
  data-format.md              # Cấu trúc JSON, quy trình thêm Unit
  unit2-review.md              # Nguồn, số lượng, 19 mục cần rà soát
  unit2-source-rows.json       # 50 hàng × 4 ô để đối chiếu
  unit2-counts.json            # Tổng hợp số lượng
  unit3-report.md              # Báo cáo tích hợp, rà soát và kiểm thử Unit 3
  unit3-source-rows.json       # Bản đối chiếu 50 hàng × 4 ô Unit 3
  unit3-counts.json            # Số lượng Unit 3 theo section/category
scripts/import-unit2.py        # Tái tạo JSON từ bản chép đã đối chiếu
scripts/import-unit3.py        # Chỉ tái tạo JSON và audit Unit 3
tests/                        # Route, dữ liệu, lật, điều hướng, lỗi, responsive
```

## Hành vi hiện tại

- Trang chủ đọc manifest và chỉ hiển thị Unit có dữ liệu được kiểm tra hợp lệ; số thẻ lấy từ mảng thực tế.
- /study: chọn Unit. /study/:unitId: tải bộ thẻ đã đăng ký. Đã xuất bản Unit 2 (223 thẻ) và Unit 3 (217 thẻ); Unit 3 mở tại /study/unit3. Không tạo Unit 1 giả. Xem [báo cáo Unit 3](docs/unit3-report.md).
- Lật Y 180° hai chiều bằng nhấn/chạm/nút; Space/Enter khi focus thẻ. ←/→ điều hướng khi không nhập liệu. Chuyển thẻ về tiếng Việt; nút bị vô hiệu hóa tại biên.
- Nút loa trên mặt tiếng Anh của trang học dùng Web Speech API, ưu tiên en-US, rate 0.9. Chỉ đọc khi nhấn, hủy khi đổi thẻ/về mặt Việt/rời trang; nút loa không làm lật thẻ. Thiếu API/giọng English hoặc engine lỗi sẽ có thông báo. Không cần thư viện TTS/API key. Xem [báo cáo phát âm](docs/pronunciation-report.md).
- Ba bộ lọc kết hợp: chủ đề lấy từ Unit hiện tại, category và loại từ. Bộ đếm dùng kết quả đã lọc; không có kết quả sẽ ẩn thẻ/điều khiển và cho phép đặt lại bộ lọc.
- Loại từ ghép khớp từng thành phần: n/adj thuộc cả danh từ và tính từ, v/adj thuộc động từ và tính từ, n.pl thuộc danh từ. null thuộc Khác/Không xác định, không suy đoán loại từ từ nghĩa hoặc từ tiếng Anh.
- Trộn thẻ dùng Fisher–Yates trên bản sao kết quả lọc, chỉ tạo thứ tự khi đổi bộ lọc/bật trộn/đặt lại. Lật, chuyển thẻ và render lại giữ nguyên thứ tự lượt hiện tại. Tắt trộn về thứ tự JSON trong bộ lọc hiện tại.
- Thay bộ lọc hoặc bật/tắt trộn bắt đầu lượt mới từ thẻ đầu/mặt Việt. Đặt lại bộ lọc giữ lựa chọn trộn. Chuyển Unit hoặc refresh reset mọi bộ lọc và tắt trộn; không lưu lựa chọn vào LocalStorage.
- Loading, Unit chưa xuất bản, JSON/HTTP/schema lỗi có thông báo. Đổi Unit hủy request và reset phiên, không hiển thị lại thẻ cũ.
- Nội dung nghi vấn trong PDF được giữ nguyên và đánh dấu theo hàng/category. Xem [báo cáo rà soát](docs/unit2-review.md).
- Sau khi xem mặt tiếng Anh, đánh dấu Đã thuộc/Chưa thuộc để lưu known/learning và chuyển thẻ; mặt trước không cho đánh giá. Thẻ cuối mở màn hình hoàn thành. Chế độ Tất cả cho phép đánh dấu lại thẻ đã học.
- Chế độ Tiếp tục học thẻ chưa học chỉ lấy new; Ôn tập từ chưa thuộc chỉ lấy learning. Kết hợp các bộ lọc và trộn. Khi đánh dấu làm danh sách thu ngắn, ID kế tiếp được giữ để không bỏ sót; thứ tự lượt không bị trộn lại.
- /statistics dùng dữ liệu thật: tổng thẻ, chưa học, đã thuộc, chưa thuộc và known/tổng × 100%, tổng hợp lẫn từng Unit. Trang chủ/danh sách Unit cũng có tiến độ và liên kết tiếp tục học.
- Mỗi cặp Unit ID/Flashcard ID lưu một record riêng trong namespace english-flashcard-progress-v1. Không lưu nội dung từ vựng hoặc sửa JSON. Dữ liệu hỏng bị bỏ qua; storage bị chặn/quota lỗi thì báo chưa lưu và giữ kết quả mới trong phiên. Xem [schema và quy tắc lưu](docs/progress-storage.md).
- Chưa có quiz hoặc upload PDF. Không có backend, database, đăng nhập hoặc admin.
- Light/Dark Mode giữ hành vi lưu lựa chọn theme có sẵn từ bước trước.
- Không thêm thư viện frontend mới ở Bước 5. Công cụ Python đọc PDF của bước trước chỉ phục vụ đối chiếu trong workspace, không nằm trong ứng dụng/build.
- File PDF không được sao chép vào public hoặc dist. JSON demo cũ trong src/data không được dùng làm dữ liệu Unit xuất bản.

## Thêm Unit

Theo [docs/data-format.md](docs/data-format.md): chuẩn bị file JSON riêng, kiểm tra nội dung/ID, đăng ký vào manifest rồi build/test. Không tự quét thư mục hoặc tự tạo Unit chưa có dữ liệu.

## Vercel

Framework Vite; install npm ci; build npm run build; output dist; không cần biến môi trường. vercel.json giữ SPA rewrite cho các route và loại trừ assets/data/favicon khỏi fallback HTML. Chưa deploy trong bước này.

Kết quả thực tế được ghi ở [VERIFICATION.md](VERIFICATION.md).
