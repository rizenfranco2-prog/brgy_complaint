/* ================================================= */
/* GLOBAL VARIABLES & STATE */
/* ================================================= */
let feedPosts = [];
let currentUser = null;
let currentBase64Image = null;

/* Helper to retrieve JWT token from LocalStorage */
function getToken() {
    return localStorage.getItem("barangay_token");
}

/* Centralized API Helper */
async function apiCall(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getToken();
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

/* Sanitize user input to prevent XSS attacks */
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[ch]));
}

/* Extract 1-2 initials from a full name */
function initials(name) {
    return String(name || "U")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}

/* Relative time formatter */
function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (isNaN(seconds) || seconds < 0) return "Just now";
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
}

/* Popup toast notifications */
function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => {
        el.classList.remove("show");
    }, 3000);
}

/* Close generic modals */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
    }
}

/* Open generic modals */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
    }
}

/* ================================================= */
/* USER PROFILE & DATA POPULATION */
/* ================================================= */

function populateUserInfo(user) {
    const nameStr = user.name || "Resident User";
    const emailStr = user.email || "";
    const userInitials = initials(nameStr);

    /* Update Topbar */
    const topAvatar = document.getElementById("topAvatar");
    const topName = document.getElementById("topName");
    if (topAvatar) topAvatar.textContent = userInitials;
    if (topName) topName.textContent = nameStr;

    /* Update Sidebar */
    const profileAvatar = document.getElementById("profileAvatar");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    if (profileAvatar) profileAvatar.textContent = userInitials;
    if (profileName) profileName.textContent = nameStr;
    if (profileEmail) profileEmail.textContent = emailStr;

    /* Update Composer */
    const composerAvatar = document.getElementById("composerAvatar");
    const composerName = document.getElementById("composerName");
    if (composerAvatar) composerAvatar.textContent = userInitials;
    if (composerName) composerName.textContent = nameStr;
}

/* ================================================= */
/* FEED & POST RENDERING */
/* ================================================= */

async function loadFeed(search = "") {
    const loadingEl = document.getElementById("loading");
    const feedList = document.getElementById("feedList");

    try {
        if (loadingEl) loadingEl.style.display = "block";

        const data = await apiCall(`/api/posts?search=${encodeURIComponent(search)}`);
        feedPosts = data.posts || [];

        renderFeed(feedPosts);
    } catch (err) {
        if (loadingEl) loadingEl.textContent = `Error loading posts: ${err.message}`;
        toast(err.message);
    } finally {
        if (loadingEl && feedPosts.length >= 0) {
            loadingEl.style.display = "none";
        }
    }
}

function renderFeed(posts) {
    const container = document.getElementById("feedList");
    if (!container) return;

    if (!posts.length) {
        container.innerHTML = `
            <div class="empty card" style="padding: 2rem; text-align: center;">
                <h3>No posts available</h3>
                <p class="muted">Be the first to share a concern or complaint with the barangay.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => {
        const comments = post.comments || [];
        const statusClass = (post.status || "Pending").toLowerCase();

        return `
            <article class="post-card card" data-id="${post._id}">
                <div class="post-header" style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem;">
                    <span class="avatar profile-click" data-user-id="${post.authorId}" style="cursor: pointer;">
                        ${escapeHTML(initials(post.authorName))}
                    </span>
                    <div style="flex: 1;">
                        <strong class="profile-click" data-user-id="${post.authorId}" style="cursor: pointer; display: block;">
                            ${escapeHTML(post.authorName || "Anonymous")}
                        </strong>
                        <small class="muted">${timeAgo(post.createdAt)}</small>
                    </div>
                    <span class="status-badge ${statusClass}">
                        ${escapeHTML(post.status || "Pending")}
                    </span>
                </div>

                <div class="post-details" style="font-size: 0.85rem; margin-bottom: 0.5rem;" class="muted">
                    ${post.category ? `<span><strong>Category:</strong> ${escapeHTML(post.category)}</span>` : ""}
                    ${post.address ? ` • <span><strong>Address:</strong> ${escapeHTML(post.address)}</span>` : ""}
                </div>

                <div class="post-body" style="margin-bottom: 0.75rem; white-space: pre-line;">
                    ${escapeHTML(post.content)}
                </div>

                ${post.image ? `
                    <div class="post-media" style="margin-bottom: 0.75rem;">
                        <img src="${escapeHTML(post.image)}" style="max-width: 100%; border-radius: 8px;" alt="Attached Media">
                    </div>
                ` : ""}

                <hr style="opacity: 0.1; margin: 0.75rem 0;">

                <!-- Comments Section -->
                <div class="comments-section">
                    <div class="comments-list" id="comments-${post._id}">
                        ${comments.map(c => `
                            <div class="comment-item" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.9rem;">
                                <strong>${escapeHTML(c.authorName)}:</strong>
                                <span>${escapeHTML(c.text)}</span>
                                <small class="muted" style="margin-left: auto;">${timeAgo(c.createdAt)}</small>
                            </div>
                        `).join("")}
                    </div>

                    <form class="comment-form" data-post-id="${post._id}" style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <input type="text" class="comment-input" placeholder="Write a comment..." required style="flex: 1;">
                        <button type="submit" class="secondary-btn small">Send</button>
                    </form>
                </div>
            </article>
        `;
    }).join("");

    /* Attach Event Listeners to Dynamically Rendered Elements */

    // View User Profile
    container.querySelectorAll(".profile-click").forEach(el => {
        el.onclick = () => openUserProfileModal(el.dataset.userId);
    });

    // Post Comments
    container.querySelectorAll(".comment-form").forEach(form => {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const postId = form.dataset.postId;
            const input = form.querySelector(".comment-input");
            const text = input.value.trim();

            if (!text) return;

            try {
                const updatedPost = await apiCall(`/api/posts/${postId}/comments`, {
                    method: "POST",
                    body: JSON.stringify({ text })
                });

                input.value = "";
                toast("Comment added!");
                await loadFeed();
            } catch (err) {
                toast(err.message);
            }
        };
    });
}

/* ================================================= */
/* COMPLAINT SUBMISSION */
/* ================================================= */

function setupComposer() {
    const postContent = document.getElementById("postContent");
    const charCount = document.getElementById("charCount");
    const postImageInput = document.getElementById("postImage");
    const imagePreviewContainer = document.getElementById("imagePreviewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const removeImageBtn = document.getElementById("removeImageBtn");
    const postBtn = document.getElementById("postBtn");
    const postMessage = document.getElementById("postMessage");

    /* Live Character Counter */
    if (postContent && charCount) {
        postContent.oninput = () => {
            charCount.textContent = `${postContent.value.length} / 5000`;
        };
    }

    /* Image Upload & Base64 Conversion */
    if (postImageInput) {
        postImageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) { // 5MB limit check
                toast("Image size must be less than 5MB");
                postImageInput.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                currentBase64Image = event.target.result;
                if (imagePreview) imagePreview.src = currentBase64Image;
                if (imagePreviewContainer) imagePreviewContainer.classList.remove("hidden");
            };
            reader.readAsDataURL(file);
        };
    }

    /* Remove Image */
    if (removeImageBtn) {
        removeImageBtn.onclick = () => {
            currentBase64Image = null;
            if (postImageInput) postImageInput.value = "";
            if (imagePreview) imagePreview.src = "";
            if (imagePreviewContainer) imagePreviewContainer.classList.add("hidden");
        };
    }

    /* Submit Complaint */
    if (postBtn) {
        postBtn.onclick = async () => {
            const category = document.getElementById("complaintCategory")?.value;
            const address = document.getElementById("complaintAddress")?.value.trim();
            const age = document.getElementById("complaintAge")?.value;
            const gender = document.getElementById("complaintGender")?.value;
            const contact = document.getElementById("complaintContact")?.value.trim();
            const content = postContent?.value.trim();

            /* Validation */
            if (!category || !address || !age || !gender || !contact || !content) {
                if (postMessage) {
                    postMessage.textContent = "Please fill out all required complaint fields.";
                    postMessage.style.color = "var(--danger, #e74c3c)";
                }
                return;
            }

            const payload = {
                category,
                address,
                age: Number(age),
                gender,
                contact,
                content,
                image: currentBase64Image
            };

            try {
                postBtn.disabled = true;
                if (postMessage) postMessage.textContent = "Submitting complaint...";

                await apiCall("/api/posts", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                /* Reset Form */
                document.getElementById("complaintCategory").value = "";
                document.getElementById("complaintAddress").value = "";
                document.getElementById("complaintAge").value = "";
                document.getElementById("complaintGender").value = "";
                document.getElementById("complaintContact").value = "";
                postContent.value = "";
                if (charCount) charCount.textContent = "0 / 5000";
                if (removeImageBtn) removeImageBtn.click();

                if (postMessage) {
                    postMessage.textContent = "Complaint submitted successfully!";
                    postMessage.style.color = "var(--success, #2ecc71)";
                }

                toast("Complaint posted successfully.");
                await loadFeed();

            } catch (err) {
                if (postMessage) {
                    postMessage.textContent = err.message;
                    postMessage.style.color = "var(--danger, #e74c3c)";
                }
            } finally {
                postBtn.disabled = false;
            }
        };
    }
}

/* ================================================= */
/* USER PROFILE MODAL HANDLER */
/* ================================================= */

async function openUserProfileModal(userId) {
    const modal = document.getElementById("profileModal");
    const avatar = document.getElementById("viewProfileAvatar");
    const nameEl = document.getElementById("viewProfileName");
    const emailEl = document.getElementById("viewProfileEmail");
    const postsContainer = document.getElementById("userPosts");

    if (!modal) return;

    openModal("profileModal");
    if (postsContainer) postsContainer.innerHTML = '<p class="muted">Loading user posts...</p>';

    try {
        const userData = await apiCall(`/api/users/${userId}`);
        const user = userData.user || userData;

        if (avatar) avatar.textContent = initials(user.name);
        if (nameEl) nameEl.textContent = user.name || "User";
        if (emailEl) emailEl.textContent = user.email || "";

        const userPosts = feedPosts.filter(post => post.authorId === userId);

        if (!userPosts.length) {
            if (postsContainer) postsContainer.innerHTML = '<p class="muted">No posts found for this user.</p>';
            return;
        }

        if (postsContainer) {
            postsContainer.innerHTML = userPosts.map(p => `
                <div class="card" style="margin-top: 0.5rem; padding: 0.75rem;">
                    <small class="muted">${timeAgo(p.createdAt)}</small>
                    <p style="margin: 0.25rem 0;">${escapeHTML(p.content)}</p>
                    <small>Status: <strong>${escapeHTML(p.status || "Pending")}</strong></small>
                </div>
            `).join("");
        }

    } catch (err) {
        if (postsContainer) postsContainer.innerHTML = `<p style="color:red;">${escapeHTML(err.message)}</p>`;
    }
}

/* ================================================= */
/* MAIN INITIALIZATION */
/* ================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    /* 1. Validate User Authentication */
    if (!getToken()) {
        window.location.href = "index.html";
        return;
    }

    try {
        const me = await apiCall("/api/auth/me");
        currentUser = me.account || me;
        populateUserInfo(currentUser);
        await loadFeed();
    } catch (err) {
        console.error("Authentication failed:", err);
        localStorage.removeItem("barangay_token");
        localStorage.removeItem("barangay_role");
        window.location.href = "index.html";
        return;
    }

    /* 2. Setup Feed Composer */
    setupComposer();

    /* 3. Header Search Feature (Debounced) */
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        let timeout = null;
        searchInput.oninput = (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                loadFeed(e.target.value.trim());
            }, 300);
        };
    }

    /* 4. Logout Action */
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem("barangay_token");
            localStorage.removeItem("barangay_role");
            window.location.href = "index.html";
        };
    }

    /* 5. Sidebar Profile Click Handler */
    const sidebarProfileBtn = document.getElementById("sidebarProfileBtn");
    if (sidebarProfileBtn && currentUser) {
        sidebarProfileBtn.style.cursor = "pointer";
        sidebarProfileBtn.onclick = () => {
            openUserProfileModal(currentUser._id || currentUser.id);
        };
    }

    /* 6. Password Modal Management */
    const passwordBtn = document.getElementById("passwordBtn");
    const passwordModal = document.getElementById("passwordModal");
    const closePasswordModal = document.getElementById("closePasswordModal");
    const passwordForm = document.getElementById("passwordForm");
    const passwordMessage = document.getElementById("passwordMessage");

    if (passwordBtn && passwordModal) {
        passwordBtn.onclick = () => {
            passwordModal.classList.add("show");
            passwordModal.style.display = "flex";
        };
    }

    if (closePasswordModal && passwordModal) {
        closePasswordModal.onclick = () => {
            passwordModal.classList.remove("show");
            passwordModal.style.display = "none";
            if (passwordMessage) passwordMessage.textContent = "";
        };
    }

    if (passwordForm) {
        passwordForm.onsubmit = async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById("currentPassword")?.value;
            const newPassword = document.getElementById("newPassword")?.value;
            const confirmPassword = document.getElementById("confirmPassword")?.value;

            if (newPassword !== confirmPassword) {
                if (passwordMessage) {
                    passwordMessage.textContent = "New passwords do not match.";
                    passwordMessage.style.color = "var(--danger, #e74c3c)";
                }
                return;
            }

            try {
                await apiCall("/api/auth/change-password", {
                    method: "POST",
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                if (passwordMessage) {
                    passwordMessage.textContent = "Password changed successfully.";
                    passwordMessage.style.color = "var(--success, #2ecc71)";
                }

                passwordForm.reset();
                setTimeout(() => {
                    passwordModal.classList.remove("show");
                    passwordModal.style.display = "none";
                    if (passwordMessage) passwordMessage.textContent = "";
                }, 1500);

            } catch (err) {
                if (passwordMessage) {
                    passwordMessage.textContent = err.message;
                    passwordMessage.style.color = "var(--danger, #e74c3c)";
                }
            }
        };
    }

    /* 7. Modal Dismissal Listener */
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.onclick = () => {
            closeModal(btn.dataset.close);
        };
    });
});