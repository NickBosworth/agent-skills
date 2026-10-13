"""Evaluation integrity checks; mocked trajectories are not model-run evidence."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

PACKAGE = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("dnc_evaluate", PACKAGE / "scripts/evaluate.py")
evaluate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evaluate)


class EvaluationTests(unittest.TestCase):
    def test_skill_is_outside_project_globs_and_arm_inputs_match(self):
        case = {"id": "placement", "fixture": "boundary", "mode": "effectiveness", "prompt": "Fix."}
        process = evaluate.subprocess.CompletedProcess([], 1, '{}\n', '')
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary)
            with patch.object(evaluate.subprocess, "run", return_value=process):
                baseline = evaluate.run_case("synthetic-executor", "synthetic-model", case, "baseline", 1, destination, 1)
                skilled = evaluate.run_case("synthetic-executor", "synthetic-model", case, "skill", 1, destination, 1)
            work = destination / "placement-1-skill/work"
            self.assertFalse((work / "skill").exists())
            self.assertTrue((work.parent / "skill/SKILL.md").is_file())
            self.assertTrue((work.parent / "skill/scripts/verify.py").is_file())
            self.assertFalse((work.parent / "skill/scripts/evaluate.py").exists())
            self.assertFalse((work.parent / "skill/evals").exists())
            self.assertFalse((work.parent / "skill/tests").exists())
            self.assertEqual(baseline["input_identity"], skilled["input_identity"])
            self.assertTrue(skilled["skill_preserved"])

    def test_failed_executor_stops_before_more_trials(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "comparison"
            arguments = ["evaluate", "--executor", "synthetic-executor", "--model", "synthetic-model",
                         "--out", str(output)]
            failed = {"completed": False, "executor_exit": 1}
            with patch("sys.argv", arguments), patch.object(evaluate, "run_case", return_value=failed) as run:
                with patch.object(evaluate.subprocess, "run", return_value=evaluate.subprocess.CompletedProcess([], 0, "synthetic-version", "")):
                    with patch("builtins.print"), self.assertRaises(SystemExit):
                        evaluate.main()
            self.assertEqual(run.call_count, 1)
            self.assertEqual(len(json.loads((output / "summary.json").read_text())["runs"]), 1)

    def test_timeout_preserves_private_partial_evidence_without_claiming_completion(self):
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary)
            case = {"id": "timeout", "fixture": "no-op", "mode": "effectiveness", "prompt": "Review."}
            error = evaluate.subprocess.TimeoutExpired(["synthetic-executor"], 1,
                                                       output=b'{}\n', stderr=b'synthetic-private-marker')
            with patch.object(evaluate.subprocess, "run", side_effect=error):
                row = evaluate.run_case("synthetic-executor", "synthetic-model", case, "baseline", 1,
                                        destination, 1)
            self.assertEqual(row["executor_exit"], 124)
            self.assertFalse(row["completed"])
            self.assertIsNone(row["outcome_pass"])
            self.assertNotIn("synthetic-private-marker", json.dumps(row))
            self.assertEqual((destination / "timeout-1-baseline/diagnostics.txt").read_text(), "synthetic-private-marker")

    def test_usage_is_observed_and_invalid_or_missing_usage_is_not_invented(self):
        self.assertIsNone(evaluate.event_metrics('{}\n')["usage"])
        self.assertFalse(evaluate.event_metrics('{}\n')["completed"])
        event = {"type": "turn.completed", "usage": {"input_tokens": 12, "output_tokens": 3}}
        self.assertEqual(evaluate.event_metrics(json.dumps(event))["usage"]["input_tokens"], 12)
        for count in [-1, "12", True]:
            event["usage"]["input_tokens"] = count
            with self.assertRaises(ValueError):
                evaluate.event_metrics(json.dumps(event))
        with self.assertRaises(ValueError):
            evaluate.event_metrics("not-json")
        for event in [[], None, {"item": None}, {"type": "turn.completed", "usage": None}]:
            with self.assertRaises(ValueError):
                evaluate.event_metrics(json.dumps(event))

    def test_skill_read_is_not_inferred_from_name_in_an_answer(self):
        answer = {"item": {"type": "agent_message", "text": "Used skill/SKILL.md"}}
        self.assertFalse(evaluate.event_metrics(json.dumps(answer))["visible_skill_read"])
        command = {"item": {"type": "command_execution", "command": "cat skill/SKILL.md",
                            "status": "completed", "exit_code": 0,
                            "aggregated_output": "# Clean Code for C#/.NET\n"}}
        self.assertTrue(evaluate.event_metrics(json.dumps(command))["visible_skill_read"])
        for changes in [{"status": "in_progress"}, {"exit_code": 1},
                        {"aggregated_output": "skill/SKILL.md"}, {"aggregated_output": ""}]:
            with self.subTest(changes=changes):
                row = {"item": {**command["item"], **changes}}
                self.assertFalse(evaluate.event_metrics(json.dumps(row))["visible_skill_read"])
        malformed = {"item": {**command["item"], "aggregated_output": None}}
        with self.assertRaises(ValueError):
            evaluate.event_metrics(json.dumps(malformed))

    def test_snapshot_prunes_build_output_and_rejects_symlink_evidence(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "Source.cs").write_text("synthetic")
            (root / "obj").mkdir()
            (root / "obj/Generated.cs").write_text("ignored")
            first = evaluate.snapshot(root)
            self.assertEqual(set(first), {"Source.cs"})
            (root / "Source.cs").write_text("changed")
            self.assertNotEqual(evaluate.identity(first), evaluate.identity(evaluate.snapshot(root)))
            (root / "Link.cs").symlink_to(root / "Source.cs")
            with self.assertRaises(ValueError):
                evaluate.snapshot(root)

    def test_noop_and_negative_grade_source_bytes_not_agent_claims(self):
        cases = json.loads((PACKAGE / "evals/comparison-cases.json").read_text())["cases"]
        for fixture in ["no-op", "negative"]:
            case = next(row for row in cases if row["fixture"] == fixture)
            with tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary)
                work = directory / "work"
                evaluate.prepare(case, work)
                before = evaluate.snapshot(work)
                first = evaluate.grade(case, work, before, directory / "checker")
                self.assertEqual(first["outcome_pass"], fixture == "no-op")
                if fixture == "negative":
                    (work / "Guide.md").write_text("Keep the receipt for your records.\n")
                    self.assertTrue(evaluate.grade(case, work, before, directory / "checker")["outcome_pass"])
                    (work / "Unrelated.md").write_text("unrequested")
                    self.assertFalse(evaluate.grade(case, work, before, directory / "checker")["outcome_pass"])


@unittest.skipUnless(os.environ.get("DNC_DOTNET_TESTS") == "1", "Optional compiled evaluator oracle not selected.")
class EvaluationOracleTests(unittest.TestCase):
    def test_rename_oracle_accepts_strengthened_tests_and_detects_weakened_behavior(self):
        case = {"fixture": "refactoring"}
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            work = directory / "work"
            evaluate.prepare(case, work)
            before = evaluate.snapshot(work)
            source = work / "ReceiptPublisher.cs"
            source.write_text(source.read_text().replace("public int PublishReceipt(int value) => value * 2;",
                "public int PublishReceipt(int value) => DeliverReceipt(value);\n"
                "    public int DeliverReceipt(int value) => value * 2;"))
            for name in ["ReceiptPublisher.Calls.cs", "GeneratedInputs/ReceiptPublisher.cs.in"]:
                path = work / name
                path.write_text(path.read_text().replace("PublishReceipt(", "DeliverReceipt("))
            program = work / "Program.cs"
            program.write_text(program.read_text().replace("if (publisher.PublishReceipt(2) != 4",
                              "if (publisher.DeliverReceipt(2) != 4 || publisher.PublishReceipt(2) != 4"))
            self.assertTrue(evaluate.grade(case, work, before, directory / "strengthened")["outcome_pass"])
            program.write_text('Console.WriteLine("No assertions.");\n')
            source.write_text(source.read_text().replace("value >= 0", "value > 0"))
            self.assertFalse(evaluate.grade(case, work, before, directory / "weakened")["outcome_pass"])

    def test_boundary_oracle_detects_old_defect_and_accepts_correction(self):
        case = {"fixture": "boundary"}
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            work = directory / "work"
            evaluate.prepare(case, work)
            before = evaluate.snapshot(work)
            failed = evaluate.grade(case, work, before, directory / "old")
            self.assertFalse(failed["outcome_pass"])
            source = work / "Boundary.cs"
            source.write_text(source.read_text().replace("count > 0", "count >= 0"))
            self.assertTrue(evaluate.grade(case, work, before, directory / "corrected")["outcome_pass"])


if __name__ == "__main__":
    unittest.main()
