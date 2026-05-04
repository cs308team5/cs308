import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";
import "./LoginPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasPunct = /[!@#$%^&*(),.?":{}|<>_\-\\/[\];'`~+=]/.test(password);

    if (!hasUpper && !hasPunct) {
      setError("Password must include at least one uppercase letter and one punctuation mark.");
      return;
    }

    if (!hasUpper) {
      setError("Password must include at least one uppercase letter.");
      return;
    }

    if (!hasPunct) {
      setError("Password must include at least one punctuation mark.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        fullName,
        username,
        email,
        password,
      });

      if (!response.success) {
        setError(response.message || "Registration failed.");
        setLoading(false);
        return;
      }

      setSuccess("Account created successfully! Redirecting to login...");
      setLoading(false);

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="login-page register-page">
      <div className="logo-container register-logo-container">
        <h1 className="logo brand">THE DARE</h1>
        <p className="tagline type-eyebrow">dare to wear</p>
      </div>

      <div className="polaroid-wrapper register-polaroid-wrapper">
        <div className="tape left"></div>
        <div className="tape right"></div>

        <div className="polaroid-card register-polaroid-card">
          <h2 className="caps">Create Account</h2>

          <label className="caps">Full Name</label>
          <input
            type="text"
            placeholder="your full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />

          <label className="caps">Username</label>
          <input
            type="text"
            placeholder="choose a username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

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

          <label className="caps">Confirm Password</label>
          <input
            type="password"
            placeholder="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {error && (
            <p className="error" style={{ marginTop: "12px", fontWeight: "600" }}>
              {error}
            </p>
          )}

          {success && (
            <p style={{ color: "#2e7d32", marginTop: "12px", fontWeight: "600" }}>
              {success}
            </p>
          )}

          <button
            className="signin caps"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Creating account..." : "REGISTER"}
          </button>

          <p className="register-text">
            Already have an account?{" "}
            <span className="register-link" onClick={() => navigate("/login")}>
              Login
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
