require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const AdminUser =
require("../models/AdminUser");

async function seed() {

    try {

        await mongoose.connect(
            process.env.MONGO_URI
        );

        const existing =
        await AdminUser.findOne({
            username: "admin"
        });

        if(existing){

            console.log(
                "Admin already exists."
            );

            process.exit();
        }

        const hash =
        await bcrypt.hash(
            "admin-VMS-24n",
            10
        );

        await AdminUser.create({

            username: "admin",

            password: hash

        });

        console.log(
            "Default admin created."
        );

        process.exit();

    }

    catch(err){

        console.error(err);

        process.exit(1);
    }

}

seed();