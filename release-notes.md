## macOS 1.5.5
- Sửa nhánh ghi nhớ email/API Jira: dùng API Keychain tương thích Electron 44 trên macOS, kiểm tra mã hóa/giải mã trước khi bật ghi nhớ.
- Tăng thời gian chờ kho bảo mật lên 120 giây; sửa hướng dẫn đang ghi Windows.
- Giữ tất cả cải tiến Dashboard, Epic, Calendar và Campaign của 1.5.4.
- Token vẫn được mã hóa trên máy. Không có thông tin đăng nhập/cấu hình team nội bộ trong bộ cài.

### Cài trên Mac
Tải **Team-Hub-1.5.5-macOS-universal.dmg** (Intel và Apple Silicon), đóng Team Hub, kéo app vào Applications để thay bản cũ, rồi mở lại. Nếu Keychain hỏi quyền, cho phép Team Hub để dùng Ghi nhớ đăng nhập.

Bản này chưa được ký Developer ID/notarize. Vì vậy chưa đảm bảo auto-install trong app macOS; dùng DMG để cập nhật. Kiểm thử tự động chạy trên macOS; vẫn cần xác nhận lưu đăng nhập trên Keychain của máy người dùng.

### Windows
Windows vẫn là **1.5.4**. Bộ cài và latest.yml 1.5.4 được giữ trong release này để kênh cập nhật Windows tiếp tục hoạt động.
