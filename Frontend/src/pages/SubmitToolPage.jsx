import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { Send, CheckCircle, Upload, ExternalLink, ChevronDown, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import SEO from '../components/common/SEO'
import apiClient from '../services/api'

const CATEGORIES = [
    'Image Generation', 'Video Generation', 'Writing & Content', 'Developer Tools',
    'Audio & Music', 'Chatbots', 'Business & Finance', 'Marketing & SEO',
    'Education', 'Research', 'Productivity', 'Data & Analytics',
    'Email & Communication', 'Automation', 'Other',
]

const PRICING_OPTIONS = ['Free', 'Freemium', 'Paid', 'Trial', 'Contact for Pricing']

export default function SubmitToolPage() {
    const { user, isSignedIn } = useUser()
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [form, setForm] = useState({
        toolName: '',
        officialUrl: '',
        shortDescription: '',
        fullDescription: '',
        category: '',
        pricing: '',
        features: '',
        submitterName: '',
        submitterEmail: '',
    })

    // Pre-fill submitter info if signed in
    useEffect(() => {
        if (isSignedIn && user) {
            setForm(prev => ({
                ...prev,
                submitterName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                submitterEmail: user.emailAddresses?.[0]?.emailAddress || '',
            }))
        }
    }, [isSignedIn, user])

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
        if (error) setError(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const payload = {
                ...form,
                features: form.features ? form.features.split(',').map(f => f.trim()).filter(Boolean) : [],
            }
            await apiClient.post('/submissions', payload)
            setSubmitted(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
                <SEO
                    title="Tool Submitted — IntelliGrid"
                    description="Your AI tool submission has been received."
                    noindex={true}
                />
                <div className="max-w-md w-full text-center">
                    <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-3">Submission Received!</h1>
                    <p className="text-gray-400 mb-2">
                        Thanks for contributing to IntelliGrid. Our team will review <strong className="text-white">{form.toolName}</strong> within 2–3 business days.
                    </p>
                    <p className="text-gray-500 text-sm mb-8">
                        {form.submitterEmail && `A confirmation has been sent to ${form.submitterEmail}.`}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/tools"
                            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors"
                        >
                            Browse AI Tools
                        </Link>
                        <button
                            onClick={() => { setSubmitted(false); setForm(prev => ({ ...prev, toolName: '', officialUrl: '', shortDescription: '', fullDescription: '', category: '', pricing: '', features: '' })) }}
                            className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-sm transition-colors"
                        >
                            Submit Another Tool
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <SEO
                title="Submit an AI Tool — IntelliGrid"
                description="Know an AI tool that's not in our directory? Submit it here and help the community discover it."
                keywords="submit AI tool, add AI tool, IntelliGrid submission, AI tools directory"
                canonicalUrl="https://www.intelligrid.online/submit"
            />

            {/* Hero */}
            <div className="relative border-b border-white/5 bg-gradient-to-b from-[#0c0c14] to-gray-950 pt-14 pb-10 px-4">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-purple-600/8 blur-[100px]" />
                </div>
                <div className="relative container mx-auto max-w-2xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-gray-400 mb-5">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        Community Contributions
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
                        Submit an AI Tool
                    </h1>
                    <p className="text-gray-500 text-base">
                        Know a tool that belongs in our directory? Fill out the form below — our team reviews every submission.
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="container mx-auto max-w-2xl px-4 py-12">

                {/* Info callout */}
                <div className="mb-8 flex gap-3 rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
                    <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-300">Before submitting</p>
                        <p className="text-xs text-gray-500 mt-0.5">Check that the tool isn't already listed by searching on <Link to="/search" className="text-purple-400 hover:underline">our search page</Link>. Duplicates will be rejected.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Tool Name */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            Tool Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="toolName"
                            value={form.toolName}
                            onChange={handleChange}
                            required
                            maxLength={100}
                            placeholder="e.g. ChatGPT, Midjourney, Notion AI"
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all"
                        />
                    </div>

                    {/* Official URL */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            Official Website URL <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                            <input
                                name="officialUrl"
                                value={form.officialUrl}
                                onChange={handleChange}
                                required
                                type="url"
                                maxLength={500}
                                placeholder="https://example.com"
                                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all"
                            />
                        </div>
                    </div>

                    {/* Short Description */}
                    <div>
                        <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-300">
                            <span>Short Description <span className="text-red-400">*</span></span>
                            <span className="text-xs text-gray-600">{form.shortDescription.length}/160</span>
                        </label>
                        <textarea
                            name="shortDescription"
                            value={form.shortDescription}
                            onChange={handleChange}
                            required
                            maxLength={160}
                            rows={2}
                            placeholder="One or two sentences describing what this tool does..."
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all"
                        />
                    </div>

                    {/* Full Description */}
                    <div>
                        <label className="mb-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm font-medium text-gray-300">
                            <span>Full Description <span className="text-gray-600 font-normal">(optional)</span></span>
                            <span className="text-xs text-gray-600 mt-1 sm:mt-0">{form.fullDescription.length}/2000</span>
                        </label>
                        <textarea
                            name="fullDescription"
                            value={form.fullDescription}
                            onChange={handleChange}
                            rows={5}
                            maxLength={2000}
                            placeholder="Describe what makes this tool unique, its key features, who it's for, etc."
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all"
                        />
                    </div>

                    {/* Category + Pricing */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Category</label>
                            <div className="relative">
                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all pr-10"
                                >
                                    <option value="" className="bg-gray-900">Select category...</option>
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c} className="bg-gray-900">{c}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Pricing Model</label>
                            <div className="relative">
                                <select
                                    name="pricing"
                                    value={form.pricing}
                                    onChange={handleChange}
                                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all pr-10"
                                >
                                    <option value="" className="bg-gray-900">Select pricing...</option>
                                    {PRICING_OPTIONS.map(p => (
                                        <option key={p} value={p} className="bg-gray-900">{p}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            </div>
                        </div>
                    </div>

                    {/* Key Features */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">
                            Key Features <span className="text-gray-600 font-normal">(comma-separated, optional)</span>
                        </label>
                        <input
                            name="features"
                            value={form.features}
                            onChange={handleChange}
                            placeholder="e.g. Image generation, Style transfer, API access"
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all"
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/5 pt-2">
                        <p className="text-xs text-gray-600 mb-4">Your contact info (so we can notify you when it's reviewed)</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-300">Your Name</label>
                                <input
                                    name="submitterName"
                                    value={form.submitterName}
                                    onChange={handleChange}
                                    placeholder="Jane Smith"
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-300">Your Email</label>
                                <input
                                    name="submitterEmail"
                                    value={form.submitterEmail}
                                    onChange={handleChange}
                                    type="email"
                                    placeholder="jane@example.com"
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed py-3.5 font-semibold text-white transition-all text-sm hover:shadow-lg hover:shadow-purple-500/20"
                    >
                        {loading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                        ) : (
                            <><Send className="h-4 w-4" /> Submit Tool for Review</>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-600">
                        By submitting, you confirm this tool isn't yours or you have permission to list it.
                        We review all submissions before publishing.
                    </p>
                </form>
            </div>
        </div>
    )
}
