import React, { useState, useEffect, useRef } from 'react';
import { EvaluationForm } from './components/EvaluationForm';
import { ResultsDashboard } from './components/ResultsDashboard';
import { LinkGenerator } from './components/LinkGenerator';
import { LoginForm } from './components/LoginForm'; // Import Login Form
import { EVALUATION_DATA, TEACHER_INFO_DEFAULT, TEACHERS_LIST } from './constants';
import { Submission, TeacherInfo } from './types';
import { saveSubmission, getSubmissions, clearSubmissions, getPublicLinkStatus } from './services/storage';
import { LayoutDashboard, FileText, QrCode, Trash2, RefreshCw, Lock, Clock, AlertCircle, CalendarX, Ban, Timer } from 'lucide-react';

function App() {
  const [view, setView] = useState<'form' | 'dashboard' | 'generator' | 'access_denied' | 'expired'>('form');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingView, setPendingView] = useState<'dashboard' | 'generator' | null>(null);

  // State for the form (Teacher Info)
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>(TEACHER_INFO_DEFAULT);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  
  // New State: Is the user viewing a Public Result Link?
  const [isPublicView, setIsPublicView] = useState(false);

  // Expiry Logic
  const [expiredTimestamp, setExpiredTimestamp] = useState<number | null>(null);
  const [timeLeftString, setTimeLeftString] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  // Function to load data from Google Sheets
  const loadData = async () => {
    setIsLoadingData(true);
    const data = await getSubmissions();
    setSubmissions(data);
    setIsLoadingData(false);
  };

  // Countdown Logic
  useEffect(() => {
    if (expiredTimestamp && view === 'form') {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const distance = expiredTimestamp - now;

        if (distance < 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setView('expired');
          setTimeLeftString('');
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          let str = '';
          if (days > 0) str += `${days}ថ្ងៃ `;
          str += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          setTimeLeftString(str);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiredTimestamp, view]);

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
                term: params.get('term') || TEACHER_INFO_DEFAULT.term,
            });
            // We only set the teacher name initially for the filter, user can change later if needed in dashboard
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
        // Parse basic info first (useful even if expired, to show WHAT expired)
        const infoFromUrl = {
            ...TEACHER_INFO_DEFAULT,
            name: teacherParam,
            subject: params.get('subject') || TEACHER_INFO_DEFAULT.subject,
            room: params.get('room') || TEACHER_INFO_DEFAULT.room,
            date: params.get('date') || TEACHER_INFO_DEFAULT.date,
            shift: params.get('shift') || TEACHER_INFO_DEFAULT.shift,
            term: params.get('term') || TEACHER_INFO_DEFAULT.term,
        };
        setTeacherInfo(infoFromUrl);

        // Check Expiration
        if (expiryParam) {
            const expiryTime = parseInt(expiryParam, 10);
            if (!isNaN(expiryTime)) {
                if (Date.now() > expiryTime) {
                    setExpiredTimestamp(expiryTime);
                    setView('expired');
                    return;
                } else {
                    // Valid and running
                    setExpiredTimestamp(expiryTime);
                }
            }
        }

      setIsReadOnlyMode(true);
      setView('form');
    }
    
    // 3. Load initial data (in background) if not public view
    if (mode !== 'public_results' && !teacherParam) {
        // We don't load data automatically for admins anymore until they login and go to dashboard
    }
  }, []);

  const handleSubmission = async (submission: Submission) => {
    // Add extra info for the sheet
    const fullSubmission = {
      ...submission,
      subject: teacherInfo.subject,
      room: teacherInfo.room,
      shift: teacherInfo.shift,
      term: teacherInfo.term
    };

    const success = await saveSubmission(fullSubmission);
    if (success) {
        alert('ការវាយតម្លៃត្រូវបានបញ្ជូនជោគជ័យ! (Submission Successful)');
        // Reload data to reflect new submission if on dashboard (rare case for student view but safe)
        if (view === 'dashboard') await loadData();
    }
  };
  
  const handleClearData = () => {
    if(confirm('ការលុបទិន្នន័យពីទីនេះ គឺលុបតែនៅក្នុង Browser របស់អ្នកប៉ុណ្ណោះ។ ដើម្បីលុបពិតប្រាកដ សូមចូលទៅលុបក្នុង Google Sheets។')) {
        clearSubmissions();
        setSubmissions([]); // This clears local view state
    }
  }

  // Handle Navigation with Auth
  const handleNavClick = (targetView: 'form' | 'dashboard' | 'generator') => {
      if (targetView === 'form') {
          setView('form');
          return;
      }

      // Protected Views
      if (isLoggedIn) {
          setView(targetView);
          if (targetView === 'dashboard') {
              loadData();
          }
      } else {
          setPendingView(targetView);
          setShowLoginModal(true);
      }
  };

  const handleLoginSuccess = () => {
      setIsLoggedIn(true);
      setShowLoginModal(false);
      if (pendingView) {
          setView(pendingView);
          if (pendingView === 'dashboard') {
              loadData();
          }
      }
      setPendingView(null);
  };
  
  // Dashboard default info (empty name for admin view to show all/filter)
  const dashboardTeacherInfo = {
      ...TEACHER_INFO_DEFAULT,
      name: '' 
  };

  // Render Access Denied Page
  if (view === 'access_denied') {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
              <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full border-t-4 border-red-600">
                  <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock className="w-10 h-10 text-red-600" />
                  </div>
                  <h1 className="text-xl font-moul text-gray-800 mb-2">ការចូលមើលត្រូវបានបិទ</h1>
                  <p className="text-gray-600 mb-8">Link នេះត្រូវបានបិទ ឬមិនអនុញ្ញាតឱ្យចូលមើលជាសាធារណៈទេ។ សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។</p>
                  
                  {/* REMOVED BACK BUTTON AS REQUESTED */}
              </div>
          </div>
      );
  }

  // Render Expired Page
  if (view === 'expired') {
    const expiredDateStr = expiredTimestamp 
        ? new Date(expiredTimestamp).toLocaleString('km-KH', { dateStyle: 'long', timeStyle: 'short' }) 
        : 'N/A';

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-lg w-full border border-gray-200 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                
                <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <CalendarX className="w-12 h-12 text-red-500" />
                </div>
                
                <h1 className="text-2xl font-moul text-red-600 mb-2">Link ផុតកំណត់</h1>
                <h2 className="text-lg font-bold text-gray-700 mb-6 uppercase tracking-wide">Link Expired</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left mb-6">
                    <p className="text-sm text-gray-500 mb-1">ការវាយតម្លៃសម្រាប់ (Evaluation For):</p>
                    <p className="font-bold text-gray-800 text-lg mb-2">{teacherInfo.name}</p>
                    <div className="flex justify-between text-sm text-gray-600 border-t border-gray-200 pt-2 mt-2">
                        <span>មុខវិជ្ជា: {teacherInfo.subject}</span>
                        <span>{teacherInfo.term}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600">
                        សុំទោស Link សម្រាប់វាយតម្លៃមួយនេះបានផុតកំណត់តាំងពី៖
                        <br/>
                        <span className="font-bold text-red-500 block mt-1 text-lg">{expiredDateStr}</span>
                    </p>
                    
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-red-50 p-3 rounded text-center">
                        <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>មិនអាចធ្វើការវាយតម្លៃបានទៀតទេ។</span>
                    </div>
                </div>

                <p className="text-xs text-gray-400 mt-8">
                    ប្រសិនបើអ្នកគិតថានេះជាកំហុស សូមទាក់ទងការិយាល័យសិក្សា។
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      
      {/* Login Modal */}
      {showLoginModal && (
          <LoginForm 
            onLoginSuccess={handleLoginSuccess} 
            onCancel={() => setShowLoginModal(false)}
          />
      )}

      {/* Navbar - Hidden on Public View */}
      {!isPublicView && (
      <nav className="bg-teal-700 text-white shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavClick('form')}>
              <img 
                src="/LOGO.png" 
                alt="NUCK Logo" 
                className="h-12 w-auto sm:h-14 bg-white rounded-full p-0.5 object-contain"
              />
              <div className="hidden sm:block">
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
                onClick={() => handleNavClick('form')}
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
                        onClick={() => handleNavClick('generator')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                        view === 'generator' ? 'bg-teal-800 text-white' : 'text-teal-100 hover:bg-teal-600'
                        }`}
                    >
                        <QrCode size={18} />
                        <span className="hidden sm:inline">បង្កើត Link (Admin)</span>
                    </button>
                    
                    <button
                        onClick={() => handleNavClick('dashboard')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition relative ${
                        view === 'dashboard' ? 'bg-teal-800 text-white' : 'text-teal-100 hover:bg-teal-600'
                        }`}
                    >
                        <LayoutDashboard size={18} />
                        <span className="hidden sm:inline">លទ្ធផល (Results)</span>
                        {!isLoadingData && submissions.length > 0 && view === 'dashboard' && (
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
             <img src="/LOGO.png" alt="Logo" className="h-20 w-auto mx-auto mb-2 object-contain" />
             <h1 className="font-moul text-lg sm:text-xl">លទ្ធផលនៃការវាយតម្លៃសាស្ត្រាចារ្យ (Public Result)</h1>
             <p className="text-sm opacity-80 font-sans">សាខាសាកលវិទ្យាល័យជាតិជាស៊ីមកំចាយមារ ខេត្តកំពង់ចាម</p>
         </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
        {/* COUNTDOWN TIMER BANNER (Only in Form View + With Expiry) */}
        {view === 'form' && timeLeftString && (
          <div className="sticky top-0 z-30 mb-6 bg-red-600 text-white rounded-lg shadow-lg p-3 flex items-center justify-center gap-3 animate-pulse">
             <Timer className="animate-bounce" />
             <div className="font-bold text-center">
                 <span className="text-red-100 text-xs uppercase block tracking-wider">ពេលវេលានៅសល់ (Time Remaining)</span>
                 <span className="text-xl font-mono">{timeLeftString}</span>
             </div>
          </div>
        )}

        {view === 'form' && (
          <div className="animate-fade-in">
             <div className="text-center mb-8">
                <img 
                    src="/LOGO.png" 
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

        {view === 'generator' && !isReadOnlyMode && !isPublicView && isLoggedIn && (
             <div className="animate-fade-in">
                 <LinkGenerator />
             </div>
        )}

        {view === 'dashboard' && !isReadOnlyMode && (isLoggedIn || isPublicView) && (
          <div className="animate-fade-in">
             {/* Admin Controls (Hidden in Public View) */}
             {!isPublicView && (
                 <div className="mb-6 flex justify-end items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 print:hidden">
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
                    submissions={submissions}
                    categories={EVALUATION_DATA}
                    // IMPORTANT FIX: If Public View, pass the actual teacher info caught from URL to initialize filter correctly
                    teacherInfo={isPublicView ? teacherInfo : dashboardTeacherInfo}
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