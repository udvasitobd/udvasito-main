# উদ্ভাসিত / UDVASITO: Brand Kit · The Ripple Drop

> Note (2026-11-27, ADR-023): the web address is now **udvasito.com**. The rendered videos still show `udvasito.vercel.app`, which redirects to udvasito.com.

**The idea:** one blood request is one drop. UDVASITO sends it out in ripples: first the nearest matching donors, then a wider wave, then a wider one, until someone answers. The two ripples are the product's matching waves (10 → 25 → 50 donors, `specs.md` S-08). The glint on the drop is the light in উদ্ভাসিত, which means "lit up": the moment a donor says yes. In the wordmark, the last **O** is a ripple holding the drop.

**Why the cross is gone:** the v0 logo had a medical cross in the drop. UDVASITO connects people and is not a medical service (vision principle 4; `common.notBloodBank`). A cross suggests medical authority. The ripple shows what the product actually does: it reaches the right donors fast.

Version 1.0 · 2026-11-23 · built from the approved `vision.md`, `PRD.md` and `specs.md`. The colours are the existing `specs.md` §1.3 tokens; nothing new was added.

---

## Folders
| Folder / file | What's inside |
|---|---|
| `svg/` | Vector masters with outlined text (no fonts needed) and named layers for animation |
| `png/` | Transparent PNGs: lockups and wordmarks 2400 px wide, symbol 1200 px tall, construction 1600 px |
| `app-icons/` | 1024 → 16 px: rounded red tile, full-bleed square red, white tile, and a circle avatar |
| `app-assets/` | Drop-in files for the app repository (see *Where these go* below) |
| `favicon.ico` | 16, 32, 48 and 64 px |
| `motion/` | Logo reveal, 9 s: `udvasito-logo-reveal-16x9.mp4` (1920×1080) and `-1x1.mp4` (1080×1080). Promo film, 27 s: `udvasito-promo-16x9.mp4`, `-1x1.mp4`, `-9x16.mp4` (1080×1920 for Reels, Stories, TikTok and WhatsApp Status). All are 30 fps, H.264 and silent |
| `storyboard/` | Six keyframes of the reveal and eight of the promo |
| `alternates/` | The other symbol options considered: A1 Radiant, A2 Signal, A3 Cradle (one ripple), A4 Solid (drop only) |
| `udvasito-brand-sheet.png` | The whole system on one page, for slides and for the team |
| `source/` | The scripts that generated every file (see `source/prepare.py`) |

**Colour suffixes:**
- `-color`: red symbol and navy text, for white and light backgrounds.
- `-white`: for Signal red, navy and photos.
- `-black`: ink `#111827`, for one-colour print.
- The symbol also comes in `-red`, `-white`, `-black` and `-navy`.

## Logo versions
| Version | File | Use |
|---|---|---|
| **Horizontal** (primary) | `lockup-horizontal` | Symbol + UDVASITO + উদ্ভাসিত. Use it by default |
| **Horizontal, English only** | `lockup-horizontal-en` | Tight spaces, international partners |
| **Stacked** | `lockup-stacked` | Splash screen, social posts, square spaces, the end of videos |
| **Bangla-first** | `lockup-bangla` | উদ্ভাসিত leads and UDVASITO follows. Bangla audiences, campus posters |
| **Wordmark** | `wordmark` | The O is a ripple holding the drop. Website header and app bar, wherever the symbol isn't next to it |
| **Wordmark + উদ্ভাসিত** | `wordmark-bn` | Same, with the Bangla name |
| **Symbol** | `symbol` | App icon, favicon, avatar, watermark |
| **App icon** | `app-icon-red`, `-square-red`, `-white`, `-avatar-circle` | Launchers, stores, social profile pictures |

## Rules
- **Clear space:** keep the height of the capital U free on every side of a lockup or wordmark. For the symbol alone, keep half its width free.
- **Minimum size:**
  - symbol 24 px (below that, use the app-icon tile, down to 16 px);
  - horizontal logo 140 px wide;
  - wordmark 100 px wide;
  - print: 12 mm tall.
- **Logo red `#E63946` is for the mark only.** It is 4.17:1 on white, so it is never used for text or behind text. Text and buttons use Signal red `#C1121F`.
- **On red backgrounds, always use the white logo**, never the colour one.
- **Don't:** stretch, rotate, recolour outside the palette, add shadows, gradients or outlines, put a cross back in the drop, change the number or order of the ripples, or set the wordmark in another font.

## Colour (the `specs.md` §1.3 tokens)
| Name | HEX | Use | Token |
|---|---|---|---|
| Logo red | `#E63946` | The mark and illustrations only | `brand.logoRed` |
| Signal red | `#C1121F` | Buttons, the app-icon tile, red backgrounds with white text (6.22:1) | `brand.primary` |
| Pressed red | `#A50F1A` | Pressed and hover states | `brand.primaryPressed` |
| Navy | `#1D3557` | Wordmark, headlines, secondary buttons (white on navy 12.36:1) | `brand.navy` |
| Ink | `#111827` | Body text, one-colour print | `text.primary` |
| Muted | `#4B5563` | Secondary text | `text.muted` |
| Blush | `#FDECEE` | Tinted backgrounds, chips | `brand.primarySoft` |
| Surface | `#F6F7F9` | App background, cards | `bg.surface` |

## Type
- **Montserrat Bold** (SIL Open Font License) is used for the wordmark, which is outlined in every SVG, and for promo, social and video headlines. Montserrat is **never loaded in the app**, so the app's font budget in `specs.md` §7 does not change.
- **Noto Sans + Noto Sans Bengali** (OFL) are used for the app and website interface, as `specs.md` §1.3 already decides.
- **উদ্ভাসিত in the logo** was outlined from GNU FreeSans, the only Bengali font available on the build machine (its font exception allows embedding), with a thin matching stroke for semibold weight. To redraw it in Noto Sans Bengali SemiBold for perfect consistency with the app, follow `source/prepare.py`. It takes one command and every file is regenerated.

## Animation layers (SVG ids, for Lottie, Rive, After Effects or CSS)
| Layer id | What it is | Suggested motion |
|---|---|---|
| `symbol` | The whole mark | — |
| `drop` | The drop, with the glint cut out | Grows from a dot (the full stop of "One request.") and lands with a small squash |
| `ripples` → `ripple1`, `ripple2` | The two arcs | Draw outward from the bottom centre, settling inward from a larger radius |
| `wordmark-en` → `wm-U` … `wm-T`, `O-ring`, `O-drop` | UDVASITO, one path per letter | Type on 60–75 ms apart; the O-drop can fall into its ring |
| `wordmark-bn` | উদ্ভাসিত | Fade up after the English |
| `tile` | App-icon background | — |

**The reveal, step by step (9 s):**
1. "One request" types in, ending with a red full stop.
2. The full stop glides to the centre and becomes the drop.
3. Three ripples spread out; donor dots light up as each one passes.
4. One donor answers and a line connects them to the drop.
5. The ripple arcs settle into the mark and the glint flashes.
6. A Signal-red circle wipes out from the drop.
7. UDVASITO types in and উদ্ভাসিত fades up.

## The promo film (27 s, three formats)
Every line comes from the approved landing-page copy (`specs.md` SCR-P01) or describes an approved rule. The app screens are illustrations drawn with real copy keys: they contain no real people, no phone numbers and no invented results (vision principle 10).

| Time | English | বাংলা | Picture |
|---|---|---|---|
| 0–3.4 s | Someone needs blood. Right now. | কারও রক্ত লাগবে — এখনই। | Big type |
| 3.5–7 s | Today, families post everywhere — and wait for hours. | আজ পরিবারগুলো সবখানে পোস্ট করে, আর ঘণ্টার পর ঘণ্টা অপেক্ষা করে। | Scattered request posts pile up, then collapse into one drop |
| 7.1–11.3 s | With UDVASITO: post one request — type, speak or paste. | একটি অনুরোধ দিন — লিখে, বলে বা পেস্ট করে। | "Check and post" screen; Post is tapped |
| 11.4–15.5 s | Matching donors nearby are alerted in seconds. | কয়েক সেকেন্ডে কাছের উপযুক্ত রক্তদাতাদের জানানো হয়। | Ripples with the chips "Wave 1 · 10", "Wave 2 · 25", "Wave 3 · 50" |
| 15.6–19.5 s | Numbers are shared only when a donor says yes. | রক্তদাতা রাজি হলেই কেবল নম্বর শেয়ার হয়। | Donor alert → "I can help" → confirmed, with the safety card |
| 19.6–22.5 s | No answer in 30 seconds? A volunteer steps in. | ৩০ সেকেন্ডে কেউ সাড়া না দিলে একজন স্বেচ্ছাসেবক এগিয়ে আসেন। | Countdown → volunteer card |
| 22.5–27 s | One request. The right donor. Minutes, not hours. | একটি অনুরোধ। সঠিক রক্তদাতা। ঘণ্টা নয়, মিনিটে। | Red end card: logo, udvasito.vercel.app, "Free · English & বাংলা · Android & web", "A student initiative · University of Chittagong" |

The videos are silent because social feeds autoplay muted. To add music or a voice-over, use a free editor such as CapCut and pick a track you have the rights to use.

## Where these go in the app repository (roadmap §5.7, DEP-11)
| Kit file | Repo path | Used by |
|---|---|---|
| `app-assets/icon.png` | `assets/icon.png` | Expo `icon` |
| `app-assets/adaptive-icon.png` | `assets/adaptive-icon.png` | `android.adaptiveIcon.foregroundImage`, with `backgroundColor: "#C1121F"` |
| `app-assets/splash-icon.png` | `assets/splash-icon.png` | `expo-splash-screen` plugin: `image`, `imageWidth: 200`, `backgroundColor: "#FFFFFF"` |
| `app-assets/splash.png` | `assets/splash.png` | Full-screen splash (1284×2778), where a full image is needed |
| `app-assets/notification-icon.png` | `assets/notification-icon.png` | `expo-notifications` plugin: `icon`, with `color: "#C1121F"` (Android status bar; white only) |
| `app-assets/favicon.png`, `favicon.ico` | `public/favicon.png`, `public/favicon.ico` | Web |
| `app-assets/icon-192.png`, `icon-512.png` | `public/icon-192.png`, `public/icon-512.png` | PWA manifest (`purpose: "any maskable"`; the mark sits in the safe zone) |
| `app-assets/apple-touch-icon.png` | `public/apple-touch-icon.png` | iPhone "Add to Home Screen" |
| `app-assets/og-image.png` | `public/og-image.png` | Social preview for `udvasito.vercel.app` |
| `svg/udvasito-symbol-red.svg`, `svg/udvasito-wordmark-color.svg` | `assets/logo/` | In-app header and About page (drawn with `react-native-svg`, which the `lucide-react-native` icons in `specs.md` §1.3 already need) |

## Licences
- Montserrat: SIL Open Font License 1.1.
- GNU FreeSans: GPL with font exception.
- Logo and artwork: © 2026 Team UDVASITO (University of Chittagong), shared alongside the MIT-licensed code. The logo itself identifies the project, so don't use it to represent other projects.
