const STORAGE_KEY = "securityDashboardLogsV1";

const adminUserLine = document.getElementById("adminUserLine");
const logoutBtn = document.getElementById("logoutBtn");
const goUsersBtn = document.getElementById("goUsersBtn");
const adminTitlePill = document.getElementById("adminTitlePill");
const tabAll = document.getElementById("tabAll");
const tabVisitor = document.getElementById("tabVisitor");
const tabInward = document.getElementById("tabInward");
const tabOutward = document.getElementById("tabOutward");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const adminLogsBody = document.getElementById("adminLogsBody");

let activeFilter = "all";

function setActiveTab(filter) {
  activeFilter = filter;
  const title = filter === "all" ? "All Entry Logs" : `${filter} Entry Logs`;
  if (adminTitlePill) adminTitlePill.textContent = title;

  const tabs = [
    [tabAll, "all"],
    [tabVisitor, "Visitor"],
    [tabInward, "Inward"],
    [tabOutward, "Outward"],
  ];
  tabs.forEach(([el, value]) => {
    if (!el) return;
    el.classList.toggle("active", value === filter);
  });

  renderAdminLogs();
}

function loadAllLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visitor: [], inward: [], outward: [] };
    const parsed = JSON.parse(raw);
    return {
      visitor: Array.isArray(parsed.visitor) ? parsed.visitor : [],
      inward: Array.isArray(parsed.inward) ? parsed.inward : [],
      outward: Array.isArray(parsed.outward) ? parsed.outward : [],
    };
  } catch {
    return { visitor: [], inward: [], outward: [] };
  }
}

function buildFlatRows(logs) {
  const rows = [];
  logs.visitor.forEach((e) => rows.push({ ...e, type: "Visitor" }));
  logs.inward.forEach((e) => rows.push({ ...e, type: "Inward" }));
  logs.outward.forEach((e) => rows.push({ ...e, type: "Outward" }));

  rows.sort((a, b) => {
    const ta = Date.parse(a.createdAt || "") || 0;
    const tb = Date.parse(b.createdAt || "") || 0;
    return tb - ta;
  });

  return rows;
}

function printSingleEntry(serialNo, type, details, createdAt, photoData) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const photoHtml = photoData
    ? `<div class="photo-block">
        <div class="label">Photo:</div>
        <img class="photo" src="${photoData}" alt="Captured photo" />
      </div>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Single Entry Print</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { margin: 0 0 14px; font-size: 24px; }
        .card { border: 1px solid #ccc; border-radius: 8px; padding: 16px; }
        .row { margin-bottom: 10px; line-height: 1.5; }
        .label { font-weight: 700; }
        .photo-block { margin-top: 14px; }
        .photo { display: block; margin-top: 8px; width: 260px; max-width: 100%; border: 1px solid #ddd; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>Security Management Entry</h1>
      <div class="card">
        <div class="row"><span class="label">Sr No:</span> ${serialNo}</div>
        <div class="row"><span class="label">Type:</span> ${type}</div>
        <div class="row"><span class="label">Details:</span> ${details}</div>
        <div class="row"><span class="label">Created At:</span> ${createdAt}</div>
        ${photoHtml}
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function renderAdminLogs() {
  if (!adminLogsBody) return;
  const filter = activeFilter || "all";

  const logs = loadAllLogs();
  const rows = buildFlatRows(logs).filter((r) => (filter === "all" ? true : r.type === filter));

  adminLogsBody.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="empty-row">No logs found.</td>`;
    adminLogsBody.appendChild(tr);
    return;
  }

  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const photo = r.photoData
      ? `<img class="photo-thumb" src="${r.photoData}" alt="Photo" />`
      : `<span style="color:#6f7d95;">No photo</span>`;
    tr.innerHTML = `
      <td>${r.type}</td>
      <td>${r.serialNo ?? ""}</td>
      <td>${r.details ?? ""}</td>
      <td>${r.createdAt ?? ""}</td>
      <td>${photo}</td>
      <td class="no-print">
        <button type="button" class="row-print-btn admin-print-btn">Print</button>
      </td>
    `;
    tr.dataset.serialNo = String(r.serialNo ?? "");
    tr.dataset.type = r.type;
    tr.dataset.details = r.details ?? "";
    tr.dataset.createdAt = r.createdAt ?? "";
    tr.dataset.photoData = r.photoData ?? "";
    adminLogsBody.appendChild(tr);
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
  setActiveTab("all");
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    authLogoutToLogin();
  });
}

if (goUsersBtn) {
  goUsersBtn.addEventListener("click", () => {
    window.location.href = "admin-users.html";
  });
}

if (tabAll) tabAll.addEventListener("click", () => setActiveTab("all"));
if (tabVisitor) tabVisitor.addEventListener("click", () => setActiveTab("Visitor"));
if (tabInward) tabInward.addEventListener("click", () => setActiveTab("Inward"));
if (tabOutward) tabOutward.addEventListener("click", () => setActiveTab("Outward"));

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const logs = loadAllLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "security-dashboard-logs.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear ALL logs (Visitor/Inward/Outward)?")) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ visitor: [], inward: [], outward: [] }));
    renderAdminLogs();
  });
}

if (adminLogsBody) {
  adminLogsBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("admin-print-btn")) return;

    const row = target.closest("tr");
    if (!row) return;
    printSingleEntry(
      row.dataset.serialNo || "",
      row.dataset.type || "Entry",
      row.dataset.details || "",
      row.dataset.createdAt || "",
      row.dataset.photoData || ""
    );
  });
}
