# Kassa Cloud — запуск

## 1. Firestore Rules

Откройте Firebase Console → Firestore Database → Rules.
Полностью замените правила содержимым файла `firestore.rules` и нажмите Publish.

## 2. Проверка структуры Firestore

Должно существовать:

- `families/kalinin-family`
- `families/kalinin-family/members/<UID Андрея>`
- `families/kalinin-family/members/<UID Наташи>`

ID документов участников должны точно совпадать с UID из Authentication.

## 3. Локальные данные

При первом входе каждого пользователя приложение один раз переносит локальные:

- операции;
- категории;
- бюджеты.

Данные с двух устройств объединяются по ID документов.

## 4. Git

```powershell
git add .
git commit -m "feat: add shared Firestore synchronization"
git push
```

Если сайт публикуется из `main`, слейте рабочую ветку:

```powershell
git switch main
git pull origin main
git merge feat/firebase-sync
git push origin main
```

## 5. Проверка

1. Войти под Андреем на одном устройстве.
2. Войти под Наташей на другом.
3. Изменить бюджет на первом устройстве.
4. Создать расход на втором.
5. Оба изменения должны появиться на обоих устройствах автоматически.

Если появляется `permission-denied`, проверьте опубликованные Rules и точность UID документов в `members`.
