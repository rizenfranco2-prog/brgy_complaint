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

    const res = await fetch(
        `${API_URL}${path}`,
        {
            ...options,
            headers
        }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(
            data.message || "Request failed."
        );
    }

    return data;
}


function escapeHTML(value) {
    return String(value).replace(
        /[&<>"']/g,
        ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[ch])
    );
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
        (
            Date.now() -
            new Date(date).getTime()
        ) / 1000
    );

    if (seconds < 60) {
        return "Just now";
    }

    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m`;
    }

    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)}h`;
    }

    if (seconds < 604800) {
        return `${Math.floor(seconds / 86400)}d`;
    }

    return new Date(date).toLocaleDateString();
}


function toast(message) {

    const element =
        document.getElementById("toast");

    if (!element) {
        return;
    }

    element.textContent = message;

    element.classList.add("show");

    setTimeout(() => {
        element.classList.remove("show");
    }, 2500);
}


/* ================================================= */
/* RENDER ANNOUNCEMENTS */
/* ================================================= */

function renderAnnouncements(announcements) {

    const container =
        document.getElementById("announcementList");

    const loading =
        document.getElementById("announcementLoading");

    if (loading) {
        loading.style.display = "none";
    }

    if (!container) {
        return;
    }

    if (!announcements.length) {

        container.innerHTML = `
            <div class="empty card">

                <div class="empty-icon">
                    📢
                </div>

                <h3>
                    No announcements
                </h3>

                <p>
                    There are no barangay announcements at this time.
                </p>

            </div>
        `;

        return;
    }


    const isAdmin =
        localStorage.getItem("barangay_role") === "admin";


    container.innerHTML =
        announcements.map(post => {

            const comments =
                post.comments || [];

            return `
                <article class="post card">

                    <div class="post-head">

                        <div class="clickable-profile">

                            <span class="avatar">
                                ${escapeHTML(
                initials(post.authorName)
            )}
                            </span>

                            <div class="post-author">

                                <strong>
                                    ${escapeHTML(
                post.authorName
            )}
                                </strong>

                                <small>
                                    ${timeAgo(
                post.createdAt
            )}
                                </small>

                            </div>

                        </div>

                    </div>


                    <div class="post-content">
                        ${escapeHTML(
                post.content
            ).replace(
                /\n/g,
                "<br>"
            )}
                    </div>


                    ${post.image
                    ? `
                                <div class="post-image-container">

                                    <img
                                        src="${escapeHTML(
                        post.image
                    )}"
                                        class="post-image"
                                        alt="Barangay announcement picture"
                                        loading="lazy"
                                    >

                                </div>
                            `
                    : ""
                }


                    <div class="post-meta">

    <span>
        ${comments.length}
        comment${comments.length === 1 ? "" : "s"}
    </span>

    ${isAdmin
                    ? `
            <div class="announcement-actions">

                <button
                    class="secondary-btn"
                    data-edit-announcement="${post._id}"
                >
                    Edit
                </button>

                <button
                    class="danger-btn"
                    data-delete-announcement="${post._id}"
                >
                    Delete
                </button>

            </div>
          `
                    : ""
                }

</div>


<div class="comments">

    ${comments.map(comment => `
        <div class="comment">

            <span class="avatar tiny">
                ${escapeHTML(
                    initials(comment.authorName)
                )}
            </span>

            <div class="comment-body">

                <strong>
                    ${escapeHTML(comment.authorName)}
                </strong>

                <p>
                    ${escapeHTML(comment.content)}
                </p>

                <small>
                    ${timeAgo(comment.createdAt)}
                </small>

            </div>

            ${!isAdmin
                        ? `
                    <button
                        class="delete-comment"
                        data-delete-comment="${comment._id}"
                    >
                        ×
                    </button>
                  `
                        : ""
                    }

        </div>
    `).join("")}


    ${!isAdmin
                    ? `
            <form
                class="comment-form"
                data-post-id="${post._id}"
            >

                <span class="avatar tiny">
                    U
                </span>

                <input
                    type="text"
                    maxlength="1000"
                    placeholder="Write a comment..."
                    required
                >

                <button type="submit">
                    Post
                </button>

            </form>
          `
                    : ""
    }

</div>

                </article>
            `;

        }).join("");


    /* ================================================= */
    /* ADMIN EDIT */
    /* ================================================= */

    if (isAdmin) {

        container
            .querySelectorAll(
                "[data-edit-announcement]"
            )
            .forEach(button => {

                button.onclick = async () => {

                    const post =
                        announcements.find(
                            item =>
                                item._id ===
                                button.dataset.editAnnouncement
                        );

                    if (!post) {
                        return;
                    }


                    const newContent =
                        prompt(
                            "Edit announcement:",
                            post.content
                        );


                    if (
                        newContent === null ||
                        !newContent.trim()
                    ) {
                        return;
                    }


                    try {

                        await api(
                            `/api/posts/${post._id}`,
                            {
                                method: "PUT",

                                body: JSON.stringify({
                                    content:
                                        newContent.trim()
                                })
                            }
                        );


                        toast(
                            "Announcement updated."
                        );

                        loadAnnouncements();


                    } catch (error) {

                        toast(
                            error.message
                        );

                    }

                };

            });


        /* ================================================= */
        /* DELETE COMMENT */
        /* ================================================= */

        container
            .querySelectorAll(
                "[data-delete-comment]"
            )
            .forEach(button => {

                button.onclick = async () => {

                    if (!confirm("Delete this comment?")) {
                        return;
                    }

                    try {

                        await api(
                            `/api/comments/${button.dataset.deleteComment}`,
                            {
                                method: "DELETE"
                            }
                        );

                        toast("Comment deleted.");

                        loadAnnouncements();

                    } catch (error) {

                        toast(error.message);

                    }

                };

            });


        /* ================================================= */
        /* ADD COMMENT */
        /* ================================================= */

        if (!isAdmin) {

            container
                .querySelectorAll(".comment-form")
                .forEach(form => {

                    form.onsubmit = async event => {

                        event.preventDefault();

                        const input =
                            form.querySelector("input");

                        if (!input || !input.value.trim()) {
                            return;
                        }

                        try {

                            await api(
                                `/api/posts/${form.dataset.postId}/comments`,
                                {
                                    method: "POST",

                                    body: JSON.stringify({
                                        content:
                                            input.value.trim()
                                    })
                                }
                            );

                            toast("Comment added.");

                            loadAnnouncements();

                        } catch (error) {

                            toast(error.message);

                        }

                    };

                });

        }

    }

}


/* ================================================= */
/* LOAD ANNOUNCEMENTS */
/* ================================================= */

async function loadAnnouncements() {

    const loading =
        document.getElementById(
            "announcementLoading"
        );

    try {

        const announcements =
            await api(
                "/api/announcements"
            );
        const currentName =
            document.getElementById("profileName")?.textContent || "User";

        renderAnnouncements(
            announcements
        );

    } catch (error) {

        console.error(
            "Announcement error:",
            error
        );

        if (loading) {
            loading.textContent =
                error.message;
        }

    }
}


/* ================================================= */
/* PAGE LOAD */
/* ================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (!token()) {

            location.href =
                "index.html";

            return;
        }

        try {

            const me =
                await api(
                    "/api/auth/me"
                );
            if (me.role === "admin") {

                /* =============================== */
                /* ADMIN TOP BAR */
                /* =============================== */

                const brand =
                    document.querySelector(".top-brand");

                if (brand) {
                    brand.href = "admin-dashboard.html";
                    brand.innerHTML = `
            <span>BC</span>
            Admin Console
        `;
                }


                /* =============================== */
                /* ADMIN PROFILE */
                /* =============================== */

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

                const adminName =
                    me.account.username;

                if (topName) {
                    topName.textContent = adminName;
                }

                if (profileName) {
                    profileName.textContent = adminName;
                }

                if (profileEmail) {
                    profileEmail.textContent =
                        "System administrator";
                }

                if (topAvatar) {
                    topAvatar.textContent =
                        initials(adminName);
                }

                if (profileAvatar) {
                    profileAvatar.textContent =
                        initials(adminName);
                }


                /* =============================== */
                /* ADMIN SIDEBAR */
                /* =============================== */

                const nav =
                    document.querySelector(".sidebar nav");

                if (nav) {

                    nav.innerHTML = `

            <a class="nav-item"
               href="admin-dashboard.html">
                ▦
                <span>Posts</span>
            </a>

            <button class="nav-item"
                    id="adminPasswordBtn">
                ⚿
                <span>Change Password</span>
            </button>

            <a class="nav-item active"
               href="announcements.html">
                📢
                <span>Announcements</span>
            </a>

            <a class="nav-item"
               href="dashboard.html">
                👥
                <span>User Feed</span>
            </a>

        `;
                }


                /* =============================== */
                /* ADD ANNOUNCEMENT */
                /* =============================== */

                const controls =
                    document.getElementById(
                        "adminAnnouncementControls"
                    );

                if (controls) {

                    const addButton =
                        document.createElement("button");

                    addButton.textContent =
                        "＋ Add Announcement";

                    addButton.className =
                        "primary-btn";

                    addButton.style.marginTop =
                        "10px";

                    controls.appendChild(addButton);


                    addButton.onclick = async () => {

                        const content =
                            prompt(
                                "Enter announcement:"
                            );

                        if (
                            content === null ||
                            !content.trim()
                        ) {
                            return;
                        }

                        try {

                            await api(
                                "/api/posts",
                                {
                                    method: "POST",

                                    body: JSON.stringify({
                                        content:
                                            content.trim()
                                    })
                                }
                            );

                            toast(
                                "Announcement published."
                            );

                            loadAnnouncements();

                        } catch (error) {

                            toast(
                                error.message
                            );

                        }
                    };
                }

            }


            /* ========================================= */
            /* ALLOW BOTH ROLES */
            /* ========================================= */

            if (
                me.role !== "user" &&
                me.role !== "admin"
            ) {

                location.href =
                    "index.html";

                return;
            }


            /* ========================================= */
            /* RESIDENT INFORMATION */
            /* ========================================= */

            if (me.role === "user") {

                const user =
                    me.account;

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
                        user.name;
                }


                if (profileName) {
                    profileName.textContent =
                        user.name;
                }


                if (profileEmail) {
                    profileEmail.textContent =
                        user.email;
                }


                const userInitials =
                    initials(user.name);


                if (topAvatar) {
                    topAvatar.textContent =
                        userInitials;
                }


                if (profileAvatar) {
                    profileAvatar.textContent =
                        userInitials;
                }

            }


            /* ========================================= */
            /* LOAD ANNOUNCEMENTS */
            /* ========================================= */

            await loadAnnouncements();


        } catch (error) {

            console.error(
                "Page load error:",
                error
            );

            localStorage.removeItem(
                "barangay_token"
            );

            location.href =
                "index.html";

            return;
        }


        /* ================================================= */
        /* LOGOUT */
        /* ================================================= */

        const logoutBtn =
            document.getElementById(
                "logoutBtn"
            );

        if (logoutBtn) {

            logoutBtn.onclick = () => {

                localStorage.clear();

                location.href =
                    "index.html";

            };

        }


        /* ================================================= */
        /* CHANGE PASSWORD BUTTON */
        /* ================================================= */

        const passwordBtn =
            document.getElementById(
                "passwordBtn"
            );

        if (passwordBtn) {

            passwordBtn.onclick = () => {

                const passwordModal =
                    document.getElementById(
                        "passwordModal"
                    );

                if (passwordModal) {

                    passwordModal.classList.remove(
                        "hidden"
                    );

                }

            };

        }


        /* ================================================= */
        /* CLOSE MODALS */
        /* ================================================= */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(button => {

                button.onclick = () => {

                    const modal =
                        document.getElementById(
                            button.dataset.close
                        );

                    if (modal) {

                        modal.classList.add(
                            "hidden"
                        );

                    }

                };

            });


        /* ================================================= */
        /* CHANGE PASSWORD */
        /* ================================================= */

        const passwordForm =
            document.getElementById(
                "passwordForm"
            );

        if (passwordForm) {

            passwordForm.onsubmit =
                async event => {

                    event.preventDefault();


                    const currentPassword =
                        document.getElementById(
                            "currentPassword"
                        );

                    const newPassword =
                        document.getElementById(
                            "newPassword"
                        );

                    const confirmPassword =
                        document.getElementById(
                            "confirmPassword"
                        );

                    const message =
                        document.getElementById(
                            "passwordMessage"
                        );


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

    }
);