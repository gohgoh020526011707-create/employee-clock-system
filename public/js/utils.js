/**
 * 通用工具模組
 */
const Utils = (() => {
  let _cachedToken = null;
  let _tokenExpiry = 0;

  async function _getToken() {
    const now = Date.now();
    if (_cachedToken && now < _tokenExpiry) return _cachedToken;
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error("尚未登入");
    _cachedToken = await user.getIdToken();
    _tokenExpiry = now + 5 * 60 * 1000;
    return _cachedToken;
  }

  function clearTokenCache() {
    _cachedToken = null;
    _tokenExpiry = 0;
  }

  async function apiRequest(endpoint, method = "GET", body = null) {
    const token = await _getToken();
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "請求失敗");
    }
    return data;
  }

  function formatDate(isoString) {
    if (!isoString) return "--";
    return new Date(isoString).toLocaleDateString("zh-TW");
  }

  function formatTime(isoString) {
    if (!isoString) return "--";
    return new Date(isoString).toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDateTime(isoString) {
    if (!isoString) return "--";
    return new Date(isoString).toLocaleString("zh-TW");
  }

  function todayString() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().split("T")[0];
  }

  function showToast(message, type = "info") {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("toast--visible"));
    setTimeout(() => {
      toast.classList.remove("toast--visible");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function setLoading(button, loading) {
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.textContent = "處理中...";
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  return { apiRequest, clearTokenCache, formatDate, formatTime, formatDateTime, todayString, showToast, setLoading };
})();
