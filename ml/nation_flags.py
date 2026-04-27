"""
Static mapping of API-Football nationality strings → ISO 3166-1 alpha-2 codes.
Used to build flagcdn.com URLs for output/nations.json.

UK constituent countries use flagcdn sub-codes (gb-eng, gb-sct, gb-wls, gb-nir)
so players who list "England" / "Scotland" / "Wales" / "Northern Ireland" get
the correct national flag rather than the Union Jack.

Covers all 74 nationality strings found in the current predictions.json.
"""

from pathlib import Path
import json

NATION_TO_ISO2: dict[str, str] = {
    "Albania":                "al",
    "Algeria":                "dz",
    "Argentina":              "ar",
    "Australia":              "au",
    "Austria":                "at",
    "Belgium":                "be",
    "Bosnia and Herzegovina": "ba",
    "Brazil":                 "br",
    "Bulgaria":               "bg",
    "Burkina Faso":           "bf",
    "Cameroon":               "cm",
    "Canada":                 "ca",
    "Chile":                  "cl",
    "Colombia":               "co",
    "Congo DR":               "cd",
    "Croatia":                "hr",
    "Czech Republic":         "cz",
    "Czechia":                "cz",   # same country, two API strings
    "Côte d'Ivoire":          "ci",
    "Denmark":                "dk",
    "Ecuador":                "ec",
    "Egypt":                  "eg",
    "England":                "gb-eng",
    "France":                 "fr",
    "Gabon":                  "ga",
    "Gambia":                 "gm",
    "Georgia":                "ge",
    "Germany":                "de",
    "Ghana":                  "gh",
    "Greece":                 "gr",
    "Guinea":                 "gn",
    "Hungary":                "hu",
    "Iceland":                "is",
    "Iraq":                   "iq",
    "Israel":                 "il",
    "Italy":                  "it",
    "Jamaica":                "jm",
    "Japan":                  "jp",
    "Korea Republic":         "kr",
    "Lithuania":              "lt",
    "Mali":                   "ml",
    "Mexico":                 "mx",
    "Morocco":                "ma",
    "Mozambique":             "mz",
    "Netherlands":            "nl",
    "New Zealand":            "nz",
    "Nigeria":                "ng",
    "Northern Ireland":       "gb-nir",
    "Norway":                 "no",
    "Paraguay":               "py",
    "Poland":                 "pl",
    "Portugal":               "pt",
    "Republic of Ireland":    "ie",
    "Romania":                "ro",
    "Scotland":               "gb-sct",
    "Senegal":                "sn",
    "Serbia":                 "rs",
    "Slovakia":               "sk",
    "Slovenia":               "si",
    "South Africa":           "za",
    "Spain":                  "es",
    "Sweden":                 "se",
    "Switzerland":            "ch",
    "Tunisia":                "tn",
    "Türkiye":                "tr",
    "USA":                    "us",
    "Ukraine":                "ua",
    "Uruguay":                "uy",
    "Uzbekistan":             "uz",
    "Venezuela":              "ve",
    "Wales":                  "gb-wls",
    "Zambia":                 "zm",
    "Zimbabwe":               "zw",
}

FLAG_BASE = "https://flagcdn.com/w320/{iso2}.png"


def flag_url(nation_name: str) -> str | None:
    iso2 = NATION_TO_ISO2.get(nation_name)
    if iso2 is None:
        print(f"[WARN] no flag mapping for nation: '{nation_name}'")
        return None
    return FLAG_BASE.format(iso2=iso2)


def build_nations_list(nationality_strings: list[str]) -> list[dict]:
    seen: set[str] = set()
    nations = []
    for name in sorted(set(nationality_strings)):
        if not name or name in seen:
            continue
        seen.add(name)
        url = flag_url(name)
        nations.append({"nation_name": name, "nation_flag_image": url or ""})
    return nations


def write_nations_json(nationality_strings: list[str], output_path: Path) -> None:
    nations = build_nations_list(nationality_strings)
    with open(output_path, "w") as f:
        json.dump(nations, f, indent=2)
    print(f"Nations:  {output_path}  ({len(nations)} nations)")
