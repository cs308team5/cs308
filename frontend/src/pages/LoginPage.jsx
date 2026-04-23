import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import "./LoginPage.css";

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
      navigate("/home");
    } else {
      setError(response.message);
    }
  };

  return (
    <div className="login-page">
      <div className="logo-container">
        <h1 className="logo brand">THE DARE</h1>
        <p className="tagline type-eyebrow">dare to wear</p>
      </div>

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
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="caps">Password</label>
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

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
            Don't have an account?{" "}
            <span
              className="register-link"
              onClick={() => navigate("/register")}
            >
              Register
            </span>
          </p>
        </div>
      </div>

      <div className="help-note">
        <p><strong>Need help?</strong></p>
        <p>support@dare.com</p>
        <p>+90 XXX XXX XX XX</p>
      </div>
    </div>
  );
}
