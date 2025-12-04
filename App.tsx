import React, { useState, useEffect } from 'react';
import { EvaluationForm } from './components/EvaluationForm';
import { ResultsDashboard } from './components/ResultsDashboard';
import { LinkGenerator } from './components/LinkGenerator';
import { EVALUATION_DATA, TEACHER_INFO_DEFAULT, TEACHERS_LIST } from './constants';
import { Submission, TeacherInfo } from './types';
import { saveSubmission, getSubmissions, clearSubmissions, getPublicLinkStatus } from './services/storage';
import { LayoutDashboard, FileText, QrCode, Trash2, RefreshCw, Lock, Clock, AlertCircle } from 'lucide-react';

function App() {
  const [view, setView] = useState<'form' | 'dashboard' | 'generator' | 'access_denied' | 'expired'>('form');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // State for the form (Teacher Info)
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>(TEACHER_INFO_DEFAULT);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  
  // New State: Is the user viewing a Public Result Link?
  const [isPublicView, setIsPublicView] = useState(false);

  // Function to load data from Google Sheets
  const loadData = async () => {
    setIsLoadingData(true);
    const data = await getSubmissions();
    setSubmissions(data);
    setIsLoadingData(false);
  };

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const teacherParam = params.get('teacher');
    const expiryParam = params.get('exp');

    // Case 1: Public Results View
    if (mode === 'public_results' && teacherParam) {
        // Check if access is allowed
        const isAllowed = getPublicLinkStatus(teacherParam);
        
        if (isAllowed) {
            setTeacherInfo({
                ...TEACHER_INFO_DEFAULT,
                name: teacherParam,
                subject: params.get('subject') || TEACHER_INFO_DEFAULT.subject,
            });
            setSelectedTeacherDashboard(teacherParam); // Set filter for dashboard
            setIsPublicView(true);
            setView('dashboard');
            loadData(); // Load data immediately for public view
        } else {
            setView('access_denied');
        }
        return;
    }
    
    // Case 2: Student Scanning QR Code (Form View)
    if (teacherParam) {
        // Check Expiration
        if (expiryParam) {
            const expiryTime = parseInt(expiryParam, 10);
            if (!isNaN(expiryTime) && Date.now() > expiryTime) {
                setView('expired');
                return;
            }
        }

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
    
    // 3. Load initial data (in background) if not public view
    if (mode !== 'public_results' && !teacherParam) {
        loadData();
    }
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

  // Render Access Denied Page
  if (view === 'access_denied') {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
              <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
                  <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-red-600" />
                  </div>
                  <h1 className="text-xl font-moul text-red-700 mb-2">ការចូលមើលត្រូវបានបិទ</h1>
                  <p className="text-gray-600 mb-6">Link នេះត្រូវបានបិទ ឬមិនអនុញ្ញាតឱ្យចូលមើលជាសាធារណៈទេ។ សូមទាក់ទងអ្នកគ្រប់គ្រង។</p>
                  <a href="/" className="inline-block bg-teal-700 text-white px-6 py-2 rounded hover:bg-teal-800 transition">
                      ត្រឡប់ទៅទំព័រដើម
                  </a>
              </div>
          </div>
      );
  }

  // Render Expired Page
  if (view === 'expired') {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <h1 className="text-xl font-moul text-orange-700 mb-2">Link ផុតកំណត់ (Expired)</h1>
                <p className="text-gray-600 mb-6">សុំទោស Link សម្រាប់វាយតម្លៃមួយនេះបានផុតកំណត់ហើយ។ សូមទាក់ទងសាស្ត្រាចារ្យ ឬការិយាល័យជំនាញ។</p>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                    <AlertCircle className="inline w-4 h-4 mr-1 mb-0.5" />
                    ការវាយតម្លៃត្រូវបានបិទបញ្ចប់
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Navbar - Hidden on Public View */}
      {!isPublicView && (
      <nav className="bg-teal-700 text-white shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('form')}>
              <img 
                src="/logo.ico" 
                alt="NUCK Logo" 
                className="h-12 w-auto sm:h-14 bg-white rounded-full p-0.5 object-contain"
              />
              <div className="hidden sm:block">
                {/* Updated University Name - Adjusted Text Size for Length */}
                <h1 className="font-moul text-xs sm:text-sm md:text-base leading-tight tracking-wide line-clamp-2 max-w-md">
                   សាខាសាកលវិទ្យាល័យជាតិជាស៊ីមកំចាយមារ ខេត្តកំពង់ចាម
                </h1>
                <p className="text-[10px] sm:text-xs text-teal-200 font-sans truncate max-w-xs">
                   National University of Cheasim Kamchaymear, Kampong Cham Campus
                </p>
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
      )}
      
      {/* Public View Header */}
      {isPublicView && (
         <div className="bg-teal-800 text-white p-4 text-center print:hidden">
             <img src="/logo.ico" alt="Logo" className="h-20 w-auto mx-auto mb-2 object-contain" />
             <h1 className="font-moul text-lg sm:text-xl">លទ្ធផលនៃការវាយតម្លៃសាស្ត្រាចារ្យ (Public Result)</h1>
             <p className="text-sm opacity-80 font-sans">សាខាសាកលវិទ្យាល័យជាតិជាស៊ីមកំចាយមារ ខេត្តកំពង់ចាម</p>
         </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'form' && (
          <div className="animate-fade-in">
             <div className="text-center mb-8">
                <img 
                    src="/logo.ico" 
                    alt="University Logo" 
                    className="h-24 w-auto mx-auto mb-4 object-contain"
                />
                <h1 className="text-xl sm:text-2xl font-moul text-teal-800 mb-2">
                    សាខាសាកលវិទ្យាល័យជាតិជាស៊ីមកំចាយមារ ខេត្តកំពង់ចាម
                </h1>
                <h2 className="text-lg font-bold text-gray-700 mb-4">
                    National University of Cheasim Kamchaymear, Kampong Cham Campus
                </h2>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 inline-block">
                    <h3 className="text-lg font-moul text-gray-800 leading-relaxed">សន្លឹកកិច្ចការវាយតម្លៃការបង្រៀនរបស់សាស្ត្រាចារ្យ</h3>
                    <p className="text-gray-600 font-sans text-sm mt-1">សូមនិស្សិតវាយតម្លៃដោយសុក្រឹតភាព (Please evaluate objectively)</p>
                </div>
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

        {view === 'generator' && !isReadOnlyMode && !isPublicView && (
             <div className="animate-fade-in">
                 <LinkGenerator />
             </div>
        )}

        {view === 'dashboard' && !isReadOnlyMode && (
          <div className="animate-fade-in">
             {/* Admin Controls (Hidden in Public View) */}
             {!isPublicView && (
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
             )}
            
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
                    isPublicView={isPublicView}
                 />
             )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm print:hidden">
        <p className="font-moul mb-1">សាខាសាកលវិទ្យាល័យជាតិជាស៊ីមកំចាយមារ ខេត្តកំពង់ចាម</p>
        <p className="font-sans text-xs opacity-70">National University of Cheasim Kamchaymear, Kampong Cham Campus</p>
        <p className="font-sans text-xs mt-2">&copy; {new Date().getFullYear()} Quality Assurance System.</p>
      </footer>
    </div>
  );
}

export default App;