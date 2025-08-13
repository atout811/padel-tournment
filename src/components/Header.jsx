export default function Header() {
  return (
    <header className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-t-lg border-b-2 border-blue-500 text-center shadow-lg">
      <div className="flex items-center justify-center space-x-3 mb-2">
        <span className="text-3xl">🎾</span>
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
          Padel Tournament Pro
        </h1>
        <span className="text-3xl">🎾</span>
      </div>
      <p className="text-blue-200 text-sm md:text-base font-medium">🏆 Organize • Compete • Champion 🏆</p>
    </header>
  );
}


