import React, { useState, useEffect } from 'react';
import { EvaluationForm } from './components/EvaluationForm';
import { ResultsDashboard } from './components/ResultsDashboard';
import { LinkGenerator } from './components/LinkGenerator';
import { EVALUATION_DATA, TEACHER_INFO_DEFAULT, TEACHERS_LIST } from './constants';
import { Submission, TeacherInfo } from './types';
import { saveSubmission, getSubmissions, clearSubmissions } from './services/storage';
import { GraduationCap, LayoutDashboard, FileText, QrCode, Trash2, RefreshCw } from 'lucide-react';

function App() {
  const [view, setView] = useState<'form' | 'dashboard' | 'generator'>('form');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // State for the form (Teacher Info)
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>(TEACHER_INFO_DEFAULT);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  // Function to load data from Google Sheets
  const loadData = async () => {
    setIsLoadingData(true);
    const data = await getSubmissions();
    setSubmissions(data);
    setIsLoadingData(false);
  };

  // Check URL params on mount
  useEffect(() => {
    // 1. Check URL Params (if student scanned a QR code)
    const params = new URLSearchParams(window.location.search);
    const teacherParam = params.get('teacher');
    
    if (teacherParam) {
      setTeacherInfo({
        ...TEACHER_INFO_DEFAULT,
        name: teacherParam,
        subject: params.get('subject') || TEACHER_INFO_DEFAULT.subject,
        room: params.get('room') || TEACHER_INFO_DEFAULT.room,
        date: params.get('date') || TEACHER_INFO_DEFAULT.date,
        shift: params.get('shift') || TEACHER_INFO_DEFAULT.shift,
      });
      setIsReadOnlyMode(true);
      setView('form');
    }
    
    // 2. Load initial data (in background)
    loadData();
  }, []);

  const handleSubmission = async (submission: Submission) => {
    // Add extra info for the sheet
    const fullSubmission = {
      ...submission,
      subject: teacherInfo.subject,
      room: teacherInfo.room,
      shift: teacherInfo.shift
    };

    const success = await saveSubmission(fullSubmission);
    if (success) {
        alert('ការវាយតម្លៃត្រូវបានបញ្ជូនជោគជ័យ! (Submission Successful)');
        // Reload data to reflect new submission
        await loadData();
    }
  };
  
  const handleClearData = () => {
    if(confirm('ការលុបទិន្នន័យពីទីនេះ គឺលុបតែនៅក្នុង Browser របស់អ្នកប៉ុណ្ណោះ។ ដើម្បីលុបពិតប្រាកដ សូមចូលទៅលុបក្នុង Google Sheets។')) {
        clearSubmissions();
        setSubmissions([]); // This clears local view state
    }
  }

  // Filter logic for Dashboard
  const [selectedTeacherDashboard, setSelectedTeacherDashboard] = useState(TEACHERS_LIST[0]);
  const currentTeacherSubmissions = submissions.filter(
    (s) => s.teacherName === selectedTeacherDashboard
  );
  
  // Logic to show dashboard info based on selected teacher (derived from submissions or default)
  const dashboardTeacherInfo = {
      ...TEACHER_INFO_DEFAULT,
      name: selectedTeacherDashboard
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Navbar */}
      <nav className="bg-teal-700 text-white shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('form')}>
              <div className="bg-white p-1.5 rounded-full">
                <GraduationCap className="h-6 w-6 text-teal-700" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-moul text-lg leading-tight tracking-wide">សាកលវិទ្យាល័យកម្ពុជា</h1>
                <p className="text-xs text-teal-200 font-sans">Internal Quality Assurance Office</p>
              </div>
            </div>
            
            <div className="flex space-x-1 sm:space-x-2">
              <button
                onClick={() => setView('form')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  view === 'form' ? 'bg-teal-800 text-white' : 'text-teal-100 hover:bg-teal-600'
                }`}
              >
                <FileText size={18} />
                <span className="hidden sm:inline">វាយតម្លៃ (Form)</span>
              </button>

              {!isReadOnlyMode && (
                <>
                    <button
                        onClick={() => setView('generator')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                        view === 'generator' ? 'bg-teal-800 text-white' : 'text-teal-100 hover:bg-teal-600'
                        }`}
                    >
                        <QrCode size={18} />
                        <span className="hidden sm:inline">បង្កើត Link (Admin)</span>
                    </button>
                    
                    <button
                        onClick={() => { setView('dashboard'); loadData(); }}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition relative ${
                        view === 'dashboard' ? 'bg-teal-800 text-white' : 'text-teal-100 hover:bg-teal-600'
                        }`}
                    >
                        <LayoutDashboard size={18} />
                        <span className="hidden sm:inline">លទ្ធផល (Results)</span>
                        {!isLoadingData && submissions.length > 0 && (
                        <span className="absolute top-1 right-1 sm:top-0 sm:right-0 sm:relative bg-red-500 text-white text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center transform translate-x-1 -translate-y-1 sm:translate-x-0 sm:translate-y-0">
                            {submissions.length}
                        </span>
                        )}
                    </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'form' && (
          <div className="animate-fade-in">
             <div className="text-center mb-8">
                <h2 className="text-2xl font-moul text-gray-800 mb-2 leading-relaxed">សន្លឹកកិច្ចការវាយតម្លៃការបង្រៀនរបស់សាស្ត្រាចារ្យ</h2>
                <p className="text-gray-600 font-sans">សូមនិស្សិតវាយតម្លៃដោយសុក្រឹតភាព (Please evaluate objectively)</p>
             </div>
            <EvaluationForm
              teacherInfo={teacherInfo}
              teachers={TEACHERS_LIST}
              onTeacherChange={(name) => setTeacherInfo({...teacherInfo, name})}
              categories={EVALUATION_DATA}
              onSubmit={handleSubmission}
              isReadOnlyMode={isReadOnlyMode}
            />
          </div>
        )}

        {view === 'generator' && !isReadOnlyMode && (
             <div className="animate-fade-in">
                 <LinkGenerator />
             </div>
        )}

        {view === 'dashboard' && !isReadOnlyMode && (
          <div className="animate-fade-in">
             <div className="mb-6 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 print:hidden">
                <div className="flex items-center space-x-2 mb-4 md:mb-0">
                   <span className="text-sm font-bold text-gray-600">មើលលទ្ធផលរបស់:</span>
                   <select 
                      value={selectedTeacherDashboard}
                      onChange={(e) => setSelectedTeacherDashboard(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm font-bold text-blue-800 focus:ring-blue-500 cursor-pointer"
                   >
                      {TEACHERS_LIST.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                   </select>
                </div>
                
                <div className="flex space-x-2">
                    <button 
                        onClick={loadData}
                        className="text-blue-600 text-sm hover:bg-blue-50 px-3 py-2 rounded flex items-center space-x-1"
                    >
                        <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
                        <span>Refresh Data</span>
                    </button>
                    <button 
                        onClick={handleClearData}
                        className="text-gray-400 text-sm hover:bg-gray-50 px-3 py-2 rounded flex items-center space-x-1"
                    >
                        <Trash2 size={16} />
                        <span>Clear Local</span>
                    </button>
                </div>
             </div>
            
             {isLoadingData ? (
                 <div className="flex justify-center items-center py-20">
                     <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                     <span className="ml-3 text-gray-500">កំពុងទាញយកទិន្នន័យពី Google Sheets...</span>
                 </div>
             ) : (
                 <ResultsDashboard 
                    submissions={currentTeacherSubmissions}
                    categories={EVALUATION_DATA}
                    teacherInfo={dashboardTeacherInfo}
                 />
             )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm print:hidden">
        <p className="font-sans">&copy; {new Date().getFullYear()} University Evaluation System.</p>
        <p className="text-xs mt-1 text-gray-600 font-sans">Powered by Google Sheets Integration</p>
      </footer>
    </div>
  );
}

export default App;