import React from "react";
import Modal from "./Modal";

export interface OneTimeCredentials {
  username: string;
  password: string;
  parentUsername?: string | null;
  parentPassword?: string | null;
}

interface Props {
  credentials: OneTimeCredentials | null;
  onClose: () => void;
}

const OneTimeCredentialsDialog: React.FC<Props> = ({ credentials, onClose }) => (
  <Modal
    isOpen={Boolean(credentials)}
    onClose={onClose}
    title="Account credentials"
    showSubmit={false}
    showCancel={false}
  >
    <p>These credentials are shown only now. Save them before closing this window.</p>
    <dl className="one-time-credentials">
      <dt>Username</dt><dd>{credentials?.username}</dd>
      <dt>Password</dt><dd>{credentials?.password}</dd>
      {credentials?.parentUsername && <><dt>Parent username</dt><dd>{credentials.parentUsername}</dd></>}
      {credentials?.parentPassword && <><dt>Parent password</dt><dd>{credentials.parentPassword}</dd></>}
    </dl>
    <button type="button" className="btn btn-primary" onClick={onClose}>I saved these details</button>
  </Modal>
);

export default OneTimeCredentialsDialog;
