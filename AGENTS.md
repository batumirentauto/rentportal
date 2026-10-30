<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Правила адаптивности и мобильного отображения (MANDATORY)
1. **Никаких выходов элементов за границы экрана (NO HORIZONTAL OVERFLOW)**:
   - Все строки управления, шапки, навбары, карточки и модалки ОБЯЗАНЫ идеально помещаться на мобильных экранах (от 360px до 428px, включая iPhone SE, iPhone 12/13/14/15/16).
   - Если добавляются новые кнопки или бейджи (язык, иконки, действия) — проверять ширину контейнера, использовать адаптивные отступы (`px-1.5 sm:px-2.5`, `gap-1 sm:gap-2`), убирать лишний текст на узких экранах (`hidden sm:inline`) или использовать горизонтальный скролл без выпадения за пределы страницы.
   - Иконки и бейджи не должны обрезаться правым краем экрана.
2. **Контроль текстовых блоков**:
   - Текст никогда не должен вылезать за пределы своих кнопок, карточек или блоков. Использовать `truncate`, `break-words`, `min-w-0` при необходимости.
3. **Проверка при каждом изменении UI**:
   - При любых правках интерфейса обязательно проверять отображение на мобильных устройствах перед релизом.

