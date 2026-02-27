let exitData = [];
let headcountData = [];

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
    document.getElementById("statusOutput").innerHTML = message;
}