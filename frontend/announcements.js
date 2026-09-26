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
        document.getElementById(
            "announcementList"
        );

    const loading =
        document.getElementById(
            "announcementLoading"
        );

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
                initials(
                    post.authorName
                )
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
                            comment${comments.length === 1
                    ? ""
                    : "s"
                }
                        </span>

                    </div>

                </article>
            `;

        }).join("");
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