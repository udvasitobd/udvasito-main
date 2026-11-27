# Data licences

Third-party data UDVASITO uses, where it came from and what its licence asks of us. The About page credits every
row marked **credit required** (roadmap §5.2, ADR-013). Add a row before adding any new dataset.

| Data | Source (pinned) | Licence | What we must do |
|---|---|---|---|
| Divisions, districts, upazilas — English + Bangla names, centres, BBS codes | [nuhil/bangladesh-geocode](https://github.com/nuhil/bangladesh-geocode) @ `c4b950b5cd2a65d42d75b12f7fad459e12777df6` — files `divisions.json`, `districts.json`, `upazilas.json` | MIT (© 2014 Nuhil Mehdy) for the compilation; the boundaries and codes come from the **Bangladesh Bureau of Statistics** via **UN OCHA COD-AB** (HDX `cod-ab-bgd`), **CC BY-IGO** | Keep the MIT notice (`data/sources/places/nuhil-bangladesh-geocode/LICENSE`). **Credit required:** "Administrative areas: Bangladesh Bureau of Statistics (BBS) via UN OCHA (CC BY-IGO), compiled by nuhil/bangladesh-geocode (MIT)." |
| Chattogram metropolitan thana centres and BBS codes (11 thanas) | same repository, `pipeline/sources/bbs_admin3_points.csv` (its `manifest.json` records the HDX source and licence) | CC BY-IGO (BBS / UN OCHA) | Covered by the credit above. |
| Chattogram thana Bangla names; centres of Sadarghat, Chawkbazar, EPZ | [mdtanjilhasan/bd-geocode-with-lat-long](https://github.com/mdtanjilhasan/bd-geocode-with-lat-long) @ `aaa3a6a9c70f958154b34f25212fc65b27014369` — `all-in-one/db_geocode.json` | MIT (© 2020 MD. Tanjil Hasan) | Keep the MIT notice (`data/sources/places/bd-geocode-with-lat-long/LICENSE`). **Credit required:** "Thana names: bd-geocode-with-lat-long (MIT)." |
| Metro-thana list, spellings and corrections | UDVASITO team — `data/sources/places/chattogram-metro-thanas.csv` | this repository | Member 2 checks the list against the Chattogram Metropolitan Police list (roadmap §5.2) and records the check below. |

## How the places data is made
`data/sources/places/*` (files above, unchanged) → `npx tsx scripts/build-places.ts` → `data/places.json` →
`npm run seed:places` → the `places` table + `src/data/places.min.json`. The build never invents a value: a thana with no
centre in any source is left out and printed as **LEFT OUT**.

## Open items
- **Akbar Shah** thana has no centre in any source, so it is not loaded yet. Member 2: add `lat,lng` to its row in
  `chattogram-metro-thanas.csv` (Google Maps → right-click the thana centre → copy coordinates), then run the build.
- Spellings to confirm: "Chittagong Port" (Bandar) — Bangla corrected to "বন্দর" from the source's "বান্দার";
  "Sadarghat", "Chawkbazar" (normalised English spellings); "Bayejid Bostami" (BBS spelling).
- Metro thanas of other cities (Dhaka, Khulna, Rajshahi, Sylhet) are not loaded — outside the Chattogram pilot.

## Checks
| Date | Who | What was checked |
|---|---|---|
| — | member 2 | Chattogram metro-thana list against the CMP official list (pending) |
