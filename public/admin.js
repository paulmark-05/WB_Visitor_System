let socket;

if (typeof io !== "undefined") {
    socket = io();

    socket.on("new-booking", () => {
        console.log("📥 New booking received");
        loadVisitors();
    });

    socket.on("counter-update", () => {
        console.log("🔁 Counter updated");
        loadCounters();
    });

} else {
    console.error("❌ Socket.IO not loaded");
}


function formatDate(dateStr){

    if(!dateStr) return "";

    const [year, month, day] =
    dateStr.split("-");

    return `${day}-${month}-${year}`;
}


let allData = [];

// ================= LOAD =================
async function loadVisitors() {

    const selectedDate = document.getElementById("dateFilter").value;

    const res = await fetch(`/admin/visitors?date=${selectedDate}`);
    allData = await res.json();

    populateFilterOptions();
    renderTable(allData);

}

// ================= TABLE =================
function renderTable(data) {

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    data.forEach(v => {

        const tr = document.createElement("tr");
        tr.dataset.id = v._id;

        tr.innerHTML = `
        <td>${formatDate(v.date)}</td>
        <td>${v.rank || ""}</td>
        <td>${v.name || ""}</td>
        <td>${v.phone}</td>
        <td>${v.email || "—"}</td>
        <td>${v.zsbId || "—"}</td>
        <td>${v.serviceNo || "-"}</td>
        <td>${v.subDivision}</td>
        <td>${v.workType}</td>
        <td>C${v.counter} / T${v.sequence}</td>
        <td>
        <input type="checkbox"
        ${v.status === "completed" ? "checked" : ""}
        onchange="toggleStatus('${v._id}', this.checked)">
        </td>
        `;

        tbody.appendChild(tr);


        if(
        v.status ===
        "completed"
        ){

            tr.classList.add(
                "completed-row"
            );
        }

        tr.addEventListener(
        "click",
        ()=>{

            document
            .querySelectorAll(
                "#tableBody tr"
            )
            .forEach(row =>
                row.classList.remove(
                    "selected-row"
                )
            );

            tr.classList.add(
                "selected-row"
            );

            tr.scrollIntoView({
                behavior:"smooth",
                block:"nearest"
            });

        });
    });
}


// ================= STATUS =================
async function toggleStatus(id, isChecked) {

    await fetch(`/admin/complete/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            status: isChecked ? "completed" : "pending"
        })
    });

    loadVisitors();
}

// ================= COUNTERS =================
async function loadCounters() {
    console.log("Loading counters...");

    const res = await fetch("/admin/counters");
    const data = await res.json();

    const panel = document.getElementById("counterPanel");
    panel.innerHTML = "";

    for (let i = 1; i <= 7; i++) {

        const isClosed = data.closedCounters.includes(i);

        const div = document.createElement("div");

        div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
            <span>Counter ${i}</span>

            <label class="switch">
                <input type="checkbox" ${!isClosed ? "checked" : ""}
                onchange="toggleCounter(${i}, this.checked)">
                <span class="sliderToggle"></span>
            </label>
        </div>
        `;

        div.style.color = isClosed ? "red" : "green";

        panel.appendChild(div);
    }
}

async function toggleCounter(counter, isOpen) {

    const url = isOpen ? "/admin/open-counter" : "/admin/close-counter";

    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counter })
    });

    loadCounters();
}

// ================= SEARCH =================
function populateFilterOptions() {

    const column = document.getElementById("columnSelect").value;
    const valueSelect = document.getElementById("valueSelect");

    valueSelect.innerHTML = "<option value=''>Select Value</option>";

    if (!column) return;

    const values = [...new Set(allData.map(v => v[column]))];

    values.forEach(val => {
        if (val) valueSelect.add(new Option(val, val));
    });
}

document.getElementById("columnSelect").addEventListener("change", populateFilterOptions);

function applyFilter(){

    const column =
    document.getElementById(
        "columnSelect"
    ).value;

    const value =
    document.getElementById(
        "valueSelect"
    ).value;

    const fromDate =
    document.getElementById(
        "fromDate"
    ).value;

    const toDate =
    document.getElementById(
        "toDate"
    ).value;

    let filtered =
    [...allData];

    // ===== COLUMN FILTER =====
    if(column && value){

        filtered =
        filtered.filter(v =>
            String(v[column])
            === value
        );
    }

    // ===== DATE RANGE =====
    if(fromDate){

        filtered =
        filtered.filter(v =>
            v.date >= fromDate
        );
    }

    if(toDate){

        filtered =
        filtered.filter(v =>
            v.date <= toDate
        );
    }

    renderTable(filtered);
}

function resetFilter(){

    document.getElementById(
        "columnSelect"
    ).value = "";

    document.getElementById(
        "valueSelect"
    ).innerHTML =
    `
    <option value="">
    Select Value
    </option>
    `;

    document.getElementById(
        "fromDate"
    ).value = "";

    document.getElementById(
        "toDate"
    ).value = "";

    renderTable(allData);
}


document.addEventListener("DOMContentLoaded", async () => {
    const exportBtn = document.getElementById("exportBtn");
    const exportModal = document.getElementById("exportModal");

    exportBtn.addEventListener("click", () => {
        exportModal.style.display = "flex";
    });

    const today =
    new Date()
    .toISOString()
    .split("T")[0];

    document.getElementById(
        "toDate"
    ).value = today;

    await loadVisitors();

    await loadCounters();
});





//export
async function startExport() {

    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;

    const fields = [...document.querySelectorAll(".field-grid input:checked")]
        .map(cb => cb.value);

    if (fields.length === 0) {
        alert("Select at least one field");
        return;
    }

    const query = new URLSearchParams({
        from: fromDate,
        to: toDate,
        fields: fields.join(",")
    });

    try {

        const response = await fetch(`/admin/export?${query.toString()}`);

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;
        a.download = "visitor-report.xlsx";

        document.body.appendChild(a);

        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);

        // toast
        const toast = document.getElementById("toast");

        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);

        closeExportModal();

    } catch (err) {

        console.error(err);
        alert("Excel download failed");

    }
}


// ================= EXPORT MODAL =================


function closeExportModal() {
    exportModal.style.display = "none";
}
