## macOS 1.5.6 — Ghi nhớ đăng nhập không giới hạn
- Thay nhánh lưu khóa trên Mac bằng Keychain thông qua công cụ /usr/bin/security có sẵn của Apple, không phụ thuộc danh tính ký của Electron safeStorage.
- Email/API token được mã hóa AES-256-GCM; khóa nằm trong Keychain. Không lưu token hay khóa mã hóa dạng văn bản vào file, log hoặc tham số dòng lệnh.
- Ghi nhớ không có ngày hết hạn trong Team Hub. Khôi phục khi mở app kể cả cookie đã hết hạn hoặc bị xóa; chỉ app desktop được phép khôi phục.
- Khi phiên 8 giờ hết hạn, tự xác thực lại bằng thông tin đã ghi nhớ và tiếp tục thao tác, không bắt nhập API lại.
- Mất mạng hoặc Keychain đang khóa không xóa thông tin đã lưu. Hiển thị tùy chọn Ghi nhớ trên app thay vì âm thầm ẩn.
- Đăng xuất sẽ xóa thông tin ghi nhớ. Vẫn cần nhập API mới nếu Jira thu hồi/hết hạn token hoặc người dùng xóa dữ liệu app/Keychain.

### Cài trên Mac
Tải **Team-Hub-1.5.6-macOS-universal.dmg** (Intel và Apple Silicon), đóng app, kéo Team Hub vào Applications và thay bản cũ. Bật **Ghi nhớ đăng nhập** khi đăng nhập. Bản cũ chưa lưu thành công thì cần nhập email/API một lần sau khi nâng cấp.

Kiểm thử bao gồm Keychain thật trên macOS trong kho test riêng, đọc lại qua tiến trình mới, giả lập nhiều năm sau, tự khôi phục phiên, logout và lỗi mạng. Không thử bằng API Jira cá nhân trên CI.

Chưa có Developer ID/notarization; cập nhật bằng DMG, chưa bảo đảm tự cài cập nhật trong app Mac.

### Windows
Giữ bộ cài và kênh cập nhật **Windows 1.5.4**. Không có cấu hình team hay API Jira cá nhân trong source/bộ cài công khai.
