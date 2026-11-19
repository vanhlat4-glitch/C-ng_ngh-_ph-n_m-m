require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, seedIfNeeded } = require('./db');
const { JWT_SECRET, authenticate, authorizeRoles } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Helper to sanitize string inputs against basic XSS (NFR02)
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
}

function parseImages(imagesStr) {
  if (!imagesStr) return [];
  try {
    const parsed = JSON.parse(imagesStr);
    return Array.isArray(parsed) ? parsed : [imagesStr];
  } catch {
    return [imagesStr];
  }
}

// ============================================================================
// 1. AUTHENTICATION ENDPOINTS (FR01: Đăng ký, FR02: Đăng nhập / Đăng xuất)
// ============================================================================

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  try {
    const name = sanitize(req.body.name || '');
    const email = sanitize((req.body.email || '').toLowerCase());
    const password = req.body.password || '';
    const phone = sanitize(req.body.phone || '');
    const address = sanitize(req.body.address || '');
    const role = ['BUYER', 'SELLER', 'SHIPPER'].includes(req.body.role) ? req.body.role : 'BUYER';
    const shopName = sanitize(req.body.shopName || '');
    const shopNiche = sanitize(req.body.shopNiche || 'Nông sản & Đặc sản');

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ message: 'Email này đã được đăng ký trên hệ thống.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, phone, address, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `).run(name, email, passwordHash, role, phone, address);

    const userId = Number(result.lastInsertRowid);

    // If registering as SELLER and provided shopName, create a PENDING shop (FR10, FR14)
    if (role === 'SELLER') {
      const defaultShopName = shopName || `Gian hàng của ${name}`;
      db.prepare(`
        INSERT INTO shops (seller_id, name, description, logo, niche, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
      `).run(
        userId,
        defaultShopName,
        `Chào mừng đến với ${defaultShopName} trên sàn E-Market.`,
        'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&auto=format&fit=crop&q=80',
        shopNiche
      );
    }

    const user = db.prepare('SELECT id, name, email, role, phone, address, status FROM users WHERE id = ?').get(userId);
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công!',
      token,
      user
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký tài khoản.', error: err.message });
  }
});

// POST /api/auth/login (supports email/password or demo OTP)
app.post('/api/auth/login', (req, res) => {
  try {
    const email = sanitize((req.body.email || '').toLowerCase());
    const password = req.body.password || '';
    const otp = req.body.otp || '';

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email hoặc số điện thoại.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(email, email);
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.' });
    }

    // Check password or demo OTP '123456' (FR02)
    const isOtpValid = otp && otp === '123456';
    const isPasswordValid = password && bcrypt.compareSync(password, user.password);

    if (!isOtpValid && !isPasswordValid) {
      return res.status(401).json({ message: 'Mật khẩu hoặc mã OTP không chính xác.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      status: user.status
    };

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.', error: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
  const shop = req.user.role === 'SELLER'
    ? db.prepare('SELECT * FROM shops WHERE seller_id = ?').get(req.user.id)
    : null;
  res.json({ user: req.user, shop });
});

// ============================================================================
// 2. PUBLIC CATALOG: CATEGORIES, SHOPS, PRODUCTS (FR03, FR04)
// ============================================================================

// GET /api/categories
app.get('/api/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'ACTIVE') as product_count
    FROM categories c
    ORDER BY c.id ASC
  `).all();
  res.json(categories);
});

// GET /api/shops
app.get('/api/shops', (req, res) => {
  const shops = db.prepare(`
    SELECT s.*, u.name as seller_name,
      (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id AND p.status = 'ACTIVE') as product_count,
      COALESCE((
        SELECT ROUND(AVG(r.rating), 1)
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE p.shop_id = s.id
      ), 5.0) as avg_rating
    FROM shops s
    JOIN users u ON s.seller_id = u.id
    WHERE s.status = 'ACTIVE'
    ORDER BY s.id ASC
  `).all();
  res.json(shops);
});

// GET /api/shops/:id
app.get('/api/shops/:id', (req, res) => {
  const shop = db.prepare(`
    SELECT s.*, u.name as seller_name, u.phone as seller_phone,
      COALESCE((
        SELECT ROUND(AVG(r.rating), 1)
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE p.shop_id = s.id
      ), 5.0) as avg_rating
    FROM shops s
    JOIN users u ON s.seller_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!shop) {
    return res.status(404).json({ message: 'Không tìm thấy gian hàng.' });
  }

  const products = db.prepare(`
    SELECT p.*, c.name as category_name,
      COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id), 5.0) as avg_rating,
      (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) as review_count
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.shop_id = ? AND p.status = 'ACTIVE'
    ORDER BY p.id DESC
  `).all(shop.id).map(p => ({ ...p, images: parseImages(p.images) }));

  res.json({ ...shop, products });
});

// GET /api/products (FR03: Tìm theo tên, danh mục, khoảng giá, đánh giá, gian hàng)
app.get('/api/products', (req, res) => {
  try {
    const { search, category_id, shop_id, min_price, max_price, min_rating, sort } = req.query;

    let sql = `
      SELECT p.*,
        s.name as shop_name, s.niche as shop_niche, s.logo as shop_logo,
        c.name as category_name,
        COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id), 5.0) as avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) as review_count,
        COALESCE((SELECT SUM(od.quantity) FROM order_details od JOIN orders o ON od.order_id = o.id WHERE od.product_id = p.id AND o.status != 'CANCELLED'), 0) as sold_count
      FROM products p
      JOIN shops s ON p.shop_id = s.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'ACTIVE' AND s.status = 'ACTIVE'
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ` AND (p.name LIKE ? OR p.description LIKE ? OR s.name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (category_id) {
      sql += ` AND p.category_id = ?`;
      params.push(Number(category_id));
    }
    if (shop_id) {
      sql += ` AND p.shop_id = ?`;
      params.push(Number(shop_id));
    }
    if (min_price) {
      sql += ` AND p.price >= ?`;
      params.push(Number(min_price));
    }
    if (max_price) {
      sql += ` AND p.price <= ?`;
      params.push(Number(max_price));
    }

    if (sort === 'price_asc') {
      sql += ` ORDER BY p.price ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY p.price DESC`;
    } else if (sort === 'best_selling') {
      sql += ` ORDER BY sold_count DESC, p.id DESC`;
    } else {
      sql += ` ORDER BY p.id DESC`;
    }

    let rows = db.prepare(sql).all(...params).map(p => ({
      ...p,
      images: parseImages(p.images)
    }));

    if (min_rating) {
      const minR = Number(min_rating);
      rows = rows.filter(r => r.avg_rating >= minR);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi tải danh sách sản phẩm.', error: err.message });
  }
});

// GET /api/products/:id (FR04: Xem chi tiết sản phẩm, hình ảnh, mô tả, giá, tồn kho, đánh giá)
app.get('/api/products/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*,
      s.name as shop_name, s.description as shop_description, s.logo as shop_logo, s.niche as shop_niche,
      c.name as category_name,
      COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id), 5.0) as avg_rating,
      (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) as review_count,
      COALESCE((SELECT SUM(od.quantity) FROM order_details od JOIN orders o ON od.order_id = o.id WHERE od.product_id = p.id AND o.status != 'CANCELLED'), 0) as sold_count
    FROM products p
    JOIN shops s ON p.shop_id = s.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  }

  const reviews = db.prepare(`
    SELECT r.*, u.name as buyer_name
    FROM reviews r
    JOIN users u ON r.buyer_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.id DESC
  `).all(product.id);

  res.json({
    ...product,
    images: parseImages(product.images),
    reviews
  });
});

// ============================================================================
// 3. CART ENDPOINTS (FR05: Quản lý giỏ hàng - Thêm/xóa/sửa số lượng)
// ============================================================================

// GET /api/cart
app.get('/api/cart', authenticate, (req, res) => {
  const items = db.prepare(`
    SELECT c.id, c.product_id, c.quantity,
      p.name, p.price, p.stock, p.images, p.shop_id,
      s.name as shop_name
    FROM carts c
    JOIN products p ON c.product_id = p.id
    JOIN shops s ON p.shop_id = s.id
    WHERE c.buyer_id = ?
    ORDER BY c.id DESC
  `).all(req.user.id).map(item => ({
    ...item,
    images: parseImages(item.images)
  }));

  res.json(items);
});

// POST /api/cart (Spec 4.7: POST /api/cart - Thêm vào giỏ hàng)
app.post('/api/cart', authenticate, (req, res) => {
  const product_id = Number(req.body.product_id);
  const quantity = Math.max(1, Number(req.body.quantity || 1));

  const product = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'ACTIVE'").get(product_id);
  if (!product) {
    return res.status(404).json({ message: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.' });
  }
  if (product.stock < quantity) {
    return res.status(400).json({ message: `Sản phẩm chỉ còn ${product.stock} sản phẩm trong kho.` });
  }

  const existing = db.prepare('SELECT * FROM carts WHERE buyer_id = ? AND product_id = ?').get(req.user.id, product_id);
  if (existing) {
    const newQty = Math.min(product.stock, existing.quantity + quantity);
    db.prepare('UPDATE carts SET quantity = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    db.prepare('INSERT INTO carts (buyer_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product_id, quantity);
  }

  res.status(201).json({ message: 'Đã thêm sản phẩm vào giỏ hàng!' });
});

// PUT /api/cart/:id
app.put('/api/cart/:id', authenticate, (req, res) => {
  const quantity = Number(req.body.quantity);
  const cartItem = db.prepare('SELECT c.*, p.stock FROM carts c JOIN products p ON c.product_id = p.id WHERE c.id = ? AND c.buyer_id = ?').get(req.params.id, req.user.id);
  if (!cartItem) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  }
  if (quantity <= 0) {
    db.prepare('DELETE FROM carts WHERE id = ?').run(cartItem.id);
    return res.json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng.' });
  }
  if (quantity > cartItem.stock) {
    return res.status(400).json({ message: `Kho chỉ còn tối đa ${cartItem.stock} sản phẩm.` });
  }

  db.prepare('UPDATE carts SET quantity = ? WHERE id = ?').run(quantity, cartItem.id);
  res.json({ message: 'Đã cập nhật số lượng.' });
});

// DELETE /api/cart/:id
app.delete('/api/cart/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM carts WHERE id = ? AND buyer_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng.' });
});

// ============================================================================
// 4. ORDER & PAYMENT ENDPOINTS (FR06: Đặt hàng, FR07: Thanh toán, FR08: Theo dõi đơn, FR09: Đánh giá)
// ============================================================================

// POST /api/orders (Spec 4.5 & 4.7: Tạo đơn hàng + tách đơn theo gian hàng nếu giỏ hàng nhiều shop + khởi tạo thanh toán)
app.post('/api/orders', authenticate, (req, res) => {
  try {
    const address = sanitize(req.body.address || req.user.address || '');
    const phone = sanitize(req.body.phone || req.user.phone || '');
    const note = sanitize(req.body.note || '');
    const payment_method = ['COD', 'VNPAY', 'MOMO', 'BANK'].includes(req.body.payment_method)
      ? req.body.payment_method
      : 'COD';

    if (!address) {
      return res.status(400).json({ message: 'Vui lòng nhập địa chỉ giao hàng.' });
    }

    // Items can come from cart or direct buy
    let items = req.body.items;
    let fromCart = false;
    if (!Array.isArray(items) || items.length === 0) {
      items = db.prepare('SELECT product_id, quantity FROM carts WHERE buyer_id = ?').all(req.user.id);
      fromCart = true;
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống, không thể đặt hàng.' });
    }

    // Group items by shop_id (Multi-vendor order splitting)
    const shopGroups = {};
    for (const rawItem of items) {
      const prod = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'ACTIVE'").get(rawItem.product_id);
      if (!prod) {
        return res.status(400).json({ message: `Sản phẩm ID #${rawItem.product_id} không khả dụng.` });
      }
      if (prod.stock < rawItem.quantity) {
        return res.status(400).json({ message: `Sản phẩm "${prod.name}" chỉ còn ${prod.stock} sản phẩm trong kho.` });
      }
      if (!shopGroups[prod.shop_id]) {
        shopGroups[prod.shop_id] = [];
      }
      shopGroups[prod.shop_id].push({
        product: prod,
        quantity: Number(rawItem.quantity),
        price: Number(prod.price)
      });
    }

    const createdOrders = [];
    for (const [shopIdStr, groupItems] of Object.entries(shopGroups)) {
      const shopId = Number(shopIdStr);
      const total = groupItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      const orderRes = db.prepare(`
        INSERT INTO orders (buyer_id, shop_id, total, status, payment_method, address, phone, note)
        VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?)
      `).run(req.user.id, shopId, total, payment_method, address, phone, note);

      const orderId = Number(orderRes.lastInsertRowid);

      for (const item of groupItems) {
        db.prepare(`
          INSERT INTO order_details (order_id, product_id, quantity, price)
          VALUES (?, ?, ?, ?)
        `).run(orderId, item.product.id, item.quantity, item.price);

        // Deduct stock
        db.prepare(`
          UPDATE products SET stock = stock - ? WHERE id = ?
        `).run(item.quantity, item.product.id);
      }

      const txnCode = `${payment_method}${Date.now()}${orderId}`;
      db.prepare(`
        INSERT INTO payments (order_id, method, amount, status, transaction_code)
        VALUES (?, ?, ?, 'PENDING', ?)
      `).run(orderId, payment_method, total, txnCode);

      createdOrders.push({
        id: orderId,
        shop_id: shopId,
        total,
        payment_method,
        transaction_code: txnCode
      });
    }

    if (fromCart) {
      db.prepare('DELETE FROM carts WHERE buyer_id = ?').run(req.user.id);
    }

    const requiresOnlineGateway = ['VNPAY', 'MOMO', 'BANK'].includes(payment_method);

    res.status(201).json({
      message: requiresOnlineGateway
        ? `Đã khởi tạo đơn hàng! Vui lòng hoàn tất thanh toán qua cổng ${payment_method} Sandbox.`
        : 'Đặt hàng thành công! Đơn hàng đã được gửi tới Người bán.',
      orders: createdOrders,
      requires_online_payment: requiresOnlineGateway,
      payment_gateway_url: requiresOnlineGateway
        ? `/sandbox-gateway?method=${payment_method}&orders=${createdOrders.map(o => o.id).join(',')}`
        : null
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi tạo đơn hàng.', error: err.message });
  }
});

// POST /api/payments/sandbox-confirm (Spec 4.5 Sequence Diagram: VNPay/Momo Callback kết quả thanh toán)
app.post('/api/payments/sandbox-confirm', authenticate, (req, res) => {
  try {
    const { order_ids, success = true } = req.body;
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ message: 'Thiếu danh sách mã đơn hàng cần xác nhận thanh toán.' });
    }

    for (const id of order_ids) {
      const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(Number(id), req.user.id);
      if (!order) continue;

      if (success) {
        db.prepare(`
          UPDATE payments
          SET status = 'PAID', paid_at = datetime('now', 'localtime')
          WHERE order_id = ?
        `).run(order.id);
      } else {
        db.prepare(`
          UPDATE payments SET status = 'FAILED' WHERE order_id = ?
        `).run(order.id);
      }
    }

    res.json({
      message: success
        ? 'Thanh toán Online hoàn tất! Trạng thái giao dịch đã được cập nhật thành PAID.'
        : 'Giao dịch thanh toán đã bị hủy hoặc thất bại. Bạn có thể thanh toán lại hoặc chuyển sang COD.'
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi callback thanh toán.', error: err.message });
  }
});

// GET /api/orders/my (Spec 4.7: Đơn hàng của tôi - FR08 Theo dõi đơn hàng)
app.get('/api/orders/my', authenticate, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*,
      s.name as shop_name, s.logo as shop_logo,
      pay.status as payment_status, pay.transaction_code, pay.paid_at,
      sh.name as shipper_name, sh.phone as shipper_phone
    FROM orders o
    JOIN shops s ON o.shop_id = s.id
    LEFT JOIN payments pay ON pay.order_id = o.id
    LEFT JOIN users sh ON o.shipper_id = sh.id
    WHERE o.buyer_id = ?
    ORDER BY o.id DESC
  `).all(req.user.id);

  const enriched = orders.map(order => {
    const details = db.prepare(`
      SELECT od.*, p.name as product_name, p.images as product_images,
        (SELECT COUNT(*) FROM reviews r WHERE r.product_id = od.product_id AND r.buyer_id = ? AND (r.order_id = ? OR r.order_id IS NULL)) as is_reviewed
      FROM order_details od
      JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?
    `).all(req.user.id, order.id, order.id).map(d => ({
      ...d,
      product_images: parseImages(d.product_images)
    }));
    return { ...order, items: details };
  });

  res.json(enriched);
});

// PUT /api/orders/:id/cancel (Buyer hủy đơn khi còn ở trạng thái PENDING)
app.put('/api/orders/:id/cancel', authenticate, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(req.params.id, req.user.id);
  if (!order) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  }
  if (order.status !== 'PENDING') {
    return res.status(400).json({ message: 'Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xác nhận.' });
  }

  db.prepare("UPDATE orders SET status = 'CANCELLED', updated_at = datetime('now', 'localtime') WHERE id = ?").run(order.id);
  // Restore product stock
  const details = db.prepare('SELECT * FROM order_details WHERE order_id = ?').all(order.id);
  for (const d of details) {
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(d.quantity, d.product_id);
  }

  res.json({ message: 'Đã hủy đơn hàng và hoàn lại tồn kho.' });
});

// POST /api/reviews (FR09: Đánh giá sản phẩm, chấm sao sau khi nhận hàng)
app.post('/api/reviews', authenticate, (req, res) => {
  const product_id = Number(req.body.product_id);
  const order_id = req.body.order_id ? Number(req.body.order_id) : null;
  const rating = Math.min(5, Math.max(1, Number(req.body.rating || 5)));
  const comment = sanitize(req.body.comment || '');

  if (!comment) {
    return res.status(400).json({ message: 'Vui lòng nhập nội dung đánh giá sản phẩm.' });
  }

  // Verify buyer has purchased & completed order for this product
  const purchased = db.prepare(`
    SELECT o.id FROM orders o
    JOIN order_details od ON od.order_id = o.id
    WHERE o.buyer_id = ? AND od.product_id = ? AND o.status = 'COMPLETED'
  `).get(req.user.id, product_id);

  if (!purchased && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã giao thành công (COMPLETED).' });
  }

  db.prepare(`
    INSERT INTO reviews (buyer_id, product_id, order_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, product_id, order_id || (purchased ? purchased.id : null), rating, comment);

  res.status(201).json({ message: 'Cảm ơn bạn đã gửi đánh giá sản phẩm!' });
});

// ============================================================================
// 5. SELLER ENDPOINTS (FR10: Quản lý gian hàng, FR11: Đăng SP, FR12: Quản lý đơn, FR13: Thống kê doanh thu)
// ============================================================================

// Helper to get seller's shop
function getSellerShop(sellerId) {
  return db.prepare('SELECT * FROM shops WHERE seller_id = ?').get(sellerId);
}

// GET /api/seller/shop
app.get('/api/seller/shop', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const shop = getSellerShop(req.user.id);
  res.json(shop || null);
});

// POST /api/shops (Spec 4.7: Tạo gian hàng - FR10)
app.post('/api/shops', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const existing = getSellerShop(req.user.id);
  const name = sanitize(req.body.name || '');
  const description = sanitize(req.body.description || '');
  const logo = sanitize(req.body.logo || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&auto=format&fit=crop&q=80');
  const niche = sanitize(req.body.niche || 'Nông sản & Đặc sản');

  if (!name) {
    return res.status(400).json({ message: 'Vui lòng nhập tên gian hàng.' });
  }

  if (existing) {
    db.prepare(`
      UPDATE shops SET name = ?, description = ?, logo = ?, niche = ?
      WHERE id = ?
    `).run(name, description, logo, niche, existing.id);
    const updated = getSellerShop(req.user.id);
    return res.json({ message: 'Đã cập nhật thông tin gian hàng!', shop: updated });
  }

  db.prepare(`
    INSERT INTO shops (seller_id, name, description, logo, niche, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING')
  `).run(req.user.id, name, description, logo, niche);

  const created = getSellerShop(req.user.id);
  res.status(201).json({
    message: 'Đăng ký mở gian hàng thành công! Gian hàng đang chờ Admin phê duyệt.',
    shop: created
  });
});

// GET /api/seller/products
app.get('/api/seller/products', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const shop = getSellerShop(req.user.id);
  if (!shop) return res.json([]);

  const products = db.prepare(`
    SELECT p.*, c.name as category_name,
      COALESCE((SELECT SUM(od.quantity) FROM order_details od JOIN orders o ON od.order_id = o.id WHERE od.product_id = p.id AND o.status != 'CANCELLED'), 0) as sold_count
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.shop_id = ?
    ORDER BY p.id DESC
  `).all(shop.id).map(p => ({ ...p, images: parseImages(p.images) }));

  res.json(products);
});

// POST /api/products (Spec 4.7: Thêm sản phẩm - FR11)
app.post('/api/products', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const shop = getSellerShop(req.user.id);
  if (!shop) {
    return res.status(400).json({ message: 'Bạn cần tạo gian hàng trước khi đăng sản phẩm.' });
  }
  if (shop.status !== 'ACTIVE') {
    return res.status(403).json({ message: 'Gian hàng của bạn đang chờ Admin phê duyệt nên chưa thể đăng sản phẩm mới.' });
  }

  const name = sanitize(req.body.name || '');
  const description = sanitize(req.body.description || '');
  const category_id = Number(req.body.category_id || 1);
  const price = Number(req.body.price || 0);
  const stock = Number(req.body.stock || 0);
  const imageUrl = sanitize(req.body.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80');
  const images = Array.isArray(req.body.images) ? JSON.stringify(req.body.images) : JSON.stringify([imageUrl]);

  if (!name || price <= 0) {
    return res.status(400).json({ message: 'Vui lòng nhập tên sản phẩm và giá bán hợp lệ (> 0).' });
  }

  const result = db.prepare(`
    INSERT INTO products (shop_id, category_id, name, description, price, stock, images, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `).run(shop.id, category_id, name, description, price, stock, images);

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({
    message: 'Đăng sản phẩm mới thành công!',
    product: { ...created, images: parseImages(created.images) }
  });
});

// PUT /api/products/:id (FR11: Sửa sản phẩm, cập nhật giá, tồn kho, hình ảnh)
app.put('/api/products/:id', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const shop = getSellerShop(req.user.id);
  if (!shop) return res.status(404).json({ message: 'Không tìm thấy gian hàng.' });

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(req.params.id, shop.id);
  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong gian hàng của bạn.' });
  }

  const name = sanitize(req.body.name ?? product.name);
  const description = sanitize(req.body.description ?? product.description);
  const category_id = Number(req.body.category_id ?? product.category_id);
  const price = Number(req.body.price ?? product.price);
  const stock = Number(req.body.stock ?? product.stock);
  const status = ['ACTIVE', 'HIDDEN'].includes(req.body.status) ? req.body.status : product.status;

  let images = product.images;
  if (req.body.image) {
    images = JSON.stringify([sanitize(req.body.image)]);
  } else if (Array.isArray(req.body.images)) {
    images = JSON.stringify(req.body.images);
  }

  db.prepare(`
    UPDATE products
    SET name = ?, description = ?, category_id = ?, price = ?, stock = ?, images = ?, status = ?
    WHERE id = ?
  `).run(name, description, category_id, price, stock, images, status, product.id);

  res.json({ message: 'Đã cập nhật thông tin sản phẩm!' });
});

// DELETE /api/products/:id (FR11: Xóa sản phẩm)
app.delete('/api/products/:id', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const shop = getSellerShop(req.user.id);
  if (!shop) return res.status(404).json({ message: 'Không tìm thấy gian hàng.' });

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(req.params.id, shop.id);
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
    res.json({ message: 'Đã xóa sản phẩm khỏi gian hàng.' });
  } catch {
    // If product is referenced in order_details, soft-hide it
    db.prepare("UPDATE products SET status = 'HIDDEN' WHERE id = ?").run(product.id);
    res.json({ message: 'Sản phẩm đã có trong lịch sử đơn hàng nên được chuyển sang trạng thái Ẩn.' });
  }
});

// GET /api/seller/orders (FR12: Quản lý đơn hàng của shop)
app.get('/api/seller/orders', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const shop = getSellerShop(req.user.id);
  if (!shop) return res.json([]);

  const orders = db.prepare(`
    SELECT o.*,
      u.name as buyer_name, u.email as buyer_email,
      pay.status as payment_status, pay.transaction_code,
      sh.name as shipper_name
    FROM orders o
    JOIN users u ON o.buyer_id = u.id
    LEFT JOIN payments pay ON pay.order_id = o.id
    LEFT JOIN users sh ON o.shipper_id = sh.id
    WHERE o.shop_id = ?
    ORDER BY o.id DESC
  `).all(shop.id);

  const enriched = orders.map(o => {
    const items = db.prepare(`
      SELECT od.*, p.name as product_name, p.images as product_images
      FROM order_details od
      JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?
    `).all(o.id).map(d => ({ ...d, product_images: parseImages(d.product_images) }));
    return { ...o, items };
  });

  res.json(enriched);
});

// PUT /api/seller/orders/:id/status (FR12: Xác nhận, hủy, cập nhật trạng thái đơn)
app.put('/api/seller/orders/:id/status', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const shop = getSellerShop(req.user.id);
  if (!shop) return res.status(404).json({ message: 'Không tìm thấy gian hàng.' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?').get(req.params.id, shop.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

  const { status } = req.body;
  if (!['CONFIRMED', 'CANCELLED', 'SHIPPING'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái cập nhật không hợp lệ.' });
  }

  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(status, order.id);

  if (status === 'CANCELLED') {
    const details = db.prepare('SELECT * FROM order_details WHERE order_id = ?').all(order.id);
    for (const d of details) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(d.quantity, d.product_id);
    }
  }

  res.json({ message: `Đã cập nhật trạng thái đơn hàng #${order.id} thành ${status}!` });
});

// POST /api/seller/reviews/:id/reply (Actor 3: Phản hồi đánh giá của khách)
app.post('/api/seller/reviews/:id/reply', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const reply = sanitize(req.body.seller_reply || '');
  if (!reply) return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });

  db.prepare('UPDATE reviews SET seller_reply = ? WHERE id = ?').run(reply, req.params.id);
  res.json({ message: 'Đã gửi phản hồi đánh giá của khách hàng!' });
});

// GET /api/seller/revenue (Spec 4.7: Thống kê doanh thu theo ngày/tuần/tháng, sản phẩm bán chạy - FR13)
app.get('/api/seller/revenue', authenticate, authorizeRoles('SELLER'), (req, res) => {
  const shop = getSellerShop(req.user.id);
  if (!shop) {
    return res.json({
      total_revenue: 0,
      completed_orders: 0,
      pending_orders: 0,
      total_products: 0,
      daily_revenue: [],
      best_sellers: []
    });
  }

  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END), 0) as total_revenue,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
      COUNT(CASE WHEN status IN ('PENDING', 'CONFIRMED', 'SHIPPING') THEN 1 END) as active_orders,
      COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders
    FROM orders
    WHERE shop_id = ?
  `).get(shop.id);

  const productCount = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE shop_id = ?').get(shop.id).cnt;

  const dailyRevenue = db.prepare(`
    SELECT substr(created_at, 1, 10) as date,
      SUM(total) as revenue,
      COUNT(*) as orders_count
    FROM orders
    WHERE shop_id = ? AND status != 'CANCELLED'
    GROUP BY substr(created_at, 1, 10)
    ORDER BY date ASC
    LIMIT 14
  `).all(shop.id);

  const bestSellers = db.prepare(`
    SELECT p.id, p.name, p.price, p.stock, p.images,
      COALESCE(SUM(od.quantity), 0) as total_sold,
      COALESCE(SUM(od.quantity * od.price), 0) as total_earned
    FROM products p
    LEFT JOIN order_details od ON od.product_id = p.id
    LEFT JOIN orders o ON od.order_id = o.id AND o.status != 'CANCELLED'
    WHERE p.shop_id = ?
    GROUP BY p.id
    ORDER BY total_sold DESC, total_earned DESC
    LIMIT 5
  `).all(shop.id).map(p => ({ ...p, images: parseImages(p.images) }));

  res.json({
    shop,
    ...summary,
    total_products: productCount,
    daily_revenue: dailyRevenue,
    best_sellers: bestSellers
  });
});

// ============================================================================
// 6. ADMIN ENDPOINTS (FR14: Duyệt shop, FR15: Kiểm duyệt SP, FR16: Quản lý User, FR17: Báo cáo thống kê)
// ============================================================================

// GET /api/admin/stats (FR17: Thống kê doanh thu toàn sàn, số đơn, số người dùng)
app.get('/api/admin/stats', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  const gmvRow = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END), 0) as completed_gmv,
      COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total ELSE 0 END), 0) as total_gmv,
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'SHIPPING' THEN 1 END) as shipping_orders
    FROM orders
  `).get();

  const userStats = db.prepare(`
    SELECT
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'BUYER' THEN 1 END) as buyers,
      COUNT(CASE WHEN role = 'SELLER' THEN 1 END) as sellers,
      COUNT(CASE WHEN role = 'SHIPPER' THEN 1 END) as shippers
    FROM users
  `).get();

  const shopStats = db.prepare(`
    SELECT
      COUNT(*) as total_shops,
      COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_shops,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_shops
    FROM shops
  `).get();

  const productStats = db.prepare(`
    SELECT
      COUNT(*) as total_products,
      COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_products,
      COUNT(CASE WHEN status != 'ACTIVE' THEN 1 END) as hidden_products
    FROM products
  `).get();

  const revenueByShop = db.prepare(`
    SELECT s.id, s.name, s.niche, s.status,
      COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN o.total ELSE 0 END), 0) as revenue,
      COUNT(o.id) as order_count
    FROM shops s
    LEFT JOIN orders o ON o.shop_id = s.id
    GROUP BY s.id
    ORDER BY revenue DESC
  `).all();

  res.json({
    ...gmvRow,
    users: userStats,
    shops: shopStats,
    products: productStats,
    revenue_by_shop: revenueByShop
  });
});

// GET /api/admin/shops
app.get('/api/admin/shops', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  const shops = db.prepare(`
    SELECT s.*, u.name as seller_name, u.email as seller_email, u.phone as seller_phone,
      (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id) as product_count
    FROM shops s
    JOIN users u ON s.seller_id = u.id
    ORDER BY CASE WHEN s.status = 'PENDING' THEN 0 ELSE 1 END, s.id DESC
  `).all();
  res.json(shops);
});

// PUT /api/admin/shops/:id/approve (Spec 4.7: Duyệt gian hàng - FR14)
app.put('/api/admin/shops/:id/approve', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  const status = ['ACTIVE', 'REJECTED', 'PENDING', 'HIDDEN'].includes(req.body.status)
    ? req.body.status
    : 'ACTIVE';

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ message: 'Không tìm thấy gian hàng.' });

  db.prepare('UPDATE shops SET status = ? WHERE id = ?').run(status, shop.id);
  res.json({
    message: status === 'ACTIVE'
      ? `Đã phê duyệt gian hàng "${shop.name}" hoạt động trên sàn!`
      : `Đã chuyển trạng thái gian hàng "${shop.name}" sang ${status}.`
  });
});

// GET /api/admin/products (FR15: Kiểm duyệt sản phẩm)
app.get('/api/admin/products', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  const products = db.prepare(`
    SELECT p.*, s.name as shop_name, c.name as category_name
    FROM products p
    JOIN shops s ON p.shop_id = s.id
    JOIN categories c ON p.category_id = c.id
    ORDER BY CASE WHEN p.status != 'ACTIVE' THEN 0 ELSE 1 END, p.id DESC
  `).all().map(p => ({ ...p, images: parseImages(p.images) }));
  res.json(products);
});

// PUT /api/admin/products/:id/moderate (FR15: Duyệt/ẩn sản phẩm vi phạm chính sách)
app.put('/api/admin/products/:id/moderate', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  const status = ['ACTIVE', 'HIDDEN', 'VIOLATION'].includes(req.body.status) ? req.body.status : 'HIDDEN';
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });

  db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, product.id);
  res.json({
    message: status === 'ACTIVE'
      ? `Đã duyệt hiển thị sản phẩm "${product.name}".`
      : `Đã ẩn sản phẩm "${product.name}" do vi phạm chính sách sàn.`
  });
});

// GET /api/admin/users (FR16: Quản lý người dùng)
app.get('/api/admin/users', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, phone, address, status, created_at
    FROM users
    ORDER BY id ASC
  `).all();
  res.json(users);
});

// PUT /api/admin/users/:id/status (FR16: Khóa/mở khóa tài khoản, phân quyền)
app.put('/api/admin/users/:id/status', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

  if (target.id === req.user.id && req.body.status === 'LOCKED') {
    return res.status(400).json({ message: 'Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.' });
  }

  const newStatus = ['ACTIVE', 'LOCKED'].includes(req.body.status) ? req.body.status : target.status;
  const newRole = ['BUYER', 'SELLER', 'ADMIN', 'SHIPPER'].includes(req.body.role) ? req.body.role : target.role;

  db.prepare('UPDATE users SET status = ?, role = ? WHERE id = ?').run(newStatus, newRole, target.id);
  res.json({
    message: `Đã cập nhật tài khoản "${target.name}" (Trạng thái: ${newStatus}, Vai trò: ${newRole}).`
  });
});

// ============================================================================
// 7. SHIPPER ENDPOINTS (FR18: Nhận đơn, cập nhật đang giao/đã giao)
// ============================================================================

// GET /api/shipper/orders
app.get('/api/shipper/orders', authenticate, authorizeRoles('SHIPPER'), (req, res) => {
  const orders = db.prepare(`
    SELECT o.*,
      s.name as shop_name, s.logo as shop_logo,
      u.name as buyer_name,
      pay.status as payment_status, pay.method as payment_method, pay.transaction_code,
      sh.name as shipper_name
    FROM orders o
    JOIN shops s ON o.shop_id = s.id
    JOIN users u ON o.buyer_id = u.id
    LEFT JOIN payments pay ON pay.order_id = o.id
    LEFT JOIN users sh ON o.shipper_id = sh.id
    WHERE o.status IN ('CONFIRMED', 'SHIPPING', 'COMPLETED')
      AND (o.shipper_id IS NULL OR o.shipper_id = ? OR ? = 'ADMIN')
    ORDER BY CASE
      WHEN o.status = 'SHIPPING' THEN 0
      WHEN o.status = 'CONFIRMED' THEN 1
      ELSE 2
    END, o.id DESC
  `).all(req.user.id, req.user.role);

  const enriched = orders.map(o => {
    const items = db.prepare(`
      SELECT od.*, p.name as product_name
      FROM order_details od
      JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?
    `).all(o.id);
    return { ...o, items };
  });

  res.json(enriched);
});

// PUT /api/shipper/orders/:id/status (Spec 4.7: Cập nhật giao hàng - FR18)
app.put('/api/shipper/orders/:id/status', authenticate, authorizeRoles('SHIPPER'), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

  const { status } = req.body; // 'SHIPPING' (Nhận đơn đi giao) or 'COMPLETED' (Xác nhận giao thành công)
  if (!['SHIPPING', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái giao hàng không hợp lệ (SHIPPING hoặc COMPLETED).' });
  }

  db.prepare(`
    UPDATE orders
    SET status = ?, shipper_id = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(status, req.user.id, order.id);

  if (status === 'COMPLETED') {
    db.prepare(`
      UPDATE payments
      SET status = 'PAID', paid_at = COALESCE(paid_at, datetime('now', 'localtime'))
      WHERE order_id = ?
    `).run(order.id);
  }

  res.json({
    message: status === 'SHIPPING'
      ? `Shipper đã nhận đơn hàng #${order.id} và bắt đầu giao!`
      : `Đã xác nhận giao thành công đơn hàng #${order.id}!`
  });
});

// POST /api/demo/reset (R04: Reset dữ liệu mẫu để demo nhanh)
app.post('/api/demo/reset', (req, res) => {
  seedIfNeeded(true);
  res.json({ message: 'Đã khôi phục toàn bộ dữ liệu mẫu (Seed Data) về trạng thái ban đầu!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'E-Market API', architecture: '3-Tier (ReactJS + Node/Express + SQL)' });
});

app.listen(PORT, () => {
  console.log(`🚀 E-Market Backend API đang chạy tại http://localhost:${PORT}`);
});

