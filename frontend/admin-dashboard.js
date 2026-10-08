let adminPosts = [];

/* ================================================= */
/* AUTH / API */
/* ================================================= */

function token() {
    return localStorage.getItem("barangay_token");
}

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token()) {
        headers.Authorization = `Bearer ${token()}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[ch]));
}

function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    setTimeout(() => {
        el.classList.remove("show");
    }, 2500);
}


/* ================================================= */
/* LOAD ADMIN COMPLAINTS */
/* ================================================= */

async function loadAdminPosts() {
    const tableBody = document.getElementById("adminPostsBody");
    if (!tableBody) return;

    try {
        const data = await api("/api/posts");
        adminPosts = data.posts || [];

        if (!adminPosts.length) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">No complaints found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = adminPosts.map(post => `
            <tr class="border-b">
                <td class="p-3 font-semibold">${escapeHTML(post.authorName || "Anonymous")}</td>
                <td class="p-3">${escapeHTML(post.category || "General")}</td>
                <td class="p-3 max-w-xs truncate">${escapeHTML(post.content || "")}</td>
                <td class="p-3">${escapeHTML(post.address || "N/A")}</td>
                <td class="p-3">${escapeHTML(post.contactNumber || "N/A")}</td>
                <td class="p-3">
                    <select class="status-select border rounded px-2 py-1 text-sm" data-id="${post._id}">
                        <option value="Pending" ${post.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="In Progress" ${post.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Resolved" ${post.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                </td>
                <td class="p-3">
                    <button class="delete-admin-btn text-red-600 hover:text-red-800" data-id="${post._id}">Delete</button>
                </td>
            </tr>
        `).join("");

        /* Status Change Listener */
        document.querySelectorAll(".status-select").forEach(select => {
            select.addEventListener("change", async (e) => {
                const id = e.target.getAttribute("data-id");
                const newStatus = e.target.value;

                try {
                    await api(`/api/posts/${id}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: newStatus })
                    });
                    toast("Status updated.");
                } catch (err) {
                    toast(err.message || "Failed to update status.");
                }
            });
        });

        /* Delete Post Listener */
        document.querySelectorAll(".delete-admin-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Are you sure you want to delete this complaint?")) return;

                const id = btn.getAttribute("data-id");
                try {
                    await api(`/api/posts/${id}`, { method: "DELETE" });
                    toast("Complaint deleted.");
                    await loadAdminPosts();
                } catch (err) {
                    toast(err.message || "Failed to delete.");
                }
            });
        });

    } catch (err) {
        toast(err.message || "Failed to load complaints.");
    }
}


/* ================================================= */
/* DOM LOADED */
/* ================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    /* Modal Controls */
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove("hidden");
    };

    const closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add("hidden");
    };

    /* Change Password Modal Open Trigger */
    const adminPasswordBtn = document.getElementById("adminPasswordBtn") || document.getElementById("changePasswordBtn");
    if (adminPasswordBtn) {
        adminPasswordBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openModal("passwordModal");
        });
    }

    /* Modal Close Attributes */
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            closeModal(btn.getAttribute("data-close"));
        });
    });

    /* Backdrop Click */
    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
            e.target.classList.add("hidden");
        }
    });

    /* Admin Password Change Form Handler */
    const passwordForm = document.getElementById("passwordForm") || document.getElementById("changePasswordForm");
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById("currentPassword")?.value.trim();
            const newPassword = document.getElementById("newPassword")?.value.trim();
            const confirmPassword = document.getElementById("confirmPassword")?.value.trim();

            if (newPassword && confirmPassword && newPassword !== confirmPassword) {
                toast("New passwords do not match.");
                return;
            }

            try {
                await api("/api/auth/change-password", {
                    method: "POST",
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                toast("Password updated successfully.");
                passwordForm.reset();
                closeModal("passwordModal");
            } catch (err) {
                toast(err.message || "Failed to update password.");
            }
        });
    }

    /* Auth check for Admin */
    if (!token()) {
        location.href = "index.html";
        return;
    }

    try {
        const me = await api("/api/auth/me");
        if (me.role !== "admin") {
            location.href = "dashboard.html";
            return;
        }

        if (document.getElementById("adminName")) {
            document.getElementById("adminName").textContent = me.account.name;
        }

        await loadAdminPosts();
    } catch (err) {
        localStorage.removeItem("barangay_token");
        localStorage.removeItem("barangay_role");
        location.href = "index.html";
        return;
    }

    /* Logout */
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem("barangay_token");
            localStorage.removeItem("barangay_role");
            location.href = "index.html";
        };
    }
});