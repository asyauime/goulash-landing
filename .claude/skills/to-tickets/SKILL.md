---
name: to-tickets
description: Превращает docs/spec.md в небольшие тикеты для агентов (docs/tickets.md) с зависимостями и привязкой к критериям приёмки. Использовать после утверждения ТЗ.
---

# /to-tickets: ТЗ в задачи

1. Прочитай `docs/spec.md` целиком, особенно раздел «Критерии приёмки».
2. Если `docs/tickets.md` уже существует, не перезаписывай его. Создай `docs/tickets.new.md` и скажи об этом человеку.
3. Разбей работу на тикеты по 1–3 часа. Базовая раскладка (меняй, только если ТЗ изменилось):

| id | Название | Теги | depends | AC |
|---|---|---|---|---|
| T01 | Основа: base.css с токенами бренда, components.css, main.js (якоря, FAQ, меню) | foundation | | AC-02, AC-03, AC-09 |
| T02 | lead-form-logic.js (formatPhone, validateLead, submitLead) до зелёных тестов | logic | | AC-13, AC-14, AC-15, AC-25 |
| T03 | demo-logic.js (доска, стоп-лист, ETA, комиссии) до зелёных тестов | logic | | AC-17, AC-18, AC-19, AC-20, AC-25 |
| T04 | lead-form.js и разметка формы (состояния, a11y) | ui | T01, T02 | AC-11, AC-12, AC-16, AC-24 |
| T05 | Лендинг A: статические блоки по copy-kitchens.md | landing-A | T01 | AC-01, AC-02, AC-06, AC-07, AC-08 |
| T06 | D1 доска заказов (UI) | landing-A, demo | T01, T03 | AC-10, AC-17 |
| T07 | D2 стоп-лист и меню гостя (UI) | landing-A, demo | T01, T03 | AC-10, AC-18 |
| T08 | D3 маршрут и ETA (UI, общий для A и B) | landing-A, demo | T01, T03 | AC-10, AC-19 |
| T09 | Сборка лендинга A: блоки, демо, форма, ссылки | landing-A | T04, T05, T06, T07, T08 | AC-04, AC-21 |
| T10 | Медиа для A: подготовить промпты и бриф, поставить видео и постер | landing-A, needs-human | T01 | AC-22, AC-28, AC-30 |
| T11 | Лендинг B: статические блоки по copy-delivery.md | landing-B | T09 | AC-02, AC-06, AC-07, AC-08 |
| T12 | D5 калькулятор комиссий (UI) | landing-B, demo | T03, T01 | AC-10, AC-20 |
| T13 | D4 приложение гостя (UI) | landing-B, demo | T01 | AC-10 |
| T14 | Сборка лендинга B: блоки, демо, форма, ссылки | landing-B | T11, T12, T13, T08, T04 | AC-04, AC-21 |
| T15 | Медиа для B | landing-B, needs-human | T10 | AC-22, AC-28, AC-30 |
| T16 | Страница выбора site/index.html | final | T09, T14 | AC-01, AC-06 |
| T17 | Проход по доступности и адаптиву (360 px, фокус, клавиатура) | final | T16 | AC-23, AC-24, AC-27 |

4. Запиши в `docs/tickets.md`, для каждого тикета блок:

```
## T05. Лендинг A: статические блоки
- Статус: todo
- Теги: landing-A
- Зависит от: T01
- Критерии: AC-01, AC-02, AC-06, AC-07, AC-08
- Файлы: site/kitchens/index.html, при необходимости site/assets/css/page-kitchens.css
- Что сделать: (3-6 строк конкретно, со ссылками на разделы ТЗ и copy-файл)
- Как проверить: node scripts/check.mjs; открыть страницу
```

5. Статусы: `todo`, `in_progress`, `done`, `blocked`, `waiting-human`.
6. В конце выведи таблицу «тикет → зависимости» и напомни человеку, что следующая команда `/pipeline`.
