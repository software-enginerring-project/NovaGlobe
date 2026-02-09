const { useState } = React;

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  const handleForgot = () => {
    setMode("reset");
    setResetSent(false);
  };

  const handleReset = (event) => {
    event.preventDefault();
    setResetSent(true);
  };

  return (
    <div className="shell">
      <div className="ambient-orb" aria-hidden="true" />
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
                    placeholder="��������"
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
                <button type="submit">Access NovaGlobe</button>
              </form>
              <button className="google-btn" type="button">
                <span className="google-icon" aria-hidden="true">
                  G
                </span>
                Sign in with Google
              </button>
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
                <button type="submit">Create NovaGlobe account</button>
              </form>
              <button className="google-btn" type="button">
                <span className="google-icon" aria-hidden="true">
                  G
                </span>
                Sign up with Google
              </button>
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

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
