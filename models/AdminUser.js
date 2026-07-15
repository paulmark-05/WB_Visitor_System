const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema({

    username:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },

    password:{
        type:String,
        required:true
    },

    role:{
        type:String,

        enum:[
            "superadmin",
            "counter"
        ],

        required:true
    },

    assignedCounter:{

        type:Number,

        default:null
    },

    active:{

        type:Boolean,

        default:true
    },

    lastLogin:{

        type:Date,

        default:null
    }

},
{
    timestamps:true
});

module.exports =
mongoose.model(
    "AdminUser",
    adminUserSchema
);