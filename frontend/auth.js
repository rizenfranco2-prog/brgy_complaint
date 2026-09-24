const tokenKey = "barangay_token";

function saveSession(token) {
  localStorage.setItem(tokenKey, token);
}

function getToken() {
  return localStorage.getItem(tokenKey);
}

function logout() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem("barangay_role");
  location.href = "index.html";
}

function showMessage(id, message, error = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `form-message ${error ? "error" : "success"}`;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const adminLoginForm = document.getElementById("adminLoginForm");

  if (loginForm) {
    const loginTab = document.getElementById("loginTab");
    const registerTab = document.getElementById("registerTab");

    function showLogin() {
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
      loginTab.classList.add("active");
      registerTab.classList.remove("active");
    }

    function showRegister() {
      loginForm.classList.add("hidden");
      registerForm.classList.remove("hidden");
      loginTab.classList.remove("active");
      registerTab.classList.add("active");
    }

    loginTab.onclick = showLogin;
    registerTab.onclick = showRegister;

    loginForm.onsubmit = async e => {
      e.preventDefault();
      try {
        const data = await request("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: loginEmail.value,
            password: loginPassword.value
          })
        });
        saveSession(data.token);
        localStorage.setItem("barangay_role", "user");
        location.href = "dashboard.html";
      } catch (err) {
        showMessage("loginMessage", err.message);
      }
    };

    registerForm.onsubmit = async e => {
      e.preventDefault();
      try {
        const data = await request("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: registerName.value,
            email: registerEmail.value,
            password: registerPassword.value
          })
        });
        saveSession(data.token);
        localStorage.setItem("barangay_role", "user");
        location.href = "dashboard.html";
      } catch (err) {
        showMessage("registerMessage", err.message);
      }
    };
  }

  if (adminLoginForm) {
    adminLoginForm.onsubmit = async e => {
      e.preventDefault();
      try {
        const data = await request("/api/auth/admin-login", {
          method: "POST",
          body: JSON.stringify({
            username: adminUsername.value,
            password: adminPassword.value
          })
        });
        saveSession(data.token);
        localStorage.setItem("barangay_role", "admin");
        location.href = "admin-dashboard.html";
      } catch (err) {
        showMessage("adminMessage", err.message);
      }
    };
  }
});
