import { BookOpen, MapPin, PhoneCall } from "lucide-react";

export default function FeatureCards() {
    const features = [
        {
            icon: <BookOpen className="w-8 h-8" />,
            title: "학원 소개",
            description: "HANOI SEOUL ACADEMY 비전 및 철학",
            href: "#about",
            color: "from-blue-600 to-blue-800"
        },
        {
            icon: <MapPin className="w-8 h-8" />,
            title: "오시는 길",
            description: "A14 Fivestar Mỹ Đình 인근",
            href: "#location",
            color: "from-blue-700 to-blue-900"
        },
        {
            icon: <PhoneCall className="w-8 h-8" />,
            title: "수강 문의",
            description: "맞춤형 교육 및 입학 상담",
            href: "http://pf.kakao.com/_wNXkn",
            color: "from-blue-800 to-slate-900"
        }
    ];

    return (
        <section className="py-20 bg-slate-50" id="about">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <a
                            key={index}
                            href={feature.href}
                            {...(feature.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className={`group flex items-start gap-4 p-8 rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}
                        >
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-150 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-transform duration-500">
                                {feature.icon}
                            </div>

                            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                                {feature.icon}
                            </div>

                            <div className="flex-1 mt-1 z-10">
                                <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-200 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-white/80 font-medium leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
