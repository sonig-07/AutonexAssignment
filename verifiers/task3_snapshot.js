const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

function verifySnapshot(htmlString, constraints = {}) {
  const evidence = {};

  try {
    const $ = cheerio.load(htmlString);
    const fields = constraints.fields || {};
    const violations = [];

    for (const [name, rule] of Object.entries(fields)) {
      const el = $(rule.selector);

      if (el.length === 0) {
        evidence[name] = null;
        violations.push(`${name}: element not found (${rule.selector})`);
        continue;
      }

      const raw = rule.attr ? el.first().attr(rule.attr) : el.first().text().trim();
      evidence[name] = raw;

      if (raw === undefined || raw === null) {
        violations.push(`${name}: attribute/value not present`);
        continue;
      }

      let value = raw;

      if (rule.type === "number") {
        value = Number(raw);
        if (Number.isNaN(value)) {
          violations.push(`${name}: not a number (got "${raw}")`);
          continue;
        }
      } else {
        value = rule.caseSensitive ? raw : raw.toLowerCase();
      }

      if (rule.equals !== undefined) {
        const target =
          rule.type === "number"
            ? rule.equals
            : rule.caseSensitive
            ? rule.equals
            : String(rule.equals).toLowerCase();
        if (value !== target) {
          violations.push(`${name}: expected ${JSON.stringify(rule.equals)}, got ${JSON.stringify(raw)}`);
        }
      }

      if (rule.max !== undefined && value > rule.max) {
        violations.push(`${name}: ${value} exceeds max ${rule.max}`);
      }

      if (rule.min !== undefined && value < rule.min) {
        violations.push(`${name}: ${value} below min ${rule.min}`);
      }
    }

    if (violations.length > 0) {
      return {
        success: false,
        reason: `Constraint violations: ${violations.join("; ")}`,
        evidence,
      };
    }

    return {
      success: true,
      reason: "All constraints satisfied",
      evidence,
    };
  } catch (err) {
    return {
      success: false,
      reason: `Failed to parse HTML: ${err.message}`,
      evidence,
    };
  }
}

module.exports = verifySnapshot;

if (require.main === module) {
  const listingConstraints = {
    fields: {
      price: { selector: "[data-price]", attr: "data-price", type: "number", max: 3000 },
      city: { selector: "[data-city]", attr: "data-city", equals: "Pune" },
      bedrooms: { selector: "[data-bedrooms]", attr: "data-bedrooms", type: "number", equals: 2 },
    },
  };

  const htmlPass = fs.readFileSync(path.join(__dirname, "..", "snapshot_listing.html"), "utf-8");
  const htmlFail = fs.readFileSync(path.join(__dirname, "..", "snapshot_listing_fail.html"), "utf-8");

  console.log("TASK 3 TEST CASES");
  console.log("PASS CASE ->", verifySnapshot(htmlPass, listingConstraints));
  console.log("FAIL CASE ->", verifySnapshot(htmlFail, listingConstraints));
}
