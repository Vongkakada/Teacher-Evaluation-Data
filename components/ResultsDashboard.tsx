import React, { useState, useEffect } from 'react';
import { Category, Submission, TeacherInfo } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Printer, Download, Share2, Eye, EyeOff, Copy, Check, Filter, Calendar, Layers } from 'lucide-react';
import { getPublicLinkStatus, setPublicLinkStatus } from '../services/storage';
import { TEACHERS_LIST } from '../constants';

interface ResultsDashboardProps {
  submissions: Submission[];
  categories: Category[];
  teacherInfo: TeacherInfo;
  isPublicView?: boolean;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  submissions,
  categories,
  teacherInfo, // Initial teacher info from App.tsx (mostly empty or default in admin view)
  isPublicView = false,
}) => {
  
  // --- Filtering State ---
  const [filterTeacher, setFilterTeacher] = useState(isPublicView ? teacherInfo.name : TEACHERS_LIST[0]);
  const [filterTerm, setFilterTerm] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterYearLevel, setFilterYearLevel] = useState('All'); // New Filter for Year Level (1, 2, 3, 4)

  // Derive unique Terms and Dates from actual data for dropdowns
  const availableTerms = Array.from(new Set(submissions.map(s => s.term).filter(Boolean)));
  const availableYears = Array.from(new Set(submissions.map(s => new Date(s.timestamp).getFullYear().toString())));
  
  // Apply filters
  const filteredSubmissions = submissions.filter(s => {
      const date = new Date(s.timestamp);
      const matchesTeacher = s.teacherName === filterTeacher;
      const matchesTerm = filterTerm === 'All' || s.term === filterTerm;
      const matchesYear = filterYear === 'All' || date.getFullYear().toString() === filterYear;
      const matchesMonth = filterMonth === 'All' || (date.getMonth() + 1).toString() === filterMonth;
      const matchesYearLevel = filterYearLevel === 'All' || (s.yearLevel && s.yearLevel.toString() === filterYearLevel);

      return matchesTeacher && matchesTerm && matchesYear && matchesMonth && matchesYearLevel;
  });

  const totalStudents = filteredSubmissions.length;
  
  // Calculate dynamic display values
  const currentTerm = filterTerm !== 'All' ? filterTerm : (filteredSubmissions.length > 0 ? filteredSubmissions[0].term || '-' : '-');
  const currentMajor = filteredSubmissions.length > 0 ? filteredSubmissions[0].major || '-' : '-';
  const currentYearLevel = filterYearLevel !== 'All' ? filterYearLevel : (filteredSubmissions.length > 0 ? filteredSubmissions[0].yearLevel || '-' : '-');

  // Extract extra info from the first matching submission (assuming consistency within the filtered set)
  const firstSub = filteredSubmissions[0];
  const currentSubject = firstSub?.subject || '-';
  const currentRoom = firstSub?.room || '-';
  const currentShift = firstSub?.shift || '-';
  const currentDate = firstSub ? new Date(firstSub.timestamp).toLocaleDateString('km-KH') : '-';

  // --- Share Link Logic ---
  const [isShareActive, setIsShareActive] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
     // Load share status when teacher changes
     setIsShareActive(getPublicLinkStatus(filterTeacher));
  }, [filterTeacher]);

  const handleToggleShare = () => {
      const newState = !isShareActive;
      setIsShareActive(newState);
      setPublicLinkStatus(filterTeacher, newState);
  };

  const getPublicLink = () => {
      const params = new URLSearchParams();
      params.set('mode', 'public_results');
      params.set('teacher', filterTeacher);
      // Note: Public link currently defaults to showing all data for that teacher.
      return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(getPublicLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };
  // ------------------------

  // --- CSV Export Logic ---
  const handleDownloadCSV = () => {
    // 1. Prepare Headers
    const headers = [
      'Submission ID',
      'Date Submitted',
      'Teacher Name',
      'Term',
      'Subject',
      'Major',
      'Year Level',
      'Room',
      'Shift',
    ];
    // Add dynamic question headers (e.g., Q1, Q2...)
    categories.forEach(cat => {
        cat.questions.forEach((q, idx) => {
             headers.push(`${cat.id}_${q.id} (${q.text.substring(0, 15)}...)`);
        });
    });
    headers.push('Comment');

    // 2. Prepare Rows
    const rows = filteredSubmissions.map(sub => {
      const rowData = [
        sub.id,
        new Date(sub.timestamp).toLocaleString('km-KH'),
        sub.teacherName,
        sub.term || '-',
        sub.subject || '-',
        sub.major || '-',
        sub.yearLevel || '-',
        sub.room || '-',
        sub.shift || '-',
      ];

      // Add ratings in order
      categories.forEach(cat => {
        cat.questions.forEach(q => {
            rowData.push(sub.ratings[q.id]?.toString() || '');
        });
      });

      // Escape quotes in comments for CSV validity
      const safeComment = sub.comment ? `"${sub.comment.replace(/"/g, '""')}"` : '';
      rowData.push(safeComment);

      return rowData.join(',');
    });

    // 3. Combine and Download
    const csvContent = "\ufeff" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Evaluation_${filterTeacher}_${currentTerm}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // ------------------------

  // Calculate Stats per question
  let grandTotalScore = 0;
  let totalMaxScore = 0;

  const questionStats = categories.map(cat => {
    const qStats = cat.questions.map(q => {
      const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let sum = 0;

      filteredSubmissions.forEach(sub => {
        const rating = sub.ratings[q.id] || 0;
        if (rating > 0) {
          counts[rating as 1|2|3|4|5]++;
          sum += rating;
        }
      });
      
      const maxPossible = totalStudents * 5;
      const percentage = maxPossible > 0 ? (sum / maxPossible) * 100 : 0;
      
      grandTotalScore += percentage;
      totalMaxScore += 100;

      return {
        ...q,
        counts,
        sum,
        percentage,
        resultLabel: percentage >= 50 ? 'ជាប់' : 'ធ្លាក់'
      };
    });

    const categorySumPct = qStats.reduce((acc, curr) => acc + curr.percentage, 0);
    const categoryAvgPct = qStats.length > 0 ? categorySumPct / qStats.length : 0;
    
    let grade = 'E';
    if (categoryAvgPct >= 90) grade = 'A';
    else if (categoryAvgPct >= 80) grade = 'B';
    else if (categoryAvgPct >= 65) grade = 'C';
    else if (categoryAvgPct >= 50) grade = 'D';

    return {
      title: cat.title,
      questions: qStats,
      subtotal: categoryAvgPct,
      grade
    };
  });

  const finalScore = questionStats.reduce((acc, cat) => acc + cat.subtotal, 0) / questionStats.length;
  
  // Calculate Grade
  let finalGrade = 'E';
  if (finalScore >= 90) finalGrade = 'A';
  else if (finalScore >= 80) finalGrade = 'B';
  else if (finalScore >= 65) finalGrade = 'C';
  else if (finalScore >= 50) finalGrade = 'D';

  // Calculate GPA (4.0 Scale) based on the Final Score
  // Mapping logic:
  // 90-100 (A) -> 4.0
  // 80-89  (B) -> 3.5
  // 65-79  (C) -> 2.5
  // 50-64  (D) -> 1.5
  // < 50   (E) -> 0.0
  let gpa = 0.0;
  if (finalScore >= 90) gpa = 4.0;
  else if (finalScore >= 80) gpa = 3.5;
  else if (finalScore >= 65) gpa = 2.5;
  else if (finalScore >= 50) gpa = 1.5;
  else gpa = 0.0;

  const chartData = questionStats.map(c => ({
    name: c.title.split('(')[0],
    score: c.subtotal
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6 pb-20 print:p-0 print:space-y-4">
      
      {/* --- Advanced Filter Bar (Admin Only) --- */}
      {!isPublicView && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 print:hidden">
            <h3 className="text-gray-700 font-bold mb-3 flex items-center gap-2">
                <Filter size={18} className="text-teal-600" />
                ស្វែងរករបាយការណ៍ (Filter Report)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Teacher Filter */}
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ឈ្មោះគ្រូ (Teacher)</label>
                    <select 
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-bold text-gray-800"
                    >
                        {TEACHERS_LIST.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {/* Term Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">វគ្គសិក្សា (Term)</label>
                    <select 
                        value={filterTerm}
                        onChange={(e) => setFilterTerm(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700"
                    >
                        <option value="All">បង្ហាញទាំងអស់ (All Terms)</option>
                        {availableTerms.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {/* Year Level Filter - NEW */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                       <Layers size={12} />
                       ឆ្នាំទី (Year Level)
                    </label>
                    <select 
                        value={filterYearLevel}
                        onChange={(e) => setFilterYearLevel(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700"
                    >
                        <option value="All">គ្រប់ឆ្នាំ (All Years)</option>
                        <option value="1">ឆ្នាំទី ១</option>
                        <option value="2">ឆ្នាំទី ២</option>
                        <option value="3">ឆ្នាំទី ៣</option>
                        <option value="4">ឆ្នាំទី ៤</option>
                    </select>
                </div>

                {/* Year Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ឆ្នាំ (Year)</label>
                    <select 
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700"
                    >
                        <option value="All">គ្រប់ឆ្នាំ (All Years)</option>
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {/* Month Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ខែ (Month)</label>
                    <select 
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700"
                    >
                        <option value="All">គ្រប់ខែ (All Months)</option>
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={m.toString()}>ខែ {m}</option>
                        ))}
                    </select>
                </div>
            </div>
            {filteredSubmissions.length === 0 && (
                <div className="mt-3 text-sm text-orange-500 bg-orange-50 p-2 rounded">
                    មិនមានទិន្នន័យសម្រាប់លក្ខខណ្ឌដែលបានជ្រើសរើសទេ។ (No data found for these filters)
                </div>
            )}
        </div>
      )}

      {/* --- Share Control Panel (Admin Only) --- */}
      {!isPublicView && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 print:hidden transition-all">
              <div className="flex justify-between items-center">
                  <h3 className="text-gray-700 font-bold flex items-center gap-2">
                      <Share2 className="text-blue-600" size={20} />
                      ចែករំលែកលទ្ធផលគ្រូនេះ (Public Share)
                  </h3>
                  <button 
                    onClick={() => setShowSharePanel(!showSharePanel)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                      {showSharePanel ? 'Hide Settings' : 'Show Settings'}
                  </button>
              </div>

              {showSharePanel && (
                  <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 animate-fade-in">
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                              <button 
                                  onClick={handleToggleShare}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isShareActive ? 'bg-green-500' : 'bg-gray-300'}`}
                              >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isShareActive ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                              <span className={`font-medium ${isShareActive ? 'text-green-600' : 'text-gray-500'}`}>
                                  {isShareActive ? 'Public Link ដំណើរការ (Active)' : 'Public Link ត្រូវបានបិទ (Disabled)'}
                              </span>
                          </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                          <input 
                              readOnly 
                              value={getPublicLink()} 
                              className={`flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 focus:outline-none ${!isShareActive ? 'opacity-50 bg-gray-100' : 'bg-white'}`}
                          />
                          <button 
                              onClick={copyToClipboard}
                              disabled={!isShareActive}
                              className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-white font-medium transition ${isShareActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                          >
                              {copied ? <Check size={16} /> : <Copy size={16} />}
                              Copy Link
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Main Report Content */}
      {filteredSubmissions.length > 0 ? (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none">
        
        {/* Print Header */}
        <div className="hidden print:flex flex-col items-center mb-8 border-b border-gray-300 pb-4">
             <img src="/LOGO.png" alt="NUCK Logo" className="h-32 w-auto mb-2 object-contain" />
             <h1 className="text-xl font-moul text-black text-center">សាខាសាកលវិទ្យាល័យជាតិជាស៊ីមកំចាយមារ ខេត្តកំពង់ចាម</h1>
             <h2 className="text-sm font-bold text-gray-800 text-center uppercase tracking-wide">National University of Cheasim Kamchaymear, Kampong Cham Campus</h2>
             <p className="text-sm text-gray-600 font-bold mb-4 mt-2">Internal Quality Assurance Office</p>
             <h2 className="text-lg font-bold underline">លទ្ធផលវាយតម្លៃ (Evaluation Results)</h2>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 print:hidden gap-4">
            <div>
                <h2 className="text-2xl font-moul text-gray-800">លទ្ធផលវាយតម្លៃ (Evaluation Results)</h2>
                {/* Show active filters summary */}
                <p className="text-sm text-gray-500 mt-1 flex flex-wrap gap-2">
                    <span className="bg-gray-100 px-2 rounded">សាស្រ្តាចារ្យ: <span className="font-bold">{filterTeacher}</span></span>
                    <span className="bg-gray-100 px-2 rounded">Term: <span className="font-bold">{filterTerm}</span></span>
                    <span className="bg-gray-100 px-2 rounded">Year: <span className="font-bold">{filterYearLevel === 'All' ? 'All' : `Year ${filterYearLevel}`}</span></span>
                    <span className="bg-gray-100 px-2 rounded">Major: <span className="font-bold">{currentMajor}</span></span>
                </p>
            </div>
            
            <div className="flex space-x-2">
                {!isPublicView && (
                    <button 
                        onClick={handleDownloadCSV} 
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white transition shadow-sm"
                    >
                        <Download size={18} />
                        <span>Download CSV</span>
                    </button>
                )}
                <button 
                    onClick={() => window.print()} 
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition"
                >
                    <Printer size={18} />
                    <span>Print Report</span>
                </button>
            </div>
        </div>

        {/* Info Grid - Redesigned Layout */}
        <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100 print:bg-white print:border-gray-300 print:p-0">
           
           {/* Row 1 */}
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4 border-b border-blue-200 pb-4 print:border-gray-200">
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">ឈ្មោះសាស្ត្រាចារ្យ (Teacher)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900 truncate" title={filterTeacher}>{filterTeacher}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">ចំនួននិស្សិត (Students)</p>
                   <p className="text-sm sm:text-base font-bold text-blue-900">{totalStudents}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">វេន (Shift)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900">{currentShift}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">ឆ្នាំទី (Year Level)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900">{currentYearLevel === 'All' ? 'All' : `Year ${currentYearLevel}`}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">វគ្គសិក្សា (Term)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900">{currentTerm}</p>
               </div>
               <div className="bg-white p-1 rounded border border-blue-200 shadow-sm print:border-none print:shadow-none print:p-0">
                   <p className="text-gray-500 text-xs uppercase font-bold text-center">GPA</p>
                   <p className="text-lg sm:text-xl font-bold text-purple-700 text-center">{gpa.toFixed(2)}</p>
               </div>
           </div>

           {/* Row 2 */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">មុខវិជ្ជា (Subject)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900 break-words">{currentSubject}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">ឯកទេស (Major)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900 break-words">{currentMajor}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">បន្ទប់ (Room)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900">{currentRoom}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">កាលបរិច្ឆេទ (Date)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900">{currentDate}</p>
               </div>
           </div>
        </div>

        {/* The Big Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
                <tr className="bg-teal-600 text-white print:bg-gray-200 print:text-black">
                    <th className="border border-gray-300 p-2 text-left w-1/3">លក្ខណៈវិនិច្ឆ័យ (Criteria)</th>
                    <th className="border border-gray-300 p-2 text-center w-64">សូចនាករ (Indicators)</th>
                    <th className="border border-gray-300 p-2 w-8">A</th>
                    <th className="border border-gray-300 p-2 w-8">B</th>
                    <th className="border border-gray-300 p-2 w-8">C</th>
                    <th className="border border-gray-300 p-2 w-8">D</th>
                    <th className="border border-gray-300 p-2 w-8">E</th>
                    <th className="border border-gray-300 p-2 w-16">Score</th>
                    <th className="border border-gray-300 p-2 w-16">Result</th>
                    <th className="border border-gray-300 p-2 w-16">Total</th>
                    <th className="border border-gray-300 p-2 w-16">Grade</th>
                </tr>
            </thead>
            <tbody>
                {questionStats.map((cat, catIndex) => (
                    <React.Fragment key={catIndex}>
                        {cat.questions.map((q, qIndex) => (
                            <tr key={q.id} className="hover:bg-gray-50">
                                {qIndex === 0 && (
                                    <td rowSpan={cat.questions.length} className="border border-gray-300 p-2 font-bold align-middle bg-gray-50">
                                        {cat.title}
                                    </td>
                                )}
                                <td className="border border-gray-300 p-2">{q.text}</td>
                                <td className="border border-gray-300 p-2 text-center">{q.counts[5]}</td>
                                <td className="border border-gray-300 p-2 text-center">{q.counts[4]}</td>
                                <td className="border border-gray-300 p-2 text-center">{q.counts[3]}</td>
                                <td className="border border-gray-300 p-2 text-center">{q.counts[2]}</td>
                                <td className="border border-gray-300 p-2 text-center">{q.counts[1]}</td>
                                <td className="border border-gray-300 p-2 text-center font-medium">{q.percentage.toFixed(2)}</td>
                                <td className="border border-gray-300 p-2 text-center">{q.resultLabel}</td>
                                {qIndex === 0 && (
                                    <>
                                        <td rowSpan={cat.questions.length} className="border border-gray-300 p-2 text-center font-bold align-middle">
                                            {cat.subtotal.toFixed(2)}
                                        </td>
                                        <td rowSpan={cat.questions.length} className="border border-gray-300 p-2 text-center font-bold align-middle text-lg">
                                            {cat.grade}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </React.Fragment>
                ))}
                <tr className="bg-teal-500 text-white font-bold print:bg-gray-300 print:text-black">
                    <td colSpan={9} className="border border-gray-300 p-2 text-right pr-4">
                        <div className="flex flex-col items-end">
                            <span>Total Score</span>
                            <span className="text-xs font-normal opacity-80">(Average of all categories)</span>
                        </div>
                    </td>
                    <td className="border border-gray-300 p-2 text-center align-middle text-lg">{finalScore.toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-center align-middle text-lg">{finalGrade}</td>
                </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 text-sm text-gray-600 border border-gray-200 p-3 rounded bg-gray-50">
            <div className="flex flex-wrap gap-4 items-center">
                <span className="font-bold">សម្គាល់ (Legend):</span>
                <span className="text-red-500 font-medium">A=90-100 (GPA 4.0)</span>
                <span className="text-orange-500 font-medium">B=80-89 (GPA 3.5)</span>
                <span className="text-yellow-600 font-medium">C=65-79 (GPA 2.5)</span>
                <span className="text-blue-500 font-medium">D=50-64 (GPA 1.5)</span>
                <span className="text-gray-500 font-medium">E=&lt;50 (GPA 0.0)</span>
            </div>
        </div>
      </div>
      ) : (
          // Empty State
          <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300">
             <p className="text-gray-500">សូមជ្រើសរើសឈ្មោះគ្រូ និងលក្ខខណ្ឌស្វែងរកខាងលើដើម្បីបង្ហាញទិន្នន័យ។</p>
          </div>
      )}

      {/* Charts Section (Hidden on Print) */}
      {filteredSubmissions.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
             <h3 className="font-moul text-gray-700 mb-4 text-lg">ពិន្ទុតាមផ្នែក (Score by Category)</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#0d9488" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
          
           <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
             <h3 className="font-moul text-gray-700 mb-4 text-lg">សំណូមពររបស់និស្សិត (Comments)</h3>
             <div className="h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {filteredSubmissions.filter(s => s.comment).map((s, i) => (
                    <div key={s.id} className="p-3 bg-gray-50 rounded border border-gray-100 text-sm italic text-gray-600">
                        "{s.comment}"
                    </div>
                ))}
                {filteredSubmissions.filter(s => s.comment).length === 0 && (
                    <p className="text-gray-400 text-center mt-10">មិនមានមតិយោបល់ (No comments)</p>
                )}
             </div>
          </div>
      </div>
      )}
    </div>
  );
};