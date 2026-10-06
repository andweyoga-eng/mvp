# WeFuel food autocomplete sources

## In-repo seed

| File | Role |
|---|---|
| `fuel-food-catalog-v1.json` | Runtime search index (names + aliases) |
| `sources/andweyoga_wefuel_food_autocomplete_v1.xlsx` | Curated workbook (ICMR-NIN ingredients/aliases + India/Global dishes) |

Regenerate JSON after workbook edits:

```bash
python3 scripts/nutrition/build-fuel-food-catalog.py
```

## Autocomplete priority (locked)

1. **Personal history** — this member’s past `fuel_meals` names  
2. **Catalog** — workbook seed when history misses  
3. **Learn** — logging a meal feeds personal history for next time  

## Reference PDFs (not vendored — large)

Kept outside the repo under the nutrition intelligence platform folder:

- `…/nutrition intelligence platform/DGI_2024.pdf`
- `…/nutrition intelligence platform/DietaryGuidelinesforNINwebsite.pdf`

Cite as provenance for dietary-guideline context; not loaded at runtime.
