import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-purple-500`} />
            {text && <p className="text-sm text-gray-400">{text}</p>}
        </div>
    )
}
