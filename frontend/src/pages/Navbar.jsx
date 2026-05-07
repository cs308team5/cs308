import "./Navbar.css";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService.js";
import { fetchCart } from "../services/productAndCartService.js";

// Icons

const HomeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
);

const DiscoverIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
);

const OrdersIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
);

const CommentsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="13" y2="13" />
    </svg>
);

const DeliveriesIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h11v10H3z" />
        <path d="M14 11h4l3 3v3h-7z" />
        <circle cx="7" cy="19" r="2" />
        <circle cx="18" cy="19" r="2" />
    </svg>
);

const ProductsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.3 7 12 12l8.7-5" />
        <path d="M12 22V12" />
    </svg>
);


const CartIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

// Sidebar items
const NAV_ITEMS = [
    { id: "home",     label: "Home",     path: "/home",     Icon: HomeIcon },
    { id: "discover", label: "Discover", path: "/discover", Icon: DiscoverIcon },
    { id: "myorders",  label: "Orders", path: "/my-orders",  Icon: OrdersIcon },
];

const ADMIN_NAV_ITEMS = [
    { id: "comments", label: "Comments", path: "/admin", Icon: CommentsIcon },
    { id: "products", label: "Products", path: "/admin/products", Icon: ProductsIcon },
    { id: "deliveries", label: "Deliveries", path: "/admin/deliveries", Icon: DeliveriesIcon },
];

// Helper functions

// For fallback if images can't be loaded
function getInitials(name = "") {
    return name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";
}

// Read cart product count
async function readCartCount(user) {
    if (!user?.customer_id) {
        const guestCart = JSON.parse(localStorage.getItem("guest_cart") ?? "[]");
        return guestCart.reduce((s, i) => s + i.quantity, 0);
    }
    try {
        const items = await fetchCart(user.customer_id);
        return items.reduce((s, i) => s + i.quantity, 0);
    } catch {
        return 0;
    }
}


export function GlobalNavbar() {
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(0);
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const loadCart = async (u) => {
        const count = await readCartCount(u);
        setCartCount(count);
    };

    useEffect(() => {
        const u = getCurrentUser();
        setUser(u);
        setIsAdmin(Boolean(u?.isAdmin ?? u?.is_admin));
        loadCart(u);

        const onCartUpdate = () => {
            const latestUser = getCurrentUser();
            setUser(latestUser);
            setIsAdmin(Boolean(latestUser?.isAdmin ?? latestUser?.is_admin));
            loadCart(latestUser);
        };
        window.addEventListener("cartUpdated", onCartUpdate);
        return () => window.removeEventListener("cartUpdated", onCartUpdate);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <nav className="global-navbar">

            <h1 className="navbar-logo">THE DARE</h1>

            <div className="navbar-right">

                <button className="navbar-cart-btn" onClick={() => navigate("/cart")}>
                    <CartIcon />
                    Cart
                    {cartCount > 0 && (
                        <span className="navbar-cart-count">
                            {cartCount > 99 ? "99+" : cartCount}
                        </span>
                    )}
                </button>

                <button
                    className="navbar-avatar-btn"
                    onClick={() => navigate("/profile")}
                    title="Profile"
                >
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="profile" />
                    ) : (
                        getInitials(user?.username || user?.name || "Guest")
                    )}
                </button>

                {user ? (
                    <button className="navbar-text-btn" onClick={handleLogout}>
                        Logout
                    </button>
                ) : (
                    <button className="navbar-text-btn" onClick={() => navigate("/login")}>
                        Login
                    </button>
                )}
            </div>
        </nav>
    );
}

// ============================================================
// GLOBAL SIDEBAR  (icon rail)
// ============================================================

export function GlobalSidebar() {
    const navigate  = useNavigate();
    const location  = useLocation();
    const user = getCurrentUser();
    const isAdmin = Boolean(user?.isAdmin ?? user?.is_admin);
    const navItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

    // Derive active tab from current path
    const activeId = [...navItems].sort((a, b) => b.path.length - a.path.length).find((item) =>
        location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    )?.id ?? "home";

    return (
        <aside className="global-sidebar">
            {navItems.map(({ id, label, path, Icon }) => (
                <button
                    key={id}
                    className={`sidebar-icon-btn ${activeId === id ? "active" : ""}`}
                    onClick={() => navigate(path)}
                    data-tooltip={label}
                    aria-label={label}
                >
                    <Icon />
                    <span className="sidebar-icon-label">{label}</span>
                </button>
            ))}
        </aside>
    );
}

export function AppShell({ children }) {
    return (
        <>
            <GlobalNavbar />
            <GlobalSidebar />
            <div className="page-shell">
                {children}
            </div>
        </>
    );
}
