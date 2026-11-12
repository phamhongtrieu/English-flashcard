# Khủng long chibi đồng hành luyện gõ

Nâng cấp tiếp theo: [mascot tự di chuyển](mascot-motion-report.md). Nội dung dưới đây ghi lại phiên bản mascot trước khi thêm đi dạo.

Chỉ thêm minh họa và phản hồi cho vùng luyện gõ đáp án hiện có. Khủng long là SVG tự vẽ trực tiếp trong component, không dùng ảnh tải ngoài hoặc dịch vụ/API. Không thêm dependency, không push/deploy.

## File tạo/sửa

Tạo:
- `src/components/flashcards/StudyMascot.tsx`: minh họa khủng long, biểu cảm, bong bóng và animation.
- `src/data/mascotMessages.ts`: `idleMessages`, `typingMessages`, `correctMessages`, `incorrectMessages`; type trạng thái và hàm chọn câu phản hồi.
- `tests/mascot.spec.ts`: 6 ca kiểm tra trạng thái, câu thoại, reset, bảo toàn chức năng, bố cục và reduced motion/mobile.
- `docs/mascot-report.md`: báo cáo này.

Sửa:
- `src/components/flashcards/TypingAnswer.tsx`: theo dõi focus và truyền trạng thái/kết quả hiện có cho mascot.
- `src/styles/index.css`: bố trí cạnh phải desktop, thu nhỏ dưới góc phải ở chiều rộng tối đa 600px, màu Light/Dark.
- `README.md`, `VERIFICATION.md`: cập nhật mô tả và kết quả kiểm thử.

## Trạng thái và hành vi

| Trạng thái | Điều kiện | Biểu cảm |
| --- | --- | --- |
| idle | Input rỗng, không focus và chưa có kết quả | Đứng mỉm cười, mời nhớ từ |
| typing | Input focus hoặc có nội dung, chưa có kết quả | Nhìn sang khu vực nhập, chờ người học |
| correct | Đáp án được kiểm tra đúng | Mắt cười, sparkle nhỏ và nhảy nhẹ một lần |
| incorrect | Đáp án được kiểm tra sai | Hơi ngơ ngác, khích lệ thử lại |

Kết quả có ưu tiên hơn focus: focus lại input sau khi kiểm tra không làm mất biểu cảm đúng/sai. Sửa nội dung xóa kết quả như trước, mascot quay về typing. Xóa hết rồi blur quay về idle.

Câu idle/typing lấy câu đầu trong danh sách cấu hình. Câu correct/incorrect được chọn ngẫu nhiên một lần khi người dùng kiểm tra; render, đổi theme hoặc focus không chọn lại câu. Không dùng timer, animation lặp hay ghi trạng thái mascot vào storage.

Mascot ẩn cùng form khi tắt luyện gõ hoặc lật sang mặt sau. Lật lại cùng thẻ giữ kết quả và câu phản hồi. Khi đổi thẻ/Unit/bộ lọc/mode/trộn, vòng đời component hiện có reset input/kết quả/focus/câu thoại, mascot về idle. Unmount không có callback trễ cần cập nhật state.

Motion for React đã có sẵn được dùng cho fade nhẹ bong bóng và bounce 5px; `useReducedMotion` tắt hiệu ứng khi có tùy chọn giảm chuyển động. Không dùng chuyển động liên tục. SVG chỉ trang trí, ẩn khỏi accessibility tree; kết quả đúng/sai vẫn được thông báo bằng vùng status hiện có để tránh đọc trùng câu khích lệ.

## Bảo toàn

Không thay đổi so sánh đáp án, chuẩn hóa, acceptedAnswers, ID hoặc dữ liệu Unit, progress schema/key, đánh giá, thống kê, loader, routing, lật 3D hay phát âm. Mascot không tương tác và không bắt sự kiện bàn phím/chạm của các nút học.

SHA-256 Unit 2 trước/sau: `45cbea2323863ff83f42aedc1575fea165cf210c45b923bdf5268ca57d7977b5`.
SHA-256 Unit 3 trước/sau: `4d4edadea8dc6e37e9d8fd86a2c6989155caf6ec1da5e871d7a254398cb2968f`.

## Kiểm thử

- `npm.cmd run typecheck`: đạt, không lỗi TypeScript.
- `npm.cmd run build`: đạt, output vẫn là `dist`; không thay dependency/lockfile.
- `npm.cmd run test:e2e -- --workers=3`: **79/79 ca đạt**, gồm 6 ca mascot mới và 73 ca hồi quy.
- Trạng thái idle/focus/typing/correct/incorrect, xóa nội dung, câu thoại đúng danh sách và không chọn lại khi render/focus/theme: đạt.
- Đổi thẻ/Unit/bộ lọc/category/loại từ/mode/trộn reset về idle; rời trang không lỗi JavaScript: đạt.
- Lật mặt sau và tắt luyện gõ ẩn mascot; quay lại giữ đúng nội dung/kết quả/câu thoại của cùng thẻ: đạt. Không ghi thêm hoặc sửa LocalStorage khi mascot phản hồi.
- Desktop mascot bên phải form, mobile dưới góc phải; kiểm tra bounding box tại 320/390/600/768/1440px trong cả Light/Dark: không chồng input/nút, không tràn ngang.
- Mobile touch và reduced motion: vẫn chuyển trạng thái đúng; reduced motion không có bounce, bong bóng hiển thị đầy đủ.
- Các chức năng cũ: đủ 223/217 thẻ Unit 2/3, lật 3D, nhập/kiểm tra, bàn phím, đánh giá, ôn tập, progress lưu/khôi phục/lỗi storage, thống kê, bộ lọc/trộn, phát âm giả lập và route đều qua kiểm thử.
- Đối chiếu hash Unit 2/3 trước/sau: không thay đổi dữ liệu hoặc ID.

Ảnh kiểm tra: `test-results/mascot-1440-light.png`, `test-results/mascot-390-dark.png`. Đã xem trực tiếp cả hai ảnh.

Giới hạn: Chrome desktop và mobile/touch mô phỏng; chưa thử điện thoại thật, Safari/Firefox hoặc Vercel. Phát âm được kiểm tra bằng Web Speech giả lập trong bộ hồi quy hiện có.

Chạy lại: `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run test:e2e -- --workers=3`.
