import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import TestPage from "./pages/TestPage";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import InvoicePage from "./pages/InvoicePage.jsx";
import ProductDetailsPage from "./pages/ProductDetailsPage.jsx";
import AdminPage from "./pages/AdminPage";
import AdminDeliveriesPage from "./pages/AdminDeliveriesPage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import { getCurrentUser } from "./services/authService.js";
import MyOrdersPage from "./pages/MyOrdersPage.jsx";
import OrderTrackingPage from "./pages/OrderTrackingPage.jsx";
import { AppShell } from "./pages/Navbar.jsx";

function AdminProtectedRoute({ children }) {
  const user = getCurrentUser();
  const isAdmin = Boolean(user?.isAdmin ?? user?.is_admin);

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
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
      { path: "/cart",          element: <CartPage /> },
      { path: "/products/:id",  element: <ProductDetailsPage /> },
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
          <AdminProtectedRoute>
            <AdminPage />
          </AdminProtectedRoute>
        ),
      },
      {
        path: "/admin/deliveries",
        element: (
          <AdminProtectedRoute>
            <AdminDeliveriesPage />
          </AdminProtectedRoute>
        ),
      },
      {
        path: "/admin/products",
        element: (
          <AdminProtectedRoute>
            <AdminProductsPage />
          </AdminProtectedRoute>
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
      { path: "/test",     element: <TestPage /> },
    ],
  },
]);



export default function App() {
  return <RouterProvider router={router} />;
}
