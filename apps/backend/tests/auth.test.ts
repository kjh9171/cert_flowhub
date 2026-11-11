// FlowHub 인증 통합 테스트

import request from "supertest";
import { app } from "../src/main";

describe("Auth", () => {
  const email = `test_${Date.now()}@flowhub.local`;
  const password = "password123";
  let token = "";

  it("register creates user and returns token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email,
      password,
      name: "테스터",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;
  });

  it("login returns token", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("me requires auth", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });

  it("me with token returns user", async () => {
    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });
});
