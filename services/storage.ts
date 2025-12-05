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

  // Helper function to try fetching with fallback
  const fetchWithFallback = async () => {
    const timestamp = Date.now();
    const targetUrl = `${GOOGLE_SHEETS_SCRIPT_URL}?t=${timestamp}`;

    try {
      // Attempt 1: Direct Fetch
      console.log("Attempting direct fetch...");
      const response = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow'
      });
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
         throw new Error(`Direct fetch returned non-JSON content type: ${contentType}`);
      }
      
      if (!response.ok) {
        throw new Error(`Direct fetch failed with status: ${response.status}`);
      }
      return await response.json();

    } catch (directError) {
      console.warn("Direct fetch failed (CORS or Network). Switching to Proxy...", directError);
      
      // Attempt 2: Proxy Fetch (Using allorigins.win JSON Wrapper)
      // We use /get instead of /raw to ensure we get a valid JSON response even if the target returns HTML (like a 404 or Login page)
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const proxyResponse = await fetch(proxyUrl);
      if (!proxyResponse.ok) {
         throw new Error('Proxy fetch also failed');
      }
      
      const proxyData = await proxyResponse.json();
      
      // Check contents
      if (proxyData.contents) {
          try {
              // The contents should be the JSON string from the Sheet
              return JSON.parse(proxyData.contents);
          } catch (e) {
              // If parsing fails, check if it looks like HTML (often Google Login page)
              if (proxyData.contents.trim().startsWith('<')) {
                  console.error("Proxy returned HTML instead of JSON. This usually indicates the Google Script permissions are wrong.");
                  console.error("Please ensure the Web App is deployed as 'Execute as: Me' and 'Who has access: Anyone'.");
                  throw new Error("Deployment Error: Script returned HTML (Login Page?). Check 'Who has access' is set to 'Anyone'.");
              }
              throw e;
          }
      } else {
          throw new Error("Proxy returned empty content.");
      }
    }
  };

  try {
    const rawData = await fetchWithFallback();
    console.log("Raw Data fetched successfully:", rawData);

    // Map the raw sheet data to our App's Submission Interface
    const formattedData: Submission[] = Array.isArray(rawData) ? rawData.map((row: any) => {
        
        // 1. Parse Ratings: Handle "Ratings (JSON)" column which is a string
        let parsedRatings: Record<string, number> = {};
        const ratingString = row['Ratings (JSON)'] || row['Ratings'] || row['ratings'];
        
        if (typeof ratingString === 'string' && ratingString.trim() !== '') {
            try {
                parsedRatings = JSON.parse(ratingString);
            } catch (e) {
                console.warn("Failed to parse ratings JSON for row:", row['ID'], e);
            }
        } else if (typeof ratingString === 'object') {
            parsedRatings = ratingString;
        }

        // 2. Parse Timestamp
        const dateVal = row['Date'] || row['timestamp'];
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now();

        // 3. Construct the Submission Object using Keys from Sheet
        return {
            id: row['ID'] || row['id'] || 'unknown',
            timestamp: timestamp,
            teacherName: row['Teacher'] || row['teacherName'] || 'Unknown',
            subject: row['Subject'] || row['subject'],
            term: row['Term'] || row['term'],
            major: row['Major'] || row['major'],
            yearLevel: row['Year Level'] || row['yearLevel'] || row['year'],
            room: row['Room'] || row['room'],
            shift: row['Shift'] || row['shift'],
            comment: row['Comment'] || row['comment'] || '',
            ratings: parsedRatings
        };
    }) : [];

    console.log("Formatted Data for App:", formattedData);
    return formattedData;

  } catch (error) {
    console.error('Final Error fetching from Google Sheets:', error);
    // Return empty array instead of crashing, but allow UI to maybe show notification if we had a toast context
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