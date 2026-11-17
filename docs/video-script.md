# Видео «Пятница, 19:03»: пошаговый план (реалистичный стиль)

История в двух словах: на ночной кухне четыре планшета пищат разными заказами, диспетчер на телефоне, курьер не знает, куда ехать. Одно нажатие, и заказы собираются в один экран. Кухня успокаивается, курьер уезжает, повар подмигивает в камеру.

Реализм: как документальная съёмка, без мультяшности. Герои двигаются естественно, юмор только в мелочах (взгляд повара между планшетами, чай в конце). Выдуманные герои и кухня, реальных брендов и логотипов нет. Подпись на сайте: «Демо-данные, кадры сгенерированы ИИ».

Ограничение: в один запуск можно прикладывать до 3 картинок. В плане нигде не больше 2.

## Общая строка стиля (вставляй в каждый промпт картинки и видео)

STYLE: photorealistic, shot on a cinema camera, 35mm lens, shallow depth of field, natural skin texture, small dark restaurant kitchen at night, soft cyan (#00ffff) light from screens, deep black and graphite surroundings, 16:9, no text, no letters, no logos, no watermarks, not cartoon, not 3D render.

## Герои (одинаково описывать везде)
- COOK: man in his thirties, short dark beard, black chef jacket, black cap.
- DISPATCHER: woman in her forties, short hair, gray sweater, wireless headset.
- COURIER: young woman, cyan delivery jacket, black thermal backpack, kick scooter.

---

## ЧАСТЬ 1. Картинки (Gemini), делать по порядку

### Картинка 0. Герои вместе (референс для всех остальных)
Прикладывать: ничего.
Промпт: STYLE. Character reference, three people standing side by side in the small kitchen, full body, facing the camera, neutral relaxed poses, even soft lighting, clear faces. Left: COOK. Center: DISPATCHER. Right: COURIER holding the kick scooter.

### Картинка 1. Суета (первый кадр клипа 1)
Прикладывать: картинку 0.
Промпт: Use the same three people as in the reference image. STYLE. Wide shot of the kitchen. The cook stands in the center among four tablets on stands, screens glowing cyan with abstract order lists (no readable text). The dispatcher on the left holds a phone to her ear and a notepad, mid-sentence. The courier stands at the kitchen door with the scooter, looking around. Tense, busy atmosphere, light steam in the background.

### Картинка 2. Рука и кнопка (первый кадр клипа 2)
Прикладывать: ничего.
Промпт: STYLE. Close-up of a hand with a black sleeve about to press a glowing cyan button on a tablet screen. Behind it three more tablets blurred, glowing. No readable text on screens.

### Картинка 3. Порядок (первый кадр клипа 3)
Прикладывать: картинку 0.
Промпт: Use the same three people as in the reference image. STYLE. Wide shot of the same kitchen, now calm. One tablet on the counter glows steadily. The cook holds a cup of tea and relaxes, the dispatcher puts her phone on the table and smiles, the courier stands at the service window taking a paper bag. Warm, quiet mood, cyan accents softer.

### Картинка 4. Повар крупно (первый кадр клипа 4)
Прикладывать: картинку 0.
Промпт: Use the same cook as in the reference image. STYLE. Close-up portrait of the cook looking straight into the camera, a slight smile, cyan glow on his face, dark kitchen softly blurred behind him.

Проверка перед видео: лица на картинках 1, 3 и 4 должны быть похожи на картинку 0. Если нет, перегенерируй.

---

## ЧАСТЬ 2. Видео (Kling), 4 клипа

Для всех: Image-to-video, 6 секунд (клип 4 можно 5), качество 720p и выше. Первым кадром идёт указанная картинка.

### Клип 1. Суета
Прикладывать: картинка 1 (первый кадр), картинка 0 (референс героев, если есть такое поле).
Промпт: STYLE. Start from the first image. The four tablets flash and beep. The cook glances quickly from one tablet to another, tired and tense. The dispatcher talks fast on the phone, gesturing. The courier shifts her weight at the door and looks around, unsure where to go. Handheld camera, slow push-in, natural movement, documentary feel.

### Клип 2. Щелчок
Прикладывать: картинка 2 (первый кадр).
Промпт: STYLE. Start from the first image. The hand presses the cyan button. The blurred tablets in the background dim one by one, and the screen in focus shows a neat single column of cyan bars sliding into line (no readable text). Smooth, satisfying, slight rack focus.

### Клип 3. Порядок
Прикладывать: картинка 3 (первый кадр), картинка 0 (референс героев).
Промпт: STYLE. Start from the first image. The cook takes a sip of tea and exhales, shoulders relaxing. The dispatcher smiles. The courier takes the bag, turns, steps onto the scooter and rides out of the door into the dark street. Calm, steady camera, natural movement.

### Клип 4. Подмигивание
Прикладывать: картинка 4 (первый кадр), картинка 0 (референс героя).
Промпт: STYLE. Start from the first image. The cook holds eye contact with the camera, a small smile appears, a quick natural wink, then a gentle nod. Almost still camera, subtle cyan flicker on his face.

---

## ЧАСТЬ 3. Что дальше
1. Скачай клипы и пришли мне, лучше по одному, как будут готовы.
2. Я обрежу водяной знак, склею (около 18 секунд), добавлю голубые точки-переходы и название «Goulash.tech», сожму для сайта и вставлю.
3. Все промпты запишу в docs/prompts.md с именами файлов.

Куда ставим на сайте (наверху, между блоками, внизу): решим после генерации.
