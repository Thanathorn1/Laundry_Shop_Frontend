import Link from 'next/link'

const services = [
    { icon: '👕', name: 'Wash & Dry', desc: 'Complete wash and dry service for everyday clothes', price: '40 THB/kg', color: 'from-blue-500 to-blue-600' },
    { icon: '✨', name: 'Dry Cleaning', desc: 'Professional dry cleaning for delicate fabrics', price: '100 THB/kg', color: 'from-indigo-500 to-indigo-600' },
    { icon: '🔥', name: 'Ironing', desc: 'Crisp and wrinkle-free ironing service', price: '20 THB/piece', color: 'from-sky-500 to-sky-600' },
    { icon: '🛏️', name: 'Duvet & Blanket', desc: 'Specialized cleaning for large bedding items', price: '120 THB/piece', color: 'from-cyan-500 to-cyan-600' },
]

const steps = [
    { step: '01', icon: '📱', title: 'Book Online', desc: 'Choose your service, branch, and preferred time slot through our app' },
    { step: '02', icon: '🧺', title: 'Drop Off', desc: 'Bring your clothes to the nearest branch or schedule a pickup' },
    { step: '03', icon: '✅', title: 'Pick Up Fresh', desc: 'Get notified when ready and pick up your fresh, clean clothes' },
]

const testimonials = [
    { name: 'Somchai K.', role: 'Regular Customer', text: 'Amazing service! My clothes come back perfectly clean every time. The online tracking is super convenient.', rating: 5 },
    { name: 'Nattaya P.', role: 'Business Owner', text: 'I use LaundryPro for all my restaurant uniforms. Fast, reliable, and great quality. Highly recommended!', rating: 5 },
    { name: 'James T.', role: 'Expat Customer', text: 'Best laundry service in Bangkok. The app makes it so easy to order and track my laundry.', rating: 5 },
]

const stats = [
    { value: '10,000+', label: 'Happy Customers' },
    { value: '15', label: 'Branches' },
    { value: '99%', label: 'Satisfaction Rate' },
    { value: '24h', label: 'Express Service' },
]

export default function Home() {
    return (
        <div className="overflow-hidden">
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center gradient-blue overflow-hidden">
                {/* Background decorations */}
                <div className="absolute top-20 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-sky-300/10 rounded-full blur-2xl"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-white animate-fade-in">
                            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2 mb-6">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span className="text-sm font-medium">Now serving 15 branches in Bangkok</span>
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-6">
                                Fresh Clothes,<br />
                                <span className="text-sky-300">Every Time.</span>
                            </h1>
                            <p className="text-xl text-blue-100 mb-8 max-w-lg leading-relaxed">
                                Professional laundry service with online ordering, real-time tracking, and express delivery. Your clothes deserve the best care.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link href="/register" className="inline-block bg-white text-primary font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-all hover:shadow-xl hover:-translate-y-1 text-lg">
                                    Start Now — Free
                                </Link>
                                <Link href="/track" className="inline-block border-2 border-white/50 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-lg">
                                    Track Order →
                                </Link>
                            </div>
                            <div className="flex items-center space-x-6 mt-10">
                                <div className="flex -space-x-3">
                                    {['👨', '👩', '🧑', '👱'].map((emoji, i) => (
                                        <div key={i} className="w-10 h-10 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-lg">{emoji}</div>
                                    ))}
                                </div>
                                <div>
                                    <div className="flex text-yellow-400">{'★★★★★'}</div>
                                    <p className="text-blue-200 text-sm">10,000+ happy customers</p>
                                </div>
                            </div>
                        </div>

                        {/* Hero visual */}
                        <div className="hidden lg:flex justify-center animate-float">
                            <div className="relative">
                                <div className="w-80 h-80 gradient-blue-light rounded-3xl shadow-2xl flex items-center justify-center border border-white/30 glass">
                                    <div className="text-center">
                                        <div className="text-8xl mb-4">🫧</div>
                                        <div className="text-white font-bold text-2xl">LaundryPro</div>
                                        <div className="text-blue-200 text-sm mt-1">Premium Care</div>
                                    </div>
                                </div>
                                {/* Floating cards */}
                                <div className="absolute -top-6 -right-6 glass rounded-2xl p-4 shadow-xl border border-white/30">
                                    <div className="text-2xl mb-1">✅</div>
                                    <div className="text-white text-xs font-semibold">Order Ready!</div>
                                </div>
                                <div className="absolute -bottom-6 -left-6 glass rounded-2xl p-4 shadow-xl border border-white/30">
                                    <div className="text-2xl mb-1">⚡</div>
                                    <div className="text-white text-xs font-semibold">Express 24h</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 80L1440 80L1440 40C1200 80 960 0 720 40C480 80 240 0 0 40L0 80Z" fill="#F8FAFF" />
                    </svg>
                </div>
            </section>

            {/* Stats */}
            <section className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center p-6 rounded-2xl gradient-blue-light card-hover">
                                <div className="text-4xl font-black text-primary">{stat.value}</div>
                                <div className="text-gray-600 mt-1 font-medium">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="py-20 bg-[#F8FAFF]">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-14">
                        <span className="text-primary-light font-semibold text-sm uppercase tracking-wider">Our Services</span>
                        <h2 className="section-title mt-2">Everything Your Clothes Need</h2>
                        <p className="text-gray-500 mt-4 max-w-xl mx-auto">Professional care for every type of fabric, from everyday wear to delicate garments</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {services.map((s, i) => (
                            <div key={i} className="bg-white rounded-3xl p-6 shadow-blue-sm card-hover border border-blue-50">
                                <div className={`w-14 h-14 bg-gradient-to-br ${s.color} rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-md`}>
                                    {s.icon}
                                </div>
                                <h3 className="font-bold text-gray-800 text-lg mb-2">{s.name}</h3>
                                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{s.desc}</p>
                                <div className="text-primary font-bold text-lg">{s.price}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-14">
                        <span className="text-primary-light font-semibold text-sm uppercase tracking-wider">Process</span>
                        <h2 className="section-title mt-2">How It Works</h2>
                        <p className="text-gray-500 mt-4">Simple 3-step process to get your laundry done</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200"></div>
                        {steps.map((step, i) => (
                            <div key={i} className="text-center relative">
                                <div className="w-20 h-20 gradient-blue rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-blue-md animate-float" style={{ animationDelay: `${i * 0.5}s` }}>
                                    {step.icon}
                                </div>
                                <div className="text-primary-light font-black text-5xl opacity-10 absolute -top-2 left-1/2 -translate-x-1/2">{step.step}</div>
                                <h3 className="font-bold text-gray-800 text-xl mb-2">{step.title}</h3>
                                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 gradient-blue">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-14">
                        <span className="text-sky-300 font-semibold text-sm uppercase tracking-wider">Reviews</span>
                        <h2 className="text-4xl font-black text-white mt-2">What Our Customers Say</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {testimonials.map((t, i) => (
                            <div key={i} className="glass rounded-3xl p-6 card-hover">
                                <div className="flex text-yellow-400 mb-3">{'★'.repeat(t.rating)}</div>
                                <p className="text-white/90 leading-relaxed mb-4">"{t.text}"</p>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">👤</div>
                                    <div>
                                        <div className="text-white font-semibold text-sm">{t.name}</div>
                                        <div className="text-blue-200 text-xs">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-white">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <div className="text-6xl mb-6">🫧</div>
                    <h2 className="section-title mb-4">Ready for Fresh Clothes?</h2>
                    <p className="text-gray-500 text-lg mb-8">Join thousands of satisfied customers. Sign up today and get your first order with 10% off!</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link href="/register" className="btn-primary text-lg px-10 py-4 animate-pulse-blue">
                            Create Free Account
                        </Link>
                        <Link href="/order" className="btn-outline text-lg px-10 py-4">
                            Order Now
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
