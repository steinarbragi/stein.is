import Image from "next/image";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent_50%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(219,39,119,0.3),transparent_50%)] animate-pulse delay-1000" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl text-center">
          {/* Profile Picture */}
          <div className="mb-8 animate-fade-in">
            <div className="relative mx-auto w-40 h-40 md:w-48 md:h-48">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 p-1 animate-spin-slow">
                <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900" />
              </div>
              <div className="relative h-full w-full rounded-full overflow-hidden ring-4 ring-white/20 backdrop-blur-sm">
                <Image
                  src="/steinar.jpg"
                  alt="Steinar Bragi Sigurðarson"
                  width={192}
                  height={192}
                  className="object-cover object-top w-full h-full"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Name */}
          <h1 className="mb-4 text-4xl md:text-6xl font-bold text-white animate-fade-in-up animation-delay-200">
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Steinar Bragi Sigurðarson
            </span>
          </h1>

          {/* Title */}
          <div className="mb-12 animate-fade-in-up animation-delay-400">
            <p className="text-xl md:text-2xl text-purple-200 font-light">
              Software Developer <span className="mx-2">/</span> AI Researcher
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 animate-fade-in-up animation-delay-600">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50"
              aria-label="GitHub"
            >
              <svg
                className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>

            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50"
              aria-label="Twitter"
            >
              <svg
                className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>

            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50"
              aria-label="LinkedIn"
            >
              <svg
                className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
