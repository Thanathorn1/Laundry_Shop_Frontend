import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#1E40AF',
                'primary-light': '#3B82F6',
                'primary-pale': '#EFF6FF',
                secondary: '#0EA5E9',
                accent: '#DBEAFE',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'blue-sm': '0 4px 15px rgba(59, 130, 246, 0.15)',
                'blue-md': '0 8px 25px rgba(59, 130, 246, 0.25)',
                'blue-lg': '0 20px 40px rgba(30, 64, 175, 0.2)',
            },
            backgroundImage: {
                'gradient-blue': 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #0EA5E9 100%)',
                'gradient-blue-light': 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out forwards',
                'slide-left': 'slideInLeft 0.6s ease-out forwards',
                'float': 'float 3s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
export default config
