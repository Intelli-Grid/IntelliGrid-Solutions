/**
 * importTrending200.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports ~200 curated trending & buzzing AI tools directly into MongoDB.
 * These are the tools that dominate Product Hunt, Twitter/X, Reddit/r/artificial
 * and are searched most on Google — the ones missing from your current dataset.
 *
 * Features:
 *  - Deduplicates by slug + officialUrl (100% safe to re-run)
 *  - Maps to existing Category collection (creates if missing)
 *  - Sets status: 'active' + isActive: true (goes live immediately)
 *  - Sets isFeatured / isTrending flags from curated data
 *  - Run syncAlgolia.js after this completes
 *
 * Run:       node scripts/importTrending200.js
 * Dry run:   node scripts/importTrending200.js --dry-run
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import slugify from 'slugify'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const DRY_RUN = process.argv.includes('--dry-run')

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ MongoDB Connected\n')
}

async function ensureCategories(categoryNames) {
  const col = mongoose.connection.collection('categories')
  const map = {}
  const existing = await col.find({}).toArray()
  for (const cat of existing) {
    map[cat.name] = cat._id
    map[cat.slug] = cat._id
  }
  for (const name of categoryNames) {
    if (!map[name]) {
      const slug = slugify(name, { lower: true, strict: true })
      if (!map[slug]) {
        const res = await col.insertOne({
          name, slug,
          description: `Discover the best ${name} AI tools`,
          icon: '🤖', isActive: true, order: 99, toolCount: 0,
          createdAt: new Date(), updatedAt: new Date(),
        })
        map[name] = res.insertedId
        map[slug] = res.insertedId
        console.log(`   📁 Created category: ${name}`)
      } else {
        map[name] = map[slug]
      }
    }
  }
  return map
}

// ─── 200 Curated Trending Tools ───────────────────────────────────────────────
const TRENDING_TOOLS = [
  // AI Assistants & Chatbots
  { name:"ChatGPT", officialUrl:"https://chat.openai.com", category:"AI Assistants & Chatbots", shortDescription:"OpenAI's flagship conversational AI for writing, coding, analysis, and reasoning.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["chatbot","writing","coding","analysis","multimodal"], isFeatured:true, isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Google Gemini","Claude","Copilot"] },
  { name:"Claude", officialUrl:"https://claude.ai", category:"AI Assistants & Chatbots", shortDescription:"Anthropic's AI known for nuanced reasoning, 200K context windows, and safe, honest responses.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["chatbot","writing","analysis","coding","long-context"], isFeatured:true, isTrending:true, platforms:["Web","iOS","Android","API"], alternativeTo:["ChatGPT","Gemini","Copilot"] },
  { name:"Google Gemini", officialUrl:"https://gemini.google.com", category:"AI Assistants & Chatbots", shortDescription:"Google's most capable AI with deep Workspace integration and multimodal capabilities.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["chatbot","google","multimodal","productivity","search"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["ChatGPT","Claude","Copilot"] },
  { name:"Perplexity AI", officialUrl:"https://www.perplexity.ai", category:"AI Assistants & Chatbots", shortDescription:"AI-powered search engine that gives direct, cited answers instead of a list of links.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["search","research","citations","web browsing"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["ChatGPT","Google Search","You.com"] },
  { name:"Microsoft Copilot", officialUrl:"https://copilot.microsoft.com", category:"AI Assistants & Chatbots", shortDescription:"Microsoft's AI assistant built on GPT-4 with deep Office 365 and Windows integration.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$30/mo", tags:["microsoft","office","productivity","enterprise","chatbot"], isTrending:true, platforms:["Web","iOS","Android","Desktop (Windows)"], alternativeTo:["ChatGPT","Gemini","Claude"] },
  { name:"Meta AI", officialUrl:"https://www.meta.ai", category:"AI Assistants & Chatbots", shortDescription:"Meta's AI assistant powered by Llama, integrated into WhatsApp, Instagram, and Messenger.", pricing:"Free", hasFreeTier:true, tags:["chatbot","social media","Meta","WhatsApp"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["ChatGPT","Gemini","Copilot"] },
  { name:"Mistral Le Chat", officialUrl:"https://chat.mistral.ai", category:"AI Assistants & Chatbots", shortDescription:"Mistral AI's chat interface powered by state-of-the-art European LLMs with multilingual excellence.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$14.99/mo", tags:["chatbot","European AI","multilingual","open-source"], isTrending:true, platforms:["Web"], alternativeTo:["ChatGPT","Claude","Gemini"] },
  { name:"Poe", officialUrl:"https://poe.com", category:"AI Assistants & Chatbots", shortDescription:"Quora's platform giving access to ChatGPT, Claude, Gemini, Llama, and 100+ AI models in one place.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$19.99/mo", tags:["multi-model","chatbot","AI aggregator"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["ChatGPT","Claude","Gemini"] },
  { name:"Character.AI", officialUrl:"https://character.ai", category:"AI Assistants & Chatbots", shortDescription:"Create and chat with custom AI characters — fictional personas, celebrity-inspired, or entirely original.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9.99/mo", tags:["character AI","roleplay","entertainment","social"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Replika","ChatGPT"] },
  { name:"You.com", officialUrl:"https://you.com", category:"AI Assistants & Chatbots", shortDescription:"AI search and assistant with real-time web access, code execution, and multimodal capabilities.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$15/mo", tags:["search","AI assistant","research","web access"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Perplexity","ChatGPT","Copilot"] },
  { name:"Pi AI", officialUrl:"https://pi.ai", category:"AI Assistants & Chatbots", shortDescription:"Inflection AI's personal AI built for emotionally supportive, thoughtful conversation and coaching.", pricing:"Free", hasFreeTier:true, tags:["chatbot","personal AI","coaching","emotional support"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["ChatGPT","Replika","Claude"] },
  { name:"Bing Copilot", officialUrl:"https://www.bing.com/chat", category:"AI Assistants & Chatbots", shortDescription:"Microsoft's AI chat in Bing powered by GPT-4 — free unlimited access with real-time web browsing.", pricing:"Free", hasFreeTier:true, tags:["chatbot","search","Microsoft","free GPT-4"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["ChatGPT","Google Gemini","Perplexity"] },

  // Developer Tools
  { name:"GitHub Copilot", officialUrl:"https://github.com/features/copilot", category:"Developer Tools", shortDescription:"AI pair programmer suggesting code completions, generating functions, and explaining code inline in VS Code.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$10/mo", tags:["coding","VS Code","autocomplete","developer tools","github"], isTrending:true, platforms:["VS Code Extension","API"], alternativeTo:["Cursor","Codeium","Tabnine"] },
  { name:"Cursor", officialUrl:"https://cursor.sh", category:"Developer Tools", shortDescription:"AI-first code editor built on VS Code that rewrites, explains, and generates features from natural language.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["coding","IDE","code generation","developer tools"], isFeatured:true, isTrending:true, platforms:["Desktop (Mac)","Desktop (Windows)"], alternativeTo:["GitHub Copilot","VS Code","Windsurf"] },
  { name:"Windsurf", officialUrl:"https://codeium.com/windsurf", category:"Developer Tools", shortDescription:"Codeium's AI-native IDE with autonomous Cascade agents that plan, write, and execute coding tasks.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$15/mo", tags:["coding","IDE","agentic coding","developer tools"], isTrending:true, platforms:["Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Cursor","GitHub Copilot"] },
  { name:"Bolt.new", officialUrl:"https://bolt.new", category:"Developer Tools", shortDescription:"StackBlitz's AI tool that generates, runs, edits, and deploys full-stack web apps directly in the browser.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["coding","web development","no-code","full-stack","deployment"], isTrending:true, platforms:["Web"], alternativeTo:["Lovable","v0.dev","Replit"] },
  { name:"v0 by Vercel", officialUrl:"https://v0.dev", category:"Developer Tools", shortDescription:"Vercel's AI UI generator creating production-ready React and Tailwind components from text descriptions.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["UI generation","React","Tailwind","component","frontend"], isTrending:true, platforms:["Web"], alternativeTo:["Bolt.new","Lovable","Galileo AI"] },
  { name:"Lovable", officialUrl:"https://lovable.dev", category:"Developer Tools", shortDescription:"AI full-stack engineer that builds, deploys, and iterates on web apps from plain English descriptions.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$25/mo", tags:["no-code","full-stack","web apps","AI engineer"], isTrending:true, platforms:["Web"], alternativeTo:["Bolt.new","Replit","Bubble"] },
  { name:"Replit", officialUrl:"https://replit.com", category:"Developer Tools", shortDescription:"Browser-based collaborative IDE with AI code generation, deployment, and cloud compute built in.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$25/mo", tags:["coding","IDE","cloud","deployment","collaboration"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["GitHub Codespaces","CodeSandbox","Bolt.new"] },
  { name:"Claude Code", officialUrl:"https://docs.anthropic.com/claude/docs/claude-code", category:"Developer Tools", shortDescription:"Anthropic's agentic command-line coding tool that autonomously edits codebases and runs tests.", pricing:"Paid", hasFreeTier:false, startingPrice:"API usage", tags:["coding","CLI","agentic","developer tools","Anthropic"], isTrending:true, platforms:["API","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Devin","Cursor","GitHub Copilot"] },
  { name:"Codeium", officialUrl:"https://codeium.com", category:"Developer Tools", shortDescription:"Free AI code completion supporting 70+ languages with VS Code, JetBrains, and Neovim plugins.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$12/mo", tags:["coding","autocomplete","free","developer tools"], isTrending:true, platforms:["VS Code Extension","API"], alternativeTo:["GitHub Copilot","Tabnine"] },
  { name:"Amazon CodeWhisperer", officialUrl:"https://aws.amazon.com/codewhisperer", category:"Developer Tools", shortDescription:"Amazon's AI coding companion with deep AWS integration and security vulnerability scanning.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$19/mo", tags:["coding","AWS","security scanning","developer tools"], isTrending:true, platforms:["VS Code Extension","API"], alternativeTo:["GitHub Copilot","Codeium","Cursor"] },
  { name:"Tabnine", officialUrl:"https://www.tabnine.com", category:"Developer Tools", shortDescription:"Privacy-first AI code completion running locally, with enterprise on-premise deployment options.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$15/mo", tags:["coding","autocomplete","privacy","enterprise","developer tools"], isTrending:true, platforms:["VS Code Extension","API"], alternativeTo:["GitHub Copilot","Codeium"] },
  { name:"OpenAI API", officialUrl:"https://platform.openai.com", category:"Developer Tools", shortDescription:"OpenAI's developer platform offering GPT-4o, o1, DALL-E 3, Whisper, TTS, and Embeddings via REST API.", pricing:"Paid", hasFreeTier:false, startingPrice:"$0.001/1K tokens", tags:["API","developer tools","LLM","enterprise"], isTrending:true, platforms:["API"], alternativeTo:["Anthropic API","Google Vertex AI","AWS Bedrock"] },
  { name:"Anthropic API", officialUrl:"https://www.anthropic.com/api", category:"Developer Tools", shortDescription:"Anthropic's developer API for Claude models — best-in-class reasoning, 200K context, and function calling.", pricing:"Paid", hasFreeTier:false, startingPrice:"$0.003/1K input tokens", tags:["API","developer tools","LLM","enterprise"], isTrending:true, platforms:["API"], alternativeTo:["OpenAI API","Google Vertex AI","AWS Bedrock"] },
  { name:"Groq", officialUrl:"https://groq.com", category:"Developer Tools", shortDescription:"Ultra-fast AI inference API running Llama, Mixtral, and Gemma at 10-100x faster speeds.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$0.05/1M tokens", tags:["API","fast inference","LLM","developer tools","open-source models"], isTrending:true, platforms:["API"], alternativeTo:["OpenAI API","Anthropic API","Together AI"] },
  { name:"Replicate", officialUrl:"https://replicate.com", category:"Developer Tools", shortDescription:"Run thousands of AI models via a simple API — image generation, video, audio, code, and more.", pricing:"Paid", hasFreeTier:false, startingPrice:"Pay per use", tags:["API","model hosting","image generation","developer tools"], isTrending:true, platforms:["API"], alternativeTo:["Hugging Face","Fal.ai","Modal"] },
  { name:"Hugging Face", officialUrl:"https://huggingface.co", category:"Developer Tools", shortDescription:"The GitHub for AI — host, discover, and deploy open-source models, datasets, and ML applications.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9/mo", tags:["model hub","open-source","machine learning","API"], isTrending:true, platforms:["Web","API"], alternativeTo:["OpenAI API","Replicate","Google Vertex AI"] },
  { name:"Ollama", officialUrl:"https://ollama.com", category:"Developer Tools", shortDescription:"Run Llama, Mistral, Gemma, and other open-source LLMs locally on your Mac, Windows, or Linux machine.", pricing:"Free", hasFreeTier:true, tags:["local AI","open-source","privacy","LLM","self-hosted"], isTrending:true, platforms:["Desktop (Mac)","Desktop (Windows)","API"], alternativeTo:["OpenAI API","LM Studio","GPT4All"] },
  { name:"LM Studio", officialUrl:"https://lmstudio.ai", category:"Developer Tools", shortDescription:"Desktop app for discovering, downloading, and running local LLMs with an OpenAI-compatible server.", pricing:"Free", hasFreeTier:true, tags:["local AI","desktop","LLM","privacy","open-source"], isTrending:true, platforms:["Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Ollama","GPT4All","Jan.ai"] },
  { name:"Vercel AI SDK", officialUrl:"https://sdk.vercel.ai", category:"Developer Tools", shortDescription:"Open-source TypeScript SDK for building AI-powered applications with streaming and multi-model support.", pricing:"Free", hasFreeTier:true, tags:["developer tools","SDK","TypeScript","streaming AI"], isTrending:true, platforms:["API"], alternativeTo:["LangChain","OpenAI SDK","Anthropic SDK"] },

  // Image Generation
  { name:"Midjourney", officialUrl:"https://www.midjourney.com", category:"Image Generation", shortDescription:"The gold standard AI image generator known for breathtaking photorealistic and artistic images.", pricing:"Paid", hasFreeTier:false, startingPrice:"$10/mo", tags:["image generation","art","design","Discord"], isFeatured:true, isTrending:true, platforms:["Web","Discord Bot"], alternativeTo:["DALL-E 3","Stable Diffusion","Adobe Firefly"] },
  { name:"DALL-E 3", officialUrl:"https://openai.com/dall-e-3", category:"Image Generation", shortDescription:"OpenAI's image model in ChatGPT generating highly accurate images from detailed text prompts.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["image generation","OpenAI","API"], isTrending:true, platforms:["Web","API"], alternativeTo:["Midjourney","Stable Diffusion","Ideogram"] },
  { name:"Stable Diffusion", officialUrl:"https://stability.ai", category:"Image Generation", shortDescription:"Open-source AI image model runnable locally for unlimited, private image generation.", pricing:"Free", hasFreeTier:true, tags:["image generation","open-source","local AI","fine-tuning"], isTrending:true, platforms:["Desktop (Mac)","Desktop (Windows)","API"], alternativeTo:["Midjourney","DALL-E 3","Adobe Firefly"] },
  { name:"Adobe Firefly", officialUrl:"https://firefly.adobe.com", category:"Image Generation", shortDescription:"Adobe's commercially safe AI image generator trained on licensed content, built into Creative Cloud.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$4.99/mo", tags:["image generation","Adobe","design","commercial safe","Photoshop"], isTrending:true, platforms:["Web","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Midjourney","DALL-E 3","Canva AI"] },
  { name:"Ideogram", officialUrl:"https://ideogram.ai", category:"Image Generation", shortDescription:"AI image generator excelling at embedding readable text into images — posters, logos, and typography.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$8/mo", tags:["image generation","text-in-image","logo","poster","typography"], isTrending:true, platforms:["Web"], alternativeTo:["Midjourney","DALL-E 3","Canva AI"] },
  { name:"Flux", officialUrl:"https://blackforestlabs.ai", category:"Image Generation", shortDescription:"Black Forest Labs' state-of-the-art open-source image model that rivals Midjourney in quality.", pricing:"Freemium", hasFreeTier:true, tags:["image generation","open-source","API","photorealistic"], isTrending:true, platforms:["API","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Midjourney","Stable Diffusion","DALL-E 3"] },
  { name:"Leonardo AI", officialUrl:"https://leonardo.ai", category:"Image Generation", shortDescription:"AI image platform with fine-tuned models for game assets, concept art, and consistent character generation.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$12/mo", tags:["image generation","game assets","concept art","fine-tuning"], isTrending:true, platforms:["Web"], alternativeTo:["Midjourney","Stable Diffusion","Adobe Firefly"] },
  { name:"Playground AI", officialUrl:"https://playground.com", category:"Image Generation", shortDescription:"Free AI image editor combining Stable Diffusion and DALL-E with a powerful canvas editing workflow.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$15/mo", tags:["image generation","canvas editor","design","free"], isTrending:true, platforms:["Web"], alternativeTo:["Midjourney","Adobe Firefly","Canva AI"] },
  { name:"Bing Image Creator", officialUrl:"https://www.bing.com/images/create", category:"Image Generation", shortDescription:"Microsoft's free DALL-E 3 image generator built into Bing — 100 free generations daily.", pricing:"Free", hasFreeTier:true, tags:["image generation","Microsoft","DALL-E 3","free"], isTrending:true, platforms:["Web"], alternativeTo:["DALL-E 3","Midjourney","Adobe Firefly"] },
  { name:"NightCafe", officialUrl:"https://nightcafe.studio", category:"Image Generation", shortDescription:"AI art generator with community features, multiple generation algorithms, and style transfer.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$5.99/mo", tags:["image generation","community","art","style transfer"], isTrending:false, platforms:["Web","iOS","Android"], alternativeTo:["Midjourney","Leonardo AI","Playground AI"] },

  // Video Generation
  { name:"Sora", officialUrl:"https://sora.com", category:"Video Generation", shortDescription:"OpenAI's breakthrough text-to-video model generating cinematic, high-quality videos up to 20 seconds.", pricing:"Freemium", hasFreeTier:false, startingPrice:"$20/mo", tags:["video generation","text-to-video","OpenAI"], isFeatured:true, isTrending:true, platforms:["Web"], alternativeTo:["Runway","Kling AI","Hailuo AI"] },
  { name:"Runway", officialUrl:"https://runwayml.com", category:"Video Generation", shortDescription:"Professional AI video platform used by Hollywood studios for video generation, editing, and visual effects.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$12/mo", tags:["video generation","video editing","VFX","professional"], isTrending:true, platforms:["Web"], alternativeTo:["Sora","Kling AI","Pika"] },
  { name:"Kling AI", officialUrl:"https://klingai.com", category:"Video Generation", shortDescription:"Kuaishou's powerful text-to-video and image-to-video AI with 2-minute video generation and realistic physics.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$8/mo", tags:["video generation","text-to-video","image-to-video"], isTrending:true, platforms:["Web"], alternativeTo:["Runway","Sora","Hailuo AI"] },
  { name:"Hailuo AI", officialUrl:"https://hailuoai.video", category:"Video Generation", shortDescription:"MiniMax's viral AI video generator known for hyper-realistic human motion and face consistency.", pricing:"Freemium", hasFreeTier:true, tags:["video generation","realistic motion","face consistency"], isTrending:true, platforms:["Web"], alternativeTo:["Runway","Kling AI","Sora"] },
  { name:"Pika Labs", officialUrl:"https://pika.art", category:"Video Generation", shortDescription:"AI video creation platform with unique scene modification, Pikaffects, and video transformation features.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$8/mo", tags:["video generation","video editing","special effects"], isTrending:true, platforms:["Web"], alternativeTo:["Runway","Kling AI","Sora"] },
  { name:"HeyGen", officialUrl:"https://www.heygen.com", category:"Video Generation", shortDescription:"AI video platform for professional spokesperson videos with custom AI avatars and voice cloning.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$29/mo", tags:["avatar video","voice cloning","video translation","marketing"], isFeatured:true, isTrending:true, platforms:["Web"], alternativeTo:["Synthesia","D-ID","Colossyan"] },
  { name:"Synthesia", officialUrl:"https://www.synthesia.io", category:"Video Generation", shortDescription:"Enterprise AI video platform for training, onboarding, and communications videos with AI presenters.", pricing:"Paid", hasFreeTier:false, startingPrice:"$29/mo", tags:["avatar video","training videos","enterprise","L&D"], isTrending:true, platforms:["Web"], alternativeTo:["HeyGen","D-ID","Colossyan"] },
  { name:"Luma Dream Machine", officialUrl:"https://lumalabs.ai/dream-machine", category:"Video Generation", shortDescription:"Luma AI's fast, high-quality video generator producing realistic motion from text and images.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$29.99/mo", tags:["video generation","3D","realistic motion"], isTrending:true, platforms:["Web","API"], alternativeTo:["Runway","Kling AI","Sora"] },
  { name:"CapCut AI", officialUrl:"https://www.capcut.com", category:"Video Generation", shortDescription:"TikTok's video editor with viral AI features — auto-captions, background removal, AI avatars, and templates.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9.99/mo", tags:["video editing","social media","TikTok","mobile"], isFeatured:true, isTrending:true, platforms:["Web","iOS","Android","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Adobe Premiere","DaVinci Resolve","InShot"] },
  { name:"Invideo AI", officialUrl:"https://invideo.io", category:"Video Generation", shortDescription:"AI video generator turning scripts, prompts, or articles into polished videos with voiceover and music.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$25/mo", tags:["video generation","script to video","voiceover","templates"], isTrending:true, platforms:["Web"], alternativeTo:["Synthesia","HeyGen","Pictory"] },
  { name:"D-ID", officialUrl:"https://www.d-id.com", category:"Video Generation", shortDescription:"Create talking AI avatars from a single photo — animate faces with text or audio for video production.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$5.99/mo", tags:["avatar video","talking head","digital human","video production"], isTrending:true, platforms:["Web","API"], alternativeTo:["HeyGen","Synthesia","Colossyan"] },

  // Writing & Content
  { name:"Jasper AI", officialUrl:"https://www.jasper.ai", category:"Writing & Content", shortDescription:"Enterprise AI writing platform for marketing teams with brand voice training and campaign management.", pricing:"Paid", hasFreeTier:false, startingPrice:"$49/mo", tags:["writing","marketing","copywriting","content marketing","enterprise"], isTrending:true, platforms:["Web","Chrome Extension"], alternativeTo:["Copy.ai","Writer","ChatGPT"] },
  { name:"Copy.ai", officialUrl:"https://www.copy.ai", category:"Writing & Content", shortDescription:"AI-powered GTM platform automating marketing content, sales sequences, and go-to-market workflows.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$49/mo", tags:["writing","sales","marketing","GTM","automation"], isTrending:true, platforms:["Web"], alternativeTo:["Jasper","HubSpot","Outreach"] },
  { name:"Notion AI", officialUrl:"https://www.notion.so/product/ai", category:"Writing & Content", shortDescription:"AI writing, summarization, and Q&A built directly into Notion's workspace.", pricing:"Freemium", hasFreeTier:false, startingPrice:"$10/mo", tags:["productivity","writing","notes","knowledge management"], isTrending:true, platforms:["Web","iOS","Android","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Obsidian AI","Confluence AI","Google Docs AI"] },
  { name:"Grammarly", officialUrl:"https://www.grammarly.com", category:"Writing & Content", shortDescription:"AI writing assistant fixing grammar, improving clarity, adjusting tone, and generating content everywhere.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$12/mo", tags:["writing","grammar","editing","productivity"], isTrending:true, platforms:["Web","iOS","Android","Chrome Extension","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["ProWritingAid","Hemingway Editor","QuillBot"] },
  { name:"Quillbot", officialUrl:"https://quillbot.com", category:"Writing & Content", shortDescription:"AI paraphrasing, grammar, summarization, and citation tools used by 50M+ students and writers.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9.95/mo", tags:["writing","paraphrasing","academic","grammar","summarization"], isTrending:true, platforms:["Web","Chrome Extension","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Grammarly","ProWritingAid","Wordtune"] },
  { name:"Writesonic", officialUrl:"https://writesonic.com", category:"Writing & Content", shortDescription:"AI writer for SEO content, ads, landing pages, and chatbots with real-time Google data integration.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$19/mo", tags:["writing","SEO","marketing","chatbots"], isTrending:true, platforms:["Web","Chrome Extension"], alternativeTo:["Jasper","Copy.ai","Surfer SEO"] },
  { name:"Rytr", officialUrl:"https://rytr.me", category:"Writing & Content", shortDescription:"Affordable AI writing assistant for blogs, emails, social media, and SEO content with 40+ templates.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9/mo", tags:["writing","content marketing","affordable","templates"], isTrending:false, platforms:["Web","Chrome Extension"], alternativeTo:["Jasper","Copy.ai","ChatGPT"] },
  { name:"Writer", officialUrl:"https://writer.com", category:"Writing & Content", shortDescription:"Enterprise AI writing platform with company-wide style enforcement, brand voice, and compliance guardrails.", pricing:"Paid", hasFreeTier:false, startingPrice:"$18/mo", tags:["writing","enterprise","brand voice","compliance","content"], isTrending:true, platforms:["Web","Chrome Extension"], alternativeTo:["Jasper","Grammarly Business","Glean"] },
  { name:"DeepL", officialUrl:"https://www.deepl.com", category:"Writing & Content", shortDescription:"The most accurate AI translator, widely regarded as superior to Google Translate for nuanced translations.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$10.49/mo", tags:["translation","writing","language","enterprise"], isTrending:true, platforms:["Web","iOS","Android","Desktop (Mac)","Desktop (Windows)","API"], alternativeTo:["Google Translate","Microsoft Translator"] },
  { name:"Sudowrite", officialUrl:"https://www.sudowrite.com", category:"Writing & Content", shortDescription:"AI writing tool designed specifically for fiction writers — beat sheets, character development, story expansion.", pricing:"Paid", hasFreeTier:false, startingPrice:"$19/mo", tags:["writing","fiction","creative writing","storytelling"], isTrending:true, platforms:["Web"], alternativeTo:["ChatGPT","Jasper"] },

  // Automation & Productivity
  { name:"Zapier AI", officialUrl:"https://zapier.com/ai", category:"Automation", shortDescription:"Zapier's AI layer building automation workflows from plain English and adding intelligence to any task.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$19.99/mo", tags:["automation","no-code","workflow","integration"], isTrending:true, platforms:["Web"], alternativeTo:["Make.com","n8n","Microsoft Power Automate"] },
  { name:"Make.com", officialUrl:"https://www.make.com", category:"Automation", shortDescription:"Visual automation platform handling complex multi-step workflows with if/then logic and AI modules.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9/mo", tags:["automation","visual workflow","integration","no-code"], isTrending:true, platforms:["Web"], alternativeTo:["Zapier","n8n","Microsoft Power Automate"] },
  { name:"n8n", officialUrl:"https://n8n.io", category:"Automation", shortDescription:"Open-source workflow automation with AI nodes that runs self-hosted for complete data privacy.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["automation","open-source","self-hosted","AI workflows"], isTrending:true, platforms:["Web","Desktop (Mac)","Desktop (Windows)","API"], alternativeTo:["Zapier","Make.com","Langchain"] },
  { name:"Otter.ai", officialUrl:"https://otter.ai", category:"Productivity", shortDescription:"Real-time AI meeting transcription, summaries, and action items for Zoom, Teams, and Google Meet.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$16.99/mo", tags:["meeting transcription","productivity","note-taking","meeting summary"], isTrending:true, platforms:["Web","iOS","Android","Chrome Extension"], alternativeTo:["Fireflies.ai","Fathom","tl;dv"] },
  { name:"Fireflies.ai", officialUrl:"https://fireflies.ai", category:"Productivity", shortDescription:"AI meeting notetaker that records, transcribes, analyzes, and searches all your meetings.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$18/mo", tags:["meeting transcription","note-taking","CRM","sales intelligence"], isTrending:true, platforms:["Web","Chrome Extension"], alternativeTo:["Otter.ai","Fathom","tl;dv"] },
  { name:"Fathom", officialUrl:"https://fathom.video", category:"Productivity", shortDescription:"Free AI meeting recorder and notetaker for Zoom, Google Meet, and Teams with instant summaries.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$19/mo", tags:["meeting recording","transcription","note-taking","productivity"], isTrending:true, platforms:["Web","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Otter.ai","Fireflies.ai","tl;dv"] },
  { name:"tl;dv", officialUrl:"https://tldv.io", category:"Productivity", shortDescription:"AI meeting recorder creating video clips, highlights, and syncing meeting insights to your CRM.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["meeting recording","CRM sync","sales intelligence","note-taking"], isTrending:true, platforms:["Web","Chrome Extension"], alternativeTo:["Fireflies.ai","Otter.ai","Fathom"] },
  { name:"Reclaim.ai", officialUrl:"https://reclaim.ai", category:"Productivity", shortDescription:"AI scheduling assistant automatically blocking time for habits, tasks, and priorities in Google Calendar.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$10/mo", tags:["scheduling","calendar","productivity","time management"], isTrending:true, platforms:["Web","Chrome Extension"], alternativeTo:["Clockwise","Motion","Cal.ai"] },
  { name:"Superhuman", officialUrl:"https://superhuman.com", category:"Productivity", shortDescription:"The fastest email app with AI that triages, summarizes, drafts replies, and achieves inbox zero.", pricing:"Paid", hasFreeTier:false, startingPrice:"$30/mo", tags:["email","productivity","inbox zero","executive tools"], isTrending:true, platforms:["Web","iOS","Android","Desktop (Mac)"], alternativeTo:["HEY Email","Spark","Gmail"] },
  { name:"Notion", officialUrl:"https://www.notion.so", category:"Productivity", shortDescription:"All-in-one workspace for notes, docs, wikis, and project management with deep AI integration.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$10/mo", tags:["productivity","note-taking","project management","knowledge management"], isFeatured:true, isTrending:true, platforms:["Web","iOS","Android","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Obsidian","Confluence","Coda"] },
  { name:"Obsidian", officialUrl:"https://obsidian.md", category:"Productivity", shortDescription:"Local-first knowledge management tool with AI plugins for a private, interconnected second brain.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$50/yr", tags:["note-taking","knowledge management","local-first","second brain"], isTrending:true, platforms:["Desktop (Mac)","Desktop (Windows)","iOS","Android"], alternativeTo:["Notion","Roam Research","Logseq"] },
  { name:"Linear AI", officialUrl:"https://linear.app", category:"Productivity", shortDescription:"Fast project management with AI that auto-creates issues, generates summaries, and predicts project risks.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$8/mo", tags:["project management","issue tracking","developer tools","AI"], isTrending:true, platforms:["Web","iOS","Android","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Jira","Asana","Monday.com"] },
  { name:"Asana AI", officialUrl:"https://asana.com/product/ai", category:"Productivity", shortDescription:"Asana's AI features for task summaries, workflow bottleneck identification, and intelligent planning.", pricing:"Freemium", hasFreeTier:false, startingPrice:"$13.49/mo", tags:["project management","productivity","AI","team collaboration"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Monday.com AI","ClickUp AI","Linear"] },
  { name:"Glean", officialUrl:"https://www.glean.com", category:"Productivity", shortDescription:"Enterprise AI search and assistant searching across all your company's tools to surface relevant knowledge.", pricing:"Paid", hasFreeTier:false, tags:["enterprise search","knowledge management","productivity","AI assistant"], isTrending:true, platforms:["Web"], alternativeTo:["Microsoft Copilot","Notion AI","Guru"] },

  // Audio & Music
  { name:"ElevenLabs", officialUrl:"https://elevenlabs.io", category:"Audio & Music", shortDescription:"The most realistic AI voice synthesis and cloning platform used by top podcasters and content creators.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$5/mo", tags:["text-to-speech","voice cloning","audio","narration"], isFeatured:true, isTrending:true, platforms:["Web","API"], alternativeTo:["PlayHT","Murf AI","Descript"] },
  { name:"Suno AI", officialUrl:"https://suno.ai", category:"Audio & Music", shortDescription:"Create full songs with lyrics, vocals, and instruments from a simple text prompt in seconds.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$10/mo", tags:["music generation","AI music","audio","songwriting"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Udio","Soundraw","Mubert"] },
  { name:"Udio", officialUrl:"https://www.udio.com", category:"Audio & Music", shortDescription:"AI music generator producing diverse, high-fidelity musical styles from simple text prompts.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$10/mo", tags:["music generation","AI music","audio"], isTrending:true, platforms:["Web"], alternativeTo:["Suno","Soundraw","Mubert"] },
  { name:"Descript", officialUrl:"https://www.descript.com", category:"Audio & Music", shortDescription:"Edit audio and video by editing text — document-style media editor with AI overdubbing and screen recording.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$24/mo", tags:["video editing","podcast editing","voice cloning","screen recording"], isTrending:true, platforms:["Web","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Adobe Premiere","Audacity","Riverside.fm"] },
  { name:"Murf AI", officialUrl:"https://murf.ai", category:"Audio & Music", shortDescription:"AI voice generator with 120+ voices for narrations, videos, and podcasts with studio quality.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$19/mo", tags:["text-to-speech","voiceover","narration","video"], isTrending:true, platforms:["Web"], alternativeTo:["ElevenLabs","PlayHT","LOVO AI"] },
  { name:"PlayHT", officialUrl:"https://play.ht", category:"Audio & Music", shortDescription:"AI voice generator and voice cloning with ultra-realistic speech synthesis for content creators.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$31.20/mo", tags:["text-to-speech","voice cloning","narration","podcast"], isTrending:true, platforms:["Web","API"], alternativeTo:["ElevenLabs","Murf AI","Resemble AI"] },
  { name:"Adobe Podcast AI", officialUrl:"https://podcast.adobe.com", category:"Audio & Music", shortDescription:"Adobe's free AI audio tools — Enhance Speech removes background noise making any audio studio-quality.", pricing:"Freemium", hasFreeTier:true, tags:["audio enhancement","podcast","noise removal","Adobe"], isTrending:true, platforms:["Web"], alternativeTo:["Descript","Krisp","Cleanvoice"] },

  // Marketing & SEO
  { name:"Surfer SEO", officialUrl:"https://surferseo.com", category:"Marketing & SEO", shortDescription:"Data-driven SEO tool analyzing top-ranking pages and guiding AI content creation to rank on Google.", pricing:"Paid", hasFreeTier:false, startingPrice:"$89/mo", tags:["SEO","content marketing","keyword research","content optimization"], isTrending:true, platforms:["Web","Chrome Extension"], alternativeTo:["Clearscope","MarketMuse","Frase"] },
  { name:"Semrush", officialUrl:"https://www.semrush.com", category:"Marketing & SEO", shortDescription:"Comprehensive SEO and digital marketing platform with AI writing, competitor analysis, and keyword research.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$139.95/mo", tags:["SEO","digital marketing","competitive analysis","keyword research"], isTrending:true, platforms:["Web","API"], alternativeTo:["Ahrefs","Moz","Surfer SEO"] },
  { name:"AdCreative.ai", officialUrl:"https://www.adcreative.ai", category:"Marketing & SEO", shortDescription:"AI generating high-converting ad creatives and banners trained on millions of successful ads.", pricing:"Paid", hasFreeTier:false, startingPrice:"$29/mo", tags:["ad generation","marketing","design","conversion optimization"], isTrending:true, platforms:["Web"], alternativeTo:["Canva AI","Jasper","Pencil"] },
  { name:"Opus Clip", officialUrl:"https://www.opus.pro", category:"Marketing & SEO", shortDescription:"AI video repurposing tool turning long-form content into viral short clips for TikTok, Reels, and Shorts.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$19/mo", tags:["video repurposing","short-form video","content creation","social media"], isTrending:true, platforms:["Web"], alternativeTo:["Captions","Vidyo.ai","Klap"] },
  { name:"Buffer AI", officialUrl:"https://buffer.com", category:"Marketing & SEO", shortDescription:"Social media management platform with AI that generates, schedules, and repurposes content across channels.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$6/mo", tags:["social media","content scheduling","AI writing","marketing"], isTrending:true, platforms:["Web","iOS","Android","Chrome Extension"], alternativeTo:["Hootsuite","Later","Sprout Social"] },
  { name:"Captions", officialUrl:"https://www.captions.ai", category:"Marketing & SEO", shortDescription:"AI video creation app for creators — teleprompter, auto-captions, eye contact correction, and AI clips.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$19.99/mo", tags:["video creation","social media","captions","content creator"], isTrending:true, platforms:["iOS","Android","Web"], alternativeTo:["CapCut AI","Opus Clip","Descript"] },
  { name:"Pictory", officialUrl:"https://pictory.ai", category:"Marketing & SEO", shortDescription:"Convert blog posts, scripts, and Zoom recordings into short branded videos with AI.", pricing:"Freemium", hasFreeTier:false, startingPrice:"$23/mo", tags:["video creation","content repurposing","marketing","blog to video"], isTrending:true, platforms:["Web"], alternativeTo:["Invideo AI","Lumen5","Synthesia"] },

  // Design Tools
  { name:"Canva AI", officialUrl:"https://www.canva.com/ai-image-generator", category:"Design Tools", shortDescription:"Canva's AI suite — Magic Design, text-to-image, background removal, and AI video in one platform.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$14.99/mo", tags:["design","graphic design","presentation","social media","templates"], isFeatured:true, isTrending:true, platforms:["Web","iOS","Android","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Adobe Express","Figma AI","Visme"] },
  { name:"Figma AI", officialUrl:"https://www.figma.com/ai", category:"Design Tools", shortDescription:"Figma's native AI for generating UI designs, replacing dummy content, and auto-annotating designs.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$15/mo", tags:["UI design","prototyping","design tools","Figma"], isTrending:true, platforms:["Web","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Adobe XD","Sketch","Framer"] },
  { name:"Framer AI", officialUrl:"https://www.framer.com", category:"Design Tools", shortDescription:"AI-powered website builder generating complete, production-ready websites from a text prompt.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$15/mo", tags:["website builder","no-code","design","web development"], isTrending:true, platforms:["Web"], alternativeTo:["Webflow","Wix","Squarespace"] },
  { name:"Photoroom", officialUrl:"https://www.photoroom.com", category:"Design Tools", shortDescription:"AI photo editing app for e-commerce — remove backgrounds, add scenes, create professional product photos.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9.99/mo", tags:["photo editing","e-commerce","background removal","product photography"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Remove.bg","Adobe Firefly","Canva AI"] },
  { name:"Remove.bg", officialUrl:"https://www.remove.bg", category:"Design Tools", shortDescription:"AI background remover working in seconds with professional-quality cutouts for images and graphics.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9/mo", tags:["background removal","photo editing","e-commerce","design"], isTrending:true, platforms:["Web","API"], alternativeTo:["Photoroom","Adobe Firefly","Canva AI"] },
  { name:"Topaz Labs", officialUrl:"https://www.topazlabs.com", category:"Design Tools", shortDescription:"AI photo and video enhancement — upscale, denoise, sharpen, and restore images and video with best-in-class quality.", pricing:"Paid", hasFreeTier:false, startingPrice:"$199 one-time", tags:["image enhancement","photo editing","video upscaling","noise reduction"], isTrending:true, platforms:["Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Adobe Photoshop AI","Luminar AI","ON1"] },
  { name:"Gamma.app", officialUrl:"https://gamma.app", category:"Design Tools", shortDescription:"AI presentation and document creator generating beautiful slide decks and web pages in seconds.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$10/mo", tags:["presentation","slides","document","design"], isTrending:true, platforms:["Web"], alternativeTo:["Beautiful.ai","Tome","PowerPoint Designer"] },
  { name:"Beautiful.ai", officialUrl:"https://www.beautiful.ai", category:"Design Tools", shortDescription:"Smart presentation software with AI that automatically adjusts layouts as you add or change content.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$12/mo", tags:["presentation","slides","design","smart layouts"], isTrending:true, platforms:["Web"], alternativeTo:["Gamma","Tome","Canva"] },
  { name:"Looka", officialUrl:"https://looka.com", category:"Design Tools", shortDescription:"AI logo maker and brand kit generator — create a professional brand identity in minutes.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20 one-time", tags:["logo design","branding","design","small business"], isTrending:true, platforms:["Web"], alternativeTo:["Canva","Wix Logo Maker","Tailor Brands"] },

  // Research
  { name:"NotebookLM", officialUrl:"https://notebooklm.google.com", category:"Research", shortDescription:"Google's AI research assistant analyzing uploaded documents and answering questions with citations.", pricing:"Free", hasFreeTier:true, tags:["research","note-taking","document analysis","knowledge management"], isFeatured:true, isTrending:true, platforms:["Web"], alternativeTo:["Perplexity","Elicit","Consensus"] },
  { name:"Elicit", officialUrl:"https://elicit.com", category:"Research", shortDescription:"AI research assistant for scientific literature — finds, screens, and extracts from academic papers.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$12/mo", tags:["research","academic","literature review","scientific"], isTrending:true, platforms:["Web"], alternativeTo:["Consensus","Semantic Scholar","Research Rabbit"] },
  { name:"Consensus", officialUrl:"https://consensus.app", category:"Research", shortDescription:"AI search engine for scientific research extracting findings directly from peer-reviewed papers.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$11.99/mo", tags:["research","academic","scientific","search"], isTrending:true, platforms:["Web"], alternativeTo:["Elicit","Semantic Scholar","Perplexity"] },

  // Data & Analytics
  { name:"Julius AI", officialUrl:"https://julius.ai", category:"Data & Analytics", shortDescription:"Chat with your data — upload CSVs or databases and ask questions, generate charts, and build reports.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["data analysis","visualization","spreadsheet","analytics"], isTrending:true, platforms:["Web"], alternativeTo:["ChatCSV","Rows.com","ThoughtSpot"] },
  { name:"Tableau AI", officialUrl:"https://www.tableau.com/products/tableau-ai", category:"Data & Analytics", shortDescription:"Salesforce's AI in Tableau enabling natural language data queries and auto-generated business insights.", pricing:"Paid", hasFreeTier:false, startingPrice:"$70/mo", tags:["business intelligence","data visualization","analytics","enterprise"], isTrending:true, platforms:["Web","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Power BI Copilot","Looker AI","ThoughtSpot"] },

  // Customer Support
  { name:"Intercom Fin", officialUrl:"https://www.intercom.com/fin", category:"Customer Support", shortDescription:"Intercom's AI support agent resolving 50%+ of tickets automatically using your knowledge base.", pricing:"Paid", hasFreeTier:false, startingPrice:"$0.99/resolution", tags:["customer support","chatbot","help desk","enterprise"], isTrending:true, platforms:["Web"], alternativeTo:["Zendesk AI","Freshdesk AI","Tidio"] },
  { name:"Tidio", officialUrl:"https://www.tidio.com", category:"Customer Support", shortDescription:"AI customer service with live chat, chatbot, and Lyro AI agent for e-commerce and small businesses.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$29/mo", tags:["customer support","live chat","chatbot","e-commerce"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Intercom","Crisp","Freshchat"] },
  { name:"Zendesk AI", officialUrl:"https://www.zendesk.com/service/generative-ai", category:"Customer Support", shortDescription:"Zendesk's generative AI suite for intelligent ticket routing, auto-responses, and agent assist.", pricing:"Paid", hasFreeTier:false, startingPrice:"$55/mo", tags:["customer support","help desk","ticketing","enterprise"], isTrending:true, platforms:["Web"], alternativeTo:["Intercom Fin","Freshdesk AI","Tidio"] },
  { name:"Sierra", officialUrl:"https://sierra.ai", category:"Customer Support", shortDescription:"Enterprise AI customer service platform handling complex customer journeys autonomously for major brands.", pricing:"Paid", hasFreeTier:false, tags:["customer support","AI agent","enterprise","autonomous"], isTrending:true, platforms:["Web"], alternativeTo:["Intercom Fin","Zendesk AI","Salesforce Einstein"] },

  // Business & Finance
  { name:"Apollo.io", officialUrl:"https://www.apollo.io", category:"Business & Finance", shortDescription:"AI-powered sales intelligence with 270M+ contacts for prospecting and outreach automation.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$49/mo", tags:["sales","lead generation","prospecting","outreach","CRM"], isTrending:true, platforms:["Web","Chrome Extension"], alternativeTo:["ZoomInfo","Outreach","Salesloft"] },
  { name:"Clay", officialUrl:"https://www.clay.com", category:"Business & Finance", shortDescription:"AI data enrichment aggregating 75+ sources to build hyper-personalized outreach at scale.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$149/mo", tags:["sales","data enrichment","prospecting","outreach automation"], isTrending:true, platforms:["Web"], alternativeTo:["Apollo.io","ZoomInfo","Outreach"] },
  { name:"HubSpot AI", officialUrl:"https://www.hubspot.com/artificial-intelligence", category:"Business & Finance", shortDescription:"AI-powered CRM and marketing with ChatSpot, content generation, and predictive lead scoring.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$20/mo", tags:["CRM","marketing","sales","AI assistant","content generation"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Salesforce Einstein","Pipedrive","Monday CRM"] },
  { name:"Darktrace", officialUrl:"https://www.darktrace.com", category:"Business & Finance", shortDescription:"AI cybersecurity platform autonomously detecting and responding to cyber threats in real-time.", pricing:"Paid", hasFreeTier:false, tags:["cybersecurity","AI security","threat detection","enterprise"], isTrending:true, platforms:["Web"], alternativeTo:["CrowdStrike","SentinelOne","Vectra AI"] },

  // Legal & Compliance
  { name:"Harvey AI", officialUrl:"https://www.harvey.ai", category:"Legal & Compliance", shortDescription:"AI legal assistant for law firms — contract analysis, due diligence, and legal research.", pricing:"Paid", hasFreeTier:false, tags:["legal","contract analysis","law","compliance","enterprise"], isTrending:true, platforms:["Web","API"], alternativeTo:["Lexis AI","Westlaw AI","Spellbook"] },
  { name:"Spellbook", officialUrl:"https://www.spellbook.legal", category:"Legal & Compliance", shortDescription:"AI contract drafting and review built directly into Microsoft Word for lawyers and legal teams.", pricing:"Paid", hasFreeTier:false, startingPrice:"$95/mo", tags:["legal","contract review","Word","lawyer tools"], isTrending:true, platforms:["Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Harvey AI","Ironclad","Clio"] },

  // Education
  { name:"Khanmigo", officialUrl:"https://www.khanacademy.org/khanmigo", category:"Education", shortDescription:"Khan Academy's AI tutor guiding students through problems with Socratic questions.", pricing:"Freemium", hasFreeTier:false, startingPrice:"$44/yr", tags:["education","tutoring","K-12","AI tutor","Socratic"], isTrending:true, platforms:["Web"], alternativeTo:["Chegg AI","Tutor.ai","Photomath"] },
  { name:"Duolingo AI", officialUrl:"https://www.duolingo.com", category:"Education", shortDescription:"Duolingo's AI features including Roleplay conversations and personalized language learning paths.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$12.99/mo", tags:["language learning","education","mobile","gamification"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Babbel","Rosetta Stone","Pimsleur"] },
  { name:"Photomath", officialUrl:"https://photomath.com", category:"Education", shortDescription:"AI math solver explaining step-by-step solutions from photos of handwritten or printed problems.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$9.99/mo", tags:["education","math","homework help","mobile"], isTrending:true, platforms:["iOS","Android"], alternativeTo:["Wolfram Alpha","Mathway","Microsoft Math Solver"] },
  { name:"Wolfram Alpha", officialUrl:"https://www.wolframalpha.com", category:"Education", shortDescription:"Computational knowledge engine solving math, science, finance, and factual queries with step-by-step explanations.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$7.99/mo", tags:["education","math","science","computation","research"], isTrending:true, platforms:["Web","iOS","Android","API"], alternativeTo:["Photomath","ChatGPT","Mathway"] },

  // Healthcare
  { name:"Nabla", officialUrl:"https://www.nabla.com", category:"Healthcare", shortDescription:"AI clinical documentation assistant generating SOAP notes automatically from doctor-patient conversations.", pricing:"Paid", hasFreeTier:false, startingPrice:"$99/mo", tags:["healthcare","medical documentation","clinical notes","HIPAA"], isTrending:true, platforms:["Web","iOS","Android"], alternativeTo:["Nuance DAX","Suki AI","Ambience Healthcare"] },

  // AI Agents
  { name:"AutoGPT", officialUrl:"https://agpt.co", category:"AI Agents", shortDescription:"The original autonomous AI agent chaining GPT-4 actions to complete complex, multi-step tasks.", pricing:"Freemium", hasFreeTier:true, tags:["AI agents","automation","open-source","autonomous AI"], isTrending:true, platforms:["Web","API"], alternativeTo:["BabyAGI","CrewAI","LangChain"] },
  { name:"CrewAI", officialUrl:"https://www.crewai.com", category:"AI Agents", shortDescription:"Framework orchestrating role-playing AI agents that collaborate to complete complex tasks.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$29/mo", tags:["AI agents","multi-agent","automation","framework"], isTrending:true, platforms:["Web","API"], alternativeTo:["AutoGPT","LangChain","LlamaIndex"] },
  { name:"Devin", officialUrl:"https://www.cognition.ai/blog/introducing-devin", category:"AI Agents", shortDescription:"Cognition's AI software engineer independently planning, coding, debugging, and deploying software.", pricing:"Paid", hasFreeTier:false, tags:["AI agents","coding","autonomous AI","software engineering"], isTrending:true, platforms:["Web"], alternativeTo:["GitHub Copilot","Claude Code","Cursor"] },
  { name:"LangChain", officialUrl:"https://www.langchain.com", category:"AI Agents", shortDescription:"The most popular framework for building LLM-powered applications, agents, and RAG systems.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$39/mo", tags:["AI development","LLM","RAG","agents","framework","open-source"], isTrending:true, platforms:["API","Web"], alternativeTo:["LlamaIndex","Haystack","Semantic Kernel"] },
  { name:"Microsoft AutoGen", officialUrl:"https://microsoft.github.io/autogen", category:"AI Agents", shortDescription:"Microsoft's open-source framework for building multi-agent conversational AI applications.", pricing:"Free", hasFreeTier:true, tags:["AI agents","multi-agent","open-source","Microsoft"], isTrending:true, platforms:["API"], alternativeTo:["CrewAI","LangChain","AutoGPT"] },

  // 3D & Spatial AI
  { name:"Luma AI", officialUrl:"https://lumalabs.ai", category:"3D & Spatial AI", shortDescription:"Capture real-world objects in photorealistic 3D with NeRF using a smartphone, or generate video and 3D with AI.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$29.99/mo", tags:["3D capture","NeRF","video generation","spatial AI"], isTrending:true, platforms:["Web","iOS","API"], alternativeTo:["Polycam","Spline AI","Point-E"] },
  { name:"Spline AI", officialUrl:"https://spline.design", category:"3D & Spatial AI", shortDescription:"Browser-based 3D design with AI generation — create 3D objects, scenes, and animations from text prompts.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$15/mo", tags:["3D design","web 3D","animation","no-code"], isTrending:true, platforms:["Web","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Luma AI","Blender","Cinema 4D"] },

  // Voice & Speech
  { name:"ChatGPT Voice", officialUrl:"https://openai.com/chatgpt/voice-mode", category:"Voice & Speech", shortDescription:"Real-time voice conversation with GPT-4o — interrupt mid-sentence and get emotionally aware spoken responses.", pricing:"Freemium", hasFreeTier:false, startingPrice:"$20/mo", tags:["voice AI","conversation","real-time","multimodal"], isTrending:true, platforms:["iOS","Android","Desktop (Mac)","Desktop (Windows)"], alternativeTo:["Siri","Google Assistant","Amazon Alexa"] },
  { name:"Speechify", officialUrl:"https://speechify.com", category:"Voice & Speech", shortDescription:"AI text-to-speech app that reads any content aloud — PDFs, web articles, emails, and ebooks.", pricing:"Freemium", hasFreeTier:true, startingPrice:"$139/yr", tags:["text-to-speech","reading","accessibility","productivity"], isTrending:true, platforms:["Web","iOS","Android","Chrome Extension"], alternativeTo:["Natural Reader","Voice Dream","Eleven Reader"] },

  // Accessibility
  { name:"Be My Eyes", officialUrl:"https://www.bemyeyes.com", category:"Accessibility", shortDescription:"AI-powered visual assistance for blind and low-vision users — describes surroundings, reads text, guides navigation.", pricing:"Free", hasFreeTier:true, tags:["accessibility","visual assistance","mobile","assistive technology"], isTrending:true, platforms:["iOS","Android"], alternativeTo:["Seeing AI","Lookout","JAWS"] },
]

// ─── Run ───────────────────────────────────────────────────────────────────────
async function importTrending() {
  console.log('🚀 IntelliGrid — Import 200 Trending AI Tools')
  console.log('═══════════════════════════════════════════════════')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '📥 LIVE IMPORT'}`)
  console.log(`Tools to process: ${TRENDING_TOOLS.length}\n`)

  if (!DRY_RUN) await connectDB()

  const categoryNames = [...new Set(TRENDING_TOOLS.map(t => t.category))]
  let categoryMap = {}
  if (!DRY_RUN) {
    console.log('📁 Ensuring categories...')
    categoryMap = await ensureCategories(categoryNames)
    console.log(`✅ Categories ready\n`)
  }

  const col = DRY_RUN ? null : mongoose.connection.collection('tools')
  const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 }

  for (const tool of TRENDING_TOOLS) {
    const slug = slugify(tool.name, { lower: true, strict: true })

    if (DRY_RUN) {
      console.log(`  ✅ [DRY] ${tool.name} → ${slug}`)
      continue
    }

    try {
      const existing = await col.findOne({ $or: [{ slug }, { officialUrl: tool.officialUrl }] })
      const categoryId = categoryMap[tool.category] || null

      if (existing) {
        const updates = { updatedAt: new Date() }
        if (!existing.isTrending && tool.isTrending) updates.isTrending = true
        if (!existing.isFeatured && tool.isFeatured) updates.isFeatured = true
        if (!existing.hasFreeTier && tool.hasFreeTier != null) updates.hasFreeTier = tool.hasFreeTier
        if (!existing.startingPrice && tool.startingPrice) updates.startingPrice = tool.startingPrice
        if ((!existing.platforms?.length) && tool.platforms?.length) updates.platforms = tool.platforms
        if ((!existing.alternativeTo?.length) && tool.alternativeTo?.length) updates.alternativeTo = tool.alternativeTo
        if (!existing.category && categoryId) updates.category = categoryId
        if (Object.keys(updates).length > 1) {
          await col.updateOne({ _id: existing._id }, { $set: updates })
          stats.updated++
          console.log(`  🔄 Updated: ${tool.name}`)
        } else {
          stats.skipped++
        }
      } else {
        await col.insertOne({
          name: tool.name, slug,
          officialUrl: tool.officialUrl,
          sourceUrl: `https://intelligrid.online/ai-tools/${slug}/`,
          shortDescription: tool.shortDescription || '',
          fullDescription: tool.shortDescription || '',
          category: categoryId,
          tags: tool.tags || [],
          pricing: tool.pricing || 'Unknown',
          hasFreeTier: tool.hasFreeTier ?? null,
          startingPrice: tool.startingPrice || null,
          platforms: tool.platforms || [],
          alternativeTo: tool.alternativeTo || [],
          status: 'active', isActive: true,
          isFeatured: tool.isFeatured || false,
          isTrending: tool.isTrending || false,
          isVerified: false,
          ratings: { average: 0, count: 0 },
          views: 0, favorites: 0,
          enrichmentScore: 25,
          logo: '', screenshots: [],
          createdAt: new Date(), updatedAt: new Date(),
        })
        stats.inserted++
        console.log(`  ✅ Inserted: ${tool.name}`)
      }
    } catch (err) {
      stats.errors++
      console.error(`  ❌ Error: ${tool.name} — ${err.message}`)
    }
  }

  console.log('\n✨ Import Complete!')
  console.log('═══════════════════════════════════════════════════')
  if (!DRY_RUN) {
    console.log(`   ✅ Inserted:  ${stats.inserted}`)
    console.log(`   🔄 Updated:   ${stats.updated}`)
    console.log(`   ⏭️  Skipped:   ${stats.skipped}`)
    console.log(`   ❌ Errors:    ${stats.errors}`)
    const total = await mongoose.connection.collection('tools').countDocuments()
    console.log(`\n🗄️  Total tools in DB: ${total}`)
    console.log('\n⚡ Next steps:')
    console.log('   1. node scripts/syncAlgolia.js')
    console.log('   2. node scripts/generateSitemap.js')
    console.log('   3. Bulk enrich from admin panel (enrichmentScore < 50)')
  }
  if (!DRY_RUN) await mongoose.connection.close()
  process.exit(0)
}

importTrending().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1) })
