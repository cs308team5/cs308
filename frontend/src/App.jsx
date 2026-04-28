import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
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
import { getCurrentUser } from "./services/authService.js";
import MyOrdersPage from "./pages/MyOrdersPage.jsx";
import OrderTrackingPage from "./pages/OrderTrackingPage.jsx";

function AdminRoute() {
  const user = getCurrentUser();
  const isAdmin = Boolean(user?.isAdmin ?? user?.is_admin);

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <AdminPage />;
}

function ProtectedRoute({ children }) {
  const user = getCurrentUser();

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const router = createBrowserRouter([
  {
    path: "/test",
    element: <TestPage />,
  },
  {
    path: "/",
    element: <Navigate to="/home" replace />,
  },
  {
    path: "/home",
    element: <HomePage />,
  },
  {
    path: "/discover",
    element: <DiscoverPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/cart",
    element: <CartPage />,
  },
  {
    path: "/checkout",
    element: (
      <ProtectedRoute>
        <CheckoutPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/invoice",
    element: <InvoicePage />,
  },
  {
    path: "/orders",
    element: <OrderTrackingPage />,
  },
  {
    path: "/products/:id",
    element: <ProductDetailsPage />,
  },
  {
    path: "/admin",
    element: <AdminRoute />,
  },
  {
    path: "/my-orders",
    element: <MyOrdersPage />
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
