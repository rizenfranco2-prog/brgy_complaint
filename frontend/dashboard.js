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


async function loadNotifications() {
    const container = document.getElementById("notificationList");

    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/api/notifications`, {
            headers: {
                Authorization:
                    `Bearer ${localStorage.getItem("barangay_token")}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load notifications.");
        }

        const notifications = data.notifications || [];

        // Hide archived notifications from the user interface
        const activeNotifications = notifications.filter(
            notification => !notification.archived
        );

        if (activeNotifications.length === 0) {
            container.textContent = "You're all caught up.";
            return;
        }

        // Display only active notifications
        container.innerHTML = activeNotifications.map(item => `
            <article class="notification-item ${item.read ? "read" : "unread"}">
                <p>${escapeHTML(item.message)}</p>
                <small>${new Date(item.createdAt).toLocaleString()}</small>

                ${!item.read ? `
                    <button
                        type="button"
                        class="mark-read-btn"
                        data-id="${escapeHTML(item._id)}">
                        Mark as read
                    </button>
                ` : ""}
            </article>
        `).join("");

        container.querySelectorAll(".mark-read-btn").forEach(button => {
            button.addEventListener("click", async () => {
                try {
                    button.disabled = true;

                    await markNotificationRead(button.dataset.id);

                    // Reload the list after archiving
                    await loadNotifications();
                } catch (error) {
                    button.disabled = false;
                    alert(error.message || "Failed to archive notification.");
                }
            });
        });

    } catch (error) {
        container.textContent = error.message;
    }
}

async function markNotificationRead(id) {
    const response = await fetch(
        `${API_URL}/api/notifications/${encodeURIComponent(id)}/read`,
        {
            method: "PATCH",
            headers: {
                Authorization:
                    `Bearer ${localStorage.getItem("barangay_token")}`
            }
        }
    );

    if (!response.ok) {
        throw new Error("Could not mark notification as read.");
    }
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

function renderComplaintHistory(history = []) {
    if (!history.length) {
        return "<p>No history available yet.</p>";
    }

    return `
        <div class="complaint-timeline">
            ${history.map(item => `
                <div class="timeline-item">
                    <strong>${escapeHTML(item.status)}</strong>
                    <small>
                        ${new Date(item.changedAt).toLocaleString()}
                    </small>
                    ${item.note ? `<p>${escapeHTML(item.note)}</p>` : ""}
                </div>
            `).join("")}
        </div>
    `;
}

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

                <div class="empty-icon">
                    ◎
                </div>

                <h3>
                    No posts found
                </h3>

                <p>
                    Try another search or publish the first
                    community post.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML = list.map(post => {

        const own =
            currentUser &&
            String(post.authorId) === String(currentUser._id);

        const comments = post.comments || [];

        const status = post.status || "Pending";


        return `
            <article class="post card">

                <!-- ================================= -->
                <!-- POST HEADER -->
                <!-- ================================= -->

                <div class="post-head">

                    <!-- AUTHOR IS NOW PLAIN TEXT -->
                    <div class="post-profile">

                        <span class="avatar">
                            ${escapeHTML(
            initials(post.authorName)
        )}
                        </span>

                        <div class="post-author">

                            <strong>
                                ${escapeHTML(post.authorName)}
                            </strong>

                            <small>
                                ${timeAgo(post.createdAt)}
                            </small>

                        </div>

                    </div>


                    ${own
                ? `
                            <button
                                class="more-btn"
                                data-delete-post="${post._id}"
                                title="Delete post"
                                type="button"
                            >
                                ⋯
                            </button>
                        `
                : ""
            }

                </div>


                <!-- ================================= -->
                <!-- CATEGORY -->
                <!-- ================================= -->

                ${post.category
                ? `
                        <div class="post-category">
                            ${escapeHTML(post.category)}
                        </div>
                    `
                : ""
            }


                <!-- ================================= -->
                <!-- CONTENT -->
                <!-- ================================= -->

                <div class="post-content">

                    ${escapeHTML(post.content)
                .replace(/\n/g, "<br>")}

                </div>


                <!-- ================================= -->
                <!-- IMAGE -->
                <!-- ================================= -->

                ${post.image
                ? `
                        <div class="post-image-container">

                            <img
                                src="${escapeHTML(post.image)}"
                                class="post-image"
                                alt="Complaint picture"
                                loading="lazy"
                            >

                        </div>
                    `
                : ""
            }


                <!-- ================================= -->
                <!-- STATUS -->
                <!-- ================================= -->

                <div class="post-status">

                    <span class="status-badge ${status
                .toLowerCase()
                .replace(/\s+/g, "-")}">

                        ${escapeHTML(status)}

                    </span>

                </div>


                <!-- ================================= -->
                <!-- POST META -->
                <!-- ================================= -->

                <div class="post-meta">

                    <span>

                        ${comments.length}
                        comment${comments.length === 1 ? "" : "s"}

                    </span>

                </div>


                <!-- ================================= -->
                <!-- COMMENTS -->
                <!-- ================================= -->

                <div class="comments">

                    ${comments.map(c => `

                        <div class="comment">

                            <span class="avatar tiny">

                                ${escapeHTML(
                    initials(c.authorName)
                )}

                            </span>


                            <div class="comment-body">

                                <strong>
                                    ${escapeHTML(c.authorName)}
                                </strong>

                                <p>
                                    ${escapeHTML(c.content)}
                                </p>

                                <small>
                                    ${timeAgo(c.createdAt)}
                                </small>

                            </div>


                            ${currentUser &&
                        String(c.authorId) ===
                        String(currentUser._id)

                        ? `
                                    <button
                                        class="delete-comment"
                                        data-delete-comment="${c._id}"
                                        type="button"
                                    >
                                        ×
                                    </button>
                                `
                        : ""
                    }

                        </div>

                    `).join("")}


                    <!-- COMMENT FORM -->

                    <form
                        class="comment-form"
                        data-post-id="${post._id}"
                    >

                        <span class="avatar tiny">

                            ${escapeHTML(
                        initials(currentUser?.name)
                    )}

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

                </div>

            </article>
        `;

    }).join("");


    /* ================================================= */
    /* DELETE POST */
    /* ================================================= */

    container
        .querySelectorAll("[data-delete-post]")
        .forEach(btn => {

            btn.onclick = async () => {

                if (!confirm("Delete this post?")) {
                    return;
                }

                try {

                    await api(
                        `/api/posts/${btn.dataset.deletePost}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast("Post deleted.");

                    await loadPosts();

                } catch (e) {

                    toast(e.message);

                }

            };

        });


    /* ================================================= */
    /* DELETE COMMENT */
    /* ================================================= */

    container
        .querySelectorAll("[data-delete-comment]")
        .forEach(btn => {

            btn.onclick = async () => {

                if (!confirm("Delete this comment?")) {
                    return;
                }

                try {

                    await api(
                        `/api/comments/${btn.dataset.deleteComment}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast("Comment deleted.");

                    await loadPosts();

                } catch (e) {

                    toast(e.message);

                }

            };

        });


    /* ================================================= */
    /* ADD COMMENT */
    /* ================================================= */

    container
        .querySelectorAll(".comment-form")
        .forEach(form => {

            form.onsubmit = async e => {

                e.preventDefault();

                const input =
                    form.querySelector("input");

                const content =
                    input.value.trim();

                if (!content) return;

                try {

                    await api(
                        `/api/posts/${form.dataset.postId}/comments`,
                        {
                            method: "POST",

                            body: JSON.stringify({
                                content
                            })
                        }
                    );

                    input.value = "";

                    await loadPosts();
                    await loadNotifications();

                    toast("Comment added successfully.");

                } catch (err) {

                    toast(err.message);

                }

            };

        });

}


/* ================================================= */
/* LOAD COMMUNITY POSTS */
/* ================================================= */

async function loadPosts(search = "") {

    const loading =
        document.getElementById("loading");

    try {

        if (loading) {

            loading.style.display = "block";

            loading.textContent =
                "Loading posts...";

        }


        const data = await api(
            `/api/posts?search=${encodeURIComponent(search)}`
        );


        posts = data.posts || [];


        renderPosts(posts);

    } catch (e) {

        if (loading) {

            loading.style.display = "block";

            loading.textContent =
                e.message;

        }

    }

}


/* ================================================= */
/* OPEN USER PROFILE */
/* ================================================= */

async function openUserProfile(userId, userName) {

    const modal =
        document.getElementById("profileModal");

    const nameElement =
        document.getElementById("viewProfileName");

    const emailElement =
        document.getElementById("viewProfileEmail");

    const avatarElement =
        document.getElementById("viewProfileAvatar");

    const postsElement =
        document.getElementById("userPosts");


    if (!modal || !nameElement || !postsElement) {
        return;
    }


    nameElement.textContent =
        userName;

    avatarElement.textContent =
        initials(userName);


    if (
        currentUser &&
        String(userId) === String(currentUser._id)
    ) {

        emailElement.textContent =
            currentUser.email;

    } else {

        emailElement.textContent =
            "Community member";

    }


    modal.classList.remove("hidden");


    postsElement.innerHTML = `
        <p class="muted">
            Loading posts...
        </p>
    `;


    try {

        const data =
            await api(`/api/users/${userId}/posts`);


        const userPosts =
            data.posts || [];


        if (!userPosts.length) {

            postsElement.innerHTML = `

                <div class="empty">

                    <div class="empty-icon">
                        ◎
                    </div>

                    <h3>
                        No posts yet
                    </h3>

                    <p class="muted">

                        ${escapeHTML(userName)}
                        has not published any posts.

                    </p>

                </div>

            `;

            return;
        }


        postsElement.innerHTML =
            userPosts.map(post => {

                return `

                    <article class="profile-post">

                        <div class="profile-post-date">
                            ${timeAgo(post.createdAt)}
                        </div>


                        ${post.category
                        ? `
                                <div class="profile-post-category">
                                    ${escapeHTML(post.category)}
                                </div>
                            `
                        : ""
                    }


                        <div class="profile-post-content">

                            ${escapeHTML(post.content)
                        .replace(/\n/g, "<br>")}

                        </div>


                        ${post.image
                        ? `
                                <div class="profile-post-image">

                                    <img
                                        src="${escapeHTML(post.image)}"
                                        alt="Complaint picture"
                                        loading="lazy"
                                    >

                                </div>
                            `
                        : ""
                    }


                        <div class="profile-post-comments">

                            ${post.comments?.length || 0}

                            comment${(post.comments?.length || 0) === 1
                        ? ""
                        : "s"
                    }

                        </div>

                    </article>

                `;

            }).join("");


    } catch (error) {

        console.error(error);

        postsElement.innerHTML = `

            <p class="form-message error">

                ${escapeHTML(error.message)}

            </p>

        `;

    }

}


/* ================================================= */
/* IMAGE COMPRESSION */
/* ================================================= */

async function compressImage(file) {

    if (!file.type.startsWith("image/")) {

        throw new Error(
            "Please select an image file."
        );

    }


    if (file.size > 8 * 1024 * 1024) {

        throw new Error(
            "Image must be smaller than 8MB."
        );

    }


    const image = new Image();

    const objectUrl =
        URL.createObjectURL(file);

    image.src = objectUrl;


    await new Promise((resolve, reject) => {

        image.onload = resolve;
        image.onerror = reject;

    });


    const maxSize = 1200;

    let width = image.width;
    let height = image.height;


    if (
        width > maxSize ||
        height > maxSize
    ) {

        const scale =
            Math.min(
                maxSize / width,
                maxSize / height
            );

        width =
            Math.round(width * scale);

        height =
            Math.round(height * scale);

    }


    const canvas =
        document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;


    const ctx =
        canvas.getContext("2d");


    ctx.drawImage(
        image,
        0,
        0,
        width,
        height
    );


    URL.revokeObjectURL(objectUrl);


    let quality = 0.8;

    let dataUrl =
        canvas.toDataURL(
            "image/jpeg",
            quality
        );


    while (
        dataUrl.length > 1200000 &&
        quality > 0.4
    ) {

        quality -= 0.1;

        dataUrl =
            canvas.toDataURL(
                "image/jpeg",
                quality
            );

    }


    if (dataUrl.length > 1200000) {

        throw new Error(
            "The picture is still too large. Please choose a smaller image."
        );

    }


    return dataUrl;

}


/* ================================================= */
/* DOM LOADED */
/* ================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* ============================================= */
        /* CHECK LOGIN */
        /* ============================================= */

        if (!token()) {

            location.href = "index.html";

            return;

        }


        try {

            const me =
                await api("/api/auth/me");


            if (me.role !== "user") {

                location.href =
                    "admin-dashboard.html";

                return;

            }


            currentUser =
                me.account;


            const displayName =
                currentUser.name;


            /* ========================================= */
            /* PROFILE INFORMATION */
            /* ========================================= */

            const topName =
                document.getElementById("topName");

            const profileName =
                document.getElementById("profileName");

            const profileEmail =
                document.getElementById("profileEmail");

            const composerName =
                document.getElementById("composerName");


            if (topName) {

                topName.textContent =
                    displayName;

            }


            if (profileName) {

                profileName.textContent =
                    displayName;

            }


            if (profileEmail) {

                profileEmail.textContent =
                    currentUser.email;

            }


            if (composerName) {

                composerName.textContent =
                    displayName;

            }


            [
                "topAvatar",
                "profileAvatar",
                "composerAvatar"
            ].forEach(id => {

                const element =
                    document.getElementById(id);

                if (element) {

                    element.textContent =
                        initials(displayName);

                }

            });


            /* ========================================= */
            /* SIDEBAR PROFILE */
            /* ========================================= */

            const sidebarProfileBtn =
                document.getElementById(
                    "sidebarProfileBtn"
                );

            if (sidebarProfileBtn) {

                sidebarProfileBtn.onclick =
                    () => {

                        openUserProfile(
                            currentUser._id,
                            currentUser.name
                        );

                    };

            }


            /* ========================================= */
            /* LOAD POSTS */
            /* ========================================= */

            /* LOAD POSTS */
            await loadPosts();

            /* LOAD NOTIFICATIONS */
            await loadNotifications();


        } catch (error) {

            console.error(error);

            localStorage.removeItem(
                "barangay_token"
            );

            localStorage.removeItem(
                "barangay_role"
            );

            location.href =
                "index.html";

            return;

        }


        /* ================================================= */
        /* LOGOUT */
        /* ================================================= */

        const logoutBtn =
            document.getElementById("logoutBtn");

        if (logoutBtn) {

            logoutBtn.onclick = () => {

                localStorage.removeItem(
                    "barangay_token"
                );

                localStorage.removeItem(
                    "barangay_role"
                );

                location.href =
                    "index.html";

            };

        }


        /* ================================================= */
        /* COMPLAINT TEXTAREA */
        /* ================================================= */

        const textarea =
            document.getElementById("postContent");


        if (textarea) {

            textarea.oninput = () => {

                const counter =
                    document.getElementById(
                        "charCount"
                    );

                if (counter) {

                    counter.textContent =
                        `${textarea.value.length} / 5000`;

                }

            };

        }


        /* ================================================= */
        /* IMAGE ELEMENTS */
        /* ================================================= */

        const imageInput =
            document.getElementById("postImage");

        const imagePreview =
            document.getElementById("imagePreview");

        const imagePreviewContainer =
            document.getElementById(
                "imagePreviewContainer"
            );

        const removeImageBtn =
            document.getElementById(
                "removeImageBtn"
            );


        /* ================================================= */
        /* IMAGE SELECT */
        /* ================================================= */

        if (imageInput) {

            imageInput.onchange =
                async () => {

                    const file =
                        imageInput.files[0];

                    if (!file) return;


                    try {

                        selectedImage =
                            await compressImage(file);


                        if (imagePreview) {

                            imagePreview.src =
                                selectedImage;

                        }


                        if (
                            imagePreviewContainer
                        ) {

                            imagePreviewContainer
                                .classList
                                .remove("hidden");

                        }


                    } catch (error) {

                        selectedImage = "";

                        imageInput.value = "";


                        if (imagePreview) {

                            imagePreview.src = "";

                        }


                        if (
                            imagePreviewContainer
                        ) {

                            imagePreviewContainer
                                .classList
                                .add("hidden");

                        }


                        toast(error.message);

                    }

                };

        }


        /* ================================================= */
        /* REMOVE IMAGE */
        /* ================================================= */

        if (removeImageBtn) {

            removeImageBtn.onclick = () => {

                selectedImage = "";

                if (imageInput) {

                    imageInput.value = "";

                }

                if (imagePreview) {

                    imagePreview.src = "";

                }

                if (imagePreviewContainer) {

                    imagePreviewContainer
                        .classList
                        .add("hidden");

                }

            };

        }


        /* ================================================= */
        /* CREATE COMPLAINT */
        /* ================================================= */

        const postBtn =
            document.getElementById("postBtn");


        if (postBtn) {

            postBtn.onclick =
                async () => {

                    try {

                        const content =
                            textarea.value.trim();


                        const category =
                            document.getElementById(
                                "complaintCategory"
                            ).value;


                        const address =
                            document.getElementById(
                                "complaintAddress"
                            ).value.trim();


                        const age =
                            document.getElementById(
                                "complaintAge"
                            ).value;


                        const gender =
                            document.getElementById(
                                "complaintGender"
                            ).value;


                        const contactNumber =
                            document.getElementById(
                                "complaintContact"
                            ).value.trim();


                        /* ================================= */
                        /* VALIDATION */
                        /* ================================= */

                        if (!content) {

                            toast(
                                "Please describe your complaint."
                            );

                            return;

                        }


                        if (!category) {

                            toast(
                                "Please select a complaint category."
                            );

                            return;

                        }


                        if (!address) {

                            toast(
                                "Please enter the complaint address."
                            );

                            return;

                        }


                        if (!age) {

                            toast(
                                "Please enter your age."
                            );

                            return;

                        }


                        if (!gender) {

                            toast(
                                "Please select your gender."
                            );

                            return;

                        }


                        if (!contactNumber) {

                            toast(
                                "Please enter your contact number."
                            );

                            return;

                        }


                        /* ================================= */
                        /* SEND TO SERVER */
                        /* ================================= */

                        await api(
                            "/api/posts",
                            {
                                method: "POST",

                                body: JSON.stringify({

                                    content,

                                    category,

                                    address,

                                    age: Number(age),

                                    gender,

                                    contactNumber,

                                    image:
                                        selectedImage

                                })

                            }
                        );


                        /* ================================= */
                        /* CLEAR COMPLAINT FORM */
                        /* ================================= */

                        textarea.value = "";


                        const charCount =
                            document.getElementById(
                                "charCount"
                            );

                        if (charCount) {

                            charCount.textContent =
                                "0 / 5000";

                        }


                        document.getElementById(
                            "complaintCategory"
                        ).value = "";


                        document.getElementById(
                            "complaintAddress"
                        ).value = "";


                        document.getElementById(
                            "complaintAge"
                        ).value = "";


                        document.getElementById(
                            "complaintGender"
                        ).value = "";


                        document.getElementById(
                            "complaintContact"
                        ).value = "";


                        /* ================================= */
                        /* CLEAR IMAGE */
                        /* ================================= */

                        selectedImage = "";


                        if (imageInput) {

                            imageInput.value = "";

                        }


                        if (imagePreview) {

                            imagePreview.src = "";

                        }


                        if (imagePreviewContainer) {

                            imagePreviewContainer
                                .classList
                                .add("hidden");

                        }


                        toast(
                            "Complaint submitted successfully."
                        );


                        await loadPosts();


                    } catch (e) {

                        console.error(e);

                        toast(e.message);

                    }

                };

        }


        /* ================================================= */
        /* SEARCH */
        /* ================================================= */

        let searchTimer;


        const searchInput =
            document.getElementById(
                "searchInput"
            );


        if (searchInput) {

            searchInput.oninput =
                e => {

                    clearTimeout(
                        searchTimer
                    );


                    searchTimer =
                        setTimeout(
                            () =>
                                loadPosts(
                                    e.target.value
                                ),
                            300
                        );

                };

        }


        /* ================================================= */
        /* CHANGE PASSWORD */
        /* ================================================= */

        const passwordBtn =
            document.getElementById(
                "passwordBtn"
            );


        if (passwordBtn) {

            passwordBtn.onclick = () => {

                document
                    .getElementById(
                        "passwordModal"
                    )
                    .classList
                    .remove("hidden");

            };

        }


        /* ================================================= */
        /* CLOSE MODALS */
        /* ================================================= */

        document
            .querySelectorAll("[data-close]")
            .forEach(btn => {

                btn.onclick = () => {

                    const modal =
                        document.getElementById(
                            btn.dataset.close
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
                async e => {

                    e.preventDefault();


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


                    if (
                        newPassword.value !==
                        confirmPassword.value
                    ) {

                        showMessage(
                            "passwordMessage",
                            "New passwords do not match."
                        );

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


                        showMessage(
                            "passwordMessage",
                            "Password changed successfully.",
                            false
                        );


                        passwordForm.reset();


                    } catch (err) {

                        showMessage(
                            "passwordMessage",
                            err.message
                        );

                    }

                };

        }

    }
);


/* ================================================= */
/* FORM MESSAGE */
/* ================================================= */

function showMessage(
    id,
    message,
    error = true
) {

    const el =
        document.getElementById(id);

    if (!el) return;

    el.textContent = message;

    el.className =
        `form-message ${error ? "error" : "success"}`;

}