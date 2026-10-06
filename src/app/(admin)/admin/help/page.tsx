import Link from "next/link";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import PrintButton from "./PrintButton";

export const metadata = { title: "Manual" };

/**
 * The back-office manual. Plain language, written for the people who run Anis
 * day to day, not for accountants. Printable, so it can live in a binder by
 * the till as well as on screen.
 */

const SECTIONS = [
  { id: "day", title: "A day at Anis" },
  { id: "dashboard", title: "Reading the dashboard" },
  { id: "costing", title: "Costing a dish by hand" },
  { id: "payroll", title: "Running payroll" },
  { id: "expenses", title: "Expenses and deposits" },
  { id: "cash-up", title: "Cash-up and shift reports" },
  { id: "month-end", title: "Month-end checklist" },
  { id: "words", title: "What the words mean" },
];

export default function ManualPage() {
  return (
    <div data-print-page>
      <PageHeader
        eyebrow="Manage"
        title="The Anis manual"
        description="How to run the till and the back office, step by step. Print it and keep a copy by the counter."
        actions={
          <div data-report-chrome>
            <PrintButton />
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[15rem_1fr]">
        <nav data-report-chrome className="s-card h-max p-3 xl:sticky xl:top-4" aria-label="Manual contents">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--s-ink-faint)" }}>
            Contents
          </p>
          <ol className="space-y-0.5 text-sm">
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="flex gap-2 rounded-xl px-2 py-1.5 font-semibold hover:bg-[var(--s-hover)]">
                  <span className="money w-4" style={{ color: "var(--s-ink-faint)" }}>
                    {index + 1}
                  </span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-4 text-[0.95rem] leading-relaxed">
          <Section id="day" n={1} title="A day at Anis">
            <Steps
              items={[
                <>
                  <b>Open the till.</b> Sign in with your name and PIN, count the cash in the drawer and enter it as the
                  opening float. If you check the MoMo balance, enter that too.
                </>,
                <>
                  <b>Sell.</b> Ring every sale through the till, even small ones. Seat dine-in guests on a table so their
                  bill stays open until they pay. Never hand over food on an unpaid ticket without a reason.
                </>,
                <>
                  <b>Money out of the drawer.</b> If you spend cash from the till (gas, tomatoes, a taxi), record it as a{" "}
                  <i>spend</i> and pick what it was for. If you move cash to MoMo or the bank, record it as a{" "}
                  <i>deposit</i>. Deposits are not costs.
                </>,
                <>
                  <b>Mid-shift check (X report).</b> Prints what the drawer should hold right now. It does not close
                  anything.
                </>,
                <>
                  <b>Close the shift.</b> Settle or void any unpaid tickets, count the notes and coins, and enter the
                  MoMo balance. The till prints a Z report showing whether the drawer balanced.
                </>,
              ]}
            />
            <Tip>
              A shift left open overnight blocks the next day&apos;s sales until someone closes it. Always close before
              you go home.
            </Tip>
          </Section>

          <Section id="dashboard" n={2} title="Reading the dashboard">
            <p>
              Switch between <b>Today</b>, <b>This week</b> and <b>This month</b> at the top. Every figure compares
              with the period before: today against all of yesterday, this week against last week so far, this month
              against last month so far.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <b>Sales</b> is what customers paid for completed sales. Green arrow: up on the period before.
              </li>
              <li>
                <b>Gross margin</b> is what is left after food cost, as a share of sales. It shows a dash until your
                dishes are costed (see section 3).
              </li>
              <li>
                <b>Where the money went</b> splits every cedi of sales into food, staff, running costs and what you
                kept.
              </li>
              <li>
                <b>Prime cost</b> (food + staff as a share of sales) is the number restaurant owners watch most. Under
                60–65% leaves room for rent, bills and profit.
              </li>
              <li>
                <b>Busy hours</b> shows when the money comes in. Use it to plan staff and prep.
              </li>
              <li>
                <b>Needs attention</b> lists anything a person should act on: unpaid tickets over 30 minutes, a short or
                over drawer, low stock, dishes without a cost.
              </li>
            </ul>
          </Section>

          <Section id="costing" n={3} title="Costing a dish by hand">
            <p>
              Profit is only known once the till knows what each plate costs to make. You do this once per dish, then
              review it when market prices move. Start with your best sellers: the{" "}
              <Link href="/admin/menu?view=costing" className="font-bold underline" style={{ color: "var(--s-brand)" }}>
                costing sheet
              </Link>{" "}
              lists them first.
            </p>

            <h3 className="mt-5 font-extrabold">You need</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Recent receipts or market prices for each ingredient.</li>
              <li>A kitchen scale and a measuring cup.</li>
              <li>The cook who makes the dish, to agree how much goes on a plate.</li>
            </ul>

            <h3 className="mt-5 font-extrabold">Step by step</h3>
            <Steps
              items={[
                <>
                  <b>Write the recipe for one plate.</b> List every ingredient with how much goes on a single serving:
                  250 g rice, one chicken quarter, two ladles of stew.
                </>,
                <>
                  <b>Work out the cost per unit of each ingredient.</b> Divide what you paid by how much you got.
                  A 5 kg bag of rice for GH₵125 is GH₵25 a kilo, or GH₵0.025 a gram.
                </>,
                <>
                  <b>Cost shared items by the pot.</b> Stews, shito and soups are made in batches. Add up everything
                  that went into the pot (tomatoes, oil, onions, spices, meat), then divide by the number of plates the
                  pot serves.
                </>,
                <>
                  <b>Allow for waste and shrink.</b> Meat loses weight when cleaned and cooked; some food is spoiled or
                  dropped. Cost on what you <i>buy</i>, not what ends up on the plate, and add about 5% for waste.
                </>,
                <>
                  <b>Add the extras.</b> Takeaway box, bag, cutlery, sachet water, and a share of gas (a cylinder
                  refill divided by roughly how many plates it cooks).
                </>,
                <>
                  <b>Add it all up</b> and type the total into the <i>Cost</i> box for that dish on the costing sheet.
                  It saves when you leave the box and shows the food cost % straight away.
                </>,
              ]}
            />

            <h3 className="mt-5 font-extrabold">Worked example: Jollof with grilled chicken (large), sold at GH₵100</h3>
            <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
              Example prices only. Use what you actually pay.
            </p>
            <div className="-mx-1 mt-2 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--s-border)" }}>
              <Table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>How it is worked out</th>
                    <th className="num">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <Row item="Rice, 250 g" how="5 kg bag at GH₵125 = GH₵25/kg × 0.25 kg" cost="6.25" />
                  <Row item="Chicken quarter, 300 g raw" how="GH₵50/kg × 0.3 kg" cost="15.00" />
                  <Row item="Jollof base and stew" how="Pot costs GH₵180 and serves 40 plates" cost="4.50" />
                  <Row item="Salad and shito" how="Batch of GH₵80 for 40 plates" cost="2.00" />
                  <Row item="Box, bag, cutlery" how="Per order" cost="3.50" />
                  <Row item="Gas" how="GH₵250 refill cooks about 300 plates" cost="0.83" />
                  <Row item="Waste allowance" how="5% of the food above" cost="1.39" />
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Cost of one plate</td>
                    <td className="num">GH₵33.47</td>
                  </tr>
                </tfoot>
              </Table>
            </div>
            <p className="mt-3">
              Enter <b>33.47</b> as the cost. Food cost is 33.47 ÷ 100 = <b>33%</b>, and the business keeps{" "}
              <b>GH₵66.53</b> per plate to pay staff, rent, bills and profit.
            </p>

            <h3 className="mt-5 font-extrabold">What good looks like</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <b>Food cost 28–35%</b> of the price: healthy. The costing sheet shows it in green.
              </li>
              <li>
                <b>36–45%</b>: amber. Check the portion, the recipe or the price.
              </li>
              <li>
                <b>Over 45%</b>: red. This dish is barely paying for itself.
              </li>
            </ul>

            <Tip>
              Costs change with the market. Re-cost your top ten dishes at the start of every month, or whenever a
              major ingredient (rice, chicken, oil, gas) jumps in price. Older sales that were rung before a dish had a
              cost use the cost you enter, so profit fills in backwards as well as forwards.
            </Tip>
          </Section>

          <Section id="payroll" n={4} title="Running payroll">
            <Steps
              items={[
                <>
                  <b>Set pay rates once.</b> Payroll → <i>Pay rates</i>. For each person choose monthly, daily or
                  hourly, the rate, and their MoMo number or bank account.
                </>,
                <>
                  <b>Run payroll at month end.</b> Payroll → <i>Run payroll</i>. Everyone with a rate is listed.
                  Daily staff show the days the till saw them working; correct it if they worked off the till.
                </>,
                <>
                  <b>Add bonuses and deductions.</b> Use <i>Other deductions</i> for advances being repaid or
                  shortages. Tick <i>Deduct SSNIT</i> only for staff registered with SSNIT: it takes 5.5% of basic pay
                  from the wage. The business owes a further 13% to SSNIT itself.
                </>,
                <>
                  <b>Create drafts, then check them.</b> Drafts can still be edited or deleted.
                </>,
                <>
                  <b>Approve</b> once checked, then <b>Mark paid</b> when the money has actually gone out. Only paid
                  wages count against profit, on the day they were paid.
                </>,
                <>
                  <b>Print a payslip</b> for each person and have them sign it.
                </>,
              ]}
            />
            <Tip>A paid record can never be changed or deleted: it is part of the accounts. Fix mistakes before paying.</Tip>
          </Section>

          <Section id="expenses" n={5} title="Expenses and deposits">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <b>Cash spent from the till</b> becomes an expense automatically, filed under the category the cashier
                picked. You can correct the description or category later, but not the amount.
              </li>
              <li>
                <b>Anything else you pay</b> (rent, ECG, wifi, supplier transfers) goes in Expenses → <i>Add expense</i>.
                Snap the receipt with <i>Add a photo</i>.
              </li>
              <li>
                Mark rent, wifi and other regular bills as <b>fixed</b> categories in <i>Categories</i>, so you can
                see fixed and variable costs apart.
              </li>
              <li>
                <b>Deposits</b> (cash moved to MoMo or the bank) are transfers, not costs, and are listed separately.
              </li>
            </ul>
          </Section>

          <Section id="cash-up" n={6} title="Cash-up and shift reports">
            <p>
              Money → <b>Cash-up</b> shows every shift: what the till expected in the drawer, what was counted, and the
              difference. MoMo is checked the same way when the balance was entered at open and close.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                <b>Balanced</b> is the goal. Small differences happen; repeated shortages on one person&apos;s shifts
                need a conversation.
              </li>
              <li>
                Open a shift&apos;s details to see each payment method, the money in and out, and the notes counted.
              </li>
              <li>
                <b>Report</b> reprints the shift&apos;s Z report.
              </li>
            </ul>
          </Section>

          <Section id="month-end" n={7} title="Month-end checklist">
            <Steps
              items={[
                <>Make sure every shift for the month is closed (Cash-up shows none open).</>,
                <>Add any bills not yet entered: rent, ECG, water, wifi, supplier invoices.</>,
                <>Run payroll, approve and mark paid.</>,
                <>Re-cost your top ten dishes if prices moved.</>,
                <>
                  Open Reports → <i>Last month</i>, check the profit &amp; loss, and download the Excel file for your
                  accountant.
                </>,
              ]}
            />
          </Section>

          <Section id="words" n={8} title="What the words mean">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Word term="Sales">What customers paid for completed sales, after discounts.</Word>
              <Word term="Food cost">What the dishes sold cost to make: ingredients, packaging, gas.</Word>
              <Word term="Gross profit / margin">Sales minus food cost; the margin is the same as a share of sales.</Word>
              <Word term="Overheads">Running costs: expenses plus staff pay.</Word>
              <Word term="Net profit">What is left after food cost, expenses and staff pay.</Word>
              <Word term="Prime cost">Food cost plus staff pay, as a share of sales. Aim for under 60–65%.</Word>
              <Word term="Void">A ticket cancelled before the money was kept.</Word>
              <Word term="Refund">A paid sale given back to the customer.</Word>
              <Word term="Float">The cash put in the drawer at the start of a shift, for change.</Word>
              <Word term="X report">A mid-shift reading of the drawer. Closes nothing.</Word>
              <Word term="Z report">The end-of-shift report, printed when the shift is closed.</Word>
              <Word term="Deposit">Cash moved from the drawer to MoMo or the bank. Not a cost.</Word>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <Panel padded>
      <section id={id} className="scroll-mt-24 pt-1">
        <h2 className="mb-3 flex items-center gap-3 text-xl font-extrabold">
          <span
            className="money grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm"
            style={{ background: "var(--s-brand-soft)", color: "var(--s-brand)" }}
          >
            {n}
          </span>
          {title}
        </h2>
        {children}
      </section>
    </Panel>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-2 space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span
            className="money mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold"
            style={{ background: "var(--s-sunk)" }}
          >
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--s-accent-soft)" }}>
      <b>Tip:</b> {children}
    </p>
  );
}

function Row({ item, how, cost }: { item: string; how: string; cost: string }) {
  return (
    <tr>
      <td className="font-semibold">{item}</td>
      <td className="muted">{how}</td>
      <td className="num">{cost}</td>
    </tr>
  );
}

function Word({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-extrabold">{term}</dt>
      <dd className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
        {children}
      </dd>
    </div>
  );
}
