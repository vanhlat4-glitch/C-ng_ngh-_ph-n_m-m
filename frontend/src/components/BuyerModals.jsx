import React, { useState } from 'react';
import {
  ShoppingCart, Star, Store, Trash2, Plus, Minus, CreditCard, ShieldCheck,
  MapPin, Phone, CheckCircle2, Package, Truck, Clock, XCircle, MessageSquare,
  ArrowRight, Lock
} from 'lucide-react';
import { apiFetch, formatVND } from '../api';

// ============================================================================
// 1. AUTH MODAL (FR01: Đăng ký Buyer/Seller, FR02: Đăng nhập Email/Password hoặc OTP)
// ============================================================================
export function AuthModal({ initialMode = 'login', onClose, onSuccess, onNotify }) {
  const [mode, setMode] = useState(initialMode); // login | register
  const [useOtp, setUseOtp] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    otp: '123456',
    phone: '',
    address: '',
    role: 'BUYER',
    shopName: '',
    shopNiche: 'Nông sản sạch'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: form.email,
            password: useOtp ? undefined : form.password,
            otp: useOtp ? form.otp : undefined
          })
        });
        onNotify(res.message, 'success');
        onSuccess(res.token, res.user);
      } else {
        const res = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        onNotify(res.message, 'success');
        onSuccess(res.token, res.user);
      }
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {mode === 'login' ? 'Đăng nhập E-Market (FR02)' : 'Đăng ký tài khoản (FR01)'}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === 'login'
                ? 'Xác thực bằng Email/Mật khẩu hoặc Mã OTP'
                : 'Chọn vai trò Người mua (Buyer) hoặc Người bán (Seller)'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò đăng ký (FR01) *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'BUYER', label: '🛒 Người mua (Buyer)' },
                    { value: 'SELLER', label: '🏪 Người bán (Seller)' }
                  ].map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setForm({ ...form, role: r.value })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                        form.role === r.value
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email hoặc Số điện thoại *</label>
            <input
              type="text"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              placeholder="buyer@emarket.vn"
            />
          </div>

          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Phương thức xác thực:</span>
              <button
                type="button"
                onClick={() => setUseOtp(!useOtp)}
                className="text-emerald-700 font-semibold hover:underline"
              >
                {useOtp ? 'Dùng Mật khẩu' : 'Dùng mã OTP (Demo: 123456)'}
              </button>
            </div>
          )}

          {mode === 'login' && useOtp ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã xác thực OTP *</label>
              <input
                type="text"
                required
                value={form.otp}
                onChange={(e) => setForm({ ...form, otp: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-emerald-400 bg-emerald-50/40 rounded-xl text-sm font-mono tracking-widest"
                placeholder="123456"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                placeholder="•••••• (Mặc định demo: 123456)"
              />
            </div>
          )}

          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="0902xxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ nhận hàng</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                    placeholder="Quận 1, TP.HCM"
                  />
                </div>
              </div>

              {form.role === 'SELLER' && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
                  <p className="text-xs font-bold text-emerald-800">Thông tin đăng ký mở Gian hàng (Chờ Admin duyệt)</p>
                  <input
                    type="text"
                    value={form.shopName}
                    onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    placeholder="Tên gian hàng của bạn..."
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition"
          >
            {submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập ngay' : 'Tạo tài khoản'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-600 pt-2 border-t border-slate-100">
          {mode === 'login' ? (
            <>
              Chưa có tài khoản?{' '}
              <button onClick={() => setMode('register')} className="text-emerald-700 font-bold hover:underline">
                Đăng ký Buyer / Seller ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <button onClick={() => setMode('login')} className="text-emerald-700 font-bold hover:underline">
                Đăng nhập
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. PRODUCT DETAIL MODAL (FR04: Xem hình ảnh, mô tả, giá, tồn kho, đánh giá)
// ============================================================================
export function ProductDetailModal({ product, onClose, onAddToCart, onSelectShop }) {
  const [qty, setQty] = useState(1);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
            Chi tiết sản phẩm (FR04) • {product.category_name}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <img
              src={product.images?.[0]}
              alt={product.name}
              className="w-full h-72 object-cover rounded-2xl border border-slate-200"
            />
          </div>

          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{product.name}</h2>

              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {product.avg_rating} ({product.review_count || product.reviews?.length || 0} đánh giá)
                </span>
                <span>•</span>
                <span>Đã bán: <b>{product.sold_count || 0}</b></span>
                <span>•</span>
                <span>Tồn kho: <b>{product.stock}</b></span>
              </div>

              <p className="text-2xl font-extrabold text-emerald-700 pt-1">
                {formatVND(product.price)}
              </p>

              <p className="text-sm text-slate-600 leading-relaxed pt-1">
                {product.description}
              </p>
            </div>

            {/* Shop card */}
            <div
              onClick={() => {
                onSelectShop(product.shop_id);
                onClose();
              }}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-emerald-50/50 transition"
            >
              <div className="flex items-center gap-3">
                <img src={product.shop_logo} alt={product.shop_name} className="w-10 h-10 rounded-xl object-cover border" />
                <div>
                  <p className="text-xs text-slate-500">Cung cấp bởi Gian hàng:</p>
                  <p className="text-sm font-bold text-slate-900">{product.shop_name}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                Xem Shop <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center border border-slate-300 rounded-xl">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="p-2.5 text-slate-600 hover:text-slate-900"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="p-2.5 text-slate-600 hover:text-slate-900"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  onAddToCart(product.id, qty);
                  onClose();
                }}
                disabled={product.stock <= 0}
                className="flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition"
              >
                <ShoppingCart className="w-4 h-4" />
                {product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách đánh giá (Reviews - FR04 & FR09) */}
        <div className="border-t border-slate-200 pt-5 space-y-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Đánh giá từ Khách hàng đã mua ({product.reviews?.length || 0})
          </h3>

          {(!product.reviews || product.reviews.length === 0) ? (
            <p className="text-xs text-slate-500 py-4">Chưa có đánh giá nào cho sản phẩm này.</p>
          ) : (
            <div className="space-y-3">
              {product.reviews.map((rev) => (
                <div key={rev.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{rev.buyer_name}</span>
                    <span className="text-xs text-amber-500 font-bold">
                      {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{rev.comment}</p>
                  {rev.seller_reply && (
                    <div className="mt-2 pl-3 border-l-2 border-emerald-500 text-xs text-emerald-800 bg-emerald-50/60 p-2 rounded-r-lg">
                      <b>Phản hồi từ Người bán:</b> {rev.seller_reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. CART & 3-STEP CHECKOUT + VNPAY/MOMO SANDBOX GATEWAY (FR05, FR06, FR07, NFR06)
// ============================================================================
export function CartCheckoutModal({
  cart,
  user,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onOrderSuccess,
  onNotify
}) {
  // NFR06: Tối đa 3 bước để hoàn tất đặt hàng (1: Giỏ hàng -> 2: Địa chỉ & TT -> 3: Cổng VNPay/Momo Sandbox)
  const [step, setStep] = useState(1);
  const [checkoutForm, setCheckoutForm] = useState({
    address: user?.address || '125 Nguyễn Huệ, Quận 1, TP.HCM',
    phone: user?.phone || '0902000002',
    payment_method: 'VNPAY',
    note: ''
  });
  const [pendingOrders, setPendingOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(checkoutForm)
      });

      if (res.requires_online_payment) {
        setPendingOrders(res.orders || []);
        setStep(3); // Chuyển hướng sang cổng thanh toán VNPay / MoMo Sandbox (Sequence Diagram 4.5)
      } else {
        onNotify(res.message, 'success');
        onOrderSuccess();
      }
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSandboxCallback = async (success) => {
    setSubmitting(true);
    try {
      const res = await apiFetch('/payments/sandbox-confirm', {
        method: 'POST',
        body: JSON.stringify({
          order_ids: pendingOrders.map(o => o.id),
          success
        })
      });
      onNotify(res.message, success ? 'success' : 'error');
      onOrderSuccess();
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        {/* Stepper Header (NFR06: Tối đa 3 bước đặt hàng) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {step === 1 && 'Bước 1/3: Quản lý Giỏ hàng (FR05)'}
              {step === 2 && 'Bước 2/3: Thông tin Giao hàng & Thanh toán (FR06)'}
              {step === 3 && `Bước 3/3: Cổng Thanh Toán ${checkoutForm.payment_method} Sandbox (FR07)`}
            </h3>
            <p className="text-xs text-slate-500">
              Đáp ứng NFR06: Hoàn tất đặt hàng nhanh chóng tối đa 3 bước
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        {/* STEP 1: CART ITEMS */}
        {step === 1 && (
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-base font-semibold text-slate-700">Giỏ hàng của bạn đang trống</p>
                <p className="text-xs text-slate-500">Hãy khám phá các sản phẩm trên sàn E-Market và thêm vào giỏ nhé!</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.images?.[0]}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {item.shop_name}
                          </span>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">{item.name}</p>
                          <p className="text-xs font-semibold text-slate-600">{formatVND(item.price)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-300 rounded-xl">
                          <button
                            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                            className="p-1.5 text-slate-600 hover:text-slate-900"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                            className="p-1.5 text-slate-600 hover:text-slate-900"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Xóa khỏi giỏ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Tổng tạm tính ({cart.length} mặt hàng):</p>
                    <p className="text-xl font-extrabold text-emerald-700">{formatVND(totalAmount)}</p>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md"
                  >
                    Tiến hành Đặt hàng <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2: ADDRESS & PAYMENT METHOD (FR06 & FR07) */}
        {step === 2 && (
          <form onSubmit={handlePlaceOrder} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ nhận hàng (FR06) *
              </label>
              <input
                type="text"
                required
                value={checkoutForm.address}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại người nhận *</label>
                <input
                  type="text"
                  required
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú cho Shop / Shipper</label>
                <input
                  type="text"
                  value={checkoutForm.note}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  placeholder="Giao giờ hành chính..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Phương thức thanh toán (FR07 – Use Case include/extend) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'VNPAY', title: 'VNPay Sandbox (Online)', desc: 'QR / Thẻ ATM nội địa & Quốc tế' },
                  { id: 'MOMO', title: 'Ví MoMo Sandbox (Online)', desc: 'Thanh toán siêu tốc qua ví MoMo' },
                  { id: 'COD', title: 'Thanh toán khi nhận hàng (COD)', desc: 'Phương án dự phòng an toàn (R06)' },
                  { id: 'BANK', title: 'Chuyển khoản Ngân hàng 24/7', desc: 'VietQR tự động xác nhận' }
                ].map((pm) => (
                  <div
                    key={pm.id}
                    onClick={() => setCheckoutForm({ ...checkoutForm, payment_method: pm.id })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                      checkoutForm.payment_method === pm.id
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">{pm.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{pm.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                ← Quay lại giỏ hàng
              </button>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Tổng thanh toán:</p>
                  <p className="text-lg font-extrabold text-emerald-700">{formatVND(totalAmount)}</p>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  {submitting ? 'Đang tạo đơn...' : 'Xác nhận Đặt hàng'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: VNPAY / MOMO SANDBOX GATEWAY SIMULATION (Sequence Diagram 4.5) */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                  CỔNG THANH TOÁN {checkoutForm.payment_method} SANDBOX
                </span>
                <Lock className="w-4 h-4 text-emerald-300" />
              </div>
              <h4 className="text-lg font-bold">Mô phỏng luồng Sequence Diagram 4.5 (Đặt hàng & Callback)</h4>
              <p className="text-xs text-blue-100">
                OrderAPI đã tạo Order + OrderDetail và chuyển hướng sang {checkoutForm.payment_method}. Nhấn xác nhận bên dưới để kích hoạt Webhook Callback cập nhật trạng thái Payment.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng đã tạo:</span>
                <span className="font-bold text-slate-900">
                  {pendingOrders.map(o => `#${o.id}`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mã giao dịch Sandbox:</span>
                <span className="font-mono text-xs font-bold text-indigo-700">
                  {pendingOrders.map(o => o.transaction_code).join(', ')}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-slate-600 font-semibold">Số tiền thanh toán:</span>
                <span className="text-lg font-extrabold text-emerald-700">
                  {formatVND(pendingOrders.reduce((s, o) => s + o.total, 0))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleSandboxCallback(true)}
                disabled={submitting}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận Thanh toán Thành công
              </button>
              <button
                onClick={() => handleSandboxCallback(false)}
                disabled={submitting}
                className="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Giả lập Lỗi tích hợp (Dự phòng COD - R06)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 4. BUYER ORDERS & PRODUCT REVIEW VIEW (FR08: Theo dõi đơn, FR09: Đánh giá SP)
// ============================================================================
export function BuyerOrdersView({ orders, onRefresh, onNotify }) {
  const [reviewModal, setReviewModal] = useState(null); // { product_id, product_name, order_id }
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleCancelOrder = async (orderId) => {
    try {
      const res = await apiFetch(`/orders/${orderId}/cancel`, { method: 'PUT' });
      onNotify(res.message, 'success');
      onRefresh();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          product_id: reviewModal.product_id,
          order_id: reviewModal.order_id,
          rating,
          comment
        })
      });
      onNotify(res.message, 'success');
      setReviewModal(null);
      setComment('');
      onRefresh();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const steps = [
    { key: 'PENDING', label: 'Chờ xác nhận' },
    { key: 'CONFIRMED', label: 'Shop đã xác nhận' },
    { key: 'SHIPPING', label: 'Đang giao hàng' },
    { key: 'COMPLETED', label: 'Hoàn thành' }
  ];

  const getStepIndex = (status) => {
    return steps.findIndex(s => s.key === status);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Theo Dõi Đơn Hàng Của Tôi (FR08 & FR09)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến trình: Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn thành & Viết đánh giá sản phẩm
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold self-start"
        >
          Làm mới trạng thái
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">Bạn chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const currentIdx = getStepIndex(o.status);
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-base">Đơn hàng #{o.id}</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                      🏪 {o.shop_name}
                    </span>
                    <span className="text-xs text-slate-400">{o.created_at}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {o.payment_method} • {o.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                    {o.status === 'CANCELLED' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        ĐÃ HỦY
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Stepper (FR08) */}
                {o.status !== 'CANCELLED' && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {steps.map((st, idx) => {
                      const active = idx <= currentIdx;
                      return (
                        <div key={st.key} className="space-y-1.5">
                          <div className={`h-2 rounded-full ${active ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                          <p className={`text-xs font-semibold ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {idx + 1}. {st.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Order items */}
                <div className="divide-y divide-slate-100">
                  {o.items?.map((item) => (
                    <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.product_images?.[0]}
                          alt={item.product_name}
                          className="w-12 h-12 rounded-xl object-cover border"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.product_name}</p>
                          <p className="text-xs text-slate-500">
                            Số lượng: x{item.quantity} • Đơn giá: {formatVND(item.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-sm font-bold text-slate-900">
                          {formatVND(item.price * item.quantity)}
                        </span>

                        {o.status === 'COMPLETED' && (
                          item.is_reviewed > 0 ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold">
                              ✓ Đã đánh giá
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setReviewModal({
                                  product_id: item.product_id,
                                  product_name: item.product_name,
                                  order_id: o.id
                                });
                                setRating(5);
                                setComment('');
                              }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                            >
                              <Star className="w-3.5 h-3.5 fill-white" />
                              Đánh giá SP (FR09)
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div>
                    <span>Giao tới: <b>{o.address}</b></span>
                    {o.shipper_name && (
                      <span className="ml-3 text-blue-700">
                        • Shipper giao hàng: <b>{o.shipper_name}</b> ({o.shipper_phone})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      Tổng tiền: <b className="text-emerald-700 text-base">{formatVND(o.total)}</b>
                    </span>
                    {o.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelOrder(o.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl"
                      >
                        Hủy đơn hàng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REVIEW MODAL (FR09) */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Đánh giá sản phẩm (FR09)</h3>
              <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-sm font-semibold text-slate-800">{reviewModal.product_name}</p>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Chấm sao chất lượng:</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-xl border text-lg transition ${
                        star <= rating
                          ? 'bg-amber-50 border-amber-400 text-amber-500'
                          : 'border-slate-200 text-slate-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-sm font-bold text-amber-600 ml-2">{rating}/5 sao</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhận xét trải nghiệm *</label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  placeholder="Chia sẻ cảm nhận về chất lượng sản phẩm, đóng gói và tốc độ giao hàng..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
                >
                  Gửi đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

