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

app.post('/register', async (req, res) => {
    try {
        const { email } = req.body

        // check if email already exists
        const existingUser = await UserModel.findOne({ email })
        if (existingUser) {
            return res.json({
                success: false,
                message: "This email is already associated with an account."
            })
        }

        // create new user if not found
        const newUser = await UserModel.create(req.body);
        res.json({
            success: true,
            user: newUser
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            success: false,
            message: "Server error"
        })
    }
})


app.listen(3000, ()=> {
    console.log("App is running");
})