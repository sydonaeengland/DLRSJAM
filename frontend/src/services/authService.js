import api from "./api"

export const login = async (email, password) => {
  const res = await api.post("/api/auth/login", { email, password })
  return res.data
}

export const registerVerify = async (trn, date_of_birth, control_number) => {
  const res = await api.post("/api/auth/register/verify", {
    trn,
    date_of_birth,
    control_number,
  })
  return res.data
}

export const registerComplete = async (trn, email, password, confirm_password, phone) => {
  const res = await api.post("/api/auth/register/complete", {
    trn,
    email,
    password,
    confirm_password,
    phone,
  })
  return res.data
}

export const getMe = async () => {
  const res = await api.get("/api/auth/me")
  return res.data
}