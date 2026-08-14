let meta = #{
    name: "debug-tray-options",
    description: "Locate why the XBlock tray Options button does nothing",
    when_to_use: "When the tray Options button click has no effect",
    phases: [
        #{ title: "Trace", detail: "read click path in tray, boot, SW" },
        #{ title: "Verify", detail: "confirm the dead click cause" },
        #{ title: "Report", detail: "name the fix" },
    ],
};

let cause_schema = #{
    "type": "object",
    "required": ["file", "cause", "fix"],
    "properties": #{
        "file": #{ "type": "string" },
        "cause": #{ "type": "string" },
        "fix": #{ "type": "string" },
        "evidence": #{ "type": "string" },
    },
};

let verdict_schema = #{
    "type": "object",
    "required": ["real", "evidence"],
    "properties": #{
        "real": #{ "type": "boolean" },
        "evidence": #{ "type": "string" },
    },
};

phase("Trace");
let p = "";
p += "XBlock bug: clicking Options in the tray does nothing. ";
p += "You MUST read_file and grep these files before answering: ";
p += "src/content/tray.ts, src/content/boot.ts, src/background/sw.ts, src/manifest.json. ";
p += "Trace openOptions from the button click to chrome.runtime.openOptionsPage. ";
p += "Return {file, cause, fix, evidence}. Empty cause is invalid unless you read all four files and found a working path.";
let traced = agent(p, #{
    label: "trace-options",
    capability_mode: "read-only",
    output_schema: cause_schema,
});

if (traced == () || !traced.success || traced.output.cause == ()) {
    complete(#{ summary: "Trace failed", path: "" });
}

phase("Verify");
let vp = "";
vp += "Adversarially verify this Options-button finding. Default real=false. ";
vp += "Read the cited file yourself. Finding file: ";
vp += traced.output.file;
vp += " Cause: ";
vp += traced.output.cause;
vp += " Set real=true only with a quote you independently read.";
let verdict = agent(vp, #{
    label: "verify-cause",
    capability_mode: "read-only",
    output_schema: verdict_schema,
});

phase("Report");
let md = "# Tray Options click\n\n";
if (verdict != () && verdict.success && verdict.output.real == true) {
    md += "Confirmed: ";
    md += traced.output.cause;
    md += "\n\nFix: ";
    md += traced.output.fix;
    md += "\n";
} else {
    md += "Cause not confirmed. Check tray.ts click, boot.ts sendMessage OPEN_OPTIONS, sw.ts openOptionsPage.\n";
}
let path = write_scratch_file("report.md", md);
complete(#{ summary: "options-click trace", path: path });
