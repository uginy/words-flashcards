#!/usr/bin/env bun

/**
 * Тест Google Drive API - проверка работы токенов и запросов
 */

import { getGoogleDriveServiceV2 } from '../src/services/googleDrive/GoogleDriveServiceV2';

async function testGoogleDrive() {
  console.log('🚀 Начинаем тест Google Drive...');
  
  const service = getGoogleDriveServiceV2();
  
  try {
    // Проверяем инициализацию
    console.log('📋 Инициализация сервиса...');
    await service.initialize();
    console.log('✅ Сервис инициализирован');
    
    // Проверяем авторизацию
    console.log('🔐 Проверяем авторизацию...');
    const isSignedIn = service.isSignedIn();
    console.log(`📊 Статус авторизации: ${isSignedIn ? 'Авторизован' : 'Не авторизован'}`);
    
    if (!isSignedIn) {
      console.log('⚠️ Для тестирования необходима авторизация через UI');
      return;
    }
    
    // Проверяем создание папки
    console.log('📁 Проверяем создание/поиск папки приложения...');
    try {
      const folderId = await service.ensureAppFolder();
      console.log(`✅ Папка приложения: ${folderId}`);
    } catch (error) {
      console.error('❌ Ошибка создания папки:', error);
    }
    
    // Тестируем загрузку данных
    console.log('☁️ Проверяем загрузку данных из облака...');
    try {
      const cloudData = await service.syncFromCloud();
      console.log('✅ Данные загружены:');
      console.log(`  - Слова: ${Array.isArray(cloudData.words) ? cloudData.words.length : 'нет'}`);
      console.log(`  - Диалоги: ${Array.isArray(cloudData.dialogs) ? cloudData.dialogs.length : 'нет'}`);
      console.log(`  - TTS конфиг: ${cloudData.ttsConfig ? 'есть' : 'нет'}`);
      console.log(`  - LLM конфиг: ${cloudData.llmConfig ? 'есть' : 'нет'}`);
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    }
    
    // Тестируем проверку конфликтов
    console.log('🔍 Проверяем конфликты...');
    try {
      const hasConflicts = await service.hasConflicts();
      console.log(`📊 Конфликты: ${hasConflicts ? 'есть' : 'нет'}`);
    } catch (error) {
      console.error('❌ Ошибка проверки конфликтов:', error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
  
  console.log('🏁 Тест завершен');
}

testGoogleDrive().catch(console.error);
