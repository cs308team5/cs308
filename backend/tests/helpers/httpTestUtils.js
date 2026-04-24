export function createMockReq({ body = {}, params = {}, query = {} } = {}) {
  return {
    body,
    params,
    query,
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
