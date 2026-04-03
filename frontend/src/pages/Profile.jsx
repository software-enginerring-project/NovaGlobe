import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/profile1.css';
import '../assets/css/feedback.css';

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Profile Content
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [memberSince, setMemberSince] = useState('');
  
  // Feedback
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Password
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
      const response = await axios.put(
        '/api/profile',
        { name: username, email },
        { withCredentials: true }
      );

      const updatedUser = response?.data?.user || {};
      setUsername(updatedUser.name || username);
      setEmail(updatedUser.email || email);
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

  if (loadingProfile) {
    return (
      <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#dce9ff' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper" onClick={closePanels} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">NG</span>
          <div>
            <p className="brand-name">NovaGlobe</p>
            <p className="brand-sub">Profile Console</p>
          </div>
        </div>
        <nav className="nav-links">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Dashboard</a>
          <a href="#" onClick={handleSignOut}>Sign out</a>
        </nav>
      </header>

      <main className="page">
        <section className={`profile-card ${isEditing ? 'is-editing' : ''}`} id="profile-card">
          {profileError && (
            <p style={{ color: '#ff8a8a', textAlign: 'center', marginBottom: 10 }}>{profileError}</p>
          )}
          {profileMessage.text && (
            <p style={{ color: profileMessage.type === 'error' ? '#ff8a8a' : '#7ee5b8', textAlign: 'center', marginBottom: 10 }}>
              {profileMessage.text}
            </p>
          )}
          <div className="avatar-wrap">
            <div className="avatar">{(username || 'N').slice(0, 2).toUpperCase()}</div>
          </div>

          <h1 
            className="username editable" 
            contentEditable={isEditing} 
            suppressContentEditableWarning
            onBlur={(e) => setUsername(e.target.innerText)}
          >{username}</h1>
          <span 
            className="role-pill editable" 
            contentEditable={false}
            suppressContentEditableWarning
          >{role}</span>

          <div className="info-list">
            <div className="info-item">
              <span className="info-icon">U</span>
              <div>
                <p className="info-label">Name</p>
                <p 
                  className="info-value editable" 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => setUsername(e.target.innerText)}
                >{username}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">@</span>
              <div>
                <p className="info-label">Email</p>
                <p 
                  className="info-value editable" 
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => setEmail(e.target.innerText)}
                >{email}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon green">A</span>
              <div>
                <p className="info-label">Account Type</p>
                <p className="info-value">{role}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon purple">M</span>
              <div>
                <p className="info-label">Member Since</p>
                <p className="info-value">{memberSince}</p>
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="ghost" onClick={handleEditToggle} disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving...' : isEditing ? 'Save' : 'Edit Profile'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={togglePassword}
              aria-expanded={passwordOpen}
            >
              Change Password
            </button>
          </div>

          <button 
            type="button" 
            className="primary" 
            onClick={toggleFeedback} 
            aria-expanded={feedbackOpen}
            aria-live={feedbackSubmitted ? 'polite' : undefined}
          >
            {feedbackSubmitted ? 'Submitted' : 'Give Feedback'}
          </button>

          <div 
            className={`password-panel ${passwordOpen ? 'is-open' : ''}`} 
            aria-hidden={!passwordOpen}
            onClick={(e) => e.stopPropagation()}
          >
            <label className="password-label" htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              className="password-input"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <label className="password-label" htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              className="password-input"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <label className="password-label" htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              className="password-input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <p className={`password-message ${passwordMessage.type}`} role="status">
              {passwordMessage.text}
            </p>

            <button type="button" className="password-submit" onClick={submitPassword} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>

          <div 
            className={`feedback-panel ${feedbackOpen ? 'is-open' : ''}`} 
            aria-hidden={!feedbackOpen}
            onClick={(e) => e.stopPropagation()}
          >
            <label className="feedback-label" htmlFor="feedback-text">Share your feedback</label>
            <textarea
              id="feedback-text"
              className="feedback-textarea"
              placeholder="Type your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            ></textarea>
            <button type="button" className="feedback-submit" onClick={submitFeedback}>Submit</button>
          </div>
        </section>
      </main>
    </div>
  );
}
