import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [authMessage, setAuthMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthMessage({ text: '', type: '' });

    if (isSubmitting) return;

    if (mode === 'login') {
      try {
        setIsSubmitting(true);
        const response = await axios.post(
          '/api/auth/login',
          { email, password, remember },
          { withCredentials: true }
        );
        const message = response?.data?.message || 'Logged in successfully';
        setAuthMessage({ text: message, type: 'success' });
        setTimeout(() => navigate('/profile'), 600);
      } catch (error) {
        const message = error?.response?.data?.error || 'Login failed';
        setAuthMessage({ text: message, type: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    } else if (mode === 'signup') {
      if (password !== confirmPassword) {
        setAuthMessage({ text: 'Passwords do not match.', type: 'error' });
        return;
      }
      try {
        setIsSubmitting(true);
        await axios.post(
          '/api/auth/signup',
          {
            name: username,
            email,
            password,
          },
          { withCredentials: true }
        );
        setAuthMessage({ text: 'Account created successfully. Please sign in.', type: 'success' });
        setPassword('');
        setConfirmPassword('');
        setMode('login');
      } catch (error) {
        const message = error?.response?.data?.error || 'Signup failed';
        setAuthMessage({ text: message, type: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleForgot = () => {
    setMode('reset');
    setResetSent(false);
    setAuthMessage({ text: '', type: '' });
  };

  const handleReset = (event) => {
    event.preventDefault();
    setResetSent(true);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      await axios.post('/api/auth/google', { token }, { withCredentials: true });
      navigate('/profile');
    } catch (err) {
      console.error(err);
      setAuthMessage({ text: 'Google login failed', type: 'error' });
    }
  };

  const noticeClasses =
    authMessage.type === 'error'
      ? 'border-red-400/40 bg-red-500/10 text-red-200'
      : 'border-cyan/35 bg-cyan/10 text-[#89f0cf]';

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent px-4 py-10 font-['Space_Grotesk'] text-ink">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          transform: 'rotate(-8deg) scale(1.2)',
        }}
        aria-hidden="true"
      />

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 rounded-[30px] border border-cyan/20 bg-[#060f1d]/55 p-6 shadow-[0_30px_90px_rgba(3,10,22,0.85),0_0_50px_rgba(8,201,192,0.18)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
        <section className="flex flex-col gap-5">
          <h1 className="m-0 font-['Syncopate'] text-2xl tracking-wide text-ink md:text-3xl">NovaGlobe</h1>
          <p className="m-0 max-w-[56ch] text-sm leading-7 text-ink-dim md:text-[15px]">
            Survey, simulate, and orchestrate a living planet. Command a unified dashboard that blends
            real-time sensing, semantic discovery, and planetary-scale insight.
          </p>

          <div className="mt-2 grid gap-3">
            {[
              'Semantic search across climate, energy, and mobility systems',
              'Digital twin simulations for rapid scenario planning',
              'Live operational feeds fused into a single global map',
            ].map((feature) => (
              <div
                key={feature}
                className="rounded-2xl border border-cyan/20 bg-[#091728]/45 px-4 py-3 text-sm text-ink-dim"
              >
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {['Secure Access', 'Role-Based Views', 'AI Co-Pilot Ready'].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-cyan/30 bg-[#091a2a]/60 px-3 py-1 text-xs text-ink-dim"
              >
                {badge}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[26px] border border-cyan/20 bg-[#0a1a2d]/35 p-5 md:p-7">
          {mode !== 'reset' && (
            <div className="mb-6 grid grid-cols-2 rounded-xl border border-cyan/20 bg-[#081321]/70 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === 'login'
                    ? 'bg-cyan/20 text-cyan shadow-[0_0_20px_rgba(8,201,192,0.2)]'
                    : 'text-ink-dim hover:text-ink'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === 'signup'
                    ? 'bg-cyan/20 text-cyan shadow-[0_0_20px_rgba(8,201,192,0.2)]'
                    : 'text-ink-dim hover:text-ink'
                }`}
              >
                Sign up
              </button>
            </div>
          )}

          {mode === 'login' && (
            <>
              <h2 className="mb-5 text-2xl font-semibold text-ink">Welcome back</h2>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <label className="grid gap-2 text-xs uppercase tracking-[0.08em] text-ink-dim">
                  Email
                  <input
                    id="email"
                    type="email"
                    placeholder="you@novaglobe.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl border border-cyan/30 bg-[#071424]/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                </label>

                <label className="grid gap-2 text-xs uppercase tracking-[0.08em] text-ink-dim">
                  Password
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-xl border border-cyan/30 bg-[#071424]/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-dim">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-cyan/40 bg-transparent text-cyan focus:ring-cyan/40"
                    />
                    Remember me
                  </label>
                  <button type="button" onClick={handleForgot} className="text-cyan transition hover:text-aqua">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 rounded-xl bg-gradient-to-r from-[#3fe3ff] to-[#1ad4b5] px-4 py-3 text-sm font-semibold text-[#04131f] shadow-[0_16px_40px_rgba(31,226,196,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Signing in...' : 'Access NovaGlobe'}
                </button>

                {authMessage.text && (
                  <div className={`rounded-xl border px-3 py-2 text-xs ${noticeClasses}`}>{authMessage.text}</div>
                )}
              </form>

              <div className="mt-5">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.log('Login Failed')} />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-dim">
                <span>Protected by NovaShield security layers.</span>
                <button type="button" onClick={() => setMode('signup')} className="text-cyan transition hover:text-aqua">
                  Don&apos;t have an account? Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h2 className="mb-5 text-2xl font-semibold text-ink">Create account</h2>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <label className="grid gap-2 text-xs uppercase tracking-[0.08em] text-ink-dim">
                  Username
                  <input
                    id="username"
                    type="text"
                    placeholder="NovaExplorer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="rounded-xl border border-cyan/30 bg-[#071424]/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                </label>

                <label className="grid gap-2 text-xs uppercase tracking-[0.08em] text-ink-dim">
                  Email
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="you@novaglobe.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl border border-cyan/30 bg-[#071424]/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                </label>

                <label className="grid gap-2 text-xs uppercase tracking-[0.08em] text-ink-dim">
                  Password
                  <input
                    id="signup-password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-xl border border-cyan/30 bg-[#071424]/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                </label>

                <label className="grid gap-2 text-xs uppercase tracking-[0.08em] text-ink-dim">
                  Confirm password
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="rounded-xl border border-cyan/30 bg-[#071424]/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 rounded-xl bg-gradient-to-r from-[#3fe3ff] to-[#1ad4b5] px-4 py-3 text-sm font-semibold text-[#04131f] shadow-[0_16px_40px_rgba(31,226,196,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Creating account...' : 'Create NovaGlobe account'}
                </button>

                {authMessage.text && (
                  <div className={`rounded-xl border px-3 py-2 text-xs ${noticeClasses}`}>{authMessage.text}</div>
                )}
              </form>

              <div className="mt-5">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.log('Login Failed')} />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-dim">
                <span>Protected by NovaShield security layers.</span>
                <button type="button" onClick={() => setMode('login')} className="text-cyan transition hover:text-aqua">
                  Already have an account? Sign in
                </button>
              </div>
            </>
          )}

          {mode === 'reset' && (
            <>
              <h2 className="mb-2 text-2xl font-semibold text-ink">Reset password</h2>
              <p className="mb-5 text-sm text-ink-dim">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleReset} className="grid gap-4">
                <label className="grid gap-2 text-xs uppercase tracking-[0.08em] text-ink-dim">
                  Email
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="you@novaglobe.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl border border-cyan/30 bg-[#071424]/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#3fe3ff] to-[#1ad4b5] px-4 py-3 text-sm font-semibold text-[#04131f] shadow-[0_16px_40px_rgba(31,226,196,0.25)] transition hover:-translate-y-0.5"
                >
                  Send reset link
                </button>
              </form>

              {resetSent && (
                <div className="mt-3 rounded-xl border border-cyan/35 bg-cyan/10 px-3 py-2 text-xs text-[#89f0cf]">
                  Reset link sent. Check your inbox for instructions.
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-dim">
                <span>Protected by NovaShield security layers.</span>
                <button type="button" onClick={() => setMode('login')} className="text-cyan transition hover:text-aqua">
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

