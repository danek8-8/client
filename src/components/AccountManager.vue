<template>
  <div class="account-manager">
    <div class="header">
      <h2>Учетные записи</h2>
      <button @click="addAccount" class="add-btn" aria-label="Добавить учетную запись">+</button>
      <div class="status-message" v-if="saveMessage" :class="saveMessageType">
  {{ saveMessage }}
</div>
    </div>

    <div v-if="accounts.length > 0" class="hint" title="Подсказка по метке">
      Для указания нескольких меток для одной пары логин/пароль используйте разделитель ";"
    </div>

    <table v-if="accounts.length > 0" class="accounts-table" aria-label="Учетные записи таблица">
      <thead>
        <tr>
          <th>Метка</th>
          <th>Тип записи</th>
          <th>Логин</th>
          <th>Пароль</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(acc, index) in accounts" :key="acc.id" :class="{ invalid: !acc.isValid }">
          <td>
            <input
              class="text-input"
              v-model="acc.labelRaw"
              @blur="() => store.updateAccount(index, { labelRaw: acc.labelRaw })"
              :class="{ 'input-error': acc.errors?.labelRaw }"
              placeholder="Метка"
            />
          </td>
          <td>
            <select v-model="acc.type" @change="() => onTypeChange(index)">
              <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </td>
          <td>
            <input
            class="text-input"
            v-model="acc.login"
            @blur="() => store.updateAccount(index, { login: acc.login })"
            :class="{ 'input-error': acc.errors?.login }"
            placeholder="Логин"
            />
          </td>
          <td>
            <input
            class="text-input"
            v-model="acc.password"
            type="password"
            :disabled="acc.type === 'LDAP'"
            @blur="() => store.updateAccount(index, { password: acc.password })"
            :class="{ 'input-error': acc.errors?.password }"
            placeholder="Пароль"
            />
          </td>
          <td>
            <button @click="removeAccount(acc.id)" aria-label="Удалить учетную запись">
              Удалить учетную запись
            </button>
            <button @click="saveAccount(index)" aria-label="Сохранить учетную запись">
              Сохранить
            </button>
          </td>
          <div class="sub-hint" v-if="acc.labelRaw.length > 50"> Можно вводить не более 50 символов</div>
          <div class="sub-hint" v-if="acc.login.length > 100"> Можно вводить не более 100 символов</div>
          <div class="sub-hint" v-if="acc.password.length > 100"> Можно вводить не более 100 символов</div>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAccountsStore } from '@/stores/accounts'

// Инициализация стора аккаунтов
const store = useAccountsStore()

// Сообщение и тип сообщения при сохранении аккаунта
const saveMessage = ref('')
const saveMessageType = ref<'success' | 'error' | ''>('')

// Компьютед свойство для получения списка аккаунтов из стора
const accounts = computed(() => store.accounts)

// Опции для выбора типа аккаунта (LDAP или Локальная)
const typeOptions = [
  { value: 'LDAP', label: 'LDAP' },
  { value: 'Local', label: 'Локальная' },
]

// Отвечает за отображение таблицы с аккаунтами
const showTable = ref(false)

// Следим за изменением списка аккаунтов и отображаем таблицу, если есть аккаунты
watch(accounts, (newAccounts) => {
  showTable.value = newAccounts.length > 0
}, { immediate: true })


/* Добавляет новый аккаунт в стор и автоматически покажет таблицу */
function addAccount() {
  store.addAccount()
  // Таблица сама покажется благодаря watch на accounts
}

/* Удаляет аккаунт по id */
function removeAccount(id: number) { // id - идентификатор аккаунта для удаления
  store.removeAccount(id)
  // Таблица автоматически скроется, если список станет пустым (через watch)
}

/* Обработка изменения типа аккаунта по индексу */
function onTypeChange(index: number) { // index - индекс аккаунта в списке
  const acc = accounts.value[index]
  if (acc.type === 'LDAP') {
    // Сбрасываем пароль, т.к. для LDAP он не нужен
    store.updateAccount(index, { password: '' })
  }
  // Перезапускаем валидацию для обновленного аккаунта
  store.validateAccount(index)
}

/* Валидация аккаунта по индексу */
function validateAccount(index: number) { // index - индекс аккаунта
  store.validateAccount(index)
}

/* Сохранение данных аккаунта после валидации */
function saveAccount(index: number) { // index - индекс аккаунта в списке
  
  // Валидация аккаунта
  validateAccount(index)

  const acc = accounts.value[index]
  
  if (acc.isValid) {
    // При валидных данных обновляем аккаунт в хранилище
    store.updateAccount(index, {
      labelRaw: acc.labelRaw,
      login: acc.login,
      password: acc.password,
      type: acc.type,
    })
    saveMessage.value = 'Учетная запись успешно сохранена.'
    saveMessageType.value = 'success'
  } else {
    // При ошибках выводим предупреждение
    saveMessage.value = 'Ошибка сохранения: проверьте корректность данных.'
    saveMessageType.value = 'error'
  }

  // Очистка сообщения через 3 секунды
  setTimeout(() => {
    saveMessage.value = ''
    saveMessageType.value = ''
  }, 3000)
}

</script>

<style>
/* Общие настройки */
.account-manager {
  max-width: 900px;
  margin: 20px auto;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  font-size: 16px;
  color: #333;
  background-color: #fafafa;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
}

/* Заголовок с кнопкой плюс */
.header {
  display: flex;
  justify-content: space-between; /* Заголовок слева, кнопка справа */
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  font-weight: 700;
  font-size: 24px;
  margin: 0;
  color: #222;
}

.add-btn {
  background-color: #2e86de;
  border: none;
  color: white;
  font-size: 24px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.3s ease;
  box-shadow: 0 3px 6px rgba(46, 134, 222, 0.4);
}

.add-btn:hover {
  background-color: #1b4f72;
  box-shadow: 0 6px 12px rgba(27, 79, 114, 0.5);
}

.add-btn:focus {
  outline: 2px solid #145a96;
  outline-offset: 2px;
}

/* Подсказки */
.hint {
  background-color: #e8f0fe;
  border-left: 4px solid #2e86de;
  padding: 10px 16px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #2167d2;
  border-radius: 4px;
  user-select: none;
}

/* Статус сообщений об успехе/ошибке */
.status-message {
  margin-top: 10px;
  padding: 12px 16px;
  border-radius: 6px;
  font-weight: 600;
  max-width: 100%;
  box-sizing: border-box;
  user-select: none;
  animation: fadein 0.3s ease forwards;
}

.status-message.success {
  background-color: #e0f7e9;
  color: #256029;
  border: 1.5px solid #3a9966;
}

.status-message.error {
  background-color: #fceaea;
  color: #b02a37;
  border: 1.5px solid #d9534f;
}

/* Таблица */
.accounts-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.accounts-table thead tr {
  background-color: #2e86de;
  color: white;
  text-align: left;
  font-size: 15px;
  user-select: none;
}

.accounts-table th,
.accounts-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: middle;
}

/* Непарные строки — немного серые для удобства чтения */
.accounts-table tbody tr:nth-child(odd) {
  background-color: #f9fbfd;
}

/* Ошибки строки */
.invalid {
  background-color: #fcf0f0 !important;
}

/* Инпуты в таблице */
.text-input,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  font-size: 15px;
  border: 1.5px solid #bbb;
  border-radius: 4px;
  transition: border-color 0.3s ease;
  font-family: inherit;
}

.text-input:focus,
select:focus {
  border-color: #2e86de;
  outline: none;
  box-shadow: 0 0 6px rgba(46, 134, 222, 0.4);
}

.input-error {
  border-color: #d9534f !important;
  box-shadow: 0 0 6px rgba(217, 83, 79, 0.5);
}

/* Кнопки действий в таблице */
.accounts-table button {
  font-size: 14px;
  padding: 6px 12px;
  margin: 2px 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.accounts-table button:first-child {
  background-color: #d9534f;
  color: white;
  width: 100%;
}

.accounts-table button:first-child:hover {
  background-color: #b02a37;
}

.accounts-table button:last-child {
  background-color: #2e86de;
  color: white;
  width: 100%;
}

.accounts-table button:last-child:hover {
  background-color: #1b4f72;
}

.accounts-table button:focus {
  outline: 2px solid #145a96;
  outline-offset: 2px;
}

/* Подсказки под полями ввода — цвет и размер */
.sub-hint {
  font-size: 12px;
  color: #d9534f;
  margin-top: 4px;
  font-style: italic;
  user-select: none;
}

/* Анимация для сообщений */
@keyframes fadein {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Адаптив — не сужать слишком сильно */
@media (max-width: 768px) {
  .account-manager {
    padding: 16px 12px;
  }

  .accounts-table thead {
    display: none; /* скроем заголовок на мобильных */
  }

  .accounts-table tbody tr {
    display: block;
    margin-bottom: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 10px;
    background: white;
  }

  .accounts-table tbody tr td {
    display: flex;
    justify-content: space-between;
    padding: 6px 4px;
    border: none;
    font-size: 14px;
  }

  .accounts-table tbody tr td:before {
    content: attr(data-label);
    font-weight: 700;
    color: #2e86de;
    width: 110px;
    flex-shrink: 0;
  }

  .accounts-table button {
    width: 48%;
    font-size: 13px;
  }
}
</style>