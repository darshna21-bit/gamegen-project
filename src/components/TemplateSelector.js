export default function TemplateSelector() {
  return (
    <div className="p-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 mb-2">1. Pick a Template</h2>
      <div className="p-4 border-2 border-indigo-500 rounded-lg bg-indigo-50 cursor-pointer">
        <p className="font-bold text-indigo-800">Flappy Bird</p>
        <p className="text-sm text-indigo-600">The classic side-scrolling game.</p>
      </div>
    </div>
  );
}