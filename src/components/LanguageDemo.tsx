import React from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, type SupportedLanguage } from '../i18n/types';

const LanguageDemo: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = LANGUAGES[i18n.language as SupportedLanguage];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {t('demo.welcome')}
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          {t('demo.description')}
        </p>
      </div>

      {/* Current Language Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          {t('demo.currentLanguage')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-md p-4 border">
            <div className="text-sm text-gray-500 mb-1">Code</div>
            <div className="font-mono text-lg">{currentLang?.code}</div>
          </div>
          <div className="bg-white rounded-md p-4 border">
            <div className="text-sm text-gray-500 mb-1">Native Name</div>
            <div className="text-lg font-medium">{currentLang?.nativeName}</div>
          </div>
          <div className="bg-white rounded-md p-4 border">
            <div className="text-sm text-gray-500 mb-1">Direction</div>
            <div className="text-lg">
              {currentLang?.isRTL ? 'RTL (Right-to-Left)' : 'LTR (Left-to-Right)'}
            </div>
          </div>
        </div>
      </div>

      {/* RTL Test Section */}
      <div className="bg-gray-50 rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {t('demo.rtlTest')}
        </h3>
        <div className="space-y-4">
          <div className="bg-white rounded-md p-4 border">
            <div className="text-sm text-gray-500 mb-2">Sample Text</div>
            <div className="text-lg leading-relaxed">
              {i18n.language === 'he' && (
                <span>זהו טקסט לדוגמה בעברית. הוא אמור להופיע מימין לשמאל כשמשתמשים בעברית.</span>
              )}
              {i18n.language === 'ru' && (
                <span>Это пример текста на русском языке. Он должен отображаться слева направо.</span>
              )}
              {i18n.language === 'en' && (
                <span>This is sample text in English. It should display from left to right.</span>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-md p-4 border">
            <div className="text-sm text-gray-500 mb-2">Mixed Content</div>
            <div className="text-lg leading-relaxed space-y-2">
              <div>Numbers: 123456789</div>
              <div>Email: test@example.com</div>
              <div>URL: https://example.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Translation Examples */}
      <div className="bg-green-50 rounded-lg border border-green-200 p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-3">
          Translation Examples
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-md p-4 border">
            <div className="text-sm text-gray-500 mb-1">Loading</div>
            <div className="text-lg">{t('common.loading')}</div>
          </div>
          <div className="bg-white rounded-md p-4 border">
            <div className="text-sm text-gray-500 mb-1">Error</div>
            <div className="text-lg">{t('common.error')}</div>
          </div>
          <div className="bg-white rounded-md p-4 border">
            <div className="text-sm text-gray-500 mb-1">Success</div>
            <div className="text-lg">{t('common.success')}</div>
          </div>
        </div>
      </div>

      {/* Language List */}
      <div className="bg-purple-50 rounded-lg border border-purple-200 p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-3">
          Available Languages
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(LANGUAGES).map((lang) => (
            <div key={lang.code} className="bg-white rounded-md p-4 border">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">
                  {lang.code === 'ru' && '🇷🇺'}
                  {lang.code === 'en' && '🇺🇸'}  
                  {lang.code === 'he' && '🇮🇱'}
                </span>
                <div>
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-sm text-gray-500">{lang.name}</div>
                </div>
              </div>
              <div className="text-sm">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  lang.isRTL 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {lang.isRTL ? 'RTL' : 'LTR'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageDemo;