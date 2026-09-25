function verifyUrl(finalUrl, constraints = {}) {
  const evidence = {};

  try {
    const url = new URL(finalUrl);
    evidence.href = url.href;
    evidence.hostname = url.hostname;
    evidence.pathname = url.pathname;

    const violations = [];

    if (constraints.hostname) {
      const allowed = Array.isArray(constraints.hostname)
        ? constraints.hostname
        : [constraints.hostname];
      if (!allowed.includes(url.hostname)) {
        violations.push(`hostname: expected one of [${allowed.join(", ")}], got "${url.hostname}"`);
      }
    }

    if (constraints.pathnameIncludes) {
      if (!url.pathname.includes(constraints.pathnameIncludes)) {
        violations.push(`pathname: does not include "${constraints.pathnameIncludes}"`);
      }
    }

    const paramEvidence = {};
    const params = constraints.params || {};

    for (const [name, rule] of Object.entries(params)) {
      const raw = url.searchParams.get(name);
      const value = raw !== null ? decodeURIComponent(raw) : null;
      paramEvidence[name] = value;

      if (value === null) {
        violations.push(`${name}: missing query parameter`);
        continue;
      }

      const caseSensitive = !!rule.caseSensitive;
      const normalized = caseSensitive ? value : value.toLowerCase();

      if (rule.equals !== undefined) {
        const target = caseSensitive ? rule.equals : String(rule.equals).toLowerCase();
        if (normalized !== target) {
          violations.push(`${name}: expected "${rule.equals}", got "${value}"`);
        }
      }

      if (rule.includesAll) {
        const missing = rule.includesAll.filter((token) => {
          const t = caseSensitive ? token : token.toLowerCase();
          return !normalized.includes(t);
        });
        if (missing.length) {
          violations.push(`${name}: missing tokens [${missing.join(", ")}]`);
        }
      }

      if (rule.includesAny) {
        const found = rule.includesAny.some((token) => {
          const t = caseSensitive ? token : token.toLowerCase();
          return normalized.includes(t);
        });
        if (!found) {
          violations.push(`${name}: none of [${rule.includesAny.join(", ")}] present`);
        }
      }
    }

    evidence.params = paramEvidence;

    if (violations.length > 0) {
      return {
        success: false,
        reason: `Constraint violations: ${violations.join("; ")}`,
        evidence,
      };
    }

    return {
      success: true,
      reason: "URL satisfies all constraints",
      evidence,
    };
  } catch (err) {
    return {
      success: false,
      reason: `Invalid URL: ${err.message}`,
      evidence,
    };
  }
}

module.exports = verifyUrl;

if (require.main === module) {
  const githubSearchConstraints = {
    hostname: "github.com",
    pathnameIncludes: "/search",
    params: {
      type: { equals: "issues" },
      q: {
        includesAll: [
          "repo:microsoft/playwright",
          "is:issue",
          "is:open",
          "label:bug",
        ],
      },
    },
  };

  const testUrls = [
    {
      url: "https://github.com/search?q=repo%3Amicrosoft%2Fplaywright+is%3Aissue+is%3Aopen+label%3Abug&type=issues",
      expected: "PASS",
    },
    {
      url: "https://github.com/search?q=repo%3Amicrosoft%2Fplaywright+is%3Apr&type=issues",
      expected: "FAIL",
    },
    {
      url: "https://github.com/search?q=repo%3Amicrosoft%2Fplaywright+is%3Aissue+label%3Adocumentation&type=issues",
      expected: "FAIL",
    },
    {
      url: "https://github.com/search?q=repo:microsoft/playwright+is:issue+is:open+label:bug&type=issues",
      expected: "PASS",
    },
    {
      url: "https://github.com/search?q=label%3Abug+is%3Aopen+repo%3Amicrosoft%2Fplaywright+is%3Aissue&type=issues",
      expected: "PASS",
    },
    {
      url: "not-a-valid-url",
      expected: "FAIL",
    },
  ];

  console.log("TASK 1 TEST CASES");
  testUrls.forEach((test, index) => {
    const result = verifyUrl(test.url, githubSearchConstraints);
    const status = result.success ? "PASS" : "FAIL";
    console.log(`Test ${index + 1} (expected ${test.expected}) -> ${status}`, result.reason);
  });
}
