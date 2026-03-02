/**
 * 打卡模組
 */
const Clock = (() => {
  async function clockIn(button) {
    Utils.setLoading(button, true);
    try {
      const data = await Utils.apiRequest("/clock_in", "POST");
      Utils.showToast(data.message, "success");
      await Records.loadToday();
    } catch (err) {
      Utils.showToast(err.message, "error");
    } finally {
      Utils.setLoading(button, false);
    }
  }

  async function clockOut(button) {
    Utils.setLoading(button, true);
    try {
      const data = await Utils.apiRequest("/clock_out", "POST");
      Utils.showToast(data.message, "success");
      await Records.loadToday();
    } catch (err) {
      Utils.showToast(err.message, "error");
    } finally {
      Utils.setLoading(button, false);
    }
  }

  return { clockIn, clockOut };
})();
