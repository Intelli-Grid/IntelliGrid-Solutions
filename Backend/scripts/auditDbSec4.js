import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const orphans = await db.collection('tools').aggregate([
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'catData'
                }
            },
            { $match: { catData: { $size: 0 } } },
            { $limit: 5 }
        ]).toArray();
        console.log('4.1.4 orphaned tools (no matching category _id):', orphans.length);

        const nullCats = await db.collection('tools').countDocuments({ category: null });
        console.log('4.1.4 tools with null category:', nullCats);

        const pricingOutliers = await db.collection('tools').distinct('pricing');
        console.log('4.1.5 Pricing variants:', pricingOutliers);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
