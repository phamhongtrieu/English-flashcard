# Kết quả kiểm tra Bước 1

Kết quả hiện tại của **Bước 3A**: xem [docs/step3a-report.md](docs/step3a-report.md). TypeScript/build đạt; 26 ca kiểm thử đã đạt qua lần chạy toàn bộ và chạy lại hai ca cuối. Bộ dữ liệu xuất bản gồm 1 Unit/223 thẻ/50 hàng. Các phần bên dưới là lịch sử kiểm tra trước khi chuyển sang manifest và dữ liệu PDF thật.

## Cập nhật Bước 2

- TypeScript và production build: thành công; output vẫn là `dist`.
- Bộ kiểm thử được cập nhật cho phạm vi Bước 2: **11/11 ca đạt**, gồm kiểm thử nền tảng và kiểm thử lật/chuyển thẻ.
- 5 từ mẫu được kiểm tra cả mặt Việt/Anh, lật bằng thẻ/nút, chuyển trước/tiếp, thứ tự và reset mặt trước, nút vô hiệu hóa tại biên.
- Kiểm tra Space/Enter (không xử lý hai lần/giữ phím), ArrowLeft/ArrowRight, bỏ qua khi nhập liệu và giữ focus thẻ khi chuyển bằng phím.
- Chrome mô phỏng mobile 390×844, có touch: chạm để lật hai chiều; xác minh transform xoay Y 180°, hai mặt ẩn mặt lưng, chữ mặt sau có hướng đọc đúng, kích thước vùng thẻ ổn định và không tràn ngang. Ảnh: `test-results/study-mobile-answer.png`. Chưa thử trên điện thoại thật hoặc Safari.
- Trang học không đọc/ghi tiến độ LocalStorage; dữ liệu tiến độ cũ không bị sửa. Kiểm thử giao diện cả khi LocalStorage bị chặn. Cơ chế theme cũ được giữ nguyên.
- Trang chủ, thống kê và dữ liệu JSON không thay đổi. Không thêm dependency. Các nút đánh giá vẫn vô hiệu hóa.

Phần dưới là kết quả lịch sử của Bước 1; hành vi tiến độ LocalStorage trên trang học đã được thay bằng state trong phiên theo giới hạn Bước 2.

- Dependencies cài thành công bằng npm; `package-lock.json` được tạo. npm audit lúc cài: 0 vulnerabilities.
- `npm run typecheck`: thành công, không có lỗi TypeScript.
- `npm run build`: thành công, xuất `dist/index.html` và assets CSS/JS.
- Playwright + Chrome: **9/9 ca đạt** trên bản production build.
- Đã kiểm tra `/`, `/study`, `/statistics`, route không tồn tại, truy cập trực tiếp và refresh trên Vite preview; điều hướng bằng React Router; không có lỗi JavaScript trong ca kiểm tra route.
- Responsive 320, 390, 768, 1440 px: tất cả các trang trong cả hai chế độ không tràn ngang; menu hiển thị. Đã sửa lỗi tràn ngang ở hero trước lần chạy đạt.
- Light/Dark: màu nền thay đổi, trạng thái được giữ khi refresh/đổi trang; có kiểm tra ảnh desktop, mobile và mobile dark.
- LocalStorage: khởi tạo tiến độ 0, đọc lại và chuẩn hóa ID hợp lệ, loại bỏ ID trùng/sai, khôi phục JSON hỏng; thống kê demo không sửa tiến độ thật. Khi storage bị chặn, trang học vẫn hoạt động và báo không thể lưu.
- Các nút lật thẻ/học đang bị vô hiệu hóa đúng phạm vi Bước 1.

Ảnh kiểm tra tại `test-results/home-desktop.png`, `home-mobile.png`, `home-mobile-dark.png`. Chạy lại: `npm run build` rồi `npm run test:e2e` (cần Chrome).

Giới hạn: kiểm thử trên Chrome tại máy hiện tại, chưa kiểm tra Safari/Firefox hoặc thiết bị thật. `vercel.json` đã chuẩn bị SPA rewrite và output `dist`, nhưng chưa deploy Vercel; kiểm thử localhost không thay thế xác minh routing trên môi trường hosting thật. Chưa nhập PDF, chưa phát triển logic học hoặc Bước 2.
