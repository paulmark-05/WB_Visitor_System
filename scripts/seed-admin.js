require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const AdminUser = require("../models/AdminUser");

const DEFAULT_PASSWORD =
    process.env.DEFAULT_COUNTER_PASSWORD || "ChangeMe@123";

const USERS = [
    {
        username: "superadmin",
        role: "superadmin",
        assignedCounter: null
    },
    {
        username: "counter1",
        role: "counter",
        assignedCounter: 1
    },
    {
        username: "counter2",
        role: "counter",
        assignedCounter: 2
    },
    {
        username: "counter3",
        role: "counter",
        assignedCounter: 3
    },
    {
        username: "counter4",
        role: "counter",
        assignedCounter: 4
    },
    {
        username: "counter5",
        role: "counter",
        assignedCounter: 5
    },
    {
        username: "counter6",
        role: "counter",
        assignedCounter: 6
    },
    {
        username: "counter7",
        role: "counter",
        assignedCounter: 7
    }
];

async function seed() {

    try {

        await mongoose.connect(process.env.MONGO_URI);

        let created = 0;
        let skipped = 0;

        for (const user of USERS) {

            const existing = await AdminUser.findOne({
                username: user.username
            });

            if (existing) {
                skipped++;
                continue;
            }

            const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

            await AdminUser.create({

                username: user.username,

                password: hash,

                role: user.role,

                assignedCounter: user.assignedCounter,

                active: true,

                lastLogin: null
            });

            created++;
        }

        console.log("--------------------------------");
        console.log("Seed completed");
        console.log("Created :", created);
        console.log("Skipped :", skipped);
        console.log("--------------------------------");

        process.exit(0);

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

}

seed();