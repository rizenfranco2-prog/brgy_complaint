/* =========================================================
   ADMIN OFFICIALS
   ========================================================= */

function token() {
    return localStorage.getItem("barangay_token");
}


/* =========================================================
   API
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

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}


/* =========================================================
   HELPERS
   ========================================================= */

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


function toast(message) {

    const element =
        document.getElementById("toast");

    if (!element) return;

    element.textContent = message;

    element.classList.add("show");

    setTimeout(() => {

        element.classList.remove("show");

    }, 2500);
}


/* =========================================================
   LOAD ADMIN ACCOUNT
   ========================================================= */

async function loadAdminAccount() {

    try {

        const me = await api("/api/auth/me");

        if (me.role !== "admin") {

            window.location.href = "dashboard.html";

            return false;
        }

        const admin =
            me.account ||
            me.user ||
            {};

        const name =
            admin.username ||
            "Admin";


        /* TOP NAME */

        const adminName =
            document.getElementById("adminName");

        if (adminName) {
            adminName.textContent = name;
        }


        /* TOP AVATAR */

        const adminAvatar =
            document.getElementById("adminAvatar");

        if (adminAvatar) {
            adminAvatar.textContent =
                initials(name);
        }


        /* SIDEBAR NAME */

        const sidebarName =
            document.getElementById(
                "sidebarAdminName"
            );

        if (sidebarName) {
            sidebarName.textContent = name;
        }


        /* SIDEBAR AVATAR */

        const sidebarAvatar =
            document.getElementById(
                "sidebarAvatar"
            );

        if (sidebarAvatar) {
            sidebarAvatar.textContent =
                initials(name);
        }


        return true;

    } catch (error) {

        console.error(error);

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
   LOAD OFFICIALS
   ========================================================= */

async function loadOfficials(search = "") {

    const cityContainer =
        document.getElementById(
            "cityOfficials"
        );

    const barangayContainer =
        document.getElementById(
            "barangayOfficials"
        );

    if (!cityContainer || !barangayContainer) {
        return;
    }


    cityContainer.innerHTML = `
        <div class="official-empty">
            <strong>Loading officials...</strong>
            Please wait.
        </div>
    `;

    barangayContainer.innerHTML = `
        <div class="official-empty">
            <strong>Loading officials...</strong>
            Please wait.
        </div>
    `;


    try {

        const query =
            search.trim()
                ? `?search=${encodeURIComponent(search.trim())}`
                : "";


        const data =
            await api(`/api/officials${query}`);


        const officials =
            data.officials || [];


        const cityOfficials =
            officials.filter(
                official =>
                    official.government ===
                    "City Government"
            );


        const barangayOfficials =
            officials.filter(
                official =>
                    official.government ===
                    "Barangay Government"
            );


        renderOfficials(
            cityContainer,
            cityOfficials
        );


        renderOfficials(
            barangayContainer,
            barangayOfficials
        );


    } catch (error) {

        console.error(error);

        cityContainer.innerHTML = `
            <div class="official-empty">
                Failed to load officials.
            </div>
        `;

        barangayContainer.innerHTML = `
            <div class="official-empty">
                Failed to load officials.
            </div>
        `;

        toast(error.message);
    }
}


/* =========================================================
   RENDER OFFICIALS
   ========================================================= */

function renderOfficials(
    container,
    officials
) {

    if (!officials.length) {

        container.innerHTML = `
            <div class="official-empty">
                <strong>No officials found.</strong>
                <span>
                    Add an official using the button above.
                </span>
            </div>
        `;

        return;
    }


    container.innerHTML =
        officials.map(official => {

            const image =
                official.image
                    ? `
                        <img
                            src="${escapeHTML(
                        official.image
                    )}"
                            class="official-photo"
                            alt="${escapeHTML(
                        official.name
                    )}"
                        >
                      `
                    : `
                        <div class="official-photo official-initials">
                            ${escapeHTML(
                        initials(
                            official.name
                        )
                    )}
                        </div>
                      `;


            return `
                <article
                    class="official-card"
                    data-id="${official._id}"
                >

                    ${image}

                    <div class="official-card-info">

                        <h3>
                            ${escapeHTML(
                official.name
            )}
                        </h3>

                        <strong>
                            ${escapeHTML(
                official.position
            )}
                        </strong>


                        ${official.contactNumber
                    ? `
                                    <p>
                                        📞
                                        ${escapeHTML(
                        official.contactNumber
                    )}
                                    </p>
                                  `
                    : ""
                }

                        ${official.email
                    ? `
                                    <p>
                                        ✉️
                                        ${escapeHTML(
                        official.email
                    )}
                                    </p>
                                  `
                    : ""
                }

                    </div>


                    <div class="official-card-actions">

                        <button
                            type="button"
                            class="official-edit-btn"
                            onclick="editOfficial('${official._id}')">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="official-delete-btn"
                            onclick="deleteOfficial('${official._id}')">
                            Delete
                        </button>

                    </div>

                </article>
            `;

        }).join("");
}


/* =========================================================
   OPEN ADD MODAL
   ========================================================= */

function openAddOfficial() {

    const form =
        document.getElementById(
            "officialForm"
        );

    if (form) {
        form.reset();
    }


    document.getElementById(
        "officialId"
    ).value = "";


    document.getElementById(
        "officialModalTitle"
    ).textContent = "Add Official";


    document.getElementById(
        "saveOfficialBtn"
    ).textContent = "Add Official";


    document.getElementById(
        "officialFormMessage"
    ).textContent = "";


    document.getElementById(
        "officialModal"
    ).classList.remove("hidden");
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeOfficialModal() {

    const modal =
        document.getElementById(
            "officialModal"
        );

    if (modal) {

        modal.classList.add("hidden");

    }
}


/* =========================================================
   EDIT OFFICIAL
   ========================================================= */

async function editOfficial(id) {

    try {

        const data =
            await api("/api/officials");


        const official =
            (data.officials || [])
                .find(item =>
                    item._id === id
                );


        if (!official) {

            toast("Official not found.");

            return;
        }


        document.getElementById(
            "officialId"
        ).value = official._id;


        document.getElementById(
            "officialName"
        ).value =
            official.name || "";


        document.getElementById(
            "officialPosition"
        ).value =
            official.position || "";


        document.getElementById(
            "officialGovernment"
        ).value =
            official.government || "";


        document.getElementById(
            "officialContact"
        ).value =
            official.contactNumber || "";


        document.getElementById(
            "officialEmail"
        ).value =
            official.email || "";


        document.getElementById(
            "officialImage"
        ).value =
            official.image || "";


        document.getElementById(
            "officialModalTitle"
        ).textContent =
            "Edit Official";


        document.getElementById(
            "saveOfficialBtn"
        ).textContent =
            "Update Official";


        document.getElementById(
            "officialModal"
        ).classList.remove("hidden");


    } catch (error) {

        console.error(error);

        toast(error.message);
    }
}


/* =========================================================
   SAVE OFFICIAL
   ========================================================= */

async function saveOfficial(event) {

    event.preventDefault();


    const id =
        document.getElementById(
            "officialId"
        ).value;


    const name =
        document.getElementById(
            "officialName"
        ).value.trim();


    const position =
        document.getElementById(
            "officialPosition"
        ).value.trim();


    const government =
        document.getElementById(
            "officialGovernment"
        ).value;


    const barangay =
        document.getElementById(
            "officialBarangay"
        ).value.trim();


    const contactNumber =
        document.getElementById(
            "officialContact"
        ).value.trim();


    const email =
        document.getElementById(
            "officialEmail"
        ).value.trim();


    const image =
        document.getElementById(
            "officialImage"
        ).value.trim();


    if (!name || !position || !government) {

        toast(
            "Name, position, and government are required."
        );

        return;
    }


    const officialData = {

        name,
        position,
        government,
        contactNumber,
        email,
        image

    };


    try {

        if (id) {

            await api(
                `/api/officials/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(
                        officialData
                    )
                }
            );

            toast(
                "Official updated successfully."
            );

        } else {

            await api(
                "/api/officials",
                {
                    method: "POST",
                    body: JSON.stringify(
                        officialData
                    )
                }
            );

            toast(
                "Official added successfully."
            );
        }


        closeOfficialModal();

        loadOfficials();


    } catch (error) {

        console.error(error);

        toast(error.message);
    }
}


/* =========================================================
   DELETE OFFICIAL
   ========================================================= */

async function deleteOfficial(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this official?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/api/officials/${id}`,
            {
                method: "DELETE"
            }
        );


        toast(
            "Official deleted successfully."
        );


        loadOfficials();


    } catch (error) {

        console.error(error);

        toast(error.message);
    }
}


/* =========================================================
   CHANGE PASSWORD MODAL
   ========================================================= */

function openPasswordModal() {

    document.getElementById(
        "passwordModal"
    )?.classList.remove("hidden");
}


function closePasswordModal() {

    document.getElementById(
        "passwordModal"
    )?.classList.add("hidden");
}


/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

async function changeAdminPassword(event) {

    event.preventDefault();


    const currentPassword =
        document.getElementById(
            "adminCurrentPassword"
        ).value;


    const newPassword =
        document.getElementById(
            "adminNewPassword"
        ).value;


    const confirmPassword =
        document.getElementById(
            "adminConfirmPassword"
        ).value;


    if (newPassword !== confirmPassword) {

        document.getElementById(
            "adminPasswordMessage"
        ).textContent =
            "Passwords do not match.";

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


        document.getElementById(
            "adminPasswordMessage"
        ).textContent =
            "Password changed successfully.";


        document.getElementById(
            "adminPasswordForm"
        ).reset();


        setTimeout(() => {

            closePasswordModal();

        }, 1000);


    } catch (error) {

        document.getElementById(
            "adminPasswordMessage"
        ).textContent =
            error.message;
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
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* ADMIN CHECK */

        if (!token()) {

            window.location.href =
                "admin-login.html";

            return;
        }


        const isAdmin =
            await loadAdminAccount();


        if (!isAdmin) {
            return;
        }


        /* LOAD OFFICIALS */

        loadOfficials();


        /* ADD BUTTON */

        document
            .getElementById(
                "addOfficialBtn"
            )
            ?.addEventListener(
                "click",
                openAddOfficial
            );


        /* CLOSE OFFICIAL MODAL */

        document
            .getElementById(
                "closeOfficialModal"
            )
            ?.addEventListener(
                "click",
                closeOfficialModal
            );


        document
            .getElementById(
                "cancelOfficialBtn"
            )
            ?.addEventListener(
                "click",
                closeOfficialModal
            );


        /* SAVE OFFICIAL */

        document
            .getElementById(
                "officialForm"
            )
            ?.addEventListener(
                "submit",
                saveOfficial
            );


        /* SEARCH */

        document
            .getElementById(
                "officialSearch"
            )
            ?.addEventListener(
                "input",
                event => {

                    loadOfficials(
                        event.target.value
                    );

                }
            );


        /* PASSWORD */

        document
            .getElementById(
                "adminPasswordBtn"
            )
            ?.addEventListener(
                "click",
                openPasswordModal
            );


        document
            .getElementById(
                "closePasswordModal"
            )
            ?.addEventListener(
                "click",
                closePasswordModal
            );


        document
            .getElementById(
                "adminPasswordForm"
            )
            ?.addEventListener(
                "submit",
                changeAdminPassword
            );


        /* LOGOUT */

        document
            .getElementById(
                "adminLogout"
            )
            ?.addEventListener(
                "click",
                logoutAdmin
            );


        /* CLOSE MODAL WHEN CLICKING OUTSIDE */

        document
            .getElementById(
                "officialModal"
            )
            ?.addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "officialModal"
                    ) {

                        closeOfficialModal();

                    }

                }
            );


        document
            .getElementById(
                "passwordModal"
            )
            ?.addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "passwordModal"
                    ) {

                        closePasswordModal();

                    }

                }
            );

    }
);