import React, { useState, useEffect } from 'react';
import { TEACHER_INFO_DEFAULT, TERMS_LIST } from '../constants';
import { TeacherInfo, Teacher } from '../types';
import { QrCode, Copy, Check, Wand2, Loader2, Calendar, Clock, BookOpen, GraduationCap, Layers, RefreshCw, Users } from 'lucide-react';

interface LinkGeneratorProps {
    teachersList: Teacher[];
    onRefreshTeachers?: () => Promise<void>; // Prop to trigger refresh from App
}

export const LinkGenerator: React.FC<LinkGeneratorProps> = ({ teachersList, onRefreshTeachers }) => {
  const [info, setInfo] = useState<TeacherInfo>(TEACHER_INFO_DEFAULT);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isShortening, setIsShortening] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Expiry State
  const [expiryType, setExpiryType] = useState<'unlimited' | '24h' | '48h' | 'custom'>('24h');
  const [customDate, setCustomDate] = useState('');

  // Extract unique Teams for dropdown. This relies on teachersList having correct data from Sheet Column B.
  const uniqueTeams = Array.from(new Set(teachersList.map(t => t.team))).filter(Boolean);

  // Effect: When teacher is selected, auto-select their team
  useEffect(() => {
     // If teachersList is empty, do nothing
     if (teachersList.length === 0) return;

     // Find the teacher object matching the currently selected name
     const selectedTeacher = teachersList.find(t => t.name === info.name);
     
     if (selectedTeacher) {
         // Update team only if it's different to prevent infinite loops
         if (selectedTeacher.team && selectedTeacher.team !== info.team) {
             setInfo(prev => ({ ...prev, team: selectedTeacher.team }));
         }
     } else {
         // Fallback if teacher name manually typed or not found, keep default or select first available team if needed
     }
  }, [info.name, teachersList]);

  const handleRefreshTeachers = async () => {
      if (onRefreshTeachers) {
          setIsRefreshing(true);
          await onRefreshTeachers();
          setIsRefreshing(false);
      }
  };

  const generateLink = () => {
    // Create URL search params
    const params = new URLSearchParams();
    params.set('teacher', info.name);
    params.set('subject', info.subject);
    params.set('room', info.room);
    
    // Convert YYYY-MM-DD to DD/MM/YYYY for display/storage consistency
    const dateObj = new Date(info.date);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    params.set('date', formattedDate);
    
    params.set('shift', info.shift);
    params.set('term', info.term);
    params.set('major', info.major);
    params.set('year', info.year); // Year Level
    params.set('team', info.team); // Add Team

    // Calculate Expiration
    let expiryTimestamp = 0;
    const now = Date.now();

    if (expiryType === '24h') {
        expiryTimestamp = now + (24 * 60 * 60 * 1000); // +24 hours
    } else if (expiryType === '48h') {
        expiryTimestamp = now + (48 * 60 * 60 * 1000); // +48 hours
    } else if (expiryType === 'custom' && customDate) {
        expiryTimestamp = new Date(customDate).getTime();
    }

    if (expiryTimestamp > 0) {
        params.set('exp', expiryTimestamp.toString());
    }

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    setGeneratedLink(url);
    setCopied(false);
  };

  const shortenLink = async () => {
    if (!generatedLink) return;
    
    setIsShortening(true);
    try {
      // Using is.gd via a CORS proxy (allorigins) because is.gd doesn't support direct browser calls.
      // is.gd is a very reliable, fast, and free alternative to tinyurl.
      const isGdUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(generatedLink)}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(isGdUrl)}`;
      
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const data = await response.json();
        // The proxy returns the content in data.contents
        if (data.contents && !data.contents.includes('Error')) {
             setGeneratedLink(data.contents);
        } else {
             throw new Error("Shortener Error");
        }
      } else {
        alert('មិនអាចបង្រួម Link បានទេ។ សូមប្រើ Link វែងជំនួស។ (Failed to shorten)');
      }
    } catch (error) {
      console.error('Error shortening link:', error);
      // Fallback to TinyURL if is.gd fails
      try {
          const tinyRes = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(generatedLink)}`);
          if(tinyRes.ok) {
              const tinyUrl = await tinyRes.text();
              setGeneratedLink(tinyUrl);
              return;
          }
      } catch(e) {}
      alert('មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់សេវាកម្មបង្រួម Link។');
    } finally {
      setIsShortening(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedLink)}`;
  const isLongUrl = generatedLink.includes('teacher=');

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-moul text-gray-800 mb-6 flex items-center gap-2">
        <QrCode className="text-blue-600" />
        បង្កើត QR Code សម្រាប់ថ្នាក់រៀន (Class Setup)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">សាស្ត្រាចារ្យ (Teacher)</label>
          <div className="flex gap-2">
              <select 
                value={info.name}
                onChange={(e) => setInfo({...info, name: e.target.value})}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {teachersList.length === 0 && <option value="">No teachers found</option>}
                {teachersList.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
              {onRefreshTeachers && (
                  <button 
                    onClick={handleRefreshTeachers}
                    disabled={isRefreshing}
                    className="p-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors text-blue-600"
                    title="Refresh Teachers from Sheet"
                  >
                      <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
                  </button>
              )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">* ទាញយកឈ្មោះពី Sheet "Teachers" (Action: getTeachers)</p>
        </div>

        {/* Team Dropdown */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Users size={16} />
                ក្រុម (Team)
            </label>
            <select
                value={info.team}
                onChange={(e) => setInfo({...info, team: e.target.value})}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                 <option value="General">General</option>
                {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">* ជ្រើសរើសដោយស្វ័យប្រវត្តិបើមានក្នុង Sheet</p>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">មុខវិជ្ជា (Subject)</label>
            <input 
                type="text" 
                value={info.subject}
                onChange={(e) => setInfo({...info, subject: e.target.value})}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>

        {/* Term Input */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <BookOpen size={16} />
                វគ្គសិក្សា (Term)
            </label>
            <div className="relative">
                <select
                    value={info.term}
                    onChange={(e) => setInfo({...info, term: e.target.value})}
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    {TERMS_LIST.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Major Input */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <GraduationCap size={16} />
                ឯកទេស (Major)
            </label>
            <input 
                type="text" 
                value={info.major}
                onChange={(e) => setInfo({...info, major: e.target.value})}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ex: គណនេយ្យ"
            />
        </div>

        {/* Year Level Input */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Layers size={16} />
                ឆ្នាំទី (Year Level)
            </label>
            <select
                value={info.year}
                onChange={(e) => setInfo({...info, year: e.target.value})}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                <option value="1">ឆ្នាំទី ១ (Year 1)</option>
                <option value="2">ឆ្នាំទី ២ (Year 2)</option>
                <option value="3">ឆ្នាំទី ៣ (Year 3)</option>
                <option value="4">ឆ្នាំទី ៤ (Year 4)</option>
            </select>
        </div>
        
        {/* Date Calendar Input */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={16} />
                កាលបរិច្ឆេទ (Date)
            </label>
            <input 
                type="date" 
                value={info.date}
                onChange={(e) => setInfo({...info, date: e.target.value})}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">បន្ទប់ (Room)</label>
            <input 
                type="text" 
                value={info.room}
                onChange={(e) => setInfo({...info, room: e.target.value})}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>
        <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">វេន (Shift)</label>
             <select
                value={info.shift}
                onChange={(e) => setInfo({...info, shift: e.target.value})}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
             >
                <option value="ព្រឹក">ព្រឹក (Morning)</option>
                <option value="រសៀល">រសៀល (Afternoon)</option>
                <option value="យប់">យប់ (Evening)</option>
                <option value="ចុងសប្តាហ៍">ចុងសប្តាហ៍ (Weekend)</option>
             </select>
        </div>
      </div>

      {/* Expiry Settings */}
      <div className="mb-6 bg-blue-50 p-4 rounded border border-blue-100">
        <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <Clock size={16} />
            កំណត់សុពលភាព Link (Link Expiry)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <select 
                    value={expiryType}
                    onChange={(e) => setExpiryType(e.target.value as any)}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none"
                >
                    <option value="24h">មានសុពលភាព ១ថ្ងៃ (24 Hours)</option>
                    <option value="48h">មានសុពលភាព ២ថ្ងៃ (48 Hours)</option>
                    <option value="custom">កំណត់កាលបរិច្ឆេទ (Custom Date)</option>
                    <option value="unlimited">គ្មានកំណត់ (Unlimited)</option>
                </select>
            </div>
            {expiryType === 'custom' && (
                <div>
                    <input 
                        type="datetime-local" 
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none"
                    />
                </div>
            )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
            * ក្រោយពេលផុតកំណត់ Link នឹងមិនអាចប្រើដើម្បីវាយតម្លៃបានទៀតទេ។
        </p>
      </div>

      <button 
        onClick={generateLink}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition mb-6 shadow-md"
      >
        បង្កើត Link និង QR Code
      </button>

      {generatedLink && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center animate-fade-in relative">
          
          <p className="text-sm text-gray-500 mb-4">ចែករំលែក Link នេះ ឬបង្ហាញ QR Code ដល់និស្សិត៖</p>
          
          <div className="flex justify-center mb-6">
            <img src={qrImageUrl} alt="QR Code" className="border-4 border-white shadow-lg rounded-lg" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 max-w-full">
            <input 
              readOnly 
              value={generatedLink} 
              className="w-full sm:flex-1 bg-white border border-gray-300 text-gray-500 text-sm p-2 rounded focus:outline-none"
            />
            
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Shorten Button - Only show if URL is long */}
              {isLongUrl && (
                <button
                  onClick={shortenLink}
                  disabled={isShortening}
                  title="បង្រួម Link ឱ្យខ្លី (Shorten)"
                  className="p-2 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200 transition-colors flex items-center justify-center flex-1 sm:flex-none"
                >
                  {isShortening ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
                  <span className="ml-2 sm:hidden text-sm">បង្រួម</span>
                </button>
              )}

              <button 
                onClick={copyToClipboard}
                title="Copy Link"
                className={`p-2 rounded flex items-center justify-center flex-1 sm:flex-none transition-colors ${copied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
                <span className="ml-2 sm:hidden text-sm">Copy</span>
              </button>
            </div>
          </div>
          {isLongUrl && (
             <p className="text-xs text-gray-400 mt-2 text-left sm:text-center">
               ចុចប៊ូតុង <Wand2 size={12} className="inline"/> ដើម្បីបង្រួម Link ឱ្យខ្លី (Using is.gd).
             </p>
          )}
        </div>
      )}
    </div>
  );
};