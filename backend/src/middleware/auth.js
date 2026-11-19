const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'emarket_super_secret_jwt_key_2026';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập để thực hiện chức năng này.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, phone, address, status FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại.' });
    }
    if (user.status === 'LOCKED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực người dùng.' });
    }
    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        message: `Bạn không có quyền truy cập chức năng này (Yêu cầu quyền: ${allowedRoles.join(', ')})`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticate,
  authorizeRoles
};

