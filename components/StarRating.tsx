import React from 'react';
import { Star } from 'lucide-react';
import { RATING_LABELS, RATING_LETTERS } from '../constants';
import { RatingValue } from '../types';

interface StarRatingProps {
  value: number | undefined;
  onChange: (value: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-1 sm:space-x-3 justify-between sm:justify-start">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center w-14 sm:w-16 ${
              value === star
                ? 'bg-blue-100 ring-2 ring-blue-500 scale-105'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <Star
              className={`w-6 h-6 sm:w-8 sm:h-8 mb-1 ${
                value && star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
            <span className={`text-xs font-bold ${value === star ? 'text-blue-700' : 'text-gray-400'}`}>
              {RATING_LETTERS[star]}
            </span>
          </button>
        ))}
      </div>
      <div className="h-6 text-sm font-medium text-blue-600">
        {value ? RATING_LABELS[value] : ''}
      </div>
    </div>
  );
};
