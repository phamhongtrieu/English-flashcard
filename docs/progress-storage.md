# Tiến độ học — phiên bản 1

Mỗi thẻ có `new`, `known` hoặc `learning`. Không có record tương ứng nghĩa là `new`. Dữ liệu học tách hoàn toàn khỏi JSON từ vựng, chỉ lưu trên trình duyệt/profile hiện tại.

## Định dạng LocalStorage

Namespace có version: `english-flashcard-progress-v1`.

Mỗi cặp Unit ID / Flashcard ID có **một key riêng**:

```text
english-flashcard-progress-v1:<encodeURIComponent(unitId)>:<encodeURIComponent(cardId)>
```

Ví dụ:

```text
english-flashcard-progress-v1:unit-2:unit-2-r001-base-word-01
```

Giá trị:

```json
{ "version": 1, "status": "known" }
```

Không lưu nghĩa, từ tiếng Anh, thông tin Unit, thứ tự trộn, bộ lọc, mặt thẻ hoặc animation. Thao tác đánh giá chỉ gọi `setItem` cho đúng record đang sửa, không serialize/ghi đè toàn bộ tiến độ. Các record Unit/thẻ khác giữ nguyên; các tab khác nhận sự kiện `storage` để cập nhật record tương ứng. Trường hợp cùng một thẻ được cập nhật đồng thời ở hai tab, lần ghi cuối có hiệu lực.

Lúc khởi tạo, ứng dụng đọc các key thuộc namespace, kiểm tra ID và JSON/version/status. Record không hợp lệ bị bỏ qua và có thông báo; không xóa hoặc ghi lại toàn bộ storage. Thẻ không có record hợp lệ được xem là chưa học. Record không còn xuất hiện trong JSON hiện tại không được tính vào thống kê, cũng không tự bị xóa.

Ứng dụng thử quyền ghi bằng key `english-flashcard-progress-v1:probe` rồi xóa key kiểm tra này. Nếu đọc/ghi bị chặn hoặc quota đầy, vẫn giữ tiến độ đã đọc được và các đánh giá mới trong bộ nhớ phiên, đồng thời báo không thể lưu. Khi reload, các đánh giá chưa lưu sẽ mất. Thao tác ghi sau đó thành công chỉ lưu record được đánh giá; cảnh báo vẫn giữ nếu còn record khác chưa lưu. Khi đánh giá lại thành công các thẻ chưa lưu, cảnh báo được gỡ.

Key demo cũ `ef-progress-v1` không bị sửa/xóa và không tự chuyển đổi sang dữ liệu thật: các ID demo cũ khác ID PDF ổn định đang sử dụng. Không tự gán lại tiến độ demo thành tiến độ thật.

## Luồng học

- Nút Đã thuộc / Chưa thuộc xuất hiện sau khi mặt tiếng Anh lật xong; không cho đánh dấu mặt trước.
- Chọn known/learning ghi record ngay, chuyển sang ID kế tiếp của lượt hiện tại và trở về tiếng Việt. Focus được chuyển về thẻ tiếp theo cho bàn phím.
- Đánh dấu ở thẻ cuối mở màn hình hoàn thành, không tạo index vượt danh sách. Hoàn thành lượt không đồng nghĩa toàn Unit đã thuộc.
- Chế độ Tất cả cho phép quay về thẻ cũ hoặc học lại lượt để thay đổi đánh giá.
- Tiếp tục học chỉ lấy thẻ `new`; Ôn tập từ chưa thuộc chỉ lấy `learning`. Cả hai kết hợp bộ lọc và trộn hiện có.
- Hàng đợi giữ thứ tự của lượt. ID tiếp theo được chọn trước khi trạng thái hiện tại làm danh sách thu ngắn. Thẻ không còn đúng chế độ được loại ra mà không bỏ qua thẻ kế tiếp; thẻ learning vẫn còn trong dữ liệu để ôn ở lượt sau.
- Bắt đầu lại lượt sẽ nạp lại trạng thái hiện tại với bộ lọc/chế độ/trộn đang chọn. Bộ lọc/chế độ thay đổi bắt đầu từ mặt Việt/thẻ đầu. URL `?mode=new` hoặc `?mode=learning` mở đúng chế độ từ trang chủ/thống kê.

## Thống kê

Thống kê tổng hợp và từng Unit chỉ lấy các thẻ trong JSON đã được kiểm tra hợp lệ. `Chưa học = tổng - known - learning`; tỷ lệ đã thuộc `known / tổng × 100`, làm tròn hai chữ số thập phân; tổng bằng 0 trả về 0%.

Trang chủ và danh sách Unit có tiến độ thật và đường dẫn tiếp tục học thẻ mới. Trang thống kê không dùng số liệu demo. Unit rỗng vẫn bị loader hiện tại từ chối xuất bản; hiển thị lỗi an toàn, tổng hợp các Unit hợp lệ còn lại và không chia cho 0 khi catalog rỗng.
