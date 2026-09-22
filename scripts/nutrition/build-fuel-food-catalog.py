#!/usr/bin/env python3
"""Rebuild data/nutrition/fuel-food-catalog-v1.json from the curated xlsx workbook."""

from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
XLSX = ROOT / "data/nutrition/sources/andweyoga_wefuel_food_autocomplete_v1.xlsx"
OUT = ROOT / "data/nutrition/fuel-food-catalog-v1.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def cell_text(c: ET.Element) -> str:
    is_el = c.find("m:is", NS)
    if is_el is not None:
        return "".join(
            t.text or ""
            for t in is_el.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
        ).strip()
    v = c.find("m:v", NS)
    return (v.text or "").strip() if v is not None else ""


def sheet_rows(z: zipfile.ZipFile, sheet_path: str) -> list[list[str]]:
    root = ET.fromstring(z.read(sheet_path))
    out: list[list[str]] = []
    for row in root.findall("m:sheetData/m:row", NS):
        vals = [cell_text(c) for c in row.findall("m:c", NS)]
        if any(vals):
            out.append(vals)
    return out


def main() -> None:
    entries: dict[str, dict] = {}

    def upsert(name: str, *, alias: str | None = None, kind: str, group: str = "", code: str = "", source: str = "") -> None:
        name = (name or "").strip()
        if not name:
            return
        key = name.lower()
        e = entries.get(key)
        if not e:
            e = {
                "name": name,
                "aliases": set(),
                "kind": kind,
                "group": group or "",
                "code": code or "",
                "source": source or "",
            }
            entries[key] = e
        else:
            if group and not e["group"]:
                e["group"] = group
            if code and not e["code"]:
                e["code"] = code
            if source and not e["source"]:
                e["source"] = source
            if kind == "ingredient":
                e["kind"] = "ingredient"
        if alias:
            a = alias.strip()
            if a and a.lower() != key:
                e["aliases"].add(a)

    with zipfile.ZipFile(XLSX) as z:
        for r in sheet_rows(z, "xl/worksheets/sheet2.xml")[1:]:
            code, en, sci, group, source = (r + [""] * 5)[:5]
            upsert(en, kind="ingredient", group=group, code=code, source=source)
            if sci:
                upsert(en, alias=sci, kind="ingredient", group=group, code=code, source=source)
        for r in sheet_rows(z, "xl/worksheets/sheet3.xml")[1:]:
            alias, _lang, _region, canonical, group, code, source = (r + [""] * 7)[:7]
            upsert(canonical, alias=alias, kind="ingredient", group=group, code=code, source=source)
        for r in sheet_rows(z, "xl/worksheets/sheet4.xml")[1:]:
            region, dish, aliases, source = (r + [""] * 4)[:4]
            upsert(dish, kind="dish", group=region, source=source)
            for a in re.split(r"[,;/|]", aliases or ""):
                upsert(dish, alias=a.strip(), kind="dish", group=region, source=source)
        for r in sheet_rows(z, "xl/worksheets/sheet5.xml")[1:]:
            cuisine, dish, aliases, source = (r + [""] * 4)[:4]
            upsert(dish, kind="dish", group=cuisine, source=source)
            for a in re.split(r"[,;/|]", aliases or ""):
                upsert(dish, alias=a.strip(), kind="dish", group=cuisine, source=source)

    catalog = {
        "version": 1,
        "workbook": "andweyoga_wefuel_food_autocomplete_v1.xlsx",
        "provenance": [
            "IFCT 2017 / ICMR-NIN (government, verified) — ingredients & aliases",
            "Curated India + Global dishes (workbook)",
            "Reference PDFs: DGI_2024.pdf, DietaryGuidelinesforNINwebsite.pdf (nutrition intelligence platform)",
        ],
        "entries": [
            {
                "name": e["name"],
                "aliases": sorted(e["aliases"], key=str.lower),
                "kind": e["kind"],
                "group": e["group"],
                "code": e["code"],
                "source": e["source"],
            }
            for e in sorted(entries.values(), key=lambda x: x["name"].lower())
        ],
    }
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(catalog['entries'])} entries → {OUT}")


if __name__ == "__main__":
    main()
