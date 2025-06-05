import { useWordsStore, getStats } from '../store/wordsStore';
import { useTranslation } from 'react-i18next';
import type { FC } from 'react';

interface StatisticsProps {
 stats?: ReturnType<typeof getStats>;
}

const Statistics: FC<StatisticsProps> = ({ stats }) => {
 const { t } = useTranslation();
 const words = useWordsStore((state) => state.words);
 const computedStats = stats ?? getStats(words);
 const total = computedStats.total;
 const learned = computedStats.learned;
 const remaining = computedStats.remaining;
 const needReview = computedStats.needReview || 0;

 // Calculate progress percentage
 const progressPercent = total > 0 ? Math.round((learned / total) * 100) : 0;

 return (
   <div className="w-full max-w-xl mx-auto px-2 sm:px-0">
     <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
       <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-3">{t('statistics.title')}</h3>
       <div className="grid grid-cols-3 gap-2 mb-4">
         <div className="text-center p-1 sm:p-2 bg-blue-50 rounded-md">
           <div className="text-xl sm:text-2xl font-semibold text-blue-600">{total}</div>
           <div className="text-xs text-gray-600">{t('statistics.totalWords')}</div>
         </div>
         <div className="text-center p-1 sm:p-2 bg-green-50 rounded-md">
           <div className="text-xl sm:text-2xl font-semibold text-green-600">{learned}</div>
           <div className="text-xs text-gray-600">{t('statistics.learnedWords')}</div>
         </div>
         <div className="text-center p-1 sm:p-2 bg-yellow-50 rounded-md">
           <div className="text-xl sm:text-2xl font-semibold text-yellow-600">{remaining}</div>
           <div className="text-xs text-gray-600">{t('statistics.remainingWords')}</div>
         </div>
       </div>
       {needReview > 0 && (
         <div className="text-center p-2 bg-orange-50 rounded-md mb-4">
           <div className="text-lg font-semibold text-orange-600">{needReview}</div>
           <div className="text-xs text-gray-600">{t('statistics.needReview')}</div>
         </div>
       )}
       <div className="mb-1 flex justify-between text-xs text-gray-600">
         <span>{t('statistics.learningProgress')}</span>
         <span>{progressPercent}%</span>
       </div>
       <div className="w-full bg-gray-200 rounded-full h-2">
         <div
           className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-in-out"
           style={{ width: `${progressPercent}%` }}
         ></div>
       </div>
     </div>
   </div>
 );
};

export default Statistics;