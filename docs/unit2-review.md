# Đối chiếu Unit2.pdf

Nguồn: `C:/Users/Admin/Downloads/Unit2.pdf`, 6 trang, 50 hàng. SHA-256:
`09AFBAE9DBA1EF1D1B58D52305184CD25CA615A5639C8BD323720DC8D14FCB1E`.

Đã trích xuất text và xem bản render của toàn bộ 6 trang. Text có một số lỗi ghép từ/khoảng trắng; bản chép được đối chiếu trực quan trước khi xuất JSON. Không sao chép PDF vào bản build.

| Phần | Hàng | Base word | Word family | Synonym | Collocation | Tổng |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A | 1–13 | 13 | 13 | 18 | 13 | 57 |
| B | 14–26 | 13 | 13 | 17 | 13 | 56 |
| C | 27–38 | 12 | 12 | 19 | 12 | 55 |
| D | 39–50 | 12 | 12 | 19 | 12 | 55 |
| Tổng | 1–50 | 50 | 50 | 73 | 50 | 223 |

PDF ghi 52/52/48/48 từ/cụm theo 4 ô/hàng, tổng 200 ô. Sau khi tách 23 ô có hai mục đồng nghĩa, bộ dữ liệu có 223 flashcard. Mỗi thẻ tương ứng một từ/cụm; một từ có nhiều loại từ vẫn nằm trên một thẻ. 50 collocation không được ghi loại từ nên có `partOfSpeech: null`.

Nghĩa và loại từ được giữ theo nguồn, kể cả dấu hiệu sai trong nguồn. Các mục dưới đây đã tích hợp với cờ rà soát theo `reviewNotes`; chưa khẳng định bản dịch là chính xác về học thuật. Khi nguồn chỉ cho một nghĩa chung cho hai từ, mỗi thẻ giữ nguyên nghĩa chung và có ghi chú, không tự tạo bản dịch riêng.

## 19 mục nguồn cần rà soát

| Hàng | Category | Mục nguồn | Vấn đề / cách giữ dữ liệu |
| ---: | --- | --- | --- |
| 1 | synonym | Build / Constitution | Nghĩa dùng dấu phẩy; tách theo thứ tự Thể hình / thể trạng, cần duyệt ánh xạ. |
| 5 | synonym | Anabolism/Catabolism | Nguồn viết Đồng/Dị hóa; triển khai phần viết tắt thành Đồng hóa / Dị hóa. |
| 6 | base_word | Anatomy | Nguồn in “Giải ph học”; giữ nguyên lỗi nghi vấn, không tự sửa. |
| 12 | synonym | Sturdy / Hardiness | POS adj/n tách theo thứ tự; giữ Cứng cáp / bền bỉ, cần duyệt nghĩa Hardiness. |
| 19 | synonym | Minor illness / Malady | Giữ ánh xạ Bệnh nhẹ / Cơn đau; cần duyệt nghĩa Malady trong nguồn. |
| 23 | synonym | Detection / Identification | Hai mục dùng chung “Sự phát hiện”. |
| 24 | synonym | Treatment / Remedy | Hai mục dùng chung “Phương pháp chữa trị”. |
| 28 | word_family | Intellectual | Nguồn ghi adj/n và “Thuộc trí tuệ / Tri thức”; giữ nguyên, cần duyệt nghĩa danh từ. |
| 32 | synonym | Logic / Rationale | Hai mục dùng chung “Lập luận logic”. |
| 33 | synonym | Capability / Power | Hai mục dùng chung “Năng lực”. |
| 34 | synonym | Provoke / Spur | Nghĩa dùng dấu phẩy; tách theo thứ tự Kích thích / thúc đẩy, cần duyệt ánh xạ. |
| 36 | synonym | Memory / Recollection | Hai mục dùng chung “Trí nhớ”. |
| 41 | synonym | Toughness / Bouncing back | Hai mục giữ POS n và nghĩa chung “Sự dai sức”; cần duyệt riêng. |
| 44 | synonym | Apprehension / Distress | Hai mục dùng chung “Sự sợ hãi lo âu”. |
| 45 | synonym | Managing / Handling | Giữ POS v và nghĩa chung “Xử lý, quản lý”, không tự đảo/tách bản dịch. |
| 46 | synonym | Constraint / Restraint | Hai mục dùng chung “Sự kìm hãm”. |
| 47 | synonym | Self-esteem / Pride | Hai mục dùng chung “Lòng tự trọng”. |
| 48 | synonym | Isolation / Estrangement | Hai mục dùng chung “Sự cô lập”. |
| 50 | synonym | Composure / Serenity | Hai mục dùng chung “Sự tĩnh tâm”. |

Đối chiếu từng ô: [unit2-source-rows.json](unit2-source-rows.json). Số lượng máy đếm: [unit2-counts.json](unit2-counts.json). `reviewNotes.original` giữ chuỗi nguồn cho từng mục nghi vấn; UI hiển thị lời nhắc tại các thẻ tương ứng.
