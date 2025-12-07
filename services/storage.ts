import { Submission, Teacher, TeacherInfo } from '../types';
import { GOOGLE_SHEETS_SCRIPT_URL } from '../constants';

// Extended interface to include extra fields for the Sheet
interface SheetSubmission extends Submission {
  subject?: string;
  room?: string;
  shift?: string;
  term?: string;
  major?: string;
  yearLevel?: string;
  team?: string;
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
  // Matches the logic in the user's GAS: "data.sheetName"
  const targetSheetName = `${termName} (${monthYear})`;

  const finalPayload: SheetSubmission = {
    ...submission,
    sheetName: targetSheetName
  };

  console.log("Preparing to send data to Google Sheet:", finalPayload);

  try {
    // We use "Content-Type": "text/plain;charset=utf-8" to force a "Simple Request".
    // This avoids CORS preflight issues with Google Scripts.
    // We append a timestamp to prevent caching issues.
    const url = `${GOOGLE_SHEETS_SCRIPT_URL}?t=${Date.now()}`;
    
    await fetch(url, {
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

// --- Function to get Teachers List (Returns string[]) ---
export const getTeachersFromSheet = async (): Promise<string[]> => {
  if (GOOGLE_SHEETS_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE')) {
    return [];
  }

  const targetUrl = `${GOOGLE_SHEETS_SCRIPT_URL}?action=getTeachers&t=${Date.now()}`;

  try {
     console.log("Fetching teachers from:", targetUrl);
     const response = await fetch(targetUrl, { method: 'GET', redirect: 'follow' });
     
     if (response.ok) {
        const data = await response.json();
        // The GAS returns a simple array of strings: ["Name1", "Name2"]
        if (Array.isArray(data)) {
            return data.map(item => item.toString().trim()).filter(n => n.length > 0);
        }
     }
  } catch (e) {
      console.warn("Direct teacher fetch failed, trying proxy...", e);
      // Fallback Proxy Logic
      try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
          const proxyResponse = await fetch(proxyUrl);
          if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              if (proxyData.contents) {
                  const data = JSON.parse(proxyData.contents);
                  if (Array.isArray(data)) {
                       return data.map((item: any) => item.toString().trim()).filter((n: string) => n.length > 0);
                  }
              }
          }
      } catch (proxyError) {
          console.error("Failed to fetch teachers via proxy", proxyError);
      }
  }
  return [];
};

// --- Function to get Teams List from Sheet "Teams" (Header: Team) ---
export const getTeamsFromSheet = async (): Promise<string[]> => {
  if (GOOGLE_SHEETS_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE')) {
    return [];
  }

  // Expects GAS to handle action=getTeams and return ["Team A", "Team B"]
  const targetUrl = `${GOOGLE_SHEETS_SCRIPT_URL}?action=getTeams&t=${Date.now()}`;
  
  try {
     console.log("Fetching teams from:", targetUrl);
     const response = await fetch(targetUrl, { method: 'GET', redirect: 'follow' });
     
     if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
             return data.map(item => {
                 // Handle if GAS returns object {Team: "Name"} or simple string "Name"
                 if (typeof item === 'object') {
                     return item.Team || item.team || Object.values(item)[0] || '';
                 }
                 return item.toString();
             }).map((t: string) => t.trim()).filter(t => t.length > 0);
        }
     }
  } catch (e) {
      console.warn("Direct teams fetch failed, trying proxy...", e);
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (proxyResponse.ok) {
            const proxyData = await proxyResponse.json();
            if (proxyData.contents) {
                const data = JSON.parse(proxyData.contents);
                if (Array.isArray(data)) {
                    return data.map((item: any) => {
                         if (typeof item === 'object') {
                             return item.Team || item.team || Object.values(item)[0] || '';
                         }
                         return item.toString();
                    }).map((t: string) => t.trim()).filter((t: string) => t.length > 0);
                }
            }
        }
      } catch (proxyError) { console.error("Proxy team fetch failed", proxyError); }
  }

  return [];
};

export const getSubmissions = async (): Promise<Submission[]> => {
  if (GOOGLE_SHEETS_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE')) {
    return getFromLocal();
  }

  // Helper function to try fetching with fallback
  const fetchWithFallback = async () => {
    // Append timestamp to bust cache
    const timestamp = Date.now();
    const targetUrl = `${GOOGLE_SHEETS_SCRIPT_URL}?action=read&t=${timestamp}`;

    try {
      // Attempt 1: Direct Fetch
      console.log("Attempting direct fetch...", targetUrl);
      const response = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow'
      });
      
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
         if (contentType.includes("text/html")) {
             throw new Error("HTML_RESPONSE");
         }
         throw new Error(`Direct fetch returned non-JSON content type: ${contentType}`);
      }
      
      if (!response.ok) {
        throw new Error(`Direct fetch failed with status: ${response.status}`);
      }
      return await response.json();

    } catch (directError: any) {
      if (directError.message === "HTML_RESPONSE") {
          alert("កំហុស៖ Google Script របស់អ្នកកំពុងបញ្ជូនមកនូវទំព័រ Login (HTML) មិនមែនទិន្នន័យទេ។");
          throw directError;
      }

      console.warn("Direct fetch failed (CORS or Network). Switching to Proxy...", directError);
      
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const proxyResponse = await fetch(proxyUrl);
      if (!proxyResponse.ok) throw new Error('Proxy fetch also failed');
      
      const proxyData = await proxyResponse.json();
      if (proxyData.contents) {
          try {
              return JSON.parse(proxyData.contents);
          } catch (e) {
              if (typeof proxyData.contents === 'string' && proxyData.contents.trim().startsWith('<')) {
                  throw new Error("Deployment Error: Script returned HTML.");
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

    const formattedData: Submission[] = Array.isArray(rawData) ? rawData.map((row: any) => {
        // MAPPING EXACTLY TO: ID, Date, Teacher, Subject, Major, Year Level, Team, Term, Room, Shift, Comment, Ratings (JSON)
        
        // Handle Ratings JSON
        let rawRatings = row['Ratings (JSON)'];
        let parsedRatings: Record<string, number> = {};

        if (typeof rawRatings === 'string' && rawRatings.trim() !== '') {
            try {
                parsedRatings = JSON.parse(rawRatings);
            } catch (e) {
                console.warn("Failed to parse ratings JSON", e);
            }
        } else if (typeof rawRatings === 'object') {
            parsedRatings = rawRatings;
        }

        // Handle Date/Timestamp
        const dateVal = row['Date'];
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now();

        return {
            id: row['ID'] || 'unknown',
            timestamp: timestamp,
            teacherName: row['Teacher'] || 'Unknown',
            subject: row['Subject'] || '',
            major: row['Major'] || '',
            yearLevel: (row['Year Level'] || '').toString(),
            // STRICTLY CAPTURE 'Team' from the row data
            team: row['Team'] || 'N/A', 
            term: row['Term'] || '',
            room: row['Room'] || '',
            shift: row['Shift'] || '',
            comment: row['Comment'] || '',
            ratings: parsedRatings
        };
    }) : [];

    return formattedData;

  } catch (error) {
    console.error('Final Error fetching from Google Sheets:', error);
    return [];
  }
};

export const clearSubmissions = () => {
   localStorage.removeItem('teacher_eval_submissions');
};

const getFromLocal = (): Submission[] => {
  const data = localStorage.getItem('teacher_eval_submissions');
  return data ? JSON.parse(data) : [];
};

const saveToLocal = (submission: Submission) => {
  const existing = getFromLocal();
  const updated = [...existing, submission];
  localStorage.setItem('teacher_eval_submissions', JSON.stringify(updated));
};

export const setPublicLinkStatus = (teacherName: string, isActive: boolean) => {
    const key = `public_link_status_${teacherName}`;
    localStorage.setItem(key, JSON.stringify(isActive));
};

export const getPublicLinkStatus = (teacherName: string): boolean => {
    const key = `public_link_status_${teacherName}`;
    const status = localStorage.getItem(key);
    return status ? JSON.parse(status) : false;
};