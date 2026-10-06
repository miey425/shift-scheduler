import assert from "node:assert/strict";
import test from "node:test";
import { isEligibleForAutoAssignment } from "./availabilityGroups";

test("自動割当は提出済みの肯定的な希望だけを候補にする", () => {
  assert.equal(isEligibleForAutoAssignment(undefined), false);
  assert.equal(isEligibleForAutoAssignment("unavailable"), false);
  assert.equal(isEligibleForAutoAssignment("available"), true);
  assert.equal(isEligibleForAutoAssignment("preferred"), true);
});
