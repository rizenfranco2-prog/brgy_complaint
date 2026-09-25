let posts = [];
let currentUser = null;
let selectedImage = "";
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

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
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

    document.getElementById("loading").style.display = "none";

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

        const own =
            String(post.authorId) === String(currentUser._id);

        return `
      <article class="post card">

        <div class="post-head">

          <!-- CLICKABLE USER PROFILE -->
          <button
            class="post-profile-btn"
            data-user-id="${post.authorId}"
            data-user-name="${escapeHTML(post.authorName)}"
            type="button"
          >

            <span class="avatar">
              ${escapeHTML(initials(post.authorName))}
            </span>

            <div class="post-author">
              <strong>
                ${escapeHTML(post.authorName)}
              </strong>

              <small>
                ${timeAgo(post.createdAt)}
              </small>
            </div>

          </button>


          ${own
                ? `
                <button
                  class="more-btn"
                  data-delete-post="${post._id}"
                  title="Delete post"
                >
                  ⋯
                </button>
              `
                : ""
            }

        </div>


        <div class="post-content">
  ${escapeHTML(post.content).replace(/\n/g, "<br>")}
</div>

${post.image ? `
  <div class="post-image-container">
    <img
      src="${escapeHTML(post.image)}"
      class="post-image"
      alt="Complaint picture"
      loading="lazy"
    >
  </div>
` : ""}


        <div class="post-meta">
          <span>
            ${post.comments.length}
            comment${post.comments.length === 1 ? "" : "s"}
          </span>
        </div>


        <div class="comments">

          ${post.comments.map(c => `
              <div class="comment">

                <span class="avatar tiny">
                  ${escapeHTML(initials(c.authorName))}
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


                ${String(c.authorId) === String(currentUser._id)
                    ? `
                      <button
                        class="delete-comment"
                        data-delete-comment="${c._id}"
                      >
                        ×
                      </button>
                    `
                    : ""
                }

              </div>
            `).join("")
            }


          <form
            class="comment-form"
            data-post-id="${post._id}"
          >

            <span class="avatar tiny">
              ${escapeHTML(initials(currentUser.name))}
            </span>

            <input
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
    /* CLICK USER PROFILE */
    /* ================================================= */

    container.querySelectorAll(".post-profile-btn").forEach(btn => {

        btn.onclick = () => {

            const userId = btn.dataset.userId;
            const userName = btn.dataset.userName;

            openUserProfile(userId, userName);

        };

    });


    /* ================================================= */
    /* DELETE POST */
    /* ================================================= */

    container.querySelectorAll("[data-delete-post]").forEach(btn => {

        btn.onclick = async () => {

            if (!confirm("Delete this post?")) return;

            try {

                await api(
                    `/api/posts/${btn.dataset.deletePost}`,
                    {
                        method: "DELETE"
                    }
                );

                toast("Post deleted.");

                loadPosts();

            } catch (e) {

                toast(e.message);

            }

        };

    });


    /* ================================================= */
    /* DELETE COMMENT */
    /* ================================================= */

    container.querySelectorAll("[data-delete-comment]").forEach(btn => {

        btn.onclick = async () => {

            if (!confirm("Delete this comment?")) return;

            try {

                await api(
                    `/api/comments/${btn.dataset.deleteComment}`,
                    {
                        method: "DELETE"
                    }
                );

                toast("Comment deleted.");

                loadPosts();

            } catch (e) {

                toast(e.message);

            }

        };

    });


    /* ================================================= */
    /* ADD COMMENT */
    /* ================================================= */

    container.querySelectorAll(".comment-form").forEach(form => {

        form.onsubmit = async e => {

            e.preventDefault();

            const input = form.querySelector("input");

            try {

                await api(
                    `/api/posts/${form.dataset.postId}/comments`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            content: input.value
                        })
                    }
                );

                input.value = "";

                loadPosts();

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

    try {

        posts = await api(
            `/api/posts?search=${encodeURIComponent(search)}`
        );

        renderPosts(posts);

    } catch (e) {

        document.getElementById("loading").textContent =
            e.message;

    }

}


/* ================================================= */
/* OPEN USER PROFILE */
/* ================================================= */

async function openUserProfile(userId, userName) {

    const modal = document.getElementById("profileModal");

    const nameElement =
        document.getElementById("viewProfileName");

    const emailElement =
        document.getElementById("viewProfileEmail");

    const avatarElement =
        document.getElementById("viewProfileAvatar");

    const postsElement =
        document.getElementById("userPosts");


    /* Show basic profile information */

    nameElement.textContent = userName;

    avatarElement.textContent = initials(userName);


    /* Only show email when viewing your own profile */

    if (String(userId) === String(currentUser._id)) {

        emailElement.textContent =
            currentUser.email;

    } else {

        emailElement.textContent =
            "Community member";

    }


    /* Open modal */

    modal.classList.remove("hidden");


    /* Loading message */

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


        /* No posts */

        if (!userPosts.length) {

            postsElement.innerHTML = `
        <div class="empty">
          <div class="empty-icon">◎</div>

          <h3>No posts yet</h3>

          <p class="muted">
            ${escapeHTML(userName)} has not published any posts.
          </p>
        </div>
      `;

            return;
        }


        /* Display ONLY this user's posts */

        postsElement.innerHTML = userPosts.map(post => {

            return `
        <article class="profile-post">

          <div class="profile-post-date">
            ${timeAgo(post.createdAt)}
          </div>
<div class="profile-post-content">
  ${escapeHTML(post.content).replace(/\n/g, "<br>")}
</div>

${post.image ? `
  <div class="profile-post-image">
    <img
      src="${escapeHTML(post.image)}"
      alt="Complaint picture"
      loading="lazy"
    >
  </div>
` : ""}

          <div class="profile-post-comments">
            ${post.comments?.length || 0}
            comment${(post.comments?.length || 0) === 1 ? "" : "s"}
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
/* DOM LOADED */
/* ================================================= */

document.addEventListener("DOMContentLoaded", async () => {

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


        document.getElementById("topName")
            .textContent = displayName;

        document.getElementById("profileName")
            .textContent = displayName;

        document.getElementById("profileEmail")
            .textContent = currentUser.email;

        document.getElementById("composerName")
            .textContent = displayName;


        [
            "topAvatar",
            "profileAvatar",
            "composerAvatar"
        ].forEach(id => {

            document.getElementById(id)
                .textContent = initials(displayName);

        });


        /* ============================================= */
        /* YOUR OWN PROFILE */
        /* ============================================= */

        document.getElementById("topProfileBtn").onclick =
            () => {

                openUserProfile(
                    currentUser._id,
                    currentUser.name
                );

            };


        document.getElementById("sidebarProfileBtn").onclick =
            () => {

                openUserProfile(
                    currentUser._id,
                    currentUser.name
                );

            };


        loadPosts();


    } catch {

        localStorage.removeItem("barangay_token");

        location.href = "index.html";

        return;

    }


    /* ================================================= */
    /* LOGOUT */
    /* ================================================= */

    document.getElementById("logoutBtn").onclick = () => {

        localStorage.clear();

        location.href = "index.html";

    };


    /* ================================================= */
    /* CHARACTER COUNTER */
    /* ================================================= */

    const textarea =
        document.getElementById("postContent");


    textarea.oninput = () => {

        document.getElementById("charCount")
            .textContent =
            `${textarea.value.length} / 5000`;

    };

    /* ================================================= */
    /* COMPLAINT IMAGE */
    /* ================================================= */

    const imageInput =
        document.getElementById("postImage");

    const imagePreview =
        document.getElementById("imagePreview");

    const imagePreviewContainer =
        document.getElementById("imagePreviewContainer");

    const removeImageBtn =
        document.getElementById("removeImageBtn");


    async function compressImage(file) {

        if (!file.type.startsWith("image/")) {
            throw new Error("Please select an image file.");
        }

        if (file.size > 8 * 1024 * 1024) {
            throw new Error("Image must be smaller than 8MB.");
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

        if (width > maxSize || height > maxSize) {

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

        // Keep the stored image reasonably small
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


    imageInput.onchange = async () => {

        const file =
            imageInput.files[0];

        if (!file) return;

        try {

            selectedImage =
                await compressImage(file);

            imagePreview.src =
                selectedImage;

            imagePreviewContainer
                .classList.remove("hidden");

        } catch (error) {

            selectedImage = "";

            imageInput.value = "";

            imagePreviewContainer
                .classList.add("hidden");

            toast(error.message);
        }
    };


    removeImageBtn.onclick = () => {

        selectedImage = "";

        imageInput.value = "";

        imagePreview.src = "";

        imagePreviewContainer
            .classList.add("hidden");
    };


    /* ================================================= */
    /* CREATE POST */
    /* ================================================= */

    document.getElementById("postBtn").onclick =
        async () => {

            try {

                if (!textarea.value.trim()) {
                    return toast("Write something first.");
                }

                await api(
                    "/api/posts",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            content: textarea.value,
                            image: selectedImage
                        })
                    }
                );


                textarea.value = "";

                document.getElementById("charCount")
                    .textContent = "0 / 5000";


                // Clear selected picture
                selectedImage = "";

                imageInput.value = "";

                imagePreview.src = "";

                imagePreviewContainer
                    .classList.add("hidden");


                toast("Post published.");

                loadPosts();


            } catch (e) {

                toast(e.message);

            }

        };


    /* ================================================= */
    /* SEARCH */
    /* ================================================= */

    let searchTimer;


    document.getElementById("searchInput").oninput =
        e => {

            clearTimeout(searchTimer);

            searchTimer =
                setTimeout(
                    () => loadPosts(e.target.value),
                    300
                );

        };


    /* ================================================= */
    /* CHANGE PASSWORD */
    /* ================================================= */

    document.getElementById("passwordBtn").onclick =
        () => {

            document
                .getElementById("passwordModal")
                .classList.remove("hidden");

        };


    /* ================================================= */
    /* CLOSE MODALS */
    /* ================================================= */

    document.querySelectorAll("[data-close]")
        .forEach(btn => {

            btn.onclick = () => {

                document
                    .getElementById(btn.dataset.close)
                    .classList.add("hidden");

            };

        });


    /* ================================================= */
    /* CHANGE PASSWORD FORM */
    /* ================================================= */

    document.getElementById("passwordForm")
        .onsubmit = async e => {

            e.preventDefault();


            const currentPassword =
                document.getElementById("currentPassword");

            const newPassword =
                document.getElementById("newPassword");

            const confirmPassword =
                document.getElementById("confirmPassword");


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


                e.target.reset();


            } catch (err) {

                showMessage(
                    "passwordMessage",
                    err.message
                );

            }

        };

});


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

    el.textContent = message;

    el.className =
        `form-message ${error ? "error" : "success"}`;

}