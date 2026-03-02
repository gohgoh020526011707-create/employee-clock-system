/**
 * 打卡紀錄模組
 */
const Records = (() => {
  async function loadToday() {
    const container = document.getElementById("today-record");
    if (!container) return;

    try {
      const today = Utils.todayString();
      const data = await Utils.apiRequest(
        `/get_records?start=${today}&end=${today}`
      );
      renderTodayStatus(container, data.records);
    } catch (err) {
      container.innerHTML = `<p class="text-muted">載入失敗：${err.message}</p>`;
    }
  }

  function renderTodayStatus(container, records) {
    const btnIn = document.getElementById("btn-clock-in");
    const btnOut = document.getElementById("btn-clock-out");

    if (records.length === 0) {
      container.innerHTML = '<p class="text-muted">今日尚未打卡</p>';
      if (btnIn) btnIn.disabled = false;
      if (btnOut) btnOut.disabled = true;
      return;
    }

    const r = records[0];
    container.innerHTML = `
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
    `;

    if (btnIn) btnIn.disabled = true;
    if (btnOut) btnOut.disabled = !!r.clock_out;
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
      renderHistoryTable(tbody, data.records);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center">載入失敗：${err.message}</td></tr>`;
    }
  }

  function calcDuration(clockIn, clockOut) {
    if (!clockIn || !clockOut) return "--";
    const ms = new Date(clockOut) - new Date(clockIn);
    if (ms < 0) return "--";
    const totalMin = Math.floor(ms / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hours} 小時 ${mins} 分鐘`;
  }

  function renderHistoryTable(tbody, records) {
    if (records.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted">無紀錄</td></tr>';
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
      </tr>
    `
      )
      .join("");
  }

  return { loadToday, loadHistory };
})();
