import React from 'react'

const ErrorFallback = ({ error }) => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e27] p-4 text-center">
            <div className="relative z-10 max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-lg">
                <div className="mb-6 flex justify-center">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 opacity-70 blur-md"></div>
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0a0e27] border border-white/10">
                            <span className="text-3xl text-red-500">⚠</span>
                        </div>
                    </div>
                </div>

                <h1 className="mb-3 text-3xl font-bold text-white">Something Went Wrong</h1>
                <p className="mb-6 text-gray-400">
                    We're sorry, but an unexpected error has occurred. Our team has been notified.
                </p>

                {process.env.NODE_ENV === 'development' && error && (
                    <div className="mb-6 overflow-hidden rounded-lg bg-black/50 p-4 text-left">
                        <code className="text-xs text-red-400 font-mono break-words">
                            {error.toString()}
                        </code>
                    </div>
                )}

                <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
                >
                    Refresh Page
                </button>
            </div>

            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute -left-[10%] top-[20%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]"></div>
                <div className="absolute -right-[10%] bottom-[20%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]"></div>
            </div>
        </div>
    )
}

export default ErrorFallback
