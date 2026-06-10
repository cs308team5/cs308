import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import InvoicePage from "./pages/InvoicePage.jsx";
import ProductDetailsPage from "./pages/ProductDetailsPage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import AdminPage from "./pages/AdminPage";
import AdminDeliveriesPage from "./pages/AdminDeliveriesPage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import AdminInvoicesPage from "./pages/AdminInvoicesPage.jsx";
import SalesManagerPage from "./pages/SalesManagerPage.jsx";
import SalesReportsPage from "./pages/SalesReportsPage.jsx";
import DiscountsPage from "./pages/DiscountsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { getCurrentUser } from "./services/authService.js";
import MyOrdersPage from "./pages/MyOrdersPage.jsx";
import OrderTrackingPage from "./pages/OrderTrackingPage.jsx";
import { AppShell } from "./pages/Navbar.jsx";

function SalesManagerRoute({ children }) {
  const user = getCurrentUser();
  const isSalesManager = user?.role === "sales_manager";

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (!isSalesManager) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function ProductManagerRoute({ children }) {
  const user = getCurrentUser();
  const isProductManager = user?.role === "product_manager";

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (!isProductManager) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function ProtectedRoute({ children }) {
  const user = getCurrentUser();

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function ShellLayout() {
  return (
      <AppShell>
        <Outlet />
      </AppShell>
  );
}


function BareLayout() {
  return <Outlet />;
}

const router = createBrowserRouter([

  {
    path: "/",
    element: <Navigate to="/home" replace />,
  },

  // Pages that have the navbar and sidebar
  {
    element: <ShellLayout />,
    children: [
      { path: "/home",          element: <HomePage /> },
      { path: "/discover",      element: <DiscoverPage /> },
      {
        path: "/wishlist",
        element: (
          <ProtectedRoute>
            <WishlistPage />
          </ProtectedRoute>
        ),
      },
      { path: "/cart",          element: <CartPage /> },
      { path: "/products/:id",  element: <ProductDetailsPage /> },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      { path: "/orders",        element: <OrderTrackingPage /> },
      { path: "/my-orders",     element: <MyOrdersPage /> },
      {
        path: "/checkout",
        element: (
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
        ),
      },
      {
        path: "/admin",
        element: (
          <ProductManagerRoute>
            <AdminPage />
          </ProductManagerRoute>
        ),
      },
      {
        path: "/admin/deliveries",
        element: (
          <ProductManagerRoute>
            <AdminDeliveriesPage />
          </ProductManagerRoute>
        ),
      },
      {
        path: "/admin/products",
        element: (
          <ProductManagerRoute>
            <AdminProductsPage />
          </ProductManagerRoute>
        ),
      },
      {
        path: "/admin/invoices",
        element: (
          <ProductManagerRoute>
            <AdminInvoicesPage />
          </ProductManagerRoute>
        ),
      },
      {
        path: "/sales-manager",
        element: (
          <SalesManagerRoute>
            <SalesManagerPage />
          </SalesManagerRoute>
        ),
      },
      {
        path: "/sales/reports",
        element: (
          <SalesManagerRoute>
            <SalesReportsPage />
          </SalesManagerRoute>
        ),
      },
      {
        path: "/sales-manager/discounts",
        element: (
          <SalesManagerRoute>
            <DiscountsPage />
          </SalesManagerRoute>
        ),
      },
    ],
  },

  // Pages that dont have the navbar and sidebar
  {
    element: <BareLayout />,
    children: [
      { path: "/login",    element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/invoice",  element: <InvoicePage /> },
    ],
  },
]);



export default function App() {
  return <RouterProvider router={router} />;
}
