require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const AdminUser = require("../models/AdminUser");

const PASSWORDS = {
    superadmin: "vms@24N",
    counter1: "vms@C1",
    counter2: "vms@C2",
    counter3: "vms@C3",
    counter4: "vms@C4",
    counter5: "vms@C5",
    counter6: "vms@C6",
    counter7: "vms@C7"
};

async function updatePasswords() {

    try {

        await mongoose.connect(process.env.MONGO_URI);

        console.log("Connected to MongoDB");

        for (const username of Object.keys(PASSWORDS)) {

            const user = await AdminUser.findOne({ username });

            if (!user) {

                console.log(`Skipping ${username} (not found)`);
                continue;

            }

            const hash = await bcrypt.hash(PASSWORDS[username], 10);

            user.password = hash;

            await user.save();

            console.log(`Updated password for ${username}`);

        }

        console.log("Password update complete.");

        process.exit(0);

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

}

updatePasswords();