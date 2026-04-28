const navButtons = document.querySelectorAll(".nav-btn");
const panels = document.querySelectorAll(".panel");
const forms = document.querySelectorAll(".entry-form");
const contentSection = document.querySelector(".content");
const logoutBtn = document.getElementById("logoutBtn");
const authUserLine = document.getElementById("authUserLine");
const usersNavBtn = document.getElementById("usersNavBtn");
const adminDashBtn = document.getElementById("adminDashBtn");
const addUserForm = document.getElementById("addUserForm");
const userFormMsg = document.getElementById("userFormMsg");
const usersTableBody = document.getElementById("usersTableBody");
const usersPanel = document.getElementById("users");
const entryNumberInputs = {
  visitor: document.getElementById("visitorEntryNo"),
  inward: document.getElementById("inwardEntryNo"),
};
const STORAGE_KEY = "securityDashboardLogsV1";
const logBodies = {
  visitor: document.getElementById("visitorLogBody"),
  inward: document.getElementById("inwardLogBody"),
  outward: document.getElementById("outwardLogBody"),
};
const serialCounters = {
  visitor: 0,
  inward: 0,
  outward: 0,
};
const photoConfigs = [
  {
    key: "visitor",
    dataField: "visitorPhotoData",
    video: document.getElementById("visitorVideo"),
    canvas: document.getElementById("visitorCanvas"),
    preview: document.getElementById("visitorPhotoPreview"),
    dataInput: document.getElementById("visitorPhotoData"),
    startBtn: document.getElementById("startCameraBtn"),
    flipBtn: document.getElementById("flipVisitorCameraBtn"),
    captureBtn: document.getElementById("capturePhotoBtn"),
    retakeBtn: document.getElementById("retakePhotoBtn"),
    stream: null,
    facingMode: "environment",
  },
  {
    key: "inward",
    dataField: "inwardPhotoData",
    video: document.getElementById("inwardVideo"),
    canvas: document.getElementById("inwardCanvas"),
    preview: document.getElementById("inwardPhotoPreview"),
    dataInput: document.getElementById("inwardPhotoData"),
    startBtn: document.getElementById("startInwardCameraBtn"),
    flipBtn: document.getElementById("flipInwardCameraBtn"),
    captureBtn: document.getElementById("captureInwardPhotoBtn"),
    retakeBtn: document.getElementById("retakeInwardPhotoBtn"),
    stream: null,
    facingMode: "environment",
  },
  {
    key: "outward",
    dataField: "outwardPhotoData",
    video: document.getElementById("outwardVideo"),
    canvas: document.getElementById("outwardCanvas"),
    preview: document.getElementById("outwardPhotoPreview"),
    dataInput: document.getElementById("outwardPhotoData"),
    startBtn: document.getElementById("startOutwardCameraBtn"),
    flipBtn: document.getElementById("flipOutwardCameraBtn"),
    captureBtn: document.getElementById("captureOutwardPhotoBtn"),
    retakeBtn: document.getElementById("retakeOutwardPhotoBtn"),
    stream: null,
    facingMode: "environment",
  },
];

const photoByKey = Object.fromEntries(photoConfigs.map((config) => [config.key, config]));
const logTypeMap = {
  Visitor: "visitor",
  Inward: "inward",
  Outward: "outward",
};
const REQUIRED_PHOTO_TYPES = new Set(["Visitor", "Outward"]);
const filePhotoConfigs = [
  {
    input: document.getElementById("businessCardPhotoInput"),
    preview: document.getElementById("businessCardPhotoPreview"),
    dataInput: document.getElementById("businessCardPhotoData"),
  },
  {
    input: document.getElementById("selfWeightSlipInput"),
    preview: document.getElementById("selfWeightSlipPreview"),
    dataInput: document.getElementById("selfWeightSlipData"),
  },
  {
    input: document.getElementById("externalWeightSlipInput"),
    preview: document.getElementById("externalWeightSlipPreview"),
    dataInput: document.getElementById("externalWeightSlipData"),
  },
];

const activeSession = typeof authRequireLoginOrRedirect === "function" ? authRequireLoginOrRedirect() : null;
if (activeSession && activeSession.role === "admin") {
  window.location.href = "admin.html";
}

function setUserFormMessage(message, type) {
  if (!userFormMsg) return;
  userFormMsg.textContent = message || "";
  userFormMsg.style.color = type === "error" ? "#8b1a1a" : "#0d7a4f";
}

function renderUsersTable() {
  if (!usersTableBody || typeof authLoadUsers !== "function") return;
  const users = authLoadUsers();
  usersTableBody.innerHTML = "";

  if (!users.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4" class="empty-row">No users found.</td>`;
    usersTableBody.appendChild(row);
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
        <button type="button" class="row-print-btn user-delete-btn" data-username="${u.username}">Delete</button>
      </td>
    `;
    usersTableBody.appendChild(row);
  });
}

function loadStoredLogs() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return { visitor: [], inward: [], outward: [] };
    }

    const parsed = JSON.parse(rawData);
    return {
      visitor: Array.isArray(parsed.visitor) ? parsed.visitor : [],
      inward: Array.isArray(parsed.inward) ? parsed.inward : [],
      outward: Array.isArray(parsed.outward) ? parsed.outward : [],
    };
  } catch (error) {
    return { visitor: [], inward: [], outward: [] };
  }
}

function saveLogsToStorage(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function updateEntryNumbers() {
  Object.entries(entryNumberInputs).forEach(([key, input]) => {
    if (!input) {
      return;
    }

    input.value = String(serialCounters[key] + 1).padStart(4, "0");
  });
}

function getCurrentLogsFromUI() {
  const logs = { visitor: [], inward: [], outward: [] };

  Object.entries(logBodies).forEach(([key, body]) => {
    if (!body) {
      return;
    }

    const rows = body.querySelectorAll("tr");
    rows.forEach((row) => {
      if (row.querySelector(".empty-row")) {
        return;
      }

      const cells = row.querySelectorAll("td");
      if (cells.length < 3) {
        return;
      }

      logs[key].push({
        serialNo: Number(cells[0].textContent?.trim() || "0"),
        details: cells[1].textContent?.trim() || "",
        createdAt: cells[2].textContent?.trim() || "",
        photoData: row.dataset.photoData || "",
      });
    });
  });

  return logs;
}

function renderLogRow(logKey, entry, formTypeLabel) {
  const logBody = logBodies[logKey];
  if (!logBody) {
    return;
  }

  const emptyRow = logBody.querySelector(".empty-row");
  if (emptyRow) {
    emptyRow.closest("tr").remove();
  }

  const row = document.createElement("tr");
  row.dataset.formType = formTypeLabel;
  if (entry.photoData) {
    row.dataset.photoData = entry.photoData;
  }
  row.innerHTML = `
    <td>${entry.serialNo}</td>
    <td>${entry.details}</td>
    <td>${entry.createdAt}</td>
    <td class="no-print">
      <button type="button" class="row-print-btn">Print</button>
    </td>
  `;
  logBody.prepend(row);
}

function hydrateLogsFromStorage() {
  const storedLogs = loadStoredLogs();

  Object.entries(storedLogs).forEach(([logKey, entries]) => {
    entries.forEach((entry) => {
      const formTypeLabel = logKey.charAt(0).toUpperCase() + logKey.slice(1);
      renderLogRow(logKey, entry, formTypeLabel);
      serialCounters[logKey] = Math.max(serialCounters[logKey], Number(entry.serialNo) || 0);
    });
  });
}

function showPanel(targetId) {
  if (targetId === "users") {
    const session = typeof authGetSession === "function" ? authGetSession() : null;
    if (!session || session.role !== "admin") {
      alert("Admin only.");
      return;
    }
  }

  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === targetId);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetId);
  });

  stopAllOtherCameras(targetId);
}

if (activeSession) {
  if (authUserLine) {
    authUserLine.textContent = `Logged in as: ${activeSession.username} (${activeSession.role})`;
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      authLogoutToLogin();
    });
  }

  const isAdmin = activeSession.role === "admin";
  if (usersNavBtn) {
    usersNavBtn.style.display = isAdmin ? "block" : "none";
  }
  if (adminDashBtn) {
    adminDashBtn.style.display = isAdmin ? "block" : "none";
    adminDashBtn.addEventListener("click", () => {
      window.location.href = "admin.html";
    });
  }
  if (isAdmin) {
    renderUsersTable();
  } else if (usersPanel) {
    usersPanel.style.display = "none";
  }
}

function formatFormData(formType, formData) {
  const entries = [];

  if (formType === "Visitor") {
    entries.push(`Name: ${formData.get("name")}`);
    entries.push(`Phone: ${formData.get("phone")}`);
    entries.push(`Company: ${formData.get("company")}`);
    entries.push(`Purpose: ${formData.get("purpose")}`);
    entries.push("Photo: Captured");
    if (formData.get("businessCardPhotoData")) {
      entries.push("Business Card: Added");
    }
  } else if (formType === "Inward") {
    entries.push(`Party: ${formData.get("name")}`);
    entries.push(`Driver: ${formData.get("driverName")}`);
    entries.push(`Driver No: ${formData.get("driverNo")}`);
    entries.push(`Vehicle: ${formData.get("vehicle")}`);
    entries.push(`Material: ${formData.get("material")}`);
    entries.push(`Weight: ${formData.get("weight")} ${formData.get("unit")}`);
    entries.push(`Company: ${formData.get("company")}`);
    entries.push(`End User/Department: ${formData.get("endUserDepartment")}`);
    if (formData.get("inwardPhotoData")) {
      entries.push("Inward Photo: Captured");
    }
    const slipCount = ["selfWeightSlipData", "externalWeightSlipData"].reduce(
      (count, field) => count + (formData.get(field) ? 1 : 0),
      0
    );
    if (slipCount) {
      entries.push(`Weight Slip Photos: ${slipCount}`);
    }
  } else {
    entries.push(`From: ${formData.get("fromDetails")}`);
    entries.push(`To: ${formData.get("toDetails")}`);
    entries.push(`Vehicle: ${formData.get("vehicle")}`);
    entries.push(`Material: ${formData.get("material")}`);
    entries.push(`Weight: ${formData.get("weight")} ${formData.get("unit")}`);
    entries.push(`Name: ${formData.get("name")}`);
    entries.push(`Phone: ${formData.get("phone")}`);
    entries.push(`Company: ${formData.get("company")}`);
    entries.push("Photo: Captured");
  }

  return entries.join(" | ");
}

function appendLogRow(formType, details, photoData) {
  const logKey = (formType || "").toLowerCase();
  if (!logBodies[logKey]) {
    return;
  }
  const time = new Date().toLocaleString();
  serialCounters[logKey] += 1;
  const entry = {
    serialNo: serialCounters[logKey],
    details,
    createdAt: time,
    photoData: photoData || "",
  };

  renderLogRow(logKey, entry, formType);

  const currentLogs = getCurrentLogsFromUI();
  saveLogsToStorage(currentLogs);
  updateEntryNumbers();
}

function stopCameraCapture(config) {
  if (!config || !config.stream) {
    return;
  }

  config.stream.getTracks().forEach((track) => {
    track.stop();
  });
  config.stream = null;
  config.video.srcObject = null;
  config.video.style.transform = "";
  if (config.flipBtn) {
    config.flipBtn.disabled = true;
  }
}

function applyCameraMirror(config) {
  if (!config || !config.video) {
    return;
  }

  config.video.style.transform = config.facingMode === "user" ? "scaleX(-1)" : "";
}

function stopAllOtherCameras(activeKey) {
  photoConfigs.forEach((config) => {
    if (config.key !== activeKey) {
      stopCameraCapture(config);
    }
  });
}

async function startCameraCapture(config) {
  if (!config) {
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Camera is not supported in this browser.");
    return;
  }

  try {
    stopAllOtherCameras(config.key);
    stopCameraCapture(config);
    const constraints = {
      video: {
        facingMode: { ideal: config.facingMode || "environment" },
      },
      audio: false,
    };
    config.stream = await navigator.mediaDevices.getUserMedia(constraints);
    config.video.srcObject = config.stream;
    config.video.style.display = "block";
    config.preview.style.display = "none";
    config.captureBtn.disabled = false;
    if (config.flipBtn) {
      config.flipBtn.disabled = false;
    }
    applyCameraMirror(config);
  } catch (error) {
    alert("Unable to access camera. Please allow camera permission.");
  }
}

function capturePhoto(config) {
  if (!config || !config.video.videoWidth || !config.video.videoHeight) {
    return;
  }

  config.canvas.width = config.video.videoWidth;
  config.canvas.height = config.video.videoHeight;
  const context = config.canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.drawImage(config.video, 0, 0, config.canvas.width, config.canvas.height);
  const imageData = config.canvas.toDataURL("image/png");
  config.dataInput.value = imageData;
  config.preview.src = imageData;
  config.preview.style.display = "block";
  config.video.style.display = "none";
  config.captureBtn.disabled = true;
  config.retakeBtn.disabled = false;
  stopCameraCapture(config);
}

function resetPhotoCapture(config) {
  if (!config) {
    return;
  }

  config.dataInput.value = "";
  config.preview.src = "";
  config.preview.style.display = "none";
  config.video.style.display = "block";
  config.captureBtn.disabled = true;
  config.retakeBtn.disabled = true;
  if (config.flipBtn) {
    config.flipBtn.disabled = !config.stream;
  }
}

function resetFilePhotoConfigs(form) {
  filePhotoConfigs.forEach((config) => {
    if (!config.input || !form.contains(config.input)) {
      return;
    }

    config.input.value = "";
    if (config.dataInput) {
      config.dataInput.value = "";
    }
    if (config.preview) {
      config.preview.src = "";
      config.preview.style.display = "none";
      config.preview.closest(".upload-tile")?.classList.remove("has-image");
    }
  });
}

function printSingleEntry(serialNo, type, details, createdAt, photoData) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    return;
  }

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

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPanel(button.dataset.target);
  });
});

forms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formType = form.dataset.formType;
    const formData = new FormData(form);
    const pageKey = (formType || "").toLowerCase();
    const photoConfig = photoByKey[pageKey];

    if (photoConfig && !formData.get(photoConfig.dataField) && REQUIRED_PHOTO_TYPES.has(formType)) {
      alert(`Please capture ${formType} photo before submitting.`);
      return;
    }

    const details = formatFormData(formType, formData);

    const photoData = photoConfig ? String(formData.get(photoConfig.dataField) || "") : "";
    appendLogRow(formType, details, photoData);
    form.reset();
    updateEntryNumbers();

    if (photoConfig) {
      resetPhotoCapture(photoConfig);
      stopCameraCapture(photoConfig);
    }
    resetFilePhotoConfigs(form);
  });
});

if (contentSection) {
  contentSection.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.classList.contains("user-delete-btn")) {
    const username = target.dataset.username || "";
    const session = typeof authGetSession === "function" ? authGetSession() : null;
    if (!session || session.role !== "admin") return;
    if (!username) return;
    if (!confirm(`Delete user "${username}"?`)) return;

    const result = authDeleteUser(username);
    if (!result.ok) {
      setUserFormMessage(result.error || "Unable to delete user.", "error");
      return;
    }
    setUserFormMessage(`User "${username}" deleted.`, "success");
    renderUsersTable();
    return;
  }

  if (!target.classList.contains("row-print-btn")) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  const cells = row.querySelectorAll("td");
  if (cells.length < 3) {
    return;
  }

  const serialNo = cells[0].textContent?.trim() || "";
  const details = cells[1].textContent?.trim() || "";
  const createdAt = cells[2].textContent?.trim() || "";
  const type = row.dataset.formType || "Entry";
  const photoData = row.dataset.photoData || "";

  printSingleEntry(serialNo, type, details, createdAt, photoData);
  });
}

photoConfigs.forEach((config) => {
  if (config.startBtn) {
    config.startBtn.addEventListener("click", () => {
      startCameraCapture(config);
    });
  }

  if (config.flipBtn) {
    config.flipBtn.addEventListener("click", async () => {
      config.facingMode = config.facingMode === "user" ? "environment" : "user";
      await startCameraCapture(config);
    });
  }

  if (config.captureBtn) {
    config.captureBtn.addEventListener("click", () => {
      capturePhoto(config);
    });
  }

  if (config.retakeBtn) {
    config.retakeBtn.addEventListener("click", () => {
      resetPhotoCapture(config);
      startCameraCapture(config);
    });
  }
});

filePhotoConfigs.forEach((config) => {
  if (!config.input || !config.preview || !config.dataInput) {
    return;
  }

  config.input.addEventListener("change", () => {
    const file = config.input.files && config.input.files[0];
    if (!file) {
      config.dataInput.value = "";
      config.preview.src = "";
      config.preview.style.display = "none";
      config.preview.closest(".upload-tile")?.classList.remove("has-image");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const imageData = String(reader.result || "");
      config.dataInput.value = imageData;
      config.preview.src = imageData;
      config.preview.style.display = "block";
      config.preview.closest(".upload-tile")?.classList.add("has-image");
    });
    reader.readAsDataURL(file);
  });
});

if (addUserForm) {
  addUserForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const session = typeof authGetSession === "function" ? authGetSession() : null;
    if (!session || session.role !== "admin") {
      setUserFormMessage("Only admin can add users.", "error");
      return;
    }

    const formData = new FormData(addUserForm);
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");
    const role = String(formData.get("role") || "user");

    const result = authAddUser({ username, password, role });
    if (!result.ok) {
      setUserFormMessage(result.error || "Unable to add user.", "error");
      return;
    }

    addUserForm.reset();
    setUserFormMessage(`User "${username.trim()}" added.`, "success");
    renderUsersTable();
  });
}

hydrateLogsFromStorage();
updateEntryNumbers();

window.addEventListener("beforeunload", () => {
  photoConfigs.forEach((config) => {
    stopCameraCapture(config);
  });
});
