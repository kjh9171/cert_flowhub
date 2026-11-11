// FlowHub 기본 헬스체크 테스트

import request from "supertest";
import { app } from "../src/main";

describe("Health", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
