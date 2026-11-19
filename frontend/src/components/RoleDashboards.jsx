import React, { useState, useEffect } from 'react';
import {
  Store, Package, ShoppingBag, TrendingUp, Plus, Edit3, Trash2, CheckCircle2,
  XCircle, ShieldAlert, Users, Eye, EyeOff, Truck, MapPin, Phone, RefreshCw,
  Award, DollarSign, Clock, Lock, Unlock
} from 'lucide-react';
import { apiFetch, formatVND } from '../api';

// ============================================================================
// 1. SELLER DASHBOARD (FR10, FR11, FR12, FR13)
// ============================================================================
export function SellerDashboard({ categories, onNotify, onRefreshCatalog }) {
  const [tab, setTab] = useState('revenue'); // revenue | products | orders | shop
  const [revenueData, setRevenueData] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shopForm, setShopForm] = useState({
    name: '',
    niche: 'Nông sản sạch',
    description: '',
    logo: ''
  });
  const [productModal, setProductModal] = useState(null); // null or product object
  const [loading, setLoading] = useState(false);

  const loadSellerData = async () => {
    setLoading(true);
    try {
      const [rev, prods, ords] = await Promise.all([
        apiFetch('/seller/revenue'),
        apiFetch('/seller/products'),
        apiFetch('/seller/orders')
      ]);
      setRevenueData(rev);
      setProducts(prods);
      setOrders(ords);
      if (rev.shop) {
        setShopForm({
          name: rev.shop.name || '',
          niche: rev.shop.niche || 'Nông sản sạch',
          description: rev.shop.description || '',
          logo: rev.shop.logo || ''
        });
      }
    } catch (err) {
      onNotify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  const handleSaveShop = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/shops', {
        method: 'POST',
        body: JSON.stringify(shopForm)
      });
      onNotify(res.message, 'success');
      loadSellerData();
      onRefreshCatalog();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(productModal.id);
      const endpoint = isEdit ? `/products/${productModal.id}` : '/products';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(productModal)
      });
      onNotify(res.message, 'success');
      setProductModal(null);
      loadSellerData();
      onRefreshCatalog();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      const res = await apiFetch(`/products/${id}`, { method: 'DELETE' });
      onNotify(res.message, 'success');
      loadSellerData();
      onRefreshCatalog();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      const res = await apiFetch(`/seller/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      onNotify(res.message, 'success');
      loadSellerData();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const shop = revenueData?.shop;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {shop?.logo ? (
            <img src={shop.logo} alt={shop.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
              <Store className="w-8 h-8" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold">{shop ? shop.name : 'Chưa tạo gian hàng'}</h2>
              {shop && (
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                  shop.status === 'ACTIVE'
                    ? 'bg-emerald-400/25 text-emerald-100 border border-emerald-300/40'
                    : 'bg-amber-400/25 text-amber-100 border border-amber-300/40'
                }`}>
                  {shop.status === 'ACTIVE' ? 'Đang hoạt động' : 'Chờ Admin duyệt'}
                </span>
              )}
            </div>
            <p className="text-emerald-100 text-sm mt-1">
              Kênh Người Bán (Seller Center) • Quản lý sản phẩm, đơn hàng & thống kê doanh thu (FR10 – FR13)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'revenue', label: 'Thống kê DT (FR13)', icon: TrendingUp },
            { id: 'products', label: `Sản phẩm (${products.length})`, icon: Package },
            { id: 'orders', label: `Đơn hàng (${orders.length})`, icon: ShoppingBag },
            { id: 'shop', label: 'Gian hàng (FR10)', icon: Store }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                  tab === item.id
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: THỐNG KÊ DOANH THU (FR13) */}
      {tab === 'revenue' && revenueData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-sm">
                <span>Doanh thu hoàn thành</span>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{formatVND(revenueData.total_revenue)}</p>
              <p className="text-xs text-emerald-600 mt-1">Đơn hàng đã giao thành công</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-sm">
                <span>Đơn hoàn thành</span>
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{revenueData.completed_orders} đơn</p>
              <p className="text-xs text-slate-500 mt-1">Tỷ lệ giao thành công cao</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-sm">
                <span>Đơn đang xử lý / giao</span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{revenueData.active_orders} đơn</p>
              <p className="text-xs text-amber-600 mt-1">Cần theo dõi xác nhận & vận chuyển</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-sm">
                <span>Tổng sản phẩm</span>
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{revenueData.total_products} SP</p>
              <p className="text-xs text-slate-500 mt-1">Đang kinh doanh trên gian hàng</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Biểu đồ doanh thu theo ngày */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Doanh thu theo thời gian (Ngày / Tuần / Tháng)
              </h3>
              {revenueData.daily_revenue.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">Chưa có dữ liệu phát sinh doanh thu.</p>
              ) : (
                <div className="space-y-3">
                  {revenueData.daily_revenue.map((d) => {
                    const maxRev = Math.max(...revenueData.daily_revenue.map(x => x.revenue), 1);
                    const pct = Math.max(8, Math.round((d.revenue / maxRev) * 100));
                    return (
                      <div key={d.date} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-slate-700">
                          <span>Ngày {d.date} ({d.orders_count} đơn)</span>
                          <span className="font-bold text-emerald-700">{formatVND(d.revenue)}</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sản phẩm bán chạy */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Top sản phẩm bán chạy nhất gian hàng
              </h3>
              <div className="divide-y divide-slate-100">
                {revenueData.best_sellers.map((prod, idx) => (
                  <div key={prod.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <img
                        src={prod.images?.[0]}
                        alt={prod.name}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{prod.name}</p>
                        <p className="text-xs text-slate-500">Đã bán: <b>{prod.total_sold}</b> • Tồn kho: {prod.stock}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 whitespace-nowrap">
                      {formatVND(prod.total_earned)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ SẢN PHẨM (FR11) */}
      {tab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Danh sách sản phẩm của gian hàng (FR11)</h3>
              <p className="text-xs text-slate-500">Thêm, sửa, xóa sản phẩm, cập nhật giá bán, tồn kho và hình ảnh</p>
            </div>
            <button
              onClick={() =>
                setProductModal({
                  name: '',
                  category_id: categories[0]?.id || 1,
                  price: 150000,
                  stock: 50,
                  description: '',
                  image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&auto=format&fit=crop&q=80',
                  status: 'ACTIVE'
                })
              }
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 self-start"
            >
              <Plus className="w-4 h-4" />
              Đăng sản phẩm mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">Sản phẩm</th>
                  <th className="py-3 px-3">Danh mục</th>
                  <th className="py-3 px-3">Giá bán</th>
                  <th className="py-3 px-3">Tồn kho</th>
                  <th className="py-3 px-3">Đã bán</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images?.[0]} alt={p.name} className="w-12 h-12 rounded-xl object-cover border" />
                        <div>
                          <p className="font-semibold text-slate-900 line-clamp-1">{p.name}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{p.category_name}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">{formatVND(p.price)}</td>
                    <td className="py-3 px-3 font-medium">{p.stock}</td>
                    <td className="py-3 px-3 text-slate-600">{p.sold_count}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {p.status === 'ACTIVE' ? 'Đang bán' : 'Đang ẩn'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setProductModal({
                              ...p,
                              image: p.images?.[0] || ''
                            })
                          }
                          className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: QUẢN LÝ ĐƠN HÀNG (FR12) */}
      {tab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Quản lý đơn đặt hàng của Shop (FR12)</h3>
            <p className="text-xs text-slate-500">Xác nhận đơn mới để bàn giao cho Shipper hoặc hủy đơn khi hết hàng</p>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Chưa có đơn hàng nào.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-bold text-slate-900">Đơn hàng #{o.id}</span>
                      <span className="text-xs text-slate-500 ml-2">• Ngày đặt: {o.created_at}</span>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Khách mua: <b>{o.buyer_name}</b> ({o.phone}) • Địa chỉ: {o.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {o.payment_method} ({o.payment_status})
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        o.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        o.status === 'SHIPPING' ? 'bg-blue-100 text-blue-800' :
                        o.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-800' :
                        o.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {o.items?.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <img src={item.product_images?.[0]} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                          <div>
                            <p className="font-medium text-slate-800">{item.product_name}</p>
                            <p className="text-xs text-slate-500">Số lượng: x{item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-slate-800">{formatVND(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="text-sm">
                      Tổng thanh toán: <b className="text-emerald-700 text-base">{formatVND(o.total)}</b>
                      {o.shipper_name && (
                        <span className="text-xs text-blue-600 ml-3">• Shipper phụ trách: <b>{o.shipper_name}</b></span>
                      )}
                    </div>

                    {o.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOrderStatus(o.id, 'CONFIRMED')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Xác nhận đơn & Báo Shipper
                        </button>
                        <button
                          onClick={() => handleOrderStatus(o.id, 'CANCELLED')}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Hủy đơn
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUẢN LÝ THÔNG TIN GIAN HÀNG (FR10) */}
      {tab === 'shop' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-2xl">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Thông tin Gian hàng (FR10)</h3>
          <p className="text-xs text-slate-500 mb-5">Cập nhật hồ sơ gian hàng, định hướng ngách chuyên biệt và ảnh đại diện</p>
          <form onSubmit={handleSaveShop} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên gian hàng *</label>
              <input
                type="text"
                required
                value={shopForm.name}
                onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                placeholder="VD: Đà Lạt Farm & Organics"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngách chuyên biệt (NFR05 / R08)</label>
              <select
                value={shopForm.niche}
                onChange={(e) => setShopForm({ ...shopForm, niche: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              >
                <option value="Nông sản sạch">Nông sản sạch & Đặc sản vùng miền</option>
                <option value="Sản phẩm số & Sáng tạo">Sản phẩm số & Sáng tạo (Template, UI Kit, E-book)</option>
                <option value="Đồ cũ tuyển chọn">Đồ cũ tuyển chọn & Vintage</option>
                <option value="Thủ công mỹ nghệ">Thủ công mỹ nghệ & Decor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">URL Ảnh Logo gian hàng</label>
              <input
                type="text"
                value={shopForm.logo}
                onChange={(e) => setShopForm({ ...shopForm, logo: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả gian hàng</label>
              <textarea
                rows={3}
                value={shopForm.description}
                onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                placeholder="Giới thiệu câu chuyện thương hiệu và cam kết chất lượng..."
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl"
            >
              Lưu thông tin gian hàng
            </button>
          </form>
        </div>
      )}

      {/* MODAL THÊM / SỬA SẢN PHẨM */}
      {productModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {productModal.id ? 'Cập nhật sản phẩm (FR11)' : 'Đăng sản phẩm mới (FR11)'}
              </h3>
              <button onClick={() => setProductModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  value={productModal.name}
                  onChange={(e) => setProductModal({ ...productModal, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Danh mục *</label>
                  <select
                    value={productModal.category_id}
                    onChange={(e) => setProductModal({ ...productModal, category_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={productModal.status || 'ACTIVE'}
                    onChange={(e) => setProductModal({ ...productModal, status: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="ACTIVE">Đang bán (ACTIVE)</option>
                    <option value="HIDDEN">Tạm ẩn (HIDDEN)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá bán (VNĐ) *</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={productModal.price}
                    onChange={(e) => setProductModal({ ...productModal, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tồn kho *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productModal.stock}
                    onChange={(e) => setProductModal({ ...productModal, stock: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Hình ảnh (Cloudinary / Firebase / Unsplash)</label>
                <input
                  type="text"
                  value={productModal.image}
                  onChange={(e) => setProductModal({ ...productModal, image: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={productModal.description}
                  onChange={(e) => setProductModal({ ...productModal, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProductModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold"
                >
                  Lưu sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. ADMIN DASHBOARD (FR14: Duyệt Shop, FR15: Kiểm duyệt SP, FR16: Quản lý User, FR17: Báo cáo)
// ============================================================================
export function AdminDashboard({ onNotify, onRefreshCatalog }) {
  const [tab, setTab] = useState('stats'); // stats | shops | products | users
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);

  const loadAdminData = async () => {
    try {
      const [st, sh, pr, us] = await Promise.all([
        apiFetch('/admin/stats'),
        apiFetch('/admin/shops'),
        apiFetch('/admin/products'),
        apiFetch('/admin/users')
      ]);
      setStats(st);
      setShops(sh);
      setProducts(pr);
      setUsers(us);
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApproveShop = async (shopId, status) => {
    try {
      const res = await apiFetch(`/admin/shops/${shopId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      onNotify(res.message, 'success');
      loadAdminData();
      onRefreshCatalog();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const handleModerateProduct = async (productId, status) => {
    try {
      const res = await apiFetch(`/admin/products/${productId}/moderate`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      onNotify(res.message, 'success');
      loadAdminData();
      onRefreshCatalog();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const handleUpdateUser = async (userId, status, role) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, role })
      });
      onNotify(res.message, 'success');
      loadAdminData();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  const pendingShopCount = shops.filter(s => s.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-xs font-semibold text-indigo-200">
            ADMINISTRATION PORTAL
          </span>
          <h2 className="text-2xl font-bold mt-2">Trung Tâm Quản Trị Sàn E-Market</h2>
          <p className="text-slate-300 text-sm">
            Duyệt gian hàng (FR14) • Kiểm duyệt sản phẩm (FR15) • Quản lý người dùng (FR16) • Báo cáo thống kê (FR17)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'stats', label: 'Báo cáo thống kê (FR17)', icon: TrendingUp },
            { id: 'shops', label: `Duyệt Shop (${pendingShopCount} chờ)`, icon: Store },
            { id: 'products', label: `Kiểm duyệt SP (${products.length})`, icon: ShieldAlert },
            { id: 'users', label: `Người dùng (${users.length})`, icon: Users }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                  tab === item.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: BÁO CÁO THỐNG KÊ TOÀN SÀN (FR17) */}
      {tab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Tổng GMV Toàn Sàn</p>
              <p className="text-2xl font-bold text-indigo-700 mt-2">{formatVND(stats.total_gmv)}</p>
              <p className="text-xs text-emerald-600 mt-1">Đã hoàn tất: {formatVND(stats.completed_gmv)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Tổng Số Đơn Hàng</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_orders} đơn</p>
              <p className="text-xs text-slate-500 mt-1">
                Hoàn thành: {stats.completed_orders} • Đang giao: {stats.shipping_orders}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Gian Hàng Đa Ngách</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.shops.total_shops} Shop</p>
              <p className="text-xs text-amber-600 mt-1">
                Đang hoạt động: {stats.shops.active_shops} • Chờ duyệt: {stats.shops.pending_shops}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase">Người Dùng Hệ Thống</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.users.total_users} tài khoản</p>
              <p className="text-xs text-slate-500 mt-1">
                Buyer: {stats.users.buyers} • Seller: {stats.users.sellers} • Shipper: {stats.users.shippers}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">Thống kê doanh thu theo từng Gian hàng trên sàn</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                    <th className="py-3 px-3">Gian hàng</th>
                    <th className="py-3 px-3">Phân khúc ngách</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3">Số đơn hàng</th>
                    <th className="py-3 px-3 text-right">Tổng doanh thu (GMV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.revenue_by_shop.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-3 px-3 text-slate-600">{s.niche}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">{s.order_count} đơn</td>
                      <td className="py-3 px-3 text-right font-bold text-indigo-700">{formatVND(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DUYỆT GIAN HÀNG (FR14) */}
      {tab === 'shops' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Phê duyệt đăng ký mở Gian hàng (FR14)</h3>
          <p className="text-xs text-slate-500 mb-4">Kiểm tra hồ sơ các hộ kinh doanh và phê duyệt hoặc từ chối mở shop</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shops.map((s) => (
              <div key={s.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <img src={s.logo} alt={s.name} className="w-14 h-14 rounded-xl object-cover border" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900">{s.name}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        s.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">Ngách: {s.niche}</p>
                    <p className="text-xs text-slate-600 mt-1">{s.description}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Chủ shop: <b>{s.seller_name}</b> ({s.seller_email} • {s.seller_phone})
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  {s.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleApproveShop(s.id, 'ACTIVE')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Phê duyệt mở Shop
                    </button>
                  )}
                  {s.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleApproveShop(s.id, 'REJECTED')}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Từ chối / Đình chỉ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KIỂM DUYỆT SẢN PHẨM (FR15) */}
      {tab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Kiểm duyệt sản phẩm toàn sàn (FR15)</h3>
          <p className="text-xs text-slate-500 mb-4">Duyệt hiển thị hoặc ẩn các sản phẩm vi phạm chính sách sàn</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-3 px-3">Sản phẩm</th>
                  <th className="py-3 px-3">Gian hàng</th>
                  <th className="py-3 px-3">Giá</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Hành động kiểm duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images?.[0]} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                        <div>
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.category_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{p.shop_name}</td>
                    <td className="py-3 px-3 font-semibold">{formatVND(p.price)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.status === 'ACTIVE' ? 'Hợp lệ (ACTIVE)' : 'Đã ẩn / Vi phạm'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {p.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleModerateProduct(p.id, 'HIDDEN')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          Ẩn SP vi phạm
                        </button>
                      ) : (
                        <button
                          onClick={() => handleModerateProduct(p.id, 'ACTIVE')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Duyệt hiển thị
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: QUẢN LÝ NGƯỜI DÙNG (FR16) */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Quản lý tài khoản & Phân quyền (FR16)</h3>
          <p className="text-xs text-slate-500 mb-4">Khóa / mở khóa tài khoản vi phạm và điều chỉnh vai trò hệ thống</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Họ tên & Email</th>
                  <th className="py-3 px-3">Số ĐT</th>
                  <th className="py-3 px-3">Phân quyền (Role)</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Khóa / Mở khóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-xs text-slate-500">#{u.id}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{u.phone}</td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUser(u.id, u.status, e.target.value)}
                        className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                      >
                        <option value="BUYER">BUYER</option>
                        <option value="SELLER">SELLER</option>
                        <option value="SHIPPER">SHIPPER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUpdateUser(u.id, 'LOCKED', u.role)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Khóa TK
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateUser(u.id, 'ACTIVE', u.role)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Mở khóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. SHIPPER DASHBOARD (FR18: Nhận đơn, cập nhật đang giao / đã giao)
// ============================================================================
export function ShipperDashboard({ onNotify }) {
  const [orders, setOrders] = useState([]);

  const loadShipperOrders = async () => {
    try {
      const data = await apiFetch('/shipper/orders');
      setOrders(data);
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  useEffect(() => {
    loadShipperOrders();
  }, []);

  const handleUpdateDelivery = async (orderId, status) => {
    try {
      const res = await apiFetch(`/shipper/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      onNotify(res.message, 'success');
      loadShipperOrders();
    } catch (err) {
      onNotify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Ứng Dụng Giao Nhận Shipper (FR18)</h2>
            <p className="text-amber-100 text-sm">
              Nhận đơn từ các Gian hàng đã xác nhận • Cập nhật trạng thái Đang giao & Xác nhận Giao thành công
            </p>
          </div>
        </div>
        <button
          onClick={loadShipperOrders}
          className="px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới đơn
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-base font-bold text-slate-900">Vận đơn #{o.id}</span>
                  <p className="text-xs text-slate-500">Lấy hàng tại: <b>{o.shop_name}</b></p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  o.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  o.status === 'SHIPPING' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {o.status === 'CONFIRMED' ? 'CHỜ NHẬN GIAO' :
                   o.status === 'SHIPPING' ? 'ĐANG GIAO HÀNG' : 'ĐÃ GIAO THÀNH CÔNG'}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-slate-700">
                <p className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  Người nhận: <b>{o.buyer_name}</b>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Điện thoại: <b>{o.phone || '0902000002'}</b>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>Giao tới: <b>{o.address}</b></span>
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase">Chi tiết kiện hàng:</p>
                {o.items?.map(i => (
                  <p key={i.id} className="text-xs text-slate-700">
                    • {i.product_name} (x{i.quantity})
                  </p>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500">
                  Thu hộ ({o.payment_method}):
                </p>
                <p className="text-base font-bold text-orange-600">
                  {o.payment_status === 'PAID' ? '0 ₫ (Đã TT Online)' : formatVND(o.total)}
                </p>
              </div>

              {o.status === 'CONFIRMED' && (
                <button
                  onClick={() => handleUpdateDelivery(o.id, 'SHIPPING')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  Nhận đơn & Đi giao
                </button>
              )}

              {o.status === 'SHIPPING' && (
                <button
                  onClick={() => handleUpdateDelivery(o.id, 'COMPLETED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận đã giao thành công
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

