export const DSAP_PROTOCOL = "sayelf-nature-window.dsap";
export const DSAP_VERSION = "0.1.0";

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value ?? "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createDsapRecord({
  contract,
  contract_version,
  output,
  selected_outputs = [],
  language,
  source,
  scene_id,
  seed,
  continuity,
  outputs = {},
  errors = []
}) {
  const compiled_outputs = Object.keys(outputs);
  const failed_outputs = selected_outputs.filter(type => !compiled_outputs.includes(type));
  const status = errors.length || failed_outputs.length ? "NEEDS_REVIEW" : "COMPLETED";
  const handoff_status = status === "COMPLETED" ? "ACCEPTED" : "NEEDS_REVIEW";
  const run_descriptor = {
    contract,
    output,
    selected_outputs,
    language,
    source,
    scene_id: scene_id || "composed",
    seed,
    continuity_id: continuity?.continuity_id,
    compiled_outputs,
    errors: errors.map(error => ({ output: error.output, code: error.code, message: error.message }))
  };
  const run_id = `dsap-${hashText(JSON.stringify(run_descriptor)).toString(16).padStart(8, "0")}`;
  const evidence = {
    observations: [
      { id: "compiled-outputs", value: compiled_outputs },
      { id: "failed-outputs", value: failed_outputs },
      { id: "plugin-errors", value: errors.length }
    ],
    inferences: [
      { id: "current-state", value: status, derived_from: [1, 2, 3, 4] },
      { id: "handoff-state", value: handoff_status, derived_from: [3, 4] }
    ],
    hypotheses: [],
    facts: [
      { id: "contract", value: contract },
      { id: "frozen-visual-grammar", value: "enter,enclose,guide,reveal" },
      { id: "shared-continuity", value: continuity?.continuity_id || null }
    ]
  };
  const handoff = {
    status: handoff_status,
    result_version: `${contract_version}:${run_id}`,
    result_types: compiled_outputs,
    consumer: "selected interface adapter",
    resume_scope: failed_outputs.length ? failed_outputs : []
  };
  return {
    protocol: DSAP_PROTOCOL,
    version: DSAP_VERSION,
    run_id,
    goal: "Compile one SceneSpec into selected visual outputs",
    decision: {
      selected_outputs,
      output,
      language,
      source,
      acceptance_rule: "all selected output plugins compile and share the continuity anchor"
    },
    state: {
      status,
      current_from: "ledger",
      checkpoint: "outputs-compiled",
      resumable_scope: failed_outputs,
      next_check: "new request or changed input, seed, or plugin result"
    },
    action: {
      type: "compile_outputs",
      execution: "local-deterministic",
      retry_policy: "rerun affected output plugin only"
    },
    proof: {
      status: status === "COMPLETED" ? "PASS" : "NEEDS_REVIEW",
      contract_version,
      continuity_id: continuity?.continuity_id || null,
      compiled_outputs,
      failed_outputs,
      evidence
    },
    ledger: [
      { seq: 1, event: "run.created", state: "READY", evidence: "validated request and output selection" },
      { seq: 2, event: "decision.recorded", state: "RUNNING", evidence: "selected outputs and acceptance rule" },
      { seq: 3, event: "action.completed", state: "RUNNING", evidence: { compiled_outputs, failed_outputs } },
      { seq: 4, event: "run.closed", state: status, evidence: { proof: status === "COMPLETED" ? "contract and continuity accepted" : "plugin review required", handoff_status } }
    ],
    handoff
  };
}
