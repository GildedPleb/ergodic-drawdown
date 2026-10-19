#!/usr/bin/env python3
"""Subset Form's patched SM faces (src/*.ttf) to WOFF2 and write manifest.json from the real cmap/GSUB.

Pinned: fonttools==4.65.0, brotli==1.2.0 (see requirements.txt). Run from this folder:
    python3 subset.py
build.py is Form's glyph patcher (adds ₿, →, U+202F); this script only subsets its output.
"""
import hashlib, json, os, sys
import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

PIN = "4.65.0"
if fontTools.version != PIN:
    sys.exit(f"fonttools {fontTools.version} != pinned {PIN}")

HERE = os.path.dirname(os.path.abspath(__file__))
# Basic Latin + NBSP + the MVP-SPEC G2 set + em dash (formatter "—") + curly quotes.
REQUIRED = [0x20BF, 0x2192, 0x2212, 0x2013, 0x2019, 0x2026, 0x00B7, 0x00D7, 0x202F]
EXTRA = [0x00A0, 0x2014, 0x2018, 0x201C, 0x201D]
UNICODES = list(range(0x20, 0x7F)) + REQUIRED + EXTRA
# onum/pnum stay so EB Garamond's tnum/lnum lookups (which map from .osf/.lf figures) survive the closure.
FEATURES = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum", "lnum", "onum", "pnum"]
FACES = ["SMCormorant-500", "SMEBGaramond-400", "SMEBGaramond-400i", "SMJost-500", "SMJost-600"]


def subset_face(name: str) -> dict:
    src = os.path.join(HERE, "src", f"{name}.ttf")
    out = os.path.join(HERE, f"{name}.woff2")
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = FEATURES
    opts.hinting = False
    opts.desubroutinize = True
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # keep copyright + OFL licence fields
    opts.notdef_outline = True
    font = subset.load_font(src, opts)
    s = subset.Subsetter(opts)
    s.populate(unicodes=UNICODES)
    s.subset(font)
    font.flavor = "woff2"
    font.save(out)
    data = open(out, "rb").read()
    check = TTFont(out)
    cmap = check.getBestCmap()
    feats = sorted({r.FeatureTag for r in check["GSUB"].table.FeatureList.FeatureRecord}) if "GSUB" in check else []
    missing = [f"U+{c:04X}" for c in UNICODES if c not in cmap and c not in EXTRA]
    if missing:
        sys.exit(f"{name}: subset lost {missing}")
    return {
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
        "codepoints": len(cmap),
        "gsubFeatures": feats,
        "tnum": "tnum" in feats,
        "lnum": "lnum" in feats,
    }


def main() -> None:
    faces = {f"{n}.woff2": subset_face(n) for n in FACES}
    manifest = {
        "tool": f"fonttools {PIN}",
        "unicodes": [f"U+{c:04X}" for c in sorted(set(UNICODES))],
        "requiredCodepoints": [f"U+{c:04X}" for c in REQUIRED],
        "faces": faces,
        "totalBytes": sum(f["bytes"] for f in faces.values()),
        "preloadBytes": faces["SMCormorant-500.woff2"]["bytes"] + faces["SMJost-500.woff2"]["bytes"],
    }
    with open(os.path.join(HERE, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")
    print(json.dumps({k: manifest[k] for k in ("totalBytes", "preloadBytes")}))


if __name__ == "__main__":
    main()
