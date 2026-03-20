export const login = async (email, password) => {
  await new Promise((res) => setTimeout(res, 800));

  if (email === "test@test.com" && password === "123456") {
    return { success: true, token: "fake-token" };
  }

  return { success: false, message: "Invalid credentials" };
};