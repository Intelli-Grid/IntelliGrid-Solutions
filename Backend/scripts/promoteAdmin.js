
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Clerk } from '@clerk/clerk-sdk-node';
import User from '../src/models/User.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Valid roles in the new RBAC system
const VALID_ROLES = ['USER', 'MODERATOR', 'TRUSTED_OPERATOR', 'SUPERADMIN'];

// Role descriptions for display
const ROLE_DESCRIPTIONS = {
    USER: 'Regular user — user dashboard only',
    MODERATOR: 'Moderator — can manage tools and reviews in admin panel',
    TRUSTED_OPERATOR: 'Trusted Operator — can access AI agent dashboard',
    SUPERADMIN: 'Super Admin — full access to everything (owner only)',
};

const promoteAdmin = async () => {
    try {
        const email = process.argv[2];
        const targetRole = (process.argv[3] || 'SUPERADMIN').toUpperCase();

        if (!email) {
            console.error('❌ Please provide an email address');
            console.log('');
            console.log('Usage:');
            console.log('  npm run promote-admin <email>                    → promotes to SUPERADMIN');
            console.log('  npm run promote-admin <email> SUPERADMIN         → full owner access');
            console.log('  npm run promote-admin <email> TRUSTED_OPERATOR   → AI agent access');
            console.log('  npm run promote-admin <email> MODERATOR          → admin panel access');
            console.log('  npm run promote-admin <email> USER               → demote to regular user');
            process.exit(1);
        }

        if (!VALID_ROLES.includes(targetRole)) {
            console.error(`❌ Invalid role: "${targetRole}"`);
            console.log(`   Valid roles: ${VALID_ROLES.join(', ')}`);
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

        console.log(`👤 User found: ${user.firstName || ''} ${user.lastName || ''}`);
        console.log(`   Clerk ID:     ${user.clerkId}`);
        console.log(`   Current Role: ${user.role}`);
        console.log(`   Target Role:  ${targetRole} — ${ROLE_DESCRIPTIONS[targetRole]}`);
        console.log('');

        // Update MongoDB
        console.log('⬆️  Updating role in MongoDB...');
        user.role = targetRole;
        await user.save();
        console.log('✅ MongoDB updated.');

        // Update Clerk Metadata
        console.log('☁️  Syncing role to Clerk public metadata...');
        await clerk.users.updateUserMetadata(user.clerkId, {
            publicMetadata: {
                role: targetRole,
            }
        });
        console.log('✅ Clerk metadata updated.');

        console.log('');
        console.log('═══════════════════════════════════════════════');
        console.log(`🎉 Success! ${email} is now: ${targetRole}`);
        console.log(`   ${ROLE_DESCRIPTIONS[targetRole]}`);
        console.log('═══════════════════════════════════════════════');
        console.log('');

        if (targetRole === 'SUPERADMIN') {
            console.log('📍 Access URLs after re-login:');
            console.log('   Main site:  https://intelligrid.online/');
            console.log('   Admin:      https://intelligrid.online/admin');
            console.log('   (Future)    https://admin.intelligrid.online');
        } else if (targetRole === 'MODERATOR') {
            console.log('📍 Access URL after re-login:');
            console.log('   Admin:      https://intelligrid.online/admin');
        }

        console.log('');
        console.log('👉 Ask the user to log out and log back in to activate the new role.');

    } catch (error) {
        console.error('❌ Error updating role:', error.message);
        if (error.errors) {
            console.error('Clerk Error Details:', JSON.stringify(error.errors, null, 2));
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
    }
};

promoteAdmin();
