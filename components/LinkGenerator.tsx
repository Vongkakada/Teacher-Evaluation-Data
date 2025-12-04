import React, { useState } from 'react';
import { TEACHERS_LIST, TEACHER_INFO_DEFAULT } from '../constants';
import { TeacherInfo } from '../types';
import { QrCode, Copy, Check } from 'lucide-react';

export const LinkGenerator: React.FC = () => {
  const [info, setInfo] = useState<TeacherInfo>(TEACHER_INFO_DEFAULT);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const generateLink = () => {
    // Create URL search params
    const params = new URLSearchParams();
    params.set('teacher', info.name);
    params.set('subject', info.subject);
    params.set('room', info.room);
    params.set('date', info.date);
    params.set('shift', info.shift);

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    setGeneratedLink(url);
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedLink)}`;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-moul text-gray-800 mb-6 flex items-center gap-2">
        <QrCode className="text-blue-600" />
        បង្កើត QR Code សម្រាប់ថ្នាក់រៀន (Class Setup)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">សាស្ត្រាចារ្យ (Teacher)</label>
          <select 
            value={info.name}
            onChange={(e) => setInfo({...info, name: e.target.value})}
            className="w-full border border-gray-300 rounded p-2"
          >
            {TEACHERS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">មុខវិជ្ជា (Subject)</label>
          <input 
            type="text" 
            value={info.subject}
            onChange={(e) => setInfo({...info, subject: e.target.value})}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">កាលបរិច្ឆេទ (Date)</label>
          <input 
            type="text" 
            value={info.date}
            onChange={(e) => setInfo({...info, date: e.target.value})}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">បន្ទប់ (Room)</label>
          <input 
            type="text" 
            value={info.room}
            onChange={(e) => setInfo({...info, room: e.target.value})}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>
      </div>

      <button 
        onClick={generateLink}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition mb-6"
      >
        បង្កើត Link និង QR Code
      </button>

      {generatedLink && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center animate-fade-in">
          <p className="text-sm text-gray-500 mb-4">ចែករំលែក Link នេះ ឬបង្ហាញ QR Code ដល់និស្សិត៖</p>
          
          <div className="flex justify-center mb-6">
            <img src={qrImageUrl} alt="QR Code" className="border-4 border-white shadow-lg rounded-lg" />
          </div>

          <div className="flex items-center gap-2 max-w-full">
            <input 
              readOnly 
              value={generatedLink} 
              className="flex-1 bg-white border border-gray-300 text-gray-500 text-sm p-2 rounded"
            />
            <button 
              onClick={copyToClipboard}
              className={`p-2 rounded ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};