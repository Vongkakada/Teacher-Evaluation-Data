import React, { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../constants';

interface LoginFormProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      onLoginSuccess();
    } else {
      setError('ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full relative">
        <button 
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
        >
            ✕
        </button>
        <div className="text-center mb-6">
          <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-moul text-gray-800">ការចូលប្រើប្រាស់ (Admin Login)</h2>
          <p className="text-sm text-gray-500 mt-2">សូមបញ្ចូលគណនីដើម្បីចូលប្រើប្រាស់មុខងារនេះ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ឈ្មោះអ្នកប្រើប្រាស់ (Username)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none font-sans"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ពាក្យសម្ងាត់ (Password)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none font-sans"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 flex items-center justify-center">
                {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-4 rounded transition flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            <span>ចូលប្រព័ន្ធ (Login)</span>
          </button>
        </form>
      </div>
    </div>
  );
};