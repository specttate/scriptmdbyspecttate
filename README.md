# Панель модераторов

Это полный проект для GitHub + Netlify. Интерфейс собирается как Vite/React-приложение, а операции с Google-таблицей выполняет Google Apps Script от имени пользователя, открывшего приложение.

## Что загрузить в Apps Script

В папке `apps-script` находятся два файла:

- `apps-script.gs` — основной код Google Apps Script;
- `Index.html` — HTML-мост, который загружает сайт Netlify.

В Apps Script создайте HTML-файл с именем `Index` и вставьте туда содержимое `apps-script/Index.html`. Содержимое `apps-script/apps-script.gs` вставьте в файл `.gs`.

В начале `.gs` укажите ссылку на Google-таблицу:

```javascript
var SHEET_URL = "https://docs.google.com/spreadsheets/d/ВАШ_ID/edit";
```

В свойствах проекта Apps Script добавьте:

```text
Имя: NETLIFY_URL
Значение: https://ваш-сайт.netlify.app
```

## Публикация Apps Script

Развернуть → Новое развёртывание → Веб-приложение:

```text
Выполнять от имени: Пользователь, открывший веб-приложение
У кого есть доступ: Все пользователи с аккаунтом Google
```

Пользователям нужно отправлять ссылку `/exec`, а не ссылку редактора Apps Script.

## Публикация Netlify

В Netlify:

```text
Build command: npm run build
Publish directory: dist
```

Этот проект уже подготовлен для размещения в корне GitHub-репозитория. `VITE_GAS_URL` и `APP_TOKEN` не нужны.

## Локальная проверка

```bash
npm install
npm run typecheck
npm run build
```