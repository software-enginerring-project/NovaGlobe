const toggle = document.getElementById("feedback-toggle");
const panel = document.getElementById("feedback-panel");
const submit = panel ? panel.querySelector(".feedback-submit") : null;
const textarea = panel ? panel.querySelector(".feedback-textarea") : null;
const editBtn = document.getElementById("edit-profile-btn");
const profileCard = document.getElementById("profile-card");
const editables = profileCard ? profileCard.querySelectorAll(".editable") : [];

const passwordToggle = document.getElementById("change-password-toggle");
const passwordPanel = document.getElementById("password-panel");
const passwordSubmit = document.getElementById("password-submit");
const currentPassword = document.getElementById("current-password");
const newPassword = document.getElementById("new-password");
const confirmPassword = document.getElementById("confirm-password");
const passwordMessage = document.getElementById("password-message");

const setOpen = (open) => {
  if (!toggle || !panel) return;
  panel.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  panel.setAttribute("aria-hidden", String(!open));
};

const setPasswordOpen = (open) => {
  if (!passwordToggle || !passwordPanel) return;
  passwordPanel.classList.toggle("is-open", open);
  passwordToggle.setAttribute("aria-expanded", String(open));
  passwordPanel.setAttribute("aria-hidden", String(!open));
};

const showSubmittedMessage = () => {
  if (!toggle) return;
  const original = toggle.textContent;
  toggle.textContent = "Submitted";
  toggle.setAttribute("aria-live", "polite");
  setTimeout(() => {
    toggle.textContent = original;
    toggle.removeAttribute("aria-live");
  }, 1600);
};

const setEditing = (editing) => {
  if (!profileCard) return;
  profileCard.classList.toggle("is-editing", editing);
  if (editBtn) {
    editBtn.textContent = editing ? "Save" : "Edit Profile";
  }
  editables.forEach((el) => {
    el.setAttribute("contenteditable", String(editing));
  });
  if (editing && editables.length > 0) {
    editables[0].focus();
  }
};

const clearPasswordMessage = () => {
  if (passwordMessage) {
    passwordMessage.textContent = "";
    passwordMessage.classList.remove("error", "success");
  }
};

const showPasswordMessage = (message, type) => {
  if (!passwordMessage) return;
  passwordMessage.textContent = message;
  passwordMessage.classList.remove("error", "success");
  passwordMessage.classList.add(type);
};

if (toggle && panel) {
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = panel.classList.contains("is-open");
    setOpen(!isOpen);
    setPasswordOpen(false);
  });

  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    setOpen(false);
    setPasswordOpen(false);
  });
}

if (submit) {
  submit.addEventListener("click", () => {
    if (textarea) {
      textarea.value = "";
    }
    showSubmittedMessage();
    setOpen(false);
  });
}

if (editBtn) {
  editBtn.addEventListener("click", () => {
    const isEditing = profileCard && profileCard.classList.contains("is-editing");
    setEditing(!isEditing);
  });
}

if (passwordToggle && passwordPanel) {
  passwordToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = passwordPanel.classList.contains("is-open");
    setPasswordOpen(!isOpen);
    setOpen(false);
    clearPasswordMessage();
  });

  passwordPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

if (passwordSubmit) {
  passwordSubmit.addEventListener("click", () => {
    const newValue = newPassword ? newPassword.value.trim() : "";
    const confirmValue = confirmPassword ? confirmPassword.value.trim() : "";

    if (!newValue || !confirmValue) {
      showPasswordMessage("Please fill in the new and confirm password fields.", "error");
      return;
    }

    if (newValue !== confirmValue) {
      showPasswordMessage("New password and confirm password do not match.", "error");
      return;
    }

    if (currentPassword) {
      currentPassword.value = "";
    }
    if (newPassword) {
      newPassword.value = "";
    }
    if (confirmPassword) {
      confirmPassword.value = "";
    }

    showPasswordMessage("Password updated.", "success");
    setTimeout(() => {
      setPasswordOpen(false);
      clearPasswordMessage();
    }, 1400);
  });
}