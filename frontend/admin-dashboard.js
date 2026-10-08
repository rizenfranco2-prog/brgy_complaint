let adminPosts = [];


/* =========================================================
   TOKEN
========================================================= */

function token() {
    return localStorage.getItem("barangay_token");
}


/* =========================================================
   API HELPER
========================================================= */

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

    let data = {};

    try {
        data = await res.json();
    } catch {
        data = {};
    }

    if (!res.ok) {
        throw new Error(
            data.message || `Request failed (${res.status})`
        );
    }

    return data;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   TIME AGO
========================================================= */

function ago(date) {

    if (!date) return "";

    const now = new Date();
    const then = new Date(date);

    const seconds = Math.floor(
        (now - then) / 1000
    );

    if (seconds < 60) {
        return "just now";
    }

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

    return then.toLocaleDateString();
}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

    const el = document.getElementById("toast");

    if (!el) return;

    el.textContent = message;

    el.classList.add("show");

    setTimeout(() => {
        el.classList.remove("show");
    }, 2500);
}


/* =========================================================
   FORM MESSAGE
========================================================= */

function showMessage(
    elementId,
    message,
    success = false
) {

    const el =
        document.getElementById(elementId);

    if (!el) return;

    el.textContent = message;

    el.className =
        `form-message ${success ? "success" : "error"}`;
}


/* =========================================================
   LOAD ADMIN POSTS
========================================================= */

async function load(search = "") {

    const loading =
        document.getElementById("adminLoading");

    const list =
        document.getElementById("adminPostList");

    try {

        if (loading) {
            loading.style.display = "block";
        }

        const query = search
            ? `?search=${encodeURIComponent(search)}`
            : "";

        const data =
            await api(`/api/posts${query}`);

        adminPosts =
            data.posts || [];

        render(adminPosts);

        updateStatistics();

    } catch (err) {

        console.error(
            "LOAD ADMIN POSTS ERROR:",
            err
        );

        if (list) {

            list.innerHTML = `
                <div class="empty-state">
                    Could not load posts.
                    <br>
                    <small>
                        ${esc(err.message)}
                    </small>
                </div>
            `;

        }

    } finally {

        if (loading) {
            loading.style.display = "none";
        }

    }
}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const statPosts =
        document.getElementById("statPosts");

    const statComments =
        document.getElementById("statComments");

    const statAdminPosts =
        document.getElementById("statAdminPosts");


    const totalComments =
        adminPosts.reduce(
            (total, post) =>
                total +
                (post.comments?.length || 0),
            0
        );


    const totalAdminPosts =
        adminPosts.filter(
            post =>
                post.type === "announcement" ||
                post.isAnnouncement === true
        ).length;


    if (statPosts) {
        statPosts.textContent =
            adminPosts.length;
    }

    if (statComments) {
        statComments.textContent =
            totalComments;
    }

    if (statAdminPosts) {
        statAdminPosts.textContent =
            totalAdminPosts;
    }
}


/* =========================================================
   RENDER POSTS
========================================================= */

function render(list = adminPosts) {

    const box =
        document.getElementById(
            "adminPostList"
        );

    if (!box) return;


    if (!list.length) {

        box.innerHTML = `
            <div class="empty-state">
                No posts or complaints found.
            </div>
        `;

        return;
    }


    box.innerHTML =
        list.map(post => {

            const comments =
                post.comments || [];


            const isComplaint =
                post.type === "complaint" ||
                post.category ||
                post.address ||
                post.age !== undefined ||
                post.gender ||
                post.contactNumber;


            const status =
                post.status || "Pending";


            const statusClass =
                status
                    .toLowerCase()
                    .replace(/\s+/g, "-");


            const authorName =
                post.authorName ||
                "Unknown User";


            const complaintDetails =
                isComplaint
                    ? `
                <div class="complaint-details">

                    <div class="complaint-detail">
                        <span class="detail-label">
                            Complainant Name
                        </span>

                        <strong>
                            ${esc(
                        post.authorName ||
                        "Unknown User"
                    )}
                        </strong>
                    </div>


                    <div class="complaint-detail">
                        <span class="detail-label">
                            Category
                        </span>

                        <strong>
                            ${esc(
                        post.category ||
                        "Not provided"
                    )}
                        </strong>
                    </div>


                    <div class="complaint-detail">
                        <span class="detail-label">
                            Address
                        </span>

                        <strong>
                            ${esc(
                        post.address ||
                        "Not provided"
                    )}
                        </strong>
                    </div>


                    <div class="complaint-detail">
                        <span class="detail-label">
                            Age
                        </span>

                        <strong>
                            ${post.age !== undefined &&
                        post.age !== null &&
                        post.age !== ""
                        ? esc(post.age)
                        : "Not provided"
                    }
                        </strong>
                    </div>


                    <div class="complaint-detail">
                        <span class="detail-label">
                            Gender
                        </span>

                        <strong>
                            ${esc(
                        post.gender ||
                        "Not provided"
                    )}
                        </strong>
                    </div>


                    <div class="complaint-detail">
                        <span class="detail-label">
                            Contact Number
                        </span>

                        <strong>
                            ${esc(
                        post.contactNumber ||
                        "Not provided"
                    )}
                        </strong>
                    </div>


                    <div class="complaint-detail">

                        <span class="detail-label">
                            Status
                        </span>

                        <div>

                            <span
                                class="status-badge ${statusClass}">
                                ${esc(status)}
                            </span>


                            <select
                                class="complaint-status-select"
                                data-status-id="${post._id}"
                            >

                                <option
                                    value="Pending"
                                    ${status === "Pending"
                        ? "selected"
                        : ""
                    }>
                                    Pending
                                </option>


                                <option
                                    value="In Progress"
                                    ${status === "In Progress"
                        ? "selected"
                        : ""
                    }>
                                    In Progress
                                </option>


                                <option
                                    value="Resolved"
                                    ${status === "Resolved"
                        ? "selected"
                        : ""
                    }>
                                    Resolved
                                </option>

                            </select>

                        </div>

                    </div>

                </div>
            `
                    : "";


            const image =
                post.image
                    ? `
                <img
                    class="admin-post-image"
                    src="${esc(post.image)}"
                    alt="Complaint image"
                >
            `
                    : "";


            const commentsHTML =
                comments.length
                    ? comments.map(comment => `
                        <div class="admin-comment">

                            <strong>
                                ${esc(
                        comment.authorName ||
                        "User"
                    )}
                            </strong>

                            <span>
                                ${esc(
                        comment.content ||
                        ""
                    )}
                            </span>

                            <small class="muted">
                                ${ago(
                        comment.createdAt
                    )}
                            </small>

                        </div>
                    `).join("")
                    : `
                        <p class="muted">
                            No comments yet.
                        </p>
                    `;


            return `
                <article
                    class="admin-row"
                    data-post-id="${post._id}"
                >

                    <div class="admin-row-main">


                        <div class="admin-post-top">

                            <div>

                                <strong>
                                    ${esc(authorName)}
                                </strong>

                                <span class="muted">
                                    • ${ago(
                post.createdAt
            )}
                                </span>

                            </div>

                        </div>


                        ${post.type === "announcement" ||
                    post.isAnnouncement === true

                    ? `
                                    <span class="post-type-badge">
                                        Announcement
                                    </span>
                                `

                    : `
                                    <span class="post-type-badge">
                                        Complaint
                                    </span>
                                `
                }


                        <p class="admin-post-content">
                            ${esc(
                    post.content || ""
                )}
                        </p>


                        ${complaintDetails}


                        ${image}


                        <div class="admin-post-actions">

                            <button
                                class="icon-btn"
                                type="button"
                                data-edit="${post._id}">
                                Edit
                            </button>


                            <button
                                class="icon-btn"
                                type="button"
                                data-delete="${post._id}">
                                Delete
                            </button>

                        </div>


                        <div class="admin-comments">

                            <strong>
                                Comments (${comments.length})
                            </strong>


                            <div class="admin-comment-list">

                                ${commentsHTML}

                            </div>


                            <form
                                class="admin-comment-form"
                                data-comment="${post._id}"
                            >

                                <input
                                    type="text"
                                    placeholder="Write a comment..."
                                    maxlength="1000"
                                    required
                                >


                                <button
                                    class="primary-btn"
                                    type="submit">
                                    Comment
                                </button>

                            </form>

                        </div>

                    </div>

                </article>
            `;

        }).join("");


    attachPostEvents();
}


/* =========================================================
   POST EVENTS
========================================================= */

function attachPostEvents() {


    /* EDIT */

    document
        .querySelectorAll("[data-edit]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.edit;

                    const post =
                        adminPosts.find(
                            item =>
                                item._id === id
                        );

                    if (!post) return;


                    document
                        .getElementById(
                            "editPostId"
                        )
                        .value =
                        post._id;


                    document
                        .getElementById(
                            "adminPostContent"
                        )
                        .value =
                        post.content || "";


                    document
                        .getElementById(
                            "postModalTitle"
                        )
                        .textContent =
                        "Edit post";


                    document
                        .getElementById(
                            "adminPostSubmit"
                        )
                        .textContent =
                        "Update";


                    document
                        .getElementById(
                            "adminPostMessage"
                        )
                        .textContent = "";


                    document
                        .getElementById(
                            "postModal"
                        )
                        .classList
                        .remove("hidden");

                }
            );

        });


    /* DELETE */

    document
        .querySelectorAll("[data-delete]")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.delete;


                    if (
                        !confirm(
                            "Are you sure you want to delete this post?"
                        )
                    ) {
                        return;
                    }


                    try {

                        await api(
                            `/api/posts/${id}`,
                            {
                                method: "DELETE"
                            }
                        );


                        toast(
                            "Post deleted successfully."
                        );


                        load();

                    } catch (err) {

                        console.error(err);

                        toast(
                            err.message ||
                            "Could not delete post."
                        );

                    }

                }
            );

        });


    /* CHANGE STATUS */

    document
        .querySelectorAll(
            ".complaint-status-select"
        )
        .forEach(select => {

            select.addEventListener(
                "change",
                async () => {

                    const id =
                        select.dataset.statusId;

                    const status =
                        select.value;


                    try {

                        await api(
                            `/api/posts/${id}/status`,
                            {
                                method: "PUT",

                                body: JSON.stringify({
                                    status
                                })
                            }
                        );


                        toast(
                            `Complaint changed to ${status}.`
                        );


                        load();

                    } catch (err) {

                        console.error(err);

                        toast(
                            err.message ||
                            "Could not update status."
                        );

                    }

                }
            );

        });


    /* ADD COMMENT */

    document
        .querySelectorAll("[data-comment]")
        .forEach(form => {

            form.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    const postId =
                        form.dataset.comment;

                    const input =
                        form.querySelector("input");

                    const content =
                        input.value.trim();

                    if (!content) return;


                    try {

                        await api(
                            `/api/posts/${postId}/comments`,
                            {
                                method: "POST",

                                body: JSON.stringify({
                                    content
                                })
                            }
                        );


                        input.value = "";

                        toast(
                            "Comment added."
                        );

                        load();

                    } catch (err) {

                        console.error(err);

                        toast(
                            err.message ||
                            "Could not add comment."
                        );

                    }

                }
            );

        });

}


/* =========================================================
   NEW POST MODAL
========================================================= */

function openNewPostModal() {

    const title =
        document.getElementById(
            "postModalTitle"
        );

    const submit =
        document.getElementById(
            "adminPostSubmit"
        );

    const editId =
        document.getElementById(
            "editPostId"
        );

    const content =
        document.getElementById(
            "adminPostContent"
        );

    const message =
        document.getElementById(
            "adminPostMessage"
        );


    if (title) {
        title.textContent =
            "Create post";
    }

    if (submit) {
        submit.textContent =
            "Publish";
    }

    if (editId) {
        editId.value = "";
    }

    if (content) {
        content.value = "";
    }

    if (message) {
        message.textContent = "";
    }


    const modal =
        document.getElementById(
            "postModal"
        );

    if (modal) {
        modal.classList.remove("hidden");
    }
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {
        modal.classList.add("hidden");
    }
}


/* =========================================================
   ADMIN POST FORM
========================================================= */

async function submitAdminPost(event) {

    event.preventDefault();


    const content =
        document
            .getElementById(
                "adminPostContent"
            )
            .value
            .trim();


    const editId =
        document
            .getElementById(
                "editPostId"
            )
            .value
            .trim();


    if (!content) {

        showMessage(
            "adminPostMessage",
            "Post content is required."
        );

        return;
    }


    const submitButton =
        document.getElementById(
            "adminPostSubmit"
        );


    try {

        if (submitButton) {
            submitButton.disabled = true;
        }


        if (editId) {

            await api(
                `/api/posts/${editId}`,
                {
                    method: "PUT",

                    body: JSON.stringify({
                        content
                    })
                }
            );


            toast(
                "Post updated successfully."
            );

        } else {

            await api(
                "/api/posts",
                {
                    method: "POST",

                    body: JSON.stringify({
                        content
                    })
                }
            );


            toast(
                "Announcement published."
            );

        }


        closeModal("postModal");

        load();

    } catch (err) {

        console.error(err);

        showMessage(
            "adminPostMessage",
            err.message ||
            "Could not save post."
        );

    } finally {

        if (submitButton) {
            submitButton.disabled = false;
        }

    }
}


/* =========================================================
   ADMIN CHANGE PASSWORD
========================================================= */

async function submitAdminPassword(event) {

    event.preventDefault();


    const currentPassword =
        document.getElementById(
            "adminCurrentPassword"
        );

    const newPassword =
        document.getElementById(
            "adminNewPassword"
        );

    const confirmPassword =
        document.getElementById(
            "adminConfirmPassword"
        );


    if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
    ) {
        return;
    }


    const current =
        currentPassword.value;

    const newPass =
        newPassword.value;

    const confirm =
        confirmPassword.value;


    if (newPass !== confirm) {

        showMessage(
            "adminPasswordMessage",
            "New passwords do not match."
        );

        return;
    }


    if (newPass.length < 6) {

        showMessage(
            "adminPasswordMessage",
            "Password must be at least 6 characters."
        );

        return;
    }


    try {

        /*
         * IMPORTANT:
         * Backend uses PUT.
         */

        await api(
            "/api/auth/change-password",
            {
                method: "PUT",

                body: JSON.stringify({
                    currentPassword: current,
                    newPassword: newPass
                })
            }
        );


        showMessage(
            "adminPasswordMessage",
            "Password updated successfully.",
            true
        );


        document
            .getElementById(
                "adminPasswordForm"
            )
            .reset();


        toast(
            "Password changed successfully."
        );


    } catch (err) {

        console.error(
            "CHANGE PASSWORD ERROR:",
            err
        );


        showMessage(
            "adminPasswordMessage",
            err.message ||
            "Could not change password."
        );

    }

}


/* =========================================================
   OPEN ADMIN PASSWORD MODAL
========================================================= */

function openAdminPasswordModal() {

    const modal =
        document.getElementById(
            "passwordModal"
        );


    if (!modal) {

        console.error(
            "passwordModal was not found."
        );

        return;
    }


    modal.classList.remove("hidden");

    console.log(
        "Admin password modal opened."
    );
}


/* =========================================================
   ADMIN AUTH CHECK
========================================================= */

async function checkAdmin() {

    const currentToken =
        token();

    const role =
        localStorage.getItem(
            "barangay_role"
        );


    if (
        !currentToken ||
        role !== "admin"
    ) {

        window.location.href =
            "admin-login.html";

        return false;
    }


    try {

        const data =
            await api(
                "/api/auth/me"
            );


        /*
         * Your backend returns:
         *
         * {
         *   role: "admin",
         *   account: {...}
         * }
         */

        const account =
            data.account ||
            data.user ||
            null;


        if (account) {

            const name =
                account.username ||
                account.name ||
                "Administrator";


            const adminName =
                document.getElementById(
                    "adminName"
                );


            const sideName =
                document.getElementById(
                    "adminSideName"
                );


            if (adminName) {
                adminName.textContent =
                    name;
            }


            if (sideName) {
                sideName.textContent =
                    name;
            }

        }


        return true;

    } catch (err) {

        console.error(
            "ADMIN AUTH ERROR:",
            err
        );


        localStorage.removeItem(
            "barangay_token"
        );

        localStorage.removeItem(
            "barangay_role"
        );


        window.location.href =
            "admin-login.html";


        return false;
    }
}


/* =========================================================
   LOGOUT
========================================================= */

function logoutAdmin() {

    localStorage.removeItem(
        "barangay_token"
    );

    localStorage.removeItem(
        "barangay_role"
    );


    window.location.href =
        "admin-login.html";
}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const searchInput =
        document.getElementById(
            "adminSearch"
        );


    if (!searchInput) return;


    let timer;


    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(timer);


            timer = setTimeout(
                () => {

                    load(
                        searchInput.value.trim()
                    );

                },
                300
            );

        }
    );
}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "ADMIN DASHBOARD JS LOADED"
        );


        /* AUTH */

        const valid =
            await checkAdmin();


        if (!valid) {
            return;
        }


        /* LOAD POSTS */

        load();


        /* SEARCH */

        setupSearch();


        /* NEW POST */

        const newPostBtn =
            document.getElementById(
                "newPostBtn"
            );


        if (newPostBtn) {

            newPostBtn.addEventListener(
                "click",
                openNewPostModal
            );

        }


        /* ADMIN POST FORM */

        const adminPostForm =
            document.getElementById(
                "adminPostForm"
            );


        if (adminPostForm) {

            adminPostForm.addEventListener(
                "submit",
                submitAdminPost
            );

        }


        /* =================================================
           CHANGE PASSWORD BUTTON
        ================================================= */

        const passwordButton =
            document.getElementById(
                "adminPasswordBtn"
            );


        console.log(
            "PASSWORD BUTTON:",
            passwordButton
        );


        if (passwordButton) {

            passwordButton.addEventListener(
                "click",
                openAdminPasswordModal
            );

        }


        /* =================================================
           CHANGE PASSWORD FORM
        ================================================= */

        const passwordForm =
            document.getElementById(
                "adminPasswordForm"
            );


        console.log(
            "PASSWORD FORM:",
            passwordForm
        );


        if (passwordForm) {

            passwordForm.addEventListener(
                "submit",
                submitAdminPassword
            );

        }


        /* LOGOUT */

        const logoutButton =
            document.getElementById(
                "adminLogout"
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logoutAdmin
            );

        }


        /* CLOSE BUTTONS */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        closeModal(
                            button.dataset.close
                        );

                    }
                );

            });


        /* CLICK OUTSIDE MODAL */

        document
            .querySelectorAll(
                ".modal"
            )
            .forEach(modal => {

                modal.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target === modal
                        ) {

                            modal.classList.add(
                                "hidden"
                            );

                        }

                    }
                );

            });

    }
);s