import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Search, ShoppingCart, User, LogOut, Store, Shield, Truck,
  Star, Filter, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Package,
  SlidersHorizontal, Eye
} from 'lucide-react';
import { apiFetch, formatVND, getToken, setToken } from './api';
import { SellerDashboard, AdminDashboard, ShipperDashboard } from './components/RoleDashboards';
import { AuthModal, ProductDetailModal, CartCheckoutModal, BuyerOrdersView } from './components/BuyerModals';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('marketplace'); // marketplace | orders | seller | admin | shipper
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);

  // Filters (FR03: Tìm theo tên, danh mục, khoảng giá, đánh giá, gian hàng)
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    shop_id: '',
    min_price: '',
    max_price: '',
    min_rating: '',
    sort: 'newest'
  });

  // Modals & Toast
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'register'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Load initial catalog
  const loadCatalog = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.category_id) params.set('category_id', filters.category_id);
      if (filters.shop_id) params.set('shop_id', filters.shop_id);
      if (filters.min_price) params.set('min_price', filters.min_price);
      if (filters.max_price) params.set('max_price', filters.max_price);
      if (filters.min_rating) params.set('min_rating', filters.min_rating);
      if (filters.sort) params.set('sort', filters.sort);

      const [cats, shs, prods] = await Promise.all([
        apiFetch('/categories'),
        apiFetch('/shops'),
        apiFetch(`/products?${params.toString()}`)
      ]);
      setCategories(cats);
      setShops(shs);
      setProducts(prods);
    } catch (err) {
      notify(err.message, 'error');
    }
  }, [filters, notify]);

  const loadBuyerData = useCallback(async () => {
    if (!getToken()) {
      setCart([]);
      setMyOrders([]);
      return;
    }
    try {
      const [c, o] = await Promise.all([
        apiFetch('/cart'),
        apiFetch('/orders/my')
      ]);
      setCart(c);
      setMyOrders(o);
    } catch {
      // Ignore if not logged in
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const token = getToken();
    if (token) {
      apiFetch('/auth/me')
        .then((res) => {
          setUser(res.user);
          loadBuyerData();
        })
        .catch(() => {
          setToken(null);
          setUser(null);
        });
    }
  }, [loadBuyerData]);

  // Quick Demo Role Switcher (1-click login for all 5 Actors in the CRS!)
  const handleQuickDemoLogin = async (email, targetView) => {
    if (!email) {
      // Switch to Guest (Actor 1)
      setToken(null);
      setUser(null);
      setCart([]);
      setMyOrders([]);
      setActiveView('marketplace');
      notify('Đã chuyển sang chế độ Khách (Guest – Chưa đăng nhập).', 'success');
      return;
    }
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, otp: '123456' })
      });
      setToken(res.token);
      setUser(res.user);
      await loadBuyerData();
      setActiveView(targetView);
      notify(`Đã chuyển nhanh sang vai trò: ${res.user.name} (${res.user.role})`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleResetDemoData = async () => {
    try {
      const res = await apiFetch('/demo/reset', { method: 'POST' });
      notify(res.message, 'success');
      loadCatalog();
      if (user) loadBuyerData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleOpenProductDetail = async (productId) => {
    try {
      const detail = await apiFetch(`/products/${productId}`);
      setSelectedProduct(detail);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleAddToCart = async (productId, quantity = 1) => {
    if (!user) {
      notify('Khách (Guest) chỉ có thể xem sản phẩm. Vui lòng đăng nhập Buyer để mua hàng!', 'error');
      setAuthModal('login');
      return;
    }
    try {
      const res = await apiFetch('/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity })
      });
      notify(res.message, 'success');
      loadBuyerData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleUpdateCartQty = async (cartId, quantity) => {
    try {
      await apiFetch(`/cart/${cartId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      });
      loadBuyerData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleRemoveCartItem = async (cartId) => {
    try {
      await apiFetch(`/cart/${cartId}`, { method: 'DELETE' });
      loadBuyerData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-semibold ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-700'
              : 'bg-slate-900 text-emerald-300 border-emerald-700'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* TOP DEMO ACTOR BAR (Chuyển nhanh 5 Actor trong tài liệu CRS để thuyết trình & chấm điểm) */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md font-bold">
              DEMO 5 ACTORS (CRS 2.1)
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Chuyển nhanh vai trò để kiểm thử 18 chức năng (FR01 – FR18):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleQuickDemoLogin(null, 'marketplace')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                !user ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              1. Guest (Khách)
            </button>
            <button
              onClick={() => handleQuickDemoLogin('buyer@emarket.vn', 'marketplace')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                user?.role === 'BUYER' ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              2. Buyer (Người mua)
            </button>
            <button
              onClick={() => handleQuickDemoLogin('seller@emarket.vn', 'seller')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                user?.role === 'SELLER' ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              3. Seller (Chủ Shop)
            </button>
            <button
              onClick={() => handleQuickDemoLogin('admin@emarket.vn', 'admin')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                user?.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              4. Admin (Quản trị)
            </button>
            <button
              onClick={() => handleQuickDemoLogin('shipper@emarket.vn', 'shipper')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                user?.role === 'SHIPPER' ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              5. Shipper (Giao hàng)
            </button>
            <button
              onClick={handleResetDemoData}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 font-semibold flex items-center gap-1 ml-1"
              title="Reset dữ liệu mẫu (R04)"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Seed Data
            </button>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveView('marketplace')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">E-MARKET</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Multi-Vendor
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Chợ điện tử trực tuyến đa gian hàng</p>
            </div>
          </div>

          {/* Search input (FR03) */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  if (activeView !== 'marketplace') setActiveView('marketplace');
                }}
                placeholder="Tìm sản phẩm, nông sản, đồ cũ, gian hàng... (FR03)"
                className="w-full pl-10 pr-4 py-2 bg-slate-100 focus:bg-white border border-transparent focus:border-emerald-500 rounded-xl text-sm outline-none transition"
              />
            </div>
          </div>

          {/* Navigation Buttons & User Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('marketplace')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeView === 'marketplace'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Chợ E-Market
            </button>

            {user && (
              <button
                onClick={() => {
                  loadBuyerData();
                  setActiveView('orders');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  activeView === 'orders'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4" />
                Đơn mua ({myOrders.length})
              </button>
            )}

            {(user?.role === 'SELLER' || user?.role === 'ADMIN') && (
              <button
                onClick={() => setActiveView('seller')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  activeView === 'seller'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Store className="w-4 h-4" />
                Kênh Người Bán
              </button>
            )}

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setActiveView('admin')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  activeView === 'admin'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                Quản Trị Sàn
              </button>
            )}

            {(user?.role === 'SHIPPER' || user?.role === 'ADMIN') && (
              <button
                onClick={() => setActiveView('shipper')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  activeView === 'shipper'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Truck className="w-4 h-4" />
                Trạm Shipper
              </button>
            )}

            {/* Cart Button (FR05) */}
            <button
              onClick={() => {
                if (!user) {
                  notify('Vui lòng đăng nhập tài khoản Người mua (Buyer) để xem giỏ hàng!', 'error');
                  setAuthModal('login');
                  return;
                }
                setCartOpen(true);
              }}
              className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition"
              title="Giỏ hàng (FR05)"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Auth controls */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-bold text-slate-900 leading-none">{user.name}</p>
                  <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    setToken(null);
                    setUser(null);
                    setCart([]);
                    setMyOrders([]);
                    setActiveView('marketplace');
                    notify('Đã đăng xuất tài khoản (FR02).', 'success');
                  }}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                  title="Đăng xuất (FR02)"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAuthModal('login')}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => setAuthModal('register')}
                  className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeView === 'seller' && (
          <SellerDashboard
            categories={categories}
            onNotify={notify}
            onRefreshCatalog={loadCatalog}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboard
            onNotify={notify}
            onRefreshCatalog={loadCatalog}
          />
        )}

        {activeView === 'shipper' && (
          <ShipperDashboard onNotify={notify} />
        )}

        {activeView === 'orders' && (
          <BuyerOrdersView
            orders={myOrders}
            onRefresh={() => {
              loadBuyerData();
              loadCatalog();
            }}
            onNotify={notify}
          />
        )}

        {/* DEFAULT VIEW: MARKETPLACE STOREFRONT (GUEST & BUYER) */}
        {activeView === 'marketplace' && (
          <div className="space-y-8">
            {/* HERO BANNER (PD 1.1 & R08 Specialized Niches) */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nền tảng Thương mại Điện tử Đa Gian Hàng (Multi-Vendor)</span>
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  Kết nối trực tiếp Hộ kinh doanh & Nhà sáng tạo với Người tiêu dùng
                </h1>
                <p className="text-emerald-100/90 text-sm leading-relaxed">
                  Tập trung vào các gian hàng chuyên biệt: <b>Nông sản sạch Đà Lạt</b>, <b>Sản phẩm số & Thiết kế</b>, <b>Đồ cũ Vintage tuyển chọn</b> và <b>Thủ công mỹ nghệ Việt Nam</b>. Minh bạch nguồn gốc – Thanh toán VNPay/MoMo Sandbox & COD an toàn.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 shrink-0 w-full md:w-auto">
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4">
                  <p className="text-2xl font-black text-emerald-300">{shops.length}+</p>
                  <p className="text-xs text-emerald-100">Gian hàng chuyên biệt</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4">
                  <p className="text-2xl font-black text-amber-300">{products.length}+</p>
                  <p className="text-xs text-emerald-100">Sản phẩm tuyển chọn</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4">
                  <p className="text-2xl font-black text-sky-300">3 Bước</p>
                  <p className="text-xs text-emerald-100">Đặt hàng siêu tốc (NFR06)</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4">
                  <p className="text-2xl font-black text-rose-300">99.5%</p>
                  <p className="text-xs text-emerald-100">Độ khả dụng (NFR03)</p>
                </div>
              </div>
            </div>

            {/* FEATURED SHOPS (Đa gian hàng - Multi-vendor) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-emerald-600" />
                    Các Gian Hàng Nổi Bật Trên Sàn
                  </h2>
                  <p className="text-xs text-slate-500">Nhấn vào gian hàng để lọc sản phẩm theo từng Shop</p>
                </div>
                {filters.shop_id && (
                  <button
                    onClick={() => setFilters({ ...filters, shop_id: '' })}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Xem tất cả gian hàng
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shops.map((s) => {
                  const isSelected = String(filters.shop_id) === String(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() =>
                        setFilters({
                          ...filters,
                          shop_id: isSelected ? '' : String(s.id)
                        })
                      }
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-emerald-400 shadow-2xs'
                      }`}
                    >
                      <img
                        src={s.logo}
                        alt={s.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-sm truncate">{s.name}</h3>
                          <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5 shrink-0">
                            ★ {s.avg_rating}
                          </span>
                        </div>
                        <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                          {s.niche}
                        </span>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* MULTI-CRITERIA FILTER BAR (FR03: Tìm theo tên, danh mục, khoảng giá, đánh giá, gian hàng) */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  Bộ lọc tìm kiếm sản phẩm đa tiêu chí (FR03)
                </span>
                <button
                  onClick={() =>
                    setFilters({
                      search: '',
                      category_id: '',
                      shop_id: '',
                      min_price: '',
                      max_price: '',
                      min_rating: '',
                      sort: 'newest'
                    })
                  }
                  className="text-xs font-semibold text-slate-500 hover:text-emerald-700"
                >
                  Xóa bộ lọc
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Category Filter */}
                <select
                  value={filters.category_id}
                  onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.product_count})
                    </option>
                  ))}
                </select>

                {/* Shop Filter */}
                <select
                  value={filters.shop_id}
                  onChange={(e) => setFilters({ ...filters, shop_id: e.target.value })}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">Tất cả gian hàng</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {/* Price Range Filter */}
                <select
                  value={`${filters.min_price}-${filters.max_price}`}
                  onChange={(e) => {
                    const [min, max] = e.target.value.split('-');
                    setFilters({ ...filters, min_price: min || '', max_price: max || '' });
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="-">Mọi khoảng giá</option>
                  <option value="0-200000">Dưới 200.000 ₫</option>
                  <option value="200000-500000">Từ 200.000 ₫ – 500.000 ₫</option>
                  <option value="500000-2000000">Từ 500.000 ₫ – 2.000.000 ₫</option>
                  <option value="2000000-">Trên 2.000.000 ₫</option>
                </select>

                {/* Rating Filter */}
                <select
                  value={filters.min_rating}
                  onChange={(e) => setFilters({ ...filters, min_rating: e.target.value })}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">Tất cả đánh giá sao</option>
                  <option value="5">★★★★★ (5 sao tuyệt đối)</option>
                  <option value="4">★★★★☆ (Từ 4 sao trở lên)</option>
                </select>

                {/* Sort */}
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="newest">Sắp xếp: Mới nhất</option>
                  <option value="best_selling">Sắp xếp: Bán chạy nhất</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                </select>
              </div>
            </section>

            {/* PRODUCT GRID (FR03 & FR04) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Danh Sách Sản Phẩm ({products.length} sản phẩm)
                </h2>
              </div>

              {products.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
                  <p className="text-base font-bold text-slate-700">Không tìm thấy sản phẩm phù hợp</p>
                  <p className="text-xs text-slate-500">Hãy thử thay đổi từ khóa hoặc xóa bộ lọc tìm kiếm.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition flex flex-col justify-between group"
                    >
                      <div>
                        <div
                          onClick={() => handleOpenProductDetail(prod.id)}
                          className="relative h-48 overflow-hidden bg-slate-100 cursor-pointer"
                        >
                          <img
                            src={prod.images?.[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/75 text-white backdrop-blur-xs">
                            {prod.category_name}
                          </span>
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-semibold text-emerald-700 truncate">
                              🏪 {prod.shop_name}
                            </span>
                            <span className="flex items-center gap-0.5 text-amber-500 font-bold shrink-0">
                              ★ {prod.avg_rating}
                            </span>
                          </div>

                          <h3
                            onClick={() => handleOpenProductDetail(prod.id)}
                            className="font-bold text-slate-900 text-sm line-clamp-2 cursor-pointer hover:text-emerald-700 min-h-[2.5rem]"
                          >
                            {prod.name}
                          </h3>

                          <div className="flex items-baseline justify-between pt-1">
                            <span className="text-lg font-extrabold text-emerald-700">
                              {formatVND(prod.price)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Đã bán {prod.sold_count}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenProductDetail(prod.id)}
                          className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleAddToCart(prod.id, 1)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Thêm giỏ hàng
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-800">E-MARKET – CHỢ ĐIỆN TỬ TRỰC TUYẾN ĐA GIAN HÀNG (MULTI-VENDOR)</p>
            <p>Kiến trúc 3 lớp (3-Tier Architecture): ReactJS + TailwindCSS • Node.js + Express • MySQL 8.0 / SQLite</p>
          </div>
          <div className="text-right">
            <p>Đồ án / Bài tập môn Công Nghệ Phần Mềm</p>
            <p>Đầy đủ 5 Tác nhân (Actors) & 18 Yêu cầu chức năng (FR01 – FR18)</p>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
          onNotify={notify}
          onSuccess={(token, loggedUser) => {
            setToken(token);
            setUser(loggedUser);
            setAuthModal(null);
            loadBuyerData();
          }}
        />
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onSelectShop={(shopId) => setFilters({ ...filters, shop_id: String(shopId) })}
        />
      )}

      {cartOpen && (
        <CartCheckoutModal
          cart={cart}
          user={user}
          onClose={() => setCartOpen(false)}
          onUpdateQty={handleUpdateCartQty}
          onRemoveItem={handleRemoveCartItem}
          onNotify={notify}
          onOrderSuccess={() => {
            setCartOpen(false);
            loadBuyerData();
            loadCatalog();
            setActiveView('orders');
          }}
        />
      )}
    </div>
  );
}

