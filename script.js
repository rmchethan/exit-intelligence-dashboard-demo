let exitData = [];
let headcountData = [];

let trendChart;
let reasonChart;

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

function calculateAttritionFromEmployeeFile(headcountData) {
    if (!headcountData.length) return "--";

    const activeCount = headcountData.filter(e =>
        e["Status"]?.toLowerCase() === "active"
    ).length;

    const exitedCount = headcountData.filter(e =>
        e["Status"]?.toLowerCase() === "exited"
    ).length;

    const totalEmployees = activeCount + exitedCount;

    if (!totalEmployees) return "--";

    return ((exitedCount / totalEmployees) * 100).toFixed(1) + "%";
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
    const highestDept = getHighestAttritionDept(exitData);
    const highPerfLoss = calculateHighPerformerLoss(exitData);

    let attritionRate = "--";
    if (headcountData.length) {
    attritionRate = calculateAttritionFromEmployeeFile(headcountData);
    }

    document.getElementById("kpiAttrition").innerText = attritionRate;

    // Update KPI cards
    document.getElementById("kpiTotalExits").innerText = totalExits;
    document.getElementById("kpiVoluntary").innerText = voluntaryPercent + "%";
    document.getElementById("kpiTenure").innerText = avgTenure + " months";
    document.getElementById("kpiReason").innerText = topReason;
    document.getElementById("kpiHighestDept").innerText = highestDept;
    document.getElementById("kpiHighPerf").innerText = highPerfLoss;
    
    // Update insight panel
    document.getElementById("highestReason").innerText = `${getHighestReason(exitData).reason} (${getHighestReason(exitData).count})`;
    document.getElementById("insightPanel").innerText = generateInsights(exitData);

    // Populate filters
    populateBranchFilter(exitData);

    // Render all charts for the full dataset by default
    renderReasonChart(exitData);
    renderTrendChart(exitData);
    renderDepartmentChart(exitData);
}



function applyFilters() {
    const gender = document.getElementById("genderFilter").value;
    const branch = document.getElementById("branchFilter").value;

    let filtered = exitData;

    if (gender !== "All") filtered = filtered.filter(d => d["Gender"] === gender);
    if (branch !== "All") filtered = filtered.filter(d => d["Branch"] === branch);

    // Update charts and insights for filtered data
    renderReasonChart(filtered);
    renderTrendChart(filtered);
    renderDepartmentChart(filtered);
    document.getElementById("insightPanel").innerText = generateInsights(filtered);
}


document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("genderFilter").addEventListener("change", applyFilters);
    document.getElementById("branchFilter").addEventListener("change", applyFilters);
    const topReason = getTopExitReason(exitData);
    document.getElementById("kpiReason").innerText = topReason;
});


  

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

function getHighestAttritionDept(data) {
    const deptCounts = {};
    data.forEach(d => {
        const dept = d["Department"] || "Unknown";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    let highestDept = "--";
    let max = 0;

    for (let dept in deptCounts) {
        if (deptCounts[dept] > max) {
            max = deptCounts[dept];
            highestDept = dept;
        }
    }

    return highestDept;
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

function calculateHighPerformerLoss(data) {
    if (!data.length) return "--";

    const highPerformers = data.filter(d =>
        d["Performance Rating"]?.toLowerCase().includes("high") ||
        d["Performance Rating"] === "1+" ||
        d["Performance Rating"] === "1"
    );

    const percent = ((highPerformers.length / data.length) * 100).toFixed(1);

    return percent + "%";
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
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom"
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.raw;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${value} (${percentage}%)`;
                    }
                }
            },
            datalabels: {
                color: "#fff",
                font: {
                    weight: "bold",
                    size: 12
                },
                formatter: function(value) {
                    const percentage = ((value / total) * 100).toFixed(1);
                    return percentage + "%";
                }
            }
        }
    },
    plugins: [ChartDataLabels]
});
    }

function calculateQuarterlyAttrition(exitData, headcountData) {
    if (!headcountData.length) return null;

    const quarterlyExits = calculateQuarterlyTrend(exitData);
    const quarterlyHeadcount = {};

    headcountData.forEach(row => {
        const quarter = getQuarter(row["Date"]);
        if (!quarter) return;

        quarterlyHeadcount[quarter] = parseFloat(row["Headcount"] || 0);
    });

    const result = {};

    for (let quarter in quarterlyExits) {
        const exits = quarterlyExits[quarter];
        const hc = quarterlyHeadcount[quarter];

        if (hc) {
            result[quarter] = ((exits / hc) * 100).toFixed(1);
        }
    }

    return result;
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
                data: values,
                backgroundColor: "#4caf50"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: function(value, context) {
                        const sum = context.chart.data.datasets[0].data
                            .reduce((a, b) => a + b, 0);
                        return ((value / sum) * 100).toFixed(1) + "%";
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
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

document.getElementById("processBtn").addEventListener("click", function () {
    const exitFile = document.getElementById("exitFile").files[0];
    if (!exitFile) {
        updateStatus("❌ Exit file is required.");
        return;
    }
    parseCSV(exitFile, "exit");
});

function calculateQuarterlyAttrition(exitData, headcountData) {
    if (!headcountData.length) return null;

    const quarterlyExits = calculateQuarterlyTrend(exitData);
    const quarterlyHeadcount = {};

    headcountData.forEach(row => {
        const quarter = getQuarter(row["Date"]);
        if (!quarter) return;

        quarterlyHeadcount[quarter] = parseFloat(row["Headcount"] || 0);
    });

    const result = {};

    for (let quarter in quarterlyExits) {
        const exits = quarterlyExits[quarter];
        const hc = quarterlyHeadcount[quarter];

        if (hc) {
            result[quarter] = ((exits / hc) * 100).toFixed(1);
        }
    }

    return result;
}































