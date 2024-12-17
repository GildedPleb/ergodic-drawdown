/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable unicorn/no-null */
import React, { useCallback, useState } from "react";
import styled from "styled-components";

import { decryptData, encryptData } from "../helpers";
import { type AppState } from "../panels/drawdown";
import { ActionButton } from "./buttons/action";
import { Modal } from "./modal";

const Warning = styled.span`
  color: #ffc107;
  font-size: 20px;
`;

const End = styled.strong`
  align-self: flex-end;
`;

const Input = styled.input`
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const AlertBox = styled.div`
  background-color: rgba(255, 193, 7, 0.2);
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

// eslint-disable-next-line functional/no-mixed-types
interface ISecureFileOperationsModal {
  appState: AppState;
  mode: "load" | "save" | null;
  onClose: () => void;
  setAppState: (state: AppState) => void;
}

const load = {
  buttonText: "Load",
  heading: "Load Secure File",
  placeholder: "Enter Decrypt Password",
};

const alertText = {
  author: "- Lopp",
  message:
    "Your data on this app is sensitive. We do not receive, transmit, read or otherwise have access to any of this data (See Privacy Policy and review the Source Code to confirm). As such, to save your work, it must be saved locally. AES-256 encryption required.",
  quote:
    '"It is good to talk about Bitcoin. It is not good to talk about YOUR Bitcoin."',
  strongMessage: "Use a strong password and manage it well.",
  warning: "⚠️",
};

const save = {
  buttonText: "Save",
  heading: "Save Secure File",
  placeholder: "Enter Encrypt Password",
};

export const SecureFileOperationsModal = ({
  appState,
  mode,
  onClose,
  setAppState,
}: ISecureFileOperationsModal): JSX.Element => {
  const [password, setPassword] = useState<string | undefined>("");
  const [file, setFile] = useState<File | null>(null);

  const handleClose = useCallback(() => {
    setPassword("");
    setFile(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    const encryptedData = await encryptData(appState, password ?? "");
    const blob = new Blob([encryptedData], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ergodic-drawdown-${new Date().toLocaleDateString()}.dat`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    handleClose();
  }, [appState, password, handleClose]);

  const handleLoad = useCallback(async () => {
    if (file === null) {
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uintArray = new Uint8Array(arrayBuffer);
      const decryptedData = await decryptData(uintArray, password ?? "");
      setAppState(decryptedData);
      handleClose();
    } catch (error) {
      console.error("Error loading file:", error);
      // eslint-disable-next-line no-alert
      alert("Failed to load file. Incorrect password or corrupted file.");
    }
  }, [file, password, setAppState, handleClose]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile !== undefined) {
        setFile(selectedFile);
      }
    },
    [],
  );

  const handlePassword: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setPassword(event.target.value);
    }, []);

  const action = mode === "save" ? handleSave : handleLoad;
  const currentContent = mode === "save" ? save : load;

  const handleAction = useCallback(() => {
    action().catch(console.error);
  }, [action]);

  return (
    <Modal
      heading={currentContent.heading}
      isOpen={Boolean(mode)}
      onClose={handleClose}
    >
      {mode === "save" && (
        <AlertBox>
          <Warning>{alertText.warning}</Warning>
          <strong>{alertText.quote}</strong>
          <End>{alertText.author}</End>
          <span>{alertText.message}</span>
          <strong>{alertText.strongMessage}</strong>
        </AlertBox>
      )}

      {mode === "load" && (
        <Input accept=".dat" onChange={handleFileChange} type="file" />
      )}

      <Input
        onChange={handlePassword}
        placeholder={currentContent.placeholder}
        type="password"
        value={password}
      />

      <ActionButton
        disabled={
          password === "" ||
          password === undefined ||
          (mode === "load" && file === null)
        }
        onClick={handleAction}
      >
        {currentContent.buttonText}
      </ActionButton>
    </Modal>
  );
};
