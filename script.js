let exitData = [];
let headcountData = [];

let trendChart;
let reasonChart;

function updateStatus(message) {
    const statusEl = document.getElementById("statusOutput");
    if (statusEl) {
        statusEl.innerText = message;
    }
}



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

                // Update attrition KPI immediately
                const attritionRate = calculateAttritionRate();
                document.getElementById("kpiAttrition").innerText = attritionRate;
            }
        },
        error: function (error) {
            updateStatus("❌ Error parsing file: " + error.message);
        }
    });
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
    renderRiskHeatmap(exitData);
}



function applyFilters() {
    const gender = document.getElementById("genderFilter").value;
    const branch = document.getElementById("branchFilter").value;

    let filtered = exitData;

    if (gender !== "All") filtered = filtered.filter(d => d["Gender"] === gender);
    if (branch !== "All") filtered = filtered.filter(d => d["Branch"] === branch);

    renderReasonChart(filtered);
    renderTrendChart(filtered);
    renderDepartmentChart(filtered);
    renderRiskHeatmap(filtered);       // risk heatmap updates with filters
    renderSurvivalChart(filtered);      // survival curve updates with filters

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

function calculateDeptRisk(data) {
    const deptData = {};

    data.forEach(d => {
        const dept = d["Department"] || "Unknown";
        if (!deptData[dept]) {
            deptData[dept] = {
                total: 0,
                voluntary: 0,
                highPerfLoss: 0,
                avgTenureSum: 0,
                count: 0,
                topReason: {}
            };
        }

        deptData[dept].count += 1;
        if (d["Voluntary/Involuntary"]?.toLowerCase() === "voluntary") deptData[dept].voluntary += 1;
        if (d["Performance Rating"] === "1+" || d["Performance Rating"] === "1") deptData[dept].highPerfLoss += 1;

        const joinDate = new Date(d["Join Date"]);
        const exitDate = new Date(d["Exit Date"]);
        if (!isNaN(joinDate) && !isNaN(exitDate)) {
            const months = (exitDate - joinDate) / (1000*60*60*24*30.44);
            deptData[dept].avgTenureSum += months;
        }

        const reason = d["Exit Reason Category"] || "Unknown";
        deptData[dept].topReason[reason] = (deptData[dept].topReason[reason] || 0) + 1;
    });

    // Compute risk score
    const riskScores = [];
    for (let dept in deptData) {
        const info = deptData[dept];
        const voluntaryRate = info.voluntary / info.count;
        const highPerfRate = info.highPerfLoss / info.count;
        const avgTenure = info.avgTenureSum / info.count;
        const topReason = Object.keys(info.topReason).reduce((a,b) => info.topReason[a] > info.topReason[b] ? a : b);

        let score = 0;
        if (voluntaryRate > 0.5) score += 2;
        if (highPerfRate > 0.2) score += 3;
        if (avgTenure < 12) score += 1;
        if (topReason === "Manager Issues") score += 2;
        if (topReason === "Compensation") score += 1;

        riskScores.push({
            dept,
            score,
            voluntaryRate,
            highPerfRate,
            avgTenure,
            topReason
        });
    }

    return riskScores;
}


let riskHeatmapChart;

function renderRiskHeatmap(data) {
    const riskData = calculateDeptRisk(data);

    const labels = riskData.map(d => d.dept);
    const scores = riskData.map(d => d.score);
    const bgColors = scores.map(s => {
        if (s >= 6) return "#d32f2f";      // high risk
        else if (s >= 3) return "#fbc02d"; // medium risk
        else return "#388e3c";            // low risk
    });

    const ctx = document.getElementById("riskHeatmapChart").getContext("2d");
    if (riskHeatmapChart) riskHeatmapChart.destroy();

    riskHeatmapChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Risk Score",
                data: scores,
                backgroundColor: bgColors
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#fff',
                    font: { weight: 'bold' },
                    formatter: function(value) { return value; }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        },
        plugins: [ChartDataLabels]
    });
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

function calculateAttritionRate() {
    if (!headcountData.length) return "--";

    const totalEmployees = headcountData.length;

    const exitedEmployees = headcountData.filter(emp =>
        emp["Status"]?.toLowerCase() === "exited"
    ).length;

    if (totalEmployees === 0) return "--";

    const rate = ((exitedEmployees / totalEmployees) * 100).toFixed(1);

    return rate + "%";
}

let survivalChart;

function calculateSurvivalData(data) {
    // Prepare employee tenures in months
    const tenures = data.map(d => {
        const join = new Date(d["Join Date"]);
        const exit = d["Exit Date"] ? new Date(d["Exit Date"]) : new Date();
        if (isNaN(join) || isNaN(exit)) return null;
        return (exit - join) / (1000 * 60 * 60 * 24 * 30.44); // months
    }).filter(v => v !== null);

    tenures.sort((a, b) => a - b); // ascending

    const survival = [];
    const n = tenures.length;

    tenures.forEach((t, i) => {
        const survPercent = ((n - i) / n) * 100;
        survival.push({ tenure: t, survival: survPercent });
    });

    return survival;
}


function renderSurvivalChart(data) {
    const survivalData = calculateSurvivalData(data);
    const labels = survivalData.map(d => d.tenure.toFixed(1));
    const values = survivalData.map(d => d.survival.toFixed(1));

    const ctx = document.getElementById("survivalChart").getContext("2d");
    if (survivalChart) survivalChart.destroy();

    survivalChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Employee Survival %",
                data: values,
                fill: false,
                borderColor: "#1976d2",
                tension: 0.2,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true }
            },
            scales: {
                x: {
                    title: { display: true, text: "Tenure (Months)" }
                },
                y: {
                    title: { display: true, text: "Survival %" },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

































