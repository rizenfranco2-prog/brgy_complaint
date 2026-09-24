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
    window.location.href = "index.html";
}

function showMessage(id, message, error = true) {
    const el = document.getElementById(id);

    if (!el) return;

    el.textContent = message;
    el.className = `form-message ${error ? "error" : "success"}`;
}

async function request(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}


document.addEventListener("DOMContentLoaded", () => {

    // =========================
    // RESIDENT LOGIN / REGISTER
    // =========================

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm && registerForm) {

        const loginTab = document.getElementById("loginTab");
        const registerTab = document.getElementById("registerTab");

        const loginEmail = document.getElementById("loginEmail");
        const loginPassword = document.getElementById("loginPassword");

        const registerName = document.getElementById("registerName");
        const registerEmail = document.getElementById("registerEmail");
        const registerPassword = document.getElementById("registerPassword");


        // Show Login
        function showLogin() {
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");

            if (loginTab) {
                loginTab.classList.add("active");
            }

            if (registerTab) {
                registerTab.classList.remove("active");
            }
        }


        // Show Register
        function showRegister() {
            loginForm.classList.add("hidden");
            registerForm.classList.remove("hidden");

            if (loginTab) {
                loginTab.classList.remove("active");
            }

            if (registerTab) {
                registerTab.classList.add("active");
            }
        }


        if (loginTab) {
            loginTab.addEventListener("click", showLogin);
        }

        if (registerTab) {
            registerTab.addEventListener("click", showRegister);
        }


        // Resident Login
        loginForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            try {

                const data = await request("/api/auth/login", {
                    method: "POST",

                    body: JSON.stringify({
                        email: loginEmail.value.trim(),
                        password: loginPassword.value
                    })
                });

                saveSession(data.token);

                localStorage.setItem(
                    "barangay_role",
                    "user"
                );

                window.location.href = "dashboard.html";

            } catch (err) {

                showMessage(
                    "loginMessage",
                    err.message,
                    true
                );

            }

        });


        // Resident Registration
        registerForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            try {

                const data = await request("/api/auth/register", {
                    method: "POST",

                    body: JSON.stringify({
                        name: registerName.value.trim(),
                        email: registerEmail.value.trim(),
                        password: registerPassword.value
                    })
                });

                saveSession(data.token);

                localStorage.setItem(
                    "barangay_role",
                    "user"
                );

                window.location.href = "dashboard.html";

            } catch (err) {

                showMessage(
                    "registerMessage",
                    err.message,
                    true
                );

            }

        });

    }


    // =========================
    // ADMIN LOGIN
    // =========================

    const adminLoginForm =
        document.getElementById("adminLoginForm");

    if (adminLoginForm) {

        const adminUsername =
            document.getElementById("adminUsername");

        const adminPassword =
            document.getElementById("adminPassword");


        adminLoginForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            try {

                const data = await request(
                    "/api/auth/admin-login",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            username: adminUsername.value.trim(),
                            password: adminPassword.value
                        })
                    }
                );

                saveSession(data.token);

                localStorage.setItem(
                    "barangay_role",
                    "admin"
                );

                window.location.href =
                    "admin-dashboard.html";

            } catch (err) {

                showMessage(
                    "adminMessage",
                    err.message,
                    true
                );

            }

        });

    }

});