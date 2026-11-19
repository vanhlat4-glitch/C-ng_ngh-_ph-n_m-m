const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'emarket.sqlite');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'BUYER', -- BUYER, SELLER, ADMIN, SHIPPER
      phone TEXT,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, LOCKED
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      logo TEXT,
      niche TEXT DEFAULT 'Nông sản & Đặc sản',
      status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, REJECTED, HIDDEN
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      description TEXT,
      icon TEXT DEFAULT 'Package',
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      images TEXT, -- JSON array of image URLs
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, HIDDEN, VIOLATION
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(buyer_id, product_id),
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      shop_id INTEGER NOT NULL,
      shipper_id INTEGER DEFAULT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, SHIPPING, COMPLETED, CANCELLED
      payment_method TEXT NOT NULL DEFAULT 'COD', -- COD, VNPAY, MOMO, BANK
      address TEXT NOT NULL,
      phone TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT,
      FOREIGN KEY (shipper_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, FAILED, REFUNDED
      transaction_code TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      order_id INTEGER DEFAULT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      seller_reply TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
}

function seedIfNeeded(force = false) {
  initSchema();

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (countRow && countRow.cnt > 0 && !force) {
    return;
  }

  if (force) {
    db.exec(`
      DELETE FROM reviews;
      DELETE FROM payments;
      DELETE FROM order_details;
      DELETE FROM orders;
      DELETE FROM carts;
      DELETE FROM products;
      DELETE FROM categories;
      DELETE FROM shops;
      DELETE FROM users;
      DELETE FROM sqlite_sequence;
    `);
  }

  const passwordHash = bcrypt.hashSync('123456', 10);

  // 1. Seed Users (Admin, Buyers, Sellers, Shippers)
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, address, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('Quản trị viên E-Market', 'admin@emarket.vn', passwordHash, 'ADMIN', '0901000001', 'Tòa nhà Innovation, Quận 1, TP.HCM', 'ACTIVE');
  insertUser.run('Nguyễn Minh Anh (Buyer)', 'buyer@emarket.vn', passwordHash, 'BUYER', '0902000002', '125 Nguyễn Huệ, Quận 1, TP.HCM', 'ACTIVE');
  insertUser.run('Trần Hoàng Nam (Buyer)', 'nam.buyer@emarket.vn', passwordHash, 'BUYER', '0902000009', '48 Cầu Giấy, Hà Nội', 'ACTIVE');
  insertUser.run('Lê Thảo Nguyên (Chủ Nông Sản Đà Lạt)', 'seller@emarket.vn', passwordHash, 'SELLER', '0903000003', 'Khu Nông Nghiệp Công Nghệ Cao, Đà Lạt', 'ACTIVE');
  insertUser.run('Phạm Quốc Bảo (Chủ Creative & Digital)', 'seller2@emarket.vn', passwordHash, 'SELLER', '0903000004', 'Thảo Điền, TP. Thủ Đức, TP.HCM', 'ACTIVE');
  insertUser.run('Hoàng Gia Huy (Chủ Tiệm Đồ Cũ Vintage)', 'seller3@emarket.vn', passwordHash, 'SELLER', '0903000005', 'Phố Cổ, Hoàn Kiếm, Hà Nội', 'ACTIVE');
  insertUser.run('Đặng Thu Hà (Chủ Làng Nghề Gốm Việt)', 'seller4@emarket.vn', passwordHash, 'SELLER', '0903000006', 'Bát Tràng, Gia Lâm, Hà Nội', 'ACTIVE');
  insertUser.run('Võ Văn Tùng (Shipper Nhanh)', 'shipper@emarket.vn', passwordHash, 'SHIPPER', '0904000007', 'Trạm Giao Nhận Trung Tâm, Quận 3, TP.HCM', 'ACTIVE');

  // 2. Seed Shops (3 Active + 1 Pending for Admin FR14 demo)
  const insertShop = db.prepare(`
    INSERT INTO shops (seller_id, name, description, logo, niche, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertShop.run(
    4,
    'Đà Lạt Farm & Organics',
    'Chuyên nông sản sạch Đà Lạt thu hoạch trong ngày, mật ong rừng, trà thảo mộc và trái cây sấy hữu cơ đạt chuẩn VietGAP.',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
    'Nông sản sạch',
    'ACTIVE'
  );
  insertShop.run(
    5,
    'Pixel & Craft Studio',
    'Gian hàng sản phẩm số & phụ kiện bàn làm việc cho nhà sáng tạo: bộ icon 3D, template Notion, bàn phím cơ custom và đèn decor.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
    'Sản phẩm số & Sáng tạo',
    'ACTIVE'
  );
  insertShop.run(
    6,
    'Retro Saigon Secondhand',
    'Tiệm đồ cũ tuyển chọn: máy ảnh film cổ điển, đĩa than vinyl, sách cũ hiếm và đồng hồ vintage đã qua kiểm định chất lượng.',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&auto=format&fit=crop&q=80',
    'Đồ cũ tuyển chọn',
    'ACTIVE'
  );
  insertShop.run(
    7,
    'Gốm Mộc Bát Tràng Handmade',
    'Gian hàng thủ công mỹ nghệ truyền thống: ấm chén gốm men hỏa biến, bình hoa vẽ tay và đồ trang trí nội thất mộc mạc.',
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&auto=format&fit=crop&q=80',
    'Thủ công mỹ nghệ',
    'PENDING'
  );

  // 3. Seed Categories (matching NFR05 & R08 specialized niches)
  const insertCategory = db.prepare(`
    INSERT INTO categories (name, parent_id, description, icon)
    VALUES (?, ?, ?, ?)
  `);

  insertCategory.run('Nông sản & Đặc sản', null, 'Nông sản tươi sạch, thực phẩm hữu cơ và đặc sản vùng miền', 'Sprout');
  insertCategory.run('Sản phẩm số & Sáng tạo', null, 'Template thiết kế, E-book, khóa học, phần mềm và tài nguyên số', 'Sparkles');
  insertCategory.run('Đồ cũ & Vintage', null, 'Máy ảnh film, sách hiếm, đồ sưu tầm và thiết bị secondhand', 'Camera');
  insertCategory.run('Thủ công & Decor', null, 'Đồ gốm, nến thơm, phụ kiện handmade và trang trí góc làm việc', 'Palette');
  insertCategory.run('Thiết bị & Phụ kiện Tech', null, 'Bàn phím cơ, chuột công thái học, phụ kiện công nghệ', 'Laptop');

  // 4. Seed Products
  const insertProduct = db.prepare(`
    INSERT INTO products (shop_id, category_id, name, description, price, stock, images, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productsData = [
    [
      1, 1,
      'Dâu Tây Bạch Tuyết Đà Lạt VietGAP (Hộp 500g)',
      'Dâu tây giống Nhật trồng nhà kính công nghệ cao tại Đà Lạt, vị ngọt thanh, hương thơm dịu nhẹ, thu hoạch và vận chuyển lạnh trong 24h.',
      185000, 45,
      JSON.stringify(['https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      1, 1,
      'Cà Phê Arabica Cầu Đất Rang Mộc Đặc Sản (Túi 500g)',
      '100% hạt cà phê Arabica Cầu Đất chín đỏ ở độ cao 1.650m, sơ chế Honey và rang mộc chuẩn Medium Roast giữ trọn hương hoa quả tự nhiên.',
      220000, 80,
      JSON.stringify(['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      1, 1,
      'Mật Ong Hoa Cà Phê Nguyên Chất Tây Nguyên (Chai 1 Lít)',
      'Mật ong thu hoạch tự nhiên mùa hoa cà phê nở trắng Tây Nguyên, sánh đặc, giàu vitamin và khoáng chất, cam kết không pha đường.',
      260000, 32,
      JSON.stringify(['https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      1, 1,
      'Trà Hoa Cúc Chi Thảo Mộc Sấy Lạnh (Hũ Thủy Tinh 150g)',
      'Trà hoa cúc chi hữu cơ kết hợp kỷ tử và táo đỏ giúp thanh nhiệt, an thần, ngủ ngon và giảm căng thẳng sau giờ làm việc.',
      135000, 60,
      JSON.stringify(['https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      2, 2,
      'Bộ Notion Ultimate Second Brain & Quản Lý Dự Án (Bản Quyền)',
      'Hệ thống quản lý công việc, tài chính cá nhân, ghi chú học tập theo phương pháp PARA & Agile dành cho sinh viên CNTT và Freelancer.',
      149000, 999,
      JSON.stringify(['https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      2, 2,
      'UI Kit E-Commerce & Dashboard Figma Design System (200+ Screens)',
      'Bộ thư viện giao diện Figma chuyên nghiệp gồm 200+ màn hình Web & Mobile App, Auto-Layout 5.0, Dark Mode và hệ thống Design Tokens.',
      299000, 500,
      JSON.stringify(['https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      2, 5,
      'Bàn Phím Cơ Không Dây Custom Aluminum 75% (Gasket Mount)',
      'Bàn phím cơ khung nhôm CNC nguyên khối, kết nối 3 mode (Bluetooth 5.1 / Wireless 2.4G / Type-C), Hotswap 5 pin, âm gõ Creamy cực êm.',
      1650000, 18,
      JSON.stringify(['https://images.unsplash.com/photo-1595225476474-87563907a212?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      2, 4,
      'Đèn Gỗ Decor Bàn Làm Việc Ánh Sáng Ấm Minimalist',
      'Đèn ngủ & decor góc học tập chế tác từ gỗ sồi tự nhiên kết hợp chao vải linen thủ công, tiết kiệm điện và bảo vệ mắt.',
      340000, 25,
      JSON.stringify(['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      3, 3,
      'Máy Ảnh Film Cổ Điển Olympus OM-10 + Lens 50mm f/1.8 (95%)',
      'Máy ảnh film 35mm sưu tầm hoạt động hoàn hảo, đo sáng chuẩn, thấu kính trong vắt không mốc xước, tặng kèm dây đeo da bò thủ công.',
      2450000, 4,
      JSON.stringify(['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      3, 3,
      'Đĩa Than Vinyl Jazz Classic – Miles Davis: Kind of Blue (LP)',
      'Đĩa than LP 12 inch bản phát hành kỷ niệm, âm thanh analog ấm áp, bìa đĩa còn mới 98%, đã được vệ sinh bằng máy siêu âm chuyên dụng.',
      680000, 9,
      JSON.stringify(['https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      3, 4,
      'Bộ Nến Thơm Tinh Dầu Thông & Gỗ Tuyết Tùng Đà Lạt (200g)',
      'Nến thơm sáp đậu nành 100% tự nhiên kết hợp bấc gỗ nổ lách tách nhẹ nhàng, mang lại cảm giác thư giãn như trong rừng thông buổi sớm.',
      215000, 40,
      JSON.stringify(['https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=700&auto=format&fit=crop&q=80']),
      'ACTIVE'
    ],
    [
      3, 3,
      'Sản Phẩm Mẫu Cần Kiểm Duyệt (Nghi vấn vi phạm bản quyền)',
      'Sản phẩm demo dùng để Admin kiểm thử chức năng FR15 - Kiểm duyệt / Ẩn sản phẩm vi phạm chính sách sàn.',
      99000, 10,
      JSON.stringify(['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80']),
      'HIDDEN'
    ]
  ];

  for (const p of productsData) {
    insertProduct.run(...p);
  }

  // 5. Seed Orders, OrderDetails & Payments across all statuses so Seller, Buyer, Shipper, Admin have rich data
  const insertOrder = db.prepare(`
    INSERT INTO orders (buyer_id, shop_id, shipper_id, total, status, payment_method, address, phone, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOrderDetail = db.prepare(`
    INSERT INTO order_details (order_id, product_id, quantity, price)
    VALUES (?, ?, ?, ?)
  `);
  const insertPayment = db.prepare(`
    INSERT INTO payments (order_id, method, amount, status, transaction_code, paid_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Order 1: COMPLETED (Paid via VNPAY) -> Shop 1
  insertOrder.run(2, 1, 8, 590000, 'COMPLETED', 'VNPAY', '125 Nguyễn Huệ, Quận 1, TP.HCM', '0902000002', 'Giao giờ hành chính giúp mình', "2026-11-15 09:30:00");
  insertOrderDetail.run(1, 1, 2, 185000);
  insertOrderDetail.run(1, 2, 1, 220000);
  insertPayment.run(1, 'VNPAY', 590000, 'PAID', 'VNP20261115093001', "2026-11-15 09:31:15");

  // Order 2: COMPLETED (Paid via MOMO) -> Shop 2
  insertOrder.run(2, 2, 8, 1799000, 'COMPLETED', 'MOMO', '125 Nguyễn Huệ, Quận 1, TP.HCM', '0902000002', 'Bọc chống sốc kỹ bàn phím cơ', "2026-11-16 14:20:00");
  insertOrderDetail.run(2, 5, 1, 149000);
  insertOrderDetail.run(2, 7, 1, 1650000);
  insertPayment.run(2, 'MOMO', 1799000, 'PAID', 'MOMO20261116142099', "2026-11-16 14:21:00");

  // Order 3: SHIPPING (Assigned to Shipper #8, COD) -> Shop 1
  insertOrder.run(2, 1, 8, 395000, 'SHIPPING', 'COD', '125 Nguyễn Huệ, Quận 1, TP.HCM', '0902000002', 'Gọi trước khi giao 15 phút', "2026-11-18 10:15:00");
  insertOrderDetail.run(3, 3, 1, 260000);
  insertOrderDetail.run(3, 4, 1, 135000);
  insertPayment.run(3, 'COD', 395000, 'PENDING', 'COD20261118101503', null);

  // Order 4: CONFIRMED (Seller confirmed, ready for Shipper to accept!) -> Shop 1
  insertOrder.run(3, 1, null, 405000, 'CONFIRMED', 'VNPAY', '48 Cầu Giấy, Hà Nội', '0902000009', 'Đóng gói quà tặng', "2026-11-19 08:45:00");
  insertOrderDetail.run(4, 1, 1, 185000);
  insertOrderDetail.run(4, 2, 1, 220000);
  insertPayment.run(4, 'VNPAY', 405000, 'PAID', 'VNP20261119084512', "2026-11-19 08:46:00");

  // Order 5: PENDING (Waiting for Seller #1 to confirm!) -> Shop 1
  insertOrder.run(2, 1, null, 440000, 'PENDING', 'COD', '125 Nguyễn Huệ, Quận 1, TP.HCM', '0902000002', 'Khách quen ủng hộ shop', "2026-11-19 16:10:00");
  insertOrderDetail.run(5, 2, 2, 220000);
  insertPayment.run(5, 'COD', 440000, 'PENDING', 'COD20261119161005', null);

  // Order 6: COMPLETED -> Shop 3
  insertOrder.run(3, 3, 8, 2450000, 'COMPLETED', 'VNPAY', '48 Cầu Giấy, Hà Nội', '0902000009', 'Kiểm tra kỹ đo sáng máy ảnh', "2026-11-17 11:00:00");
  insertOrderDetail.run(6, 9, 1, 2450000);
  insertPayment.run(6, 'VNPAY', 2450000, 'PAID', 'VNP20261117110088', "2026-11-17 11:01:22");

  // 6. Seed Reviews (FR09)
  const insertReview = db.prepare(`
    INSERT INTO reviews (buyer_id, product_id, order_id, rating, comment, seller_reply, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertReview.run(
    2, 1, 1, 5,
    'Dâu tây tươi rói, quả to đều và thơm phức! Đóng gói hộp chống dập rất cẩn thận, giao nhanh trong ngày.',
    'Cảm ơn bạn Minh Anh đã tin tưởng ủng hộ Đà Lạt Farm & Organics nhé!',
    "2026-11-16 10:00:00"
  );
  insertReview.run(
    2, 2, 1, 5,
    'Cà phê Arabica Cầu Đất pha Pour Over cực kỳ dậy mùi, vị chua thanh ngọt hậu chuẩn Specialty.',
    'Shop rất vui vì bạn thích mẻ rang mới này ạ!',
    "2026-11-16 10:05:00"
  );
  insertReview.run(
    2, 7, 2, 5,
    'Bàn phím khung nhôm đầm tay, gõ êm không cần mod thêm gì luôn. Xứng đáng 5 sao!',
    'Cảm ơn bạn! Nếu cần hỗ trợ keymap VIA cứ nhắn Pixel & Craft Studio nha.',
    "2026-11-17 09:20:00"
  );
  insertReview.run(
    3, 9, 6, 5,
    'Máy ảnh Olympus OM-10 đẹp xuất sắc so với tuổi đời, cơ tốc chuẩn, shop tư vấn nhiệt tình.',
    'Chúc bạn có nhiều cuộn film đẹp cùng em Olympus OM-10 nhé!',
    "2026-11-18 15:40:00"
  );

  // 7. Seed Cart for Demo Buyer (#2)
  const insertCart = db.prepare(`
    INSERT INTO carts (buyer_id, product_id, quantity)
    VALUES (?, ?, ?)
  `);
  insertCart.run(2, 1, 1);
  insertCart.run(2, 5, 1);
}

seedIfNeeded(false);

module.exports = {
  db,
  seedIfNeeded
};

