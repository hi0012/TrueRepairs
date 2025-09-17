const express = require('express')
const connectDB = require('./db.js')
const cors = require("cors")
const UserModel = require('./models/users.js')

const app = express()
app.use(express.json())
app.use(cors())

connectDB()

app.post("/login", (req, res) => {
    const {email, password} = req.body;
    UserModel.findOne({email: email})
    .then(user => {
        if(user) {
            if(user.password === password) {
                res.json({
                    success: true,
                    user: {
                        id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email
                    }
                });
            } else {
                res.json("The password is incorrect. Please try again.")
            }
        } else {
            res.json("User does not exist. Please try again.")
        }
    })
})

app.post('/register', (req, res) => {
    UserModel.create(req.body)
    .then(users => res.json(users))
    .catch(err => res.json(err))
})

app.listen(3000, ()=> {
    console.log("App is running");
})