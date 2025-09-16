const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    passwordConfirm: String
})

const UserModel = mongoose.model("users", UserSchema)
module.exports = UserModel