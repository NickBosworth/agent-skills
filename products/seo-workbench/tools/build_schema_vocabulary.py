"""Build the reviewed offline term index from an explicitly supplied public release."""
import argparse
import hashlib
import json
import os
import stat
import re
from pathlib import Path

VERSION = "30.1"
SOURCE = "https://raw.githubusercontent.com/schemaorg/schemaorg/main/data/releases/30.1/schemaorg-current-https.jsonld"
SOURCE_HASH = "0a4b8c4c910fc831ec8695196510973390906a5ee34dc6b862dfec4d21a12f74"


def values(value):
    return value if isinstance(value, list) else [value] if value else []


def terms(value):
    return sorted({item["@id"][7:] for item in values(value)
                   if isinstance(item, dict) and re.fullmatch(r"schema:[A-Za-z0-9]+", item.get("@id", ""))})


def build(document):
    graph = document.get("@graph")
    if not isinstance(graph, list) or len(graph) > 10000:
        raise ValueError("Invalid bounded vocabulary graph")
    result = {"types": {}, "properties": {}, "enumerations": {}}
    for node in graph:
        if not isinstance(node, dict):
            raise ValueError("Invalid vocabulary node")
        identifier = node.get("@id", "")
        if not isinstance(identifier, str) or not re.fullmatch(r"schema:[A-Za-z0-9]+", identifier):
            continue
        name, kinds = identifier[7:], values(node.get("@type"))
        if "rdfs:Class" in kinds:
            result["types"][name] = terms(node.get("rdfs:subClassOf"))
        elif "rdf:Property" in kinds:
            result["properties"][name] = {"domains": terms(node.get("schema:domainIncludes")),
                                           "ranges": terms(node.get("schema:rangeIncludes"))}
        else:
            result["enumerations"][name] = sorted({kind[7:] for kind in kinds
                                                  if isinstance(kind, str) and kind.startswith("schema:")})
    return {key: dict(sorted(items.items())) for key, items in result.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    descriptor = os.open(args.source, os.O_RDONLY | getattr(os, "O_NONBLOCK", 0))
    with os.fdopen(descriptor, "rb") as source:
        if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
            raise ValueError("An ordinary vocabulary source file is required")
        data = source.read(10000001)
    if len(data) > 10000000 or hashlib.sha256(data).hexdigest() != SOURCE_HASH:
        raise ValueError("The input is not the reviewed vocabulary release")
    result = {
        "schemaVersion": 1, "vocabularyVersion": VERSION, "releasedOn": "2026-09-16",
        "reviewedOn": "2026-10-12", "source": SOURCE, "sourceSha256": SOURCE_HASH,
        "license": "CC-BY-SA-3.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
        "attribution": "Schema.org sponsors: Google, Yahoo, Microsoft and Yandex. Adapted to term names, inheritance, domains, ranges and enumeration membership; descriptions, examples and contributor records omitted.",
        **build(json.loads(data)),
    }
    destination = Path(args.out)
    output = destination.open("x", encoding="utf-8")
    try:
        with output:
            output.write(json.dumps(result, indent=2) + "\n")
    except Exception:
        destination.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, UnicodeError):
        raise SystemExit("The vocabulary source or output could not be verified. Check the exact source release and choose a new output path.")
