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

  async function getProfile() {
    const data = await Utils.apiRequest("/my_profile");
    return data.profile;
  }

  return { login, logout, onAuthStateChanged, getProfile };
})();
