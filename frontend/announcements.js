function token() {
    return localStorage.getItem("barangay_token");
}


async function api(path, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const currentToken = token();

    if (currentToken) {
        headers.Authorization =
            `Bearer ${currentToken}`;
    }

    const res = await fetch(
        `${API_URL}${path}`,
        {
            ...options,
            headers
        }
    );

    const data =
        await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(
            data.message || "Request failed."
        );
    }

    return data;
}



/* ================================================= */
/* PAGE LOAD */
/* ================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    if (!token()) {
        location.href = "index.html";
        return;
    }

    try {

        const me = await api("/api/auth/me");

        /* ALLOW RESIDENT AND ADMIN */
        if (me.role !== "user" && me.role !== "admin") {
            location.href = "index.html";
            return;
        }

        /* RESIDENT INFORMATION */
        if (me.role === "user") {

            const user = me.account;

            const topName =
                document.getElementById("topName");

            const profileName =
                document.getElementById("profileName");

            const profileEmail =
                document.getElementById("profileEmail");

            const topAvatar =
                document.getElementById("topAvatar");

            const profileAvatar =
                document.getElementById("profileAvatar");

            if (topName) {
                topName.textContent = user.name;
            }

            if (profileName) {
                profileName.textContent = user.name;
            }

            if (profileEmail) {
                profileEmail.textContent = user.email;
            }

            const userInitials = initials(user.name);

            if (topAvatar) {
                topAvatar.textContent = userInitials;
            }

            if (profileAvatar) {
                profileAvatar.textContent = userInitials;
            }
        }

        /* LOAD ANNOUNCEMENTS */
        await loadAnnouncements();

    } catch (error) {

        console.error("Announcements error:", error);

        localStorage.removeItem("barangay_token");

        location.href = "index.html";

        return;
    }

    /* ================================================= */
    /* LOGOUT */
    /* ================================================= */

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.onclick = () => {

            localStorage.clear();

            location.href = "index.html";

        };

    }


    /* ================================================= */
    /* CHANGE PASSWORD BUTTON */
    /* ================================================= */

    const passwordBtn =
        document.getElementById("passwordBtn");

    if (passwordBtn) {

        passwordBtn.onclick = () => {

            const passwordModal =
                document.getElementById("passwordModal");

            if (passwordModal) {

                passwordModal.classList.remove("hidden");

            }

        };

    }


    /* ================================================= */
    /* CLOSE MODALS */
    /* ================================================= */

    document
        .querySelectorAll("[data-close]")
        .forEach(button => {

            button.onclick = () => {

                const modal =
                    document.getElementById(
                        button.dataset.close
                    );

                if (modal) {

                    modal.classList.add("hidden");

                }

            };

        });


    /* ================================================= */
    /* CHANGE PASSWORD FORM */
    /* ================================================= */

    const passwordForm =
        document.getElementById("passwordForm");

    if (passwordForm) {

        passwordForm.onsubmit = async event => {

            event.preventDefault();

            const currentPassword =
                document.getElementById("currentPassword");

            const newPassword =
                document.getElementById("newPassword");

            const confirmPassword =
                document.getElementById("confirmPassword");

            const message =
                document.getElementById("passwordMessage");

            if (
                !currentPassword ||
                !newPassword ||
                !confirmPassword
            ) {
                return;
            }

            if (
                newPassword.value !==
                confirmPassword.value
            ) {

                if (message) {

                    message.textContent =
                        "New passwords do not match.";

                    message.className =
                        "form-message error";

                }

                return;
            }

            try {

                await api(
                    "/api/auth/change-password",
                    {
                        method: "PUT",

                        body: JSON.stringify({

                            currentPassword:
                                currentPassword.value,

                            newPassword:
                                newPassword.value

                        })
                    }
                );

                if (message) {

                    message.textContent =
                        "Password changed successfully.";

                    message.className =
                        "form-message success";

                }

                passwordForm.reset();

            } catch (error) {

                if (message) {

                    message.textContent =
                        error.message;

                    message.className =
                        "form-message error";

                }

            }

        };

    }

});