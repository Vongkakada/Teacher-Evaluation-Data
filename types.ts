export enum RatingValue {
  StronglyDisagree = 1,
  Disagree = 2,
  Neutral = 3,
  Agree = 4,
  StronglyAgree = 5,
}

export interface Question {
  id: string;
  text: string;
}

export interface Category {
  id: string;
  title: string;
  questions: Question[];
}

// A single student's submission
export interface Submission {
  id: string; // UUID
  timestamp: number;
  ratings: Record<string, number>; // questionId -> RatingValue
  comment: string;
  teacherName: string;
  // New fields for filtering
  term?: string;
  subject?: string;
  room?: string;
  shift?: string;
}

export interface TeacherInfo {
  name: string;
  subject: string;
  date: string;
  room: string;
  shift: string;
  term: string; // Added Term
  generation: string;
  year: string;
  semester: string;
}