import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { LANGUAGES, type SupportedLanguage } from '../i18n/types';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Language:</span>
      <Select
        value={i18n.language as SupportedLanguage}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(LANGUAGES).map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Demo translation */}
      <div className="ml-4 text-sm text-gray-600">
        {t('common.loading')} | {t('common.error')} | {t('common.success')}
      </div>
    </div>
  );
}