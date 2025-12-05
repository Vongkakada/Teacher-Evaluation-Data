import { Submission, TeacherInfo } from '../types';
import { GOOGLE_SHEETS_SCRIPT_URL } from '../constants';

// Extended interface to include extra fields for the Sheet
interface SheetSubmission extends Submission {
  subject?: string;
  room?: string;
  shift?: string;
  term?: string;
  major?: string;
  yearLevel?: string;
  sheetName?: string; // Explicitly send target sheet name
}

export const saveSubmission = async (submission: SheetSubmission): Promise<boolean> => {
  if (GOOGLE_SHEETS_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE')) {
    console.warn('Google Script URL not set. Saving to localStorage for demo.');
    saveToLocal(submission);
    return true;
  }

  // Calculate dynamic Sheet Name: "Term X (Mon-Year)"
  const date = new Date(submission.timestamp);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthYear = `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  
  // Clean term name just in case
  const termName = submission.term || 'General';
  const targetSheetName = `${termName} (${monthYear})`;

  const finalPayload: SheetSubmission = {
    ...submission,
    sheetName: targetSheetName
  };

  console.log("Preparing to send data to Google Sheet:", finalPayload);

  try {
    // We use "Content-Type": "text/plain;charset=utf-8" to force a "Simple Request".
    // This avoids CORS preflight issues with Google Scripts.
    await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(finalPayload),
      mode: 'no-cors', 
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    console.log("Request sent successfully (Note: no-cors mode does not return response content).");
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
   // Only clear local storage
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
export const setPublicLinkStatus = (teacherName: string, isActive: boolean) => {
    const key = `public_link_status_${teacherName}`;
    localStorage.setItem(key, JSON.stringify(isActive));
};

export const getPublicLinkStatus = (teacherName: string): boolean => {
    const key = `public_link_status_${teacherName}`;
    const status = localStorage.getItem(key);
    return status ? JSON.parse(status) : false; // Default is closed
};