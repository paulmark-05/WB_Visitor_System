document.addEventListener("DOMContentLoaded", () => {

    console.log("formHandler.js loaded");
    // ================== ELEMENTS ==================
    const form = document.getElementById("visitorForm");

    const rank = document.getElementById("rank");
    const name = document.getElementById("name");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");
    const zsbId = document.getElementById("zsbId");
    const serviceNo = document.getElementById("serviceNo");
    const branch = document.getElementById("branch");
    const subDivision = document.getElementById("subDivision");
    const datePicker = document.getElementById("datePicker");

    const phoneError = document.getElementById("phoneError");
    const emailError = document.getElementById("emailError");
    const zsbError = document.getElementById("zsbError");

    // ================== VALIDATION ==================
    function validatePhone(phoneVal) {
        return /^[6-9]\d{9}$/.test(phoneVal);
    }
    phone.addEventListener("input", () => {

        // only digits
        phone.value = phone.value.replace(/\D/g, "");

        // max 10 digits
        if (phone.value.length > 10) {
            phone.value = phone.value.slice(0, 10);
        }

        // validation
        if (phone.value.length > 0 &&
            !/^[6-9]\d{9}$/.test(phone.value)) {

            phoneError.textContent = "Enter valid 10 digit mobile number";

        } else {

            phoneError.textContent = "";

        }

    });


    email.addEventListener("input", () => {
        emailError.textContent = (email.value && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.value))
            ? "Invalid email"
            : "";
    });


    function validateZSB(id) {
        return /^\d{6}$/.test(id);
    }

    zsbId.addEventListener("input", () => {
        if (!zsbId.value.trim()) {
            zsbError.textContent = "";
        }
        else if (!validateZSB(zsbId.value)) {
            zsbError.textContent = "Please enter valid ZSB ID card no.";
        } else {
            zsbError.textContent = "";
        }

        zsbId.value = zsbId.value.replace(/\D/g, "");

        if (zsbId.value.length > 6) {
            zsbId.value = zsbId.value.slice(0, 6);
        }

        if (typeof populateDynamic === "function") {
            populateDynamic();
        }
    });


    function formatDate(dateStr){

    if(!dateStr) return "";

    const [year, month, day] =
    dateStr.split("-");

    return `${day}-${month}-${year}`;
}


    // ================== FORM SUBMIT ==================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 🔴 get selected work
        const selected = document.querySelector("input[name='work']:checked");

        if (!selected) {
            alert("Please select work type");
            return;
        }

        if (!validatePhone(phone.value)) {
            alert("Enter valid phone number");
            return;
        }

        try {

            rank.value = rank.value.toUpperCase();
            name.value = name.value.toUpperCase();
            // ===== DATA =====

            const data = {

                rank: rank.value.toUpperCase(),

                name: name.value.toUpperCase(),

                phone: phone.value,

                email: email.value.trim(),

                zsbId: zsbId.value
                    ? `${document.getElementById("zsbPrefix").textContent}${zsbId.value} `
                    : "",

                serviceNo: serviceNo.value.trim(),

                branch: branch.value,

                subDivision: subDivision.value,

                work: selected.value,

                counter: selected.dataset.counter,

                date: datePicker.value

            };


            console.log("🚀 Sending:", data);

            const overlay = document.getElementById("submitOverlay");

            overlay.style.display = "flex";

            document.getElementById("submitMessage").textContent =
                "Submitting...";

            document.getElementById("submitSubtext").textContent =
                "Please wait while we generate your token";

            // ===== API CALL =====
            const res = await fetch("/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (!res.ok) {

                overlay.style.display = "none";

                alert(
                    result.message ||
                    result.error ||
                    "Booking failed"
                );

                return;
            }

            showToken(result, data);

            // wait for token image generation
            setTimeout(async () => {

                try {

                    if (
                        data.email &&
                        window.generatedToken
                    ) {

                        await fetch(
                            "/send-token-email",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

                                    email: data.email,

                                    tokenImage: window.generatedToken,

                                    date: data.date,

                                    counter: result.counter,

                                    sequence: result.sequence,

                                    branch: data.branch,

                                    timeSlot: result.timeSlot
                                })

                            }
                        );

                        console.log(
                            "✅ Email sent"
                        );
                    }

                } catch (err) {

                    console.error(
                        "Email failed",
                        err
                    );
                }

            }, 1200);



        } catch (err) {
            console.error("❌ Error:", err);
            alert("Submission failed");
        }
    });
});

function showToken(result, data) {

    const counter = result.counter;
    const token = result.sequence;

    // ===== TIME SLOT =====

    const slotIndex = Math.floor((token - 1) / 10);

    const startHour = 10 + slotIndex;
    const endHour = startHour + 1;

    const format = h =>
        `${h.toString().padStart(2, '0')}00HRS`;

    const timeSlot =
        `${format(startHour)} - ${format(endHour)}`;

    // ===== TOKEN UI =====

    document.getElementById(
        "submitOverlay"
    ).style.display = "none";

    document.querySelector(
        ".form-container"
    ).innerHTML = `

<div
style="
text-align:center;
margin-bottom:20px;
">

<h2 style="
margin-bottom:8px;
color:#111;
">

Submitted Successfully

</h2>

<p style="
font-size:15px;
color:#444;
max-width:500px;
margin:auto;
line-height:1.6;
">

Download this token and show it at the assigned
counter during your allotted time slot.

</p>

</div>
`;

    document.querySelector(".form-container").innerHTML += `

 
<div class="token-main-wrapper">

<div
class="token-card"
id="tokenCard"

style="
width:320px;
min-height:430px;
height:auto;

background:#fff;
border:2px solid #000;
border-radius:20px;

overflow:hidden;

display:flex;
flex-direction:column;

margin:auto;
font-family:Poppins;
">

    <!-- ================= TOP ================= -->

    <div
    style="
    display:flex;
    border-bottom:2px solid #000;

    min-height:120px;
    flex-shrink:0;
    ">

        <!-- LOGO -->

        <div
        style="
        width:28%;
        min-width:90px;

        border-right:2px solid #000;

        display:flex;
        align-items:center;
        justify-content:center;

        padding:8px;
        ">

            <img
            src="logo.jpg"

            style="
            max-width:100%;
            max-height:90px;
            object-fit:contain;
            ">

        </div>


        <!-- TOP RIGHT -->

        <div
        style="
        flex:1;

        display:flex;
        flex-direction:column;
        justify-content:center;
        align-items:center;

        text-align:center;
        padding:10px 8px;
        ">

            <div
            style="
            font-size:10px;
            font-weight:700;
            margin-bottom:6px;
            ">

                Please Visit

            </div>

            <div
            style="
            font-size:12px;
            font-weight:700;
            line-height:1.3;
            margin-bottom:6px;
            ">

                ${data.branch}

            </div>

            <div
            style="
            font-size:12px;
            margin-bottom:3px;
            ">

                Date :
                <b>${formatDate(data.date)}</b>

            </div>

            <div
            style="
            font-size:12px;
            line-height:1.3;
            ">

                Time Slot :
                <b>${timeSlot}</b>

            </div>

        </div>

    </div>


    <!-- ================= COUNTER ================= -->

    <div
    style="
    border-bottom:2px solid #000;

    text-align:center;

    padding:10px 8px;

    font-size:16px;
    flex-shrink:0;
    ">

        Counter / Token :
        <b>
            C-${counter} / T-${token}
        </b>

    </div>


    <!-- ================= DETAILS ================= -->

    <div
    style="
    border-bottom:2px solid #000;

    padding:10px 12px;

    display:flex;
    flex-direction:column;

    gap:6px;

    text-align:center;

    font-size:12px;

    flex-shrink:0;
    ">

        <div>
            Rank :
            <b>${data.rank}</b>
        </div>

        <div>
            Name :
            <b>${data.name}</b>
        </div>

        <div>
            Service No :
            <b>${data.serviceNo || "-"}</b>
        </div>

    </div>


    <!-- ================= QR AREA ================= -->

    <div
    style="
    display:flex;

    flex:1;
    min-height:0;
    ">

        <!-- QR 1 -->

        <div
        style="
        flex:1;

        border-right:2px solid #000;

        display:flex;
        flex-direction:column;

        align-items:center;
        justify-content:center;

        padding:10px;

        text-align:center;
        ">

            <img
            src="qr-support.jpeg"

            style="
            max-width:75%;
            max-height:90px;
            object-fit:contain;
            ">

            <div
            style="
            margin-top:6px;

            font-size:10px;
            line-height:1.25;

            max-width:95%;
            ">

                Donate to support website maintenance and keep this visitor management system free of cost for all. Developed and conceptualized by a veteran's dependent daughter.

            </div>

        </div>


        <!-- QR 2 -->

        <div
        style="
        flex:1;

        display:flex;
        flex-direction:column;

        align-items:center;
        justify-content:center;

        padding:10px;

        text-align:center;
        ">

            <img
            src="qr-donate.jpeg"

            style="
            max-width:75%;
            max-height:90px;
            object-fit:contain;
            ">

            <div
            style="
            margin-top:6px;

            font-size:10px;
            line-height:1.25;

            max-width:95%;
            ">

                Donate to the Armed Forces Flag Day Fund (AFFD) to support the social and financial welfare of all ex-servicemen,  and their widows through KSB.

            </div>

        </div>

    </div>

</div>


<!-- DOWNLOAD BUTTON -->

<button
class="download-btn"
onclick="downloadToken()"

style="
margin-top:18px;
">

    Download Token

</button>

</div>
    `;
    // ===== GENERATE TOKEN IMAGE =====

    setTimeout(async () => {

    // hide overlay first
    document.getElementById(
        "submitOverlay"
    ).style.display = "none";

    // small delay so DOM updates
    await new Promise(resolve =>
        setTimeout(resolve, 150)
    );

    const tokenCanvas =
    await html2canvas(

        document.getElementById(
            "tokenCard"
        ),

        {
            scale: 2,

            useCORS: true,

            backgroundColor:
            "#ffffff",

            logging:false
        }

    );

    const tokenImage =
    tokenCanvas.toDataURL(
        "image/jpeg",
        0.9
    );

    window.generatedToken =
    tokenImage;

}, 300);


}



function downloadToken() {

    const link =
        document.createElement("a");

    link.download =
        "zsb-token.png";

    link.href =
        window.generatedToken;

    link.click();

}
