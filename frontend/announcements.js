function token() {

    return localStorage.getItem(
        "barangay_token"
    );
}


async function api(
    path,
    options = {}
) {

    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    const currentToken = token();


    if (currentToken) {

        headers.Authorization =
            `Bearer ${currentToken}`;

    }


    const res =
        await fetch(
            `${API_URL}${path}`,
            {
                ...options,
                headers
            }
        );


    const data =
        await res
            .json()
            .catch(() => ({}));


    if (!res.ok) {

        throw new Error(
            data.message ||
            "Request failed."
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

    const seconds =
        Math.floor(
            (
                Date.now() -
                new Date(date).getTime()
            ) / 1000
        );


    if (seconds < 60) {
        return "Just now";
    }


    if (seconds < 3600) {

        return `${Math.floor(
            seconds / 60
        )}m`;

    }


    if (seconds < 86400) {

        return `${Math.floor(
            seconds / 3600
        )}h`;

    }


    if (seconds < 604800) {

        return `${Math.floor(
            seconds / 86400
        )}d`;

    }


    return new Date(
        date
    ).toLocaleDateString();

}


function toast(message) {

    const element =
        document.getElementById(
            "toast"
        );


    if (!element) return;


    element.textContent =
        message;


    element.classList.add(
        "show"
    );


    setTimeout(() => {

        element.classList.remove(
            "show"
        );

    }, 2500);

}


/* ================================================= */
/* RENDER ANNOUNCEMENTS */
/* ================================================= */

function renderAnnouncements(
    announcements
) {

    const container =
        document.getElementById(
            "announcementList"
        );


    const loading =
        document.getElementById(
            "announcementLoading"
        );


    loading.style.display =
        "none";


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
        announcements.map(post => `

            <article class="post card">


                <!-- HEADER -->

                <div class="post-head">

                    <div
                        class="clickable-profile"
                    >

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


                <!-- ANNOUNCEMENT CONTENT -->

                <div class="post-content">

                    ${escapeHTML(
            post.content
        ).replace(
            /\n/g,
            "<br>"
        )}

                </div>


                <!-- COMPLAINT / ANNOUNCEMENT IMAGE -->

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


                <!-- COMMENTS -->

                <div class="post-meta">

                    <span>

                        ${(post.comments || [])
                .length
            }

                        comment${(post.comments || [])
                .length === 1
                ? ""
                : "s"
            }

                    </span>

                </div>


            </article>

        `).join("");

}


/* ================================================= */
/* LOAD ANNOUNCEMENTS */
/* ================================================= */

async function loadAnnouncements() {

    try {

        const announcements =
            await api(
                "/api/announcements"
            );


        renderAnnouncements(
            announcements
        );


    } catch (error) {

        const loading =
            document.getElementById(
                "announcementLoading"
            );


        loading.textContent =
            error.message;

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


            if (me.role !== "user") {

                location.href =
                    "admin-dashboard.html";

                return;

            }


            const user =
                me.account;


            document.getElementById(
                "topName"
            ).textContent =
                user.name;


            document.getElementById(
                "profileName"
            ).textContent =
                user.name;


            document.getElementById(
                "profileEmail"
            ).textContent =
                user.email;


            const userInitials =
                initials(user.name);


            document.getElementById(
                "topAvatar"
            ).textContent =
                userInitials;


            document.getElementById(
                "profileAvatar"
            ).textContent =
                userInitials;


            loadAnnouncements();


        } catch {

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

        document.getElementById(
            "logoutBtn"
        ).onclick = () => {

            localStorage.clear();

            location.href =
                "index.html";

        };


        /* ================================================= */
        /* CHANGE PASSWORD */
        /* ================================================= */

        document.getElementById(
            "passwordBtn"
        ).onclick = () => {

            document.getElementById(
                "passwordModal"
            ).classList.remove(
                "hidden"
            );

        };


        /* ================================================= */
        /* CLOSE MODAL */
        /* ================================================= */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(button => {

                button.onclick = () => {

                    document
                        .getElementById(
                            button.dataset.close
                        )
                        .classList.add(
                            "hidden"
                        );

                };

            });


        /* ================================================= */
        /* CHANGE PASSWORD */
        /* ================================================= */

        document.getElementById(
            "passwordForm"
        ).onsubmit = async event => {

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


            if (
                newPassword.value !==
                confirmPassword.value
            ) {

                const message =
                    document.getElementById(
                        "passwordMessage"
                    );


                message.textContent =
                    "New passwords do not match.";


                message.className =
                    "form-message error";


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


                const message =
                    document.getElementById(
                        "passwordMessage"
                    );


                message.textContent =
                    "Password changed successfully.";


                message.className =
                    "form-message success";


                event.target.reset();


            } catch (error) {

                const message =
                    document.getElementById(
                        "passwordMessage"
                    );


                message.textContent =
                    error.message;


                message.className =
                    "form-message error";

            }

        };

    }
);