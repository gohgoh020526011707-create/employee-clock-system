/**
 * 管理員模組
 */
const Admin = (() => {
  /* ---------- 員工管理 ---------- */

  async function loadEmployees() {
    const tbody = document.getElementById("employees-tbody");
    if (!tbody) return;

    try {
      const data = await Utils.apiRequest("/admin/employees");
      renderEmployeeTable(tbody, data.employees);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">載入失敗：${err.message}</td></tr>`;
    }
  }

  function renderEmployeeTable(tbody, employees) {
    if (employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">尚無員工</td></tr>';
      return;
    }

    tbody.innerHTML = employees
      .map(
        (e) => `
      <tr>
        <td>${e.name}</td>
        <td>${e.email}</td>
        <td>${e.department || "--"}</td>
        <td><span class="badge badge--${e.role}">${e.role === "admin" ? "管理員" : "員工"}</span></td>
        <td>
          <button class="btn btn--sm btn--danger" onclick="Admin.deleteEmployee('${e.uid}', '${e.name}')">刪除</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  async function addEmployee(form) {
    const formData = new FormData(form);
    const body = {
      email: formData.get("email"),
      password: formData.get("password"),
      name: formData.get("name"),
      department: formData.get("department"),
      role: formData.get("role"),
    };

    try {
      const data = await Utils.apiRequest("/admin/employees", "POST", body);
      Utils.showToast(data.message, "success");
      form.reset();
      await loadEmployees();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  }

  async function deleteEmployee(uid, name) {
    if (!confirm(`確定要刪除員工「${name}」嗎？此操作不可復原。`)) return;

    try {
      const data = await Utils.apiRequest(`/admin/employees?uid=${uid}`, "DELETE");
      Utils.showToast(data.message, "success");
      await loadEmployees();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  }

  /* ---------- IP 白名單管理 ---------- */

  async function loadIPSettings() {
    const container = document.getElementById("ip-list");
    if (!container) return;

    try {
      const data = await Utils.apiRequest("/admin/settings");
      renderIPList(container, data.allowed_ips || []);
    } catch (err) {
      container.innerHTML = `<p class="text-muted">載入失敗：${err.message}</p>`;
    }
  }

  function renderIPList(container, ips) {
    const input = document.getElementById("ip-input");
    if (input) {
      input.value = ips.join("\n");
    }

    if (ips.length === 0) {
      container.innerHTML = '<p class="text-muted">尚未設定任何允許的 IP</p>';
      return;
    }

    container.innerHTML = `
      <ul class="ip-list">
        ${ips.map((ip) => `<li><code>${ip}</code></li>`).join("")}
      </ul>
    `;
  }

  async function saveIPSettings() {
    const input = document.getElementById("ip-input");
    if (!input) return;

    const ips = input.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    try {
      const data = await Utils.apiRequest("/admin/settings", "POST", {
        allowed_ips: ips,
      });
      Utils.showToast(data.message, "success");
      await loadIPSettings();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  }

  /* ---------- 員工出勤紀錄查詢 ---------- */

  async function queryEmployeeRecords() {
    const tbody = document.getElementById("admin-records-tbody");
    if (!tbody) return;

    const uid = document.getElementById("query-employee")?.value;
    const start = document.getElementById("query-start")?.value;
    const end = document.getElementById("query-end")?.value;

    if (!uid) {
      Utils.showToast("請選擇員工", "error");
      return;
    }

    let url = `/get_records?employee_id=${uid}`;
    if (start) url += `&start=${start}`;
    if (end) url += `&end=${end}`;

    try {
      const data = await Utils.apiRequest(url);
      renderAdminRecords(tbody, data.records);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center">查詢失敗：${err.message}</td></tr>`;
    }
  }

  function renderAdminRecords(tbody, records) {
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">無紀錄</td></tr>';
      return;
    }

    tbody.innerHTML = records
      .map(
        (r) => `
      <tr>
        <td>${r.date}</td>
        <td>${Utils.formatTime(r.clock_in)}</td>
        <td>${Utils.formatTime(r.clock_out)}</td>
        <td><code>${r.ip || "--"}</code></td>
      </tr>
    `
      )
      .join("");
  }

  async function populateEmployeeSelect() {
    const select = document.getElementById("query-employee");
    if (!select) return;

    try {
      const data = await Utils.apiRequest("/admin/employees");
      select.innerHTML =
        '<option value="">-- 請選擇員工 --</option>' +
        data.employees
          .map((e) => `<option value="${e.uid}">${e.name} (${e.email})</option>`)
          .join("");
    } catch {
      select.innerHTML = '<option value="">載入失敗</option>';
    }
  }

  return {
    loadEmployees,
    addEmployee,
    deleteEmployee,
    loadIPSettings,
    saveIPSettings,
    queryEmployeeRecords,
    populateEmployeeSelect,
  };
})();
