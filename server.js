require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const { createCanvas, loadImage } = require("canvas");

const express = require("express");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const path = require("path");

const session =
    require("express-session");

const MongoStore =
    require("connect-mongo").default;
const AdminUser =
    require("./models/AdminUser");

const AuditLog =
    require("./models/AuditLog");

const requireSuperAdmin =
    require("./middleware/requireSuperAdmin");

const requireCounterOrSuper =
    require("./middleware/requireCounterOrSuper");

const usersRoutes =
    require("./routes/users");

const app = express();
app.set(
    "trust proxy",
    1
);

app.use(express.json({
    limit: "20mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "20mb"
}));

app.use(

    session({

        secret:
            process.env
                .SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        store:
            MongoStore.create({

                mongoUrl:
                    process.env
                        .MONGO_URI

            }),

        cookie: {

            maxAge:
                12 * 60 * 60 * 1000,

            httpOnly: true,

            secure:
                process.env
                    .NODE_ENV ===
                "production",

            sameSite: "lax"
        }
    })
);


app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);

app.use(
    "/admin",
    usersRoutes
);


/* ================================
   🌐 ROUTES
================================ */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});

/* ================================
   🔐 ADMIN ROUTE
================================ */

app.get(
    "/admin",
    (req, res) => {

        if (
            req.session.user
        ) {

            return res.sendFile(

                path.join(
                    __dirname,
                    "public",
                    "admin-dashboard.html"
                )

            );
        }

        return res.sendFile(

            path.join(
                __dirname,
                "public",
                "admin-login.html"
            )

        );
    }
);

// BLOCK DIRECT DASHBOARD ACCESS

app.get(
    "/admin-dashboard.html",
    (req, res) => {

        if (
            !req.session.user
        ) {

            return res.redirect(
                "/admin"
            );
        }

        res.sendFile(

            path.join(
                __dirname,
                "public",
                "admin-dashboard.html"
            )

        );
    }
);

// LOGIN PAGE PROTECTION

app.get(
    "/admin-login.html",
    (req, res) => {

        if (
            req.session.user
        ) {

            return res.redirect(
                "/admin"
            );
        }

        res.sendFile(

            path.join(
                __dirname,
                "public",
                "admin-login.html"
            )

        );
    }
);

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server);




/* ================================
   🔗 MONGODB ATLAS CONNECTION
================================ */

// 🔴 Replace YOUR_PASSWORD
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));
const bcrypt = require("bcrypt");

const { sendEmail } = require("./services/email");

// Client asked to stop visitor-facing emails (token/completion) — the
// sending Gmail inbox was filling up. The Gmail API module itself is left
// intact for reuse elsewhere; this only turns off the two bulk emails.
// The superadmin OTP password-reset email is unaffected — it's low-volume
// and unrelated to the inbox issue, and is the only way to recover access.
const VISITOR_EMAILS_ENABLED = false;


/* ================================
   🧠 SCHEMA (UPGRADED)
================================ */

const visitorSchema = new mongoose.Schema({

    serviceNo: String,
    rank: String,
    name: String,
    phone: String,
    email: { type: String, default: null },
    zsbId: { type: String, default: null },
    zsbBranch: String,
    subDivision: String,

    date: String,
    workType: String,

    counter: Number,
    sequence: Number,

    timeSlot: String, // ✅ ADD THIS

    status: {
        type: String,
        default: "pending"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

// 🚀 Prevent duplicate booking per day
visitorSchema.index(
    {
        rank: 1,
        name: 1,
        phone: 1,
        serviceNo: 1,
        date: 1,
        counter: 1,
        workType: 1
    },
    {
        unique: true
    }
);

const Visitor = mongoose.model("Visitor", visitorSchema);

/* ================================
   🧠 COUNTER SETTINGS SCHEMA
================================ */

const counterSettingsSchema =
    new mongoose.Schema({

        date: {
            type: String,
            required: true,
            unique: true
        },

        closedCounters: {
            type: [Number],
            default: []
        }

    });

const CounterSettings =
    mongoose.model(

        "CounterSettings",

        counterSettingsSchema
    );

const fs = require("fs");

async function generateTokenImage(data) {

    const canvas = createCanvas(720, 1280); // 9:16
    const ctx = canvas.getContext("2d");

    // background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 720, 1280);

    // border
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 700, 1260);

    // ===== LOGO =====
    // ✅ Correct Node.js way
    const logo =
        await loadImage(
            path.join(__dirname, "public/logo.jpg")
        );
    ctx.drawImage(logo, 20, 20, 120, 120);

    // ===== HEADER RIGHT =====
    ctx.fillStyle = "#000";
    ctx.font = "bold 28px Arial";

    ctx.fillText(`Date: ${data.date}`, 160, 60);
    ctx.fillText(`C${data.counter} / T${data.sequence}`, 160, 100);

    // ===== CENTER MESSAGE =====
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        `Please visit ${data.branch}`,
        360,
        250
    );

    ctx.fillText(
        `${data.timeSlot}`,
        360,
        300
    );

    // ===== DETAILS =====
    ctx.textAlign = "left";
    ctx.font = "28px Arial";

    ctx.fillText(`Rank: ${data.rank}`, 50, 450);
    ctx.fillText(`Name: ${data.name}`, 50, 520);
    ctx.fillText(`Service No: ${data.serviceNo || "-"}`, 50, 590);

    // ===== FOOTER =====
    ctx.font = "20px Arial";
    ctx.fillStyle = "#555";

    ctx.fillText(
        "Show this token at assigned counter",
        50,
        1150
    );

    return canvas.toBuffer("image/png");
}




/* ================================
   🔢 COUNTER LOGIC
================================ */

const counterMap = {
    "New Registration": 1,
    "Pension": 2,
    "Loan": 3,
    "Medical": 4
};


/* ================================
   📡 BOOK API
================================ */

app.post("/book", async (req, res) => {

    try {
        console.log("🔥 /book API HIT", req.body);
        const {
            rank,
            name,
            phone,
            email,
            zsbId,
            serviceNo,
            branch,
            subDivision,
            work,
            counter
        } = req.body;

        // normalize date (VERY IMPORTANT)
        const date = new Date(req.body.date).toISOString().split("T")[0];
        // CHECK IF COUNTER CLOSED

        const settings =

            await CounterSettings
                .findOne({

                    date
                });

        if (

            settings
                ?.closedCounters
                ?.includes(

                    Number(counter)

                )

        ) {

            return res
                .status(400)
                .json({

                    message:
                        "Selected counter is closed"

                });
        }


        // ✅ Duplicate check
        const exists =
            await Visitor.findOne({

                phone:
                    phone.trim(),

                date:
                    date.trim(),

                counter:
                    counter.trim(),

                workType:
                    work.trim()

            }).lean();

        if (exists) {

            return res
                .status(409)
                .json({

                    message:
                        `Already booked token for:
                       Work: ${exists.workType}
                       Date: ${exists.date
                            .split("-")
                            .reverse()
                            .join("-")}`

                });

        }

        // ✅ 2. Sequence generation (per counter + date)
        const last = await Visitor
            .findOne({ counter, date })
            .sort({ sequence: -1 });

        const sequence = last ? last.sequence + 1 : 1;

        // ✅ 3. Time Slot Logic (10 tokens per hour)
        const slotIndex = Math.floor((sequence - 1) / 10);

        const startHour = 10 + slotIndex;
        const endHour = startHour + 1;

        const format = (h) => `${h.toString().padStart(2, "0")}00HRS`;

        const timeSlot = `${format(startHour)} - ${format(endHour)}`;

        // ✅ 4. Save to DB
        await Visitor.create({
            rank,
            name,
            phone,
            email: email,
            zsbId: zsbId,
            serviceNo,
            zsbBranch: branch,
            subDivision,
            workType: work,
            counter,
            date,
            sequence,
            timeSlot
        });

        io.emit("new-booking");



        // ✅ 6. Response
        res.json({
            counter,
            sequence,
            timeSlot,
            success: true
        });

        // SEND EMAIL IN BACKGROUND

        if (email && VISITOR_EMAILS_ENABLED) {

            setImmediate(async () => {

                try {

                    let attachments = [];

                    // TRY TOKEN IMAGE
                    try {

                        const tokenImage =

                            await Promise.race([

                                generateTokenImage({

                                    rank,
                                    name,
                                    serviceNo,

                                    counter,
                                    sequence,

                                    branch,

                                    date,

                                    timeSlot
                                }),

                                new Promise((_, reject) =>

                                    setTimeout(

                                        () => reject(
                                            new Error(
                                                "Token image timeout"
                                            )
                                        ),

                                        8000
                                    )
                                )
                            ]);

                        attachments.push({

                            filename:
                                "token.png",

                            content:
                                tokenImage
                        });

                        console.log(
                            "🖼 Token image generated"
                        );

                    }

                    catch (imgErr) {

                        console.error(

                            "⚠ Token image failed:",

                            imgErr.message
                        );
                    }

                    // SEND EMAIL
                    const info =
                        await sendEmail({

                            to:
                                email,

                            subject:
                                "ZSB Visitor Appointment Token",

                            html: `

                <div style="
                font-family:Arial;
                padding:20px;
                ">

                <h2>
                ZSB Visitor Appointment
                </h2>

                <p>
                Your token has been successfully generated.
                </p>

                <table style="
                border-collapse:collapse;
                width:100%;
                ">

                <tr>
                <td><b>Name</b></td>
                <td>${name}</td>
                </tr>

                <tr>
                <td><b>Date</b></td>

                <td>
                ${date
                                    .split("-")
                                    .reverse()
                                    .join("-")
                                }
                </td>
                </tr>

                <tr>
                <td><b>Counter</b></td>
                <td>C${counter}</td>
                </tr>

                <tr>
                <td><b>Token</b></td>
                <td>T${sequence}</td>
                </tr>

                <tr>
                <td><b>Time Slot</b></td>
                <td>${timeSlot}</td>
                </tr>

                </table>

                <p>
                Please report on time.
                </p>

                </div>
                `,

                            attachments
                        });




                    console.log(
                        "✅ Email Sent: ",
                        info?.id
                    );

                }

                catch (err) {

                    console.error(

                        "❌ Email Error:",

                        err.message
                    );
                }
            });
        }

    } catch (err) {

        // Duplicate index safety
        if (err.code === 11000) {
            return res.status(400).json({ error: "Duplicate booking detected" });
        }

        console.error("❌ ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ================================
   🔐 ADMIN AUTH
================================ */

function requireAuth(req, res, next) {

    if (req.session.user) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Session expired"
    });

}


// LOGIN
app.post(
    "/admin-login",
    async (req, res) => {

        try {

            const { username, password } = req.body;

            const admin = await AdminUser.findOne({ username });

            if (!admin) {

                return res.status(401).json({

                    success: false,

                    message: "Invalid username or password"

                });

            }

            if (!admin.active) {

                return res.status(403).json({

                    success: false,

                    message: "Account disabled"

                });

            }

            const validPassword =
                await bcrypt.compare(
                    password,
                    admin.password
                );

            if (!validPassword) {

                return res.status(401).json({

                    success: false,

                    message: "Invalid username or password"

                });

            }

            admin.lastLogin = new Date();

            await admin.save();

            req.session.user = {

                id: admin._id,

                username: admin.username,

                role: admin.role,

                assignedCounter:
                    admin.assignedCounter

            };

            return res.json({

                success: true,

                user: {

                    username: admin.username,

                    role: admin.role,

                    assignedCounter:
                        admin.assignedCounter

                }

            });

        }

        catch (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message: "Internal server error"

            });

        }

    }
);

// CHECK AUTH

app.get(
    "/check-auth",
    (req, res) => {

        if (!req.session.user) {

            return res.json({

                authenticated: false

            });

        }

        res.json({

            authenticated: true,

            user: req.session.user

        });

    }
);

// LOGOUT

app.post(
    "/logout",
    (req, res) => {

        req.session.destroy(
            () => {

                res.json({

                    success: true
                });
            }
        );
    }
);

/* ================================
   🔑 FORGOT PASSWORD (email OTP)
================================ */

const crypto = require("crypto");

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// REQUEST OTP
app.post(
    "/forgot-password",
    async (req, res) => {

        try {

            const { username } = req.body;

            if (!username) {

                return res.status(400).json({
                    success: false,
                    message: "Enter your username."
                });

            }

            const user =
                await AdminUser.findOne({ username });

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "No account found with that username."
                });

            }

            if (user.role !== "superadmin") {

                return res.status(403).json({
                    success: false,
                    message: "You are not authorised to reset this password. Please ask your superadmin."
                });

            }

            if (!user.email) {

                return res.status(400).json({
                    success: false,
                    message: "No email is on file for this account. Set one under Account Settings after logging in, or ask another superadmin to."
                });

            }

            // Cooldown: block re-requesting for the first
            // minute after an OTP was already issued.
            if (
                user.resetOtpExpires &&
                user.resetOtpExpires.getTime() - Date.now() >
                    OTP_TTL_MS - 60 * 1000
            ) {

                return res.status(429).json({
                    success: false,
                    message: "Please wait a minute before requesting another OTP."
                });

            }

            const otp =
                crypto.randomInt(100000, 1000000).toString();

            user.resetOtpHash =
                await bcrypt.hash(otp, 10);

            user.resetOtpExpires =
                new Date(Date.now() + OTP_TTL_MS);

            await user.save();

            await sendEmail({

                to: user.email,

                subject: "ZSB Admin Password Reset OTP",

                html: `
                <div style="font-family:Arial,sans-serif; max-width:480px; margin:auto; padding:20px;">
                    <h2>Password Reset OTP</h2>
                    <p>Use the code below to reset the password for admin account <b>${user.username}</b>. This code expires in 10 minutes.</p>
                    <p style="font-size:32px; font-weight:bold; letter-spacing:6px; text-align:center; margin:24px 0;">${otp}</p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                </div>
                `

            });

            return res.json({
                success: true,
                message: "An OTP has been sent to your email."
            });

        } catch (err) {

            console.error("❌ Forgot-password error:", err);

            return res.status(500).json({
                success: false,
                message: "Unable to process request."
            });

        }

    }
);

// VERIFY OTP ONLY (does not consume it — the actual reset re-checks it)
app.post(
    "/verify-reset-otp",
    async (req, res) => {

        try {

            const { username, otp } = req.body;

            if (!username || !otp) {

                return res.status(400).json({
                    success: false,
                    message: "Username and OTP are required."
                });

            }

            const user =
                await AdminUser.findOne({ username });

            if (
                !user ||
                !user.resetOtpHash ||
                !user.resetOtpExpires ||
                user.resetOtpExpires.getTime() < Date.now()
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired OTP."
                });

            }

            const otpValid =
                await bcrypt.compare(otp, user.resetOtpHash);

            if (!otpValid) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired OTP."
                });

            }

            return res.json({ success: true });

        } catch (err) {

            console.error("❌ Verify-OTP error:", err);

            return res.status(500).json({
                success: false,
                message: "Unable to verify OTP."
            });

        }

    }
);

// VERIFY OTP + SET NEW PASSWORD
app.post(
    "/reset-password-otp",
    async (req, res) => {

        try {

            const { username, otp, newPassword } = req.body;

            if (!username || !otp || !newPassword) {

                return res.status(400).json({
                    success: false,
                    message: "Username, OTP and new password are required."
                });

            }

            const user =
                await AdminUser.findOne({ username });

            if (
                !user ||
                !user.resetOtpHash ||
                !user.resetOtpExpires ||
                user.resetOtpExpires.getTime() < Date.now()
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired OTP."
                });

            }

            const otpValid =
                await bcrypt.compare(otp, user.resetOtpHash);

            if (!otpValid) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired OTP."
                });

            }

            user.password =
                await bcrypt.hash(newPassword, 10);

            user.resetOtpHash = null;
            user.resetOtpExpires = null;

            await user.save();

            return res.json({
                success: true,
                message: "Password reset successfully."
            });

        } catch (err) {

            console.error("❌ Reset-password error:", err);

            return res.status(500).json({
                success: false,
                message: "Unable to reset password."
            });

        }

    }
);

/* ================================
   🧑‍💼 ADMIN APIs
================================ */

// GET ALL
app.get("/admin/visitors", requireAuth, async (req, res) => {

    const { date } = req.query;

    let query = {};

    if (
        req.session.user.role === "counter"
    ) {

        query.counter =
            req.session.user.assignedCounter;

    }


    if (date) {
        query.date = date;
    }

    const data = await Visitor
        .find(query)

        .sort({
            date: 1,
            counter: 1,
            sequence: 1
        });

    res.json(data);
});

// MARK COMPLETE
app.post("/admin/complete/:id", requireAuth, async (req, res) => {

    const { status } = req.body;

    const visitor =
        await Visitor.findById(
            req.params.id
        );

    if (!visitor) {

        return res
            .status(404)
            .json({
                success: false
            });

    }

    if (

        req.session.user.role === "counter" &&

        visitor.counter !==
        req.session.user.assignedCounter

    ) {

        return res
            .status(403)
            .json({

                success: false,

                message:
                    "Access denied"

            });

    }

    const wasAlreadyCompleted =
        visitor.status === "completed";

    visitor.status = status;

    await visitor.save();

    res.json({ success: true });

    // SEND "VISIT COMPLETED" EMAIL IN BACKGROUND
    if (
        status === "completed" &&
        !wasAlreadyCompleted &&
        visitor.email &&
        VISITOR_EMAILS_ENABLED
    ) {

        setImmediate(async () => {

            try {

                await sendEmail({

                    to: visitor.email,

                    subject: "Your ZSB Visit — Work Completed",

                    html: `
                    <div style="
                        font-family: Arial, sans-serif;
                        max-width:600px;
                        margin:auto;
                        padding:20px;
                        border:1px solid #ddd;
                        border-radius:12px;
                        background:#fafafa;
                    ">

                        <h2 style="
                            text-align:center;
                            color:#111;
                            margin-bottom:20px;
                        ">
                            Thank You for Visiting ZSB
                        </h2>

                        <p>
                            Dear ${visitor.name || "Visitor"},
                        </p>

                        <p>
                            We hope your work/query has been addressed to your satisfaction during your visit to ${visitor.zsbBranch || "ZSB"}.
                        </p>

                        <p>
                            If you have any feedback or grievance regarding your visit, please let us know using the link below:
                        </p>

                        <p style="text-align:center; margin:20px 0;">
                            <a
                                href="https://wb-sainik-board-feedback-form.onrender.com"
                                style="
                                    display:inline-block;
                                    padding:10px 20px;
                                    background:navy;
                                    color:#fff;
                                    text-decoration:none;
                                    border-radius:6px;
                                "
                            >
                                Share Feedback / Grievance
                            </a>
                        </p>

                        <hr>

                        <p style="
                            font-size:12px;
                            color:#666;
                            text-align:center;
                        ">
                            ZSB Visitor Management System
                        </p>

                    </div>
                    `

                });

                console.log(
                    "✅ Completion email sent to",
                    visitor.email
                );

            } catch (err) {

                console.error(
                    "❌ Completion email failed:",
                    err.message
                );

            }

        });

    }
});

// DELETE SINGLE VISITOR RECORD
app.delete("/admin/visitors/:id", requireSuperAdmin, async (req, res) => {

    try {

        const visitor =
            await Visitor.findById(
                req.params.id
            );

        if (!visitor) {

            return res
                .status(404)
                .json({
                    success: false,
                    message: "Visitor record not found."
                });

        }

        await Visitor.findByIdAndDelete(req.params.id);

        await AuditLog.create({

            action: "delete_visitor",

            performedBy:
                req.session.user.username,

            targetType: "Visitor",

            targetId: req.params.id,

            details:
                `Deleted visitor "${visitor.name}" (date ${visitor.date}, counter ${visitor.counter})`

        });

        res.json({ success: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Unable to delete visitor record."
        });

    }

});

// BULK DELETE VISITOR RECORDS — by selected IDs, or by an inclusive date range
app.delete("/admin/visitors", requireSuperAdmin, async (req, res) => {

    try {

        const { ids, from, to } = req.body;

        let query;

        if (Array.isArray(ids) && ids.length > 0) {

            query = { _id: { $in: ids } };

        } else if (from && to) {

            query = {
                date: { $gte: from, $lte: to }
            };

        } else {

            return res.status(400).json({
                success: false,
                message: "Provide either a list of record IDs or a From/To date range."
            });

        }

        const result =
            await Visitor.deleteMany(query);

        const details =
            `Deleted ${result.deletedCount} visitor record(s)` +
            (from && to ? ` from ${from} to ${to} (inclusive)` : "");

        await AuditLog.create({

            action: "bulk_delete_visitors",

            performedBy:
                req.session.user.username,

            targetType: "Visitor",

            details

        });

        res.json({
            success: true,
            deletedCount: result.deletedCount
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Unable to delete visitor records."
        });

    }

});

// EXPORT CSV
app.get("/admin/export", requireCounterOrSuper, async (req, res) => {
    const { from, to, fields } = req.query;

    let query = {};

    if (
        req.session.user.role === "counter"
    ) {

        query.counter =
            req.session.user.assignedCounter;

    }

    // DATE FILTER
    if (from && to) {
        query.date = {
            $gte: from,
            $lte: to
        };
    }

    // SORT BY DATE
    const data = await Visitor
        .find(query)

        .sort({
            date: 1,
            status: 1,
            counter: 1,
            sequence: 1
        })



    const selectedFields = fields
        ? fields.split(",")
        : [];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Visitors");

    sheet.views = [
        {
            state: "frozen",
            ySplit: 1
        }
    ];

    // COLUMN MAP  
    const fieldMap = {
        rank: "Rank",
        name: "Name",
        phone: "Phone",
        email: "Email",
        zsbId: "ZSB ID",
        serviceNo: "Service No",
        zsbBranch: "Branch",
        subDivision: "Sub Division",
        workType: "Work",
        counter: "Counter",
        sequence: "Token",
        timeSlot: "Time Slot",
        status: "Status",
        date: "Date"
    };

    sheet.columns = [

        {
            header: "Date of Appointment",
            key: "date",
            width: 18
        },

        {
            header: "Rank",
            key: "rank",
            width: 18
        },

        {
            header: "Name",
            key: "name",
            width: 32
        },

        {
            header: "Work Type",
            key: "workType",
            width: 45
        },

        {
            header: "Counter",
            key: "counter",
            width: 18
        },

        {
            header: "Token",
            key: "token",
            width: 15
        },

        {
            header: "Status",
            key: "status",
            width: 15
        },


        /*{
            header: "Time Slot",
            key: "timeSlot",
            width: 22
        },*/

        {
            header: "Subdivision",
            key: "subDivision",
            width: 20
        },

        {
            header: "ZSB ID",
            key: "zsbId",
            width: 22
        },


        {
            header: "Service No",
            key: "serviceNo",
            width: 18
        },

        {
            header: "Phone",
            key: "phone",
            width: 18
        },

        {
            header: "Email",
            key: "email",
            width: 32
        }




    ];


    data.forEach(v => {

        sheet.addRow({

            date: v.date
                ? v.date
                    .split("-")
                    .reverse()
                    .join("-")
                : "",

            rank: v.rank || "",

            name: v.name || "",

            workType: v.workType || "",

            counter: v.counter || "",

            token: v.sequence || "",

            status: v.status || "pending",

            // timeSlot: v.timeSlot || "",

            //zsbBranch: v.zsbBranch || "",

            subDivision: v.subDivision || "",

            zsbId: v.zsbId || "",

            serviceNo: v.serviceNo || "",

            phone: v.phone || "",

            email: v.email || "",


        });

    });


    sheet.eachRow((row) => {

        row.eachCell((cell) => {

            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true
            };

        });

    });




    // HEADER STYLE
    sheet.getRow(1).font = {
        bold: true,
        size: 12
    };


    sheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center"
    };

    sheet.autoFilter = { from: "A1", to: "M1" };


    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename = visitors_${from}_to_${to}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
});

/* ================================
   🔒 PERSISTENT COUNTERS
================================ */
/* ================================
   🔒 CLOSED COUNTERS (DB)
================================ */

// GET COUNTERS

app.get(
    "/admin/counters",
    async (req, res) => {

        const date =
            req.query.date ||

            new Date()
                .toISOString()
                .split("T")[0];

        let settings =

            await CounterSettings
                .findOne({ date });

        if (!settings) {

            settings = {

                closedCounters: []
            };
        }

        res.json({

            closedCounters:
                settings.closedCounters
        });

    }
);


// CLOSE COUNTER

app.post(
    "/admin/close-counter",
    requireSuperAdmin,
    async (req, res) => {

        const {
            counter,
            date
        } = req.body;

        let settings =

            await CounterSettings
                .findOne({ date });

        if (!settings) {

            settings =
                new CounterSettings({

                    date,

                    closedCounters: []
                });
        }

        if (

            !settings
                .closedCounters
                .includes(

                    Number(counter)

                )

        ) {

            settings
                .closedCounters
                .push(

                    Number(counter)

                );
        }

        await settings.save();

        io.emit(
            "counter-update"
        );

        res.json({
            success: true
        });
    }
);


// OPEN COUNTER

app.post(
    "/admin/open-counter",
    requireSuperAdmin,
    async (req, res) => {

        const {
            counter,
            date
        } = req.body;

        let settings =

            await CounterSettings
                .findOne({ date });

        if (settings) {

            settings.closedCounters =

                settings.closedCounters
                    .filter(

                        c =>
                            c !==
                            Number(counter)

                    );

            await settings.save();
        }

        io.emit(
            "counter-update"
        );

        res.json({
            success: true
        });
    }
);
/* ================================
   📧 SEND TOKEN EMAIL
================================ */

app.post("/send-token-email", async (req, res) => {

    try {

        const {
            email,
            tokenImage,
            date,
            counter,
            sequence,
            branch,
            timeSlot
        } = req.body;

        if (!email || !tokenImage) {
            return res.json({ success: true });
        }

        if (!VISITOR_EMAILS_ENABLED) {
            return res.json({ success: true });
        }

        // remove base64 prefix
        const base64Data =
            tokenImage.replace(
                /^data:image\/(png|jpeg|jpg);base64,/,
                ""
            );

        await sendEmail({

            to: email,

            subject: "ZSB Visitor Appointment Token",

            html: `
            <div style="
                font-family: Arial, sans-serif;
                max-width:600px;
                margin:auto;
                padding:20px;
                border:1px solid #ddd;
                border-radius:12px;
                background:#fafafa;
            ">

                <h2 style="
                    text-align:center;
                    color:#111;
                    margin-bottom:20px;
                ">
                    ZSB Visitor Appointment Token
                </h2>

                <p>
                    Dear Visitor,
                </p>

                <p>
                    Your appointment has been successfully booked.
                </p>

                <div style="
                    background:#fff;
                    border:1px solid #eee;
                    border-radius:10px;
                    padding:15px;
                    margin:20px 0;
                ">

                    <p>
                        <b>Branch:</b> ${branch}
                    </p>

                    <p>
                        <b>Date:</b>
                        ${date
                    ? date
                        .split("-")
                        .reverse()
                        .join("-")
                    : ""
                }
                    </p>

                    <p>
                        <b>Counter / Token:</b>
                        C-${counter} / T-${sequence}
                    </p>

                    <p>
                        <b>Time Slot:</b>
                        ${timeSlot}
                    </p>

                </div>

                <p>
                    Your token image is attached with this email.
                </p>

                <p>
                    Please download and show it at the assigned counter during your allotted time slot.
                </p>

                <hr>

                <p style="
                    font-size:12px;
                    color:#666;
                    text-align:center;
                ">
                    ZSB Visitor Management System
                </p>

            </div>
            `,

            attachments: [
                {
                    filename: `ZSB_Token_${date}.jpg`,

                    content: Buffer.from(
                        base64Data,
                        "base64"
                    )
                }
            ]
        });

        console.log("✅ Token email sent");

        res.json({
            success: true
        });

    } catch (err) {

        console.error(
            "❌ Email error:",
            err
        );

        res.status(500).json({
            error: "Email failed"
        });
    }
});

/* ================================
   🚀 START SERVER
================================ */
const PORT =
    process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(
        `🚀 Server running on port ${PORT}`
    );

});

io.on("connection", (socket) => {
    console.log("🔌 Client connected");
});
