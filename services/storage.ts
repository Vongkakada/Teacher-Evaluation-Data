import { Submission, TeacherInfo } from '../types';
import { GOOGLE_SHEETS_SCRIPT_URL } from '../constants';

// Extended interface to include extra fields for the Sheet
interface SheetSubmission extends Submission {
  subject?: string;
  room?: string;
  shift?: string;
}

export const saveSubmission = async (submission: SheetSubmission): Promise<boolean> => {
  if (GOOGLE_SHEETS_SCRIPT_URL === 'PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE') {
    console.warn('Google Script URL not set. Saving to localStorage for demo.');
    saveToLocal(submission);
    return true;
  }

  try {
    // Send data to Google Sheet
    // Note: 'no-cors' mode is used because Google Scripts don't standardly return CORS headers for simple web apps.
    // However, 'no-cors' means we can't read the response. We assume success if no network error.
    // To properly read response, the Google Script needs special setup, but simple POST usually works.
    
    // Actually, for Google Apps Script Web App, we can use standard POST if we handle redirects, 
    // but the easiest way from client-side is sending as text/plain to avoid preflight checks.
    
    const response = await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(submission),
    });

    return true;
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ។ សូមព្យាយាមម្តងទៀត។');
    return false;
  }
};

export const getSubmissions = async (): Promise<Submission[]> => {
  if (GOOGLE_SHEETS_SCRIPT_URL === 'PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE') {
    return getFromLocal();
  }

  try {
    const response = await fetch(GOOGLE_SHEETS_SCRIPT_URL);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return [];
  }
};

export const clearSubmissions = () => {
   // Only clear local storage, we can't clear Google Sheets via this API easily without password protection logic
   localStorage.removeItem('teacher_eval_submissions');
};

// --- Fallback Local Storage Logic (Keep this just in case) ---
const getFromLocal = (): Submission[] => {
  const data = localStorage.getItem('teacher_eval_submissions');
  return data ? JSON.parse(data) : [];
};

const saveToLocal = (submission: Submission) => {
  const existing = getFromLocal();
  const updated = [...existing, submission];
  localStorage.setItem('teacher_eval_submissions', JSON.stringify(updated));
};
