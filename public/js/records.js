/**
 * 打卡紀錄模組
 */
const Records = (() => {
  let _profile = null;

  async function _ensureProfile() {
    if (_profile) return _profile;
    try {
      const data = await Utils.apiRequest("/my_profile");
      _profile = data.profile;
    } catch {}
    return _profile;
  }

  function calcDuration(clockIn, clockOut) {
    if (!clockIn || !clockOut) return { text: "--", hours: 0 };
    const ms = new Date(clockOut) - new Date(clockIn);
    if (ms < 0) return { text: "--", hours: 0 };
    const totalMin = Math.floor(ms / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return { text: `${hours} 小時 ${mins} 分鐘`, hours: ms / 3600000 };
  }

  function calcPay(hours, profile) {
    if (!profile || profile.salary_type !== "part_time" || !hours) return "";
    const rate = Number(profile.hourly_rate) || 0;
    const pay = Math.round(hours * rate);
    return `$${pay.toLocaleString()}`;
  }

  async function loadToday() {
    const container = document.getElementById("today-record");
    if (!container) return;

    try {
      const today = Utils.todayString();
      const data = await Utils.apiRequest(
        `/get_records?start=${today}&end=${today}`
      );
      await _ensureProfile();
      renderTodayStatus(container, data.records);
    } catch (err) {
      container.innerHTML = `<p class="text-muted">載入失敗：${err.message}</p>`;
    }
  }

  function renderTodayStatus(container, records) {
    const btnIn = document.getElementById("btn-clock-in");
    const btnOut = document.getElementById("btn-clock-out");
    const MAX_CLOCK_IN = 2;

    if (records.length === 0) {
      container.innerHTML = '<p class="text-muted">今日尚未打卡</p>';
      if (btnIn) btnIn.disabled = false;
      if (btnOut) btnOut.disabled = true;
      return;
    }

    const sorted = [...records].sort((a, b) => new Date(a.clock_in) - new Date(b.clock_in));
    let totalPayHours = 0;

    const shiftsHtml = sorted.map((r, i) => {
      const dur = calcDuration(r.clock_in, r.clock_out);
      totalPayHours += dur.hours;
      return `
        <div style="margin-bottom:0.75rem;">
          <div style="font-size:0.8125rem;color:var(--color-gray-400);margin-bottom:0.375rem;">第 ${i + 1} 班</div>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">上班打卡</span>
              <span class="status-value status-value--in">${Utils.formatTime(r.clock_in)}</span>
            </div>
            <div class="status-item">
              <span class="status-label">下班打卡</span>
              <span class="status-value status-value--out">${Utils.formatTime(r.clock_out)}</span>
            </div>
          </div>
        </div>`;
    }).join("");

    const totalPay = calcPay(totalPayHours, _profile);
    const payHtml = totalPay ? `
      <div class="status-item" style="margin-top:0.5rem;">
        <span class="status-label">今日薪資合計</span>
        <span class="status-value" style="color:var(--color-success);font-size:1.25rem;">${totalPay}</span>
      </div>` : "";

    container.innerHTML = shiftsHtml + payHtml;

    const hasUnclosed = sorted.some((r) => !r.clock_out);
    const reachedMax = sorted.length >= MAX_CLOCK_IN;

    if (btnIn) btnIn.disabled = hasUnclosed || reachedMax;
    if (btnOut) btnOut.disabled = !hasUnclosed;
  }

  async function loadHistory() {
    const tbody = document.getElementById("history-tbody");
    if (!tbody) return;

    const startInput = document.getElementById("filter-start");
    const endInput = document.getElementById("filter-end");

    const start = startInput?.value || "";
    const end = endInput?.value || "";

    let url = "/get_records?";
    if (start) url += `start=${start}&`;
    if (end) url += `end=${end}&`;

    try {
      const data = await Utils.apiRequest(url);
      await _ensureProfile();
      renderHistoryTable(tbody, data.records);
    } catch (err) {
      const cols = _profile && _profile.salary_type === "part_time" ? 5 : 4;
      tbody.innerHTML = `<tr><td colspan="${cols}" class="text-center">載入失敗：${err.message}</td></tr>`;
    }
  }

  function renderHistoryTable(tbody, records) {
    const isPartTime = _profile && _profile.salary_type === "part_time";
    const cols = isPartTime ? 5 : 4;

    const thRow = document.querySelector("#history-tbody")?.closest("table")?.querySelector("thead tr");
    if (thRow) {
      const existingPayTh = thRow.querySelector(".th-pay");
      if (isPartTime && !existingPayTh) {
        const th = document.createElement("th");
        th.className = "th-pay";
        th.textContent = "當日薪資";
        thRow.appendChild(th);
      }
    }

    if (records.length === 0) {
      tbody.innerHTML =
        `<tr><td colspan="${cols}" class="text-center text-muted">無紀錄</td></tr>`;
      return;
    }

    tbody.innerHTML = records
      .map((r) => {
        const dur = calcDuration(r.clock_in, r.clock_out);
        const pay = isPartTime ? calcPay(dur.hours, _profile) : "";
        return `
      <tr>
        <td>${r.date}</td>
        <td>${Utils.formatTime(r.clock_in)}</td>
        <td>${Utils.formatTime(r.clock_out)}</td>
        <td>${dur.text}</td>
        ${isPartTime ? `<td><strong>${pay || "--"}</strong></td>` : ""}
      </tr>
    `;
      })
      .join("");
  }

  return { loadToday, loadHistory };
})();
