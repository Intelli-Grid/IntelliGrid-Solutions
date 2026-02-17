
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Clerk } from '@clerk/clerk-sdk-node'; // Import Clerk
import User from '../src/models/User.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const promoteAdmin = async () => {
    try {
        const email = process.argv[2];

        if (!email) {
            console.error('❌ Please provide an email address');
            console.log('Usage: npm run promote-admin <email>');
            process.exit(1);
        }

        if (!process.env.CLERK_SECRET_KEY) {
            console.error('❌ CLERK_SECRET_KEY is missing in .env file');
            process.exit(1);
        }

        // Initialize Clerk
        const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

        console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log(`🔍 Finding user with email: ${email}...`);
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error('❌ User not found! Please sign up on the website first.');
            process.exit(1);
        }

        console.log(`👤 User found: ${user.firstName} ${user.lastName}`);
        console.log(`   Clerk ID: ${user.clerkId}`);
        console.log(`   Current Role (DB): ${user.role}`);

        // Update MongoDB
        console.log('⬆️  Updating Mongo role to admin...');
        user.role = 'admin';
        await user.save();
        console.log('✅ MongoDB updated.');

        // Update Clerk Metadata
        console.log('☁️  Syncing role to Clerk metadata...');
        await clerk.users.updateUserMetadata(user.clerkId, {
            publicMetadata: {
                role: 'admin'
            }
        });
        console.log('✅ Clerk metadata updated.');

        console.log('🎉 Success! User is now a full admin.');
        console.log('👉 Please ask the user to log out and log back in to see the changes.');

    } catch (error) {
        console.error('❌ Error promoting user:', error);
        if (error.errors) {
            console.error('Clerk Error Details:', JSON.stringify(error.errors, null, 2));
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
    }
};

promoteAdmin();
