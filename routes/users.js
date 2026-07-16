const express = require("express");
const bcrypt = require("bcrypt");

const router = express.Router();

const AdminUser = require("../models/AdminUser");

const requireSuperAdmin = require("../middleware/requireSuperAdmin");


/*
======================================================
Helper Functions
======================================================
*/

function sanitizeUser(user) {

    return {

        _id: user._id,

        username: user.username,

        role: user.role,

        assignedCounter: user.assignedCounter,

        active: user.active,

        createdAt: user.createdAt,

        lastLogin: user.lastLogin

    };

}

/*
======================================================
GET ALL USERS
======================================================

GET /admin/users

Super Admin only

Returns all users except passwords

*/

router.get(
    "/users",
    requireSuperAdmin,
    async (req, res) => {

        try {

            const users = await AdminUser
                .find({})
                .sort({
                    role: 1,
                    assignedCounter: 1,
                    username: 1
                });

            const result =
                users.map(
                    sanitizeUser
                );

            return res.json({

                success: true,

                message: "Users loaded successfully.",

                data: result

            });

        } catch (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load users."

            });

        }

    }
);
/*
======================================================
CREATE USER

POST /admin/users

Super Admin only
======================================================
*/

router.post(
    "/users",
    requireSuperAdmin,
    async (req, res) => {

        try {

            const {
                username,
                password,
                role,
                assignedCounter
            } = req.body;

            /* -------------------------------
               Validation
            ------------------------------- */

            if (
                !username ||
                !password ||
                !role
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Username, password and role are required."

                });

            }

            if (
                password.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must contain at least 8 characters."

                });

            }

            if (
                role !== "superadmin" &&
                role !== "counter"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid role."

                });

            }

            if (

                role === "counter" &&

                (
                    assignedCounter === undefined ||
                    assignedCounter === null ||
                    assignedCounter === ""
                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Assigned counter is required."

                });

            }



            /* -------------------------------
               Duplicate Username
            ------------------------------- */

            const existingUser =
                await AdminUser.findOne({

                    username

                });

            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Username already exists."

                });

            }

            /* -------------------------------
               Counter Validation
            ------------------------------- */

            if (role === "counter") {

                const counterExists =
                    await AdminUser.findOne({

                        role: "counter",

                        assignedCounter:Number(assignedCounter),

                        active:true

                    });

                if (counterExists) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "Counter already assigned."

                    });

                }

            }

            if (
                role === "counter" &&
                (
                    assignedCounter < 1 ||
                    assignedCounter > 7
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Assigned counter must be between 1 and 7."
                });
            }

            /* -------------------------------
               Hash Password
            ------------------------------- */

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            /* -------------------------------
               Create User
            ------------------------------- */

            const newUser =
                new AdminUser({

                    username,

                    password:
                        hashedPassword,

                    role,

                    assignedCounter:
                        role === "counter"
                            ? Number(assignedCounter)
                            : null,

                    active: true,

                    lastLogin: null

                });

            await newUser.save();

            return res.status(201).json({

                success: true,

                message:
                    "User created successfully.",

                data:
                    sanitizeUser(newUser)

            });

        }

        catch (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message:
                    "Unable to create user."

            });

        }

    }

);
/*
======================================================
ENABLE / DISABLE USER

PATCH /admin/users/:id/status

Super Admin only
======================================================
*/

router.patch(
    "/users/:id/status",
    requireSuperAdmin,
    async (req, res) => {

        try {

            const { active } = req.body;

            if (typeof active !== "boolean") {

                return res.status(400).json({

                    success: false,

                    message:
                        "Active must be true or false."

                });

            }

            const user =
                await AdminUser.findById(req.params.id);

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }

            /* ---------------------------------
               Prevent disabling Super Admin
            ---------------------------------- */

            if (
                user.role === "superadmin"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Super Admin cannot be disabled."

                });

            }

            /* ---------------------------------
               Prevent disabling yourself
            ---------------------------------- */

            if (

                req.session.user.username ===
                user.username

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "You cannot disable your own account."

                });

            }

            user.active = active;

            await user.save();

            return res.json({

                success: true,

                message:
                    active
                        ? "User enabled successfully."
                        : "User disabled successfully.",

                data:
                    sanitizeUser(user)

            });

        }

        catch (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update user."

            });

        }

    }

);
/*
======================================================
RESET PASSWORD

PATCH /admin/users/:id/password

Super Admin only
======================================================
*/

router.patch(
    "/users/:id/password",
    requireSuperAdmin,
    async (req, res) => {

        try {

            const { password } = req.body;

            if (
                !password ||
                password.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must contain at least 8 characters."

                });

            }

            const user =
                await AdminUser.findById(req.params.id);

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }

            const hash =
                await bcrypt.hash(
                    password,
                    10
                );

            user.password = hash;

            user.passwordChangedAt =
                new Date();

            user.mustChangePassword =
                false;

            await user.save();

            return res.json({

                success: true,

                message:
                    "Password updated successfully."

            });

        }

        catch (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                message:
                    "Unable to reset password."

            });

        }

    }

);
/*
======================================================
EXPORT ROUTER
======================================================
*/

module.exports = router;