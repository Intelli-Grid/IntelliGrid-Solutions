import { useState, useEffect } from 'react'
import { X, CheckCircle, ShieldCheck, LogIn } from 'lucide-react'
import { toolService } from '../../services'
import { useUser, SignInButton } from '@clerk/clerk-react'

export default function ClaimToolModal({ isOpen, onClose, tool }) {
    const { user, isSignedIn } = useUser()
    const [formData, setFormData] = useState({
        email: '',
        role: '',
        verificationInfo: ''
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (isSignedIn && user) {
            setFormData(prev => ({
                ...prev,
                email: user.primaryEmailAddress?.emailAddress || ''
            }))
        }
    }, [isSignedIn, user])

    if (!isOpen || !tool) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            await toolService.claimTool(tool._id, formData)
            setSuccess(true)
        } catch (err) {
            console.error('Claim error:', err)
            setError(err.response?.data?.message || 'Failed to submit claim request')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-white/10 p-6 shadow-2xl transition-all">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                {!isSignedIn ? (
                    <div className="text-center py-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                            <LogIn size={32} />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-white">Sign in to Claim</h3>
                        <p className="text-gray-400 mb-6">
                            You need an account to manage your tool listing, view analytics, and respond to reviews.
                        </p>
                        <SignInButton mode="modal">
                            <button className="w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 transition-colors">
                                Sign In / Sign Up
                            </button>
                        </SignInButton>
                    </div>
                ) : success ? (
                    <div className="text-center py-8">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-white">Request Sent!</h3>
                        <p className="text-gray-400">
                            We've received your request to claim <strong>{tool.name}</strong>.
                            Our team will verify your details and get back to you at {formData.email} shortly.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-6 w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-500"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Claim {tool.name}</h3>
                                <p className="text-sm text-gray-400">Verify ownership to manage this page.</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-300">Work Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="name@company.com"
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    readOnly // Pre-filled from login, maybe make editable if they want to use diverse email? Better to keep it locked to account email or allow explicit override? Let's allow edit but default to user email.
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    We'll use this to verify your domain ownership.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-300">Your Role</label>
                                <input
                                    type="text"
                                    name="role"
                                    required
                                    value={formData.role}
                                    onChange={handleChange}
                                    placeholder="e.g. Founder, Marketing Manager"
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-300">Verification Info (Optional)</label>
                                <textarea
                                    name="verificationInfo"
                                    value={formData.verificationInfo}
                                    onChange={handleChange}
                                    placeholder="Link to LinkedIn profile, specific page on website, etc."
                                    rows={3}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Submitting...' : 'Submit Claim Request'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
