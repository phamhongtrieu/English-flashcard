# Nhập và kiểm tra đáp án trên Flashcard

Chỉ bổ sung luyện gõ trong trang học hiện tại, không tạo trang/chế độ quiz mới. Không thêm thư viện, backend hoặc API. Không push/deploy.

## Hành vi

- Vùng nhỏ dưới Flashcard và trên điều hướng gồm công tắc **Luyện gõ đáp án**, ô nhập và nút **Kiểm tra**; mặc định bật. Công tắc còn hiển thị để bật lại khi vùng nhập bị tắt.
- Kết quả đúng: **Chính xác!** màu xanh. Kết quả sai: **Chưa chính xác, hãy thử lại!**; không hiện đáp án hoặc tự lật/chuyển thẻ. Sửa nội dung sẽ xóa kết quả cũ. Input rỗng hoặc chỉ có khoảng trắng thì nút kiểm tra bị vô hiệu hóa.
- Không cần gõ để lật thẻ. Mặt tiếng Anh ẩn form; khi quay lại tiếng Việt, giữ nội dung và kết quả cùng thẻ. Bật/tắt vùng nhập cũng giữ nội dung trong thẻ hiện tại.
- Chuyển thẻ, quay về thẻ cũ, chuyển Unit, đổi bộ lọc/mode, bật/tắt trộn hoặc bắt đầu lượt mới đều reset nội dung và kết quả. Component gắn với ID thẻ và vòng đời lượt học, không dùng index để lưu câu trả lời.
- Enter trong input gửi form và preventDefault để không reload. Space nhập khoảng trắng, mũi tên di chuyển con trỏ; listener điều hướng hiện tại đã bỏ qua input. Giữ nguyên Enter/Space lật khi focus thẻ, mũi tên ngoài input và phím tương tác loa. Không gửi kiểm tra bằng Enter khi IME đang composition hoặc giữ phím lặp.
- Đúng/sai không ghi trạng thái học. Người dùng vẫn lật thẻ và chủ động đánh dấu Đã thuộc/Chưa thuộc như trước.

## So sánh đáp án

`normalizeAnswer`: Unicode NFC → trim → gộp chuỗi whitespace thành một dấu cách → chữ thường theo en-US. Không sửa chính tả, xóa dấu, thay dấu câu/hyphen, tìm đồng nghĩa hoặc tách `/`.

Đáp án chuẩn luôn là `english`. Type/validator hỗ trợ thêm `acceptedAnswers?: string[]`: nếu khai báo, mảng không rỗng và từng phần tử phải là chuỗi có nội dung; các mục này được chấp nhận thêm bên cạnh đáp án chuẩn. Không thêm trường này vào dữ liệu Unit hiện tại. Fixture kiểm thử chỉ tồn tại trong bộ nhớ, không ghi JSON gốc.

## LocalStorage

Key riêng `english-flashcard-typing-enabled-v1`, giá trị chuỗi `true` hoặc `false`. Thiếu key, giá trị hỏng hoặc không đọc được thì mặc định bật. Chỉ ghi khi người dùng thay đổi công tắc; không lưu nội dung gõ hay kết quả kiểm tra.

Đọc/ghi được bọc try/catch. Khi bị chặn/quota đầy, vẫn thay đổi lựa chọn trong phiên và hiển thị thông báo chưa lưu được. Đổi bộ lọc trong cùng Unit giữ lựa chọn đang có trong phiên. Không thay schema/key/progress record hoặc xóa LocalStorage.

## File tạo/sửa

Tạo:
- `src/components/flashcards/TypingAnswer.tsx`: form, công tắc và phản hồi có nhãn accessible/status.
- `src/hooks/useTypingPreference.ts`: đọc/ghi lựa chọn riêng.
- `src/utils/answers.ts`: chuẩn hóa và so sánh đáp án.
- `tests/typing.spec.ts`: kiểm thử so sánh, tương tác, storage, mobile và dữ liệu không đổi.
- `docs/typing-report.md`: báo cáo này.

Sửa:
- `src/pages/StudyPage.tsx`: tích hợp form, giữ lựa chọn ở StudySession; reset nội dung theo thẻ/lượt học.
- `src/types/flashcard.ts`: trường acceptedAnswers tùy chọn.
- `src/services/unitLoader.ts`: kiểm tra trường acceptedAnswers nếu có.
- `src/styles/index.css`: style khu vực gọn, màu phản hồi, Dark Mode, input và nút ít nhất 44px, responsive.
- `README.md`, `VERIFICATION.md`, `docs/data-format.md`: cập nhật mô tả/schema/kết quả kiểm thử.

Giữ nguyên component/animation lật, logic đánh giá, progress storage, thống kê, phát âm, routing và dữ liệu Unit.

## Kiểm thử

- `npm.cmd run typecheck`: đạt, không lỗi TypeScript.
- `npm.cmd run build`: đạt, output `dist`, không thay dependencies/lockfile.
- Lượt cuối `npm.cmd run test:e2e -- --workers=3`: **73/73 ca đạt**, gồm 12 ca mới cho luyện gõ và toàn bộ 61 ca hồi quy hiện có.
- Đã kiểm tra: đúng/sai, hoa/thường, khoảng trắng, Unicode, cụm nhiều từ, rỗng, thử lại, explicit acceptedAnswers, không suy đoán đồng nghĩa hoặc tách slash; validator từ chối alternatives sai kiểu/rỗng.
- Lật không cần nhập, giữ/reset nội dung và kết quả theo đúng vòng đời thẻ/lượt, đổi Unit/bộ lọc/mode/trộn, bật/tắt và refresh: đạt.
- Enter không reload/lật; Space nhập bình thường; ArrowLeft/ArrowRight di chuyển con trỏ khi nhập; phím tắt ngoài input và tương tác loa vẫn hoạt động: đạt.
- Kiểm tra đúng/sai không đổi storage tiến độ; đánh dấu chủ động sau khi lật vẫn chuyển thẻ và lưu đúng trạng thái. Tiến độ cũ và thống kê vẫn giữ nguyên sau khi kiểm tra/bật tắt.
- Preference storage chưa có/hỏng/bị chặn/quota: đạt; khi không ghi được, vẫn dùng lựa chọn trong phiên và hiển thị thông báo.
- Mobile touch, Light/Dark và responsive 320/390/768/1440px: không tràn ngang, input/nút kiểm tra cao ít nhất 44px. Đã xem ảnh `test-results/typing-mobile-dark.png`.
- Toàn bộ dữ liệu/ID Unit 2 và Unit 3 giữ nguyên; test kiểm tra SHA-256 tương ứng `45cbea2323863ff83f42aedc1575fea165cf210c45b923bdf5268ca57d7977b5` và `4d4edadea8dc6e37e9d8fd86a2c6989155caf6ec1da5e871d7a254398cb2968f`.
- Các kiểm tra cũ về đủ 223/217 thẻ, lật 3D, điều hướng, lọc, trộn, storage/progress, ôn tập, thống kê, route và phát âm giả lập đều đạt.
- Lượt đầu có một kỳ vọng test sai vị trí con trỏ do đếm nhầm độ dài “Physique”; đã sửa kỳ vọng và chạy lại toàn bộ 73 ca thành công.

Lệnh chạy lại:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e -- --workers=3
```

Giới hạn: Chrome desktop và Chrome mô phỏng mobile/touch; chưa kiểm tra điện thoại thật, Safari/Firefox hoặc Vercel. Phát âm được kiểm tra bằng engine Web Speech giả lập trong bộ kiểm thử hiện có, không xác nhận âm thanh nghe được trên thiết bị thật.
