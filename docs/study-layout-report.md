# Tối ưu trình bày trang học

Chỉ thay bố cục và cách trình bày trên trang học. Không thêm backend/database/Admin, không push/deploy.

## Thay đổi

- Tiêu đề Unit dùng cỡ chữ gọn hơn, đặt cùng hàng badge; bỏ dòng khẩu hiệu phụ ở trang học. Hướng dẫn chuyển thành một dòng ngắn, giảm khoảng trống đầu trang.
- Bộ lọc mặc định thu gọn cả desktop/mobile. Nút có aria-expanded/aria-controls và hỗ trợ bàn phím Enter/Space. Form bộ lọc vẫn được giữ trong DOM với hidden, không unmount/reset state.
- Tóm tắt và số thẻ luôn hiện: chủ đề, nhóm từ, loại từ, chế độ học và trạng thái trộn. Mở lại có đủ mode, ba bộ lọc, trộn và reset như trước. Đóng/mở không gọi các hàm đổi deck/filter/shuffle, không ghi LocalStorage.
- Giảm khoảng đệm thẻ và các khoảng cách phụ để Flashcard/ô nhập xuất hiện sớm. Input/nút kiểm tra giữ cùng hàng ở 375px, chỉ xuống dòng khi rộng tối đa 350px để tránh tràn ngang.
- Bỏ hoàn toàn việc render “Cần rà soát” dưới thẻ. Không xóa, lọc hoặc sửa reviewNotes trong JSON; validator vẫn giữ kiểm tra dữ liệu ghi chú nguồn. Không thay từ vựng hoặc loại từ.
- Giữ nguyên SVG, tỷ lệ/màu sắc, chuyển động trong lane và phản ứng mascot. Không sửa component/hook mascot trong tác vụ này.

## File tạo/sửa trong lần tối ưu

- `src/components/flashcards/StudyFilters.tsx`: đóng/mở và summary luôn hiển thị.
- `src/pages/StudyPage.tsx`: rút gọn heading/hướng dẫn; bỏ render ghi chú nội bộ.
- `src/styles/index.css`: style accordion, khoảng cách trang học, kích thước chữ/thẻ và responsive input.
- Tạo `tests/study-layout.spec.ts`: kiểm tra mặc định đóng, bảo toàn lựa chọn/thẻ/câu trả lời, vùng nhìn đầu tiên, ghi chú không render.
- Tạo `tests/helpers/studyFilters.ts`; cập nhật các test filters/units/unit3/typing/pronunciation/progress/mascot để mở bộ lọc trước khi thao tác trên control hiện đã được thu gọn.
- `README.md`, `VERIFICATION.md`, `docs/data-format.md`, báo cáo này: cập nhật hành vi và kiểm thử.

Workspace đã có thay đổi mascot từ các tác vụ trước; những phần đó được giữ nguyên, không tự stage/commit.

## Kiểm thử

- `npm.cmd run typecheck`: đạt, không lỗi TypeScript.
- `npm.cmd run build`: đạt, output `dist`, không thay dependency/lockfile.
- `npm.cmd run test:e2e -- --workers=3`: **88/88 ca đạt**, gồm 3 ca mới cho layout và 85 ca hồi quy.
- Bộ lọc mặc định đóng; đóng/mở giữ đủ section/category/POS/mode/shuffle, ID/thứ tự thẻ, câu trả lời/kết quả, record LocalStorage. Toggle bằng Space/Enter hoạt động; tóm tắt vẫn hiện khi đóng.
- Truy cập Unit 2 và Unit 3 ở 1440×900, 390×844, 375×812, 430×932 trong Light/Dark: toàn bộ Flashcard và ô nhập nằm trong viewport đầu, không tràn ngang. Các ca responsive cũ vẫn kiểm tra 320/390/768/1440px cả khi mở bộ lọc.
- JSON Unit 2/3 vẫn có reviewNotes nhưng trang học không render phần tử `.data-note` hoặc chữ “Cần rà soát” ở cả mặt trước/sau.
- Toàn bộ kiểm tra lật 3D, nhập/Enter, phát âm giả lập, bộ lọc/trộn, điều hướng đủ 223/217 thẻ, đánh giá/ôn tập/progress/statistics và mascot đi lại/phản ứng/resize/reduced motion vẫn đạt.
- SHA-256 dữ liệu không thay đổi: Unit 2 `45cbea2323863ff83f42aedc1575fea165cf210c45b923bdf5268ca57d7977b5`, Unit 3 `4d4edadea8dc6e37e9d8fd86a2c6989155caf6ec1da5e871d7a254398cb2968f`.
- Lượt đầu phát hiện input xuống dòng và vượt viewport 375px; đã điều chỉnh khoảng đệm và breakpoint. Sửa selector test để chọn mặt aria-hidden=false thay vì CSS visible (hai mặt 3D đều có kích thước). Chạy lại toàn bộ 88 ca đạt.

Đã đo tọa độ trên Unit 3 ở trạng thái mặc định:

| Viewport | Mép dưới ô nhập/nút Kiểm tra |
| --- | ---: |
| 1440×900 | 835.5px |
| 390×844 | 788.5px |
| 375×812 | 806.5px |
| 430×932 | 768.1px |

Như vậy Flashcard và input/nút Kiểm tra đều nằm trong màn hình đầu tiên ở các kích thước trên khi bộ lọc đóng và luyện gõ bật. Màn hình thấp hơn, bộ lọc mở hoặc summary dài vẫn có thể cần cuộn; không cố định chiều cao viewport hoặc cắt nội dung học.

Đã xem ảnh thực tế trang học Unit 3 375px. Chạy lại: `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run test:e2e -- --workers=3`.

Giới hạn: kiểm thử Chrome desktop và mobile/touch mô phỏng, chưa kiểm tra thiết bị thật/Safari/Firefox/Vercel. Phát âm trong bộ hồi quy dùng Web Speech giả lập.
