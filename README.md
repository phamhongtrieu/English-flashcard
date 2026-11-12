# English Flashcard

Giai đoạn 1 — Bước 3A. React + TypeScript + Vite + Tailwind CSS 4, React Router, Motion và Lucide. Frontend Only, dữ liệu JSON tĩnh. Không có backend, database, API key hoặc đăng nhập.

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
src/
  components/layout/          # Header, navigation, footer
  components/ui/              # Badge, ProgressBar, DataState
  components/flashcards/      # Hai mặt thẻ và animation
  services/unitLoader.ts      # Fetch JSON và kiểm tra schema
  hooks/useUnitData.ts         # Loading/error, hủy request cũ
  hooks/useFlashcardStudy.ts   # Lật và điều hướng trong phiên
  pages/                      # Home, Study, Statistics, NotFound
  types/                      # Unit, Flashcard, UnitData
  data/                       # Nhãn, thống kê demo; JSON demo cũ được giữ
  styles/                     # Giao diện hiện tại và responsive
docs/
  data-format.md              # Cấu trúc JSON, quy trình thêm Unit
  unit2-review.md              # Nguồn, số lượng, 19 mục cần rà soát
  unit2-source-rows.json       # 50 hàng × 4 ô để đối chiếu
  unit2-counts.json            # Tổng hợp số lượng
scripts/import-unit2.py        # Tái tạo JSON từ bản chép đã đối chiếu
tests/                        # Route, dữ liệu, lật, điều hướng, lỗi, responsive
```

## Hành vi hiện tại

- Trang chủ đọc manifest và chỉ hiển thị Unit có dữ liệu được kiểm tra hợp lệ; số thẻ lấy từ mảng thực tế.
- /study: chọn Unit. /study/:unitId: tải bộ thẻ đã đăng ký. Hiện chỉ xuất bản Unit 2, không tạo Unit 1/3.
- Lật Y 180° hai chiều bằng nhấn/chạm/nút; Space/Enter khi focus thẻ. ←/→ điều hướng khi không nhập liệu. Chuyển thẻ về tiếng Việt; nút bị vô hiệu hóa tại biên.
- Loading, Unit chưa xuất bản, JSON/HTTP/schema lỗi có thông báo. Đổi Unit hủy request và reset phiên, không hiển thị lại thẻ cũ.
- Nội dung nghi vấn trong PDF được giữ nguyên và đánh dấu theo hàng/category. Xem [báo cáo rà soát](docs/unit2-review.md).
- /statistics vẫn dùng số liệu demo riêng; chưa nối với thao tác học.
- Chưa đánh dấu thuộc/chưa thuộc, quiz hoặc upload PDF. Không lưu tiến độ LocalStorage; tiện ích tiến độ cũ vẫn được giữ nhưng không kết nối.
- Light/Dark Mode giữ hành vi lưu lựa chọn theme có sẵn từ bước trước.
- Không thêm thư viện frontend mới ở Bước 3A. Công cụ Python đọc PDF chỉ phục vụ đối chiếu trong workspace, không nằm trong ứng dụng/build.
- File PDF không được sao chép vào public hoặc dist. JSON demo cũ trong src/data không được dùng làm dữ liệu Unit xuất bản.

## Thêm Unit

Theo [docs/data-format.md](docs/data-format.md): chuẩn bị file JSON riêng, kiểm tra nội dung/ID, đăng ký vào manifest rồi build/test. Không tự quét thư mục hoặc tự tạo Unit chưa có dữ liệu.

## Vercel

Framework Vite; install npm ci; build npm run build; output dist; không cần biến môi trường. vercel.json giữ SPA rewrite cho các route và loại trừ assets/data/favicon khỏi fallback HTML. Chưa deploy trong bước này.

Kết quả thực tế được ghi ở [VERIFICATION.md](VERIFICATION.md).
