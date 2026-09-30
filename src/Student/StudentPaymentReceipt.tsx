// Student Payment Receipt: imports and dependencies
import StudentIcon from "./StudentIcon";
import React from "react";
import { profilePictureUrl } from "../Super_Admin_Dashboard/ProfilePictureInput";
import "./StudentPaymentReceipt.css";

// Data types and contracts
type Row = Record<string, any>;
type Props = {
  kind: "fee" | "transport";
  payment: Row;
  profile: Row;
  description: string;
  details?: { label: string; value: React.ReactNode }[];
  onClose: () => void;
};

// Constants and helper functions
const displayDate = (value: unknown) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
const amountText = (value: unknown) =>
  "₹" +
  (Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Main component and state
export default function StudentPaymentReceipt({
  kind,
  payment,
  profile,
  description,
  details = [],
  onClose,
}: Props) {
  // Constants and helper functions
  const isTransport = kind === "transport";
  const receiptNumber = isTransport
    ? payment.receiptNumber
    : payment.receipt_Number;
  const paymentDate = isTransport ? payment.paymentDate : payment.payment_Date;
  const paymentMode = isTransport ? payment.paymentMode : payment.payment_Mode;
  const reference = isTransport
    ? payment.referenceNumber
    : payment.referenceNumber || payment.acknowledgementId;
  const amount = isTransport ? payment.amount : payment.amountPaid;
  const logo = profilePictureUrl(profile.schoolLogoUrl);
  const schoolName = profile.schoolName || "School";
  const schoolInitials = String(schoolName)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const print = () => {
    const previousTitle = document.title;
    document.title = `${schoolName} - ${isTransport ? "Transport" : "Fee"} Receipt ${receiptNumber || payment.id || ""}`;
    window.addEventListener(
      "afterprint",
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );
    window.print();
  };

  return (
    <div
      className="sp-modal-backdrop sp-payment-receipt-overlay"
      onMouseDown={onClose}
    >
      <section
        className="sp-modal sp-payment-receipt"
        role="dialog"
        aria-modal="true"
        aria-label={isTransport ? "Transport receipt" : "Fee receipt"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="sp-modal-close"
          aria-label={
            isTransport ? "Close transport receipt" : "Close fee receipt"
          }
          onClick={onClose}
        >
          <StudentIcon name="close" />
        </button>
        <header className="sp-payment-receipt-header">
          <div className="sp-payment-receipt-logo">
            {logo ? (
              <img src={logo} alt={schoolName + " logo"} />
            ) : (
              <span>{schoolInitials || "S"}</span>
            )}
          </div>
          <div>
            <strong>{schoolName}</strong>
            {profile.schoolAddress && (
              <address>{profile.schoolAddress}</address>
            )}
          </div>
        </header>
        <div className="sp-payment-receipt-title">
          <div>
            <small>OFFICIAL PAYMENT RECEIPT</small>
            <h2>
              {isTransport ? "Transport fee receipt" : "School fee receipt"}
            </h2>
          </div>
          <span className="sp-payment-receipt-status">PAID</span>
        </div>
        <div className="sp-payment-receipt-meta">
          <div>
            <span>Receipt number</span>
            <strong>{receiptNumber || payment.id || "—"}</strong>
          </div>
          <div>
            <span>Payment date</span>
            <strong>{displayDate(paymentDate)}</strong>
          </div>
        </div>
        <section className="sp-payment-receipt-section">
          <h3>Received from</h3>
          <dl>
            <div>
              <dt>Student</dt>
              <dd>{profile.studentName || "—"}</dd>
            </div>
            <div>
              <dt>Class / section</dt>
              <dd>
                {[profile.className, profile.sectionName]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </dd>
            </div>
            <div>
              <dt>Roll number</dt>
              <dd>{profile.rollNumber || "—"}</dd>
            </div>
          </dl>
        </section>
        <section className="sp-payment-receipt-section">
          <h3>Payment details</h3>
          <dl>
            <div>
              <dt>For</dt>
              <dd>{description}</dd>
            </div>
            {details.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value || "—"}</dd>
              </div>
            ))}
            <div>
              <dt>Payment mode</dt>
              <dd>{paymentMode || "—"}</dd>
            </div>
            {reference && (
              <div>
                <dt>Reference</dt>
                <dd>{reference}</dd>
              </div>
            )}
          </dl>
        </section>
        <div className="sp-payment-receipt-total">
          <span>Amount received</span>
          <strong>{amountText(amount)}</strong>
        </div>
        <p className="sp-payment-receipt-note">
          Payment received by {schoolName}. Keep this receipt for your records.
        </p>
        <div className="sp-payment-receipt-actions">
          <button type="button" className="btn btn-primary" onClick={print}>
            <StudentIcon name="print" />
            Print / Save PDF
          </button>
        </div>
      </section>
    </div>
  );
}
