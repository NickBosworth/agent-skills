#!/usr/bin/env python3
"""Measure a pair of opaque sRGB colours using the WCAG luminance formula.

Run with Python 3.10 or later; only the standard library is used. Colours must be
quoted #RGB or #RRGGBB values. Alpha, gradients, HDR, and image sampling are not
supported because they require information about the final composited output.

Examples:
    python3 check_contrast.py '#FFFFFF' '#202020'
    python3 check_contrast.py '#FFFFFF' '#202020' --minimum 4.5 --json

Exit status is 0 for a measurement or a passing pair, 1 for a pair below the
explicit target, and 2 for invalid arguments. A passing pair does not establish
that text, a control, a screen, or a game meets an accessibility standard.

Formula source: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
Choose a target from the applicable scoped guidance in references/accessibility.md.
"""

import argparse
import json
import math
import re
from typing import Sequence


def parse_colour(value: str) -> tuple[str, tuple[float, float, float]]:
    """Return a normalised hex label and three encoded sRGB channels in [0, 1].

    Args:
        value: An opaque #RGB or #RRGGBB colour, with either case for hex digits.

    Raises:
        argparse.ArgumentTypeError: If the value is not a supported hex colour.
    """
    # Reject partial matches and alpha channels instead of silently discarding data.
    if re.fullmatch(r"#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})", value) is None:
        raise argparse.ArgumentTypeError("use an opaque '#RGB' or '#RRGGBB' colour")

    # Expand shorthand before converting so equivalent colour spellings agree.
    digits = value[1:]
    if len(digits) == 3:
        digits = "".join(character * 2 for character in digits)
    red, green, blue = (int(digits[index:index + 2], 16) / 255.0 for index in (0, 2, 4))
    return "#" + digits.upper(), (red, green, blue)


def parse_minimum(value: str) -> float:
    """Return a finite target in the contrast-ratio range [1, 21].

    Reject impossible targets and non-finite numbers so a typo cannot produce a
    misleading pass/fail result. Raise argparse.ArgumentTypeError on bad input.
    """
    try:
        result = float(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("minimum must be a number from 1 to 21") from error
    if not math.isfinite(result) or not 1.0 <= result <= 21.0:
        raise argparse.ArgumentTypeError("minimum must be a finite number from 1 to 21")
    return result


def relative_luminance(channels: Sequence[float]) -> float:
    """Return WCAG relative luminance for three encoded sRGB channels.

    The caller supplies red, green, and blue channels in [0, 1]. This function
    expects the validated colour representation from parse_colour, not HDR or
    linear-light input.
    """
    # Decode each channel before weighting; encoded sRGB values are not linear light.
    linear = [
        channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4
        for channel in channels
    ]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast_ratio(first: Sequence[float], second: Sequence[float]) -> float:
    """Return the symmetric luminance contrast of two validated opaque colours.

    The result is in [1, 21]. Foreground/background order does not alter this
    pair measurement; it does not model compositing, text shape, or perception.
    """
    luminances = (relative_luminance(first), relative_luminance(second))
    # Place the lighter colour above the darker one to keep the ratio at least one.
    return (max(luminances) + 0.05) / (min(luminances) + 0.05)


def main(argv: Sequence[str] | None = None) -> int:
    """Parse CLI arguments, print the measurement, and return its documented status.

    Args:
        argv: Arguments without the program name; None uses the process arguments.

    Argument parsing reports errors on stderr and exits with status 2. Valid
    invocations print text or JSON to stdout and do not modify any files.
    """
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("foreground", type=parse_colour)
    parser.add_argument("background", type=parse_colour)
    parser.add_argument("--minimum", type=parse_minimum, help="explicit scoped target; no default conformance claim")
    parser.add_argument("--json", action="store_true", help="print a machine-readable measurement")
    arguments = parser.parse_args(argv)

    # Evaluate before formatting so a displayed rounded value cannot turn failure into success.
    ratio = contrast_ratio(arguments.foreground[1], arguments.background[1])
    meets_target = None if arguments.minimum is None else ratio >= arguments.minimum
    measurement = {
        "foreground": arguments.foreground[0],
        "background": arguments.background[0],
        "ratio": ratio,
        "minimum": arguments.minimum,
        "meets_target": meets_target,
        "scope": "Two opaque sRGB colours only; not a screen or game accessibility assessment.",
    }

    # Preserve the raw numeric result in JSON; human output favours an explicit scoped verdict.
    if arguments.json:
        print(json.dumps(measurement, allow_nan=False))
    else:
        print(f"{measurement['foreground']} on {measurement['background']}: {ratio:.6f}:1")
        if meets_target is None:
            print("No target supplied; measurement only.")
        else:
            print(f"{'PASS' if meets_target else 'BELOW TARGET'} for this pair against {arguments.minimum}:1.")
        print(measurement["scope"])
    return 1 if meets_target is False else 0


if __name__ == "__main__":
    raise SystemExit(main())
