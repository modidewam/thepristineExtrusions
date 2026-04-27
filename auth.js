const AUTH_USERS_KEY = "securityDashboardUsersV1";
const AUTH_SESSION_KEY = "securityDashboardSessionV1";
const AUTH_DEFAULTS_MARKER_KEY = "securityDashboardAuthDefaultsV1";

function authHashPassword(password, salt) {
  const input = `${salt}::${password}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function authLoadUsers() {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function authSaveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function authEnsureSeedAdmin() {
  const users = authLoadUsers();
  const hasAnyAdmin = users.some((u) => u && u.role === "admin");
  const hasAnyUser = users.some((u) => u && u.role === "user");

  if (!hasAnyAdmin) {
    const salt = Math.random().toString(36).slice(2, 12);
    const defaultPassword = "admin";

    users.push({
      username: "admin",
      role: "admin",
      salt,
      passwordHash: authHashPassword(defaultPassword, salt),
      createdAt: new Date().toISOString(),
    });
  }

  if (!hasAnyUser) {
    const salt = Math.random().toString(36).slice(2, 12);
    const defaultPassword = "user@123";

    users.push({
      username: "user",
      role: "user",
      salt,
      passwordHash: authHashPassword(defaultPassword, salt),
      createdAt: new Date().toISOString(),
    });
  }

  authSaveUsers(users);
}

function authResetDefaultCredentials() {
  const adminSalt = Math.random().toString(36).slice(2, 12);
  const userSalt = Math.random().toString(36).slice(2, 12);
  const users = [
    {
      username: "admin",
      role: "admin",
      salt: adminSalt,
      passwordHash: authHashPassword("admin", adminSalt),
      createdAt: new Date().toISOString(),
    },
    {
      username: "user",
      role: "user",
      salt: userSalt,
      passwordHash: authHashPassword("user@123", userSalt),
      createdAt: new Date().toISOString(),
    },
  ];

  authSaveUsers(users);
  authClearSession();
  localStorage.setItem(AUTH_DEFAULTS_MARKER_KEY, new Date().toISOString());
  return { ok: true };
}

function authGetSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.username !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function authSetSession(session) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function authClearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function authLogin(username, password) {
  authEnsureSeedAdmin();
  const users = authLoadUsers();
  const user = users.find((u) => u && u.username === username);
  if (!user) return { ok: false, error: "Invalid username or password." };
  const hash = authHashPassword(password, user.salt);
  if (hash !== user.passwordHash) return { ok: false, error: "Invalid username or password." };

  authSetSession({
    username: user.username,
    role: user.role || "user",
    loginAt: new Date().toISOString(),
  });
  return { ok: true };
}

function authRequireLoginOrRedirect() {
  authEnsureSeedAdmin();
  const session = authGetSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

function authLogoutToLogin() {
  authClearSession();
  window.location.href = "login.html";
}

function authAddUser({ username, password, role }) {
  const cleanUsername = (username || "").trim();
  if (!cleanUsername) return { ok: false, error: "Username is required." };
  if (!password || password.length < 4) return { ok: false, error: "Password must be at least 4 characters." };

  const users = authLoadUsers();
  const exists = users.some((u) => u && u.username === cleanUsername);
  if (exists) return { ok: false, error: "Username already exists." };

  const salt = Math.random().toString(36).slice(2, 12);
  users.push({
    username: cleanUsername,
    role: role === "admin" ? "admin" : "user",
    salt,
    passwordHash: authHashPassword(password, salt),
    createdAt: new Date().toISOString(),
  });
  authSaveUsers(users);
  return { ok: true };
}

function authDeleteUser(username) {
  const session = authGetSession();
  if (session && session.username === username) {
    return { ok: false, error: "You can't delete the currently logged-in user." };
  }
  const users = authLoadUsers();
  const next = users.filter((u) => u && u.username !== username);
  authSaveUsers(next);
  return { ok: true };
}

