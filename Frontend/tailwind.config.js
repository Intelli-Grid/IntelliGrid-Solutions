/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // === PRIMARY PALETTE ===
                primary: {
                    50: '#EEF2FF',
                    100: '#D9E2FC',
                    200: '#B8C7F5',
                    300: '#8FA3E8',
                    400: '#6B7FD7',
                    500: '#4A5899',
                    600: '#2D3561',
                    700: '#1A1F3A',
                    800: '#0A0E27',
                    900: '#050711',
                },
                // === ACCENT COLORS ===
                accent: {
                    purple: '#8B5CF6',
                    cyan: '#06B6D4',
                    emerald: '#10B981',
                    amber: '#F59E0B',
                    rose: '#F43F5E',
                },
                // === SEMANTIC COLORS ===
                success: '#10B981',
                warning: '#F59E0B',
                error: '#EF4444',
                info: '#3B82F6',
                // === LEGACY SUPPORT (keep for backward compatibility) ===
                'deep-space': '#0A0E27',
                'dark-slate': '#1E293B',
                'electric-purple': '#8B5CF6',
                'cyber-cyan': '#06B6D4',
                'neon-green': '#10B981',
                'warm-orange': '#F59E0B',
                'soft-gray': '#64748B',
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
                display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
            },
            fontSize: {
                'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
                'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
                'display-lg': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'gradient-primary': 'linear-gradient(135deg, #6B7FD7 0%, #8B5CF6 100%)',
                'gradient-success': 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                'gradient-premium': 'linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%)',
                'gradient-glass': 'linear-gradient(135deg, rgba(107, 127, 215, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'fade-in-up': 'fadeInUp 0.6s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-down': 'slideDown 0.5s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'blob': 'blob 7s infinite',
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.5)' },
                    '100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.8)' },
                },
                blob: {
                    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                'glow-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
                'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
                'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.5)',
                'premium': '0 10px 40px rgba(107, 127, 215, 0.4)',
                'premium-lg': '0 20px 60px rgba(107, 127, 215, 0.5)',
            },
            transitionTimingFunction: {
                'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            },
        },
    },
    plugins: [],
}
