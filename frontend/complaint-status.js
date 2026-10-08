let allComplaints = [];
let currentStatus = "All";


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

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || "Something went wrong."
        );
    }

    return data;
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================
   DATE
========================= */

function formatDate(date) {

    if (!date) return "Unknown date";

    return new Date(date).toLocaleString(
        "en-PH",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


/* =========================
   TOAST
========================= */

function toast(message) {

    const element = document.getElementById("toast");

    if (!element) return;

    element.textContent = message;

    element.classList.add("show");

    setTimeout(() => {
        element.classList.remove("show");
    }, 2500);
}


/* =========================
   LOAD COMPLAINTS
========================= */

async function loadComplaints() {

    try {

        // Load active complaints
        const activeData = await api("/api/posts");

        // Load resolved/archived complaints
        const archivedData = await api("/api/archive");

        const activeComplaints =
            (activeData.posts || []).filter(post => {

                return post.type === "complaint" ||
                    post.category ||
                    post.address ||
                    post.contactNumber;

            });


        const resolvedComplaints =
            Array.isArray(archivedData)
                ? archivedData
                : (
                    archivedData.complaints ||
                    archivedData.posts ||
                    []
                );


        // Combine active + resolved complaints
        allComplaints = [
            ...activeComplaints,
            ...resolvedComplaints
        ];


        updateCounts();

        renderComplaints();

    } catch (error) {

        console.error(error);

        document.getElementById(
            "complaintList"
        ).innerHTML = `
            <div class="empty-state">
                Unable to load complaints.
            </div>
        `;

    }
}


/* =========================
   UPDATE COUNTS
========================= */

function updateCounts() {

    const pending =
        allComplaints.filter(
            post => post.status === "Pending"
        ).length;

    const progress =
        allComplaints.filter(
            post => post.status === "In Progress"
        ).length;

    const resolved =
        allComplaints.filter(
            post => post.status === "Resolved"
        ).length;


    document.getElementById(
        "pendingCount"
    ).textContent = pending;


    document.getElementById(
        "progressCount"
    ).textContent = progress;


    document.getElementById(
        "resolvedCount"
    ).textContent = resolved;
}


/* =========================
   FILTER
========================= */

function getFilteredComplaints() {

    if (currentStatus === "All") {
        return allComplaints;
    }

    return allComplaints.filter(
        post => post.status === currentStatus
    );
}


/* =========================
   RENDER
========================= */

function renderComplaints() {

    const container =
        document.getElementById(
            "complaintList"
        );

    const complaints =
        getFilteredComplaints();


    document.getElementById(
        "statusResultCount"
    ).textContent = complaints.length;


    if (!complaints.length) {

        container.innerHTML = `
            <div class="empty-state">
                No ${currentStatus === "All"
                ? ""
                : currentStatus.toLowerCase()
            } complaints found.
            </div>
        `;

        return;
    }


    container.innerHTML = complaints.map(
        post => {

            const status =
                post.status || "Pending";


            return `
                <article
                    class="complaint-status-card"
                >

                    <div class="complaint-status-header">

                        <div>

                            <h3>
                                ${escapeHTML(
                post.authorName ||
                "Unknown Resident"
            )}
                            </h3>

                            <small>
                                ${formatDate(
                post.createdAt
            )}
                            </small>

                        </div>


                        <span
                            class="
                                complaint-status-badge
                                ${statusClass(status)}
                            "
                        >
                            ${escapeHTML(status)}
                        </span>

                    </div>


                    <div class="complaint-information">

                        <div class="information-item">
                            <span>Category</span>
                            <strong>
                                ${escapeHTML(
                post.category ||
                "Not specified"
            )}
                            </strong>
                        </div>


                        <div class="information-item">
                            <span>Address</span>
                            <strong>
                                ${escapeHTML(
                post.address ||
                "Not specified"
            )}
                            </strong>
                        </div>


                        <div class="information-item">
                            <span>Age</span>
                            <strong>
                                ${escapeHTML(
                post.age ||
                "Not specified"
            )}
                            </strong>
                        </div>


                        <div class="information-item">
                            <span>Gender</span>
                            <strong>
                                ${escapeHTML(
                post.gender ||
                "Not specified"
            )}
                            </strong>
                        </div>


                        <div class="information-item">
                            <span>Contact Number</span>
                            <strong>
                                ${escapeHTML(
                post.contactNumber ||
                "Not specified"
            )}
                            </strong>
                        </div>

                    </div>


                    <div class="complaint-description">

                        <span>
                            Description
                        </span>

                        <p>
                            ${escapeHTML(
                post.content ||
                "No description."
            )}
                        </p>

                    </div>


                    <div class="complaint-actions">

                        <label>
                            Update Status
                        </label>

                        <select
                            class="complaint-status-select"
                            data-id="${post._id}"
                        >

                            <option
                                value="Pending"
                                ${status === "Pending"
                    ? "selected"
                    : ""}
                            >
                                Pending
                            </option>

                            <option
                                value="In Progress"
                                ${status === "In Progress"
                    ? "selected"
                    : ""}
                            >
                                In Progress
                            </option>

                            <option
                                value="Resolved"
                                ${status === "Resolved"
                    ? "selected"
                    : ""}
                            >
                                Resolved
                            </option>

                        </select>

                    </div>

                </article>
            `;
        }
    ).join("");


    attachStatusEvents();
}


/* =========================
   STATUS CLASS
========================= */

function statusClass(status) {

    if (status === "Pending") {
        return "status-pending";
    }

    if (status === "In Progress") {
        return "status-progress";
    }

    if (status === "Resolved") {
        return "status-resolved";
    }

    return "";
}


/* =========================
   STATUS CHANGE
========================= */

function attachStatusEvents() {

    document
        .querySelectorAll(
            ".complaint-status-select"
        )
        .forEach(select => {

            select.addEventListener(
                "change",
                async () => {

                    const postId =
                        select.dataset.id;

                    const newStatus =
                        select.value;


                    try {

                        await api(
                            `/api/posts/${postId}/status`,
                            {
                                method: "PUT",

                                body: JSON.stringify({
                                    status: newStatus
                                })
                            }
                        );


                        toast(
                            `Complaint marked as ${newStatus}.`
                        );


                        await loadComplaints();


                    } catch (error) {

                        console.error(error);

                        toast(
                            error.message ||
                            "Unable to update status."
                        );

                        await loadComplaints();
                    }

                }
            );

        });
}


/* =========================
   STATUS SELECT
========================= */

function setupStatusFilter() {

    const select =
        document.getElementById(
            "complaintStatusSelect"
        );


    select.addEventListener(
        "change",
        () => {

            currentStatus =
                select.value;

            renderComplaints();

        }
    );


    document
        .querySelectorAll(
            ".status-summary-card"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const status =
                        card.dataset.status;

                    currentStatus = status;

                    select.value = status;

                    renderComplaints();

                }
            );

        });
}


/* =========================
   ADMIN ACCOUNT
========================= */

async function checkAdmin() {

    try {

        const data =
            await api("/api/auth/me");


        if (data.role !== "admin") {

            window.location.href =
                "admin-login.html";

            return;

        }


        const account =
            data.account || data.user;


        if (account) {

            const name =
                account.username ||
                account.name ||
                "Administrator";


            document.getElementById(
                "adminName"
            ).textContent = name;


            document.getElementById(
                "sidebarAdminName"
            ).textContent = name;


            document.getElementById(
                "adminAvatar"
            ).textContent =
                name.charAt(0).toUpperCase();


            document.getElementById(
                "sidebarAvatar"
            ).textContent =
                name.charAt(0).toUpperCase();

        }

    } catch (error) {

        console.error(error);

        window.location.href =
            "admin-login.html";
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
   START
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await checkAdmin();

        await loadComplaints();

        setupStatusFilter();


        const logout =
            document.getElementById(
                "adminLogout"
            );

        if (logout) {

            logout.addEventListener(
                "click",
                logoutAdmin
            );

        }

    }
);