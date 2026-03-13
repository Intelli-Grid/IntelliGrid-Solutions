import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const coupons = await db.collection('coupons').find({}).toArray();
        console.log('--- ALL COUPONS ---');
        console.log(coupons);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
