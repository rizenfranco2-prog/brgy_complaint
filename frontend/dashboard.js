let posts = [];
let currentUser = null;
let selectedImage = "";


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


/* ================================================= */
/* HELPERS */
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
    return String(name || "U")
        .split(/\s+/)
        .slice(0, 2)
        .map(x => x[0])
        .join("")
        .toUpperCase();
}

function timeAgo(date) {
    const seconds = Math.floor(
        (Date.now() - new Date(date).getTime()) / 1000
    );

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

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
/* RENDER COMMUNITY POSTS */
/* ================================================= */

function renderPosts(list = posts) {
    const container = document.getElementById("feedList");
    const loading = document.getElementById("loading");

    if (loading) {
        loading.style.display = "none";
    }

    if (!container) return;

    if (!list.length) {
        container.innerHTML = `
            <div class="empty card">
                <div class="empty-icon">◎</div>
                <h3>No posts found</h3>
                <p>Try another search or publish the first community post.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(post => {
        const own = currentUser && String(post.authorId) === String(currentUser._id);
        const comments = post.comments || [];
        const status = post.status || "Pending";

        return `
            <article class="post card">
                <div class="post-head">
                    <div class="post-profile">
                        <span class="avatar">${escapeHTML(initials(post.authorName))}</span>
                        <div class="post-author">
                            <strong>${escapeHTML(post.authorName)}</strong>
                            <small>${timeAgo(post.createdAt)}</small>
                        </div>
                    </div>
                    ${own ? `
                        <button class="more-btn" data-delete-post="${post._id}" title="Delete post" type="button">
                            ⋯
                        </button>
                    ` : ""}
                </div>

                ${post.category ? `<div class="post-category">${escapeHTML(post.category)}</div>` : ""}

                <div class="post-content">
                    ${escapeHTML(post.content).replace(/\n/g, "<br>")}
                </div>

                ${post.image ? `
                    <div class="post-image-container">
                        <img src="${escapeHTML(post.image)}" class="post-image" alt="Complaint picture" loading="lazy">
                    </div>
                ` : ""}

                <div class="post-status">
                    <span class="status-badge ${status.toLowerCase().replace(/\s+/g, "-")}">
                        ${escapeHTML(status)}
                    </span>
                </div>

                <div class="post-meta">
                    <span>${comments.length} comment${comments.length === 1 ? "" : "s"}</span>
                </div>

                <div class="comments">
                    ${comments.map(c => `
                        <div class="comment">
                            <span class="avatar tiny">${escapeHTML(initials(c.authorName))}</span>
                            <div class="comment-body">
                                <strong>${escapeHTML(c.authorName)}</strong>
                                <p>${escapeHTML(c.content)}</p>
                                <small>${timeAgo(c.createdAt)}</small>
                            </div>
                            ${currentUser && String(c.authorId) === String(currentUser._id) ? `
                                <button class="delete-comment" data-delete-comment="${c._id}" type="button">×</button>
                            ` : ""}
                        </div>
                    `).join("")}

                    <form class="comment-form" data-post-id="${post._id}">
                        <span class="avatar tiny">${escapeHTML(initials(currentUser?.name))}</span>
                        <input type="text" maxlength="1000" placeholder="Write a comment..." required>
                        <button type="submit">Post</button>
                    </form>
                </div>
            </article>
        `;
    }).join("");

    /* Delete Post Handlers */
    container.querySelectorAll("[data-delete-post]").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Delete this post?")) return;
            try {
                await api(`/api/posts/${btn.dataset.deletePost}`, { method: "DELETE" });
                toast("Post deleted.");
                await loadPosts();
            } catch (e) {
                toast(e.message);
            }
        };
    });

    /* Delete Comment Handlers */
    container.querySelectorAll("[data-delete-comment]").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Delete this comment?")) return;
            try {
                await api(`/api/comments/${btn.dataset.deleteComment}`, { method: "DELETE" });
                toast("Comment deleted.");
                await loadPosts();
            } catch (e) {
                toast(e.message);
            }
        };
    });

    /* Comment Form Submissions */
    container.querySelectorAll(".comment-form").forEach(form => {
        form.onsubmit = async e => {
            e.preventDefault();
            const input = form.querySelector("input");
            const content = input.value.trim();
            if (!content) return;

            try {
                await api(`/api/posts/${form.dataset.postId}/comments`, {
                    method: "POST",
                    body: JSON.stringify({ content })
                });
                input.value = "";
                await loadPosts();
            } catch (err) {
                toast(err.message);
            }
        };
    });
}


/* ================================================= */
/* LOAD POSTS */
/* ================================================= */

async function loadPosts(search = "") {
    const loading = document.getElementById("loading");
    try {
        if (loading) {
            loading.style.display = "block";
            loading.textContent = "Loading posts...";
        }

        const data = await api(`/api/posts?search=${encodeURIComponent(search)}`);
        posts = data.posts || [];
        renderPosts(posts);
    } catch (e) {
        if (loading) {
            loading.style.display = "block";
            loading.textContent = e.message;
        }
    }
}


/* ================================================= */
/* USER PROFILE MODAL */
/* ================================================= */

async function openUserProfile(userId, userName) {
    const modal = document.getElementById("profileModal");
    const nameElement = document.getElementById("viewProfileName");
    const emailElement = document.getElementById("viewProfileEmail");
    const avatarElement = document.getElementById("viewProfileAvatar");
    const postsElement = document.getElementById("userPosts");

    if (!modal || !nameElement || !postsElement) return;

    nameElement.textContent = userName;
    avatarElement.textContent = initials(userName);

    if (currentUser && String(userId) === String(currentUser._id)) {
        emailElement.textContent = currentUser.email;
    } else {
        emailElement.textContent = "Community member";
    }

    modal.classList.remove("hidden");
    postsElement.innerHTML = `<p class="muted">Loading posts...</p>`;

    try {
        const data = await api(`/api/users/${userId}/posts`);
        const userPosts = data.posts || [];

        if (!userPosts.length) {
            postsElement.innerHTML = `
                <div class="empty">
                    <div class="empty-icon">◎</div>
                    <h3>No posts yet</h3>
                    <p class="muted">${escapeHTML(userName)} has not published any posts.</p>
                </div>
            `;
            return;
        }

        postsElement.innerHTML = userPosts.map(post => `
            <article class="profile-post">
                <div class="profile-post-date">${timeAgo(post.createdAt)}</div>
                ${post.category ? `<div class="profile-post-category">${escapeHTML(post.category)}</div>` : ""}
                <div class="profile-post-content">${escapeHTML(post.content).replace(/\n/g, "<br>")}</div>
                ${post.image ? `<div class="profile-post-image"><img src="${escapeHTML(post.image)}" alt="Complaint picture" loading="lazy"></div>` : ""}
                <div class="profile-post-comments">${post.comments?.length || 0} comment${(post.comments?.length || 0) === 1 ? "" : "s"}</div>
            </article>
        `).join("");
    } catch (error) {
        postsElement.innerHTML = `<p class="form-message error">${escapeHTML(error.message)}</p>`;
    }
}


/* ================================================= */
/* IMAGE COMPRESSION */
/* ================================================= */

async function compressImage(file) {
    if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Image must be smaller than 8MB.");

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;

    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });

    const maxSize = 1200;
    let width = image.width;
    let height = image.height;

    if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(objectUrl);

    let quality = 0.8;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);

    while (dataUrl.length > 1200000 && quality > 0.4) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    if (dataUrl.length > 1200000) {
        throw new Error("The picture is still too large. Please choose a smaller image.");
    }

    return dataUrl;
}


/* ================================================= */
/* DOM LOADED */
/* ================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    /* Modal Helpers */
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove("hidden");
    };

    const closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add("hidden");
    };

    /* Change Password Buttons */
    const passwordBtn = document.getElementById("passwordBtn") || document.getElementById("changePasswordBtn");
    if (passwordBtn) {
        passwordBtn.addEventListener("click", (e) => {
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

    /* Change Password Form Submission */
    const passwordForm = document.getElementById("passwordForm") || document.getElementById("changePasswordForm");
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById("currentPassword")?.value.trim();
            const newPassword = document.getElementById("newPassword")?.value.trim();
            const confirmPassword = document.getElementById("confirmPassword")?.