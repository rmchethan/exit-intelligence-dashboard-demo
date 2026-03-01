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
    console.log(exitData);
    if (!exitData.length) return;

    const totalExits = exitData.length;

    const voluntaryCount = exitData.filter(e =>
        e["Voluntary/Involuntary"]?.toLowerCase() === "voluntary"
    ).length;

    const voluntaryPercent = ((voluntaryCount / totalExits) * 100).toFixed(1);

    const avgTenure = calculateAverageTenure(exitData);

    const topReason = getTopExitReason(exitData);
    
    const highest = getHighestReason(exitData);
    document.getElementById("highestReason").innerText =
    `${highest.reason} (${highest.count})`;
    
    document.getElementById("insightPanel").innerText =
    generateInsights(exitData);

    //Populate Branch Dynamically
    populateBranchFilter(exitData);
    function applyFilters() {
    const gender = document.getElementById("genderFilter").value;
    const branch = document.getElementById("branchFilter").value;

    let filtered = exitData;

    if (gender !== "All") {
        filtered = filtered.filter(d => d["Gender"] === gender);
    }

    if (branch !== "All") {
        filtered = filtered.filter(d => d["Branch"] === branch);
    }

    renderReasonChart(filtered);
    renderTrendChart(filtered);
    renderDepartmentChart(filtered);

    document.getElementById("insightPanel").innerText =
        generateInsights(filtered);
    document.getElementById("genderFilter").addEventListener("change", applyFilters);
    document.getElementById("branchFilter").addEventListener("change", applyFilters);
}

    

    // Update KPI cards
    document.getElementById("kpiTotalExits").innerText = totalExits;
    document.getElementById("kpiVoluntary").innerText = voluntaryPercent + "%";
    document.getElementById("kpiTenure").innerText = avgTenure + " months";
    document.getElementById("kpiReason").innerText = topReason;

    renderReasonChart(exitData);
    renderTrendChart(exitData);
    renderDepartmentChart(exitData);
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

    const total = values.reduce((a, b) => a + b, 0);

    if (reasonChart) reasonChart.destroy();

    const ctx = document.getElementById("reasonChart").getContext("2d");

    reasonChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: values
            }]
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function getQuarter(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return null;

    const month = date.getMonth();
    const year = date.getFullYear();
    const quarter = Math.floor(month / 3) + 1;

    return `Q${quarter} ${year}`;
}

function calculateQuarterlyTrend(data) {
    const trend = {};

    data.forEach(record => {
        const quarter = getQuarter(record["Exit Date"]);
        if (!quarter) return;

        trend[quarter] = (trend[quarter] || 0) + 1;
    });

    return trend;
}

function renderTrendChart(data) {
    const trendData = calculateQuarterlyTrend(data);

    const labels = Object.keys(trendData).sort();
    const values = labels.map(label => trendData[label]);

    if (trendChart) trendChart.destroy();

    const ctx = document.getElementById("trendChart").getContext("2d");

    trendChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Exits per Quarter",
                data: values,
                fill: false,
                tension: 0.2
            }]
        }
    });
}

function getHighestReason(data) {
    const reasonCounts = {};

    data.forEach(record => {
        const reason = record["Exit Reason Category"] || "Unknown";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    let highestReason = null;
    let highestCount = 0;

    for (let reason in reasonCounts) {
        if (reasonCounts[reason] > highestCount) {
            highestCount = reasonCounts[reason];
            highestReason = reason;
        }
    }

    return {
        reason: highestReason,
        count: highestCount
    };
}

// Department Breakdown Bar Chart

let departmentChart;

function renderDepartmentChart(data) {
    const deptCounts = {};

    data.forEach(record => {
        const dept = record["Department"] || "Unknown";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const labels = Object.keys(deptCounts);
    const values = Object.values(deptCounts);

    if (departmentChart) departmentChart.destroy();

    const ctx = document.getElementById("departmentChart").getContext("2d");

    departmentChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Exits by Department",
                data: values
            }]
        }
    });
}

//Insight Panel (Rule-Based Intelligence)

function generateInsights(data) {
    const total = data.length;
    const voluntary = data.filter(d => d["Voluntary/Involuntary"] === "Voluntary").length;
    const involuntary = total - voluntary;

    const voluntaryRate = ((voluntary / total) * 100).toFixed(1);

    let insightText = "";

    if (voluntaryRate > 70) {
        insightText += "⚠ High voluntary attrition detected. Review engagement and retention strategies.\n\n";
    }

    const highest = getHighestReason(data);

    if (highest.reason === "Compensation") {
        insightText += "💰 Compensation is leading exit driver. Benchmark salary competitiveness.\n\n";
    }

    if (highest.reason === "Manager Issues") {
        insightText += "👥 Leadership risk indicator. Consider manager capability review.\n\n";
    }

    return insightText || "No major risk patterns detected.";
}

function populateBranchFilter(data) {
    const branches = [...new Set(data.map(d => d["Branch"]))];
    const branchSelect = document.getElementById("branchFilter");

    branchSelect.innerHTML = '<option value="All">All Branches</option>';

    branches.forEach(branch => {
        const option = document.createElement("option");
        option.value = branch;
        option.textContent = branch;
        branchSelect.appendChild(option);
    });
}










