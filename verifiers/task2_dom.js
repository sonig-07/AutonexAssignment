const { chromium } = require("playwright");

async function runCheck(page, check) {
  const { name, selector, attr, contains, equals, tableLabel } = check;

  try {
    let value = null;

    if (tableLabel) {
      value = await page.evaluate(
        ({ selector, tableLabel }) => {
          const rows = document.querySelectorAll(selector);
          for (const row of rows) {
            const th = row.querySelector("th");
            if (th && th.innerText.toLowerCase().includes(tableLabel.toLowerCase())) {
              const td = row.querySelector("td");
              return td ? td.innerText : null;
            }
          }
          return null;
        },
        { selector, tableLabel }
      );
    } else if (attr) {
      value = await page.getAttribute(selector, attr).catch(() => null);
    } else {
      value = await page.textContent(selector).catch(() => null);
    }

    if (value === null || value === undefined) {
      return { name, pass: false, value: null, reason: "element or value not found" };
    }

    const normalized = value.trim().toLowerCase();

    if (equals !== undefined) {
      const pass = normalized === String(equals).toLowerCase();
      return { name, pass, value, reason: pass ? "matched" : `expected exact match "${equals}"` };
    }

    if (contains !== undefined) {
      const pass = normalized.includes(String(contains).toLowerCase());
      return { name, pass, value, reason: pass ? "matched" : `expected to contain "${contains}"` };
    }

    return { name, pass: true, value, reason: "value present, no assertion given" };
  } catch (err) {
    return { name, pass: false, value: null, reason: err.message };
  }
}

async function verifyPage(url, checks = [], options = {}) {
  const timeout = options.timeout || 15000;
  const evidence = { url };
  let browser;

  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const response = await page.goto(url, {
      timeout,
      waitUntil: options.waitUntil || "load",
    });

    evidence.finalUrl = page.url();
    evidence.httpStatus = response ? response.status() : null;

    const results = [];
    for (const check of checks) {
      results.push(await runCheck(page, check));
    }
    evidence.checks = results;

    const failed = results.filter((r) => !r.pass);

    if (failed.length > 0) {
      return {
        success: false,
        reason: `Failed checks: ${failed.map((f) => `${f.name} (${f.reason})`).join("; ")}`,
        evidence,
      };
    }

    return {
      success: true,
      reason: "All DOM checks passed",
      evidence,
    };
  } catch (err) {
    evidence.error = err.message;
    return {
      success: false,
      reason: `Navigation or evaluation failed: ${err.message}`,
      evidence,
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = verifyPage;

if (require.main === module) {
  const tajMahalChecks = [
    { name: "title", selector: "h1#firstHeading", contains: "taj mahal" },
    { name: "location", selector: ".infobox tr", tableLabel: "location", contains: "agra" },
  ];

  const tests = [
    { url: "https://en.wikipedia.org/wiki/Taj_Mahal", expected: "PASS" },
    { url: "https://en.wikipedia.org/wiki/Eiffel_Tower", expected: "FAIL" },
    { url: "https://en.wikipedia.org/wiki/Agra", expected: "FAIL" },
  ];

  (async () => {
    console.log("TASK 2 TEST CASES");
    for (let i = 0; i < tests.length; i++) {
      const result = await verifyPage(tests[i].url, tajMahalChecks);
      const status = result.success ? "PASS" : "FAIL";
      console.log(`Test ${i + 1} (expected ${tests[i].expected}) -> ${status}`, result.reason);
    }
  })();
}
