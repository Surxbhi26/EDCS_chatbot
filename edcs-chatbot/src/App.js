import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import EDCSChatbot from './EDCSChatbot';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import DepartmentDashboard from './DepartmentDashboard';
import { MessageSquare, HelpCircle, Sparkles, Smartphone, Code, Database } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);
  if (user === undefined) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const HomePage = () => {
  const features = [
    { icon: MessageSquare, text: 'Menu-driven conversation flow' },
    { icon: HelpCircle, text: '17+ frequently asked questions' },
    { icon: Sparkles, text: 'Professional UI with smooth animations' },
    { icon: Smartphone, text: 'Mobile responsive design' },
    { icon: Code, text: 'Easy to integrate into any website' },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Database size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">EDCS</span>
          </div>
          <div className="text-sm text-gray-500">Expora Database Consulting</div>
        </div>
      </header>
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles size={16} />
              AI-Powered Assistant
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">EVA</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Your intelligent chatbot assistant for{' '}
              <span className="font-semibold text-gray-700">EDCS</span> - Expora Database Consulting Pvt. Ltd India
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 text-left border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
              <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </span>
              Features
            </h2>
            <ul className="space-y-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <li key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-blue-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{feature.text}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-gray-500 text-sm">👉 Click the chat button in the bottom-right corner to try EVA!</p>
            </div>
          </div>
          <footer className="mt-12 text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} EDCS - Expora Database Consulting Pvt. Ltd India
          </footer>
        </div>
      </div>
      <EDCSChatbot />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DepartmentDashboard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
