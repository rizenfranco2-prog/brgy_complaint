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

    const element = document.getElementById("toast");

    if (!element) return;

    element.textContent = message;

    element.classList.add("show");

    setTimeout(() => {
        element.classList.remove("show");
    }, 2500);
}


/* =========================================================
   LOAD OFFICIALS
   ========================================================= */

async function loadOfficials(search = "") {

    const cityContainer =
        document.getElementById("cityOfficials");

    const barangayContainer =
        document.getElementById("barangayOfficials");


    if (cityContainer) {
        cityContainer.innerHTML = `
            <div class="official-empty">
                <strong>Loading officials...</strong>
                Please wait.
            </div>
        `;
    }


    if (barangayContainer) {
        barangayContainer.innerHTML = `
            <div class="official-empty">
                <strong>Loading officials...</strong>
                Please wait.
            </div>
        `;
    }


    try {

        const query = search.trim()
            ? `?search=${encodeURIComponent(search.trim())}`
            : "";


        const data =
            await api(`/api/officials${query}`);


        const officials =
            data.officials || [];


        const cityOfficials =
            officials.filter(
                official =>
                    official.government === "City Government"
            );


        const barangayOfficials =
            officials.filter(
                official =>
                    official.government === "Barangay Government"
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

        if (cityContainer) {
            cityContainer.innerHTML = `
                <div class="official-empty">
                    Failed to load officials.
                </div>
            `;
        }

        if (barangayContainer) {
            barangayContainer.innerHTML = `
                <div class="official-empty">
                    Failed to load officials.
                </div>
            `;
        }

        toast(error.message);
    }
}


/* =========================================================
   RENDER
   ========================================================= */

function renderOfficials(container, officials) {

    if (!container) return;


    if (!officials.length) {

        container.innerHTML = `
            <div class="official-empty">
                <strong>No officials found.</strong>
                Add an official using the button above.
            </div>
        `;

        return;
    }


    container.innerHTML =
        officials.map(createOfficialCard).join("");
}


/* =========================================================
   OFFICIAL CARD
   ========================================================= */

function createOfficialCard(official) {

    const photo = official.image
        ? `
            <img
                src="${escapeHTML(official.image)}"
                class="official-image"
                alt="Official photo"
            >
        `
        : `
            <div class="official-avatar">
                ${escapeHTML(initials(official.name))}
            </div>
        `;


    return `
        <article
            class="official-card"
            data-id="${official._id}"
        >

            <div class="official-card-main">

                ${photo}

                <div class="official-info">

                    <h3>
                        ${escapeHTML(official.name)}
                    </h3>

                    <p class="official-position">
                        ${escapeHTML(official.position)}
                    </p>

                    ${official.barangay
            ? `
                                <p>
                                    Barangay:
                                    ${escapeHTML(
                official.barangay
            )}
                                </p>
                            `
            : ""
        }

                    ${official.contactNumber
            ? `
                                <p>
                                    ☎
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
                                    ✉
                                    ${escapeHTML(
                official.email
            )}
                                </p>
                            `
            : ""
        }

                </div>

            </div>


            <div class="official-actions">

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
}


/* =========================================================
   OPEN ADD
   ========================================================= */

function openAddOfficial() {

    const form =
        document.getElementById("officialForm");

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
        "officialModal"
    ).classList.remove("hidden");

    document.getElementById(
        "officialModal"
    ).classList.add("show");
}


/* =========================================================
   CLOSE ADD / EDIT MODAL
   ========================================================= */

function closeOfficialModal() {

    const modal =
        document.getElementById("officialModal");

    if (!modal) return;

    modal.classList.remove("show");
    modal.classList.add("hidden");
}


/* =========================================================
   EDIT
   ========================================================= */

async function editOfficial(id) {

    try {

        const data =
            await api("/api/officials");


        const official =
            (data.officials || []).find(
                item => item._id === id
            );


        if (!official) {

            toast("Official not found.");

            return;
        }


        document.getElementById(
            "officialModalTitle"
        ).textContent = "Edit Official";


        document.getElementById(
            "saveOfficialBtn"
        ).textContent = "Save Changes";


        document.getElementById(
            "officialId"
        ).value = official._id;


        document.getElementById(
            "officialName"
        ).value = official.name || "";


        document.getElementById(
            "officialPosition"
        ).value = official.position || "";


        document.getElementById(
            "officialGovernment"
        ).value = official.government || "";


        document.getElementById(
            "officialBarangay"
        ).value = official.barangay || "";


        document.getElementById(
            "officialContact"
        ).value = official.contactNumber || "";


        document.getElementById(
            "officialEmail"
        ).value = official.email || "";


        document.getElementById(
            "officialImage"
        ).value = official.image || "";


        document.getElementById(
            "officialModal"
        ).classList.remove("hidden");

        document.getElementById(
            "officialModal"
        ).classList.add("show");


    } catch (error) {

        console.error(error);

        toast(error.message);
    }
}


/* =========================================================
   SAVE
   ========================================================= */

async function saveOfficial(event) {

    event.preventDefault();


    const id =
        document.getElementById("officialId").value;


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
        barangay,
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
                    body: JSON.stringify(officialData)
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
                    body: JSON.stringify(officialData)
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
   DELETE
   ========================================================= */

async function deleteOfficial(id) {

    if (!confirm(
        "Are you sure you want to delete this official?"
    )) {
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
   PASSWORD MODAL
   ========================================================= */

function openPasswordModal() {

    const modal =
        document.getElementById("passwordModal");

    if (!modal) return;

    modal.classList.remove("hidden");
    modal.classList.add("show");
}


function closePasswordModal() {

    const modal =
        document.getElementById("passwordModal");

    if (!modal) return;

    modal.classList.remove("show");
    modal.classList.add("hidden");
}


/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

async function changePassword(event) {

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

        toast(
            "New passwords do not match."
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


        toast(
            "Password changed successfully."
        );


        document
            .getElementById("adminPasswordForm")
            ?.reset();


        closePasswordModal();


    } catch (error) {

        toast(error.message);
    }
}


/* =========================================================
   ADMIN AUTH
   ========================================================= */

async function checkAdmin() {

    if (!token()) {

        window.location.href =
            "admin-login.html";

        return false;
    }


    try {

        const me =
            await api("/api/auth/me");


        if (me.role !== "admin") {

            window.location.href =
                "dashboard.html";

            return false;
        }


        const adminName =
            me.account?.username ||
            me.user?.username ||
            "Admin";


        const adminAvatar =
            document.getElementById(
                "adminAvatar"
            );


        const adminNameElement =
            document.getElementById(
                "adminName"
            );


        const sidebarAvatar =
            document.getElementById(
                "sidebarAvatar"
            );


        const sidebarAdminName =
            document.getElementById(
                "sidebarAdminName"
            );


        if (adminNameElement) {
            adminNameElement.textContent =
                adminName;
        }


        if (adminAvatar) {
            adminAvatar.textContent =
                initials(adminName);
        }


        if (sidebarAdminName) {
            sidebarAdminName.textContent =
                adminName;
        }


        if (sidebarAvatar) {
            sidebarAvatar.textContent =
                initials(adminName);
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
   LOGOUT
   ========================================================= */

function logout() {

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

        const isAdmin =
            await checkAdmin();

        if (!isAdmin) return;


        /* ADD */

        document
            .getElementById("addOfficialBtn")
            ?.addEventListener(
                "click",
                openAddOfficial
            );


        /* SAVE */

        document
            .getElementById("officialForm")
            ?.addEventListener(
                "submit",
                saveOfficial
            );


        /* CLOSE */

        document
            .getElementById("closeOfficialModal")
            ?.addEventListener(
                "click",
                closeOfficialModal
            );


        /* CANCEL */

        document
            .getElementById("cancelOfficialBtn")
            ?.addEventListener(
                "click",
                closeOfficialModal
            );


        /* SEARCH */

        const searchInput =
            document.getElementById(
                "officialSearch"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                () => {

                    loadOfficials(
                        searchInput.value
                    );

                }
            );
        }


        /* PASSWORD */

        document
            .getElementById("adminPasswordBtn")
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
            .getElementById("adminPasswordForm")
            ?.addEventListener(
                "submit",
                changePassword
            );


        /* LOGOUT */

        document
            .getElementById("adminLogout")
            ?.addEventListener(
                "click",
                logout
            );


        /* LOAD */

        loadOfficials();

    }
);