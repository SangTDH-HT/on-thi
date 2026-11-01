/* Cấu hình phần mua mật khẩu trên bản web. Điền sau khi cài máy chủ bán mã (may_chu/HUONG_DAN.md);
   còn trống thì trang chưa hiện phần mua. Hai giá trị này không bí mật. */
window.CAU_HINH = {
  mayChu: '',           // URL web app Apps Script, dạng https://script.google.com/macros/s/…/exec
  googleClientId: '',   // Client ID OAuth (Web) có nguồn gốc https://sangtdh-ht.github.io
  gia: 30000,           // giá hiện trên trang (số tiền thật lấy từ máy chủ, thuộc tính GIA)
};
