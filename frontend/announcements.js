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


function escapeHTML(value) {

    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}


function initials(name) {

    return (name || "User")
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

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days}d ago`;
    }

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

    const list =
        document.getElementById("announcementList");

    if (!list) return;

    list.innerHTML = `
        <div class="loading">
            Loading announcements...
        </div>
    `;

    try {

        const query = search
            ? `?search=${encodeURIComponent(search)}`
            : "";

        const data = await api(
            `/api/posts${query}`
        );

        // Get all posts
        let announcements = data.posts || [];

        // Only show official announcements
        announcements = announcements.filter(post =>
            post.type === "announcement" ||
            post.isAnnouncement === true
        );

        renderAnnouncements(announcements);

    } catch (error) {

        console.error("Failed to load announcements:", error);

        list.innerHTML = `
            <div class="loading">
                Failed to load announcements.
            </div>
        `;

        toast(error.message);
    }
}


/* =====================================================
   RENDER USER ANNOUNCEMENTS
   ===================================================== */

function renderAnnouncements(announcements) {

    const list =
        document.getElementById("announcementList");

    if (!list) return;

    if (!announcements.length) {

        list.innerHTML = `
            <div class="loading">
                No announcements available.
            </div>
        `;

        return;
    }


    list.innerHTML = announcements.map(post => {

        const author =
            post.authorName || "Administrator";

        const comments =
            post.comments || [];

        const image = post.image
            ? `
                <img
                    src="${escapeHTML(post.image)}"
                    class="announcement-image"
                    alt="Announcement image"
                >
            `
            : "";


        return `
            <article
                class="announcement-card"
                data-id="${post._id}"
            >

                <div class="announcement-card-header">

                    <div class="announcement-author">

                        <span class="avatar">
                            ${escapeHTML(
            initials(author)
        )}
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


                <!-- COMMENTS -->

                <div class="comments-section">

                    <h4>
                        Comments (${comments.length})
                    </h4>

                    <div class="comment-list">

                        ${comments.length
                ? comments.map(comment => `
                                    <div class="comment-item">

                                        <span class="avatar">
                                            ${escapeHTML(
                    initials(
                        comment.authorName
                    )
                )}
                                        </span>

                                        <div class="comment-body">

                                            <strong>
                                                ${escapeHTML(
                    comment.authorName ||
                    "User"
                )}
                                            </strong>

                                            <p>
                                                ${escapeHTML(
                    comment.content
                )}
                                            </p>

                                            ${String(
                    comment.authorId
                ) ===
                        String(
                            getCurrentUserId()
                        )
                        ? `
                                                        <button
                                                            class="delete-comment"
                                                            onclick="deleteComment(
                                                                '${post._id}',
                                                                '${comment._id}'
                                                            )">
                                                            Delete
                                                        </button>
                                                      `
                        : ""
                    }

                                        </div>

                                    </div>
                                `).join("")
                : `
                                    <p class="no-comments">
                                        No comments yet.
                                    </p>
                                  `
            }

                    </div>


                    <!-- ADD COMMENT -->

                    <form
                        class="comment-form"
                        onsubmit="addComment(event, '${post._id}')"
                    >

                        <input
                            type="text"
                            name="comment"
                            placeholder="Write a comment..."
                            required
                        >

                        <button type="submit">
                            Comment
                        </button>

                    </form>

                </div>

            </article>
        `;

    }).join("");
}


/* =====================================================
   CURRENT USER
   ===================================================== */

let currentUser = null;

function getCurrentUserId() {

    return currentUser?._id || null;
}


/* =====================================================
   ADD COMMENT
   ===================================================== */

async function addComment(event, postId) {

    event.preventDefault();

    const form = event.target;

    const input =
        form.querySelector(
            'input[name="comment"]'
        );

    const content =
        input.value.trim();

    if (!content) return;

    try {

        await api(`/api/posts/${postId}/comments`, {
            method: "POST",

            body: JSON.stringify({
                content
            })
        });

        input.value = "";

        toast("Comment added.");

        loadAnnouncements();

    } catch (error) {

        toast(error.message);
    }
}


/* =====================================================
   DELETE OWN COMMENT
   ===================================================== */

async function deleteComment(postId, commentId) {

    if (!confirm(
        "Delete your comment?"
    )) {
        return;
    }

    try {

        await api(
            `/api/posts/${postId}/comments/${commentId}`,
            {
                method: "DELETE"
            }
        );

        toast("Comment deleted.");

        loadAnnouncements();

    } catch (error) {

        toast(error.message);
    }
}


/* =====================================================
   PASSWORD MODAL
   ===================================================== */

function openPasswordModal() {

    document
        .getElementById("passwordModal")
        ?.classList.add("show");
}


function closePasswordModal() {

    document
        .getElementById("passwordModal")
        ?.classList.remove("show");
}


/* =====================================================
   CHANGE PASSWORD
   ===================================================== */

async function changePassword(event) {

    event.preventDefault();

    const currentPassword =
        document.getElementById(
            "currentPassword"
        ).value;

    const newPassword =
        document.getElementById(
            "newPassword"
        ).value;

    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        ).value;


    if (newPassword !== confirmPassword) {

        toast("New passwords do not match.");

        return;
    }


    try {

        await api(
            "/api/auth/change-password",
            {
                method: "POST",

                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            }
        );

        toast(
            "Password changed successfully."
        );

        document
            .getElementById("passwordForm")
            ?.reset();

        closePasswordModal();

    } catch (error) {

        toast(error.message);
    }
}


/* =====================================================
   LOGOUT
   ===================================================== */

function logout() {

    localStorage.removeItem(
        "barangay_token"
    );

    localStorage.removeItem(
        "barangay_role"
    );

    window.location.href =
        "resident-login.html";
}


/* =====================================================
   START USER PAGE
   ===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (!token()) {

            window.location.href =
                "resident-login.html";

            return;
        }


        /* GET CURRENT USER */

        try {

            const me =
                await api("/api/auth/me");

            if (me.role === "admin") {

                window.location.href =
                    "admin-announcements.html";

                return;
            }

            currentUser =
                me.account || me.user || null;


            /* USER PROFILE */

            const userName =
                currentUser?.name ||
                "User";

            const userEmail =
                currentUser?.email ||
                "";


            const topName =
                document.getElementById(
                    "topName"
                );

            const profileName =
                document.getElementById(
                    "profileName"
                );

            const profileEmail =
                document.getElementById(
                    "profileEmail"
                );

            const topAvatar =
                document.getElementById(
                    "topAvatar"
                );

            const profileAvatar =
                document.getElementById(
                    "profileAvatar"
                );


            if (topName) {
                topName.textContent =
                    userName;
            }

            if (profileName) {
                profileName.textContent =
                    userName;
            }

            if (profileEmail) {
                profileEmail.textContent =
                    userEmail;
            }

            if (topAvatar) {
                topAvatar.textContent =
                    initials(userName);
            }

            if (profileAvatar) {
                profileAvatar.textContent =
                    initials(userName);
            }


        } catch (error) {

            console.error(error);

            localStorage.removeItem(
                "barangay_token"
            );

            localStorage.removeItem(
                "barangay_role"
            );

            window.location.href =
                "resident-login.html";

            return;
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


        document
            .getElementById("passwordForm")
            ?.addEventListener(
                "submit",
                changePassword
            );


        /* LOGOUT */

        document
            .getElementById("logoutBtn")
            ?.addEventListener(
                "click",
                logout
            );


        /* LOAD */

        loadAnnouncements();

    }
);