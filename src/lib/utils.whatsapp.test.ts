import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getWhatsAppUrl,
  onlineOrderConfirmMessage,
  onlineOrderPaymentMessage,
  whatsappDigits,
} from "./utils";

describe("whatsapp helpers", () => {
  it("turns a Ghana 0-number into a wa.me country code", () => {
    assert.equal(whatsappDigits("055 250 1280"), "233552501280");
    assert.equal(whatsappDigits("+233 55 250 1280"), "233552501280");
  });

  it("builds confirm and payment links for an online order", () => {
    const confirm = onlineOrderConfirmMessage({
      customerName: "Ama",
      orderNumber: "ANIS-20260930-0009",
      total: 50,
      deliveryType: "DELIVERY",
    });
    assert.match(confirm, /ANIS-20260930-0009/);
    assert.match(confirm, /delivery/i);
    assert.match(confirm, /GHS 50.00/);

    const pay = onlineOrderPaymentMessage({
      customerName: "Ama",
      orderNumber: "ANIS-20260930-0009",
      total: 50,
      payToPhone: "+233 55 250 1280",
    });
    assert.match(pay, /GHS 50.00/);
    assert.match(pay, /MoMo/);

    const url = getWhatsAppUrl("0552501280", confirm);
    assert.match(url, /^https:\/\/wa\.me\/233552501280\?text=/);
  });
});
