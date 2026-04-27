const adminUserLine = document.getElementById("adminUserLine");
const logoutBtn = document.getElementById("logoutBtn");
const goLogsBtn = document.getElementById("goLogsBtn");
const adminAddUserForm = document.getElementById("adminAddUserForm");
const adminUserFormMsg = document.getElementById("adminUserFormMsg");
const adminUsersTableBody = document.getElementById("adminUsersTableBody");

function setAdminUserFormMessage(message, type) {
  if (!adminUserFormMsg) return;
  adminUserFormMsg.textContent = message || "";
  adminUserFormMsg.style.color = type === "error" ? "#8b1a1a" : "#0d7a4f";
}

function renderAdminUsersTable() {
  if (!adminUsersTableBody || typeof authLoadUsers !== "function") return;
  const users = authLoadUsers();
  adminUsersTableBody.innerHTML = "";

  if (!users.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4" class="empty-row">No users found.</td>`;
    adminUsersTableBody.appendChild(row);
    return;
  }

  users.forEach((u) => {
    const row = document.createElement("tr");
    const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleString() : "";
    row.innerHTML = `
      <td>${u.username}</td>
      <td>${u.role || "user"}</td>
      <td>${createdAt}</td>
      <td class="no-print">
        <button type="button" class="row-print-btn admin-user-delete-btn" data-username="${u.username}">Delete</button>
      </td>
    `;
    adminUsersTableBody.appendChild(row);
  });
}

const session = typeof authRequireLoginOrRedirect === "function" ? authRequireLoginOrRedirect() : null;
if (!session) {
  // redirected
} else if (session.role !== "admin") {
  window.location.href = "login.html";
} else {
  if (adminUserLine) {
    adminUserLine.textContent = `Logged in as: ${session.username} (admin)`;
  }
  renderAdminUsersTable();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    authLogoutToLogin();
  });
}

if (goLogsBtn) {
  goLogsBtn.addEventListener("click", () => {
    window.location.href = "admin.html";
  });
}

if (adminAddUserForm) {
  adminAddUserForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const sessionNow = typeof authGetSession === "function" ? authGetSession() : null;
    if (!sessionNow || sessionNow.role !== "admin") {
      setAdminUserFormMessage("Admin only.", "error");
      return;
    }

    const formData = new FormData(adminAddUserForm);
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");
    const role = String(formData.get("role") || "user");

    const result = authAddUser({ username, password, role });
    if (!result.ok) {
      setAdminUserFormMessage(result.error || "Unable to add user.", "error");
      return;
    }

    adminAddUserForm.reset();
    setAdminUserFormMessage(`User "${username.trim()}" added.`, "success");
    renderAdminUsersTable();
  });
}

if (adminUsersTableBody) {
  adminUsersTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("admin-user-delete-btn")) return;

    const username = target.dataset.username || "";
    const sessionNow = typeof authGetSession === "function" ? authGetSession() : null;
    if (!sessionNow || sessionNow.role !== "admin") return;
    if (!username) return;
    if (!confirm(`Delete user "${username}"?`)) return;

    const result = authDeleteUser(username);
    if (!result.ok) {
      setAdminUserFormMessage(result.error || "Unable to delete user.", "error");
      return;
    }

    setAdminUserFormMessage(`User "${username}" deleted.`, "success");
    renderAdminUsersTable();
  });
}

