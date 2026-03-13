import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        // Find tools with orphaned category ID and set them back to null 
        // OR better yet, let's just create a category called "Other" and map it
        let otherCat = await db.collection('categories').findOne({ name: 'Other' });
        if (!otherCat) {
            const result = await db.collection('categories').insertOne({
                name: 'Other',
                description: 'Uncategorized or uncategorizable tools',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            otherCat = { _id: result.insertedId };
        }

        // Orphans (ID exists but no category document)
        const orphans = await db.collection('tools').aggregate([
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'catData'
                }
            },
            { $match: { catData: { $size: 0 }, category: { $ne: null } } }
        ]).toArray();

        for (const tool of orphans) {
            await db.collection('tools').updateOne(
                { _id: tool._id },
                { $set: { category: otherCat._id } }
            );
        }
        console.log(`4.1.4 Fixed ${orphans.length} orphaned tools to 'Other' category`);

        // Null categories
        const nullCats = await db.collection('tools').countDocuments({ category: null });
        if (nullCats > 0) {
            await db.collection('tools').updateMany(
                { category: null },
                { $set: { category: otherCat._id } }
            );
            console.log(`4.1.4 Fixed ${nullCats} null categories to 'Other' category`);
        }

        // Null/Invalid Pricing
        const invalidPricing = await db.collection('tools').countDocuments({ pricing: { $nin: ['Free', 'Freemium', 'Paid', 'Trial', 'Unknown'] } });
        if (invalidPricing > 0) {
            await db.collection('tools').updateMany(
                { pricing: { $nin: ['Free', 'Freemium', 'Paid', 'Trial', 'Unknown'] } },
                { $set: { pricing: 'Unknown' } }
            );
        }
        console.log(`4.1.5 Fixed ${invalidPricing} pricing properties mapped to null or unknown strings`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
