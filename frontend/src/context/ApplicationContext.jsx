// Application context — holds form state for the in-progress application flow. Persists the applicationId to sessionStorage so a page refresh doesn't lose it.
import { createContext, useContext, useState } from "react";

const ApplicationContext = createContext(null);

const INITIAL_STATE = {
  transactionType: null,
  replacementReason: null,
  licenceRecord: null,
  applicationId: null,
  applicationNumber: null,
  telephone: "",
  email: "",
  occupation: "",
  addressChangeRequested: null,
  newAddressLine1: "",
  newAddressLine2: "",
  newParish: "",
  proofOfAddressDocType: "",
  trusteeCollection: false,
  trusteeName: "",
  trusteeContact: "",
  pickupCollectorateCode: "",
  trnPendingFlag: false,
  declarationText: "",
  signatureDataUrl: null,
  feeAmount: null,
  paymentReference: null,
  paymentConfirmed: false,
};

function getInitialState() {
  const saved = sessionStorage.getItem("applicationId");
  if (saved) {
    return { ...INITIAL_STATE, applicationId: parseInt(saved, 10) };
  }
  return INITIAL_STATE;
}

export function ApplicationProvider({ children }) {
  const [state, setState] = useState(getInitialState);

  const update = (patch) => {
    if (patch.applicationId != null) {
      sessionStorage.setItem("applicationId", patch.applicationId);
    }
    setState((prev) => ({ ...prev, ...patch }));
  };

  const reset = () => {
    sessionStorage.removeItem("applicationId");
    setState(INITIAL_STATE);
  };

  return (
    <ApplicationContext.Provider value={{ state, update, reset }}>
      {children}
    </ApplicationContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(ApplicationContext);
  if (!ctx) throw new Error("useAppState must be used inside ApplicationProvider");
  return ctx;
}