import React, { useState, useEffect } from 'react';
import { Category, Submission, TeacherInfo } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Printer, Download, Share2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { getPublicLinkStatus, setPublicLinkStatus } from '../services/storage';

interface ResultsDashboardProps {
  submissions: Submission[];
  categories: Category[];
  teacherInfo: TeacherInfo;
  isPublicView?: boolean;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  submissions,
  categories,
  teacherInfo,
  isPublicView = false,
}) => {
  const totalStudents = submissions.length;
  
  // --- Share Link Logic ---
  const [isShareActive, setIsShareActive] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
     // Load share status when teacher changes
     setIsShareActive(getPublicLinkStatus(teacherInfo.name));
  }, [teacherInfo.name]);

  const handleToggleShare = () => {
      const newState = !isShareActive;
      setIsShareActive(newState);
      setPublicLinkStatus(teacherInfo.name, newState);
  };

  const getPublicLink = () => {
      const params = new URLSearchParams();
      params.set('mode', 'public_results');
      params.set('teacher', teacherInfo.name);
      return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(getPublicLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };
  // ------------------------

  if (totalStudents === 0 && !isPublicView) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500">មិនទាន់មានទិន្នន័យវាយតម្លៃនៅឡើយ។ (No submissions yet)</p>
      </div>
    );
  } else if (totalStudents === 0 && isPublicView) {
      return (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300">
             <p className="text-gray-500">មិនទាន់មានទិន្នន័យវាយតម្លៃសម្រាប់បង្ហាញទេ។</p>
        </div>
      );
  }

  // --- CSV Export Logic ---
  const handleDownloadCSV = () => {
    // 1. Prepare Headers
    const headers = [
      'Submission ID',
      'Date Submitted',
      'Teacher Name',
      'Subject',
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
    const rows = submissions.map(sub => {
      const rowData = [
        sub.id,
        new Date(sub.timestamp).toLocaleString('km-KH'),
        sub.teacherName,
        teacherInfo.subject, // Assuming filtered view context
        teacherInfo.room,
        teacherInfo.shift,
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
    // Add BOM (\ufeff) for Excel to recognize UTF-8 (Khmer characters)
    const csvContent = "\ufeff" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Evaluation_${teacherInfo.name}_${new Date().toISOString().split('T')[0]}.csv`);
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

      submissions.forEach(sub => {
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
  let finalGrade = 'E';
  if (finalScore >= 90) finalGrade = 'A';
  else if (finalScore >= 80) finalGrade = 'B';
  else if (finalScore >= 65) finalGrade = 'C';
  else if (finalScore >= 50) finalGrade = 'D';

  const chartData = questionStats.map(c => ({
    name: c.title.split('(')[0],
    score: c.subtotal
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-8 pb-20 print:p-0 print:space-y-4">
      
      {/* --- Share Control Panel (Admin Only) --- */}
      {!isPublicView && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 print:hidden transition-all">
              <div className="flex justify-between items-center">
                  <h3 className="text-gray-700 font-bold flex items-center gap-2">
                      <Share2 className="text-blue-600" size={20} />
                      ចែករំលែកលទ្ធផល (Public Share)
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
                      <p className="text-xs text-gray-500 mt-2">
                          * នៅពេលបិទ (Disable) អ្នកផ្សេងដែលមាន Link នេះនឹងមិនអាចចូលមើលលទ្ធផលបានទេ។
                      </p>
                  </div>
              )}
          </div>
      )}

      {/* Header Summary for Print/Admin */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none">
        
        {/* Print Header with Logo and New Name */}
        <div className="hidden print:flex flex-col items-center mb-8 border-b border-gray-300 pb-4">
             <img src="/logo.ico" alt="NUCK Logo" className="h-32 w-auto mb-2 object-contain" />
             <h1 className="text-xl font-moul text-black text-center">សាខាសាកលវិទ្យាល័យជាតិជាស៊ីមកំចាយមារ ខេត្តកំពង់ចាម</h1>
             <h2 className="text-sm font-bold text-gray-800 text-center uppercase tracking-wide">National University of Cheasim Kamchaymear, Kampong Cham Campus</h2>
             <p className="text-sm text-gray-600 font-bold mb-4 mt-2">Internal Quality Assurance Office</p>
             <h2 className="text-lg font-bold underline">លទ្ធផលវាយតម្លៃ (Evaluation Results)</h2>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 print:hidden gap-4">
            <h2 className="text-2xl font-moul text-gray-800">លទ្ធផលវាយតម្លៃ (Evaluation Results)</h2>
            
            {/* Action Buttons: Hidden in Public View */}
            {!isPublicView && (
            <div className="flex space-x-2">
                <button 
                    onClick={handleDownloadCSV} 
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white transition shadow-sm"
                >
                    <Download size={18} />
                    <span>Download CSV</span>
                </button>
                <button 
                    onClick={() => window.print()} 
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition"
                >
                    <Printer size={18} />
                    <span>Print Report</span>
                </button>
            </div>
            )}

            {/* Print Button for Public View */}
            {isPublicView && (
                <button 
                    onClick={() => window.print()} 
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition"
                >
                    <Printer size={18} />
                    <span>Print Report</span>
                </button>
            )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100 print:bg-white print:border-gray-300">
           <div>
             <p className="text-gray-500 text-xs uppercase font-bold">ចំនួននិស្សិត (Students)</p>
             <p className="text-2xl font-bold text-blue-900">{totalStudents}</p>
           </div>
           <div>
             <p className="text-gray-500 text-xs uppercase font-bold">ពិន្ទុសរុប (Total Score)</p>
             <p className="text-2xl font-bold text-blue-900">{finalScore.toFixed(2)}</p>
           </div>
           <div>
             <p className="text-gray-500 text-xs uppercase font-bold">និទ្ទេស (Grade)</p>
             <p className={`text-2xl font-bold ${finalGrade === 'A' ? 'text-green-600' : 'text-yellow-600'}`}>{finalGrade}</p>
           </div>
           <div>
             <p className="text-gray-500 text-xs uppercase font-bold">ស្ថានភាព (Status)</p>
             <p className="text-2xl font-bold text-gray-900">{finalGrade !== 'E' ? 'ជាប់ (Pass)' : 'ធ្លាក់ (Fail)'}</p>
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
                    <td colSpan={9} className="border border-gray-300 p-2 text-right pr-4">Total Score</td>
                    <td className="border border-gray-300 p-2 text-center">{finalScore.toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-center">{finalGrade}</td>
                </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 text-sm text-gray-600 border border-gray-200 p-3 rounded bg-gray-50">
            <span className="font-bold mr-2">សម្គាល់ (Legend):</span>
            <span className="mr-4 text-red-500">A=100-90</span>
            <span className="mr-4 text-orange-500">B=89-80</span>
            <span className="mr-4 text-yellow-600">C=79-65</span>
            <span className="mr-4 text-blue-500">D=64-50</span>
            <span className="mr-4 text-gray-500">E=49-0</span>
        </div>
      </div>

      {/* Charts Section (Hidden on Print) */}
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
                {submissions.filter(s => s.comment).map((s, i) => (
                    <div key={s.id} className="p-3 bg-gray-50 rounded border border-gray-100 text-sm italic text-gray-600">
                        "{s.comment}"
                    </div>
                ))}
                {submissions.filter(s => s.comment).length === 0 && (
                    <p className="text-gray-400 text-center mt-10">មិនមានមតិយោបល់ (No comments)</p>
                )}
             </div>
          </div>
      </div>
    </div>
  );
};