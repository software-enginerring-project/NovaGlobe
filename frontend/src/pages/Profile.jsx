import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [memberSince, setMemberSince] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const response = await axios.get('/api/profile', { withCredentials: true });
        const user = response?.data?.user || {};

        setUsername(user.name || 'NovaGlobe User');
        setEmail(user.email || '');
        setRole(user.role || 'viewer');
        setAvatarUrl(user.avatar_url || '');

        const createdAt = user.created_at ? new Date(user.created_at) : null;
        if (createdAt && !Number.isNaN(createdAt.getTime())) {
          setMemberSince(
            createdAt.toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric',
            })
          );
        } else {
          setMemberSince('N/A');
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          navigate('/login');
          return;
        }
        setProfileError(error?.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleEditToggle = async () => {
    setProfileMessage({ text: '', type: '' });

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    if (isSavingProfile) return;

    try {
      setIsSavingProfile(true);
      const response = await axios.put('/api/profile', { name: username, email }, { withCredentials: true });

      const updatedUser = response?.data?.user || {};
      setUsername(updatedUser.name || username);
      setEmail(updatedUser.email || email);
      setAvatarUrl(updatedUser.avatar_url || avatarUrl);
      setProfileMessage({
        text: response?.data?.message || 'Profile updated successfully.',
        type: 'success',
      });
      setIsEditing(false);
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate('/login');
        return;
      }
      setProfileMessage({
        text: error?.response?.data?.error || 'Failed to update profile.',
        type: 'error',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const toggleFeedback = (e) => {
    e.stopPropagation();
    setFeedbackOpen(!feedbackOpen);
    setPasswordOpen(false);
    setFeedbackSubmitted(false);
  };

  const togglePassword = (e) => {
    e.stopPropagation();
    setPasswordOpen(!passwordOpen);
    setFeedbackOpen(false);
    setPasswordMessage({ text: '', type: '' });
  };

  const submitFeedback = () => {
    setFeedbackText('');
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackOpen(false);
      setFeedbackSubmitted(false);
    }, 1600);
  };

  const submitPassword = async () => {
    if (isUpdatingPassword) return;

    if (!currentPassword) {
      setPasswordMessage({ text: 'Please fill in your current password.', type: 'error' });
      return;
    }
    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ text: 'Please fill in the new and confirm password fields.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'New password and confirm password do not match.', type: 'error' });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const response = await axios.post(
        '/api/auth/change-password',
        {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        { withCredentials: true }
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({ text: response?.data?.message || 'Password updated successfully.', type: 'success' });

      setTimeout(() => {
        setPasswordOpen(false);
        setPasswordMessage({ text: '', type: '' });
      }, 1400);
    } catch (error) {
      if (error?.response?.status === 401) {
        navigate('/login');
        return;
      }
      setPasswordMessage({
        text: error?.response?.data?.error || 'Failed to update password.',
        type: 'error',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const closePanels = () => {
    setFeedbackOpen(false);
    setPasswordOpen(false);
  };

  const handleSignOut = async (event) => {
    event.preventDefault();
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
    } catch (_) {
      // Ignore logout errors and redirect regardless.
    }
    navigate('/login');
  };

  const initials = (username || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent font-['Space_Grotesk']">
        <p className="text-ink">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-transparent font-['Space_Grotesk'] text-ink" onClick={closePanels}>
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          transform: 'rotate(-8deg) scale(1.2)',
        }}
        aria-hidden="true"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-cyan/20 bg-[#060f1d]/55 px-4 py-4 backdrop-blur-xl sm:px-6 md:mt-4 md:rounded-2xl md:border md:py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#1c5a9b,#3aa4ff)] text-xs font-bold text-white shadow-[0_0_16px_rgba(47,138,216,0.35)]">
            NG
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.09em] text-ink-dim">NovaGlobe</p>
            <p className="text-sm font-semibold text-ink">Profile Console</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-cyan/30 bg-[#0b1b2d]/70 px-3 py-2 text-xs text-ink-dim transition hover:border-cyan/60 hover:text-ink sm:text-sm"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-cyan/30 bg-[#0b1b2d]/70 px-3 py-2 text-xs text-ink-dim transition hover:border-cyan/60 hover:text-ink sm:text-sm"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 flex justify-center px-4 py-8 sm:px-6 sm:py-10">
        <section
          id="profile-card"
          className="w-full max-w-[460px] rounded-[28px] border border-cyan/20 bg-[#060f1d]/55 p-6 text-center shadow-[0_30px_90px_rgba(3,10,22,0.85)] backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {profileError && (
            <p className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{profileError}</p>
          )}
          {profileMessage.text && (
            <p
              className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                profileMessage.type === 'error'
                  ? 'border-red-400/40 bg-red-500/10 text-red-200'
                  : 'border-cyan/35 bg-cyan/10 text-[#7ee5b8]'
              }`}
            >
              {profileMessage.text}
            </p>
          )}

          <div className="mb-4 inline-flex h-[90px] w-[90px] items-center justify-center overflow-hidden rounded-full border border-cyan/30 bg-[linear-gradient(135deg,#2f8ad8,#3db4ff)] text-xl font-bold text-white shadow-[0_0_14px_rgba(47,138,216,0.35)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              initials
            )}
          </div>

          <h1 className="text-xl font-semibold text-ink">{username}</h1>
          <span className="mt-2 inline-flex rounded-full border border-[#2f8ad8]/40 bg-[#1a3552] px-3 py-1 text-xs capitalize text-[#9ec7ff]">
            {role}
          </span>

          <div className="mt-5 grid gap-3 text-left">
            <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#204b74] text-xs font-semibold text-[#b8d6ff]">U</span>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.08em] text-ink-dim">Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-cyan/35 bg-[#071424]/80 px-3 py-2 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                ) : (
                  <p className="mt-1 text-sm text-ink">{username}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#204b74] text-xs font-semibold text-[#b8d6ff]">@</span>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.08em] text-ink-dim">Email</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-cyan/35 bg-[#071424]/80 px-3 py-2 text-sm text-ink outline-none transition focus:border-cyan/70 focus:ring-2 focus:ring-cyan/25"
                  />
                ) : (
                  <p className="mt-1 text-sm text-ink">{email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1f5f4f] text-xs font-semibold text-[#b8d6ff]">A</span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-ink-dim">Account Type</p>
                <p className="mt-1 text-sm capitalize text-ink">{role}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3e3266] text-xs font-semibold text-[#b8d6ff]">M</span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-ink-dim">Member Since</p>
                <p className="mt-1 text-sm text-ink">{memberSince}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-ink transition hover:border-cyan/45 hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={handleEditToggle}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? 'Saving...' : isEditing ? 'Save' : 'Edit Profile'}
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-ink transition hover:border-cyan/45 hover:bg-cyan/10"
              onClick={togglePassword}
              aria-expanded={passwordOpen}
            >
              Change Password
            </button>
          </div>

          <button
            type="button"
            className="mt-3 w-full rounded-xl bg-[#2f8ad8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(47,138,216,0.3)] transition hover:bg-[#1f6fb8]"
            onClick={toggleFeedback}
            aria-expanded={feedbackOpen}
            aria-live={feedbackSubmitted ? 'polite' : undefined}
          >
            {feedbackSubmitted ? 'Submitted' : 'Give Feedback'}
          </button>

          <div
            className={`grid gap-2 overflow-hidden rounded-xl border border-white/10 bg-[#091528]/80 px-4 transition-all duration-300 ${
              passwordOpen ? 'mt-4 max-h-[560px] py-4 opacity-100' : 'max-h-0 py-0 opacity-0'
            }`}
            aria-hidden={!passwordOpen}
          >
            <label className="text-left text-xs text-ink-dim" htmlFor="current-password">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-ink outline-none transition focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20"
            />

            <label className="mt-1 text-left text-xs text-ink-dim" htmlFor="new-password">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-ink outline-none transition focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20"
            />

            <label className="mt-1 text-left text-xs text-ink-dim" htmlFor="confirm-password">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-ink outline-none transition focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20"
            />

            <p className={`min-h-[18px] text-left text-xs ${passwordMessage.type === 'error' ? 'text-red-300' : 'text-[#7ee5b8]'}`} role="status">
              {passwordMessage.text}
            </p>

            <button
              type="button"
              className="mt-1 justify-self-center rounded-lg bg-[#2f8ad8] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(47,138,216,0.3)] transition hover:bg-[#1f6fb8] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={submitPassword}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>

          <div
            className={`grid gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#091528]/80 px-4 transition-all duration-300 ${
              feedbackOpen ? 'mt-4 max-h-[320px] py-4 opacity-100' : 'max-h-0 py-0 opacity-0'
            }`}
            aria-hidden={!feedbackOpen}
          >
            <label className="text-left text-xs text-ink-dim" htmlFor="feedback-text">
              Share your feedback
            </label>
            <textarea
              id="feedback-text"
              className="min-h-[120px] w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-ink outline-none transition focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20"
              placeholder="Type your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <button
              type="button"
              className="justify-self-center rounded-lg bg-[#2f8ad8] px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(47,138,216,0.3)] transition hover:bg-[#1f6fb8]"
              onClick={submitFeedback}
            >
              Submit
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

