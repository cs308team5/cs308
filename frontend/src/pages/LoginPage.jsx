import React from "react";
import "./LoginPage.css";

export default function LoginPage() {
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
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <span className="link">Forgot password?</span>
          </div>

          <button className="signin caps">Sign In</button>
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