let meta = #{
    name: "audit-classifier",
    description: "Audit XBlock identification and decision engine; verify improvement points",
    when_to_use: "When reviewing classify/extract/seeds for misses, false positives, or layering bugs",
    phases: [
        #{ title: "Map", detail: "read the live pipeline" },
        #{ title: "Audit", detail: "five parallel dimensions" },
        #{ title: "Verify", detail: "adversarial check per finding" },
        #{ title: "Report", detail: "write the confirmed list" },
    ],
};

let findings_schema = #{
    "type": "object",
    "required": ["findings"],
    "properties": #{
        "findings": #{
            "type": "array",
            "maxItems": 6,
            "items": #{
                "type": "object",
                "required": ["file", "issue", "area", "severity"],
                "properties": #{
                    "file": #{ "type": "string" },
                    "issue": #{ "type": "string" },
                    "area": #{ "type": "string" },
                    "severity": #{ "type": "string" },
                    "fix": #{ "type": "string" },
                },
            },
        },
    },
};

let verdict_schema = #{
    "type": "object",
    "required": ["real", "reason", "evidence"],
    "properties": #{
        "real": #{ "type": "boolean" },
        "reason": #{ "type": "string" },
        "evidence": #{ "type": "string" },
    },
};

let report_schema = #{
    "type": "object",
    "required": ["markdown"],
    "properties": #{
        "markdown": #{ "type": "string" },
    },
};

fn in_scope(path) {
    if type_of(path) != "string" { return false; }
    let n = path.len();
    if n >= 12 && path.sub_string(0, 12) == "src/content/" { return true; }
    if n >= 10 && path.sub_string(0, 10) == "src/rules/" { return true; }
    if n >= 11 && path.sub_string(0, 11) == "src/shared/" { return true; }
    false
}

let focus = "";
if args != () && args.focus != () && type_of(args.focus) == "string" {
    focus = args.focus;
}

let files = "";
files += "src/content/classify.ts, src/content/classify.test.ts, src/content/extract.ts, ";
files += "src/content/boot.ts, src/content/hide.ts, src/rules/seeds.ts, src/rules/handles.ts, ";
files += "src/rules/mentions.ts, src/rules/normalize.ts, src/shared/lists.ts, src/shared/schema.ts, src/shared/types.ts";

phase("Map");
let map_prompt = "";
map_prompt += "Read these XBlock files with read_file/grep before answering. Do not invent APIs. Files: ";
map_prompt += files;
map_prompt += " Summarize the live decision pipeline in 8-12 bullets: extract fields, normalize, word/domain/contact hits, ";
map_prompt += "mention extra-@ rules, farm-handle rule, hide vs suggest vs ignore, exempt/pending/blocked priority, ";
map_prompt += "near-dup gate, tray scoring. Empty bullets only if a file is missing after you tried to read it.";
if focus != "" {
    map_prompt += " Extra focus from the user: ";
    map_prompt += focus;
}
let mapped = agent(map_prompt, #{
    label: "map-pipeline",
    capability_mode: "read-only",
});
let map_text = "";
if mapped != () && mapped.success && type_of(mapped.output) == "string" {
    map_text = mapped.output;
}
log("pipeline map done");

phase("Audit");
let dimensions = [
    "false negatives and miss classes still possible with current rules",
    "false positives and over-hide of real Chinese replies",
    "hide vs suggest vs ignore layering and scoreOf ranking",
    "extract-to-classify signal loss (handle, displayName, mentions, replyTo, urls)",
    "seed/handle/mention hygiene and missing tests",
];
let areas = ["miss", "false_positive", "layering", "extract", "hygiene"];
let jobs = [];
let di = 0;
for dim in dimensions {
    let p = "";
    p += "Audit XBlock's identification algorithm and decision engine. ";
    p += "You MUST use read_file and grep on the listed files; do not answer from memory. ";
    p += "Files: ";
    p += files;
    p += " Dimension: ";
    p += dim;
    p += " Area tag to use on every finding: ";
    p += areas[di];
    p += " Report at most 6 concrete, code-backed findings as {file, issue, area, severity, fix}. ";
    p += "file must be a path under src/content/, src/rules/, or src/shared/. ";
    p += "severity is high, med, or low. ";
    p += "An empty findings list is valid ONLY after you have read classify.ts and the files relevant to this dimension.";
    if focus != "" {
        p += " User focus: ";
        p += focus;
    }
    jobs.push(#{
        prompt: p,
        label: "audit:" + areas[di],
        capability_mode: "read-only",
        output_schema: findings_schema,
    });
    di += 1;
}
let results = parallel(jobs);

let findings = [];
let dropped_scope = 0;
for r in results {
    if r != () && r.success && r.output.findings != () {
        for f in r.output.findings {
            if f != () && in_scope(f.file) {
                findings.push(f);
            } else {
                dropped_scope += 1;
            }
        }
    }
}
if dropped_scope > 0 {
    log("dropped " + dropped_scope.to_string() + " out-of-scope findings");
}

const MAX_F = 10;
if findings.len() > MAX_F {
    log("capping findings " + findings.len().to_string() + " -> " + MAX_F.to_string());
    let trimmed = [];
    let k = 0;
    for f in findings {
        if k < MAX_F { trimmed.push(f); }
        k += 1;
    }
    findings = trimmed;
}

if findings.len() == 0 {
    let empty_md = "# XBlock classifier audit\n\nNo in-scope findings after the audit pass.\n";
    if map_text != "" {
        empty_md += "\n## Pipeline map\n\n";
        empty_md += map_text;
        empty_md += "\n";
    }
    let empty_path = write_scratch_file("report.md", empty_md);
    complete(#{ summary: "No in-scope findings", path: empty_path, confirmed: 0 });
}

phase("Verify");
let vjobs = [];
for f in findings {
    let vp = "";
    vp += "Adversarially verify this XBlock detector finding. Default real=false. ";
    vp += "Use read_file/grep on the named file and related tests. ";
    vp += "Finding file: ";
    vp += f.file;
    vp += " Issue: ";
    vp += f.issue;
    vp += " Set real=true ONLY with a concrete quote or line you independently read. ";
    vp += "evidence must cite the file and what you saw. Missing evidence means real=false.";
    vjobs.push(#{
        prompt: vp,
        label: "verify",
        capability_mode: "read-only",
        output_schema: verdict_schema,
    });
}
let verdicts = parallel(vjobs);

let confirmed = [];
let vi = 0;
for v in verdicts {
    if v != () && v.success && v.output.real == true
        && v.output.evidence != () && v.output.evidence != "" {
        let item = findings[vi];
        item.evidence = v.output.evidence;
        item.verify_reason = v.output.reason;
        confirmed.push(item);
    }
    vi += 1;
}
log(confirmed.len().to_string() + "/" + findings.len().to_string() + " findings survived verification");

phase("Report");
let pack = json_encode(#{
    map: map_text,
    confirmed: confirmed,
    checked: findings.len(),
    focus: focus,
});
let rp = "";
rp += "Write a concise Traditional Chinese audit report as markdown only (field markdown). ";
rp += "Use this JSON (already encoded): ";
rp += pack;
rp += " Structure: 1) 決策引擎現況 2) 已驗證可完善點（按 severity）3) 明確不要改的約束 ";
rp += "(DOM-only, no profile fetch, no unofficial block API, no political auto-class). ";
rp += "Do not invent findings not in the JSON. If confirmed is empty, say so.";
let written = agent(rp, #{
    label: "write-report",
    capability_mode: "read-only",
    output_schema: report_schema,
});

let md = "# XBlock classifier audit\n\nVerification produced no usable report body.\n";
if written != () && written.success && written.output.markdown != () {
    md = written.output.markdown;
}
let path = write_scratch_file("report.md", md);
complete(#{
    summary: confirmed.len().to_string() + " confirmed improvements",
    path: path,
    confirmed: confirmed.len(),
    checked: findings.len(),
});
