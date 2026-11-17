# TOEIC Quiz riêng

## Phạm vi đã triển khai

- `/toeic`: 50 vị trí bài TOEIC, hiện đều đóng; không sao chép tên chủ đề, nghĩa,
  ví dụ, phiên âm hay media từ CSV vào danh mục công khai.
- `/toeic/lesson/:lessonId`: trắc nghiệm nghĩa Việt → bốn đáp án Anh. Không có
  lật thẻ hay luyện gõ ở route này. Flashcard Unit 2/3 vẫn dùng route `/study/...`.
- `/toeic/lesson/demo-01`: 12 mục mẫu về đồ vật/quả thông dụng, tự biên soạn độc lập,
  phục vụ trải nghiệm/kiểm thử. Văn bản mẫu trong `public/data/toeic/lessons/demo-01.json`
  được dành cho sử dụng tự do theo CC0-1.0, không bắt nguồn từ CSV 615 từ.
- Lượt luyện chọn tối đa 10 câu không lặp, trộn vị trí đáp án, chấm ngay, khóa
  lựa chọn sau khi chấm và chuyển câu bằng nút. Tổng kết có đúng/sai/tỷ lệ.
- Tái sử dụng `StudyMascot` với tùy chọn `stationary`: đứng chờ ở Quiz, nhảy khi
  đúng, lắc nhẹ khi sai. Các tham số mặc định ở Flashcard được giữ nguyên.
- Responsive, màu tím và Dark Mode dùng hệ thống màu/giao diện hiện có.

## Tách dữ liệu và quyền sử dụng

`data-preparation/toeic/` vẫn là dữ liệu chuẩn bị: 615 bản ghi / 50 bài, giữ nguyên
ID và các ghi chú rà soát. Không có import hoặc fetch từ ứng dụng tới thư mục đó.
Không có bước tự động đổi `unreviewed`/`needs-review` thành đã duyệt.

Ứng dụng chỉ đọc `public/data/toeic/catalog.json` và các đường dẫn được khai báo
tại đó, theo mẫu `data/toeic/lessons/<id>.json`. Không chấp nhận URL bên ngoài hoặc
đường dẫn đi ngược thư mục. Loader yêu cầu cả bộ và bài có:

```json
{
  "rightsStatus": "verified",
  "rightsReference": "Tham chiếu tài liệu cấp quyền đã kiểm tra",
  "contentStatus": "approved"
}
```

Đây là khai báo do người quản lý nội dung chịu trách nhiệm, không phải phần mềm
tự xác minh giấy phép. Bộ TOEIC thật hiện khai báo `unverified`/`pending`, mọi
`dataFile` là `null`, do đó không được tải hoặc chơi. Truy cập route trực tiếp
cũng không vượt qua điều kiện này. Bộ mẫu có collection riêng `toeic-sample`.

`npm run build` kiểm tra trước và sau build qua `scripts/check-toeic-publication.mjs`:
chặn đường dẫn nguồn CSV/dữ liệu chuẩn bị, JSON `publishable:false`, ID nguồn chưa
được phép và tham chiếu bài công khai chưa duyệt. Đây là lớp phát hiện lỗi đóng gói;
không thay thế việc rà soát nội dung và quyền của những file được thêm mới.
Kiểm tra chỉ đọc dữ liệu chuẩn bị ở bước build nếu thư mục đó còn trong checkout;
không nhúng dữ liệu chuẩn bị vào JavaScript.

## Hợp đồng dữ liệu để mở bài thật sau này

Không cần viết lại Quiz. Sau khi có quyền, bổ sung một payload theo
`QuizLessonData` (`src/types/toeicQuiz.ts`) và trỏ `dataFile` trong catalog tới file đó:

```json
{
  "schemaVersion": 1,
  "collectionId": "toeic-vocabulary",
  "lessonId": "toeic-01",
  "approval": {
    "rightsStatus": "verified",
    "rightsReference": "Tham chiếu giấy phép thực tế",
    "contentStatus": "approved"
  },
  "entries": [
    {
      "id": "ID nguồn đã có, giữ nguyên",
      "lessonId": "toeic-01",
      "english": "chuỗi nguồn đã được cấp quyền",
      "vietnamese": "nghĩa đã rà soát",
      "partOfSpeech": null,
      "quiz": {
        "status": "approved",
        "answerAliases": ["các đáp án tương đương cần loại khỏi nhiễu"],
        "distractorIds": ["id-nhieu-1", "id-nhieu-2", "id-nhieu-3"]
      }
    }
  ]
}
```

Đoạn trên chỉ minh họa hợp đồng, không phải payload chạy được. Dùng ví dụ thật
trong `demo-01.json` để xem cấu trúc hoàn chỉnh. Các ID phải đúng định dạng và
không trùng. Giữ `english`/`vietnamese` nguồn, dùng `partOfSpeechOriginal` ở dữ liệu
chuẩn bị làm nhãn loại từ nếu đã được duyệt; không đoán loại từ thiếu. Các mục
chưa được duyệt phải tiếp tục ở dữ liệu chuẩn bị, không đưa vào payload công khai.

Đáp án nhiễu cần được duyệt **cho từng nghĩa/câu hỏi** bằng `distractorIds`.
Thuật toán ưu tiên ID thuộc cùng bài, sau đó mới lấy từ các bài đã tải hợp lệ trong
cùng collection. Nó loại chữ trùng sau chuẩn hóa, đáp án tương đương trong
`answerAliases` và các mục có cùng nghĩa tiếng Việt. Không dùng từ bên ngoài pool.
Không đủ ba nhiễu an toàn thì bỏ câu. Bài không còn câu hợp lệ sẽ bị đóng.

So sánh chuỗi không chứng minh được hai từ có khác nghĩa hay không. Vì vậy danh
sách nhiễu và các đáp án tương đương bắt buộc phải được người rà soát nội dung kiểm
tra; không tự sinh whitelist từ toàn bộ từ của CSV. Các từ trùng ở các bài khác
nhau vẫn có ID nguồn riêng, không được gộp. Trùng chữ tiếng Anh trong một payload
bài hiện bị từ chối để tránh các câu mơ hồ; giữ những bản ghi đó trong dữ liệu
chuẩn bị để biên tập ngữ cảnh trước khi mở bài.

Trước khi đưa dữ liệu thật lên website cần:

1. Xác minh phạm vi quyền tái xuất bản văn bản; ghi tài liệu tham chiếu thật.
2. Rà soát các cờ trong audit, nghĩa, loại từ, phiên âm/ví dụ nếu muốn sử dụng.
   Ghi nhận quyết định biên tập rõ ràng, không thay đổi ID.
3. Duyệt từng câu và danh sách nhiễu/đáp án tương đương, xuất payload đã duyệt.
4. Cập nhật approval/catalog, kiểm tra schema, Quiz và build trước khi chủ dự án
   chủ động quyết định xuất bản. Không tự lấy ảnh/âm thanh của bên thứ ba.

## Tiến độ

Khóa riêng theo collection/bài:
`english-flashcard-toeic-quiz-v1:<collectionId>:<lessonId>`.
Không đọc/ghi các khóa tiến độ Flashcard. Theme vẫn là tùy chọn giao diện chung.
Quiz ẩn công tắc đi dạo, không thay đổi lựa chọn chuyển động của Flashcard.

Mỗi lần trả lời lưu một sự kiện có ID lượt/câu, ngăn chấm cùng câu hai lần.
Tổng đúng/sai và số lượt hoàn thành được cộng dồn; giữ lịch sử 20 lượt gần nhất,
kể cả lượt dở. Bài được ghi “Đã hoàn thành bài” khi đã trả lời tất cả các câu
hợp lệ ít nhất một lần; một lượt 10 câu hoàn thành chưa nhất thiết hoàn thành
bài 12 câu. Đây là độ bao phủ luyện tập, không phải đánh giá đã thuộc mọi từ.

LocalStorage lỗi hoặc bị chặn sẽ có cảnh báo; người học vẫn tiếp tục lượt hiện
tại trong bộ nhớ. Tải lại không khôi phục lượt dở, nhưng các câu đã lưu vẫn được
tính vào tiến độ. Không có backend, database hay đăng nhập.

## Kiểm tra

```powershell
python -B scripts/prepare-toeic.py --check
python -B -m unittest discover -s tests -p test_toeic_preparation.py
npm.cmd run typecheck
npm.cmd run build
node --test scripts/check-toeic-preparation.mjs
npm.cmd run test:e2e
```

Các kiểm tra mới: `tests/toeic-logic.spec.ts`, `tests/toeic-quiz.spec.ts`.
Kiểm tra browser bao gồm đóng bài chưa duyệt, xử lý dữ liệu lỗi, lượt 10 câu,
đáp án/điểm/mascot, lưu tiến độ riêng, bộ nhớ bị chặn, Dark Mode và 320/375/768/1440 px.
Toàn bộ bộ kiểm thử hiện có cũng được dùng để kiểm tra hồi quy Unit 2/3.

Kết quả kiểm tra triển khai ngày 17/11/2026:

- TypeScript, build và kiểm tra đóng gói `public`/`dist`: đạt.
- 3 kiểm tra Python và kiểm tra tái tạo dữ liệu: đạt; hash toàn bộ file chuẩn bị
  trước/sau giống nhau (615 bản ghi, 50 bài, 88 bản ghi có cờ giữ nguyên).
- 3 kiểm tra Node (validator hiện có, không lộ dữ liệu nguồn, thử chặn dữ liệu
  không được xuất bản): đạt.
- Bộ Playwright đầy đủ: 97/98 đạt lần đầu; một ca chụp ảnh mascot cũ timeout
  khi chạy 6 worker, chạy lại riêng đạt. Sau chỉnh sửa cuối về ẩn công tắc
  đi dạo trong Quiz, 16/16 ca TOEIC và chuyển động mascot đạt với 2 worker.
- Duyệt ảnh desktop/mobile của Quiz: chữ Việt đúng, Dark Mode, không tràn ngang.
- Các file dữ liệu Unit 2/3, ID Flashcard, kiểu Flashcard và logic LocalStorage
  tiến độ cũ không có thay đổi.

Các nhóm file triển khai: `src/types/toeicQuiz.ts`, `src/utils/toeicQuiz*.ts`,
`src/services/toeicQuizLoader.ts`, `src/hooks/useToeicQuizCatalog.ts`,
`src/components/toeic/`, `src/pages/Toeic*.tsx`, `src/styles/toeic.css`,
`public/data/toeic/`. Các điểm kết nối nhỏ: App, main, AppLayout và StudyMascot.
Script kiểm tra dữ liệu chuẩn bị được cập nhật để cho phép bộ mẫu công khai mà
vẫn chặn nội dung CSV thật. Không push hoặc deploy trong công việc này.
