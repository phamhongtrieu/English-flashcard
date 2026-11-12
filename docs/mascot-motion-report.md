# Khủng long chibi tự di chuyển

Nâng cấp chuyển động trên SVG hiện có: giữ nguyên toàn bộ đường nét SVG, màu sắc và kích thước nhân vật (desktop 106×100, mobile 65×62). Không thay logic học hoặc dữ liệu Unit, không thêm dependency, không push/deploy.

## File trong lần nâng cấp chuyển động

- Tạo `src/hooks/useMascotWalk.ts`: điều khiển vị trí bằng MotionValue, đi/dừng/đổi hướng, preference storage, visibility và reduced motion.
- Sửa `src/components/flashcards/StudyMascot.tsx`: bọc SVG trong đường đi, quay hướng, phản ứng vui/lắc nhẹ, công tắc và cảnh báo khi chưa lưu được lựa chọn.
- Sửa `src/styles/index.css`: vùng đi lại có giới hạn, nhún bước chân, công tắc, bố cục mobile.
- Tạo `tests/mascot-motion.spec.ts`: 6 ca kiểm thử mới.
- Tạo báo cáo này; cập nhật `README.md`, `VERIFICATION.md` và liên kết từ báo cáo mascot trước.

Các file khác đang thay đổi từ tác vụ mascot trước được giữ nguyên; không sửa lại input/so sánh/đánh giá hoặc hook tiến độ trong lần nâng cấp này.

## Đi lại và giới hạn

Mascot đi qua lại trong lane riêng cạnh form ở desktop, dưới input trên mobile. Lane không phủ Flashcard, form, bộ lọc, nút điều hướng hoặc tiến độ. Không dùng fixed/absolute để thả nhân vật tự do trên viewport.

Track rộng bằng lane trừ chiều rộng nhân vật. Vị trí transform từ 0% đến 100% chiều rộng track nên hình luôn nằm trong lane, kể cả khi resize; không cần cập nhật React mỗi frame hoặc tính lại tọa độ toàn trang. Overflow được giới hạn bên trong lane, có đệm trên/dưới cho bước nhún và nhảy.

Mỗi lượt trọn đường kéo dài ngẫu nhiên 8–12 giây, dừng 2–4 giây ở đầu đường rồi đổi hướng. Lượt bị ngắt sẽ tiếp tục từ vị trí đã dừng với thời gian tỷ lệ quãng đường còn lại; không quay về điểm xuất phát. Khi đi sang phải SVG được scaleX(-1); đi trái dùng hướng gốc. Chỉ lật hình, không lật chữ.

Nhún bước chân 2px dùng CSS translate. Hoạt động đi lại dùng MotionValue và animation controls, không setInterval hay setState từng frame. React chỉ đổi trạng thái ở các mốc bắt đầu/dừng/đổi hướng và tương tác.

## Phản ứng

- idle: đi dạo và thỉnh thoảng dừng/đổi hướng.
- typing: dừng ngay tại vị trí hiện tại, hướng về khu vực nhập.
- correct: dừng, nhảy nhẹ hai nhịp và hiện sparkle; hoàn tất trở lại biểu cảm bình thường, tiếp tục đi dạo nếu được bật. Kết quả kiểm tra và câu thoại vẫn giữ nguyên, không tự đánh giá hoặc chuyển thẻ.
- incorrect: dừng, lắc nhẹ rồi giữ biểu cảm động viên; không tự thay kết quả hoặc progress.
- flipped/tắt luyện gõ: mascot ẩn cùng form như trước; unmount dừng animation và hủy timeout. Đổi thẻ/filter/Unit tạo lượt component mới theo vòng đời hiện có.

Khi tab ẩn, dừng đi lại và bước nhún. Khi hiện lại, tiếp tục từ vị trí cũ. Reduced motion chặn đi/nhún/nhảy/lắc; có listener matchMedia để xử lý cả khi người dùng đổi lựa chọn lúc trang đang mở. Cleanup gỡ listener visibility/media, dừng controls và clear timeout; callback có cờ hủy để tránh cập nhật sau unmount.

## Công tắc

**Bật/tắt chuyển động linh vật**, mặc định bật. Key riêng `english-flashcard-mascot-motion-v1`, giá trị `true`/`false`. Thiếu/hỏng key mặc định bật; đọc/ghi lỗi được bắt, vẫn đổi lựa chọn trong phiên và báo chưa lưu được. Không sửa schema/key/nội dung progress hoặc preference luyện gõ. Tắt chỉ chặn đi dạo, vẫn giữ phản ứng đúng/sai; reduced motion có ưu tiên tắt toàn bộ hiệu ứng chuyển động.

## Kiểm thử

- `npm.cmd run typecheck`: đạt, không lỗi TypeScript.
- `npm.cmd run build`: đạt, output vẫn `dist`, không thay dependencies/lockfile.
- `npm.cmd run test:e2e -- --workers=3`: **85/85 ca đạt**, gồm 6 ca mới về đi lại và 79 ca hồi quy.
- Kiểm tra thực tế với random cố định: đi 8 giây, nghỉ 2 giây, quay sang hướng trái và đi ngược; focus input dừng tại vị trí hiện tại. Lượt bình thường dùng khoảng ngẫu nhiên 8–12/2–4 giây.
- Kiểm tra đúng khi đang đi: dừng, nhảy/sparkle, trở về biểu cảm bình thường và tiếp tục đi. Sai: dừng/lắc nhẹ. Chuyển thẻ/lật/rời trang khi animation đang chạy không phát sinh lỗi JavaScript.
- Công tắc: mặc định bật, lưu đúng key riêng, refresh/chuyển Unit giữ lựa chọn; tắt đi dạo vẫn phản ứng đúng/sai. Storage bị chặn vẫn dùng được công tắc trong phiên. Không sửa các record progress.
- Resize 1440/768/375/430/320px rồi trở lại desktop, Light/Dark: nhân vật luôn trong lane; lane không chồng Flashcard, input/nút Kiểm tra, điều hướng, bộ lọc hoặc tiến độ; không tràn ngang.
- Reduced motion lúc mở trang và khi đổi trực tiếp trong phiên: dừng đi/bước nhún; bật lại tiếp tục từ vị trí hiện tại. Tab ẩn/hiện: dừng/tiếp tục đúng, không nhảy về đầu đường.
- Toàn bộ kiểm tra cũ về học, lật 3D, gõ/Enter, phát âm giả lập, lọc/trộn, điều hướng, đánh giá/ôn tập, LocalStorage, thống kê và responsive vẫn đạt.
- SHA-256 Unit 2/3 trước/sau giữ nguyên: `45cbea2323863ff83f42aedc1575fea165cf210c45b923bdf5268ca57d7977b5` và `4d4edadea8dc6e37e9d8fd86a2c6989155caf6ec1da5e871d7a254398cb2968f`.
- Đã xem ảnh `test-results/mascot-walk-desktop.png` và `test-results/mascot-walk-mobile.png`.
- Lượt đầu phát hiện listener giảm chuyển động chưa cập nhật khi thay đổi trực tiếp trong phiên, đã sửa bằng listener matchMedia có cleanup. Đồng thời sửa kỳ vọng test CSS scaleX(1) về matrix đồng nhất thay vì `none`; chạy lại toàn bộ 85 ca đạt.

Chạy lại: `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run test:e2e -- --workers=3`.

Giới hạn: Chrome desktop và mobile/touch mô phỏng, chưa thử điện thoại thật/Safari/Firefox/Vercel. Visibility được kiểm tra bằng sự kiện visibilitychange mô phỏng; không tự deploy.
