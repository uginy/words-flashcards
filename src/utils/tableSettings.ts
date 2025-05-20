const TABLE_SETTINGS_KEY = 'hebrew-flashcards-table-settings';

interface TableSettings {
  pageSize: number;
}

const defaultSettings: TableSettings = {
  pageSize: 10
};

export const saveTableSettings = (settings: TableSettings): void => {
  try {
    localStorage.setItem(TABLE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving table settings:', error);
  }
};

export const loadTableSettings = (): TableSettings => {
  try {
    const data = localStorage.getItem(TABLE_SETTINGS_KEY);
    return data ? JSON.parse(data) : defaultSettings;
  } catch (error) {
    console.error('Error loading table settings:', error);
    return defaultSettings;
  }
};