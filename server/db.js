const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });


const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, );
        console.log(`MongoDB Connected`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

module.exports = connectDB;