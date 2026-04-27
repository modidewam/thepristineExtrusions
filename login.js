const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const goToDashboardBtn = document.getElementById("goToDashboardBtn");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");

let loginMode = "user";

function showLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message || "Login failed.";
  loginError.style.display = "block";
}

function clearLoginError() {
  if (!loginError) return;
  loginError.textContent = "";
  loginError.style.display = "none";
}

authEnsureSeedAdmin();

const session = authGetSession();
if (session) {
  window.location.href = session.role === "admin" ? "admin.html" : "index.html";
}

if (goToDashboardBtn) {
  goToDashboardBtn.addEventListener("click", () => {
    const sessionNow = authGetSession();
    window.location.href = sessionNow && sessionNow.role === "admin" ? "admin.html" : "index.html";
  });
}

if (adminLoginBtn) {
  adminLoginBtn.addEventListener("click", () => {
    loginMode = "admin";
    if (loginForm) {
      loginForm.requestSubmit();
    }
  });
}

if (resetDefaultsBtn) {
  resetDefaultsBtn.addEventListener("click", () => {
    if (!confirm("Reset users to defaults?\n\nAdmin: admin/admin\nUser: user/user@123\n\nThis will REMOVE existing users on this device.")) {
      return;
    }
    if (typeof authResetDefaultCredentials === "function") {
      authResetDefaultCredentials();
      alert("Defaults reset. Now login with admin/admin.");
    } else {
      alert("Reset function not available.");
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearLoginError();

    const formData = new FormData(loginForm);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    const result = authLogin(username, password);
    if (!result.ok) {
      showLoginError(result.error || "Invalid username or password.");
      return;
    }

    const nextSession = authGetSession();
    if (!nextSession) {
      showLoginError("Login failed.");
      return;
    }

    if (loginMode === "admin") {
      loginMode = "user";
      if (nextSession.role !== "admin") {
        authClearSession();
        showLoginError("This account is not admin.");
        return;
      }
      window.location.href = "admin.html";
      return;
    }

    window.location.href = nextSession.role === "admin" ? "admin.html" : "index.html";
  });
}

