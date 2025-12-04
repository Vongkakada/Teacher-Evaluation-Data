import { Submission, TeacherInfo } from '../types';
import { GOOGLE_SHEETS_SCRIPT_URL } from '../constants';

// Extended interface to include extra fields for the Sheet
interface SheetSubmission extends Submission {
  subject?: string;
  room?: string;
  shift?: string;
}

export const saveSubmission = async (submission: SheetSubmission): Promise<boolean> => {
  if (GOOGLE_SHEETS_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE')) {
    console.warn('Google Script URL not set. Saving to localStorage for demo.');
    saveToLocal(submission);
    return true;
  }

  try {
    // We use "Content-Type": "text/plain;charset=utf-8" to force a "Simple Request".
    // This prevents the browser from sending an OPTIONS preflight request, which Google Apps Script doesn't handle.
    // 'no-cors' mode is cleaner for logging but means we can't read the response JSON. 
    // Since we trust the GAS to return 200 on success, this is acceptable for submission.
    await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(submission),
      mode: 'no-cors', 
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    return true;
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ។ សូមព្យាយាមម្តងទៀត។ (Error saving data)');
    return false;
  }
};

export const getSubmissions = async (): Promise<Submission[]> => {
  if (GOOGLE_SHEETS_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE')) {
    return getFromLocal();
  }

  try {
    const response = await fetch(GOOGLE_SHEETS_SCRIPT_URL);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
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

// --- Fallback Local Storage Logic ---
const getFromLocal = (): Submission[] => {
  const data = localStorage.getItem('teacher_eval_submissions');
  return data ? JSON.parse(data) : [];
};

const saveToLocal = (submission: Submission) => {
  const existing = getFromLocal();
  const updated = [...existing, submission];
  localStorage.setItem('teacher_eval_submissions', JSON.stringify(updated));
};

// --- Public Link Status Management ---
// We simulate a database of "active public links" using localStorage
export const setPublicLinkStatus = (teacherName: string, isActive: boolean) => {
    const key = `public_link_status_${teacherName}`;
    localStorage.setItem(key, JSON.stringify(isActive));
};

export const getPublicLinkStatus = (teacherName: string): boolean => {
    const key = `public_link_status_${teacherName}`;
    const status = localStorage.getItem(key);
    return status ? JSON.parse(status) : false; // Default is closed
};