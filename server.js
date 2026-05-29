require("dotenv").config();
const { createCanvas, loadImage } = require("canvas");

const express = require("express");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const path = require("path");

const session =
    require("express-session");

const MongoStore =
    require("connect-mongo").default;

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
            req.session.admin
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
            !req.session.admin
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
            req.session.admin
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
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});



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

function requireAuth(
    req,
    res,
    next
) {

    if (
        req.session.admin
    ) {

        return next();
    }

    return res
        .status(401)
        .json({

            success: false,

            message:
                "Session expired"
        });
}


// LOGIN

app.post(
    "/admin-login",
    async (req, res) => {

        try {

            const {
                username,
                password
            } = req.body;

            if (

                username ===
                process.env
                    .ADMIN_USERNAME &&

                password ===
                process.env
                    .ADMIN_PASSWORD

            ) {

                req.session.admin =
                    true;

                return res.json({

                    success: true
                });
            }

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Invalid username or password"
                });

        }

        catch (err) {

            console.error(err);

            res.status(500)
                .json({

                    success: false
                });
        }
    }
);


// CHECK AUTH

app.get(
    "/check-auth",
    (req, res) => {

        res.json({

            authenticated:
                !!req.session.admin
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
   🧑‍💼 ADMIN APIs
================================ */

// GET ALL
app.get("/admin/visitors", requireAuth, async (req, res) => {

    const { date } = req.query;

    let query = {};

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

    await Visitor.findByIdAndUpdate(req.params.id, {
        status
    });

    res.json({ success: true });
});

// EXPORT CSV
app.get("/admin/export", requireAuth, async (req, res) => {
    const { from, to, fields } = req.query;

    let query = {};

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


// GET COUNTERS

app.get(

    "/admin/counters",

    requireAuth,

    async (req,res)=>{

        const date =

        req.query.date ||

        new Date()
        .toISOString()
        .split("T")[0];

        const settings =

        await CounterSettings
        .findOne({

            date
        });

        res.json({

            closedCounters:

            settings
            ?.closedCounters

            || []

        });
    }
);


// CLOSE COUNTER

app.post(

    "/admin/close-counter",

    requireAuth,

    async (req,res)=>{

        const {

            counter,
            date

        } = req.body;

        const settings =

        await CounterSettings
        .findOneAndUpdate(

            {

                date
            },

            {

                $addToSet:{

                    closedCounters:

                    Number(counter)
                }
            },

            {

                upsert:true,

                new:true
            }
        );

        io.emit(
            "counter-update"
        );

        res.json({

            closedCounters:

            settings
            .closedCounters
        });
    }
);


// OPEN COUNTER

app.post(

    "/admin/open-counter",

    requireAuth,

    async (req,res)=>{

        const {

            counter,
            date

        } = req.body;

        const settings =

        await CounterSettings
        .findOneAndUpdate(

            {

                date
            },

            {

                $pull:{

                    closedCounters:

                    Number(counter)
                }
            },

            {

                upsert:true,

                new:true
            }
        );

        io.emit(
            "counter-update"
        );

        res.json({

            closedCounters:

            settings
            .closedCounters
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

        // remove base64 prefix
        const base64Data =
            tokenImage.replace(
                /^data:image\/(png|jpeg|jpg);base64,/,
                ""
            );

        await transporter.sendMail({

            from: process.env.EMAIL_USER,

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
                    ),

                    contentType: "image/jpeg"
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
