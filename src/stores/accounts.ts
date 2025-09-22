import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Ключ для localStorage, где хранятся аккаунты
const STORAGE_KEY = 'accounts_data'

/* Интерфейс аккаунта */
export interface Account {
  id: number
  labelRaw: string         // Исходная строка меток (разделитель — ;)
  label: { text: string }[] /*string[]*/          // Массив меток после разбиения labelRaw
  type: 'LDAP' | 'Local'   // Тип аккаунта
  login: string            // Логин
  password: string         // Пароль (если Local)
  isValid: boolean         // Статус валидности аккаунта
  errors?: {               // Объект с ошибками валидации по полям
    labelRaw?: boolean
    login?: boolean
    password?: boolean
  }
}

/* Хранение и управление списком аккаунтов */
export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])  // Список аккаунтов
  let idCounter = 1                   // Генератор уникальных id

  /* Загружает список аккаунтов из localStorage при инициализации */
  function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Account[]
        accounts.value = parsed
        // Обновляем idCounter, чтобы присваивать уникальные id и не переписывать существующие
        if (accounts.value.length > 0) {
          idCounter = Math.max(...accounts.value.map(acc => acc.id)) + 1
        }
      } catch (e) {
        console.error('Ошибка при загрузке данных аккаунтов из localStorage', e)
      }
    }
  }

  /* Сохраняет текущий список аккаунтов в localStorage */
  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.value))
  }

  // Автоматическое сохранение в localStorage при изменении accounts (глубокий watch)
  watch(accounts, () => {
    saveToStorage()
  }, { deep: true })

  /* Добавляет новый пустой аккаунт с уникальным id и типом Local по умолчанию */
  function addAccount() {
    accounts.value.push({
      id: idCounter++,
      labelRaw: '',
      label: [],
      type: 'Local',
      login: '',
      password: '',
      isValid: false,
      errors: {}
    })
  }

  /* Удаляет аккаунт по переданному id */
  function removeAccount(id: number) { // id - уникальный идентификатор аккаунта
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value.splice(index, 1)
    }
  }

  /* Обновляет данные аккаунта по индексу */
  function updateAccount(index: number, data: Partial<Account>) { // index - индекс аккаунта в массиве, data - частичный объект с новыми данными для обновления
    const account = accounts.value[index]
    if (!account) return

    if ('labelRaw' in data) {
      // Очистка и ограничение длины исходной строки labelRaw
      const cleanedLabelRaw = data.labelRaw
        ?.split(';')            // разбиваем по точке с запятой
        .map(s => s.trim())     // убираем пробелы вокруг меток
        .filter(s => s.length > 0) // удаляем пустые метки
        .slice(0, 50)           // ограничиваем количество меток (до 50)
        .join(';') || ''

      // Обновляем свойства labelRaw и label
      account.labelRaw = cleanedLabelRaw
      account.label = cleanedLabelRaw.length > 0
      ? cleanedLabelRaw.split(';').map(item => ({ text: item.trim() }))
      : []
      // Удаляем labelRaw, чтобы избежать повторной обработки ниже
      delete data.labelRaw
    }

    // Вносим остальные обновления в аккаунт
    Object.assign(account, data)

    // Проверяем валидность аккаунта после изменений
    validateAccount(index)
  }

  /* Валидирует поля аккаунта */
  function validateAccount(index: number) { // index - индекс аккаунта
    const account = accounts.value[index]
    if (!account) return

    const errors: {
      labelRaw?: boolean
      login?: boolean
      password?: boolean
    } = {}

    // Проверяем длину исходной строки меток (labelRaw)
    errors.labelRaw = !(account.labelRaw.length > 0 && account.labelRaw.length <= 50)

    // Проверяем длину логина
    errors.login = !(account.login.length > 0 && account.login.length <= 100)

    // Проверяем пароль в зависимости от типа аккаунта
    errors.password =
      account.type === 'Local'
        ? !(account.password.length > 0 && account.password.length <= 100)
        : false  // для LDAP пароль не обязателен

    // Обновляем объект ошибок и статус валидности
    account.errors = errors
    account.isValid = !errors.labelRaw && !errors.login && !errors.password
  }

  // Загружаем аккаунты из localStorage при инициализации стора
  loadFromStorage()

  // Экспортируем состояние и методы для работы с аккаунтами
  return {
    accounts,
    addAccount,
    removeAccount,
    updateAccount,
    validateAccount,
  }
})