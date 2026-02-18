import { useNavigate } from 'react-router-dom'
import { XCircle, ArrowRight } from 'lucide-react'
import SEO from '../components/common/SEO'

export default function PaymentCancelPage() {
    const navigate = useNavigate()

    return (
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
            <SEO
                title="Payment Cancelled | IntelliGrid"
                description="Your payment was cancelled. No charges were made."
                noindex={true}
            />
            <div className="mx-auto max-w-md w-full">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm shadow-xl">
                    <div className="mb-6 flex justify-center">
                        <div className="rounded-full bg-red-500/10 p-4">
                            <XCircle className="h-12 w-12 text-red-500" />
                        </div>
                    </div>

                    <h1 className="mb-2 text-2xl font-bold text-white">Payment Cancelled</h1>
                    <p className="mb-8 text-gray-400">
                        You have cancelled the payment process. No charges were made to your account.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/pricing')}
                            className="w-full rounded-xl bg-purple-600 px-6 py-3 font-medium text-white transition hover:bg-purple-500 flex items-center justify-center gap-2"
                        >
                            Return to Pricing <ArrowRight size={18} />
                        </button>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full rounded-xl border border-white/10 bg-transparent px-6 py-3 font-medium text-gray-300 transition hover:bg-white/5"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
