# Bổ sung phát âm tiếng Anh

## File tạo mới

- `src/hooks/usePronunciation.ts`: Web Speech API, chọn giọng, lifecycle, thông báo lỗi.
- `src/components/flashcards/PronunciationButton.tsx`: nút Volume2, trạng thái đang đọc, ngăn click/phím lật thẻ.
- `tests/pronunciation.spec.ts`: 10 ca kiểm thử riêng cho phát âm.
- `docs/pronunciation-report.md`: báo cáo này.

## File sửa

- `src/components/flashcards/FlashcardPreview.tsx`: slot tùy chọn dưới từ tiếng Anh/loại từ. Preview trang chủ giữ nguyên.
- `src/components/flashcards/StudyFlashcard.tsx`: gắn nút vào mặt sau trang học, key theo ID để cleanup khi đổi thẻ; chặn xử lý phím của phần tử con ở vùng lật thẻ.
- `src/styles/index.css`: nút tròn tím pastel 44×44 px, hover, trạng thái đọc, dùng biến màu Dark Mode. Giữ chỗ nút khi mặt Việt đang hiển thị để thẻ không đổi kích thước lúc lật.
- `README.md`, `VERIFICATION.md`: hướng dẫn và kết quả kiểm tra.

## Hành vi

- Chỉ hiển thị nút loa khi Flashcard học đang ở mặt tiếng Anh, ngay dưới từ và loại từ.
- Click/chạm hoặc Enter/Space trên nút gọi `SpeechSynthesisUtterance` với nguyên giá trị `card.english`, `lang: en-US`, `rate: 0.9`, `pitch: 1`, `volume: 1`.
- Chỉ xét giọng có mã ngôn ngữ tiếng Anh, ưu tiên en-US. Nếu không có en-US, dùng giọng English mặc định hoặc giọng English đầu tiên. Không chọn tiếng Việt. Không có giọng English thì báo và không gọi speak.
- Đọc danh sách ban đầu, làm mới khi `voiceschanged`, đồng thời kiểm tra lại ngay lúc người dùng nhấn. Giọng tải muộn không tự kích hoạt phát âm; người dùng nhấn lại để nghe.
- Trước lượt đọc mới, hủy lượt cũ. Cho phép nghe lại khi kết thúc hoặc nhấn lại khi đang đọc.
- Hủy và gỡ callback khi chuyển ID thẻ, lật về mặt Việt, thay bộ lọc khiến component unmount, hoàn thành lượt hoặc rời trang học.
- `stopPropagation` cho click và Enter/Space; giữ hành vi native button để mỗi lần nhấn phím chỉ phát một lần. ArrowLeft/ArrowRight vẫn đi tới listener điều hướng hiện có.
- Có trạng thái đang đọc, thông báo thiếu API/thiếu giọng/lỗi engine. Handler kiểm tra mounted và đúng utterance hiện hành; callback cũ không thay đổi lượt đọc mới. Cleanup không gọi setState.

Không sửa JSON, ID, LocalStorage, logic đánh giá hay cấu trúc Unit. Không thêm ví dụ, thư viện hoặc dịch vụ TTS, backend/API hay deploy Vercel.

## Kiểm thử

- `npm run typecheck`: đạt.
- `npm run build`: đạt, output `dist`.
- 10 ca phát âm riêng đã đạt: Physique, Physical, cụm dài `Stimulate intellectual growth`, đúng tham số/giọng; chỉ đọc khi nhấn; nghe lại; trạng thái đọc/kết thúc/lỗi; hủy khi đổi thẻ/về mặt Việt/rời trang; stale callback; Enter/Space không lật; phím mũi tên; giọng tải chậm; fallback English; chỉ có giọng Việt; API thiếu; engine throw/onerror; mobile touch và Dark Mode.
- Ca phát âm dùng engine giả lập có kiểm soát để xác minh payload và sự kiện một cách xác định, không xác nhận chất lượng âm thanh nghe được.
- `npm run test:e2e`: **55/55 ca đạt** trong lần chạy toàn bộ, gồm 45 ca hồi quy và 10 ca phát âm. Không phát hiện lỗi hồi quy lật thẻ, bộ lọc/trộn, đánh giá/tiến độ hoặc route.
- Đã kiểm tra native Chrome headless trên máy hiện tại: Web Speech API có sẵn, trả về 3 giọng en-US (Microsoft David, Mark, Zira). Lượt đọc Physique và Physical đều trả `synthesis-failed`. Một trang tối giản chỉ dùng Speech API cũng trả lỗi này. Ứng dụng đã hiển thị thông báo lỗi và giữ chức năng học hoạt động. Âm thanh nghe thực tế trên trình duyệt/thiết bị thật cần được kiểm tra thủ công; chưa xác minh trên Vercel đang chạy.
- Ảnh mobile dark được tạo tại `test-results/pronunciation-mobile-dark.png` khi chạy bộ kiểm thử. Mobile được mô phỏng bằng Chrome touch 390×844.

## Tài liệu API đối chiếu

- [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [voiceschanged](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event)
- [cancel](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel)
