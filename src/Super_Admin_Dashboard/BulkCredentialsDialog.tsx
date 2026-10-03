import React from "react";
import Modal from "./Modal";
import { OneTimeCredentials } from "./OneTimeCredentialsDialog";

interface Entry { rowNumber: number; credentials: OneTimeCredentials }
interface Props { entries: Entry[]; onClose: () => void }

const BulkCredentialsDialog: React.FC<Props> = ({ entries, onClose }) => (
  <Modal isOpen={entries.length > 0} onClose={onClose} title="Imported account credentials" showSubmit={false} showCancel={false} size="large">
    <p>These passwords are shown only now. Save the details before closing this window.</p>
    <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
      {entries.map(({ rowNumber, credentials }) => (
        <section key={rowNumber} style={{ borderTop: "1px solid #dbe3ec", padding: "12px 0" }}>
          <strong>CSV row {rowNumber}</strong>
          <dl className="one-time-credentials">
            <dt>Username</dt><dd>{credentials.username}</dd>
            <dt>Password</dt><dd>{credentials.password}</dd>
            {credentials.parentUsername && <><dt>Parent username</dt><dd>{credentials.parentUsername}</dd></>}
            {credentials.parentPassword && <><dt>Parent password</dt><dd>{credentials.parentPassword}</dd></>}
          </dl>
        </section>
      ))}
    </div>
    <button type="button" className="btn btn-primary" onClick={onClose}>I saved these details</button>
  </Modal>
);
export default BulkCredentialsDialog;
