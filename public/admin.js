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

let users = [];

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
let selectedVisitorIds = new Set();



// ================= LOAD =================
async function loadVisitors() {

    const selectedDate = document.getElementById("dateFilter").value;

    const res = await fetch(`/admin/visitors?date=${selectedDate}`);
    allData = await res.json();

    populateFilterOptions();
    renderTable(allData);
    updateCounters();

}

async function loadUsers() {

    try {

        const response = await fetch("/admin/users", {
            credentials: "same-origin"
        });

        const result = await response.json();

        if (!result.success) {

            alert(result.message || "Unable to load users.");
            return;
        }

        users = result.data;

        renderUsers();

    } catch (err) {

        console.error(err);

        alert("Unable to load users.");

    }

}

function renderUsers() {

    const tbody =
        document.getElementById("usersTableBody");

    tbody.innerHTML = "";

    users.forEach(user => {

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>${user.username}</td>

            <td>
                ${user.role === "superadmin"
                ? "Super Admin"
                : "Counter Admin"
            }
            </td>

            <td>
                ${user.assignedCounter
                ? `Counter ${user.assignedCounter}`
                : "-"
            }
            </td>

            <td>

                ${user.active

                ? "<span class='status-active'>Active</span>"

                : "<span class='status-disabled'>Disabled</span>"
            }

            </td>

            <td>

                ${user.lastLogin

                ? new Date(
                    user.lastLogin
                ).toLocaleString()

                : "-"

            }

            </td>

            <td>

                <button
                    onclick="resetPassword('${user._id}')">

                    Reset Password

                </button>

                ${user.role !== "superadmin"

                ?

                `<button
                        onclick="toggleUserStatus('${user._id}', ${user.active})">

                        ${user.active ? "Disable" : "Enable"}

                    </button>`

                :

                ""

            }

                ${user.role !== "superadmin"

                ?

                `<button
                        class="danger-btn"
                        onclick="deleteUser('${user._id}', '${user.username}')">

                        Delete

                    </button>`

                :

                ""

            }

            </td>

        `;

        tbody.appendChild(row);

    });

}

async function createUser() {
console.log("Create User clicked");
    const username =
        document
            .getElementById(
                "newUsername")
            .value.trim();

    const password =
        document
            .getElementById(
                "newPassword")
            .value;

    const assignedCounter =
        document
            .getElementById(
                "newCounter")
            .value;

    if (
        !username ||
        !password ||
        !assignedCounter
    ) {

        alert(
            "Please complete all fields."
        );

        return;

    }

    const saveBtn =
        document.getElementById("saveUserBtn");

    saveBtn.disabled = true;


    const response =
        await fetch(
            "/admin/users",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    username,

                    password,

                    role: "counter",

                    assignedCounter

                })

            }

        );

    const result =
        await response.json();

    saveBtn.disabled = false;

    if (!result.success) {

        showToast(result.message);

        return;

    }

    closeCreateUserModal();

    await loadUsers();
    showToast("User created successfully.");

}

async function toggleUserStatus(id, currentActive) {

    const response =
        await fetch(
            `/admin/users/${id}/status`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    active: !currentActive
                })
            }
        );

    const result =
        await response.json();

    if (!result.success) {

        showToast(result.message || "Unable to update user.");
        return;

    }

    await loadUsers();
    showToast(result.message);

}

let resetPasswordTargetId = null;

function resetPassword(id) {

    const user =
        users.find(u => u._id === id);

    resetPasswordTargetId = id;

    document.getElementById("resetPasswordUsername").textContent =
        user ? `Resetting password for "${user.username}"` : "";

    document.getElementById("resetNewPassword").value = "";
    document.getElementById("resetConfirmPassword").value = "";
    document.getElementById("resetPasswordError").textContent = "";

    document.getElementById("resetPasswordModal").style.display = "flex";

}

function closeResetPasswordModal() {

    document.getElementById("resetPasswordModal").style.display = "none";
    resetPasswordTargetId = null;

}

function toggleResetPasswordVisibility(inputId, iconEl) {

    const input = document.getElementById(inputId);
    input.type = input.type === "password" ? "text" : "password";
    iconEl.textContent = input.type === "password" ? "👁" : "🙈";

}

async function confirmResetPassword() {

    const newPassword =
        document.getElementById("resetNewPassword").value;

    const confirmPassword =
        document.getElementById("resetConfirmPassword").value;

    const errorEl =
        document.getElementById("resetPasswordError");

    errorEl.textContent = "";

    if (!newPassword || !confirmPassword) {

        errorEl.textContent = "Fill in both fields.";
        return;

    }

    if (newPassword !== confirmPassword) {

        errorEl.textContent = "Passwords do not match.";
        return;

    }

    const response =
        await fetch(
            `/admin/users/${resetPasswordTargetId}/password`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    password: newPassword
                })
            }
        );

    const result =
        await response.json();

    if (!result.success) {

        errorEl.textContent = result.message || "Unable to reset password.";
        return;

    }

    closeResetPasswordModal();
    showToast(result.message || "Password updated.");

}

// ================= ACCOUNT SETTINGS =================

async function openAccountSettingsModal() {

    if (users.length === 0) {
        await loadUsers();
    }

    const me =
        users.find(u => u.username === window.currentUser.username);

    document.getElementById("accountEmail").value =
        (me && me.email) || "";

    document.getElementById("accountSettingsModal").style.display = "flex";

}

function closeAccountSettingsModal() {

    document.getElementById("accountSettingsModal").style.display = "none";

}

async function saveAccountEmail() {

    const email =
        document.getElementById("accountEmail").value.trim();

    if (!email) {
        showToast("Enter an email address.");
        return;
    }

    const response =
        await fetch(
            "/admin/account/email",
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ email })
            }
        );

    const result =
        await response.json();

    if (!result.success) {

        showToast(result.message || "Unable to update email.");
        return;

    }

    closeAccountSettingsModal();
    showToast("Email updated successfully.");

}

async function deleteUser(id, username) {

    const confirmDelete =
        confirm(
            `Permanently delete user "${username}"? This cannot be undone.`
        );

    if (!confirmDelete) return;

    const response =
        await fetch(
            `/admin/users/${id}`,
            {
                method: "DELETE"
            }
        );

    const result =
        await response.json();

    if (!result.success) {

        showToast(result.message || "Unable to delete user.");
        return;

    }

    await loadUsers();
    showToast("User deleted successfully.");

}

// ================= TABLE =================
function renderTable(data) {

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    data.forEach(v => {

        const tr = document.createElement("tr");
        tr.dataset.id = v._id;

        tr.innerHTML = `
        ${window.currentUser && window.currentUser.role === "superadmin"
            ? `<td onclick="event.stopPropagation()">
                <input type="checkbox"
                class="visitor-select-checkbox"
                data-id="${v._id}"
                ${selectedVisitorIds.has(v._id) ? "checked" : ""}
                onchange="toggleVisitorSelection('${v._id}', this.checked)">
                </td>`
            : ""
        }
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
        ${window.currentUser && window.currentUser.role === "superadmin"
            ? `<td><button class="danger-btn" onclick="deleteVisitor(event, '${v._id}')">Delete</button></td>`
            : ""
        }
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

async function deleteVisitor(event, id) {

    event.stopPropagation();

    const confirmDelete =
        confirm(
            "Permanently delete this visitor record? This cannot be undone."
        );

    if (!confirmDelete) return;

    const response =
        await fetch(
            `/admin/visitors/${id}`,
            {
                method: "DELETE"
            }
        );

    const result =
        await response.json();

    if (!result.success) {

        showToast(result.message || "Unable to delete visitor record.");
        return;

    }

    allData =
        allData.filter(v => v._id !== id);

    selectedVisitorIds.delete(id);
    updateSelectedCount();

    renderTable(allData);
    updateCounters(allData);
    showToast("Visitor record deleted.");

}

// ================= MULTI-SELECT DELETE =================

function toggleVisitorSelection(id, isChecked) {

    if (isChecked) {
        selectedVisitorIds.add(id);
    } else {
        selectedVisitorIds.delete(id);
    }

    updateSelectedCount();

}

function updateSelectedCount() {

    const countEl =
        document.getElementById("selectedCount");

    const btn =
        document.getElementById("deleteSelectedBtn");

    if (!countEl || !btn) return;

    countEl.textContent =
        selectedVisitorIds.size;

    btn.disabled =
        selectedVisitorIds.size === 0;

}

async function deleteSelectedVisitors() {

    if (selectedVisitorIds.size === 0) return;

    const ids =
        [...selectedVisitorIds];

    const confirmDelete =
        confirm(
            `Permanently delete ${ids.length} selected visitor record(s)? This cannot be undone.`
        );

    if (!confirmDelete) return;

    const response =
        await fetch(
            "/admin/visitors",
            {
                method: "DELETE",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ ids })
            }
        );

    const result =
        await response.json();

    if (!result.success) {

        showToast(result.message || "Unable to delete records.");
        return;

    }

    selectedVisitorIds.clear();
    updateSelectedCount();

    showToast(`Deleted ${result.deletedCount} record(s).`);

    await loadVisitors();

}

async function purgeVisitorsInRange() {

    const from =
        document.getElementById("purgeFromDate").value;

    const to =
        document.getElementById("purgeToDate").value;

    if (!from || !to) {

        alert("Select both a From and a To date first.");
        return;

    }

    if (from > to) {

        alert("The From date must be on or before the To date.");
        return;

    }

    const confirmPurge =
        confirm(
            `Permanently delete ALL visitor records from ${from} to ${to} (inclusive)? This cannot be undone.`
        );

    if (!confirmPurge) return;

    const response =
        await fetch(
            "/admin/visitors",
            {
                method: "DELETE",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ from, to })
            }
        );

    const result =
        await response.json();

    if (!result.success) {

        showToast(result.message || "Unable to delete records.");
        return;

    }

    showToast(`Deleted ${result.deletedCount} record(s).`);

    await loadVisitors();

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

function closeCreateUserModal() {

    document.getElementById(
        "createUserModal"
    ).style.display = "none";

    document.getElementById(
        "newUsername"
    ).value = "";

    document.getElementById(
        "newPassword"
    ).value = "";

    document.getElementById(
        "newCounter"
    ).value = "";

}

window.addEventListener("click", function (event) {

    const modal =
        document.getElementById("createUserModal");

    if (event.target === modal) {

        closeCreateUserModal();

    }

    if (event.target === document.getElementById("accountSettingsModal")) {

        closeAccountSettingsModal();

    }

    if (event.target === document.getElementById("resetPasswordModal")) {

        closeResetPasswordModal();

    }

});

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

            const createBtn =
                document.getElementById("createUserBtn");

            if (createBtn) {

                createBtn.style.display = "none";

            }
            document
                .getElementById(
                    "adminNavigation")
                .style.display = "none";

            document
                .getElementById(
                    "assignedCounterBar")
                .style.display = "flex";

            document
                .getElementById(
                    "assignedCounterText")
                .innerHTML =

                `Counter ${window.currentUser.assignedCounter}`;

            document
                .getElementById(
                    "counterControlSection")
                .style.display = "none";

        }

        if (window.currentUser.role === "superadmin") {

            document
                .getElementById("visitorActionsHeader")
                .style.display = "";

            document
                .getElementById("visitorSelectHeader")
                .style.display = "";

            document
                .getElementById("dataManagementPanel")
                .style.display = "block";

            document
                .getElementById("accountSettingsBtn")
                .style.display = "inline-block";

        }

        document
            .getElementById("accountSettingsBtn")
            .addEventListener("click", openAccountSettingsModal);

        document
            .getElementById("saveAccountEmailBtn")
            .addEventListener("click", saveAccountEmail);

        document
            .getElementById("confirmResetPasswordBtn")
            .addEventListener("click", confirmResetPassword);

        const visitorTab =
            document.getElementById("visitorTab");

        const userTab =
            document.getElementById("userManagementTab");

        const visitorSection =
            document.getElementById("visitorSection");

        const userSection =
            document.getElementById("userManagementDashboard");

        if (
            visitorTab &&
            userTab &&
            visitorSection &&
            userSection
        ) {

            visitorTab.onclick = () => {

                visitorTab.classList.add("active");
                userTab.classList.remove("active");

                visitorSection.style.display = "block";
                userSection.style.display = "none";

            };

            userTab.onclick = async () => {

                userTab.classList.add("active");
                visitorTab.classList.remove("active");

                visitorSection.style.display = "none";
                userSection.style.display = "block";

                await loadUsers();

            };

        }

        document
            .getElementById("createUserBtn")
            .onclick = () => {

                document
                    .getElementById(
                        "createUserModal")
                    .style.display = "flex";

            };

        document
            .getElementById(
                "saveUserBtn")
            .onclick = createUser;
        
          console.log("✅ saveUserBtn event attached");  

        document
            .getElementById("newPassword")
            .addEventListener("keypress", function (e) {

                if (e.key === "Enter") {

                    createUser();

                }

            });


        document.body.style.display =
            "block";

        const exportBtn = document.getElementById("exportBtn");
        const exportModal = document.getElementById("exportModal");

        exportBtn.addEventListener("click", () => {
            exportModal.style.display = "flex";
        });

        const purgeBtn = document.getElementById("purgeVisitorsBtn");

        if (purgeBtn) {
            purgeBtn.addEventListener("click", purgeVisitorsInRange);
        }

        const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener("click", deleteSelectedVisitors);
        }

        const selectAllVisitors = document.getElementById("selectAllVisitors");

        if (selectAllVisitors) {

            selectAllVisitors.addEventListener("change", () => {

                document
                    .querySelectorAll(".visitor-select-checkbox")
                    .forEach(cb => {

                        cb.checked = selectAllVisitors.checked;

                        if (selectAllVisitors.checked) {
                            selectedVisitorIds.add(cb.dataset.id);
                        } else {
                            selectedVisitorIds.delete(cb.dataset.id);
                        }

                    });

                updateSelectedCount();

            });

        }

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
function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

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
