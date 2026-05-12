const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({

    rank: String,
    name: String,
    phone: String,
    email: String,
    zsbId: String,
    serviceNo: String,
    zsbBranch: String,
    subDivision: String,
    workType: String,

    counter: Number,
    sequence: Number,
    timeSlot: String,

    status: {
        type: String,
        default: "pending"
    },

    date: String,

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Visitor", visitorSchema);