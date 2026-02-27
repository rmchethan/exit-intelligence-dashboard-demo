let exitData = [];
let headcountData = [];

let trendChart;
let reasonChart;

document.getElementById("processBtn").addEventListener("click", function () {
    const exitFile = document.getElementById("exitFile").files[0];
    const headcountFile = document.getElementById("headcountFile").files[0];

    if (!exitFile) {
        updateStatus("❌ Exit file is required.");
        return;
    }

    parseCSV(exitFile, "exit");

    if (headcountFile) {
        parseCSV(headcountFile, "headcount");
    }
});

function parseCSV(file, type) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            if (type === "exit") {
                exitData = results.data;
                updateStatus("✅ Exit file loaded. Records: " + exitData.length);
                processExitData();
            } else {
                headcountData = results.data;
                updateStatus("✅ Headcount file loaded. Records: " + headcountData.length);
            }
        },
        error: function (error) {
            updateStatus("❌ Error parsing file: " + error.message);
        }
    });
}

function updateStatus(message) {
    document.getElementById("statusOutput").innerText = message;
}

function processExitData() {
    if (!exitData.length) return;

    const totalExits = exitData.length;

    const voluntaryCount = exitData.filter(e =>
        e["Voluntary/Involuntary"]?.toLowerCase() === "voluntary"
    ).length;

    const voluntaryPercent = ((voluntaryCount / totalExits) * 100).toFixed(1);

    const avgTenure = calculateAverageTenure(exitData);

    const topReason = getTopExitReason(exitData);

    // Update KPI cards
    document.getElementById("kpiTotalExits").innerText = totalExits;
    document.getElementById("kpiVoluntary").innerText = voluntaryPercent + "%";
    document.getElementById("kpiTenure").innerText = avgTenure + " months";
    document.getElementById("kpiReason").innerText = topReason;

    renderReasonChart(exitData);
}

function calculateAverageTenure(data) {
    let totalMonths = 0;
    let count = 0;

    data.forEach(record => {
        const joinDate = new Date(record["Join Date"]);
        const exitDate = new Date(record["Exit Date"]);

        if (!isNaN(joinDate) && !isNaN(exitDate)) {
            const months = (exitDate - joinDate) / (1000 * 60 * 60 * 24 * 30.44);
            totalMonths += months;
            count++;
        }
    });

    return count ? (totalMonths / count).toFixed(1) : "--";
}

function getTopExitReason(data) {
    const reasonCounts = {};

    data.forEach(record => {
        const reason = record["Exit Reason Category"] || "Unknown";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    let topReason = "--";
    let max = 0;

    for (let reason in reasonCounts) {
        if (reasonCounts[reason] > max) {
            max = reasonCounts[reason];
            topReason = reason;
        }
    }

    return topReason;
}

function renderReasonChart(data) {
    const reasonCounts = {};

    data.forEach(record => {
        const reason = record["Exit Reason Category"] || "Unknown";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const labels = Object.keys(reasonCounts);
    const values = Object.values(reasonCounts);

    if (reasonChart) reasonChart.destroy();

    const ctx = document.getElementById("reasonChart").getContext("2d");

    reasonChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: values
            }]
        }
    });
}
