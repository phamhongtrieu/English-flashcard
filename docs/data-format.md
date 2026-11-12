# Dữ liệu Unit — schemaVersion 1

Frontend Only. Chỉ fetch file tĩnh cùng website; không có API/backend, không quét thư mục và không lưu tiến độ. Manifest là danh sách duy nhất quyết định Unit nào đã xuất bản.

## Manifest: public/data/units.json

```json
{
  "schemaVersion": 1,
  "units": [{
    "id": "unit-2",
    "number": 2,
    "title": "Human Development & Health",
    "description": "Mô tả của Unit",
    "sections": [{ "id": "a", "title": "Tên chủ đề trong PDF", "description": "Mô tả" }],
    "dataFile": "data/units/unit2.json"
  }]
}
```

`number` là trường hiển thị tùy chọn; ứng dụng không suy đoán số Unit từ vị trí trong danh sách. `id` và ID chủ đề là slug chữ thường/số/dấu gạch ngang. ID Unit không đổi sau khi xuất bản. `dataFile` là đường dẫn tương đối với Vite BASE_URL, không bắt đầu bằng `/` hoặc `public/`, phải trỏ vào `data/units/*.json`.

## File Unit

Ví dụ một bản ghi trong dữ liệu Unit 2 (file thật chứa đủ 223 thẻ):

```json
{
  "schemaVersion": 1,
  "unitId": "unit-2",
  "source": { "fileName": "Unit2.pdf", "pages": 6, "sourceRowCount": 50 },
  "flashcards": [{
    "id": "unit-2-r001-base-word-01",
    "unitId": "unit-2",
    "section": "a",
    "category": "base_word",
    "vietnamese": "Vóc dáng cơ thể",
    "english": "Physique",
    "partOfSpeech": "n",
    "sourceRow": 1
  }],
  "reviewNotes": []
}
```

- `source` là metadata xuất xứ tùy chọn, không chứa PDF. Không ảnh hưởng logic học.
- `acceptedAnswers` là trường tùy chọn `string[]` không rỗng, mỗi chuỗi phải có nội dung. Khi được khai báo, luyện gõ chấp nhận thêm các đáp án này bên cạnh `english`. Không suy đoán đồng nghĩa hay tách dấu `/`. Dữ liệu Unit hiện có chưa thêm trường này và không bị sửa.
- `category`: `base_word`, `word_family`, `synonym`, `collocation`.
- `partOfSpeech`: `n`, `v`, `adj`, `adv`, `v/adj`, `n/adj`, `adj/n`, `v/n`, `n/v`, `n.pl`, `phr.v` hoặc `null`. Giữ thứ tự và loại từ nguồn. `n/v` khớp cả danh từ và động từ; `phr.v` khớp bộ lọc động từ. `null` khi PDF không ghi, không tự suy diễn.
- `section` phải khớp ID chủ đề trong manifest; `unitId` phải khớp Unit được chọn.
- `sourceRow` là STT hàng gốc, số nguyên dương. Với Unit 2: 1–50, không đánh số lại theo trang.
- ID mỗi thẻ gồm namespace Unit, hàng nguồn, category và thứ tự mục trong ô. Không dùng index của toàn bộ bộ thẻ, timestamp hoặc random. Khi sửa bản dịch, giữ ID cũ. Nếu thêm mục vào ô, cấp hậu tố mới, không đánh lại ID các mục cũ.
- Một từ xuất hiện ở các hàng/nhóm khác nhau vẫn giữ ngữ cảnh nguồn và ID riêng; không tự gộp mất thông tin.
- `reviewNotes`: mảng `{ sourceRow, category, original, reason }`; ghi chú nội bộ áp dụng cho các thẻ cùng hàng và category, chỉ quản lý trong dữ liệu/tài liệu đối chiếu, không render trên giao diện người học. Giữ nguyên ô gốc ở `original`. Ghi chú không phải từ vựng bổ sung; chưa xây công cụ Admin.
- Mỗi file xuất bản cần ít nhất một thẻ hợp lệ. ID không được trùng. Thiếu trường bắt buộc, category/POS lạ, ID hoặc chủ đề không khớp sẽ bị từ chối. JSON bị lỗi/HTTP lỗi được hiển thị thành thông báo; không rơi về bộ demo.

## Mở rộng Unit

1. Đọc PDF nguồn và kiểm tra các ô; giữ bản ghi hàng nguồn riêng phục vụ đối chiếu.
2. Xuất JSON theo schema, tách từ khi xác định được nghĩa; giữ nghĩa chung từ nguồn và đánh dấu rà soát khi chưa có bản dịch riêng.
3. Kiểm tra ID ổn định, đầy đủ hàng, nhóm, category, nghĩa, POS và ghi chú.
4. Thêm file vào `public/data/units/`, đăng ký Unit trong manifest sau khi kiểm tra.
5. Build và kiểm thử `/study/<id>`, dữ liệu đầu/cuối và các nhánh lỗi trước khi deploy.

Luồng Upload → Trích xuất → Kiểm tra → Xuất JSON chỉ được chuẩn bị bằng format này; chưa xây công cụ upload. Các file demo cũ trong `src/data/flashcards.json` và `src/data/units.json` được giữ nguyên, không dùng làm nguồn học/xuất bản. Từ Bước 5, trang thống kê sử dụng trạng thái học riêng từ LocalStorage; xem [progress-storage.md](progress-storage.md).

`scripts/import-unit2.py` tái tạo dữ liệu từ bản chép đã đối chiếu cả 6 trang, không phải trình trích xuất PDF tổng quát. Script giữ các Unit khác trong manifest nếu đã có, chỉ thay thế bản ghi Unit 2. Không chạy lại script sau khi chỉnh sửa JSON thủ công mà chưa cập nhật bản chép tương ứng.

Unit 3 có ID ổn định `unit3`, file `data/units/unit3.json`, thẻ `unit3-rNNN-category-NN`. `scripts/import-unit3.py` tái tạo riêng JSON Unit 3 và bản đối chiếu 50 hàng; không ghi Unit 2, manifest hoặc tiến độ. Hai Unit có từ giống nhau vẫn dùng ID và tiến độ riêng. Xem [báo cáo Unit 3](unit3-report.md).
