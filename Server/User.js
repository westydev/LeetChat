const { Schema, model } = require("mongoose");

const User = Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
    ip: { type: String, required: true },

    messageSize: { type: Number, default: 0 }
});

module.exports = model("User", User);
