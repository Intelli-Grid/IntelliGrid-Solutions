import { SignUp } from '@clerk/clerk-react'

/**
 * Dedicated sign-up page rendered at /sign-up
 * Required because Clerk Dashboard is configured to use
 * "application domain" paths rather than the hosted Account Portal.
 */
export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
            <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/"
                appearance={{
                    variables: {
                        colorPrimary: '#6366f1',
                        colorBackground: '#0f1117',
                        colorInputBackground: '#1a1d27',
                        colorInputText: '#e2e8f0',
                        colorText: '#e2e8f0',
                        colorTextSecondary: '#94a3b8',
                        borderRadius: '0.75rem',
                        fontFamily: 'Inter, sans-serif',
                    },
                    elements: {
                        card: 'bg-[#0f1117] border border-[#2a2d3a] shadow-2xl',
                        headerTitle: 'text-slate-100',
                        headerSubtitle: 'text-slate-400',
                        socialButtonsBlockButton: 'bg-[#1a1d27] border border-[#2a2d3a] text-slate-200 hover:bg-[#2a2d3a]',
                        dividerLine: 'bg-[#2a2d3a]',
                        dividerText: 'text-slate-500',
                        formFieldInput: 'bg-[#1a1d27] border-[#2a2d3a] text-slate-200 focus:border-indigo-500',
                        formFieldLabel: 'text-slate-400',
                        footerActionLink: 'text-indigo-400 hover:text-indigo-300',
                    },
                }}
            />
        </div>
    )
}
