# E-Market – Chợ Điện Tử Trực Tuyến Đa Gian Hàng (Multi-Vendor)

Dự án môn **Công Nghệ Phần Mềm** được xây dựng bám sát 100% tài liệu đặc tả:
- **PHẦN 1 (PD):** Thiết kế sản phẩm E-Market đa gian hàng (Multi-vendor) tập trung các ngách chuyên biệt (Nông sản sạch, Sản phẩm số & Sáng tạo, Đồ cũ Vintage, Thủ công mỹ nghệ).
- **PHẦN 2 (CRS):** Đầy đủ **5 Tác nhân (Actors)** và **18 Yêu cầu chức năng (FR01 – FR18)** cùng các yêu cầu phi chức năng (**NFR01 – NFR07**).
- **PHẦN 3 (RA):** Tích hợp sẵn Script Seed dữ liệu mẫu (R04), Cổng thanh toán VNPay/MoMo Sandbox có dự phòng COD (R06), Mã hóa mật khẩu `bcrypt` + `JWT` + phân quyền RBAC (R05).
- **PHẦN 4 (TS):** Kiến trúc 3 lớp (**3-Tier Architecture**: Presentation Layer `ReactJS + TailwindCSS`, Business Logic Layer `Node.js + Express`, Data Layer `MySQL 8.0 / SQLite`).

---

## 1. Cấu trúc thư mục dự án

```text
├── backend/                        # Business Logic Layer (Node.js + Express + JWT + bcrypt)
│   ├── src/
│   │   ├── db.js                   # Khởi tạo CSDL & Seed dữ liệu mẫu tự động (9 bảng ERD)
│   │   ├── seed.js                 # Script reset dữ liệu mẫu (npm run seed)
│   │   ├── server.js               # RESTful API Endpoints (FR01 - FR18)
│   │   └── middleware/auth.js      # Middleware xác thực JWT & Phân quyền (RBAC)
│   └── package.json
├── frontend/                       # Presentation Layer (ReactJS + Vite + TailwindCSS)
│   ├── src/
│   │   ├── App.jsx                 # Trang chủ Chợ E-Market, Bộ lọc đa tiêu chí & Thanh chuyển nhanh 5 Actor
│   │   ├── api.js                  # Kết nối REST API & Quản lý JWT Token
│   │   └── components/
│   │       ├── BuyerModals.jsx     # Đăng ký/Đăng nhập, Chi tiết SP, Giỏ hàng 3 bước, VNPay Sandbox, Đơn mua
│   │       └── RoleDashboards.jsx  # Seller Center, Admin Portal, Shipper Delivery App
│   └── package.json
├── database/
│   └── emarket_mysql8.sql          # File SQL chuẩn MySQL 8.0 (9 bảng thực thể chính theo ERD mục 4.3)
├── images/                         # Hình ảnh các biểu đồ UML (Use Case, Sequence, Class Diagram)
├── Bao_Cao_Cong_Nghe_Phan_Mem_E_Market.docx  # File Word báo cáo hoàn chỉnh
└── Bao_Cao_Cong_Nghe_Phan_Mem_E_Market.md    # File Markdown báo cáo
```

---

## 2. Tài khoản Demo sẵn có (Mật khẩu / OTP chung: `123456`)

> **Mẹo khi thuyết trình / demo trên lớp:** Ngay trên thanh trên cùng của giao diện Web có sẵn **Thanh chuyển nhanh 5 Actor (1-Click Demo Switcher)** giúp chuyển đổi tức thì giữa 5 vai trò mà không cần gõ lại tài khoản!

| STT | Vai trò (Actor) | Email đăng nhập | Mật khẩu / OTP | Chức năng chính |
| :-: | :--- | :--- | :---: | :--- |
| 1 | **Guest (Khách)** | *(Không cần đăng nhập)* | — | Xem sản phẩm, tìm kiếm/lọc đa tiêu chí, xem gian hàng, đăng ký (FR01, FR03, FR04) |
| 2 | **Buyer (Người mua)** | `buyer@emarket.vn` | `123456` | Giỏ hàng, Đặt hàng 3 bước, Thanh toán VNPay/MoMo Sandbox & COD, Theo dõi đơn, Đánh giá sao (FR02–FR09) |
| 3 | **Seller (Người bán)** | `seller@emarket.vn` | `123456` | Quản lý gian hàng, Đăng/sửa/xóa sản phẩm, Xác nhận đơn hàng, Thống kê doanh thu (FR10–FR13) |
| 4 | **Admin (Quản trị viên)** | `admin@emarket.vn` | `123456` | Duyệt mở gian hàng, Kiểm duyệt/ẩn sản phẩm vi phạm, Khóa/mở khóa User, Báo cáo GMV toàn sàn (FR14–FR17) |
| 5 | **Shipper (Giao hàng)** | `shipper@emarket.vn` | `123456` | Nhận đơn đã xác nhận, Cập nhật trạng thái Đang giao / Đã giao thành công (FR18) |

---

## 3. Hướng dẫn cài đặt & chạy dự án

### Bước 1: Chạy Backend API (Cổng `5000`)
```bash
cd backend
npm install
npm start
```

### Bước 2: Chạy Frontend ReactJS (Cổng `5173`)
```bash
cd frontend
npm install
npm run dev
```
Sau đó mở trình duyệt tại địa chỉ: **http://localhost:5173**

