/* =========================================================
   USER OFFICIALS
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
        throw new Error(
            data.message || "Request failed."
        );
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

    return (name || "U")
        .split(" ")
        .map(word => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}


/* =========================================================
   LOAD USER ACCOUNT
   ========================================================= */

async function loadUserAccount() {

    try {

        const me = await api("/api/auth/me");

        if (me.role !== "user") {

            window.location.href = "admin-dashboard.html";

            return false;
        }

        const user =
            me.account ||
            me.user ||
            {};

        const name =
            user.name ||
            "User";


        const topName =
            document.getElementById("topName");

        if (topName) {
            topName.textContent = name;
        }


        const topAvatar =
            document.getElementById("topAvatar");

        if (topAvatar) {
            topAvatar.textContent =
                initials(name);
        }


        const profileName =
            document.getElementById("profileName");

        if (profileName) {
            profileName.textContent = name;
        }


        const profileAvatar =
            document.getElementById("profileAvatar");

        if (profileAvatar) {
            profileAvatar.textContent =
                initials(name);
        }


        const modalName =
            document.getElementById("modalName");

        if (modalName) {
            modalName.textContent = name;
        }


        const modalEmail =
            document.getElementById("modalEmail");

        if (modalEmail) {
            modalEmail.textContent =
                user.email || "Email";
        }


        const modalAvatar =
            document.getElementById("modalAvatar");

        if (modalAvatar) {
            modalAvatar.textContent =
                initials(name);
        }


        return true;

    } catch (error) {

        console.error(error);

        localStorage.removeItem("barangay_token");
        localStorage.removeItem("barangay_role");

        window.location.href =
            "resident-login.html";

        return false;
    }
}


/* =========================================================
   LOAD OFFICIALS
   ========================================================= */

async function loadOfficials(search = "") {

    const cityContainer =
        document.getElementById("cityOfficials");

    const barangayContainer =
        document.getElementById("barangayOfficials");


    if (!cityContainer || !barangayContainer) {
        return;
    }


    cityContainer.innerHTML = `
        <div class="official-empty">
            <strong>Loading officials...</strong>
            <span>Please wait.</span>
        </div>
    `;


    barangayContainer.innerHTML = `
        <div class="official-empty">
            <strong>Loading officials...</strong>
            <span>Please wait.</span>
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

        console.error(
            "Failed to load officials:",
            error
        );


        cityContainer.innerHTML = `
            <div class="official-empty">
                <strong>Unable to load officials.</strong>
                <span>${escapeHTML(error.message)}</span>
            </div>
        `;


        barangayContainer.innerHTML = `
            <div class="official-empty">
                <strong>Unable to load officials.</strong>
                <span>${escapeHTML(error.message)}</span>
            </div>
        `;
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
                <span>No officials are currently listed.</span>
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
                            src="${escapeHTML(official.image)}"
                            class="official-photo"
                            alt="${escapeHTML(official.name)}"
                        >
                    `
                    : `
                        <div class="official-photo official-initials">
                            ${escapeHTML(
                        initials(official.name)
                    )}
                        </div>
                    `;


            return `
                <article class="official-card">

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

                </article>
            `;

        }).join("");
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logoutUser() {

    localStorage.removeItem(
        "barangay_token"
    );

    localStorage.removeItem(
        "barangay_role"
    );

    window.location.href =
        "resident-login.html";
}


/* =========================================================
   PROFILE MODAL
   ========================================================= */

function openProfileModal() {

    document
        .getElementById("profileModal")
        ?.classList.remove("hidden");
}


function closeProfileModal() {

    document
        .getElementById("profileModal")
        ?.classList.add("hidden");
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (!token()) {

            window.location.href =
                "resident-login.html";

            return;
        }


        const isUser =
            await loadUserAccount();


        if (!isUser) {
            return;
        }


        /* LOAD OFFICIALS */

        loadOfficials();


        /* SEARCH */

        document
            .getElementById("officialSearch")
            ?.addEventListener(
                "input",
                event => {

                    loadOfficials(
                        event.target.value
                    );

                }
            );


        /* PROFILE */

        document
            .getElementById("profileBtn")
            ?.addEventListener(
                "click",
                openProfileModal
            );


        document
            .getElementById("topProfileBtn")
            ?.addEventListener(
                "click",
                openProfileModal
            );


        document
            .getElementById("closeProfileModal")
            ?.addEventListener(
                "click",
                closeProfileModal
            );


        /* LOGOUT */

        document
            .getElementById("logoutBtn")
            ?.addEventListener(
                "click",
                logoutUser
            );


        /* CLOSE MODAL OUTSIDE */

        document
            .getElementById("profileModal")
            ?.addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "profileModal"
                    ) {

                        closeProfileModal();

                    }

                }
            );

    }
);