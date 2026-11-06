/* Nội dung học Cờ tướng: bài học, sách khai cuộc, bảng tra, từ điển.
   Thế cờ viết gọn: chữ quân + ô, vd 'Ke0 kd9 Re4' (hoa là Đỏ, thường là Đen; K Tướng, A Sĩ, B Tượng, N Mã, R Xe, C Pháo, P Tốt),
   'dau' = thế đầu ván, có '/' thì là FEN. 'truoc' = chuỗi nước đi trước khi vào bước đó.
   Kiểu bước (k): xem, di (phải đi đúng), thu (thử nước sai để nghe lý do), an (ăn hết quân Đen), hoi (trắc nghiệm), cham (chạm đúng quân/ô), demo (xem từng nước).
   Kiểm toàn bộ bằng tools/co_kiem_bai.js. */
(() => {
  const CO = (typeof window !== 'undefined' ? window : globalThis).CO_DL = {};

  CO.TRA = [
    { q: 'R', ten: 'Xe', gia: '9', di: 'Đi thẳng theo hàng hoặc cột, bao xa cũng được, không nhảy qua quân khác.', han: ['俥', '車'], nho: 'Chữ 車 như cái xe nhìn từ trên: thùng xe và trục bánh.' },
    { q: 'C', ten: 'Pháo', gia: '4,5', di: 'Đi như Xe. Muốn ăn phải nhảy qua đúng một quân làm ngòi.', han: ['炮', '砲'], nho: 'Đỏ có bộ 火 (lửa), Đen có bộ 石 (đá): súng bắn lửa, máy bắn đá.' },
    { q: 'N', ten: 'Mã', gia: '4', di: 'Đi hình chữ Nhật: một ô thẳng rồi một ô chéo. Quân đứng sát hướng thẳng sẽ cản chân.', han: ['傌', '馬'], nho: 'Chữ 馬 có bốn chấm dưới đáy, như bốn chân ngựa.' },
    { q: 'P', ten: 'Tốt', gia: '1, qua sông 2', di: 'Tiến 1 ô. Qua sông đi được thêm sang ngang. Không bao giờ lùi.', han: ['兵', '卒'], nho: 'Đỏ là 兵 (binh), Đen là 卒 (tốt). Hai chữ đều nói người lính.' },
    { q: 'B', ten: 'Tượng', gia: '2', di: 'Đi chéo đúng 2 ô, không qua sông. Có quân ở giữa đường chéo là bị chẹn.', han: ['相', '象'], nho: 'Đen là 象, tức con voi. Đỏ là 相, đọc gần giống.' },
    { q: 'A', ten: 'Sĩ', gia: '2', di: 'Đi chéo 1 ô, chỉ ở trong cung.', han: ['仕', '士'], nho: 'Chữ 士 đứng thẳng như người lính gác. Đỏ thêm bộ người: 仕.' },
    { q: 'K', ten: 'Tướng', gia: 'vô giá', di: 'Đi 1 ô ngang hoặc dọc, chỉ ở trong cung. Hai Tướng không được nhìn thẳng mặt nhau.', han: ['帥', '將'], nho: 'Đỏ là 帥 (soái), Đen là 將 (tướng). Hai chữ duy nhất có nét sổ dài ở giữa cung.' },
  ];

  CO.TU = [
    ['Chiếu', 'Đi một nước dọa ăn Tướng ở nước kế. Bên bị chiếu phải xử lý ngay.'],
    ['Chiếu bí', 'Tướng bị chiếu và không còn nước nào thoát. Bên bị bí thua.'],
    ['Hết nước', 'Tới lượt mà không còn nước đi hợp lệ. Trong cờ tướng, hết nước cũng là thua.'],
    ['Ngòi', 'Quân nằm giữa Pháo và mục tiêu. Pháo ăn phải nhảy qua đúng một ngòi.'],
    ['Cản chân Mã', 'Quân đứng sát Mã theo hướng thẳng, làm Mã không đi được về hướng đó.'],
    ['Chẹn mắt Tượng', 'Quân đứng ở giữa đường chéo của Tượng, làm Tượng không đi được hướng đó.'],
    ['Lộ mặt tướng', 'Hai Tướng trên cùng một cột mà không có quân chắn. Đây là nước cấm.'],
    ['Cung', 'Khu 9 giao điểm có gạch chéo. Tướng và Sĩ không được ra khỏi đây.'],
    ['Quân treo', 'Quân đang bị đánh mà không có quân nào bảo vệ, đối phương ăn là mất trắng.'],
    ['Đổi quân', 'Ăn của nhau một quân. Lời hay lỗ tùy giá trị hai quân.'],
    ['Bắt đôi', 'Một nước dọa ăn cùng lúc hai quân. Đối phương chỉ cứu được một.'],
    ['Ghim', 'Quân đang che cho Tướng nên không rời chỗ được.'],
    ['Chiếu rút', 'Dời một quân đi, để lộ quân phía sau chiếu Tướng. Quân vừa dời được tự do đánh chỗ khác.'],
    ['Tiên', 'Quyền chủ động: bên đang ép, đối phương phải chạy theo mà đỡ.'],
    ['Pháo đầu', 'Pháo đặt ở cột giữa, nhắm thẳng Tốt đầu đối phương.'],
    ['Bình phong Mã', 'Hai Mã cùng lên, bảo vệ nhau và bảo vệ Tốt giữa, như tấm bình phong.'],
    ['Trường chiếu', 'Chiếu mãi không dứt để cầu hòa. Bị cấm, bên cố tình chiếu liên tục bị xử thua.'],
    ['Sát cục', 'Hình mẫu chiếu bí quen thuộc, nhìn ra là biết cách kết thúc ván.'],
  ];

  // Sách khai cuộc: dùng cho máy (đi đa dạng) và để gọi tên thế trận trong phần phân tích
  CO.SACH = [
    { ten: 'Pháo đầu đối Bình phong Mã', chuoi: 'P2-5 M8.7 M2.3 B7.1 X1-2 X9-8 X2.6 M2.3 B7.1 P8-9 X2-3 P9/1' },
    { ten: 'Pháo đầu đối Bình phong Mã', chuoi: 'P2-5 M8.7 M2.3 X9-8 X1-2 M2.3 B7.1 B7.1 X2.6 P8-9 X2-3 P9/1' },
    { ten: 'Pháo đầu đối Bình phong Mã', chuoi: 'P2-5 M2.3 M2.3 M8.7 B7.1 B7.1 M8.7 X9-8 X1-2 P8.4' },
    { ten: 'Thuận pháo', chuoi: 'P2-5 P8-5 M2.3 M8.7 X1-2 X9-8 B7.1 M2.3 M8.7 B7.1' },
    { ten: 'Thuận pháo', chuoi: 'P2-5 P8-5 M2.3 M8.7 X1-2 X9-8 X2.4 M2.3 M8.7 B3.1' },
    { ten: 'Nghịch pháo', chuoi: 'P2-5 P2-5 M2.3 M2.3 X1-2 X1-2 M8.7 M8.7 X9-8 X9-8' },
    { ten: 'Phản cung Mã', chuoi: 'P2-5 M2.3 M2.3 P8-6 X1-2 M8.7 B7.1 B7.1 M8.7 T3.5' },
    { ten: 'Tam bộ hổ', chuoi: 'P2-5 M8.7 M2.3 P8-9 X1-2 X9-8 X2.4 M2.3 B7.1 B3.1' },
    { ten: 'Pháo đầu đối Tiến Tốt', chuoi: 'P2-5 B3.1 M2.3 M2.3 X1-2 X1-2 B7.1 M8.9 M8.7 P8-7' },
    { ten: 'Phi Tượng', chuoi: 'T3.5 P8-4 M2.3 M8.7 B7.1 X9-8 M8.9 B7.1 X1-2 M2.3' },
    { ten: 'Phi Tượng', chuoi: 'T3.5 B3.1 M2.3 M2.3 X1-2 X1-2 B7.1 B3.1 M8.7 P8-9' },
    { ten: 'Tiến Tốt', chuoi: 'B7.1 P2-3 P2-5 T3.5 M2.3 B3.1 X1-2 M2.1 M8.7 X1-2' },
    { ten: 'Tiến Tốt', chuoi: 'B7.1 B3.1 M8.7 M2.3 P8-9 X1-2 X9-8 P8-9 P2-3 T3.5' },
    { ten: 'Khởi Mã', chuoi: 'M2.3 B3.1 B7.1 M2.3 M8.7 P2-1 X1-2 M8.7 X9-8 X1-2' },
    { ten: 'Sĩ giác Pháo', chuoi: 'P2-4 M8.7 M2.3 X9-8 X1-2 P8-9 M8.7 B3.1 X9-8 M2.3' },
    { ten: 'Quá cung Pháo', chuoi: 'P2-6 M8.7 M2.3 X9-8 X1-2 B7.1 B7.1 P8-9 M8.7 M2.3' },
  ];

  const nghiKhai = 'Lên Mã, ra Xe, đặt Pháo: ba loại quân này vào trận trước, Sĩ Tượng Tốt đi sau.';

  CO.BAI = [
    {
      chang: 'Luật chơi', mo: 'Từng quân đi thế nào, thắng thua ra sao.', bai: [
        {
          ma: 'ban', ten: 'Bàn cờ và mục tiêu', phut: 2, buoc: [
            { k: 'xem', the: 'dau', chu: 'Hai bên Đỏ và Đen, mỗi bên 16 quân. Đỏ đi trước, rồi mỗi bên đi một nước, thay phiên nhau.' },
            { k: 'xem', the: 'dau', bangHan: true, chu: 'Mỗi quân khắc một chữ Hán như bàn cờ thật: chữ đỏ là quân Đỏ, chữ đen là quân Đen. Cùng một loại quân, hai bên dùng hai chữ hơi khác nhau. Lướt qua bảng này trước, bài sau sẽ tập nhận mặt từng chữ.' },
            { k: 'xem', chu: 'Quân đứng trên giao điểm của các đường kẻ, không đứng trong ô. Bàn có 9 cột dọc và 10 hàng ngang.', o: ['b2', 'e3', 'a0'] },
            { k: 'xem', chu: 'Dải trống ở giữa là sông, chia bàn làm hai đất. Xe, Mã, Pháo qua lại tự do. Tượng không qua được. Tốt qua sông thì mạnh lên.', dai: 'song' },
            { k: 'xem', chu: 'Hai hình có gạch chéo là cung. Tướng và Sĩ suốt ván chỉ ở trong cung của mình.', dai: 'cung' },
            { k: 'xem', the: 'Ra9 Rb8 kd9 Kf0', chu: 'Mục tiêu: chiếu bí Tướng đối phương, tức dồn Tướng tới chỗ không còn đường thoát. Ở đây Tướng Đen đã bí. Không cần ăn hết quân: ăn nhiều mà bị bí vẫn thua.', o: ['d9'], mui: [['a9', 'd9']], ben: 'b' },
            { k: 'cham', the: 'dau', chu: 'Thử nào: chạm vào Tướng của bên Đỏ, chữ 帥.', dap: ['e0'], giai: 'Tướng Đỏ đứng giữa hàng cuối, trong cung. Mất nó là thua nên cả ván phải giữ.' },
            { k: 'hoi', chu: 'Ván cờ kết thúc khi nào?', pa: ['Khi một Tướng bị chiếu bí hoặc hết nước đi', 'Khi một bên mất hết Xe', 'Khi một bên mất 10 quân'], da: 0, giai: 'Chỉ Tướng mới quyết định thắng thua. Mất bao nhiêu quân cũng còn đánh được, miễn Tướng còn đường.' },
          ],
        },
        {
          ma: 'han', ten: 'Nhận mặt chữ trên quân', phut: 3, buoc: [
            { k: 'xem', the: 'dau', bangHan: true, chu: 'Đọc mẹo nhớ từng chữ, rồi trả lời nhanh mấy câu bên dưới. Chưa nhớ hết cũng không sao: khi đánh, chạm vào quân là app nhắc tên quân đó. Muốn tạm hiện chữ Việt thì đổi trong menu.' },
            { k: 'hoi', hinh: '車', chu: 'Quân đen này là quân gì?', pa: ['Xe', 'Mã', 'Pháo'], da: 0, giai: '車 trông như cái xe nhìn từ trên xuống.' },
            { k: 'hoi', hinh: '馬', chu: 'Quân đen này là quân gì?', pa: ['Mã', 'Xe', 'Tượng'], da: 0, giai: '馬 có bốn chấm dưới đáy như bốn chân ngựa.' },
            { k: 'hoi', hinh: '炮', chu: 'Quân đỏ này là quân gì?', pa: ['Pháo', 'Tốt', 'Sĩ'], da: 0, giai: '炮 có bộ lửa bên trái: súng bắn.' },
            { k: 'hoi', hinh: '兵', chu: 'Quân đỏ này là quân gì?', pa: ['Tốt', 'Tướng', 'Sĩ'], da: 0, giai: '兵 đọc là binh, tức Tốt của Đỏ. Đen dùng chữ 卒.' },
            { k: 'hoi', hinh: '象', chu: 'Quân đen này là quân gì?', pa: ['Tượng', 'Sĩ', 'Mã'], da: 0, giai: '象 là con voi. Đỏ dùng chữ 相, đọc gần giống.' },
            { k: 'hoi', hinh: '將', chu: 'Quân đen này là quân gì?', pa: ['Tướng', 'Sĩ', 'Xe'], da: 0, giai: '將 là tướng của Đen, 帥 là soái của Đỏ. Quân này nằm giữa cung.' },
          ],
        },
        {
          ma: 'tuong', ten: 'Tướng', quan: 'K', phut: 2, buoc: [
            { k: 'xem', the: 'Ke0 kd9', chu: 'Tướng (帥 bên Đỏ, 將 bên Đen) đi 1 ô mỗi nước, ngang hoặc dọc, không đi chéo. Các chấm là chỗ Tướng đi được lúc này.', cham: 'e0' },
            { k: 'di', the: 'Ke0 kd9', chu: 'Chạm Tướng rồi chạm chấm phía trên để đi lên 1 ô.', dap: ['e0e1'], dung: 'Đúng rồi. Cách đi quân nào cũng vậy: chạm quân, rồi chạm chỗ đến.' },
            { k: 'thu', the: 'Kf2 kd9', chu: 'Tướng đang ở góc cung. Thử đưa nó ra ngoài: chạm Tướng rồi chạm ô bên phải.', tu: 'f2', den: 'g2' },
            { k: 'di', the: 'Ke0 kd9 pe1', chu: 'Tướng ăn được quân đứng sát nó, miễn ô đó không bị quân khác canh. Ăn Tốt đi.', dap: ['e0e1'], dung: 'Tốt này không có ai bảo vệ nên Tướng ăn an toàn.' },
            { k: 'thu', the: 'Kf0 ke9', chu: 'Luật riêng: hai Tướng không được nhìn thẳng mặt nhau trên một cột khi không có quân chắn. Thử đi Tướng sang cột giữa.', tu: 'f0', den: 'e0' },
            { k: 'hoi', chu: 'Tướng Đỏ muốn đi chéo một ô trong cung thì sao?', pa: ['Không được, Tướng chỉ đi ngang hoặc dọc', 'Được, vì vẫn ở trong cung', 'Được, nếu đang bị chiếu'], da: 0, giai: 'Đi chéo là việc của Sĩ. Tướng chỉ đi ngang hoặc dọc, mỗi lần 1 ô.' },
          ],
        },
        {
          ma: 'si', ten: 'Sĩ', quan: 'A', phut: 1, buoc: [
            { k: 'xem', the: 'Ae1 Ke0 kd9', chu: 'Sĩ (仕 bên Đỏ, 士 bên Đen) đi chéo 1 ô và cũng chỉ ở trong cung. Cả ván Sĩ có đúng 5 điểm để đứng.', cham: 'e1', o: ['d0', 'f0', 'e1', 'd2', 'f2'] },
            { k: 'di', the: 'Ae1 Ke0 kd9', chu: 'Đưa Sĩ lên góc cung bên trái.', dap: ['e1d2'] },
            { k: 'thu', the: 'Ad2 Ke0 kd9', chu: 'Thử đưa Sĩ ra ngoài cung, tới ô chéo phía trên bên trái.', tu: 'd2', den: 'c3' },
            { k: 'xem', the: 'Ke0 Ad0 Af0 Bc0 Bg0 kd9 re6', chu: 'Sĩ và Tượng đánh rất yếu, nhưng là cận vệ: đứng quanh Tướng để chặn đường chiếu. Mất chúng thì Tướng hở ngay.', o: ['d0', 'f0'] },
            { k: 'hoi', chu: 'Sĩ có bao nhiêu điểm để đứng trong cả ván?', pa: ['5 điểm', '9 điểm', '3 điểm'], da: 0, giai: 'Bốn góc cung và tâm cung, tổng cộng 5 điểm.' },
          ],
        },
        {
          ma: 'tuongv', ten: 'Tượng', quan: 'B', phut: 2, buoc: [
            { k: 'xem', the: 'Be2 Ke0 kd9', chu: 'Tượng (相 bên Đỏ, 象 bên Đen) đi chéo đúng 2 ô, như đi theo đường chéo của một ô lớn. Tượng ở đất mình suốt ván, tổng cộng có 7 điểm đứng.', cham: 'e2', o: ['c0', 'g0', 'a2', 'e2', 'i2', 'c4', 'g4'] },
            { k: 'di', the: 'Be2 Ke0 kd9', chu: 'Đi Tượng tới chấm trên cùng bên trái.', dap: ['e2c4'] },
            { k: 'thu', the: 'Bc4 Ke0 kd9', chu: 'Tượng đang ở sát sông. Thử cho nó qua sông, tới ô chéo phía trên bên phải.', tu: 'c4', den: 'e6' },
            { k: 'xem', the: 'Be2 pd3 Ke0 kd9', chu: 'Điểm giữa đường chéo gọi là mắt Tượng. Có quân đứng ở mắt thì Tượng bị chẹn, không đi hướng đó được. Xem chấm bên trái phía trên đã mất.', cham: 'e2', o: ['d3'] },
            { k: 'thu', the: 'Be2 pd3 Ke0 kd9', chu: 'Thử đi Tượng tới ô bị chẹn đó.', tu: 'e2', den: 'c4' },
            { k: 'hoi', chu: 'Tượng có chiếu Tướng đối phương được không?', pa: ['Không, vì không qua được sông', 'Được, nếu đứng sát sông', 'Được, khi Tướng ra khỏi cung'], da: 0, giai: 'Tượng chỉ ở đất mình nên không bao giờ đánh tới cung đối phương. Nó là quân phòng thủ.' },
          ],
        },
        {
          ma: 'xe', ten: 'Xe', quan: 'R', phut: 2, buoc: [
            { k: 'xem', the: 'Re4 Kf0 kd9', chu: 'Xe (俥 bên Đỏ, 車 bên Đen) đi thẳng theo hàng hoặc cột, bao xa cũng được, miễn không có quân chắn. Đây là quân mạnh nhất bàn.', cham: 'e4' },
            { k: 'di', the: 'Re4 Kf0 kd9', chu: 'Chạm Xe, rồi chạm một chấm bất kỳ.', tu: 'e4' },
            { k: 'di', the: 'Re4 nb4 pe7 Kf0 kd9', chu: 'Xe ăn quân đầu tiên nó gặp trên đường. Ăn Mã đi: Mã đáng giá hơn Tốt.', dap: ['e4b4'], sai: 'Tốt chỉ đáng 1, Mã đáng 4. Chọn quân giá trị hơn.' },
            { k: 'thu', the: 'Re4 Pe6 ne8 Kf0 kd9', chu: 'Tốt của mình đang chắn đường. Thử cho Xe nhảy qua để ăn Mã.', tu: 'e4', den: 'e8' },
            { k: 'an', the: 'Ra0 pa6 pe6 pe2 pc2 Kf0 kd9', chu: 'Bài tập: dùng Xe ăn hết 4 Tốt, càng ít nước càng giỏi.', toiDa: 4 },
            { k: 'hoi', the: 'Re4 Kf0 kd9', chu: 'Xe đứng ở ô này, bàn gần như trống. Nó đi được tổng cộng bao nhiêu ô?', pa: ['17 ô', '8 ô', '9 ô'], da: 0, giai: '8 ô trên hàng ngang và 9 ô trên cột dọc. Vì vậy Xe càng để trống đường càng mạnh.' },
          ],
        },
        {
          ma: 'phao', ten: 'Pháo', quan: 'C', phut: 3, buoc: [
            { k: 'xem', the: 'Ce2 Kf0 kd9', chu: 'Pháo (炮 bên Đỏ, 砲 bên Đen). Khi không ăn quân, Pháo đi giống Xe: thẳng theo hàng hoặc cột, không nhảy qua quân nào.', cham: 'e2' },
            { k: 'di', the: 'Ce2 pe6 ne8 Kf0 kd9', chu: 'Muốn ăn, Pháo phải nhảy qua đúng một quân ở giữa, gọi là ngòi. Tốt là ngòi ở đây. Hãy ăn Mã.', dap: ['e2e8'], dung: 'Pháo nhảy qua ngòi rồi ăn quân phía sau. Đây là điểm khác Xe.' },
            { k: 'thu', the: 'Ce2 pe6 Kf0 kd9', chu: 'Bây giờ không có ngòi. Thử cho Pháo ăn Tốt.', tu: 'e2', den: 'e6' },
            { k: 'thu', the: 'Ce2 pe5 pe6 ne8 Kf0 kd9', chu: 'Hai quân ở giữa thì sao? Thử cho Pháo ăn Mã.', tu: 'e2', den: 'e8' },
            { k: 'di', the: 'Ce2 Pe4 ne8 Kf0 kd9', chu: 'Ngòi là quân mình hay quân địch đều được. Dùng Tốt của mình làm ngòi, ăn Mã đi.', dap: ['e2e8'] },
            { k: 'hoi', the: 'Ce2 Pe5 re8 nb2 pg2 Kf0 kd9', chu: 'Pháo này đang ăn được quân nào?', pa: ['Xe, vì có đúng một ngòi ở giữa', 'Mã, vì đang cùng hàng', 'Tốt, vì đang cùng hàng'], da: 0, giai: 'Mã và Tốt ở cùng hàng nhưng không có ngòi nên chưa ăn được. Pháo gần quân địch mà không có ngòi thì vô hại.' },
          ],
        },
        {
          ma: 'ma', ten: 'Mã', quan: 'N', phut: 3, buoc: [
            { k: 'xem', the: 'Ne4 Kf0 kd9', chu: 'Mã (傌 bên Đỏ, 馬 bên Đen) đi hình chữ Nhật: một ô thẳng, rồi chéo thêm một ô. Đứng giữa bàn trống nó có tới 8 đường.', cham: 'e4' },
            { k: 'di', the: 'Ne4 Kf0 kd9', chu: 'Chạm Mã, rồi chạm một chấm bất kỳ.', tu: 'e4' },
            { k: 'xem', the: 'Ne4 Pe5 Kf0 kd9', chu: 'Quân đứng sát ngay hướng thẳng sẽ cản chân Mã. Tốt chắn phía trên nên 2 đường phía trên đã mất.', cham: 'e4', o: ['e5'] },
            { k: 'thu', the: 'Ne4 Pe5 Kf0 kd9', chu: 'Thử đi Mã tới ô bị cản.', tu: 'e4', den: 'd6' },
            { k: 'an', the: 'Nb0 pc2 pe3 pf5 Kf0 kd9', chu: 'Bài tập: dùng Mã ăn hết 3 Tốt, nối đường hình chữ Nhật.', toiDa: 3 },
            { k: 'hoi', the: 'Ne4 Pd4 Pe3 Kf0 kd9', chu: 'Mã này có mấy đường đi? Nhìn hai Tốt sát nó.', pa: ['4 đường', '6 đường', '8 đường'], da: 0, giai: 'Hướng xuống và hướng trái bị cản, mỗi hướng mất 2 đường. Còn 4 đường: hai đường phía trên, hai đường bên phải.' },
          ],
        },
        {
          ma: 'tot', ten: 'Tốt', quan: 'P', phut: 2, buoc: [
            { k: 'xem', the: 'Pe3 Kf0 kd9', chu: 'Tốt (兵 bên Đỏ, 卒 bên Đen) chỉ đi 1 ô mỗi nước, và chỉ đi tới trước. Mỗi bên có 5 Tốt.', cham: 'e3' },
            { k: 'di', the: 'Pe3 Kf0 kd9', chu: 'Đẩy Tốt lên 1 ô.', dap: ['e3e4'] },
            { k: 'xem', the: 'Pe5 Kf0 kd9', chu: 'Qua sông rồi Tốt đi được thêm sang ngang, có 3 hướng. Vì vậy Tốt qua sông đáng giá gấp đôi.', cham: 'e5' },
            { k: 'di', the: 'Pe5 nd5 Kf0 kg9', chu: 'Tốt ăn đúng theo hướng nó đi. Ăn Mã bên trái đi.', dap: ['e5d5'], dung: 'Tốt nhỏ mà ăn được Mã: nhớ để ý Tốt đã qua sông của đối phương.' },
            { k: 'thu', the: 'Pe5 Kf0 kd9', chu: 'Thử đi lùi xem sao.', tu: 'e5', den: 'e4' },
            { k: 'an', the: 'Pe4 pe5 nd5 rd6 Kf0 kg9', chu: 'Bài tập: dùng Tốt ăn hết 3 quân Đen.', toiDa: 3 },
            { k: 'hoi', chu: 'Tốt đi tới hàng cuối của đối phương thì sao?', pa: ['Vẫn là Tốt, chỉ còn đi ngang được', 'Được phong thành Xe', 'Bị loại khỏi bàn'], da: 0, giai: 'Cờ tướng không có phong cấp. Tốt xuống đáy chỉ còn đi ngang nên yếu đi nhiều, đừng đẩy xuống đáy sớm.' },
          ],
        },
        {
          ma: 'gia', ten: 'Quân nào đáng giá bao nhiêu', phut: 2, buoc: [
            { k: 'xem', the: 'dau', bang: true, chu: 'Để biết đổi quân lời hay lỗ, nhớ bảng này. Đơn vị là số Tốt.' },
            { k: 'hoi', chu: 'Xe ăn một Tốt, rồi bị Mã ăn lại. Đổi như vậy lời hay lỗ?', pa: ['Lỗ nặng: mất 9, được 1', 'Lời: ăn trước là lời', 'Hòa vốn: mỗi bên mất một quân'], da: 0, giai: 'Đừng đếm số quân, hãy đếm giá trị. Mất Xe để lấy Tốt là lỗ 8.' },
            { k: 'di', the: 'Ra5 ne5 ca7 ra9 Kf0 ke9', chu: 'Xe có hai lựa chọn: ăn Mã bên phải hoặc ăn Pháo phía trên. Nước nào lời? Xem kỹ ai đang bảo vệ quân nào.', dap: ['a5e5'], sai: 'Pháo có Xe Đen đứng sau bảo vệ: ăn xong bị ăn lại, mất Xe lấy Pháo.', dung: 'Mã không có ai bảo vệ nên ăn miễn phí, lại còn chiếu Tướng.' },
            { k: 'hoi', chu: 'Hai Tốt, một Tốt đã qua sông, một Tốt chưa. Tốt nào đáng giá hơn?', pa: ['Tốt đã qua sông, gấp đôi', 'Như nhau', 'Tốt chưa qua sông, vì còn xa nguy hiểm'], da: 0, giai: 'Tốt qua sông đi được ba hướng và áp sát cung đối phương.' },
          ],
        },
        {
          ma: 'chieu', ten: 'Chiếu và 3 cách thoát', phut: 3, buoc: [
            { k: 'xem', the: 'Ke0 re5 kd9', chu: 'Chiếu là dọa ăn Tướng ở nước kế. Xe Đen đang chiếu Tướng Đỏ. Bên bị chiếu phải xử lý ngay, không được làm việc khác.', mui: [['e5', 'e0']] },
            { k: 'di', the: 'Ke0 re5 kd9', chu: 'Cách 1: đi Tướng ra chỗ an toàn. Lưu ý cột trái có Tướng Đen nhìn xuống.', dap: ['e0f0'], dung: 'Đi lên ô trên vẫn dính cột của Xe, đi sang trái thì lộ mặt tướng. Chỉ còn sang phải.' },
            { k: 'di', the: 'Ke0 re5 kd9 Nc2', chu: 'Cách 2: chặn đường chiếu. Đưa Mã vào giữa Xe và Tướng.', dap: ['c2e1', 'c2e3'], sai: 'Bài này hãy thử cách chặn: đưa Mã vào cột giữa.' },
            { k: 'di', the: 'Ke0 re5 kd9 Ra5', chu: 'Cách 3: ăn luôn quân đang chiếu. Nếu được thì đây thường là cách tốt nhất.', dap: ['a5e5'], sai: 'Xe của mình đang cùng hàng với Xe Đen: ăn nó đi.' },
            { k: 'thu', the: 'Ke0 re5 kd9 Pa3', chu: 'Đang bị chiếu mà đi quân khác thì sao? Thử đẩy Tốt lên.', tu: 'a3', den: 'a4' },
            { k: 'xem', the: 'Ke0 ce5 Pe3 kd9 Nc2', chu: 'Pháo chiếu thì có thêm cách: đưa thêm một quân vào giữa cho thành 2 ngòi, Pháo sẽ hết chiếu. Ở đây Tốt Đỏ đang là ngòi, Mã nhảy vào cột giữa là hết chiếu.', mui: [['e5', 'e0']], o: ['e3'] },
            { k: 'cham', the: 'Ke0 nd2 ra7 cb5 kd9', chu: 'Thử mắt: chạm vào quân đang chiếu Tướng Đỏ.', dap: ['d2'], giai: 'Mã đứng ở đó đánh tới Tướng theo hình chữ Nhật. Mã chiếu thì không chặn giữa đường được, nhưng có thể chặn ngay ô chân Mã.' },
          ],
        },
        {
          ma: 'bi', ten: 'Chiếu bí, hết nước, hòa', phut: 3, buoc: [
            { k: 'xem', the: 'Ra9 Rb8 kd9 Kf0', ben: 'b', chu: 'Xe chiếu theo hàng trên cùng, Xe kia canh hàng ngay dưới. Tướng Đen đi đâu cũng chết, không chặn được, không ăn được: chiếu bí.', o: ['d9'], mui: [['a9', 'd9']] },
            { k: 'di', the: 'Ra5 Rb8 kd9 Kf0 pi6', chu: 'Đi một nước để chiếu bí Tướng Đen.', dap: ['a5a9'], bi: 1, dung: 'Bí! Hai Xe phối hợp: một Xe chặn hàng, một Xe chiếu.' },
            { k: 'xem', the: 'Ra8 Re5 kd9 Kf0', ben: 'b', chu: 'Khác cờ vua: hết nước đi cũng là thua. Tướng Đen không bị chiếu, nhưng ô nào cũng bị Xe canh, Đen không còn quân nào khác để đi. Đen thua.', o: ['d8', 'e9'] },
            { k: 'xem', the: 'dau', chu: 'Ván hòa khi: thế cờ lặp lại 3 lần mà không bên nào chiếu liên tục, hoặc 60 nước liền không ăn quân, hoặc hai bên đều hết Xe, Mã, Pháo, Tốt, hoặc hai bên đồng ý hòa.' },
            { k: 'xem', the: 'Ra2 kd9 Kf0', chu: 'Luật cấm trường chiếu: không được chiếu mãi một kiểu để cầu hòa. Trong app này, thế cờ lặp tới lần thứ 3 mà một bên chiếu liên tục thì bên đó bị xử thua.' },
            { k: 'hoi', chu: 'Tới lượt bạn, Tướng không bị chiếu nhưng không còn nước đi hợp lệ nào. Kết quả?', pa: ['Bạn thua', 'Hòa', 'Bỏ lượt, đối phương đi tiếp'], da: 0, giai: 'Cờ tướng không có hòa kiểu này: hết nước là thua.' },
          ],
        },
        {
          ma: 'ghi', ten: 'Đọc và ghi nước đi', phut: 4, buoc: [
            { k: 'xem', the: 'dau', chu: 'Mỗi bên đếm cột từ tay phải của mình, từ 1 tới 9. Số ở mép dưới là cột của Đỏ, số ở mép trên là cột của Đen.', dai: 'so' },
            { k: 'xem', chu: 'Một nước ghi 4 phần: tên quân, cột đang đứng, hướng đi, một con số. Ví dụ P2-5 đọc là Pháo cột 2 đi ngang sang cột 5.', kyHieu: true },
            { k: 'di', the: 'dau', chu: 'Đi nước P2-5.', ky: 'P2-5', dung: 'Pháo cột 2 đã sang cột 5. Dấu gạch ngang nghĩa là đi ngang, số cuối là cột đến.' },
            { k: 'di', the: 'dau', truoc: 'P2-5 M8.7', chu: 'Đen vừa đi M8.7. Giờ bạn đi M2.3.', ky: 'M2.3', dung: 'Dấu chấm là tiến. Mã đi chéo nên số cuối là cột đến, không phải số ô.' },
            { k: 'di', the: 'dau', truoc: 'P2-5 M8.7 M2.3 X9-8', chu: 'Đen vừa đi X9-8. Giờ bạn đi X1-2.', ky: 'X1-2' },
            { k: 'di', the: 'dau', truoc: 'P2-5 M8.7 M2.3 X9-8 X1-2 M2.3', chu: 'Đi X2.6: Xe cột 2 tiến 6 ô.', ky: 'X2.6', dung: 'Xe đi thẳng nên số cuối là số ô phải đi. Nhớ: Xe, Pháo, Tốt, Tướng đếm số ô; Mã, Sĩ, Tượng ghi cột đến.' },
            { k: 'xem', the: 'Ra4 Ra1 Kf0 kd9', chu: 'Hai quân cùng loại trên cùng một cột thì thay số cột bằng t (trước, gần phía địch) và s (sau). Ví dụ Xt.1 là Xe trước tiến 1.', o: ['a4', 'a1'] },
            { k: 'hoi', chu: 'X1/2 nghĩa là gì?', pa: ['Xe cột 1 lùi 2 ô', 'Xe cột 1 sang cột 2', 'Xe cột 2 lùi 1 ô'], da: 0, giai: 'Gạch chéo là lùi. Xe đi thẳng nên số cuối là số ô.' },
            { k: 'hoi', chu: 'Đen đi B3.1. Đó là nước gì?', pa: ['Tốt cột 3 của Đen tiến 1 ô', 'Tượng cột 3 tiến tới cột 1', 'Tốt Đỏ cột 3 tiến 1 ô'], da: 0, giai: 'B là Binh, tức Tốt. Bên nào đi thì đếm cột theo bên đó. Tượng ký hiệu là T.' },
          ],
        },
      ],
    },
    {
      chang: 'Nhìn thế cờ', mo: 'Cách đọc tổng quan cả bàn, không chỉ một quân.', bai: [
        {
          ma: 'nam', ten: '5 câu hỏi trước mỗi nước đi', phut: 4, buoc: [
            { k: 'xem', the: 'dau', chu: 'Người mới hay chỉ nhìn quân mình muốn đi. Cao thủ quét cả bàn trước. Tập hỏi đủ 5 câu sau, đúng thứ tự, trước mỗi nước.', ds: ['Tướng mình có đang bị chiếu không?', 'Nước vừa rồi của đối phương đang dọa gì?', 'Mình ăn được gì miễn phí không?', 'Mình chiếu được không? Chiếu xong thì sao?', 'Quân nào của mình đang rảnh? Đưa nó vào việc.'] },
            { k: 'cham', the: 'Ke0 Ad0 Rb0 Nc2 Pe3 Pa3 rh0 nb5 ke9 ad9 af9 pe6', chu: 'Câu 1: Tướng có bị chiếu không? Chạm vào quân đang chiếu.', dap: ['h0'], giai: 'Xe Đen chiếu theo hàng cuối qua khoảng trống. Đây là việc phải xử lý trước mọi thứ.' },
            { k: 'cham', the: 'Ke0 Ad0 Af0 Ra0 Nc2 Pe3 Pa3 ca5 ke9 ad9 af9 pe6', chu: 'Câu 2: Đen vừa đưa Pháo tới cột trái. Nó đang dọa gì? Chạm vào quân Đỏ đang bị dọa.', dap: ['a0'], giai: 'Tốt Đỏ thành ngòi, Pháo Đen nhảy qua ăn được Xe ở góc. Một nước tưởng vô hại có thể đang dọa quân lớn ở xa.' },
            { k: 'di', the: 'Ke0 Ad0 Af0 Ra2 Nc1 Pe3 nh2 re7 ke9 ad9 af9 pe6', chu: 'Câu 3: Mình ăn được gì miễn phí? Mã Đen đang đứng trên hàng của Xe, không ai bảo vệ.', dap: ['a2h2'], sai: 'Xe đang cùng hàng với Mã Đen và đường đã trống. Ăn nó.' },
            { k: 'di', the: 'Ke0 Ad0 Af0 Ra2 Pe3 re7 kd9 Nc5 pg6', chu: 'Câu 4: Chiếu được không? Nước Xe sang cột của Tướng Đen vừa chiếu, vừa làm Đen phải đi theo ý mình.', dap: ['a2d2'], sai: 'Tướng Đen đứng ở cột thứ tư từ trái. Đưa Xe sang cột đó.', dung: 'Chiếu là nước ép: đối phương không có quyền làm việc khác. Nhưng chỉ chiếu khi có lợi, chiếu suông chỉ đuổi Tướng tới chỗ tốt hơn.' },
            { k: 'cham', the: 'dau', truoc: 'P2-5 M8.7 M2.3 X9-8', chu: 'Câu 5: Yên ổn rồi thì quân nào đang rảnh nhất? Chạm vào một quân lớn của Đỏ chưa ra trận.', dap: ['i0', 'a0'], giai: 'Xe mạnh nhất mà nằm góc thì chưa làm được gì. Nước tốt là đưa nó ra cột trống.' },
          ],
        },
        {
          ma: 'bontru', ten: 'Bốn trụ của thế cờ', phut: 3, buoc: [
            { k: 'xem', the: 'dau', truoc: 'P2-5 M8.7 M2.3 X9-8 X1-2 M2.3 B7.1 B7.1 X2.6 P8-9 X2-3 P9/1', tq: true, chu: 'Mở nút Thế cờ trong ván là thấy bảng này. Cán cân là kết luận của máy. Bốn trụ cho biết vì sao.' },
            { k: 'xem', tq: true, chu: 'Quân số: cộng giá trị quân mỗi bên. Đây là thứ dễ thấy nhất nhưng chưa phải tất cả.' },
            { k: 'xem', tq: true, chu: 'An toàn Tướng: còn đủ Sĩ Tượng không, có quân địch áp sát không, có đường thẳng nào nhắm vào Tướng không. Kém quân mà Tướng đối phương hở thì vẫn thắng được.' },
            { k: 'xem', tq: true, chu: 'Quân linh hoạt: Xe, Mã, Pháo có nhiều đường đi không. Quân bị kẹt coi như không có.' },
            { k: 'xem', tq: true, chu: 'Sức ép: quân đã qua sông, đang đánh vào quân địch và vùng quanh Tướng đối phương. Bên ép nhiều thường nắm quyền chủ động.' },
            { k: 'hoi', chu: 'Bạn hơn 1 Mã nhưng Tướng mất cả hai Sĩ và Xe đối phương đã áp sát. Nên làm gì?', pa: ['Lo phòng thủ, đổi bớt quân đánh của đối phương trước', 'Mặc kệ, đang hơn quân là thắng', 'Đẩy thêm Tốt qua sông'], da: 0, giai: 'Tướng hở có thể thua ngay dù hơn quân. Khi một trụ quá yếu, sửa trụ đó trước.' },
          ],
        },
        {
          ma: 'bando', ten: 'Đọc bản đồ lực', phut: 2, buoc: [
            { k: 'xem', the: 'dau', truoc: 'P2-5 M8.7 M2.3 X9-8 X1-2 M2.3', luc: true, chu: 'Nút Bản đồ tô lên bàn vùng mỗi bên đang kiểm soát. Chấm đỏ: Đỏ canh ô đó mạnh hơn. Chấm xanh: Đen canh mạnh hơn. Chấm càng to càng chắc.' },
            { k: 'xem', luc: true, chu: 'Vòng rỗng là ô đang giằng co, hai bên canh ngang nhau. Đi quân vào đó thì phải tính kỹ.' },
            { k: 'hoi', chu: 'Muốn đưa Mã lên một ô, không có gì khác để cân nhắc. Nên chọn ô nào?', pa: ['Ô có chấm màu của mình', 'Ô có chấm màu đối phương', 'Ô nào cũng như nhau'], da: 0, giai: 'Ô màu mình nghĩa là mình bảo vệ nhiều hơn. Ô màu đối phương thì đứng vào dễ bị ăn.' },
            { k: 'xem', luc: true, chu: 'Mẹo tổng quan: nhìn vùng quanh hai cung. Cung của ai bị màu đối phương lấn vào nhiều thì Tướng người đó đang nguy.', dai: 'cung' },
          ],
        },
        {
          ma: 'treo', ten: 'Quân treo: đếm công và thủ', phut: 3, buoc: [
            { k: 'xem', the: 'Ra5 nd5 Ke0 kf9 rh9 Nc2', chu: 'Quân treo là quân bị đánh mà không ai bảo vệ. Xe Đỏ ăn được Mã Đen, và không có quân Đen nào ăn lại: Mã Đen đang treo.', o: ['d5'], mui: [['a5', 'd5']] },
            { k: 'cham', the: 'Ke0 Ad0 Nc4 Ra2 rc9 ce7 ke9 ad9 pa6', chu: 'Chạm vào quân Đỏ đang bị dọa mà không ai bảo vệ.', dap: ['c4'], giai: 'Xe Đen nhìn thẳng xuống Mã Đỏ cùng cột, không có quân Đỏ nào bảo vệ Mã. Thấy là phải xử lý ngay.' },
            { k: 'xem', the: 'Nc4 Rc0 Ke0 rc9 kf9 ae8', chu: 'Có người bảo vệ thì khác: Xe Đen ăn Mã (lấy 4) sẽ bị Xe Đỏ ăn lại (mất 9). Đen không dám. Đếm theo giá trị, không chỉ số quân.', o: ['c4'], mui: [['c9', 'c4'], ['c0', 'c4']] },
            { k: 'hoi', chu: 'Tốt của bạn bị Xe đối phương dọa, Tốt có Mã bảo vệ. Có cần lo không?', pa: ['Không, Xe ăn Tốt sẽ bị Mã ăn lại, lỗ nặng', 'Có, phải chạy ngay', 'Chỉ cần bảo vệ thêm một quân nữa'], da: 0, giai: 'Bên đánh bằng quân lớn thì sợ quân nhỏ bảo vệ. Ngược lại, Tốt đánh Xe thì Xe phải chạy dù có bảo vệ.' },
            { k: 'hoi', chu: 'Xe của bạn bị Tốt đối phương dọa, Xe có Sĩ bảo vệ. Có cần lo không?', pa: ['Có, Tốt ăn Xe thì lời to dù bị ăn lại', 'Không, đã có Sĩ bảo vệ', 'Không, Tốt quá nhỏ'], da: 0, giai: 'Quân nhỏ đánh quân lớn thì bảo vệ cũng không cứu được giá trị. Xe phải dời đi.' },
          ],
        },
        {
          ma: 'gd', ten: 'Ba giai đoạn của ván cờ', phut: 2, buoc: [
            { k: 'xem', the: 'dau', truoc: 'P2-5 M8.7 M2.3 X9-8', chu: 'Khai cuộc, khoảng 10 nước đầu: mục tiêu là ra quân. Đưa Xe, Mã, Pháo vào chỗ tốt và tranh quyền chủ động.' },
            { k: 'xem', the: 'dau', truoc: 'P2-5 M8.7 M2.3 B7.1 X1-2 X9-8 X2.6 M2.3 B7.1 P8-9 X2-3 P9/1', chu: 'Trung cuộc: hai bên đã giáp trận. Tìm chỗ yếu của Tướng đối phương, tìm đòn ăn quân, giữ cho quân mình phối hợp với nhau.' },
            { k: 'xem', the: 'Ra3 Pc5 Kf0 Ad0 Ae1 nb7 pg6 ke9 ad9', chu: 'Tàn cuộc, ít quân lớn: mỗi Tốt đều quý, Tướng cũng tham chiến vì ít bị chiếu hơn. Bên hơn quân chủ động đổi quân để giữ phần hơn.' },
            { k: 'hoi', chu: 'Đang hơn đối phương 1 Pháo ở trung cuộc. Bạn nên làm gì?', pa: ['Chủ động đổi quân lớn để đơn giản hóa', 'Tránh mọi cuộc đổi quân', 'Đem hết quân sang tấn công, bỏ phòng thủ'], da: 0, giai: 'Càng ít quân, 1 Pháo càng có trọng lượng. Đối phương kém quân mới là bên phải tránh đổi.' },
          ],
        },
      ],
    },
    {
      chang: 'Khai cuộc', mo: 'Mười nước đầu đi thế nào cho khỏi hớ.', bai: [
        {
          ma: 'baviec', ten: 'Ba việc đầu ván', phut: 3, buoc: [
            { k: 'demo', the: 'dau', chu: nghiKhai, nuoc: [
              ['P2-5', 'Pháo ra cột giữa, nhắm thẳng Tốt đầu của Đen. Đây là nước mở phổ biến nhất.'],
              ['M8.7', 'Đen lên Mã: Mã này bảo vệ Tốt đầu.'],
              ['M2.3', 'Đỏ lên Mã: vừa bảo vệ Tốt giữa của mình, vừa mở đường cho Xe góc.'],
              ['X9-8', 'Đen ra Xe sang cột trống, nhìn thẳng xuống đất Đỏ.'],
              ['X1-2', 'Đỏ cũng ra Xe. Sau 3 nước, Pháo, Mã, Xe đã vào trận.'],
            ] },
            { k: 'hoi', chu: 'Quân nào nên ra sau cùng trong khai cuộc?', pa: ['Sĩ và Tượng, chỉ đi khi cần', 'Xe', 'Mã'], da: 0, giai: 'Sĩ Tượng giữ cho Tướng kín. Ra Xe, Mã, Pháo trước để có lực đánh.' },
            { k: 'hoi', chu: 'Điều nào nên tránh trong 10 nước đầu?', pa: ['Đi đi lại lại một quân khi các quân khác còn chưa ra', 'Lên Mã', 'Đưa Xe ra cột trống'], da: 0, giai: 'Mỗi nước phí là đối phương được thêm một nước ra quân.' },
          ],
        },
        {
          ma: 'phaodau', ten: 'Pháo đầu đối Bình phong Mã', phut: 3, buoc: [
            { k: 'demo', the: 'dau', chu: 'Thế trận thường gặp nhất. Đỏ đánh ở giữa, Đen dựng hai Mã làm tấm chắn.', nuoc: [
              ['P2-5', 'Pháo đầu: dọa ăn Tốt giữa rồi chiếu.'],
              ['M8.7', 'Mã thứ nhất bảo vệ Tốt đầu.'],
              ['M2.3', 'Đỏ lên Mã, sẵn sàng ra Xe.'],
              ['B7.1', 'Đen đẩy Tốt cột 7 để Mã có đường tiến và kìm Mã Đỏ.'],
              ['X1-2', 'Xe Đỏ ra cột 2.'],
              ['X9-8', 'Xe Đen ra cột 8, sẵn sàng đối đầu.'],
              ['X2.6', 'Xe qua sông: ép vào hàng Tốt, gây sức ép sớm.'],
              ['M2.3', 'Mã thứ hai lên: đủ hai Mã, tức Bình phong Mã.'],
              ['B7.1', 'Đỏ đẩy Tốt để Mã có đường đi.'],
              ['P8-9', 'Pháo Đen né sang biên, mở đường cho Xe Đen đối đầu Xe Đỏ.'],
              ['X2-3', 'Xe né sang cột 3, vẫn ép Mã và Tốt.'],
              ['P9/1', 'Pháo lùi một ô, sắp sang đuổi Xe. Hai bên bước vào trung cuộc.'],
            ] },
            { k: 'hoi', chu: 'Vì sao Đen lên Mã ngay nước đầu khi thấy Pháo đầu?', pa: ['Để bảo vệ Tốt giữa đang bị Pháo nhắm', 'Để chiếu Tướng ngay', 'Để Pháo Đen có ngòi'], da: 0, giai: 'Pháo Đỏ cách Tốt giữa bằng đúng một ngòi là Tốt giữa của Đỏ. Không bảo vệ là mất Tốt và bị chiếu.' },
          ],
        },
        {
          ma: 'thuan', ten: 'Thuận pháo và Nghịch pháo', phut: 3, buoc: [
            { k: 'demo', the: 'dau', chu: 'Đen cũng đặt Pháo giữa để đánh trả. Pháo cùng phía gọi là Thuận pháo.', nuoc: [
              ['P2-5', 'Đỏ đặt Pháo đầu.'],
              ['P8-5', 'Đen đáp Pháo đầu, từ cùng phía bên mình: Thuận pháo. Thế trận đối công.'],
              ['M2.3', 'Đỏ lên Mã bảo vệ Tốt giữa.'],
              ['M8.7', 'Đen làm tương tự.'],
              ['X1-2', 'Đỏ ra Xe.'],
              ['X9-8', 'Đen ra Xe. Hai bên đối xứng, bên đi trước nhỉnh hơn một nhịp.'],
            ] },
            { k: 'demo', the: 'dau', chu: 'Pháo Đen đi từ phía đối diện thì gọi là Nghịch pháo, đánh nhau ác liệt hơn.', nuoc: [
              ['P2-5', 'Đỏ đặt Pháo đầu.'],
              ['P2-5', 'Đen đặt Pháo từ cột 2 của Đen, tức phía ngược lại.'],
              ['M2.3', 'Đỏ lên Mã.'],
              ['M2.3', 'Đen lên Mã.'],
              ['X1-2', 'Đỏ ra Xe.'],
              ['X1-2', 'Đen ra Xe. Hai Xe ở hai phía khác nhau nên đua nhau tấn công.'],
            ] },
            { k: 'hoi', chu: 'Hai Pháo giữa đối đầu nhau. Bên nào được ăn Tốt giữa trước?', pa: ['Bên tới lượt, nhưng phải tính bị ăn lại', 'Luôn là Đỏ', 'Không bên nào được ăn'], da: 0, giai: 'Pháo ăn Tốt giữa thì Tướng đối phương bị chiếu, nhưng Tốt có Mã bảo vệ thì Pháo mất. Vì vậy cả hai đều lên Mã trước.' },
          ],
        },
        {
          ma: 'em', ten: 'Khai cuộc êm: Phi Tượng, Tiến Tốt', phut: 2, buoc: [
            { k: 'demo', the: 'dau', chu: 'Không thích đánh nhau sớm thì chọn nước mở êm, xây thế chắc rồi mới tấn công.', nuoc: [
              ['T3.5', 'Phi Tượng: Tượng lên tâm, che cột giữa. Tướng rất kín.'],
              ['P8-4', 'Đen đặt Pháo vào cột 4 để tránh va chạm.'],
              ['M2.3', 'Đỏ lên Mã.'],
              ['M8.7', 'Đen lên Mã.'],
            ] },
            { k: 'demo', the: 'dau', chu: 'Tiến Tốt 7: một nước nhỏ nhưng mở đường cho Mã và thăm dò ý đồ đối phương.', nuoc: [
              ['B7.1', 'Đỏ đẩy Tốt cột 7. Tên cổ là Tiên nhân chỉ lộ: tiên chỉ đường.'],
              ['P2-3', 'Đen đặt Pháo đối diện Tốt: nếu Tốt đi tiếp sẽ bị đe dọa.'],
              ['P2-5', 'Đỏ quay lại đặt Pháo đầu.'],
              ['T3.5', 'Đen phi Tượng cho chắc.'],
            ] },
            { k: 'hoi', chu: 'Khi nào nên chọn khai cuộc êm?', pa: ['Khi muốn tránh đánh sớm, xây thế chắc', 'Khi cần chiếu bí nhanh', 'Khi đang hơn quân'], da: 0, giai: 'Người mới học nên tập Pháo đầu trước vì kế hoạch rõ. Khai cuộc êm cần hiểu thế cờ hơn.' },
          ],
        },
      ],
    },
    {
      chang: 'Đòn chiến thuật', mo: 'Những cú đánh làm đối phương mất quân.', bai: [
        {
          ma: 'batdoi', ten: 'Bắt đôi', phut: 3, buoc: [
            { k: 'di', the: 'Nc5 rb6 ke9 af9 Kd0 Af0', chu: 'Mã giỏi nhất món này. Tìm ô Mã đứng vào mà vừa chiếu Tướng, vừa đánh tới Xe.', dap: ['c5d7'], dung: 'Đen buộc phải lo cho Tướng, nước sau Mã ăn Xe. Đây gọi là Mã chiếu bắt Xe.' },
            { k: 'di', the: 'Re2 nb5 nh5 Ke0 Ad0 Af0 kd9 ae8', chu: 'Xe cũng bắt đôi được. Đưa Xe lên đúng hàng của hai Mã, không quân nào bảo vệ chúng.', dap: ['e2e5'], dung: 'Xe nhìn sang cả hai bên. Đen dời một Mã thì mất Mã kia.' },
            { k: 'hoi', chu: 'Vì sao bắt đôi mạnh?', pa: ['Đối phương chỉ đi được một nước nên chỉ cứu được một quân', 'Vì được đi hai lần', 'Vì quân bị bắt đôi không được di chuyển'], da: 0, giai: 'Trong khi đánh, luôn tìm ô từ đó quân mình đánh được hai mục tiêu cùng lúc.' },
          ],
        },
        {
          ma: 'ghim', ten: 'Ghim quân', phut: 2, buoc: [
            { k: 'xem', the: 'Ke0 Ne2 re7 kd9', chu: 'Mã Đỏ đang đứng giữa Xe Đen và Tướng Đỏ. Nó đang bị ghim: rời chỗ là Tướng bị chiếu, nên không được đi.', o: ['e2'], mui: [['e7', 'e2']] },
            { k: 'thu', the: 'Ke0 Ne2 re7 kd9', chu: 'Thử đi Mã bị ghim sang một ô khác.', tu: 'e2', den: 'c3' },
            { k: 'di', the: 'Re5 Ra7 ae8 rd7 ke9 Kf0', chu: 'Đảo lại: Sĩ giữa của Đen đang bị Xe Đỏ ghim. Xe Đen tưởng có Sĩ bảo vệ, nhưng Sĩ rời chỗ là Tướng bị chiếu. Ăn Xe Đen đi.', dap: ['a7d7'], sai: 'Xe ở hàng bên trái đang nhìn thẳng tới Xe Đen.', dung: 'Sĩ không ăn lại được, Đen còn hết nước đi: thắng luôn. Quân bị ghim thì những gì nó bảo vệ đều là của mình.' },
            { k: 'hoi', chu: 'Quân bị ghim có bảo vệ được quân khác không?', pa: ['Coi như không, vì nó không rời chỗ được', 'Có, như bình thường', 'Có, mạnh gấp đôi'], da: 0, giai: 'Quân bị ghim gần như vô dụng: đây là lúc nên đánh vào những gì nó đang bảo vệ.' },
          ],
        },
        {
          ma: 'chieurut', ten: 'Chiếu rút', phut: 2, buoc: [
            { k: 'xem', the: 'Re2 Ne5 ke9 Kf0 rb6', chu: 'Mã Đỏ đang che cho Xe Đỏ phía sau. Dời Mã đi là Xe chiếu Tướng ngay. Mã được tự do chọn chỗ để đánh quân khác.', mui: [['e2', 'e9']], o: ['e5'] },
            { k: 'di', the: 'Re2 Ne5 ke9 Kf0 rb6', chu: 'Tìm nước Mã vừa để lộ Xe chiếu, vừa đánh tới Xe Đen.', dap: ['e5d7'], dung: 'Đen phải lo cho Tướng, nước sau Mã ăn Xe. Đây là đòn mạnh nhất của người có Xe và Mã trên cùng một đường.' },
            { k: 'hoi', chu: 'Vì sao chiếu rút mạnh hơn chiếu thường?', pa: ['Quân vừa dời đi được tự do đánh chỗ khác, đối phương phải lo chiếu trước', 'Vì chiếu rút không chặn được', 'Vì chiếu rút tính là hai nước'], da: 0, giai: 'Thực chất bạn được đi hai việc trong một nước: chiếu và tấn công.' },
          ],
        },
        {
          ma: 'hysinh', ten: 'Hy sinh để chiếu bí', phut: 3, buoc: [
            { k: 'xem', the: '3ak4/4a4/c6N1/9/4R4/9/1R7/3p5/4K4/9 w', chu: 'Đôi khi bỏ quân lớn lại thắng ngay. Sĩ giữa đang che Tướng, đường trên cùng thì Sĩ trái chắn. Hãy tìm cách phá hai quân này.', o: ['e8', 'd9'] },
            { k: 'giai', chu: 'Bí trong 2 nước. Nước đầu phải bỏ Xe: Xe ăn Sĩ giữa, chiếu. Đen buộc phải ăn lại, thế là đường trên cùng bị bỏ trống.', n: 2, dung: 'Sĩ trái rời chỗ để ăn Xe, nên Xe còn lại đi thẳng lên hàng trên cùng mà chiếu bí. Mất một Xe đổi lấy cả ván.' },
            { k: 'hoi', chu: 'Khi nào nên nghĩ tới hy sinh?', pa: ['Khi tính được chắc chắn đường chiếu bí hoặc ăn lại nhiều hơn', 'Khi đang chán', 'Bất cứ khi nào hơn quân'], da: 0, giai: 'Hy sinh phải có tính toán. Dùng phần Giải thế cờ để tập nhìn những cú đánh này.' },
          ],
        },
      ],
    },
    {
      chang: 'Sát cục', mo: 'Các hình chiếu bí quen thuộc, gặp là biết kết thúc.', bai: [
        {
          ma: 'songxe', ten: 'Song Xe', phut: 2, buoc: [
            { k: 'xem', the: 'Ra9 Rb8 kd9 Kf0', ben: 'b', chu: 'Đơn giản và mạnh nhất: một Xe canh hàng để Tướng không chạy lên xuống được, Xe kia chiếu.', o: ['d9'], mui: [['a9', 'd9']] },
            { k: 'di', the: 'Rb5 Ra8 ke9 Kd0 pi6', chu: 'Một Xe đang canh hàng thứ hai từ trên xuống. Đưa Xe còn lại lên hàng trên cùng để bí.', dap: ['b5b9'], bi: 1 },
            { k: 'giai', the: 'Ra3 Rh4 ke9 Kd0 pi6', chu: 'Chưa có Xe nào canh hàng. Bí trong 2 nước: đặt một Xe chặn đường trước, rồi Xe kia kết thúc.', n: 2, dung: 'Luôn nhớ công thức hai Xe: một Xe canh, một Xe chiếu.' },
          ],
        },
        {
          ma: 'dien', ten: 'Lộ mặt tướng', phut: 2, buoc: [
            { k: 'xem', the: 'kd9 Ke0 Rd5', ben: 'b', chu: 'Tướng mình cũng là quân đánh: nó cấm Tướng đối phương bước vào cột của nó. Tướng Đen không sang cột giữa được, mà Xe đang chiếu cả cột bên.', mui: [['d5', 'd9'], ['e0', 'e9']] },
            { k: 'di', the: 'kd9 Ke0 Ra5 pi6', chu: 'Chỉ cần một Xe và Tướng mình. Chiếu bí trong 1 nước.', dap: ['a5d5'], bi: 1, dung: 'Đây là Bạch diện: Tướng đứng cột giữa, Xe chiếu cột bên. Hai Tướng đối mặt là điều cấm nên cột giữa coi như bị canh.' },
          ],
        },
        {
          ma: 'trungphao', ten: 'Trùng Pháo', phut: 2, buoc: [
            { k: 'xem', the: 'ke9 ad9 af9 Ce6 Ce5 Kd0', ben: 'b', chu: 'Hai Pháo cùng cột: Pháo sau dùng Pháo trước làm ngòi để chiếu. Sĩ che hai bên nên Tướng không chạy ngang được, lên một ô vẫn dính cột.', mui: [['e5', 'e9']] },
            { k: 'di', the: 'ke9 ad9 af9 Ce6 Cc5 Kd0', chu: 'Đặt Pháo thứ hai vào cột giữa để bí.', dap: ['c5e5'], bi: 1, dung: 'Đen chen quân vào giữa cũng vô ích: khi đó Pháo trước lại có ngòi và chiếu tiếp.' },
          ],
        },
        {
          ma: 'mahau', ten: 'Mã hậu Pháo', phut: 2, buoc: [
            { k: 'xem', the: 'ke9 Ne7 Ce4 Kd0', ben: 'b', chu: 'Mã đứng sát trước Tướng làm ngòi, Pháo chiếu từ sau Mã. Mã còn canh hai ô bên cạnh Tướng, nên Tướng hết đường.', mui: [['e4', 'e9']], o: ['d9', 'f9'] },
            { k: 'di', the: 'ke9 Ne7 Cb4 Kd0', chu: 'Đưa Pháo vào đúng cột để bí.', dap: ['b4e4'], bi: 1, dung: 'Mã hậu Pháo là hình bí đẹp và rất hay gặp.' },
          ],
        },
        {
          ma: 'muon', ten: 'Muộn cung', phut: 2, buoc: [
            { k: 'xem', the: 'ke9 ad9 ae8 Ca9 Kd0', ben: 'b', chu: 'Tướng bị chính Sĩ của mình bịt đường. Pháo chiếu qua Sĩ theo hàng ngang, Tướng ở đâu trên hàng đó cũng dính, ô phía trên thì Sĩ chiếm mất.', mui: [['a9', 'e9']] },
            { k: 'di', the: 'ke9 ad9 ae8 Ca5 Kd0', chu: 'Đưa Pháo lên hàng trên cùng để bí.', dap: ['a5a9'], bi: 1, dung: 'Sĩ che chắn tưởng an toàn, nhưng khi chật quá lại thành cái bẫy cho Tướng nhà.' },
          ],
        },
        {
          ma: 'ngoatao', ten: 'Ngọa tào Mã', phut: 2, buoc: [
            { k: 'xem', the: 'ke9 ad9 af9 Ng8 Ra8 Kd0', ben: 'b', chu: 'Mã đứng ở ô cạnh góc cung của đối phương, đánh tới Tướng ở giữa hàng cuối. Hai Sĩ bịt đường ngang, Xe canh hàng trên, Tướng hết đường.', o: ['g8'], mui: [['g8', 'e9']] },
            { k: 'di', the: 'ke9 ad9 af9 Ni7 Ra8 Kd0 pi6', chu: 'Xe đang canh hàng thứ hai. Đưa Mã vào đúng ô để bí.', dap: ['i7g8'], bi: 1, dung: 'Ngọa tào nghĩa là Mã nằm ở máng. Mã và Xe phối hợp thế này rất khó đỡ.' },
          ],
        },
        {
          ma: 'quai', ten: 'Quải giác Mã', phut: 2, buoc: [
            { k: 'xem', the: 'ke9 ad9 af9 Nd7 Ra8 Kd0', ben: 'b', chu: 'Mã đứng ở góc cung, nhảy tới Tướng ở đáy cung. Hai Sĩ bịt hai bên, Xe canh hàng trên nên Tướng không chạy được.', o: ['d7'], mui: [['d7', 'e9']] },
            { k: 'di', the: 'ke9 ad9 af9 Nc5 Ra8 Kd0 pi6', chu: 'Đưa Mã lên góc cung để bí.', dap: ['c5d7'], bi: 1, dung: 'Mã treo ở góc cung nên gọi là Quải giác. Muốn phá phải dời Sĩ từ sớm, hoặc giữ ô chân Mã.' },
          ],
        },
        {
          ma: 'xephao', ten: 'Xe Pháo phối hợp', phut: 2, buoc: [
            { k: 'xem', the: 'ke9 Rf8 Ce5 Pe6 Kd0', ben: 'b', chu: 'Xe canh hàng ngay dưới và cột bên phải, Tướng Đỏ canh cột bên trái, Pháo chiếu dọc cột giữa qua ngòi. Tướng Đen hết đường.', mui: [['e5', 'e9']] },
            { k: 'di', the: 'ke9 Rf8 Cb5 Pe6 Kd0 pa6', chu: 'Đưa Pháo vào cột giữa để bí. Tốt của mình đã sẵn làm ngòi.', dap: ['b5e5'], bi: 1, dung: 'Mỗi quân canh một hướng. Nhìn ô thoát của Tướng rồi phân việc cho từng quân, đó là cách nghĩ khi tìm đường bí.' },
          ],
        },
      ],
    },
    {
      chang: 'Tàn cuộc', mo: 'Khi còn ít quân: giữ phần hơn, tận dụng từng Tốt.', bai: [
        {
          ma: 'xedon', ten: 'Xe dồn Tướng', phut: 2, buoc: [
            { k: 'xem', the: 'Rb5 Ke0 kd9', chu: 'Một Xe và Tướng thắng được Tướng lẻ. Bí quyết: Tướng mình chiếm cột giữa để cấm Tướng đối phương sang đó, Xe lùa dần.', mui: [['e0', 'e9']] },
            { k: 'di', the: 'Rb5 Ke0 kd9 pi6', chu: 'Bí trong 1 nước: chiếu dọc cột của Tướng Đen.', dap: ['b5d5'], bi: 1 },
            { k: 'di', the: 'Rb5 Ke0 kf8 pi6', chu: 'Tướng Đen ở cột bên phải. Xe sang chiếu theo cột đó: Tướng không vào được cột giữa.', dap: ['b5f5'], bi: 1, sai: 'Xe cần đứng cùng cột với Tướng Đen, phía dưới nó.' },
            { k: 'hoi', chu: 'Đơn Xe gặp Tướng còn đủ hai Sĩ hai Tượng thì sao?', pa: ['Thường là hòa, rất khó thắng', 'Thắng dễ', 'Xe thua'], da: 0, giai: 'Sĩ Tượng đủ thì che được hầu hết đường chiếu. Vì vậy khi kém quân, giữ Sĩ Tượng là cách cầu hòa tốt.' },
          ],
        },
        {
          ma: 'totcao', ten: 'Tốt cao, Tốt đáy', phut: 2, buoc: [
            { k: 'xem', the: 'Pe6 Kd0 kf9', chu: 'Tốt chưa xuống đáy còn tiến và ngang được. Đừng vội đẩy: Tốt ở hàng cao, gần cung vẫn đánh được, xuống đáy là mất tác dụng tiến.', cham: 'e6' },
            { k: 'xem', the: 'Pe9 Kd0 kf8', chu: 'Tốt đã xuống đáy chỉ còn đi ngang. Thế này không chiếu bí được Tướng nữa nếu Tướng đứng trên nó.', cham: 'e9' },
            { k: 'giai', the: 'Pe6 Kd0 ke9', chu: 'Một Tốt cao và Tướng là đủ thắng Tướng lẻ. Tướng mình đang cấm cột bên trái. Thắng trong 2 nước.', n: 2, dung: 'Đen hết nước đi là thua. Nếu Tốt đã xuống đáy sớm thì không làm được việc này.' },
            { k: 'hoi', chu: 'Tàn cuộc Tốt và Tướng, Tốt của bạn nên đi thế nào?', pa: ['Giữ ở hàng cao, phối hợp với Tướng', 'Đẩy xuống đáy càng nhanh càng tốt', 'Đi ngang liên tục cho đối phương rối'], da: 0, giai: 'Tốt xuống đáy là mất lực. Tướng đứng đúng cột để hỗ trợ thì Tốt mới bí được Tướng đối phương.' },
          ],
        },
        {
          ma: 'doiquan', ten: 'Hơn quân thì đổi quân', phut: 2, buoc: [
            { k: 'xem', the: 'Ra5 Rc3 Pe4 Ke0 Ad0 ra8 nc7 pg6 kd9 ae8', chu: 'Đỏ có hai Xe, Đen có Xe và Mã. Đổi Xe xong Đen chỉ còn Mã và Tốt, Đỏ thắng dễ. Hơn quân thì đổi là chiến lược đơn giản nhất.' },
            { k: 'di', the: 'Ra5 Rc3 Pe4 Ke0 Ad0 ra8 nc7 pg6 kd9 ae8', chu: 'Xe Đen có Mã bảo vệ. Ăn nó đi: Mã ăn lại thì hai bên đổi Xe, đúng ý mình.', dap: ['a5a8'], sai: 'Xe cùng cột với Xe Đen là Xe có thể ăn nó ngay.' },
            { k: 'hoi', chu: 'Nếu đang kém quân, bạn nên làm gì?', pa: ['Tránh đổi quân, giữ quân để phản công', 'Đổi càng nhiều càng tốt', 'Đổi hết Sĩ Tượng trước'], da: 0, giai: 'Bên kém mà đổi hết thì phần thiếu càng lộ rõ. Giữ quân lại để còn cơ hội đánh đòn.' },
          ],
        },
      ],
    },
  ];
})();
if (typeof module !== 'undefined') module.exports = (typeof window !== 'undefined' ? window : globalThis).CO_DL;
