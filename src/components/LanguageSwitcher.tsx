import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { LANGUAGES, type SupportedLanguage } from '../i18n/types';

// Flag components using emoji flags
const FlagIcon: React.FC<{ languageCode: SupportedLanguage; className?: string }> = ({
  languageCode,
  className = "w-5 h-5"
}) => {
  const flags = {
    ru: '🇷🇺',
    en: '🇺🇸',
    he: '🇮🇱'
  };
  
  return (
    <span
      className={`inline-block text-base flag-icon ${className}`}
      role="img"
      aria-label={`${languageCode} flag`}
    >
      {flags[languageCode]}
    </span>
  );
};

// Compact version for mobile
const CompactLanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isChanging, setIsChanging] = React.useState(false);
  
  const handleLanguageChange = (language: SupportedLanguage) => {
    setIsChanging(true);
    i18n.changeLanguage(language);
    // Save to localStorage
    localStorage.setItem('preferred-language', language);
    
    // Reset animation state
    setTimeout(() => setIsChanging(false), 300);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Select
            value={i18n.language as SupportedLanguage}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger className={`w-16 h-8 p-1 border-gray-200 hover:border-gray-300 transition-colors ${isChanging ? 'language-switching' : ''}`}>
              <SelectValue>
                <FlagIcon languageCode={i18n.language as SupportedLanguage} className="w-4 h-4" />
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[160px]">
              {Object.values(LANGUAGES).map((lang) => (
                <SelectItem 
                  key={lang.code} 
                  value={lang.code}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <FlagIcon languageCode={lang.code} className="w-4 h-4" />
                  <span className="font-medium">{lang.nativeName}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{t('languageSwitcher.tooltip')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Full version for desktop
const FullLanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isChanging, setIsChanging] = React.useState(false);
  
  const handleLanguageChange = (language: SupportedLanguage) => {
    setIsChanging(true);
    i18n.changeLanguage(language);
    // Save to localStorage
    localStorage.setItem('preferred-language', language);
    
    // Reset animation state
    setTimeout(() => setIsChanging(false), 300);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 hidden md:block">
        {t('languageSwitcher.title')}:
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Select
              value={i18n.language as SupportedLanguage}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className={`w-40 h-9 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-all duration-200 ease-in-out hover:shadow-sm ${isChanging ? 'language-switching' : ''}`}>
                <SelectValue className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <FlagIcon languageCode={i18n.language as SupportedLanguage} />
                    <span className="font-medium">
                      {LANGUAGES[i18n.language as SupportedLanguage]?.nativeName}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-[180px] border-gray-200 shadow-lg">
                {Object.values(LANGUAGES).map((lang) => (
                  <SelectItem 
                    key={lang.code} 
                    value={lang.code}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 transition-colors duration-150"
                  >
                    <FlagIcon languageCode={lang.code} />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{lang.nativeName}</span>
                      <span className="text-xs text-gray-500">{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-800 text-white text-xs">
            <p>{t('languageSwitcher.tooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// Main component with responsive design
const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { i18n } = useTranslation();

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as SupportedLanguage;
    if (savedLanguage && savedLanguage !== i18n.language && Object.keys(LANGUAGES).includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  // Update document direction for RTL languages
  useEffect(() => {
    const currentLang = LANGUAGES[i18n.language as SupportedLanguage];
    if (currentLang) {
      document.documentElement.dir = currentLang.isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLang.code;
    }
  }, [i18n.language]);

  if (compact) {
    return <CompactLanguageSwitcher />;
  }

  return <FullLanguageSwitcher />;
};

export default LanguageSwitcher;