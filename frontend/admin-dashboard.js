let adminPosts = [];


/* =========================
   TOKEN
========================= */

function token() {
    return localStorage.getItem("barangay_token");
}


/* =========================
   API HELPER
========================= */

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


/* =========================
   ESCAPE HTML
========================= */

function esc(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================
   TIME AGO
========================= */

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


/* =========================
   TOAST
========================= */

function toast(message) {

    const el = document.getElementById("toast");

    if (!el) return;

    el.textContent = message;

    el.classList.add("show");

    setTimeout(() => {
        el.classList.remove("show");
    }, 2500);
}


/* =========================
   MESSAGE
========================= */

function showMessage(elementId, message, success = false) {

    const el = document.getElementById(elementId);

    if (!el) return;

    el.textContent = message;

    el.className =
        `form-message ${success ? "success" : "error"}`;
}


/* =========================
   LOAD ADMIN POSTS
========================= */

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

        adminPosts = data.posts || [];

        console.log(
            "ADMIN POSTS:",
            adminPosts
        );

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
                    <small>${esc(err.message)}</small>
                </div>
            `;
        }

    } finally {

        if (loading) {
            loading.style.display = "none";
        }

    }
}


/* =========================
   STATISTICS
========================= */

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
                total + (post.comments?.length || 0),
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


/* =========================
   RENDER POSTS
========================= */

function render(list = adminPosts) {

    const box =
        document.getElementById("adminPostList");

    if (!box) return;


    if (!list.length) {

        box.innerHTML = `
            <div class="empty-state">
                No posts or complaints found.
            </div>
        `;

        return;
    }


    box.innerHTML = list.map(post => {

        const comments =
            post.comments || [];


        /*
         * Determine if this is a complaint.
         */

        const isComplaint =
            post.type === "complaint" ||
            post.category ||
            post.address ||
            post.age !== undefined ||
            post.gender ||
            post.contactNumber;


        /*
         * Status
         */

        const status =
            post.status || "Pending";


        const statusClass =
            status
                .toLowerCase()
                .replace(/\s+/g, "-");


        /*
         * Author
         */

        const authorName =
            post.authorName ||
            "Unknown User";


        /* =========================
   USER + COMPLAINT INFORMATION
========================= */

        const complaintDetails =
            isComplaint
                ? `
            <div class="complaint-details">

                <div class="complaint-detail">
                    <span class="detail-label">
                        Complainant Name
                    </span>

                    <strong>
                        ${esc(post.authorName || "Unknown User")}
                    </strong>
                </div>


                <div class="complaint-detail">
                    <span class="detail-label">
                        Category
                    </span>

                    <strong>
                        ${esc(post.category || "Not provided")}
                    </strong>
                </div>


                <div class="complaint-detail">
                    <span class="detail-label">
                        Address
                    </span>

                    <strong>
                        ${esc(post.address || "Not provided")}
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
                        ${esc(post.gender || "Not provided")}
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
                                ${status === "Pending" ? "selected" : ""}
                            >
                                Pending
                            </option>

                            <option
                                value="In Progress"
                                ${status === "In Progress" ? "selected" : ""}
                            >
                                In Progress
                            </option>

                            <option
                                value="Resolved"
                                ${status === "Resolved" ? "selected" : ""}
                            >
                                Resolved
                            </option>

                        </select>

                    </div>
                </div>

            </div>
        `
                : "";


        /*
         * Image
         */

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


        /*
         * Comments
         */

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
                            ${ago(comment.createdAt)}
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


                    <!-- POST HEADER -->

                    <div class="admin-post-top">

                        <div>

                            <strong>
                                ${esc(authorName)}
                            </strong>

                            <span class="muted">
                                • ${ago(post.createdAt)}
                            </span>

                        </div>

                    </div>


                    <!-- POST TYPE -->

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


                    <!-- CONTENT -->

                    <p class="admin-post-content">
                        ${esc(post.content || "")}
                    </p>


                    <!-- COMPLAINT DETAILS -->

                    ${complaintDetails}


                    <!-- IMAGE -->

                    ${image}


                    <!-- ACTION BUTTONS -->

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


                    <!-- COMMENTS -->

                    <div class="admin-comments">

                        <strong>
                            Comments (${comments.length})
                        </strong>


                        <div class="admin-comment-list">

                            ${commentsHTML}

                        </div>


                        <!-- ADD COMMENT -->

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


/* =========================
   POST EVENTS
========================= */

function attachPostEvents() {


    /*
     * EDIT
     */

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
                        .getElementById("editPostId")
                        .value = post._id;


                    document
                        .getElementById("adminPostContent")
                        .value =
                        post.content || "";


                    document
                        .getElementById("postModalTitle")
                        .textContent =
                        "Edit post";


                    document
                        .getElementById("adminPostSubmit")
                        .textContent =
                        "Update";


                    document
                        .getElementById("adminPostMessage")
                        .textContent = "";


                    document
                        .getElementById("postModal")
                        .classList.remove("hidden");

                }
            );

        });


    /*
     * DELETE
     */

    document
        .querySelectorAll("[data-delete]")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.delete;


                    const confirmed =
                        confirm(
                            "Are you sure you want to delete this post?"
                        );


                    if (!confirmed) {
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


    /*
     * CHANGE COMPLAINT STATUS
     */

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


    /*
     * ADD COMMENT
     */

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


                    if (!content) {
                        return;
                    }


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


/* =========================
   NEW POST MODAL
========================= */

function openNewPostModal() {

    document
        .getElementById("postModalTitle")
        .textContent =
        "Create post";


    document
        .getElementById("adminPostSubmit")
        .textContent =
        "Publish";


    document
        .getElementById("editPostId")
        .value = "";


    document
        .getElementById("adminPostContent")
        .value = "";


    document
        .getElementById("adminPostMessage")
        .textContent = "";


    document
        .getElementById("postModal")
        .classList.remove("hidden");

}


/* =========================
   CLOSE MODALS
========================= */

function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {
        modal.classList.add("hidden");
    }

}


/* =========================
   ADMIN POST FORM
========================= */

async function submitAdminPost(event) {

    event.preventDefault();


    const content =
        document
            .getElementById("adminPostContent")
            .value
            .trim();


    const editId =
        document
            .getElementById("editPostId")
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

        submitButton.disabled = true;


        if (editId) {

            /*
             * EDIT EXISTING POST
             */

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

            /*
             * CREATE ANNOUNCEMENT
             */

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

        submitButton.disabled = false;

    }

}


/* =========================
   ADMIN PASSWORD
========================= */

async function submitAdminPassword(event) {

    event.preventDefault();


    const currentPassword =
        document
            .getElementById("adminCurrentPassword")
            .value;


    const newPassword =
        document
            .getElementById("adminNewPassword")
            .value;


    const confirmPassword =
        document
            .getElementById("adminConfirmPassword")
            .value;


    if (newPassword !== confirmPassword) {

        showMessage(
            "adminPasswordMessage",
            "New passwords do not match."
        );

        return;
    }


    if (newPassword.length < 6) {

        showMessage(
            "adminPasswordMessage",
            "Password must be at least 6 characters."
        );

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


        showMessage(
            "adminPasswordMessage",
            "Password updated successfully.",
            true
        );


        document
            .getElementById("adminPasswordForm")
            .reset();


        toast(
            "Password changed successfully."
        );


    } catch (err) {

        console.error(err);

        showMessage(
            "adminPasswordMessage",
            err.message ||
            "Could not change password."
        );

    }

}


/* =========================
   AUTH CHECK
========================= */

async function checkAdmin() {

    const currentToken =
        token();


    const role =
        localStorage.getItem(
            "barangay_role"
        );


    /*
     * No token
     */

    if (!currentToken || role !== "admin") {

        window.location.href =
            "admin-login.html";

        return false;
    }


    try {

        const data =
            await api(
                "/api/auth/me"
            );


        if (data.user) {

            const name =
                data.user.username ||
                data.user.name ||
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


/* =========================
   LOGOUT
========================= */

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


/* =========================
   SEARCH
========================= */

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


/* =========================
   DOM READY
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /*
         * Check admin
         */

        const valid =
            await checkAdmin();


        if (!valid) {
            return;
        }


        /*
         * Load posts
         */

        load();


        /*
         * Search
         */

        setupSearch();


        /*
         * New post
         */

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


        /*
         * Admin post form
         */

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


        /*
         * Change password button
         */

        const passwordButton =
            document.getElementById(
                "adminPasswordBtn"
            );


        if (passwordButton) {

            passwordButton.addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "passwordModal"
                        )
                        .classList.remove(
                            "hidden"
                        );

                }
            );

        }


        /*
         * Password form
         */

        const passwordForm =
            document.getElementById(
                "adminPasswordForm"
            );


        if (passwordForm) {

            passwordForm.addEventListener(
                "submit",
                submitAdminPassword
            );

        }


        /*
         * Logout
         */

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


        /*
         * Close buttons
         */

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


        /*
         * Close modal when clicking outside
         */

        document
            .querySelectorAll(".modal")
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
);