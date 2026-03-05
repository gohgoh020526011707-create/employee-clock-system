/**
 * 管理員模組
 */
const Admin = (() => {
  let _employees = [];

  /* ========== 員工管理 ========== */

  function _nonAdminEmployees() {
    return _employees.filter((e) => e.role !== "admin");
  }

  async function loadEmployees() {
    const tbody = document.getElementById("employees-tbody");

    try {
      const data = await Utils.apiRequest("/admin/employees");
      _employees = data.employees;
      if (tbody) renderEmployeeTable(tbody, _nonAdminEmployees());
      _populateSelects();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-center">載入失敗：${err.message}</td></tr>`;
    }
  }

  function _populateSelects() {
    const selects = ["query-employee", "salary-employee"];
    const staff = _nonAdminEmployees();
    for (const id of selects) {
      const select = document.getElementById(id);
      if (!select) continue;
      select.innerHTML =
        '<option value="">-- 請選擇員工 --</option>' +
        staff.map((e) => `<option value="${e.uid}">${e.name}</option>`).join("");
    }
  }

  function salaryTypeLabel(type) {
    return type === "part_time" ? "工讀生（時薪）" : "正職（月薪）";
  }

  function salaryDisplay(emp) {
    let text;
    if (emp.salary_type === "part_time") {
      text = `$${Number(emp.hourly_rate || 0).toLocaleString()} / 時`;
    } else {
      text = `$${Number(emp.monthly_salary || 0).toLocaleString()} / 月`;
    }
    if (emp.salary_effective_date) {
      text += `<br><small style="color:var(--color-gray-400);">${emp.salary_effective_date} 起</small>`;
    }
    return text;
  }

  function renderEmployeeTable(tbody, employees) {
    if (employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">尚無員工</td></tr>';
      return;
    }

    tbody.innerHTML = employees
      .map(
        (e) => `
      <tr>
        <td>${e.name}</td>
        <td>${salaryTypeLabel(e.salary_type)}</td>
        <td>${salaryDisplay(e)}</td>
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
    const salaryType = formData.get("salary_type");
    const name = formData.get("name");
    const body = {
      email: name + "@clock.internal",
      password: formData.get("password"),
      name: name,
      department: "",
      role: "employee",
      salary_type: salaryType,
      monthly_salary: salaryType === "full_time" ? Number(formData.get("monthly_salary")) || 0 : 0,
      hourly_rate: salaryType === "part_time" ? Number(formData.get("hourly_rate")) || 0 : 0,
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

  function toggleSalaryFields() {
    const type = document.getElementById("emp-salary-type").value;
    document.getElementById("monthly-salary-group").style.display = type === "full_time" ? "" : "none";
    document.getElementById("hourly-rate-group").style.display = type === "part_time" ? "" : "none";
  }

  /* ========== 薪資設定 ========== */

  function loadEmployeeSalary() {
    const uid = document.getElementById("salary-employee").value;
    const emp = _employees.find((e) => e.uid === uid);
    if (!emp) return;

    document.getElementById("salary-type").value = emp.salary_type || "full_time";
    document.getElementById("salary-monthly").value = emp.monthly_salary || 0;
    document.getElementById("salary-hourly").value = emp.hourly_rate || 0;
    document.getElementById("salary-effective-date").value = Utils.todayString();
    toggleSalaryEditFields();
  }

  function toggleSalaryEditFields() {
    const type = document.getElementById("salary-type").value;
    document.getElementById("edit-monthly-group").style.display = type === "full_time" ? "" : "none";
    document.getElementById("edit-hourly-group").style.display = type === "part_time" ? "" : "none";
  }

  async function saveSalary() {
    const uid = document.getElementById("salary-employee").value;
    if (!uid) {
      Utils.showToast("請先選擇員工", "error");
      return;
    }

    const effectiveDate = document.getElementById("salary-effective-date").value;
    if (!effectiveDate) {
      Utils.showToast("請選擇生效日期", "error");
      return;
    }

    const salaryType = document.getElementById("salary-type").value;
    const body = {
      uid,
      salary_type: salaryType,
      monthly_salary: salaryType === "full_time" ? Number(document.getElementById("salary-monthly").value) || 0 : 0,
      hourly_rate: salaryType === "part_time" ? Number(document.getElementById("salary-hourly").value) || 0 : 0,
      salary_effective_date: effectiveDate,
    };

    try {
      const data = await Utils.apiRequest("/admin/employees", "PUT", body);
      Utils.showToast(data.message, "success");
      await loadEmployees();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  }

  /* ========== IP 白名單管理 ========== */

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
    if (input) input.value = ips.join("\n");

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
      const data = await Utils.apiRequest("/admin/settings", "POST", { allowed_ips: ips });
      Utils.showToast(data.message, "success");
      await loadIPSettings();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  }

  /* ========== 出勤紀錄查詢與修改 ========== */

  function calcDuration(clockIn, clockOut) {
    if (!clockIn || !clockOut) return "--";
    const ms = new Date(clockOut) - new Date(clockIn);
    if (ms < 0) return "--";
    const totalMin = Math.floor(ms / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hours} 小時 ${mins} 分鐘`;
  }

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
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">查詢失敗：${err.message}</td></tr>`;
    }
  }

  function renderAdminRecords(tbody, records) {
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">無紀錄</td></tr>';
      return;
    }

    tbody.innerHTML = records
      .map(
        (r) => `
      <tr>
        <td>${r.date}</td>
        <td>${Utils.formatTime(r.clock_in)}</td>
        <td>${Utils.formatTime(r.clock_out)}</td>
        <td>${calcDuration(r.clock_in, r.clock_out)}</td>
        <td>
          <button class="btn btn--sm btn--outline" onclick="Admin.openEditModal('${r.id}', '${r.clock_in || ""}', '${r.clock_out || ""}')">修改</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function toLocalDatetime(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d - offset).toISOString().slice(0, 16);
  }

  function openEditModal(recordId, clockIn, clockOut) {
    document.getElementById("edit-record-id").value = recordId;
    document.getElementById("edit-clock-in").value = toLocalDatetime(clockIn);
    document.getElementById("edit-clock-out").value = toLocalDatetime(clockOut);
    document.getElementById("edit-modal").style.display = "flex";
  }

  function closeEditModal() {
    document.getElementById("edit-modal").style.display = "none";
  }

  async function saveRecordEdit() {
    const recordId = document.getElementById("edit-record-id").value;
    const clockInLocal = document.getElementById("edit-clock-in").value;
    const clockOutLocal = document.getElementById("edit-clock-out").value;

    const body = { record_id: recordId };
    if (clockInLocal) body.clock_in = new Date(clockInLocal).toISOString();
    if (clockOutLocal) body.clock_out = new Date(clockOutLocal).toISOString();
    else body.clock_out = "";

    try {
      const data = await Utils.apiRequest("/admin/update_record", "POST", body);
      Utils.showToast(data.message, "success");
      closeEditModal();
      await queryEmployeeRecords();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  }

  /* ========== 薪資報表 ========== */

  async function generatePayroll() {
    const tbody = document.getElementById("payroll-tbody");
    if (!tbody) return;

    const monthInput = document.getElementById("payroll-month").value;
    if (!monthInput) {
      Utils.showToast("請選擇月份", "error");
      return;
    }

    const [year, month] = monthInput.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">計算中...</td></tr>';

    try {
      const staff = _nonAdminEmployees();

      const results = await Promise.all(
        staff.map((emp) =>
          Utils.apiRequest(`/get_records?employee_id=${emp.uid}&start=${startDate}&end=${endDate}`)
            .then((data) => ({ emp, records: data.records }))
        )
      );

      const rows = results.map(({ emp, records }) => {
        let totalMs = 0;
        let daysWorked = 0;

        for (const r of records) {
          if (r.clock_in && r.clock_out) {
            const ms = new Date(r.clock_out) - new Date(r.clock_in);
            if (ms > 0) totalMs += ms;
          }
          daysWorked++;
        }

        const totalHours = totalMs / 3600000;
        let salary = 0;
        let basis = "";

        if (emp.salary_type === "part_time") {
          const rate = Number(emp.hourly_rate) || 0;
          salary = Math.round(totalHours * rate);
          basis = `$${rate.toLocaleString()} / 時`;
        } else {
          salary = Number(emp.monthly_salary) || 0;
          basis = `$${salary.toLocaleString()} / 月`;
        }

        return {
          name: emp.name,
          type: salaryTypeLabel(emp.salary_type),
          days: daysWorked,
          hours: totalHours.toFixed(1),
          basis,
          salary,
        };
      });

      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">無員工資料</td></tr>';
        return;
      }

      tbody.innerHTML = rows
        .map(
          (r) => `
        <tr>
          <td>${r.name}</td>
          <td>${r.type}</td>
          <td>${r.days} 天</td>
          <td>${r.hours} 小時</td>
          <td>${r.basis}</td>
          <td><strong>$${r.salary.toLocaleString()}</strong></td>
        </tr>
      `
        )
        .join("");
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">產生報表失敗：${err.message}</td></tr>`;
    }
  }

  /* ========== 下拉選單填充 ========== */

  function populateAllSelects() {
    _populateSelects();
  }

  return {
    loadEmployees,
    addEmployee,
    deleteEmployee,
    toggleSalaryFields,
    loadEmployeeSalary,
    toggleSalaryEditFields,
    saveSalary,
    loadIPSettings,
    saveIPSettings,
    queryEmployeeRecords,
    openEditModal,
    closeEditModal,
    saveRecordEdit,
    generatePayroll,
    populateAllSelects,
  };
})();
