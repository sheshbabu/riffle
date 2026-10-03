import { test } from "node:test";
import assert from "node:assert/strict";
import formatDuration from "./formatDuration.js";

test("formatDuration", () => {
  const cases = [
    [[undefined], null],
    [[null], null],
    [[0], "0s"],
    [[45], "45s"],
    [[125], "2m 5s"],
    [[3725], "1h 2m 5s"],
    [["1:05"], "1m 5s"],
    [["1:02:05"], "1h 2m 5s"],
    [["90"], "1m 30s"],
    [["abc"], "abc"],
    [[65, true], "1:05"],
    [[3725, true], "1:02:05"],
  ];

  for (const [args, expected] of cases) {
    assert.equal(formatDuration(...args), expected, `args: ${JSON.stringify(args)}`);
  }
});
