import TemplateSelector from './components/TemplateSelector';
import Editor from './components/Editor';
import ExportButton from './components/ExportButton';
// This is a test comment
function App() {
  return (
    // Main container with gradient background
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-300 to-blue-300 flex items-center justify-center p-4">

      {/* The main application card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-white border-b border-gray-200">
           <h1 className="text-3xl font-bold text-gray-800">GameGen: No-Code Game Maker</h1>
           <p className="text-gray-500">Create your own game in minutes. Powered by AI.</p>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow">
           <TemplateSelector />
           <Editor />
        </div>
        
        {/* Footer with Export Button */}
        <ExportButton />
      </div>

    </div>
  );
}

export default App;