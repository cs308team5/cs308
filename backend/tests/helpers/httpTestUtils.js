export function createMockReq({ body = {}, params = {}, query = {}, customer = undefined } = {}) {
  return {
    body,
    params,
    query,
    customer,
  };
}

export function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}
