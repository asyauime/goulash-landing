# Бриф медиа: фото людей и еды (F10) и hero-видео (T10)

Статус: черновик оркестратора, 2026-11-16. Генерирует Ася во внешнем сервисе (Midjourney, Flux и т. п.), агенты принимают файлы, сжимают, ставят на страницу и записывают в `docs/prompts.md`.

## Зачем фото
Правка Асей C2: «не хватает фото людей, как на сайте Гуляша, это привлекает внимание; возможно фото еды, но не перегрузить главное». Фото с goulash.tech не копируем (brand.md, правило 1), генерируем своё в той же атмосфере.

## Общий стиль для всех кадров
- Тёмная сцена, как фон сайта (#222222), мягкий контровой свет, одна холодная акцентная подсветка цвета #00ffff (как свет LED-табло или экрана планшета). Без кислотности: акцент тонкий.
- Кинематографичная документальная съёмка, малая глубина резкости, естественные позы, люди заняты делом, не смотрят в камеру и не позируют.
- Люди вымышленные (сгенерированные), разного возраста и внешности, рабочая одежда без надписей.
- Нельзя: логотипы, надписи, вывески, бренды на упаковке, узнаваемые реальные люди, текст на экранах (экраны только как светящиеся пятна или пиксельные точки).
- Цвет и свет одинаковые во всей серии: генерировать с одним и тем же seed или референсом первого удачного кадра.

## Кадры (6 штук, главная не перегружена)

| № | Файл | Где на странице | Формат | Сюжет |
|---|---|---|---|---|
| P1 | `people-kitchen-lead.webp` | рядом с блоком «Три боли» (не в первом экране) | 4:5, 1200×1500 | Шеф у раздачи смотрит на один большой экран с очередью заказов, вокруг лёгкий пар, на лице холодный свет экрана |
| P2 | `people-cooks.webp` | блок «Как это работает», шаг 2 | 3:2, 1500×1000 | Двое поваров на тёмной кухне собирают заказы в крафтовые пакеты без надписей, движение, светится пиксельный индикатор |
| P3 | `people-courier.webp` | блок «Как это работает», шаг 3, или рядом с демо «Маршрут» | 4:5, 1200×1500 | Курьер на велосипеде или самокате вечером в городе, термосумка без логотипа, на лице голубоватый отсвет от телефона на руле |
| F1 | `food-goulash.webp` | полоса из трёх фото еды между демо и фактами | 1:1, 1000×1000 | Гуляш в чугунном котелке, сверху вниз, тёмный стол, пар |
| F2 | `food-onion.webp` | та же полоса | 1:1, 1000×1000 | Блюдо с карамелизированным луком (тарт или суп), тёмный фон |
| F3 | `food-blini.webp` | та же полоса | 1:1, 1000×1000 | Стопка блинов с начинкой, тёмный фон |

Еда соответствует трём вымышленным брендам демо: «Медный котелок» (котелок), «Луковый сад» (лук), «Сытая полка» (блины). Фото еды подписываются только названием блюда, без брендов.

## Промпты (английский, для Midjourney или Flux)

Общий хвост для всех: `, dark moody restaurant kitchen at night, cinematic documentary photo, soft rim light, subtle cyan (#00ffff) accent light from a screen, shallow depth of field, natural candid pose, no text, no logos, no signage, no brand names, fictional people, photorealistic, 35mm`

- **P1:** `head chef at a stainless steel kitchen pass looking at one large glowing order screen, light steam, face lit by cool cyan screen light` + общий хвост + ` --ar 4:5`
- **P2:** `two line cooks packing delivery orders into plain kraft paper bags, motion, small pixel LED indicator glowing on the counter` + общий хвост + ` --ar 3:2`
- **P3:** `delivery courier on a bicycle in a city street at dusk, plain insulated delivery backpack with no logo, cyan glow from a phone mounted on the handlebar on the face` (вместо «kitchen» в хвосте: `dark city street at night`) + ` --ar 4:5`
- **F1:** `hungarian goulash in a small cast iron pot, top-down view, dark slate table, gentle steam, warm food with a subtle cyan rim light, food photography, no text, no logos --ar 1:1`
- **F2:** `caramelized onion tart on a dark plate, top-down view, dark slate table, subtle cyan rim light, food photography, no text, no logos --ar 1:1`
- **F3:** `stack of thin russian blini with filling on a dark plate, top-down view, dark slate table, subtle cyan rim light, food photography, no text, no logos --ar 1:1`

## Приёмка
- Положить файлы в `site/assets/media/` с именами из таблицы (можно JPG или PNG, агент переведёт в WebP).
- Каждый файл на странице до 300 КБ (агент сожмёт).
- У каждого фото будет `alt` с описанием сцены.
- Записать в `docs/prompts.md`: сервис и версию, итоговый промпт, seed, что поправили.

## Видео (T10): блок ниже первого экрана
Решение Аси (2026-11-16): видео не в главном блоке, а ниже, отдельным блоком перед демо. Файлы: `site/assets/media/video-kitchens.mp4` и постер `site/assets/media/video-kitchens-poster.jpg`.

**Технические требования:** 8–12 секунд, зацикленное (последний кадр плавно переходит в первый), 16:9, без звука, без текста на кадрах, вес до 2 МБ (агент сожмёт), постер = кадр 1.

**Стиль:** пиксельное LED-табло на тёмной городской улице, как фирменный приём Гуляша; акцентный свет #00ffff; без людей, без логотипов, без надписей.

**Сюжет (4 кадра по 2–3 секунды):** заказы трёх брендов вспыхивают на табло → стекаются в одну линию → линия ведёт на кухню, кухня «отправляет» заказ → пиксельный курьер едет по маршруту к дому, дом загорается.

### Шаг 1. Четыре ключевых кадра картинками (Midjourney, Flux)
Общий хвост: `, pixel art LED street display, mounted on a pole on a dark night street, dot-matrix pixels, cyan (#00ffff) and white LEDs on black, clean grid, cinematic, no text, no letters, no people, no logos --ar 16:9`

- **K1:** `three small pixel icons (cooking pot, onion, stack of pancakes) light up one by one on a large LED dot-matrix board` + хвост
- **K2:** `glowing pixel dots flow from three icons along three lines and merge into one bright stream on the LED board` + хвост
- **K3:** `the merged stream reaches a pixel kitchen icon, a small pixel delivery scooter leaves the kitchen on the LED board` + хвост
- **K4:** `a pixel delivery scooter follows a dotted route on a pixel city map and reaches a small house icon that lights up, LED board` + хвост

Сделайте K1, выберите лучший и используйте его как референс (style reference / seed) для K2–K4, чтобы стиль совпал.

### Шаг 2. Оживить каждый кадр (Kling, Runway, Veo: image to video)
- **K1:** `LED pixels light up one by one, subtle flicker of real LEDs, very slow camera push-in, static scene, smooth, consistent pixel style, no text, no people`
- **K2:** `dots of light travel along the lines and merge into one stream, slow camera push-in, smooth, consistent pixel style, no text, no people`
- **K3:** `the stream flows into the kitchen icon, the scooter icon moves out to the right, smooth, consistent pixel style, no text, no people`
- **K4:** `the scooter moves along the dotted route to the house, the house icon lights up, camera slowly pulls back to the starting framing for a seamless loop, no text, no people`

### Шаг 3. Склейка
Склейте 4 ролика по 2–3 секунды подряд (CapCut, любой редактор), без звука, плавные переходы. Готовый файл положите в `site/assets/media/` как `video-kitchens.mp4`, постер как `video-kitchens-poster.jpg`. Сожму и вставлю я.

Запишите в `docs/prompts.md` сервисы и версии, или пришлите мне, я запишу.
