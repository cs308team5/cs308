import React from "react";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  
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
          <input type="email" placeholder="your@email.com" />

          <label className="caps">Password</label>
          <input type="password" placeholder="••••••••" />

          <div className="row">
            <label className="remember">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <span className="link">Forgot password?</span>
          </div>

          <button className="signin caps">Sign In</button>

          <p className="register-text typewriter">
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