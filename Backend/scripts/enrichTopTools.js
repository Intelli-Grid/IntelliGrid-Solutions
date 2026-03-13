import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../src/config/database.js';
import Tool from '../src/models/Tool.js';
import Category from '../src/models/Category.js';

dotenv.config();

const topToolsData = [
    {
        name: 'ChatGPT',
        shortDescription: 'The most popular AI chatbot by OpenAI.',
        fullDescription: 'ChatGPT is a conversational AI model developed by OpenAI, capable of generating human-like text based on the prompts you provide. It can help you draft emails, write code, answer questions, and much more.',
        pricing: 'Freemium',
        isFeatured: true,
        logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
        officialUrl: 'https://chat.openai.com/?utm_source=intelligrid',
        tags: ['AI chatbots', 'text generation', 'productivity']
    },
    {
        name: 'Midjourney',
        shortDescription: 'AI tool that converts text prompts into high-quality images.',
        fullDescription: 'Midjourney is an independent research lab exploring new mediums of thought and expanding the imaginative powers of the human species. Their AI tool converts text prompts into incredibly detailed and high-quality images.',
        pricing: 'Paid',
        isFeatured: true,
        logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Midjourney_Emblem.png',
        officialUrl: 'https://www.midjourney.com/?utm_source=intelligrid',
        tags: ['image generators', 'text to image', 'design']
    },
    {
        name: 'Claude',
        shortDescription: 'Advanced AI assistant from Anthropic.',
        fullDescription: 'Claude is a next-generation AI assistant built for work and trained to be safe, accurate, and secure. Created by Anthropic, Claude can help with writing, analysis, coding, and math tasks with highly nuanced understanding.',
        pricing: 'Freemium',
        isFeatured: true,
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Anthropic_logo.svg/1024px-Anthropic_logo.svg.png',
        officialUrl: 'https://claude.ai/?utm_source=intelligrid',
        tags: ['AI chatbots', 'research', 'code assistant']
    },
    {
        name: 'Gemini',
        shortDescription: 'Google’s most capable AI model.',
        fullDescription: 'Gemini is Google’s primary AI assistant (formerly Bard). It is deeply integrated with the Google ecosystem and is capable of reasoning across text, images, video, audio, and code natively.',
        pricing: 'Freemium',
        isFeatured: true,
        logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg',
        officialUrl: 'https://gemini.google.com/?utm_source=intelligrid',
        tags: ['AI chatbots', 'search', 'multimodal']
    },
    {
        name: 'DALL-E',
        shortDescription: 'Advanced image generation by OpenAI.',
        fullDescription: 'DALL-E 3 is an AI system that can create realistic images and art from a description in natural language. It understands significantly more nuance and detail, allowing you to easily translate your ideas into exceptionally accurate images.',
        pricing: 'Paid',
        isFeatured: true,
        logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', // OpenAI logo roughly fits
        officialUrl: 'https://openai.com/dall-e-3/?utm_source=intelligrid',
        tags: ['image generators', 'text to image', 'art']
    }
];

const seedTopTools = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');

        const defaultCategory = await Category.findOne();
        if (!defaultCategory) {
            console.error('No categories found. Run category seed first.');
            process.exit(1);
        }

        for (const data of topToolsData) {
            let tool = await Tool.findOne({ name: data.name });

            if (tool) {
                // Update
                tool.shortDescription = data.shortDescription;
                tool.fullDescription = data.fullDescription;
                if (!tool.logo) tool.logo = data.logo;
                if (!tool.tags || tool.tags.length === 0) tool.tags = data.tags;
                if (!tool.officialUrl.includes('intelligrid')) tool.officialUrl = data.officialUrl;
                tool.isFeatured = data.isFeatured;
                tool.category = tool.category || defaultCategory._id;

                await tool.save();
                console.log(`Updated top tool: ${data.name}`);
            } else {
                // Create
                data.slug = data.name.toLowerCase().replace(/\\s+/g, '-');
                data.category = defaultCategory._id;
                await Tool.create(data);
                console.log(`Created top tool: ${data.name}`);
            }
        }

        console.log('Top tools seeded and enriched successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedTopTools();
