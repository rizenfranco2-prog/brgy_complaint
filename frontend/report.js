document.addEventListener("DOMContentLoaded", () => {

    const monthlyData = {
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

        values: [
            12,
            18,
            15,
            22,
            27,
            31,
            25,
            20,
            29,
            24,
            17,
            14
        ]
    };


    /* =========================
       STATISTICS
    ========================= */

    const total = monthlyData.values.reduce(
        (sum, value) => sum + value,
        0
    );

    document.getElementById("totalComplaints").textContent = total;

    document.getElementById("pendingComplaints").textContent = 32;

    document.getElementById("progressComplaints").textContent = 47;

    document.getElementById("resolvedComplaints").textContent = 75;


    /* =========================
       MONTHLY CHART
    ========================= */

    const monthlyCanvas =
        document.getElementById("monthlyChart");

    new Chart(monthlyCanvas, {

        type: "line",

        data: {
            labels: monthlyData.labels,

            datasets: [{
                label: "Complaints",
                data: monthlyData.values,

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


    /* =========================
       CATEGORY CHART
    ========================= */

    const categoryCanvas =
        document.getElementById("categoryChart");

    new Chart(categoryCanvas, {

        type: "doughnut",

        data: {

            labels: [
                "Road & Infrastructure",
                "Waste Management",
                "Peace & Order",
                "Health",
                "Other"
            ],

            datasets: [{

                data: [
                    24,
                    18,
                    15,
                    12,
                    9
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


    /* =========================
       STATUS CHART
    ========================= */

    const statusCanvas =
        document.getElementById("statusChart");

    new Chart(statusCanvas, {

        type: "doughnut",

        data: {

            labels: [
                "Pending",
                "In Progress",
                "Resolved"
            ],

            datasets: [{

                data: [
                    32,
                    47,
                    75
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


    /* =========================
       LOGOUT
    ========================= */

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", () => {

            localStorage.removeItem("barangay_token");
            localStorage.removeItem("barangay_role");

            window.location.href = "index.html";

        });

    }

});