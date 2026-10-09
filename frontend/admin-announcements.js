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
        headers.Authorization = `Bearer ${currentToken}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}


async function deleteComment(commentId) {
    if (!confirm("Are you sure you want to delete this comment?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/comments/${commentId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("barangay_token")}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to delete comment.");
        }

        alert("Comment deleted successfully.");

        // Reload the announcements and comments.
        await loadAnnouncements();

    } catch (error) {
        alert(error.message || "Something went wrong.");
    }
}


function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}


function initials(name) {
    return (name || "A")
        .split(" ")
        .map(word => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}


function timeAgo(date) {
    const seconds = Math.floor(
        (Date.now() - new Date(date).getTime()) / 1000
    );

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
}


function toast(message) {
    const element = document.getElementById("toast");

    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    setTimeout(() => {
        element.classList.remove("show");
    }, 2500);
}


/* =====================================================
   LOAD ANNOUNCEMENTS
   ===================================================== */

async function loadAnnouncements(search = "") {

    const list = document.getElementById("announcementList");

    if (!list) return;

    list.innerHTML = `
        <div class="loading">
            Loading announcements...
        </div>
    `;

    try {

        const data = await api(
            `/api/posts${search
                ? `?search=${encodeURIComponent(search)}`
                : ""
            }`
        );

        // Get all posts
        let announcements = data.posts || [];

        // Only show announcements
        announcements = announcements.filter(post =>
            post.type === "announcement" ||
            post.isAnnouncement === true
        );

        renderAnnouncements(announcements);

    } catch (error) {

        console.error("Load announcements error:", error);

        list.innerHTML = `
            <div class="loading">
                Failed to load announcements.
            </div>
        `;

        toast(error.message);
    }
}


/* =====================================================
   RENDER
   ===================================================== */

function renderAnnouncements(announcements) {

    const list = document.getElementById("announcementList");

    if (!list) return;

    if (!announcements.length) {

        list.innerHTML = `
            <div class="loading">
                No announcements found.
            </div>
        `;

        return;
    }

    list.innerHTML = announcements.map(post => {

        const author =
            post.authorName || "Administrator";

        const image = post.image
            ? `
                <img
                    src="${escapeHTML(post.image)}"
                    class="announcement-image"
                    alt="Announcement image"
                >
              `
            : "";

        const comments =
            post.comments || [];

        return `
            <article
                class="announcement-card"
                data-id="${post._id}"
            >

                <div class="announcement-card-header">

                    <div class="announcement-author">

                        <span class="avatar">
                            ${escapeHTML(initials(author))}
                        </span>

                        <div>
                            <strong>
                                ${escapeHTML(author)}
                            </strong>

                            <small>
                                ${timeAgo(post.createdAt)}
                            </small>
                        </div>

                    </div>

                </div>


                <div class="announcement-content">
                    ${escapeHTML(post.content)}
                </div>

                ${image}


                <div class="announcement-actions">

                    <button
                        class="edit-announcement"
                        onclick="editAnnouncement('${post._id}')">
                        Edit
                    </button>

                    <button
                        class="delete-announcement"
                        onclick="deleteAnnouncement('${post._id}')">
                        Delete
                    </button>

                </div>



<div class="comments-section">

    <h4>
        Comments (${comments.length})
    </h4>

    ${comments.map(comment => `
            <div class="comment-item">

                <span class="avatar">
                    ${escapeHTML(initials(comment.authorName))}
                </span>

                <div class="comment-body">

                    <strong>
                        ${escapeHTML(comment.authorName || "User")}
                    </strong>

                    <p>
                        ${escapeHTML(comment.content)}
                    </p>

                    <button
                        type="button"
                        class="delete-comment-btn"
                        onclick="deleteComment('${comment._id}')">
                        Delete Comment
                    </button>

                </div>

            </div>
        `).join("")
    }

</div>

            </article>
        `;

    }).join("");
}


/* =====================================================
   ADD ANNOUNCEMENT
   ===================================================== */

function openAddAnnouncement() {

    document.getElementById(
        "announcementModalTitle"
    ).textContent = "Add Announcement";

    document.getElementById(
        "announcementId"
    ).value = "";

    document.getElementById(
        "announcementContent"
    ).value = "";

    document.getElementById(
        "announcementImage"
    ).value = "";

    document.getElementById(
        "announcementModal"
    ).classList.remove("hidden");
}


/* =====================================================
   EDIT ANNOUNCEMENT
   ===================================================== */

async function editAnnouncement(id) {

    try {

        const data = await api("/api/posts");

        const post = (data.posts || []).find(
            item => item._id === id
        );

        if (!post) {
            toast("Announcement not found.");
            return;
        }

        document.getElementById(
            "announcementModalTitle"
        ).textContent = "Edit Announcement";

        document.getElementById(
            "announcementId"
        ).value = post._id;

        document.getElementById(
            "announcementContent"
        ).value = post.content || "";

        document.getElementById(
            "announcementImage"
        ).value = post.image || "";

        document.getElementById(
            "announcementModal"
        ).classList.remove("hidden");

    } catch (error) {

        toast(error.message);

    }
}

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-comment-btn");

    if (!button) return;

    if (!confirm("Are you sure you want to delete this comment?")) {
        return;
    }

    try {
        button.disabled = true;

        const commentId = button.dataset.commentId;

        await api(`/api/comments/${commentId}`, {
            method: "DELETE"
        });

        // Refresh the comments displayed on the dashboard
        await loadPosts();

        alert("Comment deleted successfully.");

    } catch (error) {
        button.disabled = false;
        alert(error.message || "Failed to delete comment.");
    }
});

/* =====================================================
   DELETE ANNOUNCEMENT
   ===================================================== */

async function deleteAnnouncement(id) {

    if (!confirm(
        "Are you sure you want to delete this announcement?"
    )) {
        return;
    }

    try {

        await api(`/api/posts/${id}`, {
            method: "DELETE"
        });

        toast("Announcement deleted.");

        loadAnnouncements();

    } catch (error) {

        toast(error.message);

    }
}


/* =====================================================
   SAVE ANNOUNCEMENT
   ===================================================== */

async function saveAnnouncement(event) {

    event.preventDefault();

    const id =
        document.getElementById("announcementId").value;

    const content =
        document.getElementById("announcementContent").value.trim();

    const image =
        document.getElementById("announcementImage").value.trim();

    if (!content) {
        toast("Announcement content is required.");
        return;
    }

    try {

        if (id) {

            await api(`/api/posts/${id}`, {
                method: "PUT",
                body: JSON.stringify({
                    content,
                    image
                })
            });

            toast("Announcement updated.");

        } else {

            await api("/api/posts", {
                method: "POST",
                body: JSON.stringify({
                    content,
                    image,
                    type: "announcement",
                    isAnnouncement: true
                })
            });

            toast("Announcement created.");
        }

        closeAnnouncementModal();

        loadAnnouncements();

    } catch (error) {

        toast(error.message);
    }
}


/* =====================================================
   MODAL
   ===================================================== */

function closeAnnouncementModal() {

    const modal =
        document.getElementById("announcementModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


/* =====================================================
   PASSWORD MODAL
   ===================================================== */

function openPasswordModal() {

    const modal =
        document.getElementById("passwordModal");

    if (modal) {
        modal.classList.remove("hidden");
    }
}


function closePasswordModal() {

    const modal =
        document.getElementById("passwordModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


/* =====================================================
   CHANGE PASSWORD
   ===================================================== */

async function changePassword(event) {

    event.preventDefault();

    const currentPassword =
        document.getElementById("currentPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {

        toast("New passwords do not match.");
        return;
    }

    try {

        await api("/api/auth/change-password", {
            method: "POST",
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        toast("Password changed successfully.");

        document.getElementById(
            "passwordForm"
        ).reset();

        closePasswordModal();

    } catch (error) {

        toast(error.message);
    }
}


/* =====================================================
   LOGOUT
   ===================================================== */

function logout() {

    localStorage.removeItem("barangay_token");
    localStorage.removeItem("barangay_role");

    window.location.href = "resident-login.html";
}


/* =====================================================
   ADMIN AUTH CHECK
   ===================================================== */

async function checkAdmin() {

    if (!token()) {

        window.location.href = "admin-login.html";
        return false;
    }

    try {

        const me = await api("/api/auth/me");

        if (me.role !== "admin") {

            window.location.href = "dashboard.html";
            return false;
        }

        const adminName =
            me.account?.username ||
            me.user?.username ||
            "Admin";

        const topName =
            document.getElementById("topName");

        const topAvatar =
            document.getElementById("topAvatar");

        if (topName) {
            topName.textContent = adminName;
        }

        if (topAvatar) {
            topAvatar.textContent =
                initials(adminName);
        }

        return true;

    } catch (error) {

        console.error(error);

        localStorage.removeItem("barangay_token");
        localStorage.removeItem("barangay_role");

        window.location.href = "admin-login.html";

        return false;
    }
}


/* =====================================================
   START
   ===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const isAdmin = await checkAdmin();

        if (!isAdmin) return;


        /* ADD */

        const addButton =
            document.getElementById(
                "addAnnouncementBtn"
            );

        if (addButton) {
            addButton.addEventListener(
                "click",
                openAddAnnouncement
            );
        }


        /* SEARCH */

        const searchInput =
            document.getElementById(
                "announcementSearch"
            );

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                () => {
                    loadAnnouncements(
                        searchInput.value.trim()
                    );
                }
            );
        }


        /* FORM */

        const form =
            document.getElementById(
                "announcementForm"
            );

        if (form) {
            form.addEventListener(
                "submit",
                saveAnnouncement
            );
        }


        /* CLOSE ANNOUNCEMENT */

        const closeAnnouncementBtn =
            document.getElementById("closeAnnouncementModal");

        if (closeAnnouncementBtn) {
            closeAnnouncementBtn.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    closeAnnouncementModal();
                }
            );
        }


        /* PASSWORD */

        document
            .getElementById("passwordBtn")
            ?.addEventListener(
                "click",
                openPasswordModal
            );


        document
            .getElementById("closePasswordModal")
            ?.addEventListener(
                "click",
                closePasswordModal
            );


        const passwordForm =
            document.getElementById(
                "passwordForm"
            );

        if (passwordForm) {

            passwordForm.addEventListener(
                "submit",
                changePassword
            );
        }


        /* LOGOUT */

        document
            .getElementById("logoutBtn")
            ?.addEventListener(
                "click",
                logout
            );


        /* INITIAL LOAD */

        loadAnnouncements();

    }
);