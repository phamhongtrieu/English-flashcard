"""Private approval report only. Never writes learning data or approves a question.

The row-keyed editorial notes and anchor sense inventories below were reviewed
against the actual source records. Pair filtering is a conservative aid, not a
proof that all senses in every dialect have been exhaustively enumerated.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import itertools
import json
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports/toeic-bulk-review'
LABELS = {'R': 'Đủ căn cứ để đề nghị duyệt', 'C': 'Cần sửa nội dung',
          'M': 'Cần quản trị viên quyết định'}

# Explicit question-by-question wording; these are REPORT suggestions, not a
# replacement vocabulary collection. Source rows + English are checked below.
PROMPTS = '''
2|basis|Cơ sở, căn cứ cho một quyết định
3|benefit|Lợi ích
4|compensate|Bồi thường thiệt hại
5|delicately|Một cách tế nhị
6|eligible|Đủ tư cách, đủ điều kiện
7|flexibly|Một cách linh hoạt
8|negotiate|Thương lượng để đạt thỏa thuận
9|retire|Nghỉ hưu
10|vested|Đã được bảo đảm quyền hưởng lợi ích hưu trí
11|wage|Tiền công trả cho công việc
12|be aware of|Biết, nhận thức về điều gì
13|raise|Nâng lên, tăng lên
15|circumstance|Hoàn cảnh, tình huống
16|condition|Tình trạng của một vật
18|fluctuate|Dao động, thay đổi lên xuống
19|get out of|Rời khỏi một khu vực
20|indicator|Dấu hiệu, chỉ báo về một tình trạng
21|lease|Hợp đồng cho thuê tài sản
22|lock into|Ràng buộc vào một lựa chọn khó thay đổi
23|occupy|Chiếm, sử dụng một không gian
24|option|Một lựa chọn
25|subject to|Chịu sự chi phối của
27|conform|Tuân theo, phù hợp với tiêu chuẩn
28|defect|Lỗi, khuyết tật của sản phẩm
29|enhance|Nâng cao, cải thiện
30|garment|Một món quần áo
31|inspect|Kiểm tra kỹ
32|perceptive|Nhạy bén trong nhận biết và thấu hiểu
33|repel|Làm người khác chán ghét, muốn tránh xa
34|take back|Mang trả lại
35|throw out|Đuổi ra ngoài
36|uniformly|Một cách đồng đều, nhất quán
37|wrinkle|Nếp nhăn trên bề mặt
39|allow|Cho phép
40|alternative|Có thể dùng thay thế
41|aspect|Khía cạnh
42|concern|Mối lo ngại
43|emphasize|Nhấn mạnh
44|incur|Phải chịu một khoản chi phí
45|personnel|Đội ngũ nhân viên
46|policy|Hợp đồng bảo hiểm
48|regardless|Bất chấp, không phụ thuộc vào
49|salary|Tiền lương định kỳ
50|suit|Phù hợp với nhu cầu
52|as needed|Khi cần thiết
53|be in charge of|Chịu trách nhiệm quản lý
54|capacity|Sức chứa
55|durable|Bền, dùng được lâu
56|initiative|Sự chủ động khởi xướng một việc
57|physically|Về mặt thể chất
58|provider|Nhà cung cấp
59|recur|Tái diễn
60|reduction|Sự giảm bớt
61|stay on top of|Theo sát, nắm thông tin mới nhất
62|stock|Trữ, bổ sung hàng hóa
63|conduct|Tiến hành một hoạt động
64|generate|Tạo ra
66|keep up with|Theo kịp
67|look up to|Kính trọng, ngưỡng mộ
68|mentor|Người hướng dẫn có kinh nghiệm
70|reject|Sản phẩm bị loại
71|set up|Sắp xếp, thiết lập
72|success|Sự thành công
73|training|Sự đào tạo, huấn luyện
74|update|Cập nhật thông tin
75|diversify|Đa dạng hóa
76|enterprise|Doanh nghiệp
77|essentially|Về cơ bản
78|everyday|Thường ngày, thông thường
79|function|Chức năng
80|maintain|Duy trì
81|obtain|Đạt được, có được
83|quality|Chất lượng
84|smooth|Hòa nhã, khéo léo trong giao tiếp
85|source|Nguồn cung cấp
86|stationery|Văn phòng phẩm
88|attract|Thu hút
89|compare|So sánh
90|competition|Cuộc thi
91|consume|Tiêu thụ
92|convince|Thuyết phục, làm ai tin điều gì
93|currently|Hiện tại, lúc này
94|fad|Mốt nhất thời
95|inspiration|Cảm hứng
96|market|Chợ, nơi mua bán
97|persuasion|Sự thuyết phục
98|productive|Mang lại kết quả, có hiệu quả
99|satisfaction|Sự hài lòng
100|calculation|Sự tính toán
101|deadline|Thời hạn chót
102|file|Sắp xếp, lưu hồ sơ
103|fill out|Điền đầy đủ vào biểu mẫu
104|give up|Từ bỏ, ngừng cố gắng
105|joint|Chung, cùng sở hữu
106|owe|Nợ một khoản tiền
107|penalty|Khoản tiền phạt
108|preparation|Sự chuẩn bị
109|refund|Khoản tiền được hoàn lại
110|spouse|Vợ hoặc chồng
111|withhold|Giữ lại, không cung cấp
113|acquire|Có được, tích lũy được
114|admire|Ngưỡng mộ
115|collection|Bộ sưu tập
116|criticism|Sự phê bình, nhận xét
117|express|Diễn đạt, bộc lộ
119|leisure|Thời gian nhàn rỗi
120|respond|Đáp lại, phản hồi
121|schedule|Lịch trình, chương trình
122|significant|Đáng kể
123|specialize|Chuyên về một lĩnh vực
125|busy|Bận rộn
126|coincide|Xảy ra trùng thời điểm
127|confusion|Sự nhầm lẫn, bối rối
128|contact|Liên hệ với
129|disappoint|Làm thất vọng
130|intend|Có ý định
131|license|Giấy phép
133|optional|Không bắt buộc
134|tempt|Cám dỗ, khiến ai muốn làm
135|thrill|Cảm giác phấn khích
136|tier|Cấp, hạng trong một hệ thống
137|basis|Cơ sở, căn cứ
138|complete|Hoàn thành
139|excite|Làm hào hứng, phấn khích
140|flavor|Hương vị
141|forget|Quên
142|ingredient|Nguyên liệu làm món ăn
143|judge|Phán xét, đánh giá
144|mix-up|Sự nhầm lẫn, lộn xộn
145|patron|Khách hàng quen
146|predict|Dự đoán điều sẽ xảy ra
147|randomly|Một cách ngẫu nhiên
148|remind|Nhắc nhở
149|ability|Khả năng làm việc gì
150|apply|Nộp đơn ứng tuyển
151|background|Nền tảng kiến thức, kinh nghiệm
152|be ready for|Sẵn sàng cho
153|call in|Mời, gọi ai đến
154|confidence|Sự tin tưởng
156|expert|Chuyên gia
157|follow up|Thực hiện bước tiếp theo sau một việc
158|hesitant|Do dự, lưỡng lự
159|present|Trình bày, đưa ra
160|weakly|Một cách yếu ớt
161|adjacent|Liền kề, sát cạnh
162|collaboration|Sự hợp tác
163|concentrate|Tập trung chú ý
164|conducive|Tạo điều kiện thuận lợi cho
165|disruption|Sự gián đoạn
166|hamper|Cản trở
167|inconsiderately|Một cách thiếu suy xét, thiếu thận trọng
168|lobby|Sảnh chờ ở lối vào
169|move up|Thăng tiến
170|open to|Có thể phải chịu sự chỉ trích hoặc kiểm tra
171|opt|Lựa chọn
172|scrutiny|Sự xem xét kỹ lưỡng
173|appreciation|Sự cảm kích, biết ơn
174|be made of|Được làm bằng một vật liệu
175|bring in|Đưa, tuyển người vào làm
176|casually|Một cách không trang trọng
177|code|Bộ quy tắc
178|expose|Bộc lộ, phơi bày
179|glimpse|Cái nhìn lướt qua
180|out of|Hết, không còn một thứ gì
181|outdated|Lỗi thời, không còn cập nhật
182|practice|Thực hành, luyện tập
183|reinforce|Tăng cường, củng cố
184|verbally|Bằng lời nói
186|attainment|Sự đạt được mục tiêu
187|combine|Kết hợp
188|continue|Tiếp tục
189|description|Sự mô tả
190|disperse|Giải tán, làm phân tán
191|entertainment|Sự giải trí
192|influence|Gây ảnh hưởng đến
193|range|Phạm vi
194|release|Phát hành sản phẩm
195|representation|Sự thể hiện, mô tả
196|separately|Một cách riêng biệt
197|successive|Kế tiếp, liên tiếp
198|accustom to|Làm cho quen với
199|apprentice|Người học việc
201|demand|Nhu cầu
202|incorporate|Đưa vào thành một phần của tổng thể
203|influx|Sự đổ vào với số lượng lớn
204|method|Phương pháp, cách thức
205|outlet|Lối thoát ra
206|profession|Nghề nghiệp chuyên môn
207|relinquish|Từ bỏ quyền nắm giữ
208|theme|Đề tài, chủ đề
209|draw|Thu hút, lôi cuốn
210|access|Quyền, khả năng truy cập
211|allocate|Phân bổ nguồn lực
212|compatible|Tương thích, hợp nhau
213|delete|Xóa dữ liệu
214|display|Hiển thị
215|duplicate|Sao chép, tạo bản giống
216|failure|Sự thất bại
217|figure out|Tìm ra, hiểu ra
218|ignore|Bỏ qua, phớt lờ
219|search|Cuộc tìm kiếm
220|shut down|Tắt máy, ngừng hoạt động
221|warning|Sự cảnh báo
223|accommodate|Đáp ứng nhu cầu
224|arrangement|Sự sắp xếp
225|association|Hiệp hội
226|attend|Tham dự, có mặt
227|get in touch|Liên lạc
228|hold|Chứa được
229|location|Vị trí, địa điểm
230|overcrowded|Chật ních người
231|register|Đăng ký
232|select|Chọn lựa
233|session|Buổi họp, phiên họp
234|take part in|Tham gia
235|characteristic|Đặc điểm
236|consequence|Kết quả, hậu quả
237|consider|Coi là, xem như
238|cover|Che, phủ
239|expiration|Sự hết hạn
240|frequently|Thường xuyên
241|imply|Ngụ ý, hàm ý
242|promise|Hứa hẹn
243|protect|Bảo vệ
244|reputation|Danh tiếng
245|require|Đòi hỏi, yêu cầu
246|variety|Sự đa dạng
247|anxious|Lo lắng, băn khoăn
248|ascertain|Xác định cho chắc chắn
249|assume|Đảm đương, gánh vác trách nhiệm
250|examine|Khảo sát, xem xét kỹ
251|decade|Khoảng mười năm
252|experiment|Cuộc thí nghiệm
253|logical|Hợp lô-gic, hợp lý
254|research|Nghiên cứu
255|responsibility|Trách nhiệm, bổn phận
256|solve|Giải quyết một vấn đề
257|supervisor|Người giám sát
258|systematically|Một cách có hệ thống
259|aware|Có nhận thức, biết về điều gì
260|catch up|Làm bù cho kịp công việc tồn đọng
261|distraction|Điều làm chuyển hướng chú ý
262|encouragement|Sự động viên, khuyến khích
263|evident|Hiển nhiên, rõ ràng
264|habit|Thói quen
265|illuminate|Chiếu sáng
266|irritate|Làm kích ứng, làm rát
268|position|Vị trí công việc
269|regularly|Một cách đều đặn
270|restore|Khôi phục lại
271|adhere to|Tuân thủ
272|agenda|Chương trình nghị sự
273|bring up|Đưa ra, làm xuất hiện trên màn hình
274|conclude|Đi đến kết luận
275|go ahead|Sự cho phép tiến hành
276|goal|Mục tiêu
277|lengthy|Kéo dài, dài dòng
278|matter|Vấn đề, chuyện
279|periodically|Theo định kỳ
280|priority|Điều được ưu tiên
281|progress|Sự tiến triển
282|waste|Lãng phí
284|assignment|Sự phân công, giao việc
285|choose|Chọn lựa
287|constitute|Cấu thành, tạo thành
288|decision|Quyết định
289|disseminate|Phổ biến thông tin rộng rãi
290|impact|Sự tác động mạnh
291|in-depth|Chuyên sâu, chi tiết
292|investigate|Điều tra, tìm hiểu
293|link|Mối liên hệ
294|subscribe|Đăng ký sử dụng hoặc nhận định kỳ
295|thorough|Kỹ lưỡng, tỉ mỉ
297|admit|Thừa nhận
298|authorize|Ủy quyền, cho phép
299|designate|Chỉ định một nơi cho mục đích cụ thể
301|identify|Nhận diện, xác định
302|mission|Sứ mệnh, nhiệm vụ
303|permit|Cho phép
304|pertinent|Có liên quan đến vấn đề đang xét
305|procedure|Thủ tục, các bước tiến hành
306|result|Kết quả
307|statement|Bản sao kê tài khoản
308|usually|Thông thường, trong phần lớn trường hợp
310|accountant|Kế toán viên
311|accumulate|Tích lũy, gom góp
312|asset|Tài sản
313|audit|Kiểm toán
314|budget|Ngân sách
315|build up|Xây dựng dần lên
316|client|Khách hàng sử dụng dịch vụ
317|debt|Khoản nợ
318|outstanding|Chưa thanh toán, còn nợ
319|profitably|Một cách có sinh lời
320|reconcile|Đối chiếu để làm cho số liệu khớp nhau
321|turnover|Doanh thu bán hàng trong một kỳ
322|assemble|Tập hợp lại
323|beforehand|Trước đó, trước khi một việc diễn ra
324|complication|Biến chứng, vấn đề phát sinh gây khó khăn
325|courier|Người chuyển phát
326|express|Nhanh, hỏa tốc
327|fold|Gấp lại
328|layout|Cách bố trí trên trang giấy
330|petition|Đơn kiến nghị
331|proof|Bằng chứng
332|register|Đăng ký
333|revise|Xem lại và chỉnh sửa
334|burden|Gánh nặng
335|commonly|Một cách phổ biến, thông thường
336|delivery|Sự giao hàng
337|elegance|Sự thanh lịch, tao nhã
338|fall to|Trở thành trách nhiệm của
339|impress|Gây ấn tượng
340|individual|Riêng từng người, từng thứ
341|list|Danh sách
342|multiple|Gồm nhiều phần, nhiều người
343|narrow|Thu hẹp
344|pick up|Đón ai đó
345|settle|Giải quyết, dàn xếp
346|deal with|Xử lý, đối phó với
347|destination|Điểm đến
348|distinguish|Phân biệt
349|economize|Tiết kiệm, giảm chi
350|equivalent|Tương đương
351|excursion|Chuyến tham quan ngắn
352|expense|Chi phí
353|extend|Kéo dài, mở rộng
354|prospective|Có khả năng trở thành trong tương lai
355|situation|Tình hình
356|substantially|Một cách đáng kể
357|system|Hệ thống
358|accurately|Một cách chính xác
359|carrier|Người hoặc đơn vị vận chuyển
360|fulfill|Thực hiện trọn vẹn một cam kết
361|catalog|Phân loại, ghi thành danh mục
362|integral|Thiết yếu, không thể thiếu trong tổng thể
363|minimize|Giảm đến mức thấp nhất
364|inventory|Sự kiểm kê hàng hóa
365|on hand|Có sẵn để sử dụng
366|remember|Nhớ
367|ship|Gửi, vận chuyển hàng
368|sufficiently|Ở mức đủ
369|supply|Nguồn hàng dự trữ để sử dụng
370|action|Hành động
371|approach|Tiến lại gần
372|audience|Khán giả
373|creative|Có khả năng sáng tạo
374|dialogue|Cuộc đối thoại
375|element|Yếu tố cấu thành
376|experience|Kinh nghiệm
377|occur|Xảy ra
378|perform|Biểu diễn
379|rehearse|Diễn tập
380|review|Bài đánh giá
381|sell out|Bán hết vé, hết hàng
383|appointment|Cuộc hẹn
384|assess|Đánh giá, ước lượng
386|effective|Có hiệu quả, có tác dụng
387|instrument|Dụng cụ
389|prevent|Ngăn ngừa
390|recommendation|Lời khuyên, đề nghị
391|record|Hồ sơ, bản ghi
392|refer|Đề cập đến
393|serious|Nghiêm túc
395|assist|Giúp đỡ
396|coordinate|Phối hợp các hoạt động
397|dimension|Kích thước
399|general|Chung, tổng quát
400|ideally|Trong điều kiện lý tưởng
401|lead time|Thời gian từ lúc bắt đầu đến khi hoàn thành một quá trình
402|plan|Kế hoạch
404|regulate|Điều chỉnh, kiểm soát theo quy định
405|site|Địa điểm
407|abundant|Dồi dào, phong phú
408|accomplishment|Thành tựu
409|bring together|Tập hợp người lại với nhau
410|candidate|Ứng viên
411|come up with|Nghĩ ra, đưa ra một ý tưởng
412|commensurate|Tương xứng với
413|match|Người ngang tài ngang sức
414|profile|Bản mô tả các đặc điểm chính
415|qualification|Trình độ, năng lực đáp ứng yêu cầu công việc
416|recruit|Nhân viên hoặc thành viên mới
417|submit|Nộp, đệ trình
418|time-consuming|Tốn nhiều thời gian
419|agent|Đại lý, người đại diện
420|announcement|Thông báo
421|beverage|Đồ uống
422|blanket|Phủ kín lên
423|board|Lên tàu, máy bay
424|claim|Tự nhận, khẳng định là
425|delay|Trì hoãn
426|depart|Khởi hành, rời đi
427|embarkation|Việc lên tàu, máy bay để khởi hành
428|itinerary|Lộ trình chuyến đi
429|prohibit|Cấm
430|valid|Có hiệu lực
432|bargain|Món hàng mua được với giá hời
433|bear|Chịu đựng
434|behaviour|Hành vi, cách cư xử
435|checkout|Quầy thanh toán
436|comfort|Sự thoải mái
437|expand|Mở rộng
438|explore|Khám phá, thăm dò
439|item|Một món hàng
440|mandatory|Bắt buộc
441|merchandise|Hàng hóa
442|strictly|Một cách nghiêm ngặt
443|trend|Xu hướng
444|charge|Tính phí
445|compile|Tập hợp, biên soạn thông tin
446|customer|Khách mua hàng hoặc dịch vụ
447|discount|Sự giảm giá
448|efficient|Làm việc hiệu quả, ít lãng phí nguồn lực
449|estimate|Ước lượng
450|impose|Áp đặt một khoản phải chịu
451|mistake|Sai lầm
452|order|Đơn đặt hàng
453|promptly|Một cách nhanh chóng, không chậm trễ
454|rectify|Sửa cho đúng
455|terms|Các điều kiện, điều khoản
457|available|Có sẵn để dùng
458|broaden|Mở rộng
459|category|Loại, nhóm phân loại
460|disparate|Khác biệt rõ rệt
461|divide|Chia, tách ra
462|favor|Ưa thích, thiên về
463|instinct|Bản năng
464|prefer|Thích hơn
465|reason|Lý do
466|relaxation|Sự thư giãn
467|taste|Sở thích, thị hiếu
468|urge|Thúc giục
470|comprehensive|Toàn diện
471|deluxe|Sang trọng, chất lượng cao
472|directory|Danh bạ, danh sách tra cứu
473|duration|Khoảng thời gian một việc kéo dài
474|entitle|Cho có quyền hưởng một lợi ích
475|fare|Tiền vé vận chuyển hành khách
476|offset|Bù lại một tác động hoặc chi phí
477|operate|Vận hành, hoạt động
478|punctually|Đúng giờ
479|relatively|Một cách tương đối
480|remainder|Phần còn lại
481|remote|Xa xôi, hẻo lánh
482|disk|Đĩa lưu trữ dữ liệu
483|facilitate|Làm cho dễ dàng, thuận tiện hơn
484|network|Kết nối các máy tính thành mạng
485|popularity|Sự phổ biến, được nhiều người ưa thích
486|process|Quá trình
487|replace|Thay thế
488|revolution|Cuộc cách mạng, thay đổi căn bản
489|sharp|Thông minh, nhạy bén
490|skill|Kỹ năng
491|software|Phần mềm máy tính
492|store|Lưu giữ, tích trữ
493|technically|Xét về mặt kỹ thuật
495|advanced|Tiên tiến
496|chain|Chuỗi cơ sở kinh doanh cùng hệ thống
497|check-in|Việc làm thủ tục nhận phòng
498|confirm|Xác nhận
499|expect|Mong đợi
500|housekeeper|Người quản gia, trông coi nhà cửa
501|notify|Thông báo cho ai biết
502|preclude|Ngăn cản, khiến không thể xảy ra
503|quote|Trích dẫn
504|rate|Mức giá
505|reservation|Sự đặt chỗ trước
506|service|Dịch vụ
507|accept|Nhận, chấp nhận
508|balance|Đối chiếu, cân đối thu chi
509|borrow|Mượn, vay
510|cautiously|Một cách thận trọng
511|deduct|Khấu trừ
512|dividend|Cổ tức
513|down payment|Khoản tiền trả trước ban đầu
515|restricted|Bị hạn chế
516|signature|Chữ ký
517|take out|Rút tiền
518|transaction|Giao dịch
520|aggressively|Một cách hung hăng
521|attitude|Thái độ
522|commit|Dành, giao một khoản tiền cho mục đích cụ thể
523|conservative|Bảo thủ
524|fund|Quỹ tiền cho một mục đích
525|invest|Đầu tư
526|long-term|Dài hạn
527|portfolio|Danh mục đầu tư
528|pull-out|Sự rút lui, rút khỏi
529|resource|Nguồn lực
530|return|Lợi nhuận thu được từ đầu tư
531|wisely|Một cách khôn ngoan, sáng suốt
533|abide by|Tuân theo
534|agreement|Thỏa thuận
535|assurance|Sự cam đoan, bảo đảm
536|cancellation|Sự hủy bỏ
537|determine|Xác định
538|engage|Thu hút sự chú ý, lôi cuốn
539|establish|Thành lập, thiết lập
540|obligate|Buộc phải thực hiện theo trách nhiệm
542|provision|Sự dự liệu, chuẩn bị để đáp ứng nhu cầu
543|resolve|Giải quyết
544|specific|Cụ thể, rõ ràng
545|desire|Khao khát, mong muốn
547|forecast|Dự báo
548|level|Cấp độ, trình độ
549|overall|Bao quát toàn bộ
550|perspective|Góc nhìn, quan điểm
552|realistic|Thực tế, sát thực tế
553|target|Mục tiêu
554|translation|Bản dịch
555|typically|Thông thường, trong trường hợp điển hình
556|yield|Sinh lợi
557|appeal|Sức hấp dẫn
558|arrive|Đến nơi
559|compromise|Sự thỏa hiệp
560|daringly|Một cách táo bạo
561|familiar|Quen thuộc
562|guide|Sách hướng dẫn
563|majority|Đa số
564|mix|Hỗn hợp
565|rely|Dựa vào, tin cậy
566|secure|An toàn, yên tâm
567|subjective|Mang tính chủ quan
568|suggestion|Lời gợi ý, đề nghị
569|adjustment|Sự điều chỉnh
570|automatically|Một cách tự động
571|crucial|Có tính quyết định, cốt yếu
572|discrepancy|Sự chênh lệch, không khớp nhau
573|disturb|Làm phiền
574|liability|Điều gây bất lợi, có thể dẫn đến trách nhiệm bồi thường
575|reflection|Hình ảnh phản chiếu
576|run|Vận hành, hoạt động
577|scan|Đọc lướt
578|subtract|Trừ đi
579|tedious|Tẻ nhạt, gây chán
580|verify|Xác minh
581|consult|Hỏi ý kiến
582|control|Điều khiển, chỉ đạo
583|convenient|Thuận tiện
584|detect|Phát hiện
585|factor|Nhân tố, yếu tố
586|interaction|Sự tương tác
588|monitor|Theo dõi, giám sát
589|potential|Có khả năng trở thành trong tương lai
590|sample|Mẫu, mẫu vật
591|sense|Giác quan
592|volunteer|Tình nguyện viên
593|address|Đề cập và giải quyết nhu cầu, vấn đề
594|avoid|Tránh
595|demonstrate|Chứng minh, cho thấy
596|develop|Phát triển
597|evaluate|Đánh giá
598|gather|Thu thập
599|offer|Lời đề nghị
600|primarily|Chủ yếu
601|risk|Nguy cơ, rủi ro
602|strategy|Chiến lược hành động
603|strong|Khỏe, mạnh
604|substitution|Sự thay thế
605|achievement|Thành tựu, thành tích
606|contribute|Đóng góp
607|dedication|Sự tận tâm, cống hiến
608|look forward to|Mong chờ với sự háo hức
609|look to|Trông cậy vào ai để được giúp đỡ
610|loyal|Trung thành
611|merit|Giá trị, thành tích xứng đáng được ghi nhận
612|obviously|Một cách rõ ràng, hiển nhiên
613|productive|Mang lại kết quả, có hiệu quả
614|promote|Thúc đẩy, làm tăng
615|recognition|Sự ghi nhận, công nhận
616|value|Định giá
'''

# C means proposed prompt/POS needs editorial repair; it is not authorization.
# M means retaining a valid source sense versus aligning with another source
# field is a genuine editorial choice. Proposed wording does not decide it.
DECISIONS = {
    10: ('M', 'adj.', 'Nghĩa được trao vẫn hợp lệ nhưng ví dụ nói quyền hưởng hưu trí đã được bảo đảm. Cần chốt phạm vi quyền lợi; không dùng nhầm nghĩa mặc áo gi-lê.'),
    21: ('M', 'n.', 'Giữ nghĩa hợp đồng cho thuê và chọn nhãn n. từ nhãn n,v gốc; ví dụ lại dùng động từ thuê. Cần quyết định chọn danh từ này hay v. thuê theo hợp đồng.'),
    32: ('C', 'adj.', 'Nhận thức được quá chung so với khả năng nhận biết tinh tế của perceptive trong ví dụ. Đề nghị làm rõ độ nhạy bén; không kết luận mọi nghĩa cảm thụ gốc sai.'),
    37: ('C', 'n.', 'Chuỗi gốc chứa vếp/nếp và ký hiệu biên tập. Giữ nghĩa nếp nhăn, chỉ đề nghị sửa phần lỗi gõ trước khi dùng làm prompt.'),
    102: ('M', 'v.', 'Nghĩa sắp xếp hồ sơ vẫn đúng với file; ví dụ/giải thích dùng nộp đơn kiện. Đề nghị giữ nghĩa gốc, quản trị viên chọn phạm vi thay vì âm thầm đổi sang nộp đơn.'),
    170: ('M', 'adj.', 'Cần bổ ngữ để phân biệt có thể chịu chỉ trích với sẵn lòng tiếp nhận hoặc mở cho công chúng. Prompt đề xuất chỉ chọn nghĩa scrutiny/criticism trong ví dụ.'),
    173: ('M', 'n.', 'Sự cảm kích gốc hợp lệ; ví dụ về âm nhạc dùng sự cảm thụ. Đề nghị giữ nghĩa biết ơn; cần quản trị viên quyết định có muốn đổi sang cảm thụ âm nhạc không.'),
    174: ('M', 'v.', 'Nghĩa được làm bằng vật liệu hợp lệ; ví dụ what someone is made of nói bản lĩnh. Giữ nghĩa vật liệu trong đề xuất; chưa quyết định đổi sang thành ngữ hoặc thay câu hỏi.'),
    175: ('C', 'phr. v.', 'Nguồn thiếu loại từ. Cụm bring in trong ví dụ tuyển người là cụm động từ; đề nghị bổ sung nhãn, không sửa nguồn.'),
    180: ('C', 'prep.', 'Out of là giới từ/cụm giới từ; nghĩa hết/không còn phù hợp ví dụ. Đề nghị sửa nhãn adj. trong bản Quiz tương lai; giữ nghĩa gốc.'),
    192: ('M', 'v.', 'Ảnh hưởng là nghĩa động từ hợp lệ theo nhãn v.; ví dụ dùng danh từ. Giữ v. gây ảnh hưởng trong đề xuất; muốn dùng n. sự ảnh hưởng phải được duyệt riêng.'),
    205: ('M', 'n.', 'Lối thoát ra là nghĩa đúng; ví dụ dùng cách giải tỏa/thể hiện sáng tạo. Giữ nghĩa gốc, cần quyết định chọn nghĩa vật lý hay nghĩa bóng. Không dùng exit/release làm nhiễu.'),
    237: ('M', 'v.', 'Xem như là nghĩa hợp lệ; ví dụ consider marrying dùng cân nhắc. Giữ coi là, cần chọn cách hỏi hoặc nghĩa cân nhắc trước khi duyệt.'),
    249: ('M', 'v.', 'Đảm đương là nghĩa hợp lệ; ví dụ assumed that dùng cho rằng. Giữ nghĩa gánh vác, không coi là lỗi bắt buộc đổi; cần chốt ngữ cảnh.'),
    275: ('M', 'n.', 'Nghĩa danh từ sự cho phép đúng, thường viết go-ahead; bản ghi giữ go ahead dễ bị đọc là cụm động từ tiến hành. Không đổi tiếng Anh/ID; cần quyết định cách hiển thị trước khi duyệt.'),
    284: ('M', 'n.', 'Sự giao việc là nghĩa hợp lệ; ví dụ lại nói bài/nhiệm vụ phải nộp. Giữ sự phân công trong đề xuất; cần chọn nghĩa sự giao việc hay nhiệm vụ được giao.'),
    345: ('M', 'v.', 'Giải quyết/dàn xếp gốc hợp lệ; settle the bill trong ví dụ là thanh toán. Giữ nghĩa gốc, cần chốt ngữ cảnh; tránh resolve/solve làm nhiễu.'),
    369: ('C', 'n.', 'Nguồn có ký hiệu sự/đồ/nguồn/_ và cụm tiếp tế cấp chưa rõ. Đề nghị câu ngắn nguồn hàng dự trữ theo ví dụ, không sửa nội dung nguồn.'),
    411: ('C', 'phr. v.', 'Nguồn thiếu loại từ và chuỗi nghĩa trộn ý định (danh từ). Đề nghị cụm động từ nghĩ ra/đưa ra ý tưởng theo ví dụ chiến lược.'),
    413: ('M', 'n.', 'Người ngang tài ngang sức là nghĩa hợp lệ của match; perfect match trong ví dụ có thể là người phù hợp công việc. Giữ nghĩa gốc, cần chọn phạm vi; không đổi mặc định thành sự phù hợp.'),
    500: ('M', 'n.', 'Quản gia/trông coi nhà cửa là nghĩa hợp lệ; trong khách sạn thường chỉ nhân viên dọn phòng. Giữ nghĩa gốc; cần quyết định có chọn nghĩa nghề khách sạn không.'),
    505: ('C', 'n.', 'Nghĩa đặt chỗ trước đúng; chuỗi gốc viết chổ. Đề nghị sửa chính tả thành chỗ trong prompt, không sửa nguồn.'),
    531: ('C', 'adv.', 'Bản nội bộ đã sửa nhãn thành adv. nhưng nghĩa/phiên âm còn giữ để chờ duyệt. Đề nghị nghĩa một cách khôn ngoan; không dùng các tính từ từng trải/uyên bác để hỏi trạng từ. Phiên âm nguồn waɪz thiếu phần -ly, vẫn chưa tự sửa.'),
    543: ('M', 'v.', 'Giải quyết là nghĩa hợp lệ; resolved to trong ví dụ nghĩa quyết tâm/quyết định làm. Giữ giải quyết trong đề xuất, cần chốt phạm vi; không dùng settle/solve làm nhiễu.'),
    608: ('C', 'phr. v.', 'Nguồn thiếu loại từ. Đề nghị cụm động từ mong chờ háo hức; phân biệt sự mong đợi trung tính của expect bằng bộ nhiễu, không đặt hai từ cùng câu.'),
}

CONTEXT_NOTES = {
    5: 'Chọn cách hỏi han tế nhị trong ví dụ; giải thích gốc về dễ vỡ là nét nghĩa khác.',
    7: 'Giữ nghĩa linh hoạt; giải thích gốc có dạng tính từ, không dùng làm nhãn cho trạng từ.',
    20: 'Chọn chỉ báo tình trạng kinh tế trong ví dụ; không giới hạn indicator vào một người chỉ đường.',
    40: 'Chọn nghĩa kế hoạch thay thế. Nghĩa luân phiên cũng được từ điển ghi nhận; không coi toàn bộ nghĩa gốc sai.',
    46: 'Chọn hợp đồng bảo hiểm từ các nghĩa gốc; không đặt insurance contract hoặc agreement làm nhiễu.',
    48: 'Nghĩa bất chấp trong ví dụ đi với of; giữ đầu mục regardless, không tự đổi tiếng Anh.',
    49: 'Lương định kỳ không nhất thiết chỉ trả theo tháng; tránh wage làm nhiễu dù hai ID khác nhau.',
    52: 'As needed là khi cần; không lấy giải thích in need để chuyển thành đang thiếu thốn.',
    56: 'Chọn chủ động khởi xướng trong take the initiative; không nhầm chỉ bước đầu với toàn bộ nghĩa của từ.',
    62: 'Giữ động từ trữ hàng theo nhãn/ví dụ; giải thích có thể dùng stock như danh từ.',
    70: 'Reject là danh từ chỉ sản phẩm bị loại trong ví dụ; không ép sang động từ vì giải thích khác loại từ.',
    84: 'Hòa nhã/lễ độ là nghĩa được ghi nhận; giải thích gốc về bề mặt nhẵn thuộc nét nghĩa khác. Không bắt buộc sửa thành trơn nhẵn.',
    90: 'Giữ nghĩa cuộc thi theo ví dụ; không đổi sang cạnh tranh chỉ do giải thích dùng nghĩa khác.',
    97: 'Giữ sự thuyết phục; không đưa ghi chú so sánh persuade/convince chưa đủ căn cứ vào prompt.',
    98: 'Nghĩa hiệu quả phù hợp cuộc họp; giữ riêng với bản ghi productive khác.',
    109: 'Chọn danh từ khoản hoàn tiền trong nhãn n,v gốc và ví dụ; không phủ nhận refund cũng là động từ.',
    121: 'Giữ danh từ lịch trình; giải thích dùng động từ là cảnh báo phụ trợ.',
    131: 'Giữ danh từ giấy phép theo ví dụ; không chuyển thành v. chỉ do giải thích dùng động từ.',
    135: 'Chọn cảm giác hưng phấn trong ví dụ; không bắt buộc xóa nghĩa rùng rợn/cảm giác mạnh khác.',
    145: 'Chọn khách hàng quen trong ngữ cảnh nhà hàng; nhà bảo trợ vẫn là nghĩa khác hợp lệ.',
    152: 'Thiếu giải thích phụ trợ không làm mất nghĩa sẵn sàng cho, được ví dụ hỗ trợ.',
    157: 'Chọn thực hiện bước tiếp theo sau phỏng vấn; không hiểu bám riết là theo đuổi thể chất. Nhãn v,n có nhiều cách dùng, đề xuất chỉ chọn v.',
    164: 'Có lợi theo nghĩa tạo điều kiện cho một kết quả; prompt bổ nghĩa để tránh quá chung.',
    165: 'Giữ danh từ sự gián đoạn; không lấy giải thích động từ để thay loại từ.',
    167: 'Giữ nghĩa thiếu suy xét/thiếu thận trọng có căn cứ; ví dụ lịch họp còn có sắc thái thiếu quan tâm người khác. Không mặc định thay nghĩa gốc bằng nghĩa khác.',
    181: 'Chọn không còn cập nhật; không dùng expired làm nhiễu do nghĩa hết hạn khác trong chuỗi gốc.',
    182: 'Giữ động từ luyện tập theo ví dụ dù giải thích gốc có thể dùng danh từ.',
    189: 'Chọn sự mô tả; không dùng representation làm nhiễu.',
    195: 'Chọn sự thể hiện/mô tả; không dùng description làm nhiễu.',
    223: 'Làm cho phù hợp được cụ thể hóa thành đáp ứng nhu cầu trong ví dụ; không tự đổi nội dung nguồn.',
    231: 'Giữ nghĩa đăng ký; ví dụ nói gửi thư bảo đảm. Không lặp register ở ID khác trong lựa chọn.',
    235: 'Giữ danh từ đặc điểm theo ví dụ; giải thích dạng tính từ không làm danh từ này sai.',
    260: 'Chọn làm bù giấy tờ tồn đọng, không đồng nhất với luôn theo kịp keep up with.',
    268: 'Vị trí công việc trong ví dụ; không dùng job/post làm nhiễu.',
    269: 'Làm rõ đều đặn; nghĩa thường xuyên gốc vẫn hợp lệ. Tránh frequently/periodically làm nhiễu.',
    273: 'Ví dụ đưa lại menu lên màn hình; không dùng raise/present làm nhiễu cho nghĩa đưa ra.',
    280: 'Ưu tiên điều được coi là quan trọng nhất trong ví dụ; nghĩa quyền ưu tiên gốc không sai.',
    291: 'Chọn chuyên sâu của nội dung báo chí; không dùng thorough làm nhiễu.',
    299: 'Cụ thể hóa chỉ định công dụng của một nơi; giải thích nguồn nói người/đoàn hộ tống có dấu hiệu lẫn escort. Nghĩa/nhãn/ví dụ của designate vẫn dùng được; không nhập giải thích sai vào Quiz.',
    304: 'Nghĩa có liên quan đúng; ngữ pháp câu ví dụ nguồn còn vụng, chưa đưa ví dụ đó vào Quiz.',
    307: 'Chọn bản kê tài khoản từ nghĩa bản kê gốc; statement còn có nghĩa lời phát biểu.',
    320: 'Cụ thể hóa làm khớp số liệu trong kế toán; hòa giải vẫn hợp lệ ở ngữ cảnh khác.',
    324: 'Chọn biến chứng trong ví dụ phẫu thuật; sự rắc rối vẫn là nghĩa rộng hợp lệ.',
    332: 'Giữ ID riêng và nghĩa đăng ký; không dùng register của ID khác làm nhiễu.',
    353: 'Kéo dài tuyến đường trong ví dụ; gia hạn thời gian cũng hợp lệ, không xóa nghĩa nguồn.',
    358: 'Nghĩa trạng từ đúng; phiên âm nguồn có dấu hiệu thuộc accurate, cần duyệt trước khi hiển thị phiên âm.',
    368: 'Nghĩa trạng từ đúng; phiên âm nguồn có dấu hiệu thuộc sufficient, không tự sửa.',
    371: 'Nghĩa tiến lại gần đúng; hình ảnh mặt trời tiến gần trong ví dụ không thích hợp để làm bằng chứng ngữ cảnh kinh doanh.',
    372: 'Danh từ khán giả đúng; cách dùng millions of audiences trong ví dụ cần biên tập nếu dùng lại.',
    395: 'Chọn giúp đỡ trong ví dụ; không tự kết luận có mặt sai ở mọi biến thể, không dùng attend làm nhiễu.',
    401: 'Giữ khoảng từ bắt đầu đến hoàn thành quá trình; không dùng deadline/duration làm nhiễu.',
    419: 'Đại lý/người đại diện trong ngữ cảnh du lịch; không đồng nhất với riêng công ty hoặc cửa hàng.',
    448: 'Làm rõ hiệu quả sử dụng nguồn lực; không dùng effective/productive làm nhiễu dù từ khác chữ.',
    474: 'Làm rõ quyền hưởng lợi ích; không dùng allow/permit/authorize làm nhiễu.',
    489: 'Chọn thông minh trong ví dụ nhân viên; không tự đổi sang sắc nhọn chỉ vì đó là nghĩa thông dụng khác.',
    505: 'Nghĩa đặt chỗ đúng; đề xuất dùng chính tả chỗ thay cho chổ, không sửa nguồn.',
    508: 'Giữ cân đối/quyết toán sổ thu chi; không dùng reconcile làm nhiễu.',
    520: 'Giữ nghĩa hung hăng của cách nói trong ví dụ; phiên âm nguồn có dấu hiệu thuộc aggressive, cần duyệt riêng.',
    522: 'Chọn giao/dành tiền cho đầu tư; không dùng invest/allocate làm nhiễu.',
    528: 'Nhãn n. đúng với pull-out có gạch nối; thêm sự để thể hiện danh từ, không đổi sang động từ pull out.',
    542: 'Chọn sự dự liệu/chuẩn bị cấp dưỡng trong ví dụ; điều khoản vẫn là nghĩa khác hợp lệ của provision.',
    555: 'Chọn thông thường trong ví dụ chi phí; không coi điển hình là sai ở mọi ngữ cảnh.',
    562: 'Chọn sách hướng dẫn theo consult the guide; nghĩa hướng dẫn viên gốc vẫn hợp lệ.',
    564: 'Chọn n. hỗn hợp từ nhãn n,v gốc và ví dụ; không phủ nhận v. trộn.',
    572: 'Nghĩa sự không khớp đúng; cụm two destiny trong ví dụ thiếu rõ ràng, không đưa ví dụ nguồn vào Quiz.',
    574: 'Chọn điều bất lợi/nguy cơ trách nhiệm trong ví dụ bậc trơn; không đổi bắt buộc sang khoản nợ.',
    599: 'Giữ danh từ lời đề nghị theo nhãn và ví dụ; giải thích dùng động từ chỉ là khác loại từ.',
    611: 'Công trạng/phẩm chất xứng đáng trong đánh giá nhân viên; không dùng accomplishment/achievement làm nhiễu.',
    613: 'Giữ bản ghi productive riêng; không gộp với dòng 98 dù ví dụ gần giống nhau.',
}

POS_SELECTION = {109: 'n.', 157: 'v.', 564: 'n.'}

# Four local anchors per lesson, with OTHER senses/parts of speech considered.
# Selecting an anchor does not approve its own question. These concise sense
# notes are our assessment, not copied dictionary definitions or examples.
ANCHORS = '''
149~khả năng, năng lực; không phải sự kiện hay thái độ|427~sự lên tàu/máy bay; không phải vật chứa|379~diễn tập, tập trước một việc hoặc lời nói|133~tùy chọn, không bắt buộc
221~sự cảnh báo, lời báo trước; tính từ mang tính cảnh báo|68~người hướng dẫn kinh nghiệm; động từ hướng dẫn|466~sự thư giãn, nới lỏng một quy định|319~một cách sinh lợi hoặc hữu ích
11~tiền công; động từ tiến hành chiến tranh/chiến dịch|575~ảnh phản chiếu, suy ngẫm, biểu hiện hoặc lời chê|471~sang trọng, cao cấp; trạng từ theo kiểu sang trọng|407~dồi dào, có số lượng lớn
372~khán giả, độc giả, buổi tiếp kiến|441~hàng hóa; động từ buôn bán/quảng bá hàng|592~người tình nguyện; động từ tự nguyện làm, đưa thông tin|358~một cách chính xác
337~sự tao nhã, tính thanh lịch, tính gọn đẹp|96~chợ, thị trường; động từ tiếp thị/mua bán|461~chia tách, phân chia, chia toán học; danh từ ranh giới|298~cho phép, ủy quyền chính thức
191~sự giải trí, tiết mục giải trí, sự tiếp đãi|115~bộ sưu tập, sự thu gom, khoản quyên góp, đòi nợ|55~bền lâu; danh từ số nhiều chỉ hàng lâu bền|611~giá trị/công trạng; động từ xứng đáng nhận
416~người mới nhập đội/nghề; động từ tuyển người|473~khoảng thời gian kéo dài|563~đa số, tuổi thành niên, mức hơn phiếu|478~đúng giờ, không chậm trễ
554~bản dịch, sự dịch ngôn ngữ, phép tịnh tiến|244~danh tiếng, điều được biết về ai/vật gì|204~phương pháp, lề lối có hệ thống|161~liền kề, gần bên
518~giao dịch, việc thực hiện một nghiệp vụ|535~cam đoan, sự tự tin, bảo đảm/bảo hiểm|520~hung hăng, quyết liệt, tích cực theo đuổi mục tiêu|391~hồ sơ, kỷ lục, đĩa nhạc; động từ ghi lại
513~khoản trả trước ban đầu, cả nghĩa bóng là phần cam kết đầu tiên|302~sứ mệnh, nhiệm vụ, phái đoàn, cơ sở truyền giáo|73~đào tạo, luyện tập; dạng phân từ của train|132~một cách lo lắng hoặc căng thẳng
168~sảnh chờ, hành lang; nhóm vận động; động từ vận động hành lang|390~lời khuyên, sự đề cử, thư giới thiệu|136~tầng, lớp, hạng; động từ xếp thành tầng|147~một cách ngẫu nhiên
432~món hời, thỏa thuận; động từ mặc cả/thương lượng|529~nguồn lực, tài xoay xở, nguồn hỗ trợ|451~sai lầm; động từ hiểu nhầm, nhận lầm|549~toàn bộ, nói chung; danh từ quần áo bảo hộ
512~cổ tức, phần lợi thu được, số bị chia trong toán|135~phấn khích, rùng mình; động từ làm xúc động/run|615~sự ghi nhận/công nhận, sự nhận ra, sự trân trọng|342~nhiều, gồm nhiều phần; danh từ bội số
252~thí nghiệm; động từ thử nghiệm cách làm|255~trách nhiệm, nghĩa vụ, điều phải chăm lo|430~có hiệu lực, có cơ sở hợp lý|279~theo định kỳ hoặc thỉnh thoảng tái diễn
208~chủ đề, đề tài, giai điệu chủ đạo|465~lý do, lý trí; động từ suy luận/thuyết phục bằng lý lẽ|230~quá đông người, chật chội|293~mối nối, liên hệ, mắt xích; động từ nối kết
310~người làm kế toán|156~chuyên gia; tính từ thành thạo, lão luyện|440~bắt buộc; danh từ bên được ủy trị trong nghĩa chuyên biệt|2~cơ sở, căn cứ, cách tính hoặc nền tảng
504~mức giá, tỷ lệ, tốc độ; động từ đánh giá/xếp hạng|455~điều khoản, quan hệ, cách diễn đạt; dạng của term gọi là|418~tốn nhiều thời gian|311~tích lũy, gom dần thành nhiều
239~sự hết hạn, kết thúc, sự thở ra|503~trích dẫn, báo giá; danh từ lời trích/báo giá|51~giá phải chăng, nằm trong khả năng chi trả|6~đủ tư cách/điều kiện, thích hợp được lựa chọn
131~giấy phép; động từ cấp phép, cho phép|467~vị, vị giác, sở thích; động từ nếm/trải nghiệm ít|610~trung thành với người hoặc tổ chức|269~đều đặn, thường xuyên, theo quy tắc
585~yếu tố, đại lý trung gian, thừa số; động từ phân tích/bao thanh toán|24~lựa chọn, quyền chọn; động từ cấp quyền chọn|295~kỹ lưỡng, hoàn toàn|126~trùng thời điểm, trùng khớp, nhất trí
435~quầy/thủ tục thanh toán, thủ tục trả phòng, sự kiểm tra thiết bị|574~điều bất lợi, trách nhiệm pháp lý, khoản nợ phải trả|304~có liên quan đến vấn đề đang xét|605~thành tích, thành tựu, sự đạt được
482~đĩa lưu trữ, vật dạng đĩa; động từ xử lý đất bằng đĩa cày|94~mốt/sự ham thích nhất thời|526~dài hạn, kéo dài lâu|468~thúc giục, khuyến cáo; danh từ sự thôi thúc
357~hệ thống, cơ thể, phương thức tổ chức|415~trình độ, điều kiện đủ, sự hạn định một phát biểu|579~tẻ nhạt, kéo dài gây chán|479~một cách tương đối, khi so sánh
497~việc nhận phòng/đăng ký đến, nơi làm thủ tục|601~rủi ro, đối tượng rủi ro; động từ liều, đặt vào nguy hiểm|570~tự động, không cần suy nghĩ có chủ ý|322~tập hợp, lắp ráp
325~người chuyển phát, người dẫn đoàn du lịch; động từ chuyển phát|119~thời gian rảnh, sự nhàn rỗi|253~có lô-gic, hợp lý|528~sự rút lui; bộ phận/trang có thể kéo ra
49~lương định kỳ; động từ trả lương|475~tiền vé, đồ ăn, hành khách trả tiền; động từ xoay xở/diễn tiến|78~thường ngày, thông thường|400~trong điều kiện lý tưởng hoặc hoàn hảo
257~người giám sát|401~thời gian chuẩn bị/đáp ứng từ khởi đầu đến hoàn thành|196~riêng rẽ, từng phần độc lập|235~đặc điểm; tính từ điển hình, đặc trưng
140~hương vị, sắc thái riêng; động từ tạo hương vị|590~mẫu thử, đoạn mẫu; động từ lấy mẫu, thử món/nhạc|277~dài, kéo dài về thời gian/văn bản|447~giảm giá, chiết khấu; động từ giảm giá/bác nhẹ tầm quan trọng
514~khoản vay/thỏa thuận thế chấp; động từ đem thế chấp|328~cách bố trí, bản dàn trang, cách sắp đặt|567~mang tính chủ quan, liên quan chủ thể|323~trước đó, trước một sự kiện
145~khách quen, nhà bảo trợ, vị thánh bảo trợ|496~dây xích, chuỗi cơ sở; động từ xích, ràng buộc|240~thường xuyên, nhiều lần|99~sự hài lòng, sự đáp ứng/đền bù cho yêu cầu
472~danh bạ, thư mục, sách chỉ dẫn; tính từ mang tính hướng dẫn|428~lộ trình, kế hoạch các chặng đi|442~nghiêm ngặt, hoàn toàn, xét đúng nghĩa|446~khách mua hàng/dịch vụ; một kiểu người trong thành ngữ
421~đồ uống, thức uống|107~hình phạt, khoản phạt, bất lợi phải chịu|524~quỹ tiền, nguồn dự trữ; động từ tài trợ|121~lịch trình, bảng kê; động từ xếp lịch
459~loại, nhóm phân loại|439~món hàng, khoản mục, tin ngắn; một cặp đôi trong thành ngữ|613~có năng suất, mang lại kết quả, có khả năng sinh sản|499~mong đợi, dự kiến, đòi hỏi; đang chờ sinh con trong cách dùng riêng
30~một món quần áo; động từ mặc quần áo cho|45~đội ngũ nhân viên, bộ phận nhân sự|101~hạn chót; ranh giới đặc biệt trong nghĩa lịch sử|160~một cách yếu ớt
364~kiểm kê, danh mục/tồn kho; động từ kiểm kê|602~chiến lược, cách hành động để đạt mục tiêu|362~thiết yếu trong tổng thể; toàn vẹn; danh từ tích phân|356~đáng kể, về cơ bản, một cách thực chất
272~chương trình nghị sự, các mục tiêu ngầm muốn theo đuổi|550~góc nhìn, quan điểm, phối cảnh|354~có triển vọng/sắp trở thành, thuộc tương lai|50~phù hợp; danh từ bộ đồ, vụ kiện, chất bài; động từ làm hài lòng
86~văn phòng phẩm, giấy viết và phong bì|317~khoản nợ, nghĩa vụ biết ơn|374~đối thoại; động từ trao đổi ý kiến|422~phủ kín; danh từ chăn, lớp phủ; tính từ áp dụng chung
591~giác quan, ý nghĩa, sự hiểu biết; động từ cảm nhận|97~sự thuyết phục, niềm tin, hệ tư tưởng|184~bằng lời, bằng miệng hoặc xét về từ ngữ|326~hỏa tốc, rõ ràng; động từ diễn đạt/ép ra; danh từ tàu nhanh
387~dụng cụ, nhạc cụ, văn bản pháp lý, phương tiện; động từ trang bị thiết bị|206~nghề chuyên môn, lời tuyên bố niềm tin|368~đến mức đủ|510~một cách thận trọng
314~ngân sách, kinh phí; động từ lập ngân sách; tính từ giá rẻ|251~khoảng mười năm, nhóm mười|330~đơn kiến nghị; động từ thỉnh cầu/yêu cầu bằng đơn|506~dịch vụ, sự phục vụ, bảo dưỡng, nghi lễ; động từ bảo dưỡng
54~sức chứa, khả năng, tư cách/vai trò đảm nhiệm|463~bản năng, trực giác; tính từ thấm đượm trong nghĩa văn chương|486~quá trình, quy trình, mỏm giải phẫu; động từ xử lý|383~cuộc hẹn, sự bổ nhiệm, đồ trang bị trong số nhiều
233~phiên họp, buổi học/làm việc; tính từ thuê theo buổi ghi âm hoặc bia nhẹ|481~xa xôi, ít khả năng, điều khiển từ xa; danh từ điều khiển|5~tế nhị, nhẹ nhàng, tinh xảo|562~người/sách hướng dẫn; động từ hướng dẫn, dẫn đường
110~vợ hoặc chồng; động từ kết hôn trong nghĩa hiếm|95~cảm hứng, nguồn gợi ý, sự hít vào|212~tương thích, hòa hợp|258~một cách có hệ thống
516~chữ ký, dấu hiệu đặc trưng, hóa biểu âm nhạc; tính từ đặc trưng|264~thói quen, trang phục tu sĩ; động từ mặc quần áo|334~gánh nặng, điệp khúc, ý chính; động từ chất gánh nặng|335~một cách phổ biến, thông thường
280~điều ưu tiên, quyền ưu tiên, thứ tự quan trọng|515~bị hạn chế, bị giới hạn tiếp cận|564~hỗn hợp; động từ trộn lẫn/kết giao|410~ứng viên, thí sinh, đối tượng có khả năng nhận/làm điều gì
607~sự tận tâm, cống hiến, lời đề tặng/khánh thành|485~sự phổ biến, được ưa thích|36~đồng đều, nhất quán trong toàn bộ|534~thỏa thuận, sự đồng ý, sự hòa hợp ngữ pháp
142~nguyên liệu, thành phần đóng góp|85~nguồn gốc/cung cấp, nguồn tin; động từ tìm nguồn cung|560~một cách táo bạo, liều lĩnh|489~sắc nhọn, thông minh, đột ngột, cay nghiệt; trạng từ đúng giờ/cao độ
527~danh mục đầu tư, tập hồ sơ/tác phẩm, bộ chức trách|100~sự tính toán, sự cân nhắc hoặc tính toán vụ lợi|566~an toàn, chắc chắn; động từ bảo đảm/có được/buộc chặt|412~tương xứng, tương ứng về mức độ
491~phần mềm máy tính|203~sự đổ vào số lượng lớn, dòng chảy vào|28~khuyết điểm; động từ bỏ phe/đào tẩu|93~hiện tại, ở thời điểm này
420~thông báo, sự công bố|490~kỹ năng, sự khéo léo|393~nghiêm túc, nghiêm trọng, đáng kể|555~thông thường, một cách điển hình
'''

# Additional exclusions found by considering alternate POS/senses, rather than
# merely comparing the stored Vietnamese strings. Apply to all duplicate IDs.
EXTRA_GROUPS = [
    ['consume', 'fare'],
    ['specific', 'express', 'exact'],
    ['arrangement', 'layout'],
    ['entitle', 'allow', 'permit', 'authorize', 'license'],
    ['promote', 'urge', 'encouragement'],
    ['monitor', 'supervisor'],
    ['interaction', 'dialogue'],
    ['benefit', 'discount'],
    ['expense', 'down payment'],
    ['indicator', 'announcement'],
    ['link', 'reason'],
    ['turnover', 'collection'],
    ['approach', 'suit'],
    ['vested', 'eligible', 'entitle'],
    ['file', 'submit', 'apply', 'petition', 'present'],
    ['perceptive', 'sharp', 'aware', 'be aware of'],
    ['mentor', 'guide', 'escort', 'supervisor'],
    ['appreciation', 'admire', 'recognition', 'value'],
    ['assume', 'take out', 'accept', 'occupy'],
    ['outlet', 'release', 'get out of', 'market', 'source'],
    ['match', 'suit', 'compatible', 'equivalent', 'competition'],
    ['consider', 'judge', 'evaluate', 'assess', 'regard'],
    ['settle', 'resolve', 'solve', 'deal with', 'reconcile', 'balance'],
    ['assignment', 'mission', 'task', 'demand'],
    ['incur', 'owe', 'debt', 'liability'],
    ['initiative', 'start', 'begin', 'bring up'],
    ['catch up', 'keep up with', 'stay on top of'],
    ['concentrate', 'focus', 'collect', 'gather', 'assemble'],
    ['conduct', 'behaviour', 'perform', 'carry out'],
    ['thrill', 'excite', 'excitement'],
    ['assurance', 'confidence', 'secure', 'guarantee'],
    ['lead time', 'duration', 'deadline', 'period'],
    ['adjacent', 'proximity', 'close'],
    ['inspect', 'scrutiny', 'examine', 'scan', 'monitor'],
    ['promptly', 'express', 'punctually'],
    ['call in', 'summon', 'invite', 'bring in'],
    ['provision', 'supply', 'preparation', 'terms', 'fund', 'stock'],
    ['practice', 'training', 'rehearse'],
    ['productive', 'efficient', 'effective'],
    ['recruit', 'hire', 'bring in'],
    ['present', 'offer', 'display', 'demonstrate', 'expose', 'representation'],
    ['expand', 'broaden', 'extend', 'build up'],
    ['sufficiently', 'enough'],
    ['regularly', 'frequently', 'periodically', 'usually', 'typically', 'commonly'],
    ['decade', 'long-term', 'lengthy'],
    ['return', 'yield', 'dividend', 'profitably', 'benefit'],
    ['loan', 'mortgage', 'borrow', 'lease'],
    ['housekeeper', 'personnel', 'staff'],
    ['stock', 'inventory', 'store', 'merchandise', 'supply'],
    ['list', 'catalog', 'inventory', 'directory', 'schedule'],
    ['engage', 'attract', 'draw', 'appeal', 'interest'],
    ['prefer', 'favor'],
    ['sense', 'feel', 'detect', 'perceptive', 'aware'],
    ['position', 'location', 'site'],
    ['apprehensive', 'anxious', 'nervously'],
    ['gather', 'accumulate', 'assemble', 'bring together', 'combine'],
    ['search', 'investigate', 'explore', 'research', 'examine'],
    ['address', 'deal with', 'solve', 'resolve'],
    ['claim', 'state', 'assert', 'promise'],
    ['consequence', 'result', 'impact'],
    ['begin', 'embarkation', 'board'],
    ['comfort', 'relaxation', 'smooth'],
    ['quality', 'characteristic', 'attribute', 'aspect', 'element', 'factor'],
    ['money', 'fund', 'resource', 'asset', 'budget'],
]

REFERENCES = {
    110: 'https://www.merriam-webster.com/dictionary/spouse',
    233: 'https://www.merriam-webster.com/dictionary/session',
    341: 'https://www.merriam-webster.com/dictionary/list',
    475: 'https://www.merriam-webster.com/dictionary/fare',
    326: 'https://www.merriam-webster.com/dictionary/express',
    10: 'https://www.merriam-webster.com/dictionary/vested',
    32: 'https://www.merriam-webster.com/dictionary/perceptive',
    40: 'https://www.merriam-webster.com/dictionary/alternative',
    84: 'https://www.merriam-webster.com/dictionary/smooth',
    167: 'https://www.merriam-webster.com/dictionary/inconsiderate',
    170: 'https://www.merriam-webster.com/dictionary/open%20to',
    173: 'https://www.merriam-webster.com/dictionary/appreciation',
    180: 'https://www.merriam-webster.com/dictionary/out%20of',
    205: 'https://www.merriam-webster.com/dictionary/outlet',
    275: 'https://www.merriam-webster.com/dictionary/go-ahead',
    413: 'https://www.merriam-webster.com/dictionary/match',
    531: 'https://www.merriam-webster.com/dictionary/wisely',
    543: 'https://www.merriam-webster.com/dictionary/resolve',
}

NEW_AUXILIARY = {
    106: 'Giải thích nguồn diễn đạt trả lại tiền, dễ lẫn owe (đang nợ) với repay (trả nợ); nghĩa hỏi nợ vẫn đúng. Không dùng giải thích này để dạy khi chưa biên tập.',
    299: 'Giải thích nguồn mô tả đoàn/người hộ tống, không phải designate; cần xử lý trước khi dùng trường giải thích. Prompt/loại từ/ví dụ của designate không cần thay vì lỗi phụ trợ này.',
    319: 'Giải thích nguồn có dạng tính từ profitable; câu hỏi dùng trạng từ profitably. Giữ cảnh báo phiên âm gốc.',
    484: 'Giải thích nguồn có dạng danh từ network; nhãn và ví dụ dùng động từ. Không tự đổi nhãn đúng theo giải thích.',
    556: 'Giải thích nguồn mô tả danh từ sản lượng; nhãn/ví dụ dùng động từ sinh lợi. Giữ động từ theo nghĩa nguồn.',
    582: 'Giải thích nguồn là danh từ khả năng kiểm soát; nhãn/ví dụ dùng động từ. Cần đồng bộ nếu hiển thị giải thích.',
    592: 'Giải thích nguồn dùng động từ tình nguyện; nhãn/ví dụ dùng danh từ người tình nguyện, giữ danh từ.',
    593: 'Giải thích nguồn nói bài diễn văn (danh từ); nhãn/ví dụ dùng động từ xử lý/đề cập vấn đề, giữ động từ.',
    604: 'Giải thích nguồn diễn đạt động từ substitute, nhãn/đầu mục substitution là danh từ; giữ danh từ.',
    616: 'Giải thích nguồn dùng trân trọng, ví dụ/nhãn/nghĩa hỏi định giá vẫn hợp lệ; không bắt buộc thay nghĩa hỏi.',
}


def read(relative):
    return json.loads((ROOT / relative).read_text(encoding='utf-8'))


def key(text):
    return ' '.join(text.lower().split())


def pair(a, b):
    return tuple(sorted((a, b)))


def build():
    source = {c['id']: c for p in sorted((ROOT / 'data-preparation/toeic/units').glob('*.json'))
              for c in json.loads(p.read_text(encoding='utf-8'))['flashcards']}
    manifest = read('data-internal/toeic-600/manifest.json')
    assert manifest['publication']['rightsStatus'] == 'unverified'
    assert not manifest['publication']['publishable'] and not manifest['publication']['publicUnlockAllowed']
    lessons = [read('data-internal/toeic-600/' + l['dataFile']) for l in manifest['lessons']]
    entries = [e for lesson in lessons for e in lesson['entries']]
    by_id = {e['id']: e for e in entries}
    by_row = {source[e['sourceRecordId']]['sourceRow']: e for e in entries}
    registry = {r['sourceRecordId']: r['id'] for r in read('data-proposals/toeic-600/id-registry.json')['records']}
    assert len(source) == 615 and len(entries) == len(by_id) == len(by_row) == 600
    assert len(lessons) == 50 and all(len(l['entries']) == 12 for l in lessons)
    assert len({e['sourceRecordId'] for e in entries}) == 600
    for e in entries:
        s = source[e['sourceRecordId']]
        assert registry[s['id']] == e['id'] and s['english'] == e['english']
        assert all(s[k] == v for k, v in e['sourceSnapshot'].items())
    ready = [e for e in entries if e['quiz']['status'] == 'internal-ready']
    pending = [e for e in entries if e['quiz']['status'] == 'pending-review']
    assert len(ready) == 28 and len(pending) == 572
    assert all(not e['quiz']['distractorIds'] for e in pending)
    notes = {}
    for line in PROMPTS.strip().splitlines():
        row_text, expected, prompt = line.split('|')
        row = int(row_text)
        assert row not in notes and by_row[row]['english'] == expected, line
        notes[row] = prompt
    assert set(notes) == {source[e['sourceRecordId']]['sourceRow'] for e in pending}
    assert set(DECISIONS) <= set(notes) and set(CONTEXT_NOTES) <= set(notes)
    sense_profiles, anchor_rows = {}, []
    for number, line in enumerate(ANCHORS.strip().splitlines()):
        anchors = []
        for item in line.split('|'):
            row_text, senses = item.split('~')
            row = int(row_text)
            assert row not in sense_profiles
            sense_profiles[row] = senses
            assert by_row[row]['lessonId'] == manifest['lessons'][number]['id']
            assert DECISIONS.get(row, ('R',))[0] == 'R', 'Unresolved anchor'
            anchors.append(row)
        assert len(anchors) == 4
        anchor_rows.append(anchors)
    assert len(anchor_rows) == 50 and len(sense_profiles) == 200

    risks = read('data-proposals/toeic-600/ambiguity-review.json')
    blocked = {pair(*p['sourceIds']) for p in risks['knownRiskPairs'] if p['bothRetained']}
    blocked.update(pair(*p['sourceIds']) for p in risks['newContextPairs'])
    blocked.update(pair(p['firstId'], p['secondId']) for p in risks['additionalExcludedSourcePairs'])
    extra = read('data-internal/toeic-600/distractor-review.json')['additionalBlockedPairs']
    groups = EXTRA_GROUPS + [[p['first'], p['second']] for p in extra]
    for group in groups:
        for a, b in itertools.combinations(entries, 2):
            if key(a['english']) in group and key(b['english']) in group:
                blocked.add(pair(a['sourceRecordId'], b['sourceRecordId']))
    for a, b in itertools.combinations(entries, 2):
        if key(a['english']) == key(b['english']):
            blocked.add(pair(a['sourceRecordId'], b['sourceRecordId']))

    questions = read('reports/toeic-quality/report.json')['questions']
    audit = {q['id']: q for q in questions}
    rows = []
    fallback_used = 0
    for e in sorted(pending, key=lambda e: source[e['sourceRecordId']]['sourceRow']):
        s = source[e['sourceRecordId']]
        n = s['sourceRow']
        category, pos, reason = DECISIONS.get(n, ('R', POS_SELECTION.get(n, e['partOfSpeech']),
            'Nghĩa chính và loại từ hợp lệ; đề nghị cách hỏi ngắn trong phạm vi nghĩa gốc. Không đề nghị ghi đè nguồn.'))
        assert pos
        # Rotate anchors for varied sets, then prefer same POS and same lesson.
        local = anchor_rows[int(e['lessonId'][-2:]) - 1]
        rotation = n % len(local)
        local = local[rotation:] + local[:rotation]
        local.sort(key=lambda row: by_row[row]['partOfSpeech'] != pos)
        # Fallback anchors are also actual entries in this SAME TOEIC set.
        candidates = local + [r for r in (491, 421, 110, 427, 86, 251) if r not in local]
        selected = []
        for candidate_row in candidates:
            c = by_row[candidate_row]
            if c['id'] == e['id'] or key(c['english']) == key(e['english']):
                continue
            if any(pair(c['sourceRecordId'], t['sourceRecordId']) in blocked for t in [e, *selected]):
                continue
            if key(notes.get(candidate_row, c['vietnamese'])) == key(notes[n]):
                continue
            selected.append(c)
            if len(selected) == 3:
                break
        assert len(selected) == 3, (n, e['english'])
        local_count = sum(c['lessonId'] == e['lessonId'] for c in selected)
        fallback_used += 3 - local_count
        options = [e, *selected]
        assert len({key(c['english']) for c in options}) == len({c['id'] for c in options}) == 4
        assert all(pair(a['sourceRecordId'], b['sourceRecordId']) not in blocked
                   for a, b in itertools.combinations(options, 2))
        q = audit[s['id']]
        warnings = [issue['reason'] for issue in q['sourceIssues'] if issue.get('priority') != 'question-decision']
        if n in NEW_AUXILIARY:
            warnings.append(NEW_AUXILIARY[n])
        conflicts = sorted({t['english'] for t in entries if t['id'] != e['id']
                            and pair(e['sourceRecordId'], t['sourceRecordId']) in blocked})
        row = {
            'ID': e['id'], 'ID nguồn': s['id'], 'Bài': e['lessonId'], 'Dòng CSV nguồn': n,
            'Từ tiếng Anh': e['english'], 'Nghĩa nguồn': s['vietnamese'],
            'Loại từ nguồn': s['partOfSpeechOriginal'], 'Nghĩa nội bộ hiện tại': e['vietnamese'],
            'Loại từ nội bộ hiện tại': e['partOfSpeech'] or '',
            'Nghĩa ngắn đề nghị cho Quiz': notes[n], 'Loại từ đề nghị cho Quiz': pos,
            'Nhóm': LABELS[category], 'Mã nhóm': category,
            'Lý do': reason, 'Đối chiếu ngữ cảnh': CONTEXT_NOTES.get(n, reason if category != 'R' else
                'Chọn một nét nghĩa của đầu mục để hỏi; ví dụ/giải thích nguồn chỉ dùng đối chiếu, không đưa vào bộ Quiz mới.'),
            'Các từ cần tránh dùng chung': '; '.join(conflicts),
            'Nhiễu cùng bài': local_count,
            'Căn cứ bổ sung': REFERENCES.get(n, 'Suy luận ngôn ngữ từ nghĩa/loại từ và ngữ cảnh bản ghi; không phải chứng nhận từ điển độc lập cho toàn bộ từ.'),
            'Cảnh báo phụ trợ': ' | '.join(warnings),
            'Độ tin cậy': 'Cao cho phạm vi câu hỏi đề xuất' if category == 'R' else
                'Cao về vấn đề cần sửa; chưa được duyệt' if category == 'C' else 'Chưa chốt phạm vi nghĩa/cách hiển thị',
            'Trạng thái': 'Đề nghị duyệt — chưa phê duyệt',
            'Quyết định quản trị (Giữ/Sửa/Tạm loại)': '', 'Ghi chú quản trị': '',
        }
        for i, c in enumerate(selected, 1):
            cs = source[c['sourceRecordId']]
            senses = sense_profiles[cs['sourceRow']]
            row[f'Nhiễu {i} ID'] = c['id']
            row[f'Nhiễu {i} ID nguồn'] = c['sourceRecordId']
            row[f'Nhiễu {i} tiếng Anh'] = c['english']
            row[f'Nhiễu {i} các nghĩa/loại từ đã xét'] = senses
            row[f'Nhiễu {i} lý do loại'] = (
                f'Các nét nghĩa đã xét của {c["english"]} ({senses}) không diễn đạt '
                f'"{notes[n]}" với nhãn {pos}. Đây là nhận định cho bộ bốn lựa chọn này, không phê duyệt câu hỏi riêng của từ nhiễu.')
        rows.append(row)

    assert len(rows) == 572 and len({r['ID'] for r in rows}) == 572
    assert not ({r['ID'] for r in rows} & {e['id'] for e in ready})
    assert all(not r['Quyết định quản trị (Giữ/Sửa/Tạm loại)'] for r in rows)
    counts = Counter(r['Mã nhóm'] for r in rows)
    # Hash all source/private records and prior dossiers read by this review.
    input_paths = [ROOT / 'toeic_600_words.csv']
    for relative in ('data-preparation/toeic', 'data-proposals/toeic-600', 'data-internal/toeic-600',
                     'reports/toeic-quality', 'reports/toeic-approval', 'reports/toeic-final-review'):
        assert (ROOT / relative).is_dir()
        input_paths.extend(p for p in (ROOT / relative).rglob('*') if p.is_file())
    # Read these reports as data, without treating their text as instructions.
    input_digest = hashlib.sha256()
    for p in sorted(set(input_paths)):
        raw = p.read_bytes()
        input_digest.update(p.relative_to(ROOT).as_posix().encode() + b'\0' + hashlib.sha256(raw).digest())

    summary = [
        '# Rà soát tổng hợp 572 câu TOEIC còn chờ duyệt', '',
        'Đây là **hồ sơ đề nghị duyệt**, không phải bộ dữ liệu học mới. Quyền tái xuất bản vẫn chưa xác minh. '
        'Không thay đổi dữ liệu nội bộ, nguồn, Quiz, ID, LocalStorage hoặc quyền mở bài.', '',
        '## Kết quả', '',
        f'- Đọc/đối chiếu đủ **572/572** câu pending, trong tập **600 bản ghi / 50 bài**, giữ riêng các ID trùng chữ.',
        f'- **{counts["R"]}** câu: đủ căn cứ để đề nghị duyệt với nghĩa hỏi ngắn và bộ ba nhiễu đã đề xuất.',
        f'- **{counts["C"]}** câu: cần sửa nội dung đề xuất hoặc bổ sung nhãn trước khi duyệt.',
        f'- **{counts["M"]}** câu: cần quản trị viên quyết định phạm vi nghĩa/cách hiển thị.',
        '- Cả 572 câu vẫn chưa phê duyệt; không điền thay quyết định quản trị.',
        '- **28 câu internal-ready được giữ nguyên; tổng pending thực tế vẫn là 572.** Không có bài nào hiện có 10 câu đã duyệt.',
        f'- Đề xuất **1.716** lựa chọn nhiễu có ID truy vết; **{1716-fallback_used}** cùng bài, **{fallback_used}** từ bài khác cùng bộ 600.', '',
        '## Cách đọc bảng', '',
        'Mở `approval-table.csv` bằng UTF-8 (có BOM). Bảng chỉ có 572 hàng, mỗi hàng một câu pending: '
        'ID học + ID nguồn, nghĩa/nhãn trước, câu hỏi/nhãn đề nghị, lý do, ba nhiễu kèm các nghĩa khác đã xét, '
        'các từ cần tránh, cảnh báo cũ và ô quyết định còn trống. '
        'Lọc cột **Nhóm** để duyệt cả một nhóm trong cùng bảng. '
        'Nghĩa đề xuất chỉ là bản rút gọn/lựa chọn phạm vi để hỏi; không phải yêu cầu viết lại toàn bộ từ điển nguồn.', '',
        '## Phương pháp và giới hạn', '',
        'Đã đọc nghĩa, loại từ, giải thích/ví dụ và hồ sơ cũ; biên tập riêng câu hỏi ngắn cho từng ID. '
        'Giữ nghĩa gốc hợp lệ ngay cả khi ví dụ dùng nghĩa khác; các trường hợp cần chọn phạm vi được giữ ở nhóm M. '
        'Một từ đa nghĩa không tự động là câu sai. Ví dụ smooth vẫn có nghĩa hòa nhã/lễ độ; '
        'alternative cũng có nghĩa luân phiên, nên không loại bỏ các nghĩa này chỉ theo một ví dụ.', '',
        'Chọn nhiễu từ bốn đầu mục tương đối khác nghĩa trong mỗi bài; đã xét thêm nghĩa và loại từ khác của '
        '200 đầu mục được dùng làm ứng viên nhiễu (ghi ngay trong từng hàng), rồi lọc các cặp rủi ro cũ và các '
        'nhóm chồng nghĩa bổ sung. Ưu tiên cùng bài; khi không đủ dùng đầu mục có thật từ cùng bộ 600. '
        'Nhiễu không được chọn chỉ vì nhãn loại từ hoặc nghĩa đã lưu khác nhau. '
        'Mọi đầu mục nhiễu cũng giữ nguyên ID và trạng thái học hiện tại.', '',
        '**Giới hạn:** đây là rà soát biên tập các nghĩa thông dụng và cách dùng liên quan, có tra cứu các điểm '
        'nghi vấn ở nguồn từ điển chính thức bên dưới; không thể chứng minh đã liệt kê hết mọi nghĩa hiếm, '
        'lịch sử, thuật ngữ hoặc phương ngữ của mọi từ. Bộ lọc cặp/kiểm tra bốn ID chỉ bảo đảm các ràng buộc '
        'cấu trúc và xung đột đã biết, không tự chứng nhận duy nhất về ngữ nghĩa. Mọi bộ bốn đều còn là đề xuất '
        'cần duyệt; khi thay prompt hoặc nhiễu phải rà lại. Không sao chép định nghĩa/ví dụ bên thứ ba vào dữ liệu.', '',
        'Một số lựa chọn khác loại từ có thể làm câu dễ hơn. Đây là nhận xét về độ khó, không phải lỗi nhiều '
        'đáp án đúng; yêu cầu hiện tại ưu tiên ba nhiễu khác nghĩa rõ ràng.', '',
        f'Đã chặn thận trọng **{len(blocked)} cặp ID** từ hồ sơ cũ và rà soát bổ sung; đây không phải '
        'số lỗi nguồn chắc chắn. Những cặp mới cần chú ý gồm specific–express, arrangement–layout, '
        'entitle–license, promote–urge, monitor–supervisor và interaction–dialogue. '
        'Bộ nhiễu đề xuất không chứa cặp bị chặn, kể cả giữa hai lựa chọn sai.', '',
        '## Các mục cần sửa hoặc quyết định', '',
        '| Dòng CSV | Từ | Nhóm | Đề xuất và lý do |',
        '| --- | --- | --- | --- |',
    ]
    for r in rows:
        if r['Mã nhóm'] != 'R':
            summary.append(f'| {r["Dòng CSV nguồn"]} | {r["Từ tiếng Anh"]} | {r["Mã nhóm"]} | '
                           f'{r["Loại từ đề nghị cho Quiz"]} {r["Nghĩa ngắn đề nghị cho Quiz"]}. {r["Lý do"]} |')
    summary += ['', 'Phiên âm, ví dụ, giải thích phụ trợ có cờ vẫn giữ nguyên và được ghi trong bảng. '
                'Chúng không tự ngăn câu hỏi nghĩa–tiếng Anh nếu không hiển thị các trường đó; phải duyệt riêng '
                'trước khi sử dụng. Với wisely, nhãn nội bộ đã là adv.; chỉ còn đề nghị nghĩa trạng từ và cảnh báo '
                'phiên âm, không ghi nhận lại như thể nhãn nội bộ chưa sửa.', '',
                '## Khả năng đủ 10 câu mỗi bài', '',
                'Các cột tiềm năng chỉ tính sau khi quản trị viên duyệt đúng nghĩa và bộ nhiễu tương ứng. '
                'Cột “sau sửa C” còn giả định các đề xuất C được chấp nhận. M không được tính vào hai kịch bản này. '
                'Không cột nào là trạng thái mở khóa thực tế.', '',
                '| Bài | Đã duyệt hiện tại | Đề nghị R | Cần sửa C | Quyết định M | Hiện tại + R | Sau sửa C | Đạt 10 với R? |',
                '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |']
    r_lessons = repaired_lessons = 0
    for lesson in lessons:
        lesson_id = lesson['lessonId']
        current = sum(e['quiz']['status'] == 'internal-ready' for e in lesson['entries'])
        lc = Counter(r['Mã nhóm'] for r in rows if r['Bài'] == lesson_id)
        assert current + sum(lc.values()) == 12
        potential = current + lc['R']
        after_c = potential + lc['C']
        r_lessons += potential >= 10
        repaired_lessons += after_c >= 10
        summary.append(f'| {lesson_id} | {current} | {lc["R"]} | {lc["C"]} | {lc["M"]} | '
                       f'{potential} | {after_c} | {"Có" if potential >= 10 else "Chưa"} |')
    summary += ['', f'**{r_lessons}/50 bài** có tiềm năng đủ 10 câu khi chỉ cộng R đã được duyệt; '
                f'**{repaired_lessons}/50 bài** nếu còn sửa và duyệt C. '
                'Toàn bộ 50 bài có thể dựng 12 bộ bốn lựa chọn để mô phỏng về mặt cấu trúc; '
                'không tính câu M/C như đã được duyệt.', '',
                '## Nguồn đối chiếu các điểm nghi vấn', '']
    for n, url in REFERENCES.items():
        summary.append(f'- [{by_row[n]["english"]}]({url}) — đối chiếu ngày 2026-11-17; '
                       'chỉ dùng để kiểm tra nét nghĩa/loại từ, không nhập ví dụ hoặc nội dung từ điển.')
    summary += ['', '## Bảo toàn và tái kiểm tra', '',
                f'- Dấu vân tay SHA-256 tổng hợp {len(set(input_paths))} tệp nguồn/hồ sơ cũ: `{input_digest.hexdigest()}`.',
                '- SHA-256 CSV nguồn: `' + hashlib.sha256((ROOT / 'toeic_600_words.csv').read_bytes()).hexdigest() + '`.',
                '- `python scripts/report-toeic-bulk-review.py --check` kiểm tra bảng còn khớp nguồn, '
                'đủ 572 ID pending, không chạm 28 ready, ba nhiễu/câu, không trùng chữ/ID/cặp rủi ro đã biết và ô duyệt trống.',
                '- Script chỉ ghi hai tệp trong `reports/toeic-bulk-review/`; không sinh dataset, không sửa trạng thái.',
                '- Đối chiếu SHA-256 trước/sau: 278 tệp đã có trong src, public, dist, các thư mục dữ liệu/hồ sơ, '
                'scripts và tests giữ nguyên; chỉ thêm bảng CSV này, README và script tạo báo cáo.',
                '- Chưa đủ điều kiện xuất bản: quyền tái sử dụng chưa xác minh; quản trị viên chưa duyệt '
                '572 câu/bộ nhiễu; các mục C/M và cảnh báo phụ trợ còn phải xử lý theo phạm vi sử dụng.', '',
                '## Kiểm tra trong lượt rà soát', '',
                '- `python scripts/report-toeic-bulk-review.py --check`: khớp đủ 572 ID; '
                '12.000 lượt kiểm tra câu hỏi bằng logic Quiz hiện có qua 20 hạt ngẫu nhiên; '
                '1.000 lượt mô phỏng 10 câu (50 bài × 20); '
                '2.400 kiểm tra trộn có kiểm soát để đáp án đúng đi được cả A/B/C/D; '
                'kiểm tra chấm điểm, bốn chữ/ID khác nhau và không lặp câu trong lượt. '
                'Toàn bộ dữ liệu mô phỏng chỉ ở bộ nhớ, bao gồm cả C/M khi kiểm tra cấu trúc; '
                'kịch bản đạt 10 chỉ cộng 28 hiện tại và nhóm R. Không ghi trạng thái duyệt.',
                '- `node --test scripts/check-toeic-internal.mjs scripts/check-toeic-preparation.mjs`: '
                '9 kiểm tra đạt, gồm kiểm tra âm với thay đổi trái phép và mở trạng thái pending.',
                '- `python -m unittest discover -s tests -p test_toeic_preparation.py`: 3 kiểm tra đạt.',
                '- `python scripts/check-toeic-600.py`: đạt kiểm tra 615 = 600 giữ + 15 mục đề xuất loại, '
                '50 × 12, ID và nguồn còn nguyên.',
                '- `node scripts/check-toeic-publication.mjs public` và lệnh tương ứng với `dist`: đạt. '
                'Không chạy build mới hoặc kiểm thử giao diện trong lượt chỉ tạo báo cáo này; mã ứng dụng không đổi.', '']
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=list(rows[0]), lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
    return {'approval-table.csv': output.getvalue().encode('utf-8-sig'),
            'README.md': '\n'.join(summary).encode('utf-8')}, counts, r_lessons, repaired_lessons, rows


def verify_native(rows):
    """Exercise the REAL existing Quiz functions on in-memory proposals only."""
    payload = [{'id': r['ID'], 'english': r['Từ tiếng Anh'], 'prompt': r['Nghĩa ngắn đề nghị cho Quiz'],
                'pos': r['Loại từ đề nghị cho Quiz'], 'category': r['Mã nhóm'],
                'distractors': [r[f'Nhiễu {i} ID'] for i in range(1, 4)]} for r in rows]
    js = r'''
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeQuizQuestions,createQuizRound,gradeQuizAnswer,quizTextKey,shuffleQuiz} from './src/utils/toeicQuiz.ts';
const proposal = JSON.parse(fs.readFileSync(0,'utf8'));
const byId = new Map(proposal.map(r=>[r.id,r]));
const read = p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manifest = read('data-internal/toeic-600/manifest.json');
const actual = manifest.lessons.flatMap(l=>read('data-internal/toeic-600/'+l.dataFile).entries);
const before = JSON.stringify(actual);
const views = actual.map(e=>{
  const r=byId.get(e.id);
  return r ? {...e,vietnamese:r.prompt,partOfSpeech:r.pos,quiz:{...e.quiz,distractorIds:r.distractors}} : structuredClone(e);
});
const afterR=new Set(actual.filter(e=>e.quiz.status==='internal-ready').map(e=>e.id));
proposal.filter(r=>r.category==='R').forEach(r=>afterR.add(r.id));
let questionChecks=0,roundChecks=0;
const positions=new Map();
for(let seed=1;seed<=20;seed++){
  let state=(Math.imul(seed,0x9e3779b9)^0x85ebca6b)>>>0;
  const random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
  const questions=makeQuizQuestions(views,views,random);
  assert.equal(questions.length,600);
  for(const q of questions){
    assert.equal(q.options.length,4);
    assert.equal(new Set(q.options.map(o=>o.id)).size,4);
    assert.equal(new Set(q.options.map(o=>quizTextKey(o.english))).size,4);
    assert.equal(q.options.filter(o=>gradeQuizAnswer(q,o.id)).length,1);
    assert(gradeQuizAnswer(q,q.correctId));
    assert(!gradeQuizAnswer(q,'unknown-id'));
    if(!positions.has(q.id))positions.set(q.id,new Set());
    positions.get(q.id).add(q.options.findIndex(o=>o.id===q.correctId));
    questionChecks++;
  }
  for(const lesson of manifest.lessons){
    const ids=new Set(views.filter(e=>e.lessonId===lesson.id && afterR.has(e.id)).map(e=>e.id));
    const eligible=questions.filter(q=>ids.has(q.id));
    assert(eligible.length>=10);
    const round=createQuizRound(eligible,random);
    assert.equal(round.length,10);
    assert.equal(new Set(round.map(q=>q.id)).size,10);
    const score=round.reduce((n,q,i)=>n+Number(gradeQuizAnswer(q,i%2===0?q.correctId:q.options.find(o=>o.id!==q.correctId).id)),0);
    assert.equal(score,5);
    roundChecks++;
  }
}
// A finite random sample must not be required to hit all four positions for
// every question. Check variation, then exercise all positions deliberately.
assert.equal(new Set([...positions.values()].flatMap(set=>[...set])).size,4);
for(const e of views){
  const controlled=new Set([0,0.25,0.4,0.6].map(value=>
    shuffleQuiz([e.id,...e.quiz.distractorIds],()=>value).indexOf(e.id)));
  assert.equal(controlled.size,4);
}
assert.equal(JSON.stringify(actual),before,'Native probe mutated actual input');
assert.equal(actual.filter(e=>e.quiz.status==='internal-ready').length,28);
assert.equal(actual.filter(e=>e.quiz.status==='pending-review').length,572);
console.log(JSON.stringify({nativeQuestionChecks:questionChecks,hypotheticalTenQuestionRounds:roundChecks,
  seeds:20,controlledShuffleChecks:2400,correctPositions:'A/B/C/D for every question in controlled shuffle',
  varyingQuestionsInFiniteSeedSample:[...positions.values()].filter(set=>set.size>1).length,
  actualApproved:28,actualPending:572,
  scope:'structural/scoring/shuffle simulation only; semantic assessment is editorial; no approvals/writes'}));
'''
    result = subprocess.run(['node', '--input-type=module', '--eval', js], cwd=ROOT,
                            input=json.dumps(payload, ensure_ascii=True), capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    print(result.stdout.strip())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='read-only output/invariant verification')
    args = parser.parse_args()
    outputs, counts, r_lessons, repaired_lessons, rows = build()
    for filename, content in outputs.items():
        target = OUT / filename
        if args.check:
            assert target.read_bytes() == content, f'Stale report: {target}'
        else:
            OUT.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    if args.check:
        verify_native(rows)
    print(json.dumps({'mode': 'check' if args.check else 'report-only', 'pendingRows': sum(counts.values()),
                      'classification': dict(counts), 'lessonsPotential10AfterR': r_lessons,
                      'lessonsPotential10AfterC': repaired_lessons, 'approvedUnchanged': 28,
                      'sourceWrites': 0, 'approvedAutomatically': 0}, ensure_ascii=True))

