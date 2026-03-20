import React, { useState } from "react";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setLoading(true);

    const response = await login(email, password);

    setLoading(false);

    if (response.success) {
      console.log("Logged in:", response);
      navigate("/home"); // change if your route is different
    } else {
      setError(response.message);
    }
  };

  return (
    <div className="login-page">

      {/* LOGO */}
      <div className="logo-container">
        <h1 className="logo brand">dare</h1>
        <p className="tagline">dare to wear</p>
      </div>

      {/* POLAROID LOGIN */}
      <div className="polaroid-wrapper">

        <div className="tape left"></div>
        <div className="tape right"></div>

        <div className="polaroid-card">

          <h2 className="caps">Welcome Back</h2>

          <label className="caps">Email</label>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="caps">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* ERROR MESSAGE */}
          {error && <p className="error">{error}</p>}

          <div className="row">
            <label className="remember">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <span className="link">Forgot password?</span>
          </div>

          <button
            className="signin caps"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>

          <p className="register-text">
            Don’t have an account?{" "}
            <span
              className="register-link"
              onClick={() => navigate("/register")}
            >
              Register
            </span>
          </p>

        </div>
      </div>

      {/* STICKY NOTE */}
      <div className="help-note">
        <p><strong>Need help?</strong></p>
        <p>support@dare.com</p>
        <p>+90 XXX XXX XX XX</p>
      </div>

    </div>
  );
}