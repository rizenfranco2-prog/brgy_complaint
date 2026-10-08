/* ================================================= */
/* GLOBAL VARIABLES & CONFIGURATION */
/* ================================================= */
let adminPosts = [];
let currentAdmin = null;

/* Helper to safely retrieve token */
function getAdminToken() {
    return localStorage.getItem("barangay_token");
}

/* Centralized API Helper */
async function apiCall(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getAdminToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
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

/* ================================================= */
/* UTILITY FUNCTIONS */
/* ================================================= */
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[ch]));
}

function initials(name) {
    return String(name || "A")
        .split(/\s+/)
        .slice(0, 2)
        .map(x => x[0])
        .join("")
        .toUpperCase();
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
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
/* DATA FETCHING & RENDERING */
/* ================================================= */

/* Fetch posts and calculate summary statistics */
async function loadAdminDashboard(search = "") {
    const loadingEl = document.getElementById("adminLoading");
    const container = document.getElementById("adminPostList");

    try {
        if (loadingEl) loadingEl.style.display = "block";

        const data = await apiCall(`/api/admin/posts?search=${encodeURIComponent(search)}`);
        adminPosts = data.posts || [];

        /* Update Dashboard Stats */
        updateStats(adminPosts);

        /* Render Posts List */
        renderAdminPosts(adminPosts);

    } catch (err) {
        if (loadingEl) {
            loadingEl.textContent = `Error: ${err.message}`;
        }
        toast(err.message);
    } finally {
        if (loadingEl && adminPosts.length > 0) {
            loadingEl.style.display = "none";
        }
    }
}

function updateStats(posts) {
    const statPosts = document.getElementById("statPosts");
    const statComments = document.getElementById("statComments");
    const statAdminPosts = document.getElementById("statAdminPosts");

    const totalPosts = posts.length;
    const totalComments = posts.reduce((acc, post) => acc + (post.comments?.length || 0), 0);
    const adminPostsCount = posts.filter(post => post.isAdminPost || post.authorRole === "admin").length;

    if (statPosts) statPosts.textContent = totalPosts;
    if (statComments) statComments.textContent = totalComments;
    if (statAdminPosts) statAdminPosts.textContent = adminPostsCount;
}

function renderAdminPosts(posts) {
    const container = document.getElementById("adminPostList");
    const loadingEl = document.getElementById("adminLoading");

    if (!container) return;

    if (!posts.length) {
        container.innerHTML = `
            <div class="empty card" style="padding: 2rem; text-align: center;">
                <h3>No posts found</h3>
                <p class="muted">There are no posts matching your criteria.</p>
            </div>
        `;
        if (loadingEl) loadingEl.style.display = "none";
        return;
    }

    container.innerHTML = posts.map(post => {
        const comments = post.comments || [];
        const status = post.status || "Pending";

        return `
            <article class="admin-post-card card" style="margin-bottom: 1rem; padding: 1rem; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                        <span class="avatar">${escapeHTML(initials(post.authorName))}</span>
                        <div>
                            <strong>${escapeHTML(post.authorName)}</strong>
                            <small style="display: block;" class="muted">${timeAgo(post.createdAt)}</small>
                        </div>
                    </div>
                    <div>
                        <button class="secondary-btn edit-post-btn" data-id="${post._id}" data-content="${escapeHTML(post.content)}" type="button">Edit</button>
                        <button class="danger-btn delete-post-btn" data-id="${post._id}" type="button">Delete</button>
                    </div>
                </div>

                ${post.category ? `<div style="font-size: 0.85rem; font-weight: bold; margin-bottom: 0.5rem;" class="muted">[${escapeHTML(post.category)}]</div>` : ""}

                <div class="post-content" style="margin-bottom: 0.75rem;">
                    ${escapeHTML(post.content).replace(/\n/g, "<br>")}
                </div>

                ${post.image ? `
                    <div style="margin-bottom: 0.75rem;">
                        <img src="${escapeHTML(post.image)}" style="max-width: 100%; max-height: 300px; border-radius: 8px;" alt="Post media">
                    </div>
                ` : ""}

                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;" class="muted">
                    <span>Status: <strong>${escapeHTML(status)}</strong></span>
                    <span>${comments.length} Comment${comments.length === 1 ? "" : "s"}</span>
                </div>
            </article>
        `;
    }).join("");

    if (loadingEl) loadingEl.style.display = "none";

    /* Attach Event Handlers to Dynamic Elements */
    container.querySelectorAll(".delete-post-btn").forEach(btn => {
        btn.onclick = () => deletePost(btn.dataset.id);
    });

    container.querySelectorAll(".edit-post-btn").forEach(btn => {
        btn.onclick = () => openEditPostModal(btn.dataset.id, btn.dataset.content);
    });
}

/* Delete Post Action */
async function deletePost(postId) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
        await apiCall(`/api/admin/posts/${postId}`, { method: "DELETE" });
        toast("Post deleted successfully.");
        await loadAdminDashboard();
    } catch (err) {
        toast(err.message);
    }
}

/* ================================================= */
/* MODALS MANAGEMENT */
/* ================================================= */

/* Post Modal (Create / Edit) */
function openNewPostModal() {
    const modal = document.getElementById("postModal");
    const title = document.getElementById("postModalTitle");
    const editIdInput = document.getElementById("editPostId");
    const contentInput = document.getElementById("adminPostContent");
    const messageEl = document.getElementById("adminPostMessage");

    if (!modal) return;

    if (title) title.textContent = "Create post";
    if (editIdInput) editIdInput.value = "";
    if (contentInput) contentInput.value = "";
    if (messageEl) messageEl.textContent = "";

    modal.classList.remove("hidden");
    modal.style.display = "flex";
}

function openEditPostModal(id, content) {
    const modal = document.getElementById("postModal");
    const title = document.getElementById("postModalTitle");
    const editIdInput = document.getElementById("editPostId");
    const contentInput = document.getElementById("adminPostContent");
    const messageEl = document.getElementById("adminPostMessage");

    if (!modal) return;

    if (title) title.textContent = "Edit post";
    if (editIdInput) editIdInput.value = id;
    if (contentInput) contentInput.value = content;
    if (messageEl) messageEl.textContent = "";

    modal.classList.remove("hidden");
    modal.style.display = "flex";
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
    }
}

/* ================================================= */
/* INITIALIZATION & EVENT LISTENERS */
/* ================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    /* 1. Verify Authentication */
    if (!getAdminToken()) {
        window.location.href = "index.html";
        return;
    }

    try {
        const me = await apiCall("/api/auth/me");

        if (me.role !== "admin") {
            window.location.href = "feed.html";
            return;
        }

        currentAdmin = me.account;
        const adminNameStr = currentAdmin.name || "Administrator";

        /* Update Profile Info in DOM */
        const adminName = document.getElementById("adminName");
        const adminSideName = document.getElementById("adminSideName");

        if (adminName) adminName.textContent = adminNameStr;
        if (adminSideName) adminSideName.textContent = adminNameStr;

        document.querySelectorAll(".admin-avatar").forEach(avatar => {
            avatar.textContent = initials(adminNameStr);
        });

        /* Load Posts */
        await loadAdminDashboard();

    } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("barangay_token");
        localStorage.removeItem("barangay_role");
        window.location.href = "index.html";
        return;
    }

    /* 2. Logout Handler */
    const adminLogout = document.getElementById("adminLogout");
    if (adminLogout) {
        adminLogout.onclick = () => {
            localStorage.removeItem("barangay_token");
            localStorage.removeItem("barangay_role");
            window.location.href = "index.html";
        };
    }

    /* 3. Search Handler with Debounce */
    const adminSearch = document.getElementById("adminSearch");
    if (adminSearch) {
        let searchTimeout;
        adminSearch.oninput = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadAdminDashboard(e.target.value.trim());
            }, 300);
        };
    }

    /* 4. New Post Modal Handlers */
    const newPostBtn = document.getElementById("newPostBtn");
    if (newPostBtn) {
        newPostBtn.onclick = openNewPostModal;
    }

    const postForm = document.getElementById("adminPostForm");
    if (postForm) {
        postForm.onsubmit = async (e) => {
            e.preventDefault();
            const editId = document.getElementById("editPostId")?.value;
            const content = document.getElementById("adminPostContent")?.value.trim();
            const messageEl = document.getElementById("adminPostMessage");

            if (!content) return;

            try {
                if (editId) {
                    /* Update Post */
                    await apiCall(`/api/admin/posts/${editId}`, {
                        method: "PUT",
                        body: JSON.stringify({ content })
                    });
                    toast("Post updated successfully.");
                } else {
                    /* Create Post */
                    await apiCall("/api/admin/posts", {
                        method: "POST",
                        body: JSON.stringify({ content, isAdminPost: true })
                    });
                    toast("Post published successfully.");
                }

                closeModal("postModal");
                await loadAdminDashboard();
            } catch (err) {
                if (messageEl) {
                    messageEl.textContent = err.message;
                    messageEl.style.color = "red";
                } else {
                    toast(err.message);
                }
            }
        };
    }

    /* Close Buttons for General Modals */
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.onclick = () => {
            closeModal(btn.dataset.close);
        };
    });

    /* 5. Password Modal Handlers */
    const adminPasswordBtn = document.getElementById("adminPasswordBtn");
    const passwordModal = document.getElementById("passwordModal");
    const closePasswordModal = document.getElementById("closePasswordModal");
    const passwordForm = document.getElementById("adminPasswordForm");

    if (adminPasswordBtn && passwordModal) {
        adminPasswordBtn.onclick = () => {
            passwordModal.classList.add("show");
            passwordModal.style.display = "flex";
        };
    }

    if (closePasswordModal && passwordModal) {
        closePasswordModal.onclick = () => {
            passwordModal.classList.remove("show");
            passwordModal.style.display = "none";
        };
    }

    if (passwordForm) {
        passwordForm.onsubmit = async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById("adminCurrentPassword")?.value;
            const newPassword = document.getElementById("adminNewPassword")?.value;
            const confirmPassword = document.getElementById("adminConfirmPassword")?.value;
            const messageEl = document.getElementById("adminPasswordMessage");

            if (newPassword !== confirmPassword) {
                if (messageEl) {
                    messageEl.textContent = "New passwords do not match.";
                    messageEl.style.color = "red";
                }
                return;
            }

            try {
                await apiCall("/api/auth/change-password", {
                    method: "POST",
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                if (messageEl) {
                    messageEl.textContent = "Password updated successfully.";
                    messageEl.style.color = "green";
                }

                passwordForm.reset();
                setTimeout(() => {
                    passwordModal.classList.remove("show");
                    passwordModal.style.display = "none";
                    if (messageEl) messageEl.textContent = "";
                }, 1500);

            } catch (err) {
                if (messageEl) {
                    messageEl.textContent = err.message;
                    messageEl.style.color = "red";
                }
            }
        };
    }
});