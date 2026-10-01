document.addEventListener("DOMContentLoaded", async () => {

    /* =========================================================
       CONFIG
    ========================================================= */

    const API_URL =
        window.API_URL ||
        "https://brgy-complaint.onrender.com";

    const token =
        localStorage.getItem("barangay_token");

    if (!token) {
        window.location.href = "admin.html";
        return;
    }


    /* =========================================================
       CHART INSTANCES
    ========================================================= */

    let monthlyChart = null;
    let categoryChart = null;
    let statusChart = null;

    let allReports = [];


    /* =========================================================
       API HELPER
    ========================================================= */

    async function api(path, options = {}) {

        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        headers.Authorization =
            `Bearer ${token}`;

        const response = await fetch(
            `${API_URL}${path}`,
            {
                ...options,
                headers
            }
        );

        if (!response.ok) {

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem(
                    "barangay_token"
                );

                localStorage.removeItem(
                    "barangay_role"
                );

                window.location.href =
                    "admin.html";

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

            const me =
                await api("/api/auth/me");

            if (
                !me ||
                me.role !== "admin"
            ) {

                localStorage.removeItem(
                    "barangay_token"
                );

                localStorage.removeItem(
                    "barangay_role"
                );

                window.location.href =
                    "admin.html";

                return false;
            }


            /*
                Your backend may return:

                {
                    role: "admin",
                    account: {...}
                }

                So support both account and
                the older response structure.
            */

            const account =
                me.account ||
                me.user ||
                me;


            const name =
                account.username ||
                account.name ||
                "Administrator";


            const nameElement =
                document.getElementById(
                    "topName"
                );

            const avatarElement =
                document.getElementById(
                    "topAvatar"
                );


            if (nameElement) {
                nameElement.textContent =
                    name;
            }


            if (avatarElement) {

                avatarElement.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();
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

            /*
                IMPORTANT:

                Use the dedicated reports endpoint.

                This endpoint should include:
                - Pending complaints
                - In Progress complaints
                - Resolved complaints
                - Archived complaints

                This is better than /api/posts because
                resolved complaints are archived.
            */

            const result =
                await api(
                    "/api/reports/complaints"
                );


            /*
                Expected:

                {
                    complaints: [...]
                }
            */

            allReports =
                Array.isArray(
                    result?.complaints
                )
                    ? result.complaints
                    : Array.isArray(result)
                        ? result
                        : [];


            console.log(
                "Complaint Reports:",
                allReports
            );


            initializeReports();

        } catch (error) {

            console.error(
                "Failed to load reports:",
                error
            );

            allReports = [];

            showEmptyReports();
        }
    }


    /* =========================================================
       INITIALIZE
    ========================================================= */

    function initializeReports() {

        const yearFilter =
            document.getElementById(
                "yearFilter"
            );


        const currentYear =
            new Date().getFullYear();


        const selectedYear =
            yearFilter
                ? Number(yearFilter.value) ||
                currentYear
                : currentYear;


        const reports =
            filterByYear(
                allReports,
                selectedYear
            );


        console.log(
            `Reports for ${selectedYear}:`,
            reports
        );


        updateStatistics(reports);

        createMonthlyChart(reports);

        createCategoryChart(reports);

        createStatusChart(reports);

        createSummaryTable(reports);
    }


    /* =========================================================
       YEAR FILTER
    ========================================================= */

    function filterByYear(
        reports,
        year
    ) {

        return reports.filter(post => {

            if (!post.createdAt) {
                return false;
            }

            const date =
                new Date(post.createdAt);

            return (
                date.getFullYear() ===
                Number(year)
            );
        });
    }


    /* =========================================================
       STATISTICS
    ========================================================= */

    function updateStatistics(
        reports
    ) {

        const total =
            reports.length;


        const pending =
            reports.filter(post =>
                normalizeStatus(
                    post.status
                ) === "pending"
            ).length;


        const progress =
            reports.filter(post =>
                normalizeStatus(
                    post.status
                ) === "in progress"
            ).length;


        const resolved =
            reports.filter(post =>
                normalizeStatus(
                    post.status
                ) === "resolved"
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
            totalElement.textContent =
                total;
        }


        if (pendingElement) {
            pendingElement.textContent =
                pending;
        }


        if (progressElement) {
            progressElement.textContent =
                progress;
        }


        if (resolvedElement) {
            resolvedElement.textContent =
                resolved;
        }
    }


    /* =========================================================
       MONTHLY CHART
    ========================================================= */

    function createMonthlyChart(
        reports
    ) {

        const canvas =
            document.getElementById(
                "monthlyChart"
            );


        if (!canvas) return;


        /*
            Destroy previous chart.

            This prevents Chart.js from creating
            multiple charts when changing the year.
        */

        if (monthlyChart) {
            monthlyChart.destroy();
        }


        const monthlyValues =
            Array(12).fill(0);


        reports.forEach(post => {

            if (!post.createdAt) {
                return;
            }


            const date =
                new Date(post.createdAt);


            const month =
                date.getMonth();


            monthlyValues[month]++;
        });


        monthlyChart =
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

                        label:
                            "Complaints",

                        data:
                            monthlyValues,

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
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function (context) {

                                        return (
                                            " Complaints: " +
                                            context.raw
                                        );
                                    }
                            }
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

    function createCategoryChart(
        reports
    ) {

        const canvas =
            document.getElementById(
                "categoryChart"
            );


        if (!canvas) return;


        if (categoryChart) {
            categoryChart.destroy();
        }


        const categories = {};


        reports.forEach(post => {

            const category =
                post.category ||
                post.complaintCategory ||
                "Other";


            categories[category] =
                (categories[category] || 0) + 1;
        });


        let labels =
            Object.keys(categories);


        let values =
            Object.values(categories);


        /*
            Empty state
        */

        if (labels.length === 0) {

            labels = [
                "No Reports"
            ];

            values = [1];
        }


        categoryChart =
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

                            position:
                                "bottom"
                        }
                    }
                }
            });
    }


    /* =========================================================
       STATUS CHART
    ========================================================= */

    function createStatusChart(
        reports
    ) {

        const canvas =
            document.getElementById(
                "statusChart"
            );


        if (!canvas) return;


        if (statusChart) {
            statusChart.destroy();
        }


        let pending = 0;
        let progress = 0;
        let resolved = 0;


        reports.forEach(post => {

            const status =
                normalizeStatus(
                    post.status
                );


            if (
                status === "pending"
            ) {

                pending++;
            }

            else if (
                status === "in progress"
            ) {

                progress++;
            }

            else if (
                status === "resolved"
            ) {

                resolved++;
            }
        });


        statusChart =
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

                            position:
                                "bottom"
                        }
                    }
                }
            });
    }


    /* =========================================================
       SUMMARY TABLE
    ========================================================= */

    function createSummaryTable(
        reports
    ) {

        const table =
            document.querySelector(
                ".report-summary"
            );


        if (!table) {
            return;
        }


        const pending =
            reports.filter(post =>
                normalizeStatus(
                    post.status
                ) === "pending"
            ).length;


        const progress =
            reports.filter(post =>
                normalizeStatus(
                    post.status
                ) === "in progress"
            ).length;


        const resolved =
            reports.filter(post =>
                normalizeStatus(
                    post.status
                ) === "resolved"
            ).length;


        const rows =
            table.querySelectorAll(
                ".summary-row"
            );


        /*
            Expected structure:

            row 0 = header
            row 1 = Pending
            row 2 = In Progress
            row 3 = Resolved
        */

        if (rows.length >= 4) {

            updateSummaryRow(
                rows[1],
                pending
            );

            updateSummaryRow(
                rows[2],
                progress
            );

            updateSummaryRow(
                rows[3],
                resolved
            );
        }
    }


    function updateSummaryRow(
        row,
        count
    ) {

        if (!row) return;


        const countElement =
            row.querySelector(
                ".summary-count"
            );


        if (countElement) {

            countElement.textContent =
                count;
        }
    }


    /* =========================================================
       NORMALIZE STATUS
    ========================================================= */

    function normalizeStatus(
        status
    ) {

        return String(
            status || "Pending"
        )
            .trim()
            .toLowerCase()
            .replace(
                /\s+/g,
                " "
            );
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

                element.textContent =
                    "0";
            }
        });
    }


    /* =========================================================
       YEAR CHANGE
    ========================================================= */

    const yearFilter =
        document.getElementById(
            "yearFilter"
        );


    if (yearFilter) {

        yearFilter.addEventListener(
            "change",
            () => {

                initializeReports();
            }
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