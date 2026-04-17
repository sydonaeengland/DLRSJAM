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

export function ApplicationProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const update = (patch) => setState((prev) => ({ ...prev, ...patch }));
  const reset = () => setState(INITIAL_STATE);
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