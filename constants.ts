import { Category, RatingValue } from './types';

// Web App URL សម្រាប់ភ្ជាប់ទៅ Google Sheets
export const GOOGLE_SHEETS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbweLMkgaCjMayMq0hLTYz9O_qFjI_WlVBRUWjPb2dLoD91qJQ2o_s19kW1gjhvLohu8HQ/exec";

export const TEACHER_INFO_DEFAULT = {
  name: 'ជឹម វុឌថា', // Default to first teacher
  subject: 'Academic Writing II',
  date: '22.11.2025',
  room: 'M03',
  shift: 'ព្រឹក',
  generation: '១៨',
  year: '២',
  semester: '១',
};

export const TEACHERS_LIST = [
  'ជឹម វុឌថា',
  'កន ជឿន',
  'នាង វឿន',
  'ឡេង សុកុល',
  'ស៊ឹម ឡឹមសាត',
  'ឈីម ឆេងហុង',
  'គឹម រ៉ាដា',
  'លឹម ប៊ុណ្ណាឡែន',
  'អ៊ឹម ភារិន្ទ',
  'មាស ធឿន',
  'សោម សាវឿន',
];

export const RATING_LABELS: Record<number, string> = {
  [RatingValue.StronglyAgree]: 'យល់ស្របទាំងស្រុង',
  [RatingValue.Agree]: 'យល់ស្រប',
  [RatingValue.Neutral]: 'គ្មានយោបល់',
  [RatingValue.Disagree]: 'មិនយល់ស្រប',
  [RatingValue.StronglyDisagree]: 'មិនយល់ស្របសោះ',
};

export const RATING_LETTERS: Record<number, string> = {
  [RatingValue.StronglyAgree]: 'A',
  [RatingValue.Agree]: 'B',
  [RatingValue.Neutral]: 'C',
  [RatingValue.Disagree]: 'D',
  [RatingValue.StronglyDisagree]: 'E',
};

export const EVALUATION_DATA: Category[] = [
  {
    id: 'teaching',
    title: '១. ការបង្រៀន (Teaching Methodology)',
    questions: [
      { id: 'q1', text: 'ការផ្ទេរចំណេះដឹងដល់និស្សិតបានច្បាស់លាស់' },
      { id: 'q2', text: 'ការពន្យល់មេរៀនបានច្បាស់លាស់ និងងាយយល់' },
      { id: 'q3', text: 'ការបង្រៀនតាមប្លង់មេរៀន ប៉ុន្តែមានភាពបត់បែនតាមស្ថានភាពជាក់ស្តែង' },
      { id: 'q4', text: 'ការប្រើបច្ចេកទេសបង្រៀនល្អៗដែលធ្វើឱ្យនិស្សិតយកចិត្តទុកដាក់ និងសកម្មក្នុងការសិក្សា' },
      { id: 'q5', text: 'ការប្រើសម្ភារៈបង្រៀនគ្រប់គ្រាន់ និងសមស្របដើម្បីបង្កើនប្រសិទ្ធភាពនៃការបង្រៀន' },
      { id: 'q6', text: 'ការប្រើពេលវេលាសមស្រប សម្រាប់ការពន្យល់មេរៀននិងសម្រាប់និស្សិតអនុវត្តដោយខ្លួនឯង' },
      { id: 'q7', text: 'ផ្តោតលើវិធីសាស្រ្តសិស្សមជ្ឈមណ្ឌល (Student-Centered)' },
      { id: 'q8', text: 'ការលើកទឹកចិត្តឱ្យនិស្សិតទាំងអស់ចូលរួមយ៉ាងសកម្មនៅក្នុងសកម្មភាពសិក្សាផ្សេងៗ' },
    ],
  },
  {
    id: 'management',
    title: '២. ការគ្រប់គ្រងថ្នាក់រៀន (Classroom Management)',
    questions: [
      { id: 'q9', text: 'ការត្រួតពិនិត្យដោយយកចិត្តទុកដាក់ចំពោះសកម្មភាពសិក្សារបស់និស្សិតគ្រប់រូប' },
      { id: 'q10', text: 'ការគ្រប់គ្រងវិន័យ និងសណ្តាប់ធ្នាប់ក្នុងថ្នាក់រៀនបានល្អ' },
      { id: 'q11', text: 'ការរក្សាបរិយាកាសសិក្សាល្អ ប្រកបដោយភាពស្ងប់ស្ងាត់ និងការគោរពគ្នា' },
    ],
  },
  {
    id: 'ethics',
    title: '៣. សីលធម៌ និងបុគ្គលិកលក្ខណៈ (Ethics & Personality)',
    questions: [
      { id: 'q12', text: 'ការគោរពពេលវេលាបង្រៀន (ចូល និងចេញទៀងទាត់)' },
      { id: 'q13', text: 'ការស្លៀកពាក់ និងការតុបតែងខ្លួនសមរម្យជាគ្រូបង្រៀន' },
      { id: 'q14', text: 'ការប្រើប្រាស់ពាក្យសម្តី និងឥរិយាបថសមរម្យដាក់និស្សិត' },
      { id: 'q15', text: 'មានទំនួលខុសត្រូវខ្ពស់ និងបង្ហាញគំរូល្អដល់និស្សិត' },
    ],
  },
  {
    id: 'communication',
    title: '៤. ទំនាក់ទំនងជាមួយនិស្សិត (Interaction with Students)',
    questions: [
      { id: 'q16', text: 'មានទំនាក់ទំនងល្អ និងស្និទ្ធស្នាលជាមួយនិស្សិត' },
      { id: 'q17', text: 'ការបើកឱកាសឱ្យនិស្សិតសួរ ឬបញ្ចេញមតិយោបល់' },
      { id: 'q18', text: 'ការទទួលយកសំណូមពរ និងការរិះគន់ក្នុងន័យស្ថាបនា' },
    ],
  },
  {
    id: 'assessment',
    title: '៥. ការវាយតម្លៃ (Evaluation/Assessment)',
    questions: [
      { id: 'q19', text: 'ការកំណត់លក្ខខណ្ឌនៃការដាក់ពិន្ទុបានច្បាស់លាស់' },
      { id: 'q20', text: 'ការដាក់កិច្ចការ និងវិញ្ញាសាប្រឡងស្របតាមខ្លឹមសារមេរៀន' },
      { id: 'q21', text: 'ការផ្តល់ពិន្ទុប្រកបដោយសុក្រឹតភាព យុត្តិធម៌ និងមិនលំអៀង' },
      { id: 'q22', text: 'ការកែកិច្ចការ និងផ្តល់យោបល់ត្រឡប់ (Feedback) ជូននិស្សិតទាន់ពេលវេលា' },
    ],
  },
];