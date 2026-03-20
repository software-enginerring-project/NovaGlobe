import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/profile1.css';
import '../assets/css/feedback.css';

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  
  // Profile Content
  const [username, setUsername] = useState('Rhea Kline');
  const [email, setEmail] = useState('rhea.kline@novaglobe.io');
  const [role, setRole] = useState('Planetary Systems Lead');
  
  // Feedback
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

  const navigate = useNavigate();

  const handleEditToggle = () => setIsEditing(!isEditing);

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

  const submitPassword = () => {
    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ text: 'Please fill in the new and confirm password fields.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'New password and confirm password do not match.', type: 'error' });
      return;
    }
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage({ text: 'Password updated.', type: 'success' });
    
    setTimeout(() => {
      setPasswordOpen(false);
      setPasswordMessage({ text: '', type: '' });
    }, 1400);
  };

  const closePanels = () => {
    setFeedbackOpen(false);
    setPasswordOpen(false);
  };

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
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign out</a>
        </nav>
      </header>

      <main className="page">
        <section className={`profile-card ${isEditing ? 'is-editing' : ''}`} id="profile-card">
          <div className="avatar-wrap">
            <div className="avatar">RK</div>
            <button className="icon-btn edit" type="button" aria-label="Edit" onClick={handleEditToggle}>
              E
            </button>
            <button className="icon-btn verify" type="button" aria-label="Verified">
              V
            </button>
          </div>

          <h1 
            className="username editable" 
            contentEditable={isEditing} 
            suppressContentEditableWarning
            onBlur={(e) => setUsername(e.target.innerText)}
          >{username}</h1>
          <span 
            className="role-pill editable" 
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => setRole(e.target.innerText)}
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
                <p className="info-value">January 2024</p>
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="ghost" onClick={handleEditToggle}>
              {isEditing ? 'Save' : 'Edit Profile'}
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

            <button type="button" className="password-submit" onClick={submitPassword}>
              Update Password
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