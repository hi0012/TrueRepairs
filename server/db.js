const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb+srv://USER:PASSWORD@cluster0.iiixwto.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', );
        console.log(`MongoDB Connected`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

module.exports = connectDB;