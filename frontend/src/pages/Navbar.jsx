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

        const onCartUpdate = () => loadCart(u);
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

                {user && (
                    <button className="navbar-text-btn" onClick={handleLogout}>
                        Logout
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

    // Derive active tab from current path
    const activeId = NAV_ITEMS.find((item) =>
        location.pathname.startsWith(item.path)
    )?.id ?? "home";

    return (
        <aside className="global-sidebar">
            {NAV_ITEMS.map(({ id, label, path, Icon }) => (
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
