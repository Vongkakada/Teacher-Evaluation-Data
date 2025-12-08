import React, { useState, useEffect } from 'react';
import { Category, Submission, TeacherInfo } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Printer, Download, Share2, Eye, EyeOff, Copy, Check, Filter, Calendar, Layers, Users } from 'lucide-react';
import { getPublicLinkStatus, setPublicLinkStatus } from '../services/storage';

interface ResultsDashboardProps {
  submissions: Submission[];
  categories: Category[];
  teacherInfo: TeacherInfo;
  isPublicView?: boolean;
  teachersList: string[]; // Changed from Teacher[] to string[]
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  submissions,
  categories,
  teacherInfo, // Initial teacher info from App.tsx (mostly empty or default in admin view)
  isPublicView = false,
  teachersList
}) => {
  
  // --- Filtering State ---
  // Default to passed teacherInfo name (if public) or first in dynamic list
  const [filterTeacher, setFilterTeacher] = useState(
      isPublicView ? teacherInfo.name : (teachersList.length > 0 ? teachersList[0] : '')
  );
  const [filterTerm, setFilterTerm] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterYearLevel, setFilterYearLevel] = useState('All');
  const [filterTeam, setFilterTeam] = useState('All'); // New Team Filter

  // Derive unique values for dropdowns
  const availableTerms = Array.from(new Set(submissions.map(s => s.term).filter(Boolean)));
  const availableYears = Array.from(new Set(submissions.map(s => new Date(s.timestamp).getFullYear().toString())));
  const availableTeams = Array.from(new Set(submissions.map(s => s.team).filter(Boolean)));
  
  // Apply filters
  const filteredSubmissions = submissions.filter(s => {
      const date = new Date(s.timestamp);
      const matchesTeacher = s.teacherName === filterTeacher;
      const matchesTerm = filterTerm === 'All' || s.term === filterTerm;
      const matchesYear = filterYear === 'All' || date.getFullYear().toString() === filterYear;
      const matchesMonth = filterMonth === 'All' || (date.getMonth() + 1).toString() === filterMonth;
      const matchesYearLevel = filterYearLevel === 'All' || (s.yearLevel && s.yearLevel.toString() === filterYearLevel);
      const matchesTeam = filterTeam === 'All' || s.team === filterTeam;

      return matchesTeacher && matchesTerm && matchesYear && matchesMonth && matchesYearLevel && matchesTeam;
  });

  const totalStudents = filteredSubmissions.length;
  
  // Calculate dynamic display values
  const currentTerm = filterTerm !== 'All' ? filterTerm : (filteredSubmissions.length > 0 ? filteredSubmissions[0].term || '-' : '-');
  const currentMajor = filteredSubmissions.length > 0 ? filteredSubmissions[0].major || '-' : '-';
  const currentYearLevel = filterYearLevel !== 'All' ? filterYearLevel : (filteredSubmissions.length > 0 ? filteredSubmissions[0].yearLevel || '-' : '-');
  
  // Extract extra info from the first matching submission
  const firstSub = filteredSubmissions[0];
  const currentSubject = firstSub?.subject || '-';
  const currentRoom = firstSub?.room || '-';
  const currentShift = firstSub?.shift || '-';
  const currentDate = firstSub ? new Date(firstSub.timestamp).toLocaleDateString('km-KH') : '-';
  
  // Logic for Current Team Display:
  const currentTeam = firstSub?.team || '-';

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
      'Team',
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
        sub.team || '-',
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

  // Calculate Stats per question and category
  const questionStats = categories.map(cat => {
    const qStats = cat.questions.map(q => {
      let sum = 0;
      let count = 0;
      filteredSubmissions.forEach(sub => {
        const rating = sub.ratings[q.id] || 0;
        if (rating > 0) {
          sum += rating;
          count++;
        }
      });
      // Calculate mean (1-5)
      const mean = count > 0 ? sum / count : 0;
      return { mean };
    });

    // Average of questions in this category
    const categorySumMean = qStats.reduce((acc, curr) => acc + curr.mean, 0);
    const categoryAvg = qStats.length > 0 ? categorySumMean / qStats.length : 0;
    
    return {
      title: cat.title,
      subtotal: categoryAvg,
    };
  });

  // Final Average is the average of the 5 category averages
  const finalAverage = questionStats.reduce((acc, cat) => acc + cat.subtotal, 0) / questionStats.length;
  
  // Calculate Grade based on Final Average (1-5 scale mapped to %)
  // Assuming 5.0 = 100%
  const finalPercentage = (finalAverage / 5) * 100;

  const chartData = questionStats.map(c => ({
    name: c.title.split('(')[0],
    score: (c.subtotal / 5) * 100 // Convert back to 0-100 for chart
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Helper to count ratings and calculate weighted totals for the table
  const getQuestionDetailStats = (questionId: string) => {
     const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
     let totalVotes = 0;
     let sum = 0;

     filteredSubmissions.forEach(sub => {
         const val = sub.ratings[questionId];
         if (val >= 1 && val <= 5) {
             counts[val as 1|2|3|4|5]++;
             sum += val;
             totalVotes++;
         }
     });

     const mean = totalVotes > 0 ? sum / totalVotes : 0;
     const percentageScore = (mean / 5) * 100;

     return { counts, totalVotes, mean, percentageScore };
  };

  // Helper to determine Grade Letter
  const getGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'E';
  };

  return (
    <div className="space-y-6 pb-20 print:p-0 print:space-y-4">
      
      {/* --- Advanced Filter Bar (Admin Only) --- */}
      {!isPublicView && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 print:hidden">
            <h3 className="text-gray-700 font-bold mb-3 flex items-center gap-2">
                <Filter size={18} className="text-teal-600" />
                ស្វែងរករបាយការណ៍ (Filter Report)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {/* Teacher Filter */}
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ឈ្មោះគ្រូ (Teacher)</label>
                    <select 
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-bold text-gray-800"
                    >
                        {teachersList.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>

                {/* Team Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                        <Users size={12} />
                        ក្រុម (Team)
                    </label>
                    <select 
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700"
                    >
                        <option value="All">All Teams</option>
                        {availableTeams.map(t => (
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
                        <option value="All">All Terms</option>
                        {availableTerms.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                {/* Year Level Filter */}
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
                        <option value="All">All Years</option>
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
                        <option value="All">All Years</option>
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
                        <option value="All">All Months</option>
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
        <div className="hidden print:flex flex-col items-center mb-2 border-b border-gray-300 pb-4">
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
                    <span className="bg-gray-100 px-2 rounded">Team: <span className="font-bold">{currentTeam}</span></span>
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

        {/* Info Grid */}
        <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100 print:bg-white print:border-gray-300 print:p-0">
           
           {/* Row 1: Teacher, Subject, Major, Team */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 border-b border-blue-200 pb-4 print:border-gray-200">
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">ឈ្មោះសាស្ត្រាចារ្យ (Teacher)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900 truncate" title={filterTeacher}>{filterTeacher}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">មុខវិជ្ជា (Subject)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900 break-words">{currentSubject}</p>
               </div>
               <div>
                   <p className="text-gray-500 text-xs uppercase font-bold">ឯកទេស (Major)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900 break-words">{currentMajor}</p>
               </div>
               <div className="bg-white p-1 rounded border border-blue-200 shadow-sm print:border-none print:shadow-none print:p-0">
                   <p className="text-gray-500 text-xs uppercase font-bold text-center">ឈ្មោះក្រុម (Team)</p>
                   <p className="text-lg sm:text-xl font-bold text-teal-700 text-center">{currentTeam}</p>
               </div>
           </div>

           {/* Row 2: Students, Shift, Year Level, Term, Date */}
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
               <div className="md:col-span-1 col-span-2">
                   <p className="text-gray-500 text-xs uppercase font-bold">កាលបរិច្ឆេទ (Date)</p>
                   <p className="text-sm sm:text-base font-bold text-gray-900">{currentDate}</p>
               </div>
           </div>
        </div>

        {/* --- DETAILED EVALUATION TABLE --- */}
        <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse border border-gray-300 text-sm font-sans">
              <thead>
                <tr className="bg-gray-100 text-center font-bold text-gray-700">
                  <th className="border border-gray-300 p-2 w-10">ល.រ</th>
                  <th className="border border-gray-300 p-2 text-left">ខ្លឹមសារសំណួរ (Indicators)</th>
                  {/* Reordered: E D C B A */}
                  <th className="border border-gray-300 p-2 w-10" title="Strongly Disagree">E</th>
                  <th className="border border-gray-300 p-2 w-10" title="Disagree">D</th>
                  <th className="border border-gray-300 p-2 w-10" title="Neutral">C</th>
                  <th className="border border-gray-300 p-2 w-10" title="Agree">B</th>
                  <th className="border border-gray-300 p-2 w-10" title="Strongly Agree">A</th>
                  {/* Score per Question & Merged Total per Category */}
                  <th className="border border-gray-300 p-2 w-20">Score</th>
                  <th className="border border-gray-300 p-2 w-24">Total</th>
                  {/* Grade column REMOVED from Body */}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                   // Calculate category average score for merged column
                   const catStat = questionStats.find(qs => qs.title === category.title);
                   const categoryPercentage = catStat ? (catStat.subtotal / 5) * 100 : 0;
                   // const grade = getGrade(categoryPercentage); // Grade not needed in body
                   
                   return (
                  <React.Fragment key={category.id}>
                    {/* Category Header Row */}
                    <tr className="bg-blue-50 font-bold">
                      <td className="border border-gray-300 p-2 text-center text-gray-700 bg-gray-200" colSpan={9}>
                        {category.title}
                      </td>
                    </tr>
                    {category.questions.map((q, index) => {
                      const { counts, totalVotes, percentageScore } = getQuestionDetailStats(q.id);
                      
                      return (
                        <tr key={q.id} className="hover:bg-gray-50">
                           <td className="border border-gray-300 p-2 text-center text-gray-500">{index + 1}</td>
                           <td className="border border-gray-300 p-2">{q.text}</td>
                           {/* Counts Reordered: E(1), D(2), C(3), B(4), A(5) */}
                           <td className="border border-gray-300 p-2 text-center">{counts[1] || '-'}</td>
                           <td className="border border-gray-300 p-2 text-center">{counts[2] || '-'}</td>
                           <td className="border border-gray-300 p-2 text-center">{counts[3] || '-'}</td>
                           <td className="border border-gray-300 p-2 text-center">{counts[4] || '-'}</td>
                           <td className="border border-gray-300 p-2 text-center">{counts[5] || '-'}</td>
                           
                           {/* Score per question (Percentage) */}
                           <td className="border border-gray-300 p-2 text-center font-bold text-blue-600">
                                {totalVotes > 0 ? percentageScore.toFixed(2) : '-'}
                           </td>
                           
                           {/* MERGED TOTAL COLUMN (Category Score) - Middle Alignment */}
                           {index === 0 && (
                               <td 
                                 className="border border-gray-300 p-0 text-center font-bold align-middle bg-white" 
                                 rowSpan={category.questions.length} // Span all questions in this category
                                 style={{ verticalAlign: 'middle' }}
                               >
                                   <div className="text-base text-teal-700 font-bold sticky top-1/2">
                                       {categoryPercentage.toFixed(2)}
                                   </div>
                               </td>
                           )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
                })}
                {/* Grand Total Row (Footer) */}
                <tr className="bg-teal-50 font-bold border-t-2 border-teal-500">
                    {/* Colspan 7: No, Ind, E, D, C, B, A */}
                    <td className="border border-gray-300 p-3 text-right text-teal-800 font-moul" colSpan={7}>
                        Total Score
                    </td>
                    {/* Score Column: Show Total Score Value */}
                    <td className="border border-gray-300 p-3 text-center text-lg text-teal-700">
                        {finalPercentage.toFixed(2)}
                    </td>
                    {/* Total Column: Show Grade */}
                    <td className="border border-gray-300 p-3 text-center text-lg text-black bg-yellow-100">
                       {getGrade(finalPercentage)}
                    </td>
                </tr>
              </tbody>
            </table>
        </div>

        {/* --- LEGEND (New) --- */}
        <div className="mb-8 border border-gray-200 rounded p-4 bg-white shadow-sm">
             <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-bold">
                <span className="font-moul text-gray-800">សម្គាល់ (Legend):</span>
                <span className="text-red-500">A=90-100</span>
                <span className="text-orange-500">B=80-89</span>
                <span className="text-yellow-600">C=65-79</span>
                <span className="text-blue-600">D=50-64</span>
                <span className="text-gray-600">E=&lt;50</span>
             </div>
        </div>

        {/* --- END TABLE --- */}

        {/* SIGNATURE BLOCK */}
        <div className="mt-5 break-inside-avoid print:block">
        
          {/* Top Right: Data Collector */}
          <div className="flex justify-end text-right text-sm font-sans text-black leading-loose">
            <div className="flex flex-col items-center">
              <p>ថ្ងៃ..........................ខែ................ឆ្នាំ....................... ព.ស ២៥៦......</p>
              <p className="mb-2">....................................ថ្ងៃទី............ខែ..............ឆ្នាំ២០.......</p>
              <p className="font-moul mt-1">អ្នកស្រង់ទិន្នន័យ</p>
            </div>
          </div>
        
          {/* Middle Center: Study Office Head */}
          <div className="mt-1 flex justify-center text-center text-sm font-sans text-black leading-loose">
            <div className="flex flex-col items-center">
              <p className="mb-1">បានឃើញ និងផ្ទៀងផ្ទាត់ត្រឹមត្រូវ</p>
              <p>ថ្ងៃ..........................ខែ................ឆ្នាំ....................... ព.ស ២៥៦......</p>
              <p className="mb-2">....................................ថ្ងៃទី............ខែ..............ឆ្នាំ២០.......</p>
              <p className="font-moul mt-1">ប្រធានការិយាល័យសិក្សា</p>
            </div>
          </div>
        
          {/* Bottom Left: Branch Director */}
          <div className="ml-15 text-left text-sm font-sans text-black leading-loose">
            <p className="mb-2">បានត្រួតពិនិត្យ និងឯកភាព</p>
            <p className="font-moul text-lg">នាយកសាខា</p>
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
