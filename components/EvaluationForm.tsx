//EvaluationForm.tsx
import React, { useState } from 'react';
import { Category, Submission, TeacherInfo, RatingValue } from '../types';
import { RATING_LABELS, RATING_LETTERS } from '../constants';
import { StarRating } from './StarRating';
import { Send, AlertCircle, CheckCircle2, Loader2, Info, Star, Heart, CheckCircle, RotateCcw } from 'lucide-react';

interface EvaluationFormProps {
  teacherInfo: TeacherInfo;
  categories: Category[];
  teachers: string[];
  onTeacherChange: (name: string) => void;
  onSubmit: (submission: Submission) => Promise<void>;
  isReadOnlyMode?: boolean;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  teacherInfo,
  categories,
  teachers,
  onTeacherChange,
  onSubmit,
  isReadOnlyMode = false,
}) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false); // New state for success view
  
  // Calculate total questions
  const totalQuestions = categories.reduce((acc, cat) => acc + cat.questions.length, 0);
  const answeredCount = Object.keys(ratings).length;
  const progressPercentage = (answeredCount / totalQuestions) * 100;

  const handleRate = (questionId: string, value: number) => {
    setRatings((prev) => ({ ...prev, [questionId]: value }));
  };

  const isComplete = answeredCount === totalQuestions;

  const handleSubmit = async () => {
    if (!isComplete) {
      alert('សូមមេត្តាដាក់ពិន្ទុគ្រប់សំណួរ! (Please answer all questions)');
      return;
    }

    setIsSubmitting(true);

    const submission: Submission = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ratings,
      comment,
      teacherName: teacherInfo.name,
      term: teacherInfo.term, // Include term
    };

    await onSubmit(submission);
    
    setIsSubmitting(false);
    setIsSubmitted(true); // Show Thank You page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- RENDER THANK YOU PAGE IF SUBMITTED ---
  if (isSubmitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 animate-fade-in text-center">
        
        {/* Animated Icon */}
        <div className="mb-6 relative">
            <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-25"></div>
            <div className="bg-green-100 p-6 rounded-full relative z-10">
                <CheckCircle className="w-24 h-24 text-green-600" strokeWidth={1.5} />
            </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-moul text-green-700 mb-4 leading-relaxed">
            សូមអរគុណសម្រាប់ការវាយតម្លៃ!
        </h1>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-md w-full mb-8">
             <div className="flex justify-center mb-3">
                <Heart className="w-10 h-10 text-red-500 fill-red-500 animate-pulse" />
             </div>
             <h2 className="text-xl font-bold text-gray-800 mb-2">Thank You!</h2>
             <p className="text-gray-600">
                ការចូលរួមរបស់អ្នកពិតជាមានតម្លៃសម្រាប់ការអភិវឌ្ឍគុណភាពអប់រំ។
             </p>
             <p className="text-sm text-gray-500 mt-2">
                Your feedback is valuable for improving our education quality.
             </p>
        </div>

        {/* Info Summary Card */}
        <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-600 max-w-md w-full border border-blue-100 mb-8">
            <div className="flex justify-between border-b border-blue-200 pb-2 mb-2">
                <span>សាស្ត្រាចារ្យ (Teacher):</span>
                <span className="font-bold text-blue-900">{teacherInfo.name}</span>
            </div>
            <div className="flex justify-between">
                <span>កាលបរិច្ឆេទ (Date):</span>
                <span>{new Date().toLocaleDateString('km-KH')}</span>
            </div>
        </div>

        <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-all shadow-md"
        >
            <RotateCcw size={18} />
            <span>វាយតម្លៃម្តងទៀត (Reload)</span>
        </button>

      </div>
    );
  }

  // --- RENDER FORM ---
  return (
    <div className="max-w-3xl mx-auto pb-32">
      {/* Header Info Card */}
      <div className={`rounded-lg shadow-sm border p-6 mb-6 ${isReadOnlyMode ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
        <h2 className="text-xl font-moul text-blue-800 mb-4 border-b pb-2 flex justify-between">
          <span>ព័ត៌មានទូទៅ (General Info)</span>
          {isReadOnlyMode && <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded font-sans">Locked</span>}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <span className="font-semibold block mb-1">សាស្ត្រាចារ្យ (Teacher):</span>
            {isReadOnlyMode ? (
              <div className="text-lg font-bold text-gray-900">{teacherInfo.name}</div>
            ) : (
              <select 
                value={teacherInfo.name}
                onChange={(e) => onTeacherChange(e.target.value)}
                className="w-full md:w-auto border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
              >
                {teachers.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">មុខវិជ្ជា:</span> 
            <span className={isReadOnlyMode ? "font-bold" : ""}>{teacherInfo.subject}</span>
          </div>
           {/* Display Term */}
          <div className="flex flex-col">
            <span className="font-semibold">វគ្គសិក្សា (Term):</span> 
            <span className="font-medium text-blue-700">{teacherInfo.term || 'N/A'}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="font-semibold">ឯកទេស (Major):</span> 
            <span className="">{teacherInfo.major || 'N/A'}</span>
          </div>

          <div className="flex flex-col">
            <span className="font-semibold">ឆ្នាំទី (Year):</span> 
            <span className="">{teacherInfo.year || 'N/A'}</span>
          </div>

          <div className="flex flex-col">
            <span className="font-semibold">កាលបរិច្ឆេទ:</span> 
            <span>{teacherInfo.date}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">បន្ទប់:</span> 
            <span>{teacherInfo.room}</span>
          </div>
        </div>
      </div>

      {/* RATING LEGEND / INSTRUCTIONS */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg mb-8 border border-blue-100 shadow-sm">
        <h3 className="font-moul text-sm text-blue-800 mb-3 flex items-center gap-2">
            <Info size={18} />
            ការកំណត់ពិន្ទុ (Rating Scale):
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
             {[1, 2, 3, 4, 5].map(val => (
                 <div key={val} className="flex items-center gap-2 bg-white p-2 rounded border border-blue-100 shadow-sm">
                     <div className="flex flex-col items-center justify-center bg-blue-100 w-8 h-8 rounded text-blue-700 font-bold text-xs flex-shrink-0">
                         {RATING_LETTERS[val]}
                         <div className="flex">
                            <Star size={8} className="fill-blue-700 text-blue-700" />
                         </div>
                     </div>
                     <span className="text-xs font-medium text-gray-700">
                         {RATING_LABELS[val]}
                     </span>
                 </div>
             ))}
        </div>
      </div>

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex justify-between items-center">
              <h3 className="font-moul text-lg text-blue-900">{category.title}</h3>
            </div>
            <div className="p-6 space-y-8">
              {category.questions.map((q, index) => {
                const isAnswered = ratings[q.id] !== undefined;
                return (
                  <div key={q.id} className={`border-b border-gray-100 last:border-0 pb-6 last:pb-0 transition-opacity ${!isAnswered ? 'opacity-100' : 'opacity-80'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-base font-medium text-gray-800">
                        {index + 1}. {q.text} <span className="text-red-500">*</span>
                      </p>
                      {isAnswered && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                    </div>
                    <StarRating
                      value={ratings[q.id]}
                      onChange={(val) => handleRate(q.id, val)}
                    />
                    {!isAnswered && (
                       <p className="text-xs text-red-400 mt-2">សូមជ្រើសរើសមួយ (Required)</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Comment Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block font-moul text-gray-800 mb-4 text-lg">សំណូមពរ ឬមតិយោបល់ផ្សេងៗ (Comments)</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={4}
            placeholder="សរសេរមតិយោបល់នៅទីនេះ..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4">
            
            {/* Progress Info */}
            <div className="w-full sm:w-auto flex-1">
                <div className="flex justify-between text-sm font-medium mb-1">
                    <span className={`${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
                        {isComplete ? 'បំពេញរួចរាល់ (All Set!)' : `បានឆ្លើយ ${answeredCount} ក្នុងចំណោម ${totalQuestions}`}
                    </span>
                    <span className="text-gray-500">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                        className={`h-2.5 rounded-full transition-all duration-300 ${isComplete ? 'bg-green-600' : 'bg-blue-600'}`} 
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isComplete || isSubmitting}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 font-bold py-3 px-8 rounded-lg text-white text-lg transition-all ${
                isComplete && !isSubmitting
                  ? 'bg-blue-700 hover:bg-blue-800 shadow-lg transform hover:-translate-y-1'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>កំពុងបញ្ជូន...</span>
                </>
              ) : (
                <>
                  {isComplete ? <Send className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <span>{isComplete ? 'បញ្ជូន (Submit)' : 'សូមបំពេញឱ្យអស់'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
