import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../config/openrouter';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WordSuggestions } from './WordSuggestions';
import { useToast } from '../hooks/use-toast';
import { useWordsStore } from '../store/wordsStore';

 


const WordInput: React.FC = () => {
  const { t } = useTranslation();
  const startBackgroundWordProcessing = useWordsStore(state => state.startBackgroundWordProcessing);
  const { toast } = useToast();

  // Adapter for toast to map 'destructive' to 'error' and filter allowed variants
  const toastAdapter = (opts: { title: string; description: string; variant?: string }) => {
    const allowedVariants = [
      'default', 'success', 'error', 'info', 'warning', 'neutral',
      'primary', 'secondary', 'accent', 'successAlt', 'errorAlt',
      'infoAlt', 'warningAlt', 'neutralAlt', 'primaryAlt', 'secondaryAlt', 'accentAlt'
    ] as const;
    type AllowedVariant = typeof allowedVariants[number];
    
    let mappedVariant: AllowedVariant | undefined = undefined;
    if (opts.variant === 'destructive') {
      mappedVariant = 'error';
    } else if (opts.variant && allowedVariants.includes(opts.variant as AllowedVariant)) {
      mappedVariant = opts.variant as AllowedVariant;
    }
    toast({ ...opts, variant: mappedVariant });
  };
  const draftInputText = useWordsStore(state => state.draftInputText);
  const setDraftInputText = useWordsStore(state => state.setDraftInputText);
  const clearDraftInputText = useWordsStore(state => state.clearDraftInputText);
  const [error, setError] = useState<string | null>(null);
  const [importedWordsText, setImportedWordsText] = useState<string | null>(null);

  // Check for imported words from Settings
  useEffect(() => {
    const importedWords = localStorage.getItem('importedWords');
    if (importedWords) {
      setImportedWordsText(importedWords);
    }
  }, []);

  const handleImportWords = () => {
    if (importedWordsText) {
      setDraftInputText(importedWordsText);
      localStorage.removeItem('importedWords');
      setImportedWordsText(null);
      toast({
        title: t('wordInput.importSuccess'),
        description: t('wordInput.importSuccessDescription'),
      });
    }
  };

  const handleBackgroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftInputText.trim()) return;

    const apiKey = localStorage.getItem('openRouterApiKey') || DEFAULT_OPENROUTER_API_KEY;
    const model = localStorage.getItem('openRouterModel') || DEFAULT_OPENROUTER_MODEL;
    
    if (!apiKey || !model || apiKey === "YOUR_DEFAULT_API_KEY_HERE" || model === "YOUR_DEFAULT_MODEL_ID_HERE") {
      setError(t('wordInput.apiNotConfigured'));
      return;
    }

    try {
      await startBackgroundWordProcessing(draftInputText, toastAdapter);
      clearDraftInputText();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('wordInput.processingError'));
    }
  };


  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault(); // Prevent default paste behavior
    const paste = e.clipboardData.getData('text');
    setDraftInputText(paste);
  };

  const sampleText = `שלום
תודה רבה
ספר טוב
ללמוד
ללכת
לאכול
לשתות
לדבר
`;

  return (
    <div className="w-full mx-auto mt-6">
      {importedWordsText && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 mb-2">{t('wordInput.importedWordsDetected')}</p>
          <button
            type="button"
            onClick={handleImportWords}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {t('wordInput.importWordsButton')}
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-800">{t('wordInput.title')}</h3>
        </div>

        <WordSuggestions
          onWordsReceived={(words) => {
            if (draftInputText.trim()) {
              setDraftInputText(`${draftInputText}\n${words}`);
            } else {
              setDraftInputText(words);
            }
          }}
          apiKey={localStorage.getItem('openRouterApiKey') || DEFAULT_OPENROUTER_API_KEY}
          modelIdentifier={localStorage.getItem('openRouterModel') || DEFAULT_OPENROUTER_MODEL}
        />

        <div>
          {error && (
            <div className="mb-3 p-3 bg-red-100 text-red-700 border border-red-400 rounded-md">
              <p className="font-semibold">{t('wordInput.errorTitle')}</p>
              <p>{error}</p>
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="wordInput" className="block text-sm font-medium text-gray-700 mb-1">
              {t('wordInput.instructions')}
            </label>
            <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                {t('wordInput.backgroundProcessingInfo')}
              </p>
            </div>
            <textarea
              id="wordInput"
              rows={6}
              className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={draftInputText}
              onChange={(e) => setDraftInputText(e.target.value)}
              onPaste={handlePaste}
              dir="auto" // Changed to auto to better support mixed LTR/RTL for instructions and RTL for Hebrew
              placeholder={t('wordInput.placeholder')}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                className="text-blue-500 hover:text-blue-700 whitespace-nowrap"
                onClick={() => {
                  setDraftInputText(sampleText);
                  setError(null); // Clear error when using sample
                }}
              >
                {t('wordInput.useSampleButton')}
              </button>
              <span className="text-gray-400">|</span>
              <button
                type="button"
                className="text-blue-500 hover:text-blue-700 whitespace-nowrap"
                onClick={() => {
                  clearDraftInputText();
                  setError(null); // Clear error when clearing input
                }}
              >
                {t('wordInput.clearButton')}
              </button>
            </div>

            <div className="w-full sm:w-auto">
              <button
                type="button"
                onClick={handleBackgroundSubmit}
                className="w-full sm:w-auto py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={!draftInputText.trim()}
              >
                {t('wordInput.addWordsButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordInput;
