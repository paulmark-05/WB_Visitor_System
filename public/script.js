const socket = io();
console.log("script.js loaded");

// ================== GLOBAL ELEMENTS ==================
const branch = document.getElementById("branch");
const subDivision = document.getElementById("subDivision");
const workOptions = document.getElementById("workOptions");
const consentCheckbox = document.getElementById("consentCheckbox");
const submitBtn = document.getElementById("submitBtn");

// ================== HOLIDAYS ==================
const holidays = ["2026-01-26", "2026-08-15"];

const branchPrefixes = {
    "ZSB North 24 Parganas": "WB 10/"
};

// ================== MASTER CONFIG ==================
const branchData = {
    "ZSB North 24 Parganas": {
        sub: ["Barasat", "Barrackpore", "Bongaon", "Basirhat", "Bidhannagar"],

        work: [
            { name: "Registration for ESM / Widow I-card", counter: 1 },
            { name: "Issue of ESM / Widow I-card", counter: 1 },
            { name: "Issue of NOC for Shifting to new ZSB", counter: 1 },
            { name: "RSB I-card registration", counter: 1 },

            { name: "Change of Home Address", counter: 2 },
            { name: "Submission of NOC from other ZSB", counter: 2 },

            { name: "Issue of Relationship certificate from Record office", counter: 3 },
            { name: "Change of Name and/or DOB", counter: 3 },
            { name: "Publication/entry of NE Part II order", counter: 3 },

            { name: "Registration of Dependent I-card", counter: 4 },
            { name: "Issue of Dependent I-card", counter: 4 },

            { name: "Pension & PPO related Job", counter: 5 },
            { name: "Processing of Grants (KSB/WB/Army/Navy/AF)", counter: 5 },
            { name: "Dependancy Certificate", counter: 5 },

            { name: "Grant-in-Aid WWII", counter: 6 },
            { name: "Life certificate Penury", counter: 6 },
            { name: "AFFD Payment", counter: 6 },

            { name: "Veer Pariwar Yojna", counter: 7 },
            { name: "Job Sponsoring", counter: 7 },
            { name: "Family Dispute", counter: 7 },
            { name: "Grievance", counter: 7 },
            { name: "Other Work", counter: 7 }
        ]
    }
};


// ================== CLOSED COUNTERS ==================
let closedCounters = [];
async function fetchClosedCounters() {
    const res = await fetch("/admin/counters");
    const data = await res.json();
    closedCounters = data.closedCounters;
}

function formatDate(dateStr) {

    if (!dateStr) return "";

    const [year, month, day] =
        dateStr.split("-");

    return `${day}-${month}-${year}`;
}


// ================== POPULATE ==================
function populateDynamic() {
    subDivision.innerHTML = `
<option value="" disabled selected>
Select Sub Division
</option>
`;
    workOptions.innerHTML = "";

    const data = branchData[branch.value];
    if (!data) return;
    document.getElementById("zsbPrefix").textContent = branchPrefixes[branch.value] || "WB/";

    subDivision.disabled = false;
    const zsbValue = document.getElementById("zsbId").value.trim();
    const isValidZSB = /^\d{6}$/.test(zsbValue);

    // subdivisions
    data.sub.forEach(s => {
        subDivision.add(new Option(s, s));
    });

    // work options
    data.work.forEach(w => {

        const isClosed = closedCounters.includes(w.counter);

        const disableByZsb = (!zsbValue || !isValidZSB) && w.counter !== 1;
        const disabled = isClosed || disableByZsb;

        const label = document.createElement("label");
        label.style.display = "block";
        label.style.marginBottom = "6px";

        label.innerHTML = `
                <input type="radio" name="work" value="${w.name}" data-counter="${w.counter}" ${disabled ? "disabled" : ""}>
                ${w.name}
                <span style="color:#777;font-size:12px;">(Counter ${w.counter})</span>
                ${isClosed ? `<span style="color:red;font-size:11px;"> - CLOSED</span>` : ""}
                ${disableByZsb
                ? `<span title="ZSB ID card not available" style="color:red;font-size:11px;">
                        - ZSB ID REQUIRED
                    </span>`
                : ""}
            `;

        workOptions.appendChild(label);
    });
}


// ================== CALENDAR ==================
// ================== CALENDAR ==================
function initCalendar() {

    const now =
        new Date();
    
    const today =
        new Date();

    today.setHours(
        0, 0, 0, 0
    );

    if (
        now.getHours() >= 14
    ) {
        today.setDate(
            today.getDate() + 1
        );
    }

    let allowedDates = [];

    function toISO(date) {

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function isWorkingDay(date) {

        const iso =
            toISO(date);

        return (

            date.getDay() !== 0 &&

            date.getDay() !== 6 &&

            !holidays.includes(iso)

        );
    }

    // ---------- CASE 1 ----------
    // Today is working day

    if (isWorkingDay(today)) {

        allowedDates.push(
            toISO(today)
        );

        let nextWorking =
            new Date(today);

        do {

            nextWorking.setDate(
                nextWorking.getDate() + 1
            );

        }

        while (
            !isWorkingDay(
                nextWorking
            )
        );

        allowedDates.push(
            toISO(
                nextWorking
            )
        );

    }

    // ---------- CASE 2 ----------
    // Today NOT working day

    else {

        let tempDate =
            new Date(today);

        while (
            allowedDates.length < 2
        ) {

            tempDate.setDate(
                tempDate.getDate() + 1
            );

            if (
                isWorkingDay(
                    tempDate
                )
            ) {

                allowedDates.push(
                    toISO(
                        tempDate
                    )
                );
            }
        }
    }

    flatpickr(
        "#datePicker",
        {

            dateFormat:
                "Y-m-d",

            altInput:
                true,

            altFormat:
                "d-m-Y",

            enable:
                allowedDates,

            defaultDate:
                allowedDates[0]

        }
    );

    console.log(
        "Allowed dates:",
        allowedDates
    );
}

document.addEventListener("DOMContentLoaded", async () => {

    await fetchClosedCounters();
    populateDynamic();

    // calendar
    initCalendar();

    // branch change
    branch.onchange = populateDynamic;

    // consent checkbox
    consentCheckbox.addEventListener("change", () => {
        if (consentCheckbox.checked) {
            submitBtn.disabled = false;
            submitBtn.classList.add("active");
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove("active");
        }
    });

});


socket.on("counter-update", async () => {
    await fetchClosedCounters();
    populateDynamic();
});
