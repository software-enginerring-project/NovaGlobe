import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/styles.css';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [authMessage, setAuthMessage] = useState({ text: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthMessage({ text: "", type: "" });

    if (isSubmitting) return;

    if (mode === "login") {
      try {
        setIsSubmitting(true);
        const response = await axios.post(
          "/api/auth/login",
          { email, password, remember },
          { withCredentials: true }
        );
        const message = response?.data?.message || "Logged in successfully";
        setAuthMessage({ text: message, type: "success" });
        setTimeout(() => navigate("/profile"), 600);
      } catch (error) {
        const message = error?.response?.data?.error || "Login failed";
        setAuthMessage({ text: message, type: "error" });
      } finally {
        setIsSubmitting(false);
      }
    } else if (mode === "signup") {
      if (password !== confirmPassword) {
        setAuthMessage({ text: "Passwords do not match.", type: "error" });
        return;
      }
      try {
        setIsSubmitting(true);
        await axios.post(
          "/api/auth/signup",
          {
            name: username,
            email,
            password,
          },
          { withCredentials: true }
        );
        setAuthMessage({ text: "Account created successfully. Please sign in.", type: "success" });
        setPassword("");
        setConfirmPassword("");
        setMode("login");
      } catch (error) {
        const message = error?.response?.data?.error || "Signup failed";
        setAuthMessage({ text: message, type: "error" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleForgot = () => {
    setMode("reset");
    setResetSent(false);
    setAuthMessage({ text: "", type: "" });
  };

  const handleReset = (event) => {
    event.preventDefault();
    setResetSent(true);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;

      await axios.post(
        "/api/auth/google",
        { token },
        { withCredentials: true }
      );

      navigate("/profile");
    } catch (err) {
      console.error(err);
      setAuthMessage({ text: "Google login failed", type: "error" });
    }
  };

  return (
    <div className="shell login-shell">
      <div className="gridlines" aria-hidden="true" />

      <main className="card">
        <section className="brand">
          <h1>NovaGlobe</h1>
          <p>
            Survey, simulate, and orchestrate a living planet. Command a unified
            dashboard that blends real-time sensing, semantic discovery, and
            planetary-scale insight.
          </p>

          <div className="features">
            <div className="feature">
              <span>Semantic search across climate, energy, and mobility systems</span>
            </div>
            <div className="feature">
              <span>Digital twin simulations for rapid scenario planning</span>
            </div>
            <div className="feature">
              <span>Live operational feeds fused into a single global map</span>
            </div>
          </div>

          <div className="badges">
            <div className="badge">Secure Access</div>
            <div className="badge">Role-Based Views</div>
            <div className="badge">AI Co-Pilot Ready</div>
          </div>
        </section>

        <section className="login">
          {mode === "login" ? (
            <>
              <h2>Sign in</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@novaglobe.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="row" style={{ marginBottom: 16 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      style={{ width: 16, margin: 0 }}
                    />
                    Remember me
                  </label>
                  <button className="link-btn" type="button" onClick={handleForgot}>
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Access NovaGlobe"}
                </button>
                {authMessage.text && (
                  <div className="notice" style={{ marginTop: 12, color: authMessage.type === "error" ? "#ff8a8a" : "#89f0cf" }}>
                    {authMessage.text}
                  </div>
                )}
              </form>
              <div style={{ marginTop: 16 }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.log("Login Failed")}
                />
              </div>
              <div className="row footer-row">
                <span className="footer">Protected by NovaShield security layers.</span>
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => setMode("signup")}
                >
                  Don&apos;t have an account? Sign up
                </button>
              </div>
            </>
          ) : mode === "signup" ? (
            <>
              <h2>Create account</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    placeholder="NovaExplorer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="you@novaglobe.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create NovaGlobe account"}
                </button>
                {authMessage.text && (
                  <div className="notice" style={{ marginTop: 12, color: authMessage.type === "error" ? "#ff8a8a" : "#89f0cf" }}>
                    {authMessage.text}
                  </div>
                )}
              </form>
              <div style={{ marginTop: 16 }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.log("Login Failed")}
                />
              </div>
              <div className="row footer-row">
                <span className="footer">Protected by NovaShield security layers.</span>
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => setMode("login")}
                >
                  Already have an account? Sign in
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Reset password</h2>
              <p className="helper">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleReset}>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="you@novaglobe.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit">Send reset link</button>
              </form>
              {resetSent && (
                <div className="notice">
                  Reset link sent. Check your inbox for instructions.
                </div>
              )}
              <div className="row footer-row">
                <span className="footer">Protected by NovaShield security layers.</span>
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => setMode("login")}
                >
                  Back to sign in
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
