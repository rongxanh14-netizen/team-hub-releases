## Team Hub 1.5.3

- Campaign trên thanh bên: theo dõi task lớn bằng mã Jira, biểu đồ tiến trình và trạng thái subtask, không giới hạn theo tuần.
- Calendar hiển thị task chưa có hạn dạng card với bộ chọn ngày theo UI app. Assignee của mục này trong Planner gồm Design và Video.
- Calendar Planner lấy task theo Reporter thuộc Planner, bao gồm task giao cho Design và Video.
- Dashboard có danh sách task khi bấm biểu đồ, thống kê tổng độ khó và tải report HTML. Bỏ bảng Công việc trong kỳ; tổng và tỷ lệ không tính Pending, Cancel/Delete.
- Đồng bộ bảng màu trạng thái Dashboard và Campaign: đỏ, vàng, tím, xanh dương, xanh lá.
- Tự đồng bộ 5 phút, kể cả thu nhỏ app; giữ thông báo hệ điều hành và animation.
- Tối ưu xử lý Epic, bộ lọc và bộ nhớ danh sách Campaign.
- Không có nút xem thử animation trong bản phát hành.

## Cài đặt

- Windows x64: `Team-Hub-Setup-1.5.3.exe`. Bản cài đặt hỗ trợ kiểm tra cập nhật trong app.
- macOS Intel và Apple Silicon: `Team-Hub-1.5.3-macOS-universal.dmg`.
- Bản macOS chưa có chữ ký Developer ID/notarization của Apple; chưa xác nhận cập nhật tự động trên máy Mac. Bản 1.5.2 chỉ có DMG, nên hãy tải bộ cài mới để nâng cấp.
- Cấu hình team nội bộ, tài khoản và API token Jira không nằm trong source hoặc bộ cài công khai. Giữ cấu hình và đăng nhập hiện tại; máy mới cần nhập cấu hình nội bộ riêng.
