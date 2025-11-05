import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-b from-white via-purple-50/60 to-fuchsia-50/70 flex items-center justify-center p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-purple-300/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-28 h-80 w-80 rounded-full bg-fuchsia-300/40 blur-3xl" />
        <div className="absolute inset-x-0 top-1/3 h-64 bg-[radial-gradient(ellipse_at_center,rgba(90,87,203,0.12),transparent_60%)]" />
      </div>

      <div className="relative max-w-2xl w-full text-center">
        <h1 className="mt-4 text-4xl sm:text-7xl font-extrabold leading-tight text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-fuchsia-600 animate-fade-down">
          Welcome to <br /> Vim Calendar
        </h1>
        <p className="mt-3 text-base sm:text-lg text-gray-600 animate-fade-left">
          Plan and manage your weekly workouts with a clean, simple calendar.
        </p>
        <p className="mt-1 text-sm text-gray-500 animate-fade-right">
          Drag and drop exercises across days, create sections, and stay on
          track.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 animate-fade-up">
          <Link
            href="/calendar"
            className="group inline-flex items-center justify-center rounded-md bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <strong>Open calendar</strong>
            <span className="ml-2 inline-block animate-bounce animate-infinite">
              →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
