async function checkAuth() {

    try {

        const res =
            await fetch(
                "/check-auth"
            );

        const data =
            await res.json();

        if (
            !data.authenticated
        ) {

            window.location.href =
                "/admin-login.html";

            return false;
        }

        return data;
    }

    catch (err) {

        window.location.href =
            "/admin-login.html";

        return false;
    }
}

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


function formatDate(dateStr) {

    if (!dateStr) return "";

    const [year, month, day] =
        dateStr.split("-");

    return `${day}/${month}/${year}`;
}

function formatRegistration(dateStr) {

    if (!dateStr)
        return "—";

    const d =
        new Date(dateStr);

    const day =
        String(
            d.getDate()
        ).padStart(2, "0");

    const month =
        String(
            d.getMonth() + 1
        ).padStart(2, "0");

    const hour =
        String(
            d.getHours()
        ).padStart(2, "0");

    const minute =
        String(
            d.getMinutes()
        ).padStart(2, "0");

    return `${day}/${month} ${hour}:${minute}`;
}


let allData = [];



// ================= LOAD =================
async function loadVisitors() {

    const selectedDate = document.getElementById("dateFilter").value;

    const res = await fetch(`/admin/visitors?date=${selectedDate}`);
    allData = await res.json();

    populateFilterOptions();
    renderTable(allData);
    updateCounters();

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
        <td>${v.workType}</td>
        <td>C${v.counter} / T${v.sequence}</td>
        <td>
        <input type="checkbox"
        ${v.status === "completed" ? "checked" : ""}
        onchange="toggleStatus('${v._id}', this.checked)">
        </td>
        <td>${v.subDivision}</td>
        <td>${v.zsbId || "—"}</td>
        <td>${v.serviceNo || "-"}</td>
        <td>${v.phone}</td>
        <td>${v.email || "—"}</td>
        <td>${formatRegistration(v.createdAt)}</td>
        
        `;

        tbody.appendChild(tr);


        if (
            v.status ===
            "completed"
        ) {

            tr.classList.add(
                "completed-row"
            );
        }

        tr.addEventListener(
            "click",
            () => {

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
                    behavior: "smooth",
                    block: "nearest"
                });

            });
    });
}
function updateCounters(data = allData) {

    const total =
        data.length;

    const completed =
        data.filter(
            v =>
                v.status ===
                "completed"
        ).length;

    const pending =
        data.filter(
            v =>
                v.status !==
                "completed"
        ).length;

    document.getElementById(
        "totalCount"
    ).textContent =
        total;

    document.getElementById(
        "completedCount"
    ).textContent =
        completed;

    document.getElementById(
        "pendingCount"
    ).textContent =
        pending;
}

async function toggleStatus(
    id,
    isChecked
) {

    const newStatus =
        isChecked
            ? "completed"
            : "pending";

    await fetch(
        `/admin/complete/${id}`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                status: newStatus
            })
        }
    );

    // UPDATE allData
    const visitor =
        allData.find(
            v => v._id === id
        );

    if (visitor) {

        visitor.status =
            newStatus;
    }

    // UPDATE ROW STYLE
    const row =
        document.querySelector(
            `tr[data-id="${id}"]`
        );

    if (!row) return;

    if (isChecked) {

        row.classList.add(
            "completed-row"
        );

    } else {

        row.classList.remove(
            "completed-row"
        );
    }

    updateCounters(allData);
}

// ================= COUNTERS =================
async function loadCounters() {

    const dateInput =
        document
            .getElementById(
                "dateFilter"
            );

    const selectedDate =

        dateInput?.value?.trim()

            ? dateInput.value

            : new Date()
                .toISOString()
                .split("T")[0];
    const res =

        await fetch(

            `/admin/counters?date=${selectedDate}`
        );

    const data =
        await res.json();

    const panel =
        document.getElementById(
            "counterPanel"
        );

    panel.innerHTML =
        "";

    for (
        let i = 1;
        i <= 7;
        i++
    ) {

        const isClosed =

            data
                .closedCounters
                .includes(i);

        const div =
            document.createElement(
                "div"
            );

        div.innerHTML =
            `
        <div style="
        display:flex;
        align-items:center;
        gap:8px;
        ">

            <span>
            Counter ${i}
            </span>

            <label class="switch">

            <input
            type="checkbox"

            ${!isClosed
                ? "checked"
                : ""}

            onchange=
            "toggleCounter(
            ${i},
            this.checked
            )">

            <span class=
            "sliderToggle">
            </span>

            </label>

        </div>
        `;

        div.style.color =

            isClosed
                ? "red"
                : "green";

        panel.appendChild(
            div
        );
    }
}

async function toggleCounter(
    counter,
    isOpen
) {

    const dateInput =
        document
            .getElementById(
                "dateFilter"
            );

    const selectedDate =

        dateInput?.value?.trim()

            ? dateInput.value

            : new Date()
                .toISOString()
                .split("T")[0];

    const url =

        isOpen

            ? "/admin/open-counter"

            : "/admin/close-counter";

    await fetch(

        url,

        {

            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify({

                    counter,

                    date: selectedDate
                })
        }
    );

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

function applyFilter() {

    const column =
        document.getElementById(
            "columnSelect"
        ).value;

    const value =
        document.getElementById(
            "valueSelect"
        ).value;


    let filtered =
        [...allData];

    // ===== COLUMN FILTER =====
    if (column && value) {

        filtered =
            filtered.filter(v =>
                String(v[column])
                === value
            );
    }

    renderTable(filtered);
    updateCounters(filtered);
}

function resetFilter() {

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


    renderTable(allData);
    updateCounters(allData);
}


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const session =
            await checkAuth();

        if (!session)
            return;

        window.currentUser =
            session.user;

        if (window.currentUser.role === "counter") {

            document
                .getElementById("counterControlSection")
                .style.display = "none";

        }

        document.body.style.display =
            "block";

        const exportBtn = document.getElementById("exportBtn");
        const exportModal = document.getElementById("exportModal");

        exportBtn.addEventListener("click", () => {
            exportModal.style.display = "flex";
        });

        document
            .getElementById(
                "dateFilter"
            )
            .value =

            new Date()
                .toISOString()
                .split("T")[0];

        await loadVisitors();

        await loadCounters();

        document
            .getElementById(
                "dateFilter"
            )
            .addEventListener(

                "change",

                async () => {

                    await loadVisitors();

                    await loadCounters();
                }
            );
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

// ================= LOGOUT =================

async function logout() {

    const confirmLogout =
        confirm(
            "Logout from admin panel?"
        );

    if (
        !confirmLogout
    ) return;

    await fetch(
        "/logout",
        {
            method: "POST"
        }
    );

    window.location.href =
        "/admin-login.html";
}
