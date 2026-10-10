"""Check colour parsing, measurement boundaries and CLI failure states."""
import argparse
import contextlib
import io
import unittest

from check_contrast import contrast_ratio, main, parse_colour, parse_minimum


class ContrastTests(unittest.TestCase):
    def test_black_white_and_symmetry(self):
        black, white = parse_colour('#000')[1], parse_colour('#FFF')[1]
        self.assertEqual(contrast_ratio(black, white), 21)
        self.assertEqual(contrast_ratio(white, black), 21)
        self.assertEqual(contrast_ratio(black, black), 1)

    def test_shorthand_and_case(self):
        self.assertEqual(parse_colour('#AbC'), parse_colour('#aabbcc'))

    def test_invalid_colors(self):
        for color in ['white', '#FFFFFFFF', '#12', '#GGG', '#000 trailing']:
            with self.assertRaises(argparse.ArgumentTypeError):
                parse_colour(color)

    def test_invalid_targets(self):
        for minimum in ['nan', 'inf', '0', '22', 'word']:
            with self.assertRaises(argparse.ArgumentTypeError):
                parse_minimum(minimum)

    def test_cli_pass_failure_and_measurement(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main(['#000', '#fff', '--minimum', '21', '--json']), 0)
            self.assertEqual(main(['#000', '#000', '--minimum', '4.5']), 1)
            self.assertEqual(main(['#000', '#000']), 0)


if __name__ == '__main__':
    unittest.main()
