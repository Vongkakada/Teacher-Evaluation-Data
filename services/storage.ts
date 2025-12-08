import { Submission, Teacher, TeacherInfo } from '../types';
import { API_BASE_URL, fetchData, saveData } from '../constants';

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
    const result = await saveData(finalPayload);
    
    if (result.result === 'success') {
      console.log("Data saved successfully to Google Sheets");
      return true;
    } else {
      console.error('Save failed:', result);
      return false;
    }
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ។ សូមព្យាយាមម្តងទៀត។ (Error saving data)');
    return false;
  }
};

// --- Function to get Teachers List (Returns string[]) ---
export const getTeachersFromSheet = async (): Promise<string[]> => {
  try {
    console.log("Fetching teachers from Netlify function...");
    const data = await fetchData('getTeachers');
    
    // The function returns a simple array of strings: ["Name1", "Name2"]
    if (Array.isArray(data)) {
      return data.map(item => item.toString().trim()).filter(n => n.length > 0);
    }
    
    return [];
  } catch (error) {
    console.error("Failed to fetch teachers:", error);
    return [];
  }
};

// --- Function to get Teams List from Sheet "Teams" (Header: Team) ---
export const getTeamsFromSheet = async (): Promise<string[]> => {
  try {
    console.log("Fetching teams from Netlify function...");
    const data = await fetchData('getTeams');
    
    if (Array.isArray(data)) {
      return data.map(item => {
        // Handle if returns object {Team: "Name"} or simple string "Name"
        if (typeof item === 'object') {
          return item.Team || item.team || Object.values(item)[0] || '';
        }
        return item.toString();
      }).map((t: string) => t.trim()).filter(t => t.length > 0);
    }
    
    return [];
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return [];
  }
};

export const getSubmissions = async (): Promise<Submission[]> => {
  try {
    console.log("Fetching submissions from Netlify function...");
    const rawData = await fetchData(); // No action parameter = get all data
    
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
    console.error('Error fetching submissions from Google Sheets:', error);
    return [];
  }
};

export const clearSubmissions = () => {
  localStorage.removeItem('teacher_eval_submissions');
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
