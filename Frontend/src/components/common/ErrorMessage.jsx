import { AlertCircle } from 'lucide-react'

export default function ErrorMessage({ message, onRetry }) {
    return (
        <div className="mx-auto max-w-md rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold text-white">Something went wrong</h3>
            <p className="mb-4 text-sm text-gray-400">{message || 'Failed to load data'}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                >
                    Try Again
                </button>
            )}
        </div>
    )
}
