import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { firstNameKey, staffAvatarTint, staffInitials } from "./staff-avatar";

describe("staff avatar helpers", () => {
  it("builds two-letter initials from a full name", () => {
    assert.equal(staffInitials("Maxwell Kaku"), "MK");
    assert.equal(staffInitials("Maudallia Tetteh"), "MT");
  });

  it("picks a stable tint for the same name", () => {
    assert.equal(staffAvatarTint("Maxwell Kaku"), staffAvatarTint("Maxwell Kaku"));
    assert.equal(staffAvatarTint("Karim"), staffAvatarTint("Karim"));
  });

  it("gives Maxwell and Maudallia different tint placeholders", () => {
    assert.notEqual(staffAvatarTint("Maxwell Kaku"), staffAvatarTint("Maudallia Tetteh"));
  });

  it("covers more than one tint across a few names", () => {
    const tints = new Set(
      ["Maxwell Kaku", "Maudallia Tetteh", "Karim", "IT Administrator", "Ama Mensah"].map(
        staffAvatarTint,
      ),
    );
    assert.ok(tints.size > 1);
  });

  it("matches the first name key used at sign-in", () => {
    assert.equal(firstNameKey("Maxwell Kaku"), "maxwell");
    assert.equal(firstNameKey("  Maudallia  Tetteh "), "maudallia");
  });
});
