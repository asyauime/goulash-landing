# Автоматически извлечённые стили

Источник: https://goulash.tech. Получено: 2026-11-16.
Это подсказка, а не истина. Сверьте значения с видом сайта и перенесите нужные в `docs/brand.md`.

## Правила для html и body

- `body { padding-top: 0px;padding-right: 0px;padding-bottom: 0px;padding-left: 0px; }`
- `body { touch-action:none;overscroll-behavior:none;-webkit-overflow-scrolling:auto;overflow:hidden; }`
- `body { margin-right:var(--vertical-scrollbar);margin-bottom:var(--horizontal-scrollbar); }`
- `body { height:auto }`

## Переменные CSS (custom properties)

- `--wp-block-synced-color`: #7a00df
- `--wp-block-synced-color--rgb`: 122,0,223
- `--wp-bound-block-color`: var(--wp-block-synced-color)
- `--wp-editor-canvas-background`: #ddd
- `--wp-admin-theme-color`: #007cba
- `--wp-admin-theme-color--rgb`: 0,124,186
- `--wp-admin-theme-color-darker-10`: #006ba1
- `--wp-admin-theme-color-darker-10--rgb`: 0,107,160.5
- `--wp-admin-theme-color-darker-20`: #005a87
- `--wp-admin-theme-color-darker-20--rgb`: 0,90,135
- `--wp-admin-border-width-focus`: 1.5px
- `--wp--preset--font-size--normal`: 16px
- `--wp--preset--font-size--huge`: 42px
- `--wp-admin--admin-bar--position-offset`: 0px
- `--wp--preset--aspect-ratio--square`: 1
- `--wp--preset--aspect-ratio--4-3`: 4/3
- `--wp--preset--aspect-ratio--3-4`: 3/4
- `--wp--preset--aspect-ratio--3-2`: 3/2
- `--wp--preset--aspect-ratio--2-3`: 2/3
- `--wp--preset--aspect-ratio--16-9`: 16/9
- `--wp--preset--aspect-ratio--9-16`: 9/16
- `--wp--preset--color--black`: #000000
- `--wp--preset--color--cyan-bluish-gray`: #abb8c3
- `--wp--preset--color--white`: #ffffff
- `--wp--preset--color--pale-pink`: #f78da7
- `--wp--preset--color--vivid-red`: #cf2e2e
- `--wp--preset--color--luminous-vivid-orange`: #ff6900
- `--wp--preset--color--luminous-vivid-amber`: #fcb900
- `--wp--preset--color--light-green-cyan`: #7bdcb5
- `--wp--preset--color--vivid-green-cyan`: #00d084
- `--wp--preset--color--pale-cyan-blue`: #8ed1fc
- `--wp--preset--color--vivid-cyan-blue`: #0693e3
- `--wp--preset--color--vivid-purple`: #9b51e0
- `--wp--preset--gradient--vivid-cyan-blue-to-vivid-purple`: linear-gradient(135deg,rgb(6,147,227) 0%,rgb(155,81,224) 100%)
- `--wp--preset--gradient--light-green-cyan-to-vivid-green-cyan`: linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)
- `--wp--preset--gradient--luminous-vivid-amber-to-luminous-vivid-orange`: linear-gradient(135deg,rgb(252,185,0) 0%,rgb(255,105,0) 100%)
- `--wp--preset--gradient--luminous-vivid-orange-to-vivid-red`: linear-gradient(135deg,rgb(255,105,0) 0%,rgb(207,46,46) 100%)
- `--wp--preset--gradient--very-light-gray-to-cyan-bluish-gray`: linear-gradient(135deg,rgb(238,238,238) 0%,rgb(169,184,195) 100%)
- `--wp--preset--gradient--cool-to-warm-spectrum`: linear-gradient(135deg,rgb(74,234,220) 0%,rgb(151,120,209) 20%,rgb(207,42,186) 40%,rgb(238,44,130) 60%,rgb(251,105,98) 80%,rgb(254,248,76) 100%)
- `--wp--preset--gradient--blush-light-purple`: linear-gradient(135deg,rgb(255,206,236) 0%,rgb(152,150,240) 100%)
- `--wp--preset--gradient--blush-bordeaux`: linear-gradient(135deg,rgb(254,205,165) 0%,rgb(254,45,45) 50%,rgb(107,0,62) 100%)
- `--wp--preset--gradient--luminous-dusk`: linear-gradient(135deg,rgb(255,203,112) 0%,rgb(199,81,192) 50%,rgb(65,88,208) 100%)
- `--wp--preset--gradient--pale-ocean`: linear-gradient(135deg,rgb(255,245,203) 0%,rgb(182,227,212) 50%,rgb(51,167,181) 100%)
- `--wp--preset--gradient--electric-grass`: linear-gradient(135deg,rgb(202,248,128) 0%,rgb(113,206,126) 100%)
- `--wp--preset--gradient--midnight`: linear-gradient(135deg,rgb(2,3,129) 0%,rgb(40,116,252) 100%)
- `--wp--preset--font-size--small`: 13px
- `--wp--preset--font-size--medium`: 20px
- `--wp--preset--font-size--large`: 36px
- `--wp--preset--font-size--x-large`: 42px
- `--wp--preset--spacing--20`: 0.44rem
- `--wp--preset--spacing--30`: 0.67rem
- `--wp--preset--spacing--40`: 1rem
- `--wp--preset--spacing--50`: 1.5rem
- `--wp--preset--spacing--60`: 2.25rem
- `--wp--preset--spacing--70`: 3.38rem
- `--wp--preset--spacing--80`: 5.06rem
- `--wp--preset--shadow--natural`: 6px 6px 9px rgba(0, 0, 0, 0.2)
- `--wp--preset--shadow--deep`: 12px 12px 50px rgba(0, 0, 0, 0.4)
- `--wp--preset--shadow--sharp`: 6px 6px 0px rgba(0, 0, 0, 0.2)
- `--wp--preset--shadow--outlined`: 6px 6px 0px -3px rgb(255, 255, 255), 6px 6px rgb(0, 0, 0)
- `--wp--preset--shadow--crisp`: 6px 6px 0px rgb(0, 0, 0)
- `--wp--preset--dimension--25`: 25%
- `--wp--preset--dimension--50`: 50%
- `--wp--preset--dimension--75`: 75%
- `--wp--preset--dimension--100`: 100%
- `--g-cyan`: #00ffff
- `--g-cyan-dark`: #00d6d6
- `--g-green`: #b1ec52
- `--g-error`: #ff2f2f
- `--g-dark-primary`: #222222
- `--g-dark-secondary`: #26272c
- `--g-dark-tertiary`: #0a2224
- `--g-dark-muted`: #424242
- `--g-dark-card`: #1b1b1b
- `--g-dark-primary-70`: rgba(34, 34, 34, 0.7)
- `--g-light-primary`: #ffffff
- `--g-light-secondary`: #fafafa
- `--g-light-tertiary`: #f8f8f8
- `--g-light-subtle`: #ececec
- `--g-light-muted`: #cdcdcd

## Самые частые цвета

- #ffffff (30)
- #000000 (13)
- #dddddd (7)
- #2b2b2b (7)
- #00ffff (6)
- #040406 (6)
- #1a1a1a (5)
- #424242 (5)
- #ececec (4)
- #eeeeee (3)
- #0693e3 (3)
- #32373c (3)
- #ff6900 (3)
- #aaaaaa (3)
- #111111 (3)
- #222222 (3)
- #313131 (2)
- #00d084 (2)
- #020381 (2)
- #2874fc (2)
- #444444 (2)
- #cf2e2e (2)
- #fcb900 (2)
- #9b51e0 (2)

## Самые частые шрифты (font-family)

- "Onest" (5)
- var(--g-font, inherit) (3)
- var(--g-font) (2)
- var(--g-font-pixel) (2)
- inherit (1)
- "Pixeloid Sans" (1)

## Подключённые шрифты (@font-face и ссылки)

- "Onest" (Onest-Light.woff)
- "Onest" (Onest-Regular.woff)
- "Onest" (Onest-Medium.woff)
- "Onest" (Onest-Bold.woff)
- "Onest" (Onest-ExtraBold.woff)
- "Pixeloid Sans" (PixeloidSans.ttf)
- https://fonts.googleapis.com
- https://fonts.gstatic.com

## Скругления (border-radius)

- var(--g-r-lg) (9)
- 50% (8)
- 12px (4)
- var(--g-r-xs) (3)
- var(--g-r-md) (3)
- var(--g-r-btn) (2)
- var(--g-r-sm) (2)
- var(--g-r-btn, 8px) (2)

## Какие CSS-файлы разобраны

- https://goulash.tech/wp-content/plugins/ctc-flatbuttons/inc/aaist-style.css?ver=1.0.3
- https://goulash.tech/wp-content/plugins/luckywp-cookie-notice-gdpr/front/assets/main.min.css?ver=1.2.1
- https://goulash.tech/wp-content/themes/goulash-theme/css/forms.css?ver=1791263358
- https://goulash.tech/wp-content/plugins/easy-fancybox/fancybox/1.5.4/jquery.fancybox.min.css?ver=7.1.4
- https://goulash.tech/wp-content/themes/goulash-theme/css/v2/tokens.css?ver=1791263358
- https://goulash.tech/wp-content/themes/goulash-theme/css/v2/ui-kit.css?ver=1791263358
- https://goulash.tech/wp-content/themes/goulash-theme/css/v2/header.css?ver=1791263358
- https://goulash.tech/wp-content/themes/goulash-theme/css/v2/footer.css?ver=1791352564
- https://goulash.tech/wp-content/themes/goulash-theme/css/v2/cookie.css?ver=1791263358
- https://goulash.tech/wp-content/themes/goulash-theme/css/v2/home.css?ver=1794391160
- https://goulash.tech/wp-content/themes/goulash-theme/css/v2/vendor/lenis.css?ver=1791263358
