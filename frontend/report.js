document.addEventListener("DOMContentLoaded", async () => {

    /* =========================================================
       CONFIG
    ========================================================= */

    const API_URL =
        window.API_URL ||
        "https://brgy-complaint.onrender.com";

    const token = localStorage.getItem("barangay_token");

    if (!token) {
        window.location.href = "admin.html";
        return;
    }


    /* =========================================================
       API HELPER
    ========================================================= */

    async function api(path, options = {}) {

        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        headers.Authorization = `Bearer ${token}`;

        const response = await fetch(
            `${API_URL}${path}`,
            {
                ...options,
                headers
            }
        );

        if (!response.ok) {

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("barangay_token");
                localStorage.removeItem("barangay_role");

                window.location.href = "admin.html";
                return;
            }

            throw new Error(
                `Request failed: ${response.status}`
            );
        }

        return response.json();
    }


    /* =========================================================
       GET ADMIN INFORMATION
    ========================================================= */

    async function loadAdmin() {

        try {

            const me = await api("/api/auth/me");

            if (!me || me.role !== "admin") {
                localStorage.removeItem("barangay_token");
                localStorage.removeItem("barangay_role");

                window.location.href = "admin.html";
                return false;
            }

            const nameElement =
                document.getElementById("topName");

            const avatarElement =
                document.getElementById("topAvatar");

            if (nameElement) {
                nameElement.textContent =
                    me.username || me.name || "Administrator";
            }

            if (avatarElement) {

                const name =
                    me.username ||
                    me.name ||
                    "A";

                avatarElement.textContent =
                    name.charAt(0).toUpperCase();
            }

            return true;

        } catch (error) {

            console.error(
                "Failed to load admin:",
                error
            );

            return false;
        }
    }


    /* =========================================================
       LOAD REPORTS
    ========================================================= */

    async function loadReports() {

        try {

            const result =
                await api("/api/posts");

            /*
                Your API normally returns an array.

                This also protects against an API response
                such as { posts: [...] }.
            */

            const posts =
                Array.isArray(result)
                    ? result
                    : result.posts || [];


            /*
                IMPORTANT:

                Only posts with:

                    type: "complaint"

                are counted as reports.

                Announcements and community posts
                will NOT appear in the reports.
            */

            const reports =
                posts.filter(post =>
                    post.type === "complaint"
                );


            console.log(
                "All posts:",
                posts
            );

            console.log(
                "Complaint reports:",
                reports
            );


            initializeReports(reports);

        } catch (error) {

            console.error(
                "Failed to load reports:",
                error
            );

            showEmptyReports();
        }
    }


    /* =========================================================
       INITIALIZE REPORTS
    ========================================================= */

    function initializeReports(reports) {

        /*
            If there are no complaints,
            everything should show 0.
        */

        updateStatistics(reports);

        createMonthlyChart(reports);

        createCategoryChart(reports);

        createStatusChart(reports);

        createSummaryTable(reports);
    }


    /* =========================================================
       STATISTICS
    ========================================================= */

    function updateStatistics(reports) {

        const total =
            reports.length;

        const pending =
            reports.filter(post =>
                normalizeStatus(post.status) === "pending"
            ).length;

        const progress =
            reports.filter(post =>
                normalizeStatus(post.status) === "in progress"
            ).length;

        const resolved =
            reports.filter(post =>
                normalizeStatus(post.status) === "resolved"
            ).length;


        const totalElement =
            document.getElementById(
                "totalComplaints"
            );

        const pendingElement =
            document.getElementById(
                "pendingComplaints"
            );

        const progressElement =
            document.getElementById(
                "progressComplaints"
            );

        const resolvedElement =
            document.getElementById(
                "resolvedComplaints"
            );


        if (totalElement) {
            totalElement.textContent = total;
        }

        if (pendingElement) {
            pendingElement.textContent = pending;
        }

        if (progressElement) {
            progressElement.textContent = progress;
        }

        if (resolvedElement) {
            resolvedElement.textContent = resolved;
        }
    }


    /* =========================================================
       MONTHLY CHART
    ========================================================= */

    function createMonthlyChart(reports) {

        const canvas =
            document.getElementById(
                "monthlyChart"
            );

        if (!canvas) return;


        const yearFilter =
            document.getElementById(
                "yearFilter"
            );


        const currentYear =
            new Date().getFullYear();


        let selectedYear =
            yearFilter
                ? Number(yearFilter.value) ||
                currentYear
                : currentYear;


        const monthlyValues =
            Array(12).fill(0);


        reports.forEach(post => {

            if (!post.createdAt) return;

            const date =
                new Date(post.createdAt);

            if (
                date.getFullYear() ===
                selectedYear
            ) {

                monthlyValues[
                    date.getMonth()
                ]++;
            }
        });


        new Chart(canvas, {

            type: "line",

            data: {

                labels: [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec"
                ],

                datasets: [{

                    label: "Complaints",

                    data: monthlyValues,

                    borderWidth: 3,

                    tension: 0.35,

                    fill: true,

                    pointRadius: 4,

                    pointHoverRadius: 6
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    }
                },

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }


    /* =========================================================
       CATEGORY CHART
    ========================================================= */

    function createCategoryChart(reports) {

        const canvas =
            document.getElementById(
                "categoryChart"
            );

        if (!canvas) return;


        const categories = {};


        reports.forEach(post => {

            const category =
                post.category ||
                post.complaintCategory ||
                "Other";


            categories[category] =
                (categories[category] || 0) + 1;
        });


        const labels =
            Object.keys(categories);


        const values =
            Object.values(categories);


        /*
            When there are no reports,
            display a clean empty chart.
        */

        if (labels.length === 0) {

            labels.push("No Reports");
            values.push(0);
        }


        new Chart(canvas, {

            type: "doughnut",

            data: {

                labels: labels,

                datasets: [{

                    data: values,

                    borderWidth: 3
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
    }


    /* =========================================================
       STATUS CHART
    ========================================================= */

    function createStatusChart(reports) {

        const canvas =
            document.getElementById(
                "statusChart"
            );

        if (!canvas) return;


        let pending = 0;
        let progress = 0;
        let resolved = 0;


        reports.forEach(post => {

            const status =
                normalizeStatus(post.status);


            if (status === "pending") {
                pending++;
            }

            else if (status === "in progress") {
                progress++;
            }

            else if (status === "resolved") {
                resolved++;
            }
        });


        new Chart(canvas, {

            type: "doughnut",

            data: {

                labels: [
                    "Pending",
                    "In Progress",
                    "Resolved"
                ],

                datasets: [{

                    data: [
                        pending,
                        progress,
                        resolved
                    ],

                    borderWidth: 3
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
    }


    /* =========================================================
       SUMMARY TABLE
    ========================================================= */

    function createSummaryTable(reports) {

        const table =
            document.querySelector(
                ".report-summary"
            );

        if (!table) return;


        const pending =
            reports.filter(post =>
                normalizeStatus(post.status) === "pending"
            ).length;

        const progress =
            reports.filter(post =>
                normalizeStatus(post.status) === "in progress"
            ).length;

        const resolved =
            reports.filter(post =>
                normalizeStatus(post.status) === "resolved"
            ).length;


        /*
            Find existing summary rows.
            This works with the HTML structure
            you previously showed.
        */

        const rows =
            table.querySelectorAll(
                ".summary-row"
            );


        if (rows.length >= 4) {

            updateSummaryRow(
                rows[1],
                "Pending",
                pending
            );

            updateSummaryRow(
                rows[2],
                "In Progress",
                progress
            );

            updateSummaryRow(
                rows[3],
                "Resolved",
                resolved
            );
        }
    }


    function updateSummaryRow(
        row,
        status,
        count
    ) {

        if (!row) return;


        const cells =
            row.querySelectorAll(
                "span, strong"
            );


        if (cells.length > 0) {

            /*
                Don't destroy the existing
                status badge styling.
            */

            const countElement =
                row.querySelector(
                    ".summary-count"
                );

            if (countElement) {
                countElement.textContent =
                    count;
            }
        }
    }


    /* =========================================================
       NORMALIZE STATUS
    ========================================================= */

    function normalizeStatus(status) {

        return String(
            status || "Pending"
        )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
    }


    /* =========================================================
       EMPTY REPORTS
    ========================================================= */

    function showEmptyReports() {

        const ids = [
            "totalComplaints",
            "pendingComplaints",
            "progressComplaints",
            "resolvedComplaints"
        ];


        ids.forEach(id => {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent = "0";
            }
        });


        console.log(
            "No complaint reports found."
        );
    }


    /* =========================================================
       LOGOUT
    ========================================================= */

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "barangay_token"
                );

                localStorage.removeItem(
                    "barangay_role"
                );

                window.location.href =
                    "admin.html";
            }
        );
    }


    /* =========================================================
       START
    ========================================================= */

    const authenticated =
        await loadAdmin();


    if (authenticated) {
        await loadReports();
    }

});