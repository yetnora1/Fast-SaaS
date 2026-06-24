"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
import { GlobeIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon, PlusIcon, ClipboardIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Modifier {
  id: string;
  itemId: string;
  groupName: string;
  option: string;
  extraPrice: string | number;
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  nameAm: string | null;
  description: string | null;
  price: string | number;
  imageUrl?: string | null;
  course: string;
  modifiers: Modifier[];
}

interface Category {
  id: string;
  name: string;
  nameAm: string | null;
  items: MenuItem[];
}

interface CartItem {
  id: string; // unique hash: menuItemId + selected modifiers
  menuItemId: string;
  name: string;
  nameAm: string | null;
  price: number;
  qty: number;
  notes: string;
  imageUrl?: string | null;
  selectedModifiers: {
    groupName: string;
    option: string;
    extraPrice: number;
  }[];
}

// Map menu item name keywords to local assets inside /images/ for real pictures
function getLocalItemImage(name: string, imageUrl?: string | null): string {
  if (imageUrl) return imageUrl;
  const n = name.toLowerCase();
  if (n.includes("macchiato")) return "/images/macchiato.jpg";
  if (n.includes("cappuccino")) return "/images/cappuccino.jpg";
  if (n.includes("latte")) return "/images/cafe_latte.jpg";
  if (n.includes("coffee")) return "/images/cafe_coffee.jpg";
  if (n.includes("tea")) return "/images/tea.jpg";
  if (n.includes("juice")) {
    if (n.includes("avocado") && n.includes("strawberry")) return "/images/juice_avo_straw.jpg";
    if (n.includes("avocado")) return "/images/Avocado Juice.jpg";
    if (n.includes("mango")) return "/images/Mango Juice.jpg";
    if (n.includes("papaya")) return "/images/Papaya Juice.jpg";
    if (n.includes("strawberry")) return "/images/Strawberry Juice.jpg";
    if (n.includes("watermelon")) return "/images/Watermelon Juice.jpg";
    return "/images/juice_cup.jpg";
  }
  if (n.includes("water")) {
    if (n.includes("ambo")) return "/images/ambo water.jpg";
    return "/images/0.5 litre water.jpg";
  }
  if (n.includes("egg") && n.includes("avocado")) return "/images/avocado_eggs.jpg";
  if (n.includes("egg") && n.includes("stew")) return "/images/Egg Stew.jpg";
  if (n.includes("egg") && n.includes("sandwich")) return "/images/egg sandwich.jpg";
  if (n.includes("egg")) return "/images/Scrambled Eggs.jpg";
  if (n.includes("toast")) return "/images/avocado_toast.jpg";
  if (n.includes("chechebsa")) return "/images/Normal Chechebsa.jpg";
  if (n.includes("fetira")) return "/images/Normal Fetira.jpg";
  if (n.includes("ful") && n.includes("avocado")) return "/images/Ful with Avocado.jpg";
  if (n.includes("ful")) return "/images/Normal Ful.jpg";
  if (n.includes("burger")) {
    if (n.includes("cheese")) return "/images/burger_cheese.jpg";
    if (n.includes("double")) return "/images/burger_double.jpg";
    return "/images/burger_normal.jpg";
  }
  if (n.includes("pizza")) {
    if (n.includes("chicken")) return "/images/pizza_chicken.jpg";
    if (n.includes("margherita")) return "/images/pizza_margherita.jpg";
    return "/images/pizza_normal.jpg";
  }
  if (n.includes("pasta")) {
    if (n.includes("chicken")) return "/images/pasta_chicken.jpg";
    if (n.includes("tuna")) return "/images/tuna-pasta.jpg";
    return "/images/pasta_sauce.jpg";
  }
  if (n.includes("rice")) {
    if (n.includes("chicken")) return "/images/rice with chicken.jpg";
    return "/images/rice_veg.jpg";
  }
  if (n.includes("milkshake")) return "/images/milkshake.jpg";
  if (n.includes("milk")) return "/images/milk.jpg";
  if (n.includes("bread")) return "/images/bread.jpg";
  if (n.includes("chips")) return "/images/chips.jpg";
  if (n.includes("sandwich")) return "/images/club sandwich.jpg";
  return "/images/cafe_food.jpg";
}

// Generate a deterministic calorie amount for high visual richness
function getItemCalories(itemId: string, name: string): number {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = itemId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const base = Math.abs(hash % 250) + 180; // 180 - 430
  if (name.toLowerCase().includes("salad") || name.toLowerCase().includes("water") || name.toLowerCase().includes("tea")) {
    return Math.floor(base * 0.4);
  }
  if (name.toLowerCase().includes("burger") || name.toLowerCase().includes("pizza") || name.toLowerCase().includes("chechebsa")) {
    return Math.floor(base * 1.8);
  }
  return base;
}

// Translate dynamic category emojis
function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("coffee") || n.includes("macchiato") || n.includes("espresso") || n.includes("latte") || n.includes("cappuccino")) return "☕";
  if (n.includes("tea")) return "🍵";
  if (n.includes("juice") || n.includes("shake") || n.includes("drink") || n.includes("beverage")) return "🥤";
  if (n.includes("pasta") || n.includes("spaghetti") || n.includes("macaroni")) return "🍝";
  if (n.includes("rice")) return "🍛";
  if (n.includes("burger")) return "🍔";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("sandwich") || n.includes("toast") || n.includes("bread")) return "🥪";
  if (n.includes("egg") || n.includes("breakfast") || n.includes("chechebsa") || n.includes("ful")) return "🍳";
  if (n.includes("chips") || n.includes("fries") || n.includes("appetizer") || n.includes("snack")) return "🍟";
  if (n.includes("dessert") || n.includes("cake") || n.includes("pastry") || n.includes("sweet")) return "🍰";
  if (n.includes("salad") || n.includes("vegetable") || n.includes("healthy")) return "🥗";
  if (n.includes("meat") || n.includes("chicken") || n.includes("steak") || n.includes("beef")) return "🍖";
  return "🍽️";
}

export default function QrOrderPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c87a53] border-t-transparent" />
          <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Loading ZAD Menu...</span>
        </div>
      </main>
    }>
      <QrOrder />
    </Suspense>
  );
}

function QrOrder() {
  const { branchId } = useParams<{ branchId: string }>();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");
  const { lang, toggle, t, tr } = useLang();

  // States
  const { data } = usePoll<{ branch: { name: string; tenantId: string }; categories: Category[] }>(`/api/qr/${branchId}/menu`, 0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(tableParam || "");
  const [txRef, setTxRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default theme from localStorage on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("cafeflow_theme") as "light" | "dark";
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("cafeflow_theme", nextTheme);
    }
  };

  // Local storage checks
  useEffect(() => {
    if (typeof window !== "undefined") {
      const orderKey = `cafeflow_active_order_${branchId}_${tableParam ?? "0"}`;
      const savedOrder = localStorage.getItem(orderKey);
      if (savedOrder) setActiveOrderId(savedOrder);

      const favKey = `cafeflow_favorites_${branchId}`;
      const savedFavs = localStorage.getItem(favKey);
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
    }
  }, [branchId, tableParam]);

  // Load Cart
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cartKey = `cafeflow_cart_${branchId}_${tableParam ?? "0"}`;
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) setCart(JSON.parse(savedCart));
    }
  }, [branchId, tableParam]);

  const saveCart = (newCart: Record<string, CartItem>) => {
    setCart(newCart);
    if (typeof window !== "undefined") {
      const cartKey = `cafeflow_cart_${branchId}_${tableParam ?? "0"}`;
      localStorage.setItem(cartKey, JSON.stringify(newCart));
    }
  };

  const handleClearOrder = () => {
    if (typeof window !== "undefined") {
      const orderKey = `cafeflow_active_order_${branchId}_${tableParam ?? "0"}`;
      localStorage.removeItem(orderKey);
      setActiveOrderId(null);
    }
  };

  // Add item with custom configurations
  const handleAddToCart = (item: MenuItem, qty: number, modifiers: CartItem["selectedModifiers"], notes: string) => {
    const modString = modifiers.map(m => `${m.groupName}:${m.option}`).sort().join("|");
    const cartId = `${item.id}-${modString}`;

    const newCart = { ...cart };
    if (newCart[cartId]) {
      newCart[cartId].qty += qty;
      newCart[cartId].notes = notes || newCart[cartId].notes;
    } else {
      const modifierCost = modifiers.reduce((acc, m) => acc + m.extraPrice, 0);
      newCart[cartId] = {
        id: cartId,
        menuItemId: item.id,
        name: item.name,
        nameAm: item.nameAm,
        price: Number(item.price) + modifierCost,
        qty,
        notes,
        imageUrl: item.imageUrl,
        selectedModifiers: modifiers
      };
    }
    saveCart(newCart);
    setSelectedItem(null);
  };

  // Adjust quantities in cart
  const updateQty = (id: string, delta: number) => {
    const newCart = { ...cart };
    if (newCart[id]) {
      newCart[id].qty += delta;
      if (newCart[id].qty <= 0) {
        delete newCart[id];
      }
      saveCart(newCart);
    }
  };

  // Favorite toggle
  const toggleFavorite = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newFavs = [...favorites];
    if (newFavs.includes(itemId)) {
      newFavs = newFavs.filter(id => id !== itemId);
    } else {
      newFavs.push(itemId);
    }
    setFavorites(newFavs);
    if (typeof window !== "undefined") {
      localStorage.setItem(`cafeflow_favorites_${branchId}`, JSON.stringify(newFavs));
    }
  };

  // Place Order Checkout
  const handlePlaceOrder = async () => {
    if (!txRef.trim()) {
      alert(lang === "en" ? "Please enter payment transaction reference number" : "እባክዎን የክፍያ ማረጋገጫ ቁጥር ያስገቡ");
      return;
    }
    
    setIsSubmitting(true);
    const items = Object.values(cart).map((c) => ({
      menuItemId: c.menuItemId,
      quantity: c.qty,
      modifiers: c.selectedModifiers,
      notes: `${c.notes || ""}${c.notes && c.selectedModifiers.length ? " | " : ""}${c.selectedModifiers.map(m => `${m.groupName}: ${m.option}`).join(", ")}`.trim()
    }));

    try {
      const res = await api<{ orderId: string; status: string }>(`/api/qr/${branchId}/order`, {
        method: "POST",
        body: JSON.stringify({
          tableNumber: tableNumber ? Number(tableNumber) : undefined,
          items,
          txRef
        }),
      });

      if (res && res.orderId) {
        if (typeof window !== "undefined") {
          const orderKey = `cafeflow_active_order_${branchId}_${tableParam ?? "0"}`;
          localStorage.setItem(orderKey, res.orderId);
          localStorage.removeItem(`cafeflow_cart_${branchId}_${tableParam ?? "0"}`);
        }
        setActiveOrderId(res.orderId);
        setCart({});
        setIsCartOpen(false);
        setIsPaymentOpen(false);
      }
    } catch (err) {
      console.error("Failed to place order:", err);
      alert(lang === "en" ? "Order placement failed. Please try again." : "ትዕዛዝ መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll spy effect to highlight category pill on manual page scrolling
  useEffect(() => {
    if (!data?.categories || data.categories.length === 0) return;
    
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      
      let currentActive = "All";
      for (const cat of data.categories) {
        const el = document.getElementById(`cat-section-${cat.id}`);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            currentActive = cat.id;
          }
        }
      }
      
      setActiveCategory(currentActive);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [data?.categories]);

  // Navigate to element smoothly
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Filter items matching query
  const allItems = data?.categories.flatMap(c => c.items) || [];
  const searchResults = searchQuery.trim() ? allItems.filter(it => 
    it.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (it.nameAm && it.nameAm.toLowerCase().includes(searchQuery.toLowerCase()))
  ) : [];

  const filteredItems = allItems.filter(it => {
    const matchesSearch = searchQuery ? (
      it.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (it.nameAm && it.nameAm.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : true;
    
    if (activeCategory === "All") return matchesSearch;
    if (activeCategory === "Favorites") return matchesSearch && favorites.includes(it.id);
    
    return matchesSearch && it.categoryId === activeCategory;
  });

  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.qty), 0);
  const vat = cartSubtotal * 0.15;
  const cartTotal = cartSubtotal + vat;

  // Active Order view (Order Tracker)
  if (activeOrderId) {
    return (
      <main className={`min-h-dvh transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-[#faf9f6] text-slate-800"
      }`}>
        {/* Simple tracker header */}
        <header className={`sticky top-0 z-nav border-b backdrop-blur-md px-4 py-3 flex items-center justify-between transition-colors duration-300 ${
          theme === "dark" ? "bg-slate-950/80 border-slate-900" : "bg-[#faf9f6]/80 border-slate-200"
        }`}>
          <h1 className="font-display text-lg font-bold">
            {data?.branch.name ?? "ZAD Cafe"} {tableParam && `· ${t("table")} ${tableParam}`}
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-xl text-xs font-semibold flex items-center gap-1 bg-[#c87a53]/10 text-[#c87a53] border border-[#c87a53]/20">
              <GlobeIcon className="h-4 w-4" />
              {lang === "en" ? "አማ" : "EN"}
            </button>
            <button 
              onClick={handleToggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                theme === "dark" ? "border-slate-800 hover:bg-slate-900" : "border-slate-200 hover:bg-slate-100"
              }`}
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <OrderTracker
            branchId={branchId}
            tableNumber={tableParam}
            orderId={activeOrderId}
            theme={theme}
            onClear={handleClearOrder}
          />
        </div>
      </main>
    );
  }

  return (
    <div className={`min-h-dvh transition-colors duration-300 pb-20 relative ${
      theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-[#faf9f6] text-slate-800"
    }`}>
      {/* Sticky Header Navigation */}
      <header className={`sticky top-0 z-nav border-b backdrop-blur-md transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-950/80 border-slate-900/80" : "bg-[#faf9f6]/80 border-slate-200/80"
      }`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-[#c87a53] text-xl font-black">☕</span>
            <span className="font-display text-lg font-bold uppercase tracking-wider">
              {data?.branch.name || "ZAD CAFE"}
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2.5">
            {/* Lang */}
            <button onClick={toggle} className="h-9 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 bg-[#c87a53]/10 text-[#c87a53] hover:bg-[#c87a53]/20 transition-all border border-[#c87a53]/15">
              <GlobeIcon className="h-4 w-4" />
              {lang === "en" ? "አማርኛ" : "English"}
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={handleToggleTheme}
              className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
                theme === "dark" ? "border-slate-800 hover:bg-slate-900 text-yellow-500" : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
              title="Toggle Theme"
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>

            {/* Direct Cart Button (if items present) */}
            {cartCount > 0 && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="h-9 px-3.5 bg-[#c87a53] text-white hover:bg-[#b3663d] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
                <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">{cartCount}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Welcome Top Title Card */}
      <div className="max-w-6xl mx-auto px-4 pt-6 text-left">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#c87a53]">
              {lang === "en" ? "Self-Service Ordering" : "ራስ-አገልግሎት ማዘዣ"}
            </span>
            <h1 className="font-display text-2xl sm:text-3.5xl font-extrabold tracking-tight mt-1">
              {data?.branch.name || "ZAD CAFE"}
            </h1>
          </div>
          {tableParam && (
            <div className="bg-[#c87a53]/10 text-[#c87a53] border border-[#c87a53]/25 px-3.5 py-1.5 rounded-xl font-bold text-xs font-mono shrink-0">
              {lang === "en" ? `Table ${tableParam}` : `ጠረጴዛ ${tableParam}`}
            </div>
          )}
        </div>
      </div>

      {/* Menu Section */}
      <section className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Dynamic Search & Input Container */}
        <div className="relative group max-w-xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#c87a53] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <input 
            type="text"
            placeholder={lang === "en" ? "Search delicious food..." : "ጣፋጭ ምግቦችን እዚህ ይፈልጉ..."}
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            className={`w-full border rounded-2xl py-3.5 pl-11 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-[#c87a53]/40 transition-all placeholder:text-slate-400 ${
              theme === "dark" 
                ? "bg-slate-900/90 border-slate-800 text-white focus:border-[#c87a53] focus:bg-slate-900" 
                : "bg-white border-slate-200 text-slate-900 focus:border-[#c87a53] focus:bg-white"
            }`}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setShowSearchDropdown(false); }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}

          {/* Search Dropdown Panel */}
          {showSearchDropdown && searchQuery.trim() && (
            <>
              {/* Overlay blocker to close search */}
              <div className="fixed inset-0 z-dropdown" onClick={() => setShowSearchDropdown(false)} />
              
              <div className={`absolute left-0 right-0 mt-2 rounded-2xl border shadow-xl z-modal max-h-64 overflow-y-auto ${
                theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    {lang === "en" ? "No items found." : "ምንም ምግቦች አልተገኙም።"}
                  </div>
                ) : (
                  <div className="p-2 divide-y divide-slate-800/20">
                    {searchResults.map((it) => (
                      <div 
                        key={it.id} 
                        onClick={() => {
                          setSelectedItem(it);
                          setShowSearchDropdown(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                          theme === "dark" ? "hover:bg-slate-800/60" : "hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3 text-left min-w-0">
                          <img 
                            src={getLocalItemImage(it.name, it.imageUrl)} 
                            alt={it.name} 
                            className="h-10 w-10 rounded-lg object-cover bg-slate-800" 
                          />
                          <div className="min-w-0">
                            <div className={`text-xs font-semibold truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                              {tr(it.name, it.nameAm)}
                            </div>
                            {it.description && (
                              <div className="text-[10px] text-slate-400 line-clamp-1 truncate mt-0.5">
                                {it.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`font-mono text-xs font-bold shrink-0 pl-2 ${theme === "dark" ? "text-[#c87a53]" : "text-[#c87a53]"}`}>
                          {Number(it.price).toLocaleString()} ETB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sticky Category Selector Navbar Row */}
        <div className={`sticky top-16 z-40 backdrop-blur py-3.5 border-b -mx-4 px-4 overflow-x-auto flex gap-2 no-scrollbar scroll-smooth transition-colors duration-300 ${
          theme === "dark" ? "bg-slate-950/90 border-slate-900/60" : "bg-[#faf9f6]/95 border-slate-200/60"
        }`}>
          <button 
            onClick={() => {
              setActiveCategory("All");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === "All" 
                ? "bg-[#c87a53] text-white shadow-md scale-105" 
                : theme === "dark" 
                ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white" 
                : "bg-white border border-slate-200 text-slate-650 hover:text-slate-900"
            }`}
          >
            🍽️ {lang === "en" ? "All Items" : "ሁሉንም"}
          </button>
          
          <button 
            onClick={() => {
              setActiveCategory("Favorites");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === "Favorites" 
                ? "bg-[#ef4444] text-white shadow-md scale-105" 
                : theme === "dark" 
                ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white" 
                : "bg-white border border-slate-200 text-slate-650 hover:text-slate-900"
            }`}
          >
            ❤️ {lang === "en" ? `Favorites (${favorites.length})` : `ተወዳጆች (${favorites.length})`}
          </button>

          {data?.categories.map((c) => (
            <button 
              key={c.id}
              onClick={() => {
                setActiveCategory(c.id);
                scrollToSection(`cat-section-${c.id}`);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === c.id 
                  ? "bg-[#c87a53] text-white shadow-md scale-105" 
                  : theme === "dark" 
                  ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white" 
                  : "bg-white border border-slate-200 text-slate-650 hover:text-slate-900"
              }`}
            >
              {getCategoryEmoji(c.name)} {tr(c.name, c.nameAm)}
            </button>
          ))}
        </div>

        {/* Menu Grid Items grouped by categories */}
        <div className="space-y-12 pt-4">
          {data?.categories.map((c) => {
            // Filter items under this category
            const categoryFilteredItems = filteredItems.filter(it => it.categoryId === c.id);
            
            // Only render category sections if they have matching search results,
            // or if we are displaying "All" or specifically this category
            const shouldRender = categoryFilteredItems.length > 0 && 
              (activeCategory === "All" || activeCategory === "Favorites" || activeCategory === c.id);

            if (!shouldRender) return null;

            return (
              <div 
                id={`cat-section-${c.id}`} 
                key={c.id} 
                className="space-y-4 pt-6 scroll-mt-32 border-t border-slate-800/10 dark:border-slate-800/50 first:border-none first:pt-0"
              >
                <div className="flex items-center gap-2 border-l-4 border-[#c87a53] pl-3 text-left">
                  <span className="text-lg">{getCategoryEmoji(c.name)}</span>
                  <h3 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-wide">
                    {tr(c.name, c.nameAm)}
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categoryFilteredItems.map((it) => (
                    <div 
                      key={it.id} 
                      className={`group flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer relative ${
                        theme === "dark" 
                          ? "bg-slate-900/60 border-slate-900 hover:border-slate-800 hover:shadow-lg" 
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
                      }`}
                      onClick={() => setSelectedItem(it)}
                    >
                      {/* Image panel */}
                      <div className="relative h-32 sm:h-40 w-full overflow-hidden bg-slate-850">
                        <img 
                          src={getLocalItemImage(it.name, it.imageUrl)} 
                          alt={it.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                        {/* Heart icon button overlay */}
                        <button 
                          onClick={(e) => toggleFavorite(it.id, e)}
                          className="absolute top-2 left-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-950/70 backdrop-blur-md flex items-center justify-center text-white hover:text-[#ef4444] transition-all scale-95 shadow-md border border-white/10"
                        >
                          <svg 
                            viewBox="0 0 24 24" 
                            fill={favorites.includes(it.id) ? "currentColor" : "none"} 
                            stroke="currentColor" 
                            strokeWidth={2} 
                            className={`h-4.5 w-4.5 ${favorites.includes(it.id) ? "text-[#ef4444]" : "text-white"}`}
                          >
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                          </svg>
                        </button>
                        {/* Calorie Indicator badge */}
                        <div className="absolute top-2 right-2 bg-slate-950/75 backdrop-blur-md text-[9px] font-semibold text-white/95 px-2 py-0.5 rounded-full border border-white/5 font-mono">
                          🔥 {getItemCalories(it.id, it.name)} cal
                        </div>
                      </div>

                      {/* Card details */}
                      <div className="p-3.5 space-y-2 flex flex-col justify-between flex-grow">
                        <div className="text-left space-y-1">
                          <h4 className={`font-bold text-xs sm:text-sm transition-colors group-hover:text-[#c87a53] line-clamp-1 leading-tight ${
                            theme === "dark" ? "text-white" : "text-slate-900"
                          }`}>
                            {lang === "en" ? it.name : (it.nameAm || it.name)}
                          </h4>
                          <h5 className="text-[10px] text-slate-400 line-clamp-1 leading-none font-medium">
                            {lang === "en" ? (it.nameAm || "") : it.name}
                          </h5>
                          {it.description && (
                            <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1 leading-snug font-light mt-1">
                              {it.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-1.5 gap-2">
                          <span className={`font-mono text-xs sm:text-sm font-bold whitespace-nowrap ${
                            theme === "dark" ? "text-slate-100" : "text-slate-900"
                          }`}>
                            {Number(it.price).toLocaleString()} ETB
                          </span>
                          <button 
                            className="bg-[#c87a53] hover:bg-[#b3663d] text-white h-7 px-3 rounded-lg text-xxs font-bold flex items-center gap-1 active:scale-95 transition-transform shrink-0"
                            onClick={(e) => { e.stopPropagation(); setSelectedItem(it); }}
                          >
                            <PlusIcon className="h-3 w-3 stroke-[3.5]" />
                            {t("add")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Fallback empty view */}
          {filteredItems.length === 0 && (
            <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-14 w-14 opacity-40"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
              <p className="font-medium text-sm">{lang === "en" ? "No menu items match your selection." : "ምንም ምግቦች አልተገኙም።"}</p>
              {(activeCategory !== "All" || searchQuery) && (
                <button 
                  onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                  className="mt-2 text-xs font-bold text-[#c87a53] border border-[#c87a53]/25 px-3 py-1.5 rounded-xl hover:bg-[#c87a53]/5"
                >
                  {lang === "en" ? "Reset filters" : "ሁሉንም አሳይ"}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 border bg-opacity-95 backdrop-blur-md px-4 py-3 flex items-center justify-between rounded-2xl shadow-xl z-modal animate-in transition-colors duration-300 border-[#c87a53]/35 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 rounded-xl bg-[#c87a53]/20 flex items-center justify-center text-[#c87a53]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
              <span className="absolute -top-1.5 -right-1.5 bg-[#ef4444] text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-slate-950 shadow-sm font-mono">
                {cartCount}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400">{lang === "en" ? "Subtotal" : "አጠቃላይ ዋጋ"}</span>
              <span className="font-mono text-xs font-bold text-white">{(cartTotal).toLocaleString()} ETB</span>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-[#c87a53] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1 shadow-md hover:bg-[#b3663d] active:scale-95 transition-all"
          >
            {lang === "en" ? "View Cart" : "ትዕዛዝ እይ / ክፈል"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}

      {/* Item Detail & Modification Modal */}
      {selectedItem && (
        <ItemDetailModal 
          item={selectedItem} 
          allItems={allItems}
          lang={lang}
          tr={tr}
          theme={theme}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddToCart}
          onSwitchItem={(it) => setSelectedItem(it)}
        />
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <CartDrawer 
          cart={cart}
          lang={lang}
          tr={tr}
          theme={theme}
          subtotal={cartSubtotal}
          vat={vat}
          total={cartTotal}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
          onClose={() => setIsCartOpen(false)}
          onUpdateQty={updateQty}
          onProceed={() => setIsPaymentOpen(true)}
        />
      )}

      {/* Payment Checkout Modal */}
      {isPaymentOpen && (
        <PaymentModal 
          lang={lang}
          tr={tr}
          theme={theme}
          total={cartTotal}
          onClose={() => setIsPaymentOpen(false)}
          txRef={txRef}
          setTxRef={setTxRef}
          isSubmitting={isSubmitting}
          onSubmit={handlePlaceOrder}
        />
      )}
    </div>
  );
}

// ── Item modification modal component ──────────────────────────────
function ItemDetailModal({ 
  item, 
  allItems,
  lang,
  tr,
  theme,
  onClose,
  onAdd,
  onSwitchItem
}: { 
  item: MenuItem; 
  allItems: MenuItem[];
  lang: string;
  tr: any;
  theme: string;
  onClose: () => void;
  onAdd: (item: MenuItem, qty: number, modifiers: CartItem["selectedModifiers"], notes: string) => void;
  onSwitchItem: (it: MenuItem) => void;
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedMods, setSelectedMods] = useState<Record<string, string>>({});

  // Parse modifier options
  const grouped: Record<string, Modifier[]> = {};
  item.modifiers?.forEach(m => {
    if (!grouped[m.groupName]) grouped[m.groupName] = [];
    grouped[m.groupName].push(m);
  });

  // Default fallbacks if database lacks seed modifiers
  const hasDbModifiers = Object.keys(grouped).length > 0;
  const isDrink = item.course === "drink" || item.name.toLowerCase().includes("drink") || item.name.toLowerCase().includes("tea") || item.name.toLowerCase().includes("coffee") || item.name.toLowerCase().includes("juice") || item.name.toLowerCase().includes("water");

  // Fallback setup
  const fallbackGroups = isDrink ? {
    "Size": [
      { option: "Small", extraPrice: 0 },
      { option: "Large", extraPrice: 20 }
    ],
    "Sugar Level": [
      { option: "No sugar", extraPrice: 0 },
      { option: "Medium", extraPrice: 0 },
      { option: "Extra sugar", extraPrice: 0 }
    ],
    "Temperature": [
      { option: "Hot", extraPrice: 0 },
      { option: "Cold", extraPrice: 0 }
    ]
  } : {
    "Portion": [
      { option: "Standard", extraPrice: 0 },
      { option: "Large", extraPrice: 40 }
    ],
    "Add-ons": [
      { option: "None", extraPrice: 0 },
      { option: "Extra Cheese", extraPrice: 30 }
    ]
  };

  // Initialize defaults
  useEffect(() => {
    const defaults: Record<string, string> = {};
    if (hasDbModifiers) {
      Object.entries(grouped).forEach(([groupName, opts]) => {
        defaults[groupName] = opts[0].option;
      });
    } else {
      Object.entries(fallbackGroups).forEach(([groupName, opts]) => {
        defaults[groupName] = opts[0].option;
      });
    }
    setSelectedMods(defaults);
    setQty(1);
    setNotes("");
  }, [item, hasDbModifiers]);

  const selectOption = (group: string, val: string) => {
    setSelectedMods(prev => ({ ...prev, [group]: val }));
  };

  // Cost calculator
  let modifierExtra = 0;
  const selectedModsList: CartItem["selectedModifiers"] = [];

  Object.entries(selectedMods).forEach(([groupName, optionName]) => {
    if (hasDbModifiers) {
      const matched = grouped[groupName]?.find(m => m.option === optionName);
      if (matched) {
        const extra = Number(matched.extraPrice);
        modifierExtra += extra;
        selectedModsList.push({ groupName, option: optionName, extraPrice: extra });
      }
    } else {
      const matched = fallbackGroups[groupName as keyof typeof fallbackGroups]?.find(o => o.option === optionName);
      if (matched) {
        modifierExtra += matched.extraPrice;
        selectedModsList.push({ groupName, option: optionName, extraPrice: matched.extraPrice });
      }
    }
  });

  const finalUnitPrice = Number(item.price) + modifierExtra;
  const totalPrice = finalUnitPrice * qty;

  // Filter dynamic companion recommended items (from same category, excluding active)
  const companionItems = allItems.filter(
    (it) => it.categoryId === item.categoryId && it.id !== item.id
  ).slice(0, 3);

  return (
    <div className="fixed inset-0 z-modal bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade" onClick={onClose}>
      <div 
        className={`w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col animate-in ${
          theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover image panel */}
        <div className="relative h-48 sm:h-56 bg-slate-950 flex-shrink-0">
          <img 
            src={getLocalItemImage(item.name, item.imageUrl)} 
            alt={item.name} 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-950/75 hover:bg-slate-950 flex items-center justify-center text-white text-sm font-bold shadow-md transition-colors border border-white/10"
          >
            ✕
          </button>
          
          <div className="absolute bottom-4 left-4 right-4 text-left">
            <span className="text-[10px] uppercase tracking-widest text-[#c87a53] font-extrabold bg-[#c87a53]/15 border border-[#c87a53]/25 px-2.5 py-0.5 rounded-full inline-block">
              {isDrink ? (lang === "en" ? "Beverage" : "መጠጥ") : (lang === "en" ? "Gourmet Dish" : "ምግብ")}
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-1.5 leading-tight">
              {tr(item.name, item.nameAm)}
            </h2>
          </div>
        </div>

        {/* Scrollable details */}
        <div className="p-5 space-y-5 overflow-y-auto flex-grow text-left">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-mono text-[#c87a53] text-base font-bold">
              {finalUnitPrice.toLocaleString()} ETB
            </div>
            <div className="text-xs text-slate-400 font-semibold font-mono">
              🔥 {getItemCalories(item.id, item.name)} calories
            </div>
          </div>
          
          {item.description && (
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              {item.description}
            </p>
          )}

          {/* Modifier Sections */}
          <div className="space-y-4 pt-4 border-t border-slate-800/10 dark:border-slate-800/60">
            {hasDbModifiers ? (
              Object.entries(grouped).map(([groupName, opts]) => (
                <div key={groupName} className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">{groupName}</span>
                  <div className="flex flex-wrap gap-2">
                    {opts.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => selectOption(groupName, opt.option)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          selectedMods[groupName] === opt.option 
                            ? "bg-[#c87a53] text-white scale-105" 
                            : theme === "dark" 
                            ? "bg-slate-950 text-slate-400 hover:text-white border border-slate-800" 
                            : "bg-slate-50 text-slate-650 hover:text-slate-900 border border-slate-200"
                        }`}
                      >
                        {opt.option} {Number(opt.extraPrice) > 0 && `(+${Number(opt.extraPrice)} ETB)`}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              Object.entries(fallbackGroups).map(([groupName, opts]) => (
                <div key={groupName} className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">{groupName}</span>
                  <div className="flex flex-wrap gap-2">
                    {opts.map((opt: { option: string; extraPrice: number }) => (
                      <button
                        key={opt.option}
                        onClick={() => selectOption(groupName, opt.option)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          selectedMods[groupName] === opt.option 
                            ? "bg-[#c87a53] text-white scale-105" 
                            : theme === "dark" 
                            ? "bg-slate-950 text-slate-400 hover:text-white border border-slate-800" 
                            : "bg-slate-50 text-slate-650 hover:text-slate-900 border border-slate-200"
                        }`}
                      >
                        {opt.option} {opt.extraPrice > 0 && `(+${opt.extraPrice} ETB)`}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Special Instructions */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">
                {lang === "en" ? "Special Requests" : "ልዩ ትዕዛዝ ካለዎት"}
              </span>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={lang === "en" ? "e.g., No sugar, extra hot, etc." : "ምሳሌ፡ ስኳር አይቀላቀል፣ በጣም ሙቅ ይሁን..."}
                rows={2}
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#c87a53] ${
                  theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>
          </div>

          {/* Companion items recommendations section */}
          {companionItems.length > 0 && (
            <div className="pt-4 border-t border-slate-800/10 dark:border-slate-800/60">
              <div className="text-xs font-semibold text-slate-400 mb-2.5">
                {lang === "en" ? "You might also like" : "ይህንንም ሊወዱት ይችላሉ"}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {companionItems.map((comp) => (
                  <div 
                    key={comp.id}
                    onClick={() => onSwitchItem(comp)}
                    className={`flex items-center gap-2 p-2 rounded-xl shrink-0 cursor-pointer border hover:border-[#c87a53]/85 transition-colors w-44 text-left ${
                      theme === "dark" ? "bg-slate-950 border-slate-800/60" : "bg-slate-50 border-slate-200/80"
                    }`}
                  >
                    <img 
                      src={getLocalItemImage(comp.name, comp.imageUrl)} 
                      alt={comp.name} 
                      className="h-10 w-10 rounded-lg object-cover bg-slate-900" 
                    />
                    <div className="flex-grow min-w-0">
                      <div className={`text-[10px] font-semibold truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{tr(comp.name, comp.nameAm)}</div>
                      <div className="text-[10px] text-[#c87a53] font-mono font-bold mt-0.5">{Number(comp.price).toLocaleString()} ETB</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-4 flex-shrink-0 ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}>
          {/* Qty count control */}
          <div className={`flex items-center gap-2 border rounded-xl p-1 shrink-0 ${
            theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}>
            <button 
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="h-7 w-7 rounded-lg hover:bg-slate-900 flex items-center justify-center font-bold text-base"
            >
              －
            </button>
            <span className="font-mono font-bold text-xs w-5 text-center">{qty}</span>
            <button 
              onClick={() => setQty(q => q + 1)}
              className="h-7 w-7 rounded-lg hover:bg-slate-900 flex items-center justify-center font-bold text-base"
            >
              ＋
            </button>
          </div>

          <button
            onClick={() => onAdd(item, qty, selectedModsList, notes)}
            className="flex-grow bg-[#c87a53] hover:bg-[#b3663d] text-white h-10 rounded-xl text-xs font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span>{lang === "en" ? "Add to Order" : "ትዕዛዝ ላይ ጨምር"}</span>
            <span className="font-mono bg-black/15 px-2 py-0.5 rounded-lg">({totalPrice.toLocaleString()} ETB)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cart Drawer panel ──────────────────────────────────────────────
function CartDrawer({
  cart,
  lang,
  tr,
  theme,
  subtotal,
  vat,
  total,
  tableNumber,
  setTableNumber,
  onClose,
  onUpdateQty,
  onProceed
}: {
  cart: Record<string, CartItem>;
  lang: string;
  tr: any;
  theme: string;
  subtotal: number;
  vat: number;
  total: number;
  tableNumber: string;
  setTableNumber: (val: string) => void;
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onProceed: () => void;
}) {
  const itemsList = Object.values(cart);

  return (
    <div className="fixed inset-0 z-modal bg-black/80 backdrop-blur-xs flex justify-end animate-fade" onClick={onClose}>
      <div 
        className={`w-full max-w-md h-full shadow-2xl flex flex-col animate-in ${
          theme === "dark" ? "bg-slate-900 text-white border-l border-slate-800" : "bg-white text-slate-900 border-l border-slate-200"
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ animationName: "fade-in-up" }}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          theme === "dark" ? "border-slate-850" : "border-slate-100"
        }`}>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold">
              {lang === "en" ? "Review Your Order" : "ትዕዛዝዎን ይገምግሙ"}
            </h2>
            <span className="bg-[#c87a53]/15 text-[#c87a53] text-xxs font-extrabold px-2 py-0.5 rounded-full font-mono">
              {itemsList.length} items
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="h-8 w-8 rounded-lg hover:bg-slate-800/10 flex items-center justify-center text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Drawer Items list */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3.5">
          {itemsList.length === 0 ? (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center gap-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-12 w-12 opacity-35"><circle cx="12" cy="12" r="10"/><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
              <p className="text-xs font-semibold">{lang === "en" ? "Your cart is empty." : "የእርስዎ ጋሪ ባዶ ነው።"}</p>
            </div>
          ) : (
            itemsList.map((item) => (
              <div 
                key={item.id} 
                className={`flex justify-between items-start gap-3 p-3.5 rounded-2xl border text-left ${
                  theme === "dark" ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/50 border-slate-100"
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm leading-tight truncate">
                    {tr(item.name, item.nameAm)}
                  </h4>
                  {item.selectedModifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.selectedModifiers.map((m, idx) => (
                        <span key={idx} className="bg-[#c87a53]/10 text-[#c87a53] text-[9px] font-semibold px-2 py-0.5 rounded-md">
                          {m.groupName}: {m.option}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-[10px] text-slate-400 italic font-light line-clamp-2">
                      "{item.notes}"
                    </p>
                  )}
                  <div className="font-mono text-xs font-bold text-[#c87a53] pt-0.5">
                    {(item.price * item.qty).toLocaleString()} ETB
                  </div>
                </div>

                <div className={`flex items-center gap-1 border rounded-lg p-0.5 shrink-0 ${
                  theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
                }`}>
                  <button 
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="h-6 w-6 rounded hover:bg-slate-800/10 flex items-center justify-center font-bold text-xs"
                  >
                    －
                  </button>
                  <span className="font-mono font-bold text-xs w-4 text-center">{item.qty}</span>
                  <button 
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="h-6 w-6 rounded hover:bg-slate-800/10 flex items-center justify-center font-bold text-xs"
                  >
                    ＋
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer bill breakdown */}
        {itemsList.length > 0 && (
          <div className={`p-4 border-t space-y-4 ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            {/* Table Number setup */}
            <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${
              theme === "dark" ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/50 border-slate-200"
            }`}>
              <span className="text-xs font-semibold text-slate-400">{lang === "en" ? "Table Number" : "የጠረጴዛ ቁጥር"}</span>
              <input 
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. 5"
                className={`w-16 border rounded-lg px-2.5 py-1 text-center font-mono text-xs font-bold focus:outline-none focus:border-[#c87a53] ${
                  theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div className="space-y-2 text-xs border-b pb-3.5 text-slate-400 border-slate-800/40">
              <div className="flex justify-between">
                <span>{lang === "en" ? "Subtotal" : "ንዑስ ድምር"}</span>
                <span className="font-mono font-bold text-slate-200">{subtotal.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>{lang === "en" ? "VAT (15%)" : "ተጨማሪ እሴት ታክስ (15%)"}</span>
                <span className="font-mono font-bold text-slate-200">{vat.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1.5">
                <span className={theme === "dark" ? "text-white" : "text-slate-900"}>{lang === "en" ? "Grand Total" : "አጠቃላይ ድምር"}</span>
                <span className="font-mono text-[#c87a53] text-base">{total.toLocaleString()} ETB</span>
              </div>
            </div>

            <button 
              onClick={onProceed}
              className="w-full bg-[#c87a53] hover:bg-[#b3663d] text-white h-11 rounded-xl text-xs font-bold shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
            >
              <span>{lang === "en" ? "Proceed to Payment" : "ወደ ክፍያ ሂድ"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Payment selection modal component ──────────────────────────────
function PaymentModal({
  lang,
  tr,
  theme,
  total,
  onClose,
  txRef,
  setTxRef,
  isSubmitting,
  onSubmit
}: {
  lang: string;
  tr: any;
  theme: string;
  total: number;
  onClose: () => void;
  txRef: string;
  setTxRef: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  const [activeChannel, setActiveChannel] = useState<"TELEBIRR" | "CBE_BIRR">("TELEBIRR");
  const [copied, setCopied] = useState(false);

  const paymentDetails = {
    TELEBIRR: {
      label: "Telebirr Merchant",
      account: "100012345",
      name: "CafeFlow Technologies",
      instructionsEn: "Open your Telebirr app, choose 'Pay Merchant', scan/enter the code below, and pay the exact total.",
      instructionsAm: "የቴሌብር መተግበሪያዎን ይክፈቱ፣ 'ለንግድ ድርጅት ክፈል' የሚለውን ይምረጡ፣ ከታች ያለውን ኮድ ያስገቡ እና ይክፈሉ"
    },
    CBE_BIRR: {
      label: "CBE Account Number",
      account: "1000987654321",
      name: "CafeFlow Technologies",
      instructionsEn: "Transfer the exact total amount to the Commercial Bank of Ethiopia (CBE) account number below.",
      instructionsAm: "እባክዎን ከታች የተጠቀሰውን የኢትዮጵያ ንግድ ባንክ (CBE) የሂሳብ ቁጥር በመጠቀም ትክክለኛውን ክፍያ ይላኩ።"
    }
  };

  const current = paymentDetails[activeChannel];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade" onClick={onClose}>
      <div 
        className={`w-full max-w-md rounded-3xl border overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col animate-in ${
          theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between text-left ${
          theme === "dark" ? "border-slate-800" : "border-slate-100"
        }`}>
          <h3 className="font-display text-base font-bold">
            {lang === "en" ? "Complete Your Payment" : "ክፍያውን ያጠናቁ"}
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-800/10 flex items-center justify-center text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        {/* Channels */}
        <div className="p-4 space-y-4 text-left overflow-y-auto flex-grow">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setActiveChannel("TELEBIRR"); setTxRef(""); }}
              className={`p-3 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                activeChannel === "TELEBIRR" 
                  ? "bg-[#c87a53]/15 border-[#c87a53] text-[#c87a53]" 
                  : theme === "dark"
                  ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  : "bg-slate-50 border-slate-200 text-slate-650 hover:text-slate-900"
              }`}
            >
              <span className="text-lg">📱</span>
              Telebirr
            </button>
            <button
              onClick={() => { setActiveChannel("CBE_BIRR"); setTxRef(""); }}
              className={`p-3 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                activeChannel === "CBE_BIRR" 
                  ? "bg-[#c87a53]/15 border-[#c87a53] text-[#c87a53]" 
                  : theme === "dark"
                  ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  : "bg-slate-50 border-slate-200 text-slate-650 hover:text-slate-900"
              }`}
            >
              <span className="text-lg">🏦</span>
              CBE Transfer
            </button>
          </div>

          {/* Payment instructions */}
          <div className={`border p-4 rounded-2xl space-y-3 ${
            theme === "dark" ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/50 border-slate-200"
          }`}>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === "en" ? current.instructionsEn : current.instructionsAm}
            </p>
            
            <div className="border-t pt-3 space-y-2 border-slate-800/40">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{current.label}:</div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
              }`}>
                <span className="font-mono text-sm font-bold tracking-wider">{current.account}</span>
                <button 
                  onClick={handleCopy}
                  className={`h-7 px-3.5 rounded-lg text-xxs font-bold flex items-center gap-1 transition-all ${
                    copied ? "bg-green-600 text-white" : "bg-[#c87a53] hover:bg-[#b3663d] text-white"
                  }`}
                >
                  <ClipboardIcon className="h-3 w-3" />
                  {copied ? (lang === "en" ? "Copied!" : "ተቀድቷል!") : (lang === "en" ? "Copy" : "ቅዳ")}
                </button>
              </div>
              <div className="text-[10px] text-slate-400">
                {lang === "en" ? "Account Name" : "የባንክ ሒሳብ ስም"}: <span className="font-bold text-slate-200">{current.name}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {lang === "en" ? "Amount to Transfer" : "የሚተላለፈው የገንዘብ መጠን"}: <span className="text-[#c87a53] font-bold font-mono text-xs">{total.toLocaleString()} ETB</span>
              </div>
            </div>
          </div>

          {/* Reference Input */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-400 block">
              {lang === "en" ? "Transaction Reference Number *" : "የክፍያ ማረጋገጫ ቁጥር (Reference) *"}
            </label>
            <input 
              type="text"
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
              placeholder="e.g. FT26173X29"
              className={`w-full border rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[#c87a53] ${
                theme === "dark" ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-950" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white"
              }`}
            />
            <span className="text-[10px] text-slate-400 leading-tight block">
              {lang === "en" 
                ? "Enter the exact reference ID/code received from the bank after payment completion."
                : "ክፍያውን እንደፈጸሙ የደረሰዎትን ትክክለኛ የክፍያ ማረጋገጫ መለያ ቁጥር እዚህ ያስገቡ።"}
            </span>
          </div>
        </div>

        {/* Place Order CTA */}
        <div className={`p-4 border-t flex-shrink-0 ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !txRef.trim()}
            className="w-full bg-[#c87a53] text-white hover:bg-[#b3663d] h-11 rounded-xl text-xs font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {lang === "en" ? "Placing Order..." : "ትዕዛዝ በመላክ ላይ..."}
              </>
            ) : (
              <>
                {lang === "en" ? "Confirm & Place Order" : "ክፍያ አረጋግጥ & እዘዝ"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Real-time order preparation status tracker component ──────────────────────────────
function OrderTracker({
  branchId,
  tableNumber,
  orderId,
  theme,
  onClear,
}: {
  branchId: string;
  tableNumber: string | null;
  orderId: string;
  theme: string;
  onClear: () => void;
}) {
  const { lang, t, tr } = useLang();
  const { data: order, error, loading } = usePoll<{
    id: string;
    status: string;
    type: string;
    createdAt: string;
    tableNumber?: number;
    items: {
      id: string;
      name: string;
      nameAm: string | null;
      quantity: number;
      status: string;
      notes?: string;
    }[];
  }>(`/api/qr/${branchId}/order/${orderId}`, 4000);

  if (loading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#c87a53] border-t-transparent" />
        <span className="text-xs text-slate-400 tracking-wider font-semibold uppercase">
          {lang === "en" ? "Loading order details..." : "የትዕዛዝ ዝርዝር በመጫን ላይ..."}
        </span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={`p-6 rounded-3xl border text-center max-w-md mx-auto my-12 flex flex-col items-center gap-4 ${
        theme === "dark" ? "bg-slate-900 border-red-500/20" : "bg-white border-red-200 shadow-md"
      }`}>
        <AlertTriangleIcon className="h-12 w-12 text-red-500 animate-bounce" />
        <div>
          <h3 className="font-display text-lg font-bold">
            {lang === "en" ? "Failed to Load Order" : "ትዕዛዝ መጫን አልተቻለም"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed font-light">
            {lang === "en"
              ? "We couldn't retrieve the status of this order. It may have been cleared or cancelled."
              : "የዚህን ትዕዛዝ ሁኔታ ማግኘት አልቻልንም። ምናልባት ተሰርዞ ወይም ተደምስሶ ሊሆን ይችላል።"}
          </p>
        </div>
        <button 
          onClick={onClear} 
          className="w-full bg-[#c87a53] hover:bg-[#b3663d] text-white font-bold h-10 rounded-xl text-xs active:scale-95 transition-all shadow-md"
        >
          {lang === "en" ? "Return to Menu" : "ወደ ምናሌ ይመለሱ"}
        </button>
      </div>
    );
  }

  let currentStep = 1;
  const status = order.status;

  if (["SUBMITTED", "IN_PREPARATION", "PARTIALLY_READY"].includes(status)) {
    currentStep = 2;
  } else if (status === "READY") {
    currentStep = 3;
  } else if (["DELIVERED", "BILL_REQUESTED", "PAYMENT_PENDING", "COMPLETED"].includes(status)) {
    currentStep = 4;
  } else if (["VOIDED", "REFUNDED"].includes(status)) {
    currentStep = -1; 
  }

  const steps = [
    {
      num: 1,
      titleEn: "Awaiting",
      titleAm: "በመጠባበቅ ላይ",
      descEn: "Confirming reference",
      descAm: "ትዕዛዝ ማረጋገጥ",
    },
    {
      num: 2,
      titleEn: "Preparing",
      titleAm: "በዝግጅት ላይ",
      descEn: "In kitchen / bar",
      descAm: "በማብሰያ / ባር ላይ",
    },
    {
      num: 3,
      titleEn: "Ready",
      titleAm: "ዝግጁ",
      descEn: "Ready for pickup",
      descAm: "ለመውሰድ ዝግጁ",
    },
    {
      num: 4,
      titleEn: "Served",
      titleAm: "ቀረበ",
      descEn: "Enjoy your order!",
      descAm: "መልካም ምግብ!",
    },
  ];

  return (
    <div className="space-y-6 text-left animate-in">
      <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all duration-300 ${
        theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-md"
      }`}>
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-[#c87a53]/5 blur-3xl" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2 border-slate-800/40">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#c87a53]">
              {lang === "en" ? "Self-Order Tracker" : "የራስ-ትዕዛዝ መከታተያ"}
            </span>
            <h2 className="font-display text-lg font-bold mt-0.5">
              {lang === "en" ? "Order Tracker" : "የትዕዛዝ ሁኔታ"} {tableNumber && `· ${t("table")} ${tableNumber}`}
            </h2>
          </div>
          <div className="text-[10px] text-slate-400 tabular sm:text-right">
            <div>Order ID: <span className="font-mono text-[#c87a53] font-bold">{order.id.slice(-8).toUpperCase()}</span></div>
            <div>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        {currentStep === -1 ? (
          <div className="my-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-in">
            <AlertTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-500 text-sm">
                {lang === "en" ? "Order Cancelled" : "ትዕዛዝ ተሰርዟል"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {lang === "en"
                  ? "This order was voided or cancelled by staff. Please contact waiter for help or create a new order."
                  : "ይህ ትዕዛዝ በአስተናጋጅ ተሰርዟል። እባክዎን አስተናጋጅ ይጠይቁ ወይም አዲስ ትዕዛዝ ይፍጠሩ።"}
              </p>
            </div>
          </div>
        ) : (
          <div className="my-8 relative">
            <div className="absolute top-[18px] left-[32px] right-[32px] h-0.5 bg-slate-800 z-0 hidden sm:block" />
            <div
              className="absolute top-[18px] left-[32px] h-0.5 bg-[#c87a53] transition-all duration-500 ease-out z-0 hidden sm:block"
              style={{ width: `${Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100)}%` }}
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 sm:gap-2 relative z-10">
              {steps.map((step) => {
                const isCompleted = currentStep > step.num;
                const isActive = currentStep === step.num;

                return (
                  <div key={step.num} className="flex sm:flex-col items-center gap-4 sm:gap-2.5 text-left sm:text-center group">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all duration-300 shadow-md ${
                        isActive
                          ? "bg-[#c87a53]/15 border-[#c87a53] text-[#c87a53] scale-110 ring-4 ring-[#c87a53]/15"
                          : isCompleted
                          ? "bg-[#c87a53] border-[#c87a53] text-white"
                          : theme === "dark" 
                          ? "bg-slate-900 border-slate-800 text-slate-550"
                          : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="h-4.5 w-4.5 text-white stroke-[2.5]" />
                      ) : (
                        <span>{step.num}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-xs sm:text-sm font-bold transition-colors duration-300 ${
                          isActive ? "text-[#c87a53]" : isCompleted ? (theme === "dark" ? "text-white" : "text-slate-900") : "text-slate-500"
                        }`}
                      >
                        {lang === "en" ? step.titleEn : step.titleAm}
                      </span>
                      <span className="text-[10px] text-slate-450 leading-tight">
                        {lang === "en" ? step.descEn : step.descAm}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <h3 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b pb-2 border-slate-800/40">
            {lang === "en" ? "Items in this Order" : "የትዕዛዝ ዕቃዎች"}
          </h3>
          <ul className="divide-y divide-slate-800/20">
            {order.items.map((it) => {
              let itemStatusColor = "text-slate-500 bg-slate-850";
              let statusLabelEn = it.status;
              let statusLabelAm = it.status;

              if (it.status === "NEW") {
                itemStatusColor = "text-yellow-500 bg-yellow-500/10 border border-yellow-500/20";
                statusLabelEn = "Queued";
                statusLabelAm = "ተሰልፏል";
              } else if (it.status === "PREPARING" || it.status === "ACCEPTED" || it.status === "PLATING") {
                itemStatusColor = "text-[#c87a53] bg-[#c87a53]/15 border border-[#c87a53]/20";
                statusLabelEn = "Preparing";
                statusLabelAm = "በዝግጅት ላይ";
              } else if (it.status === "READY") {
                itemStatusColor = "text-blue-500 bg-blue-500/10 border border-blue-500/20";
                statusLabelEn = "Ready";
                statusLabelAm = "ዝግጁ";
              } else if (it.status === "DELIVERED") {
                itemStatusColor = "text-green-500 bg-green-500/10 border border-green-500/20";
                statusLabelEn = "Served";
                statusLabelAm = "ቀረበ";
              } else if (it.status === "VOIDED") {
                itemStatusColor = "text-red-500 bg-red-500/10 border border-red-500/20";
                statusLabelEn = "Cancelled";
                statusLabelAm = "ተሰርዟል";
              }

              return (
                <li key={it.id} className="flex items-center justify-between py-3 gap-3 first:pt-1">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs sm:text-sm">
                      {it.quantity}× {tr(it.name, it.nameAm)}
                    </span>
                    {it.notes && (
                      <span className="text-[10px] text-slate-400 italic mt-0.5 leading-snug">
                        "{it.notes}"
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${itemStatusColor}`}>
                    {lang === "en" ? statusLabelEn : statusLabelAm}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-800/40">
          <p className="text-xs text-slate-400 leading-snug font-light max-w-sm">
            {currentStep === 4
              ? (lang === "en" ? "Your order has been fully served. Enjoy your meal!" : "ትዕዛዝዎ ሙሉ በሙሉ ቀርቧል። መልካም ምግብ!")
              : currentStep === -1
              ? (lang === "en" ? "This order was cancelled." : "ይህ ትዕዛዝ ተሰርዟል።")
              : (lang === "en" ? "Please keep this page open to track preparation progress in real-time." : "እባክዎን የዝግጅቱን ሂደት ለመከታተል ይህንን ገጽ ክፍት ያድርጉት።")}
          </p>
          {(currentStep === 4 || currentStep === -1) && (
            <button 
              onClick={onClear} 
              className="bg-[#c87a53] hover:bg-[#b3663d] text-white font-bold h-9 px-4 rounded-xl text-xs active:scale-95 transition-all shadow-md whitespace-nowrap"
            >
              {lang === "en" ? "Order More" : "ተጨማሪ እዘዝ / ምናሌ"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
