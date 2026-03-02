/**
 * 認證模組
 */
const Auth = (() => {
  async function login(email, password) {
    const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function logout() {
    await firebaseAuth.signOut();
    window.location.href = "/";
  }

  function onAuthStateChanged(callback) {
    firebaseAuth.onAuthStateChanged(callback);
  }

  async function getCurrentRole() {
    try {
      const data = await Utils.apiRequest("/admin/employees", "GET");
      return "admin";
    } catch {
      return "employee";
    }
  }

  return { login, logout, onAuthStateChanged, getCurrentRole };
})();
