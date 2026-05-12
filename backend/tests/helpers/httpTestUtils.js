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
    headers: {},
    sent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.sent = payload;
      return this;
    },
  };
}
