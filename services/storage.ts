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

// --- NEW: Function to get Teachers List ---
export const getTeachersFromSheet = async (): Promise<string[]> => {
  if (GOOGLE_SHEETS_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE')) {
    return [];
  }

  // Corresponds to the GAS code: if (action == "getTeachers") { ... }
  const targetUrl = `${GOOGLE_SHEETS_SCRIPT_URL}?action=getTeachers&t=${Date.now()}`;
  
  try {
     console.log("Fetching teachers from:", targetUrl);
     // Attempt direct fetch first
     const response = await fetch(targetUrl, { method: 'GET', redirect: 'follow' });
     
     if (response.ok) {
        const data = await response.json();
        // The GAS code returns a simple JSON Array: ["Teacher A", "Teacher B"]
        // We validate that it is indeed an array
        if (Array.isArray(data)) {
            // Filter out empty strings and trim whitespace
            const cleanList = data
                .map(item => String(item).trim())
                .filter(name => name.length > 0);
            
            // Deduplicate just in case
            return Array.from(new Set(cleanList));
        }
     }
  } catch (e) {
      console.warn("Direct teacher fetch failed, trying proxy...", e);
  }

  // Fallback to proxy if CORS fails (common with GAS Web Apps depending on deployment settings)
  try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const proxyResponse = await fetch(proxyUrl);
      if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          if (proxyData.contents) {
              const data = JSON.parse(proxyData.contents);
              if (Array.isArray(data)) {
                  const cleanList = data
                    .map((item: any) => String(item).trim())
                    .filter((name: string) => name.length > 0);
                  return Array.from(new Set(cleanList));
              }
          }
      }
  } catch (e) {
      console.error("Failed to fetch teachers list", e);
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
    // Corresponds to GAS code: else { // handleRequest(e) for GET }
    const targetUrl = `${GOOGLE_SHEETS_SCRIPT_URL}?action=read&t=${timestamp}`;

    try {
      // Attempt 1: Direct Fetch
      console.log("Attempting direct fetch...", targetUrl);
      const response = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow'
      });
      
      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
         // Special handling: Google Script returns HTML when permissions are wrong
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
      // If we detected HTML response specifically (permissions issue), notify user immediately
      if (directError.message === "HTML_RESPONSE") {
          alert("កំហុស៖ Google Script របស់អ្នកកំពុងបញ្ជូនមកនូវទំព័រ Login (HTML) មិនមែនទិន្នន័យទេ។\n\nដំណោះស្រាយ៖\n1. ចូលទៅកាន់ Google Apps Script -> Deploy -> Manage deployments\n2. ចុច Edit (រូបខ្មៅដៃ)\n3. ត្រង់ Version ត្រូវដូរដាក់ 'New Version' (សំខាន់!)\n4. 'Who has access' ត្រូវដាក់ 'Anyone'\n5. ចុច Deploy ម្តងទៀត។");
          throw directError;
      }

      console.warn("Direct fetch failed (CORS or Network). Switching to Proxy...", directError);
      
      // Attempt 2: Proxy Fetch (Using allorigins.win JSON Wrapper)
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
              if (typeof proxyData.contents === 'string' && proxyData.contents.trim().startsWith('<')) {
                  console.error("Proxy returned HTML instead of JSON.");
                  alert("កំហុស៖ Google Script កំពុងជាប់សិទ្ធិ (Access Denied)។\n\nសូមចូលទៅ Google Script, ចុច Deploy > Manage Deployments > Edit > ជ្រើសរើស 'New Version' > Deploy ម្ដងទៀត។");
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

    // Map the raw sheet data to our App's Submission Interface
    const formattedData: Submission[] = Array.isArray(rawData) ? rawData.map((row: any) => {
        
        // 1. Parse Ratings with Smart Swap Detection
        // GAS Code Bug: The GAS code provided swaps "Ratings (JSON)" and "Comment".
        // Ratings (JSON) column gets the Comment Text. Comment column gets the JSON string.
        let rawRatings = row['Ratings (JSON)'] || row['Ratings'] || row['ratings'];
        let rawComment = row['Comment'] || row['comment'] || '';
        
        let parsedRatings: Record<string, number> = {};

        // Heuristic: If 'Ratings' column looks like plain text and 'Comment' column looks like JSON, swap them.
        if (typeof rawRatings === 'string' && !rawRatings.trim().startsWith('{') && rawRatings.trim() !== '' &&
            typeof rawComment === 'string' && rawComment.trim().startsWith('{')) {
             console.warn("Detected swapped columns (Ratings/Comment). Auto-fixing...");
             const temp = rawRatings;
             rawRatings = rawComment;
             rawComment = temp;
        }

        if (typeof rawRatings === 'string' && rawRatings.trim() !== '') {
            try {
                parsedRatings = JSON.parse(rawRatings);
            } catch (e) {
                console.warn("Failed to parse ratings JSON for row:", row['ID'], e);
            }
        } else if (typeof rawRatings === 'object') {
            parsedRatings = rawRatings;
        }

        // 2. Parse Timestamp
        const dateVal = row['Date'] || row['timestamp'];
        const timestamp = dateVal ? new Date(dateVal).getTime() : Date.now();

        // 3. Construct the Submission Object
        return {
            id: row['ID'] || row['id'] || 'unknown',
            timestamp: timestamp,
            teacherName: row['Teacher'] || row['teacherName'] || 'Unknown',
            subject: row['Subject'] || row['subject'],
            term: row['Term'] || row['term'],
            major: row['Major'] || row['major'],
            yearLevel: (row['Year Level'] || row['yearLevel'] || row['year'] || '').toString(),
            room: row['Room'] || row['room'],
            shift: row['Shift'] || row['shift'],
            comment: rawComment || '', // Use the correctly identified comment
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